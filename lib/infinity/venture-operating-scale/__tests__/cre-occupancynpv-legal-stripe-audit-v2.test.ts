import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import {
  CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2,
  CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2_RUNTIME,
  CRE_VENTURE_ID,
  OCCUPANCYNPV_DOMAIN,
  backfillCreVentureOperationalRecord,
  executeCreOccupancynpvLegalStripeCommercializationAuditV2Mission,
  resetVentureOperatingScaleStore,
  writeVentureOperationalRecord,
} from "..";

const HOME = `<html><footer>
<a href="/privacy-policy/">Privacy Policy</a>
<a href="/terms-of-service/">Terms of Service</a>
<a href="/sitemap.xml">Sitemap</a>
<a href="https://imros.io">An Infinity OS Venture</a>
<a href="https://infinitemediaresources.com">By IMR</a>
</footer><link rel="canonical" href="https://occupancynpv.com/" /></html>`;
const LEGAL = `<html><h1>Legal</h1><p>This public validation page describes actual behavior only.</p>
<footer>
<a href="/privacy-policy/">Privacy Policy</a>
<a href="/terms-of-service/">Terms of Service</a>
<a href="/sitemap.xml">Sitemap</a>
<a href="https://imros.io">An Infinity OS Venture</a>
<a href="https://infinitemediaresources.com">By IMR</a>
</footer></html>`;

function seedBoundRecord(extra: Record<string, unknown> = {}) {
  const existing = backfillCreVentureOperationalRecord();
  return writeVentureOperationalRecord({
    ...existing,
    primary_domain: OCCUPANCYNPV_DOMAIN,
    domain_provider: "cloudflare.registrar_v1",
    dns_state: "CONFIGURED",
    ssl_state: "VERIFIED",
    canonical_url: "https://occupancynpv.com",
    public_url: "https://occupancynpv.com",
    ...extra,
  });
}

function auditFetch(input: {
  accountId?: string;
  mismatchPrior?: boolean;
  products?: Array<Record<string, unknown>>;
  prices?: Array<Record<string, unknown>>;
  posts?: number[];
} = {}): typeof fetch {
  const products = input.products ?? [];
  const prices = input.prices ?? [];
  const posts = input.posts ?? [0];
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (method === "POST") posts[0] += 1;
    if (path.includes("/v1/account")) {
      return new Response(
        JSON.stringify({
          id: input.accountId ?? "acct_livecre1",
          livemode: true,
          country: "US",
          charges_enabled: false,
          payouts_enabled: false,
          business_profile: { name: "CRE fixture" },
        }),
        { status: 200 },
      );
    }
    if (path.includes("/v1/products") && method === "GET") {
      return new Response(JSON.stringify({ data: products }), { status: 200 });
    }
    if (path.includes("/v1/prices") && method === "GET") {
      return new Response(JSON.stringify({ data: prices }), { status: 200 });
    }
    if (path.includes("/v1/balance")) return new Response(JSON.stringify({ available: [] }), { status: 200 });
    if (path.includes("/v1/events")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
    if (path.includes("/v1/payment_intents")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
    if (path.includes("/v1/charges")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
    if (path.includes("/v1/webhook_endpoints")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
    if (path.includes("/v1/products") && method === "POST") {
      return new Response(JSON.stringify({ error: { message: "write blocked in test" } }), { status: 403 });
    }
    if (path.startsWith("https://www.occupancynpv.com")) {
      return new Response(null, { status: 308, headers: { location: "https://occupancynpv.com/" } });
    }
    if (path.includes("occupancynpv.com")) {
      const parsed = new URL(path);
      if (SEO_GEO_REDIRECTS.some((row) => parsed.pathname === row.from || parsed.pathname === `${row.from}/`)) {
        return new Response(null, { status: 308, headers: { location: "https://occupancynpv.com/lease-comparison/" } });
      }
      if (parsed.pathname.includes("privacy") || parsed.pathname.includes("terms")) {
        return new Response(LEGAL, { status: 200 });
      }
      return new Response(HOME, { status: 200 });
    }
    return new Response(JSON.stringify({ error: { message: "unmocked" } }), { status: 404 });
  };
  return fetchImpl;
}

describe("CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    delete process.env.INFINITY_LOAD_LOCAL_ENV;
    process.env.STRIPE_SECRET_KEY = "rk_live_fixture_not_real";
    process.env.VERCEL_TOKEN = "vercel_fixture_token_not_real";
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetInboundCommunicationRuntime();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.VERCEL_TOKEN;
  });

  it("registers the HQ wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreOccupancynpvLegalStripeCommercializationAuditV2Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2_RUNTIME].missionType).toBe(
      CRE_OCCUPANCYNPV_LEGAL_STRIPE_COMMERCIALIZATION_AUDIT_V2,
    );
  });

  it("reconciles infrastructure, keeps legal incomplete, and does not create Stripe objects without write authorization", async () => {
    seedBoundRecord();
    const posts = [0];
    const result = await executeCreOccupancynpvLegalStripeCommercializationAuditV2Mission({
      reloadEnv: false,
      fetchImpl: auditFetch({ posts }),
    });
    expect(result.infrastructure.https).toBe("PASS");
    expect(result.infrastructure.dnsConfigured).toBe("YES");
    expect(result.infrastructure.productionDomainBound).toBe("YES");
    expect(result.infrastructure.sslConfigured).toBe("YES");
    expect(result.legal.configuration).toBe("INCOMPLETE");
    expect(result.legal.missingFacts).toEqual(expect.arrayContaining(["legal_entity", "company_address", "jurisdiction", "support_email"]));
    expect(result.legal.invented).toBe(false);
    expect(result.stripe.identityVerified).toBe("YES");
    expect(result.writes.existingAuthorization).toBe("NO");
    expect(result.writes.state).toBe("PAYMENT_CONFIGURATION_WRITE_AUTHORIZATION_REQUIRED");
    expect(result.writes.productsCreated).toBe(0);
    expect(result.writes.pricesCreated).toBe(0);
    expect(posts[0]).toBe(0);
    expect(result.checkout.activation).toBe("NO");
    expect(result.webhook.mutation).toBe("NO");
    expect(result.paymentReadiness.gate).toBe("BLOCKED");
    expect(result.record.publiclyLaunched).toBe("NO");
    expect(result.commercialization.cleared).toEqual([
      "DNS_CONFIGURATION",
      "PRODUCTION_DOMAIN_BINDING",
      "SSL_VERIFICATION",
    ]);
    expect(result.commercialization.remaining).toEqual(expect.arrayContaining(["LEGAL_CONFIGURATION"]));
    expect(result.actions.dnsWrites).toBe(0);
    expect(result.actions.deployments).toBe(0);
    expect(result.nextState).toBe("CRE_LEGAL_CONFIGURATION_REQUIRED");
    expect(result.nextGovernedAction).toBe("FOUNDER_LEGAL_CONFIGURATION_REQUIRED");
  });

  it("stops Stripe writes on account identity mismatch", async () => {
    seedBoundRecord({
      payment_account_binding: { kind: "PROVIDER_BINDING", key: "acct_other1", rawSecretStored: false },
    });
    const posts = [0];
    const result = await executeCreOccupancynpvLegalStripeCommercializationAuditV2Mission({
      reloadEnv: false,
      persistRecord: false,
      validateAllRoutes: false,
      fetchImpl: auditFetch({ accountId: "acct_livecre1", posts }),
    });
    expect(result.stripe.mismatch).toBe(true);
    expect(result.stripe.identityVerified).toBe("NO");
    expect(result.writes.productsCreated).toBe(0);
    expect(posts[0]).toBe(0);
    expect(result.nextState).toBe("CRE_STRIPE_ACCOUNT_VERIFICATION_REQUIRED");
    expect(result.nextGovernedAction).toBe("STRIPE_ACCOUNT_IDENTITY_MISMATCH");
  });

  it("reuses exact existing offers without creating duplicates", async () => {
    seedBoundRecord();
    const posts = [0];
    const result = await executeCreOccupancynpvLegalStripeCommercializationAuditV2Mission({
      reloadEnv: false,
      fetchImpl: auditFetch({
        posts,
        products: [
          { id: "prod_pro1", name: "Professional", metadata: { infinity_venture_id: CRE_VENTURE_ID, infinity_offer_id: "professional", infinity_pricing_version: "cre_canonical_offers_v1" } },
          { id: "prod_deal1", name: "Per-deal", metadata: { infinity_venture_id: CRE_VENTURE_ID, infinity_offer_id: "per_deal", infinity_pricing_version: "cre_canonical_offers_v1" } },
        ],
        prices: [
          { id: "price_pro1", unit_amount: 29000, currency: "usd", recurring: { interval: "year" }, metadata: { infinity_venture_id: CRE_VENTURE_ID, infinity_offer_id: "professional", infinity_pricing_version: "cre_canonical_offers_v1" } },
          { id: "price_deal1", unit_amount: 14900, currency: "usd", metadata: { infinity_venture_id: CRE_VENTURE_ID, infinity_offer_id: "per_deal", infinity_pricing_version: "cre_canonical_offers_v1" } },
        ],
      }),
    });
    expect(result.professional.exactMatch).toBe("YES");
    expect(result.perDeal.exactMatch).toBe("YES");
    expect(result.writes.productsCreated).toBe(0);
    expect(result.writes.pricesCreated).toBe(0);
    expect(result.writes.duplicateObjects).toBe(0);
    expect(posts[0]).toBe(0);
    expect(result.checkout.configuration).toBe("READY_TO_CONFIGURE");
    expect(result.nextState).toBe("CRE_LEGAL_CONFIGURATION_REQUIRED");
  });
});
