import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { reloadStripeSecretFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { LOCKED_CRE_EXPERIMENT_ID, LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2,
  CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2_RUNTIME,
  CRE_STRIPE_REVERIFICATION_AND_COMMERCIAL_CONFIGURATION_RUNTIME,
  CRE_STRIPE_REVERIFICATION_AND_COMMERCIAL_CONFIGURATION_V1,
  CRE_VENTURE_ID,
  GOVERNED_PAYMENT_CONFIGURATION_AUTHORIZATION,
  backfillCreVentureOperationalRecord,
  classifyPriceMatch,
  classifyProductMatch,
  executeCreStripeAccountReverificationAndConfigurationV2Mission,
  executeCreStripeReverificationAndCommercialConfigurationMission,
  resetVentureOperatingScaleStore,
  summarizeOfferMatches,
} from "..";

function stripeState() {
  const products: Array<Record<string, unknown>> = [];
  const prices: Array<Record<string, unknown>> = [];
  const posts: number[] = [0];
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (method === "POST") posts[0] += 1;
    if (path.endsWith("/v1/account") && method === "GET") {
      return new Response(
        JSON.stringify({
          id: "acct_livecre1",
          livemode: true,
          country: "US",
          default_currency: "usd",
          type: "standard",
          business_profile: { name: "CRE fixture" },
        }),
        { status: 200 },
      );
    }
    if (path.includes("/v1/products") && method === "GET" && !path.includes("/prod_")) {
      return new Response(JSON.stringify({ data: products }), { status: 200 });
    }
    if (path.includes("/v1/prices") && method === "GET" && !path.includes("/price_")) {
      return new Response(JSON.stringify({ data: prices }), { status: 200 });
    }
    if (path.includes("/v1/products/") && method === "GET") {
      const id = path.split("/").pop();
      return new Response(JSON.stringify(products.find((row) => row.id === id) ?? {}), { status: 200 });
    }
    if (path.includes("/v1/prices/") && method === "GET") {
      const id = path.split("/").pop();
      return new Response(JSON.stringify(prices.find((row) => row.id === id) ?? {}), { status: 200 });
    }
    if (path.includes("/v1/balance")) return new Response(JSON.stringify({ available: [], livemode: true }), { status: 200 });
    if (path.includes("/v1/events")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
    if (path.includes("/v1/payment_intents")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
    if (path.includes("/v1/charges")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
    if (path.includes("/v1/webhook_endpoints")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
    if (path.endsWith("/v1/products") && method === "POST") {
      if (products.length >= 2) return new Response(JSON.stringify({ error: { message: "ceiling" } }), { status: 400 });
      const body = String(init?.body ?? "");
      const name = decodeURIComponent(/name=([^&]+)/.exec(body)?.[1] ?? "Professional");
      const id = name === "Per-deal" ? "prod_deal1" : "prod_pro1";
      const offerId = name === "Per-deal" ? "per_deal" : "professional";
      const row = {
        id,
        livemode: true,
        name,
        active: true,
        metadata: {
          infinity_venture_id: CRE_VENTURE_ID,
          infinity_offer_id: offerId,
          infinity_pricing_version: "cre_canonical_offers_v1",
        },
      };
      products.push(row);
      return new Response(JSON.stringify(row), { status: 200 });
    }
    if (path.endsWith("/v1/prices") && method === "POST") {
      if (prices.length >= 2) return new Response(JSON.stringify({ error: { message: "ceiling" } }), { status: 400 });
      const body = String(init?.body ?? "");
      const amount = Number(/unit_amount=([^&]+)/.exec(body)?.[1] ?? "0");
      const product = /product=([^&]+)/.exec(body)?.[1];
      const recurring = body.includes("recurring");
      const id = amount === 14900 ? "price_deal1" : "price_pro1";
      const row = {
        id,
        livemode: true,
        active: true,
        unit_amount: amount,
        currency: "usd",
        product,
        recurring: recurring ? { interval: "year" } : null,
        metadata: {
          infinity_venture_id: CRE_VENTURE_ID,
          infinity_offer_id: amount === 14900 ? "per_deal" : "professional",
          infinity_pricing_version: "cre_canonical_offers_v1",
        },
      };
      prices.push(row);
      return new Response(JSON.stringify(row), { status: 200 });
    }
    return new Response(JSON.stringify({ error: { message: "unhandled" } }), { status: 404 });
  };
  return { fetchImpl, posts, products, prices };
}

describe("CRE_STRIPE_REVERIFICATION_AND_COMMERCIAL_CONFIGURATION_V1", () => {
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

  it("registers the wrapper and reloads Stripe env without printing the secret", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreStripeReverificationAndCommercialConfigurationRuntime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_STRIPE_REVERIFICATION_AND_COMMERCIAL_CONFIGURATION_RUNTIME].missionType).toBe(
      CRE_STRIPE_REVERIFICATION_AND_COMMERCIAL_CONFIGURATION_V1,
    );
    const dir = join(tmpdir(), `infinity-stripe-reload-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, ".env.local"), "STRIPE_SECRET_KEY=rk_live_updated_fixture_value_not_real\n");
    const prior = process.env.INFINITY_LOAD_LOCAL_ENV;
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.STRIPE_SECRET_KEY = "rk_live_old_fixture_value_not_real";
    const reload = reloadStripeSecretFromLocalFile(dir);
    if (prior) process.env.INFINITY_LOAD_LOCAL_ENV = prior;
    else delete process.env.INFINITY_LOAD_LOCAL_ENV;
    expect(reload.loaded).toBe(true);
    expect(reload.replaced).toBe(true);
    expect(reload.confirmed).toBe(true);
    expect(reload.keyPresent).toBe("YES");
    expect(JSON.stringify(reload)).not.toMatch(/rk_live_/);
  });

  it("stops when the Stripe runtime key cannot be confirmed", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const result = await executeCreStripeReverificationAndCommercialConfigurationMission({
      reloadEnv: false,
      fetchImpl: async () => new Response("{}", { status: 500 }),
    });
    expect(result.env.updatedKeyLoaded).toBe("NO");
    expect(result.env.stopReason).toBe("STRIPE_RUNTIME_ENV_RELOAD_REQUIRED");
    expect(result.nextState).toBe("STRIPE_RUNTIME_ENV_RELOAD_REQUIRED");
    expect(result.writes.productsCreated).toBe(0);
    expect(result.writes.pricesCreated).toBe(0);
  });

  it("stops before writes when account identity fails", async () => {
    const posts = [0];
    const result = await executeCreStripeReverificationAndCommercialConfigurationMission({
      reloadEnv: false,
      fetchImpl: async (url, init) => {
        if ((init?.method ?? "GET") === "POST") posts[0] += 1;
        if (String(url).endsWith("/v1/account")) {
          return new Response(
            JSON.stringify({
              error: {
                code: "more_permissions_required",
                message: "Permission denied. The provided key 'rk_live_...Ab12' needs Accounts Read.",
              },
            }),
            { status: 403 },
          );
        }
        return new Response(JSON.stringify({ available: [] }), { status: 200 });
      },
    });
    expect(result.identity.verified).toBe("FAIL");
    expect(result.writes.productsCreated).toBe(0);
    expect(result.writes.pricesCreated).toBe(0);
    expect(result.nextState).toBe("CRE_STRIPE_ACCOUNT_IDENTITY_REPAIR_REQUIRED");
    expect(posts[0]).toBe(0);
    expect(JSON.stringify(result)).not.toMatch(/rk_live_/);
    expect(result.writes.stoppedReason).toContain("[REDACTED_STRIPE_KEY]");
  });

  it("blocks the wrong Stripe account and does not write", async () => {
    const state = stripeState();
    const result = await executeCreStripeReverificationAndCommercialConfigurationMission({
      reloadEnv: false,
      expectedAccountId: "acct_other",
      fetchImpl: state.fetchImpl,
    });
    expect(result.identity.wrongAccountProtection).toBe("FAIL");
    expect(result.writes.productsCreated).toBe(0);
    expect(state.posts[0]).toBe(0);
  });

  it("classifies exact, partial, and conflicting offer matches", () => {
    const exact = {
      id: "prod_pro1",
      name: "Professional",
      metadata: {
        infinity_venture_id: CRE_VENTURE_ID,
        infinity_offer_id: "professional",
        infinity_pricing_version: "cre_canonical_offers_v1",
      },
    };
    expect(classifyProductMatch(exact, { offerId: "professional", name: "Professional", amount: 29000, currency: "usd", recurring: "year" })).toBe(
      "EXACT_EXISTING_MATCH",
    );
    expect(classifyProductMatch({ id: "prod_x", name: "Professional" }, { offerId: "professional", name: "Professional", amount: 29000, currency: "usd", recurring: "year" })).toBe(
      "PARTIAL_MATCH",
    );
    expect(
      classifyPriceMatch(
        { id: "price_x", unit_amount: 10000, currency: "usd", metadata: { infinity_venture_id: CRE_VENTURE_ID, infinity_offer_id: "professional", infinity_pricing_version: "cre_canonical_offers_v1" } },
        { offerId: "professional", name: "Professional", amount: 29000, currency: "usd", recurring: "year" },
      ),
    ).toBe("CONFLICTING_MATCH");
    expect(
      summarizeOfferMatches(
        [exact, { ...exact, id: "prod_pro2" }],
        [],
        { offerId: "professional", name: "Professional", amount: 29000, currency: "usd", recurring: "year" },
      ).kind,
    ).toBe("CONFLICTING_MATCH");
  });

  it("creates at most two products and prices, then reuses them idempotently", async () => {
    backfillCreVentureOperationalRecord();
    const state = stripeState();
    const first = await executeCreStripeReverificationAndCommercialConfigurationMission({
      reloadEnv: false,
      fetchImpl: state.fetchImpl,
    });
    expect(first.env.keyType).toBe("RESTRICTED");
    expect(first.env.environment).toBe("LIVE");
    expect(first.identity.verified).toBe("PASS");
    expect(first.identity.wrongAccountProtection).toBe("PASS");
    expect(first.reads["product.read"]).toBe("READ_ONLY_VERIFIED");
    expect(first.reads["price.read"]).toBe("READ_ONLY_VERIFIED");
    expect(first.reads["charge.read"]).toBe("READ_ONLY_VERIFIED");
    expect(first.writes.authorization).toBe(GOVERNED_PAYMENT_CONFIGURATION_AUTHORIZATION);
    expect(first.writes.productsCreated).toBe(2);
    expect(first.writes.pricesCreated).toBe(2);
    expect(first.professional.productId).toBe("prod_pro1");
    expect(first.professional.priceId).toBe("price_pro1");
    expect(first.professional.amount).toBe(290);
    expect(first.professional.billing).toBe("RECURRING_ANNUAL");
    expect(first.professional.readback).toBe("PASS");
    expect(first.perDeal.productId).toBe("prod_deal1");
    expect(first.perDeal.priceId).toBe("price_deal1");
    expect(first.perDeal.amount).toBe(149);
    expect(first.perDeal.billing).toBe("ONE_TIME");
    expect(first.perDeal.readback).toBe("PASS");
    expect(first.writes["product.create"]).toBe("LIVE_WRITE_VERIFIED");
    expect(first.writes["price.create"]).toBe("LIVE_WRITE_VERIFIED");
    expect(first.writes["checkout/session.create"]).toBe("UNVERIFIED");
    expect(first.writes["webhook.create"]).toBe("UNVERIFIED");
    expect(first.writes.customers).toBe(0);
    expect(first.writes.checkoutSessions).toBe(0);
    expect(first.writes.webhooksCreated).toBe(0);
    expect(first.writes.charges).toBe(0);
    expect(first.configurationComplete).toBe(true);
    expect(first.activationReady).toBe(false);
    expect(first.paymentGate.result).toBe("CONFIGURATION_COMPLETE");
    expect(first.paymentGate.paymentsActive).toBe(false);
    expect(first.remainingBlockers).toEqual(
      expect.arrayContaining([
        "domain_public_url_unconfigured",
        "legal_configuration_incomplete",
        "checkout_configuration_unverified",
        "webhook_domain_dependency",
        "payment_activation_not_authorized",
      ]),
    );
    expect(first.nextState).toBe("CRE_STRIPE_COMMERCIAL_CONFIGURATION_COMPLETE");
    expect(first.record.payment_products).toHaveLength(2);
    expect(first.record.payment_prices).toHaveLength(2);
    expect(first.record.domain_registration_state).toBe("NAMECHEAP_API_USER_BLOCKED");
    expect(first.record.privacy_policy_url).toContain("/privacy-policy/");
    expect(first.record.terms_of_service_url).toContain("/terms-of-service/");
    expect(first.record.domain_history.some((row) => row.domain === "leasenpv.com" && row.event === "SELECTED")).toBe(true);
    expect(first.namecheap).toBe("NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR");
    expect(first.experiment.state).toBe("COLLECTING");
    expect(first.experiment.clockRestarted).toBe(false);
    expect(first.experiment.tracked).toBeGreaterThanOrEqual(4);
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(first.hqMission.financialGovernance).toBe("ACTIVE_WORK");
    expect(first.hqMission.researchGrid).toBe("PRESENT_IDLE");
    expect(first.hqMission.after.active).toBe(0);
    expect(first.hqMission.after.infinityDecisionCore).toBe("PRESENT_IDLE");
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(0);
    const afterCreates = state.posts[0];
    const second = await executeCreStripeReverificationAndCommercialConfigurationMission({
      reloadEnv: false,
      fetchImpl: state.fetchImpl,
    });
    expect(second.writes.productsCreated).toBe(0);
    expect(second.writes.pricesCreated).toBe(0);
    expect(second.professional.reused).toBe(true);
    expect(second.perDeal.reused).toBe(true);
    expect(second.idempotency.secondReconciliation).toBe("PASS");
    expect(second.idempotency.duplicateProducts).toBe(0);
    expect(second.idempotency.duplicatePrices).toBe(0);
    expect(state.posts[0]).toBe(afterCreates);
    expect(JSON.stringify(first)).not.toMatch(/rk_live_test_fixture_not_a_real_secret_value/);
  });

  it("stops on a partial match instead of creating a duplicate", async () => {
    const state = stripeState();
    state.products.push({ id: "prod_loose", name: "Professional" });
    const result = await executeCreStripeReverificationAndCommercialConfigurationMission({
      reloadEnv: false,
      fetchImpl: state.fetchImpl,
    });
    expect(result.preexisting.professionalMatch).toBe("PARTIAL_MATCH");
    expect(result.writes.productsCreated).toBe(0);
    expect(result.writes.pricesCreated).toBe(0);
    expect(result.nextState).toBe("CRE_STRIPE_CONFIGURATION_REPAIR_REQUIRED");
  });

  it("registers V2 and configures both canonical offers under the V2 HQ wrapper", async () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreStripeAccountReverificationAndConfigurationV2Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2_RUNTIME].missionType).toBe(
      CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2,
    );
    backfillCreVentureOperationalRecord();
    const state = stripeState();
    const first = await executeCreStripeAccountReverificationAndConfigurationV2Mission({
      reloadEnv: false,
      fetchImpl: state.fetchImpl,
    });
    expect(first.mission).toBe(CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2);
    expect(first.hqMission.mission).toBe(CRE_STRIPE_ACCOUNT_REVERIFICATION_AND_CONFIGURATION_V2);
    expect(first.identity.verified).toBe("PASS");
    expect(first.writes.productsCreated).toBe(2);
    expect(first.writes.pricesCreated).toBe(2);
    expect(first.professional.readback).toBe("PASS");
    expect(first.perDeal.readback).toBe("PASS");
    expect(first.configurationComplete).toBe(true);
    expect(first.activationReady).toBe(false);
    expect(first.hqMission.after.active).toBe(0);
    expect(first.hqMission.after.infinityDecisionCore).toBe("PRESENT_IDLE");
    const afterCreates = state.posts[0];
    const second = await executeCreStripeAccountReverificationAndConfigurationV2Mission({
      reloadEnv: false,
      fetchImpl: state.fetchImpl,
    });
    expect(second.writes.productsCreated).toBe(0);
    expect(second.writes.pricesCreated).toBe(0);
    expect(second.idempotency.secondReconciliation).toBe("PASS");
    expect(state.posts[0]).toBe(afterCreates);
  });
});
