import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID, LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_RUNTIME,
  CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_V1,
  CRE_DOMAIN_SHORTLIST,
  CRE_VENTURE_ID,
  backfillCreVentureOperationalRecord,
  evaluateDomainProviderAndStripeConfigurationConcurrency,
  executeCreDomainProviderAndStripeConfigurationMission,
  executeCreDomainProviderVerification,
  executeCreLegalCommercializationReconciliation,
  executeCreStripeCommercialConfiguration,
  inspectFooterContract,
  inspectLegalFactSafety,
  resetVentureOperatingScaleStore,
  runDailyVentureOperatingCycle,
  screenDomainConflicts,
} from "..";

const NOW = "2026-09-05T09:56:00.000Z";
const HOME = `<footer>
  <a href="/privacy-policy/">Privacy Policy</a>
  <a href="/terms-of-service/">Terms of Service</a>
  <a href="/sitemap.xml">Sitemap</a>
  <a href="https://imros.io">An Infinity OS Venture</a>
  <a href="https://infinitemediaresources.com">By IMR</a>
</footer>`;

function availability(overrides: Record<string, Partial<{ available: boolean; registrationPriceUsd: number | null; renewalPriceUsd: number | null; premium: boolean }>> = {}) {
  return async (domains: string[]) =>
    domains.map((domain) => ({
      domain,
      available: overrides[domain]?.available ?? domain !== "leasenpv.com",
      registrationPriceUsd: overrides[domain]?.registrationPriceUsd ?? 12.98,
      renewalPriceUsd: overrides[domain]?.renewalPriceUsd ?? 14.98,
      premium: overrides[domain]?.premium ?? false,
    }));
}

function stripeState() {
  const products: Array<Record<string, unknown>> = [];
  const prices: Array<Record<string, unknown>> = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (path.endsWith("/v1/account") && method === "GET") {
      return new Response(JSON.stringify({ id: "acct_livecre1", livemode: true, country: "US", default_currency: "usd", type: "standard" }), { status: 200 });
    }
    if (path.includes("/v1/products") && method === "GET") {
      return new Response(JSON.stringify({ data: products }), { status: 200 });
    }
    if (path.includes("/v1/prices") && method === "GET") {
      return new Response(JSON.stringify({ data: prices }), { status: 200 });
    }
    if (path.includes("/v1/webhook_endpoints") && method === "GET") {
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }
    if (path.includes("/v1/events") && method === "GET") {
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }
    if (path.includes("/v1/payment_intents") && method === "GET") {
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }
    if (path.includes("/v1/balance") && method === "GET") {
      return new Response(JSON.stringify({ available: [] }), { status: 200 });
    }
    if (path.endsWith("/v1/products") && method === "POST") {
      const body = String(init?.body ?? "");
      const name = /name=([^&]+)/.exec(body)?.[1] === "Per-deal" ? "Per-deal" : "Professional";
      const id = name === "Professional" ? "prod_pro1" : "prod_deal1";
      const row = {
        id,
        livemode: true,
        name,
        metadata: {
          infinity_venture_id: CRE_VENTURE_ID,
          infinity_offer_id: name === "Professional" ? "professional" : "per_deal",
          infinity_pricing_version: "cre_canonical_offers_v1",
        },
      };
      products.push(row);
      return new Response(JSON.stringify(row), { status: 200 });
    }
    if (path.endsWith("/v1/prices") && method === "POST") {
      const body = String(init?.body ?? "");
      const amount = body.includes("29000") ? 29000 : 14900;
      const id = amount === 29000 ? "price_pro1" : "price_deal1";
      const row = {
        id,
        livemode: true,
        unit_amount: amount,
        currency: "usd",
        active: true,
        metadata: {
          infinity_venture_id: CRE_VENTURE_ID,
          infinity_offer_id: amount === 29000 ? "professional" : "per_deal",
          infinity_pricing_version: "cre_canonical_offers_v1",
        },
      };
      prices.push(row);
      return new Response(JSON.stringify(row), { status: 200 });
    }
    if (path.includes("/v1/checkout") || path.includes("/v1/customers") || path.includes("/v1/payment_intents") && method === "POST") {
      return new Response(JSON.stringify({ error: { message: "not authorized" } }), { status: 403 });
    }
    return new Response(JSON.stringify({}), { status: 404 });
  };
  return { products, prices, fetchImpl };
}

function legalFetch(): typeof fetch {
  return async (url) => {
    const href = String(url);
    if (href.includes("privacy-policy") || href.includes("terms-of-service") || href.includes("sitemap.xml")) {
      return new Response("<html><h1>Legal</h1><p>Validation-stage disclosure. Payment is not collected.</p></html>", { status: 200 });
    }
    return new Response(HOME, { status: 200 });
  };
}

describe("CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_V1", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    process.env.STRIPE_SECRET_KEY = "rk_live_test_fixture_not_a_real_secret_value";
    process.env.STRIPE_LIVE_ENABLED = "true";
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetInboundCommunicationRuntime();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_LIVE_ENABLED;
  });

  it("registers the parent wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreDomainProviderAndStripeConfigurationRuntime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_RUNTIME].missionType).toBe(
      CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_V1,
    );
  });

  it("allows observer plus domain plus Stripe plus legal and blocks conflicting mutations", () => {
    const gate = evaluateDomainProviderAndStripeConfigurationConcurrency();
    expect(gate.outcome).toBe("PASS");
    expect(gate.legalPlusBoth.outcome).toBe("ALLOWED");
    expect(gate.conflictingStripeCreate.outcome).toBe("BLOCKED");
    expect(gate.conflictingDomainPurchase.outcome).toBe("BLOCKED");
  });

  it("re-ranks available domains and does not purchase", async () => {
    const domain = await executeCreDomainProviderVerification({
      now: NOW,
      checkAvailability: availability(),
      getPricing: async () => ({ registrationPriceUsd: 12.98, renewalPriceUsd: 14.98, status: "READ_ONLY_VERIFIED" }),
      verifyNamecheap: async () => ({ status: "READ_ONLY_VERIFIED", domains: [] }),
      verifyCloudflare: async () => ({ status: "READ_ONLY_VERIFIED" }),
    });
    expect(CRE_DOMAIN_SHORTLIST).toHaveLength(10);
    expect(domain.checked).toHaveLength(10);
    expect(domain.preferred.domain).not.toBe("leasenpv.com");
    expect(domain.purchases).toBe(0);
    expect(domain.capabilities["domain.registration"]).toBe("UNVERIFIED");
    expect(domain.registrationWriteAuthority).toBe("REGISTRATION_WRITE_AUTHORITY_UNVERIFIED");
    expect(domain.purchaseReadiness).toBe("DOMAIN_PURCHASE_PROVIDER_WRITE_VERIFICATION_REQUIRED");
    expect(domain.unknownCosts).toContain("transaction_fees");
    expect(screenDomainConflicts("leasebasis.com").trademarkReviewRequired).toBe("YES");
  });

  it("stops Stripe writes when account identity is unverified", async () => {
    const result = await executeCreStripeCommercialConfiguration({
      fetchImpl: async (url) => {
        if (String(url).includes("/v1/balance")) return new Response(JSON.stringify({ available: [] }), { status: 200 });
        return new Response(JSON.stringify({ error: { message: "permission" } }), { status: 403 });
      },
    });
    expect(result.accountIdentityVerified).toBe("NO");
    expect(result.productsCreated).toBe(0);
    expect(result.pricesCreated).toBe(0);
    expect(result.writeStoppedReason).toBe("STRIPE_ACCOUNT_IDENTITY_UNVERIFIED");
  });

  it("creates at most two products and prices and reuses them on a second run", async () => {
    const firstState = stripeState();
    const first = await executeCreStripeCommercialConfiguration({ fetchImpl: firstState.fetchImpl });
    expect(first.accountIdentityVerified).toBe("YES");
    expect(first.productsCreated).toBe(2);
    expect(first.pricesCreated).toBe(2);
    expect(first.professional.productId).toBe("prod_pro1");
    expect(first.perDeal.priceId).toBe("price_deal1");
    expect(first.customers).toBe(0);
    expect(first.checkoutSessions).toBe(0);
    expect(first.writes["checkout/session.create"]).toBe("UNVERIFIED");
    const second = await executeCreStripeCommercialConfiguration({ fetchImpl: firstState.fetchImpl });
    expect(second.productsCreated).toBe(0);
    expect(second.pricesCreated).toBe(0);
    expect(second.duplicatesAvoided).toBeGreaterThan(0);
    expect(second.professional.reused).toBe(true);
  });

  it("blocks the wrong Stripe account", async () => {
    const state = stripeState();
    const result = await executeCreStripeCommercialConfiguration({
      fetchImpl: state.fetchImpl,
      expectedAccountId: "acct_other",
    });
    expect(result.wrongAccountProtection).toBe("FAIL");
    expect(result.productsCreated).toBe(0);
  });

  it("reconciles legal surfaces without inventing entity facts", async () => {
    const legal = await executeCreLegalCommercializationReconciliation({ fetchImpl: legalFetch() });
    expect(legal.privacy.ok).toBe(true);
    expect(legal.terms.ok).toBe(true);
    expect(legal.sitemap.ok).toBe(true);
    expect(legal.footerContract).toBe("PASS");
    expect(legal.surfacesPresent).toBe(true);
    expect(legal.configurationComplete).toBe(false);
    expect(legal.unknownFacts).toContain("legal_entity");
    expect(inspectLegalFactSafety("Validation-stage disclosure.").includes("legal_entity")).toBe(true);
    expect(inspectFooterContract(HOME).footer).toBe("PASS");
  });

  it("executes the parent mission, updates the record, and preserves the experiment", async () => {
    backfillCreVentureOperationalRecord();
    const stripe = stripeState();
    const result = await executeCreDomainProviderAndStripeConfigurationMission({
      observeInbound: false,
      domain: {
        now: NOW,
        checkAvailability: availability({ "leasebasis.com": { available: true, registrationPriceUsd: 11.98, renewalPriceUsd: 13.98 } }),
        getPricing: async () => ({ registrationPriceUsd: 12.98, renewalPriceUsd: 14.98, status: "READ_ONLY_VERIFIED" }),
        verifyNamecheap: async () => ({ status: "READ_ONLY_VERIFIED", domains: [] }),
        verifyCloudflare: async () => ({ status: "READ_ONLY_VERIFIED" }),
      },
      stripe: { fetchImpl: stripe.fetchImpl },
      legal: { fetchImpl: legalFetch() },
    });
    expect(result.mission).toBe(CRE_DOMAIN_PROVIDER_AND_STRIPE_CONFIGURATION_V1);
    expect(result.concurrency.outcome).toBe("PASS");
    expect(result.external.domainPurchases).toBe(0);
    expect(result.external.dnsWrites).toBe(0);
    expect(result.external.stripeProductsCreated).toBeLessThanOrEqual(2);
    expect(result.external.stripePricesCreated).toBeLessThanOrEqual(2);
    expect(result.external.publiclyLaunched).toBe("NO");
    expect(result.record.privacy_policy_url).not.toBe("UNCONFIGURED");
    expect(result.record.legal_configuration_state).toBe("LEGAL_SURFACES_PRESENT");
    expect(result.daily.snapshot.dailyResult).toBe("ORCHESTRATE_EXISTING_ENGINES");
    expect(result.daily.snapshot.nextGovernedWork.length).toBeGreaterThan(0);
    expect(result.readiness.orderedBlockers[0]).toBe("DOMAIN_PURCHASE");
    expect(result.experiment.state).toBe("COLLECTING");
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.experiment.tracked).toBeGreaterThanOrEqual(4);
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(result.hqMission.fakeSerialization).toBe("NO");
    expect(result.hqMission.after.active).toBe(0);
    expect(result.hqMission.after.infinityDecisionCore).toBe("PRESENT_IDLE");
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(0);
    const daily = runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound: 0 });
    expect(daily.snapshot.dailyResult).not.toBe("NO_ACTION_REQUIRED");
  });
});
