import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID, LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  buildNamecheapProviderRepairInstruction,
  classifyNamecheapProviderError,
  inspectNamecheapSafeConfiguration,
} from "@/lib/infinity/commercialization/providers/namecheap/classify";
import {
  CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_RUNTIME,
  CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_V1,
  CRE_VENTURE_ID,
  backfillCreVentureOperationalRecord,
  classifyProviderAccessNextState,
  evaluateProviderAccessRepairConcurrency,
  executeCreCommercialProviderAccessRepairMission,
  findEquivalentCommercialObjects,
  inspectStripeKeyCapabilities,
  resetVentureOperatingScaleStore,
  runDailyVentureOperatingCycle,
  searchCanonicalLegalFacts,
} from "..";

const NOW = "2026-09-05T10:20:00.000Z";
const HOME = `<footer>
  <a href="/privacy-policy/">Privacy Policy</a>
  <a href="/terms-of-service/">Terms of Service</a>
  <a href="/sitemap.xml">Sitemap</a>
  <a href="https://imros.io">An Infinity OS Venture</a>
  <a href="https://infinitemediaresources.com">By IMR</a>
</footer>`;

function legalFetch(): typeof fetch {
  return async (url) => {
    const path = String(url);
    if (path.includes("privacy-policy") || path.includes("terms-of-service")) {
      return new Response("<html><h1>Legal</h1><p>Validation-stage disclosure. Payment is not collected.</p></html>", { status: 200 });
    }
    if (path.includes("sitemap")) return new Response("<urlset></urlset>", { status: 200 });
    return new Response(HOME, { status: 200 });
  };
}

function availability(overrides: Record<string, Partial<{ available: boolean; registrationPriceUsd: number | null; renewalPriceUsd: number | null; premium: boolean }>> = {}) {
  return async (domains: string[]) =>
    domains.map((domain) => ({
      domain,
      available: overrides[domain]?.available ?? domain === "leasenpv.com",
      registrationPriceUsd: overrides[domain]?.registrationPriceUsd ?? 12.98,
      renewalPriceUsd: overrides[domain]?.renewalPriceUsd ?? 14.98,
      premium: overrides[domain]?.premium ?? false,
    }));
}

function stripeFetch(input: {
  accountOk?: boolean;
  accountId?: string;
  products?: Array<Record<string, unknown>>;
  prices?: Array<Record<string, unknown>>;
  productOk?: boolean;
  priceOk?: boolean;
  posts?: number[];
} = {}): typeof fetch {
  const posts = input.posts ?? [];
  return async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (method === "POST") {
      posts[0] = (posts[0] ?? 0) + 1;
      return new Response(JSON.stringify({ error: { message: "write blocked in test" } }), { status: 500 });
    }
    if (path.endsWith("/v1/account")) {
      if (input.accountOk === false) {
        return new Response(
          JSON.stringify({
            error: {
              type: "invalid_request_error",
              code: "more_permissions_needed",
              message: "The provided key 'rk_live_REDACTEDFIXTURE' does not have permission. Missing permission: `rak_account_read`.",
            },
          }),
          { status: 403 },
        );
      }
      return new Response(
        JSON.stringify({
          id: input.accountId ?? "acct_livecre1",
          livemode: true,
          country: "US",
          default_currency: "usd",
          business_profile: { name: "CRE fixture" },
        }),
        { status: 200 },
      );
    }
    if (path.includes("/v1/products")) {
      if (input.productOk === false) {
        return new Response(JSON.stringify({ error: { code: "more_permissions_needed", message: "Missing permission: `rak_product_read`." } }), { status: 403 });
      }
      return new Response(JSON.stringify({ data: input.products ?? [] }), { status: 200 });
    }
    if (path.includes("/v1/prices")) {
      if (input.priceOk === false) {
        return new Response(JSON.stringify({ error: { code: "more_permissions_needed", message: "Missing permission: `rak_price_read`." } }), { status: 403 });
      }
      return new Response(JSON.stringify({ data: input.prices ?? [] }), { status: 200 });
    }
    if (path.includes("/v1/webhook_endpoints")) {
      return new Response(JSON.stringify({ error: { code: "more_permissions_needed", message: "Missing permission: `rak_webhook_read`." } }), { status: 403 });
    }
    if (path.includes("/v1/events")) {
      return new Response(JSON.stringify({ error: { code: "more_permissions_needed", message: "Missing permission: `rak_event_read`." } }), { status: 403 });
    }
    if (path.includes("/v1/payment_intents")) {
      return new Response(JSON.stringify({ error: { code: "more_permissions_needed", message: "Missing permission: `rak_payment_intent_read`." } }), { status: 403 });
    }
    if (path.includes("/v1/balance")) {
      return new Response(JSON.stringify({ available: [], livemode: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: { message: "unhandled" } }), { status: 404 });
  };
}

describe("CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_V1", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    process.env.STRIPE_SECRET_KEY = "rk_live_test_fixture_not_a_real_secret_value";
    process.env.STRIPE_LIVE_ENABLED = "true";
    process.env.NAMECHEAP_ENABLED = "true";
    process.env.NAMECHEAP_ENV = "production";
    process.env.NAMECHEAP_API_USER = "apiuser01fixture";
    process.env.NAMECHEAP_USERNAME = "apiuser01fixture";
    process.env.NAMECHEAP_API_KEY = "namecheap-test-key-fixture";
    process.env.NAMECHEAP_CLIENT_IP = "203.0.113.10";
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetInboundCommunicationRuntime();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_LIVE_ENABLED;
    delete process.env.NAMECHEAP_ENABLED;
    delete process.env.NAMECHEAP_ENV;
    delete process.env.NAMECHEAP_API_USER;
    delete process.env.NAMECHEAP_USERNAME;
    delete process.env.NAMECHEAP_API_KEY;
    delete process.env.NAMECHEAP_CLIENT_IP;
  });

  it("registers the wrapper and classifies provider blocks without inventing code defects", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreCommercialProviderAccessRepairRuntime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_RUNTIME].missionType).toBe(
      CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_V1,
    );
    const blocked = classifyNamecheapProviderError({ message: "ApiUser has been blocked by administrator", code: "1017101" });
    expect(blocked.cause).toBe("API_USER_BLOCKED_BY_ADMINISTRATOR");
    expect(classifyNamecheapProviderError({ message: "NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR" }).cause).toBe(
      "API_USER_BLOCKED_BY_ADMINISTRATOR",
    );
    expect(blocked.blockClass).toBe("PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED");
    expect(blocked.reason).toBe("NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR");
    const whitelist = classifyNamecheapProviderError({ message: "IP is not whitelisted", code: "1011150" });
    expect(whitelist.cause).toBe("CLIENT_IP_WHITELIST");
    expect(evaluateProviderAccessRepairConcurrency().outcome).toBe("PASS");
    expect(evaluateProviderAccessRepairConcurrency().conflictingStripeCreate.outcome).toBe("BLOCKED");
  });

  it("reports safe Namecheap credentials and repair instructions without exposing secrets", () => {
    const safe = inspectNamecheapSafeConfiguration({
      mode: "PRODUCTION",
      usernameConfigured: true,
      clientIpConfigured: true,
      credentialPresence: "YES",
      apiUserConfigured: true,
      apiKeyConfigured: true,
    });
    expect(safe).toEqual({
      apiUsernameConfigured: "YES",
      apiUserConfigured: "YES",
      apiKeyConfigured: "YES",
      clientIpConfigured: "YES",
      endpoint: "PRODUCTION",
    });
    const instruction = buildNamecheapProviderRepairInstruction("API_USER_BLOCKED_BY_ADMINISTRATOR");
    expect(instruction.humanActionRequired).toBe("YES");
    expect(instruction.supportInterventionRequired).toBe("YES");
    expect(instruction.doNotPasteCredentialsIntoChat).toBe(true);
    expect(JSON.stringify(instruction)).not.toMatch(/namecheap-test-key-fixture|rk_live_/);
  });

  it("parses domain availability and pricing without treating reads as registration writes", async () => {
    const posts: number[] = [];
    const result = await executeCreCommercialProviderAccessRepairMission({
      observeInbound: false,
      domain: {
        now: NOW,
        checkAvailability: availability(),
        getPricing: async () => ({ registrationPriceUsd: 12.98, renewalPriceUsd: 14.98, status: "READ_ONLY_VERIFIED" }),
        verifyNamecheap: async () => ({ status: "READ_ONLY_VERIFIED", domains: [] }),
        verifyCloudflare: async () => ({ status: "READ_ONLY_VERIFIED" }),
      },
      stripeFetch: stripeFetch({ accountOk: false, posts }),
      legal: { fetchImpl: legalFetch() },
    });
    const lease = result.namecheap.verification.checked.find((row) => row.domain === "leasenpv.com");
    expect(lease?.available).toBe("YES");
    expect(lease?.premium).toBe("NO");
    expect(lease?.firstYear).toBe(12.98);
    expect(lease?.renewal).toBe(14.98);
    expect(lease?.currency).toBe("USD");
    expect(result.namecheap.verification.capabilities["domain.registration"]).toBe("UNVERIFIED");
    expect(result.external.domainPurchases).toBe(0);
    expect(posts[0] ?? 0).toBe(0);
  });

  it("proves restricted-key account.read denial from the Stripe error body", async () => {
    const inspection = await inspectStripeKeyCapabilities({
      key: "rk_live_test_fixture_not_a_real_secret_value",
      fetchImpl: stripeFetch({ accountOk: false }),
    });
    expect(inspection.keyType).toBe("RESTRICTED");
    expect(inspection.permissions["account.read"]).toBe("NO");
    expect(inspection.permissions["balance.read"]).toBe("YES");
    expect(inspection.account.errorCode).toBe("more_permissions_needed");
    expect(inspection.account.missingPermission).toBe("rak_account_read");
    expect(inspection.account.safeError).not.toMatch(/rk_live_|acct_/);
    expect(inspection.cause).toBe("RESTRICTED_KEY_MISSING_ACCOUNT_READ");
    expect(JSON.stringify(inspection)).not.toMatch(/rk_live_test_fixture_not_a_real_secret_value/);
    expect(inspection.statuses["product.create"]).toBe("UNVERIFIED");
    expect(inspection.writeHttpCalls).toBe(0);
  });

  it("verifies Stripe identity, wrong-account protection, and existing object lookup without writes", async () => {
    const posts: number[] = [];
    const products = [
      { id: "prod_pro1", name: "Professional", metadata: { infinity_venture_id: CRE_VENTURE_ID, infinity_offer_id: "professional", infinity_pricing_version: "cre_canonical_offers_v1" } },
      { id: "prod_deal1", name: "Per-deal", metadata: { infinity_venture_id: CRE_VENTURE_ID, infinity_offer_id: "per_deal", infinity_pricing_version: "cre_canonical_offers_v1" } },
    ];
    const prices = [
      { id: "price_pro1", unit_amount: 29000, metadata: { infinity_venture_id: CRE_VENTURE_ID, infinity_offer_id: "professional", infinity_pricing_version: "cre_canonical_offers_v1" } },
      { id: "price_deal1", unit_amount: 14900, metadata: { infinity_venture_id: CRE_VENTURE_ID, infinity_offer_id: "per_deal", infinity_pricing_version: "cre_canonical_offers_v1" } },
    ];
    const result = await executeCreCommercialProviderAccessRepairMission({
      observeInbound: false,
      expectedStripeAccountId: "acct_livecre1",
      domain: {
        now: NOW,
        checkAvailability: availability(),
        getPricing: async () => ({ registrationPriceUsd: 12.98, renewalPriceUsd: 14.98, status: "READ_ONLY_VERIFIED" }),
        verifyNamecheap: async () => ({ status: "READ_ONLY_VERIFIED", domains: [] }),
        verifyCloudflare: async () => ({ status: "READ_ONLY_VERIFIED" }),
      },
      stripeFetch: stripeFetch({ products, prices, posts }),
      legal: { fetchImpl: legalFetch() },
    });
    expect(result.stripe.accountIdentityVerified).toBe("YES");
    expect(result.stripe.wrongAccountProtection).toBe("PASS");
    expect(result.stripe.objects.professionalProduct).toBe("prod_pro1");
    expect(result.stripe.objects.perDealPrice).toBe("price_deal1");
    expect(result.stripe.objects.duplicateRisk).toBe("NONE");
    expect(result.external.stripeProductWrites).toBe(0);
    expect(posts[0] ?? 0).toBe(0);
    const wrong = await executeCreCommercialProviderAccessRepairMission({
      observeInbound: false,
      expectedStripeAccountId: "acct_other",
      domain: {
        now: NOW,
        checkAvailability: availability(),
        getPricing: async () => ({ registrationPriceUsd: 12.98, renewalPriceUsd: 14.98, status: "READ_ONLY_VERIFIED" }),
        verifyNamecheap: async () => ({ status: "READ_ONLY_VERIFIED", domains: [] }),
        verifyCloudflare: async () => ({ status: "READ_ONLY_VERIFIED" }),
      },
      stripeFetch: stripeFetch({ products, prices }),
      legal: { fetchImpl: legalFetch() },
    });
    expect(wrong.stripe.wrongAccountProtection).toBe("FAIL");
    expect(wrong.stripe.accountIdentityVerified).toBe("NO");
  });

  it("detects duplicate commercial objects and fail-closes invented legal facts", () => {
    const dupes = findEquivalentCommercialObjects({
      products: [
        { id: "prod_a", name: "Professional", metadata: { infinity_venture_id: CRE_VENTURE_ID, infinity_offer_id: "professional", infinity_pricing_version: "cre_canonical_offers_v1" } },
        { id: "prod_b", name: "Professional", metadata: { infinity_venture_id: CRE_VENTURE_ID, infinity_offer_id: "professional", infinity_pricing_version: "cre_canonical_offers_v1" } },
      ],
      prices: [],
    });
    expect(dupes.duplicateRisk).toBe("PRESENT");
    const facts = searchCanonicalLegalFacts({
      extraRecords: [{ brand: "By IMR", venture_name: "CRE Lease NPV Validation" }],
    });
    expect(facts.legalEntity).toBe("UNKNOWN");
    expect(facts.companyAddress).toBe("UNKNOWN");
    expect(facts.jurisdiction).toBe("UNKNOWN");
    expect(facts.configuration).toBe("FOUNDER_CONFIGURATION_REQUIRED");
    expect(facts.invented).toBe(false);
  });

  it("reconciles the venture record, readiness, daily cycle, and zero-write guarantee", async () => {
    backfillCreVentureOperationalRecord();
    const posts: number[] = [];
    const result = await executeCreCommercialProviderAccessRepairMission({
      observeInbound: false,
      domain: {
        now: NOW,
        checkAvailability: async () => {
          throw Object.assign(new Error("ApiUser has been blocked by administrator"), { namecheapCode: "1017101" });
        },
        getPricing: async () => {
          throw Object.assign(new Error("ApiUser has been blocked by administrator"), { namecheapCode: "1017101" });
        },
        verifyNamecheap: async () => ({ status: "FAILED", failureReason: "ApiUser has been blocked by administrator", domains: [] }),
        verifyCloudflare: async () => ({ status: "READ_ONLY_VERIFIED" }),
      },
      stripeFetch: stripeFetch({ accountOk: false, posts }),
      legal: { fetchImpl: legalFetch() },
    });
    expect(result.mission).toBe(CRE_COMMERCIAL_PROVIDER_ACCESS_REPAIR_V1);
    expect(result.classification.namecheapBlockerType).toBe("PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED");
    expect(result.classification.stripeBlockerType).toBe("PROVIDER_ACCOUNT_CONFIGURATION_REQUIRED");
    expect(result.classification.codeRepairRequired).toBe("NO");
    expect(result.classification.providerAccountActionRequired).toBe("YES");
    expect(result.nextState).toBe("CRE_NAMECHEAP_AND_STRIPE_ACCOUNT_ACTION_REQUIRED");
    expect(result.record.domain_registration_state).toBe("NAMECHEAP_API_USER_BLOCKED");
    expect(result.record.legal_configuration_state).toBe("LEGAL_SURFACES_PRESENT");
    expect(result.record.public_launch_state).toBe("NO");
    expect(result.readiness.orderedBlockers[0]).toBe("NAMECHEAP_ACCOUNT_ACTION");
    expect(result.readiness.orderedBlockers).toContain("STRIPE_ACCOUNT_ACTION");
    expect(result.daily.providerAccessBlockerRecognized).toBe(true);
    expect(result.daily.commercializationWorkRecognized).toBe(true);
    expect(result.daily.externalWaitingRecognized).toBe(true);
    expect(result.experiment.state).toBe("COLLECTING");
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.experiment.tracked).toBeGreaterThanOrEqual(4);
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(result.external.domainPurchases).toBe(0);
    expect(result.external.dnsWrites).toBe(0);
    expect(result.external.stripeProductWrites).toBe(0);
    expect(result.external.charges).toBe(0);
    expect(result.external.websiteDeployments).toBe(0);
    expect(result.external.coldOutreach).toBe(0);
    expect(result.external.wave2).toBe(0);
    expect(posts[0] ?? 0).toBe(0);
    expect(JSON.stringify(result)).not.toMatch(/namecheap-test-key-fixture|rk_live_test_fixture_not_a_real_secret_value/);
    expect(result.hqMission.financialGovernance).toBe("PRESENT_IDLE");
    expect(result.hqMission.after.active).toBe(0);
    expect(result.hqMission.after.infinityDecisionCore).toBe("PRESENT_IDLE");
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(0);
    const daily = runDailyVentureOperatingCycle({ ventureId: CRE_VENTURE_ID, newInbound: 0 });
    expect(daily.providerAccessBlockerRecognized).toBe(true);
    expect(daily.snapshot.dailyResult).toBe("ORCHESTRATE_EXISTING_ENGINES");
    expect(classifyProviderAccessNextState({ namecheapReadsWork: true, stripeIdentityVerified: true })).toBe(
      "CRE_PROVIDER_ACCESS_REPAIRED_READY_FOR_COMMERCIAL_WRITES",
    );
  });
});
