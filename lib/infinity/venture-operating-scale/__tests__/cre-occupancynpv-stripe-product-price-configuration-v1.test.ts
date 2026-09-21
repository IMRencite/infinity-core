import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1,
  CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1_RUNTIME,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  backfillCreVentureOperationalRecord,
  executeCreOccupancynpvStripeProductPriceConfigurationV1Mission,
  resetVentureOperatingScaleStore,
  writeVentureOperationalRecord,
} from "..";

function seedRecord() {
  const existing = backfillCreVentureOperationalRecord();
  return writeVentureOperationalRecord({
    ...existing,
    primary_domain: OCCUPANCYNPV_DOMAIN,
    canonical_url: "https://occupancynpv.com",
    public_url: "https://occupancynpv.com",
    dns_state: "CONFIGURED",
    ssl_state: "VERIFIED",
    legal_configuration_state: "LEGAL_CONFIGURATION_COMPLETE",
    privacy_policy_url: "https://occupancynpv.com/privacy-policy/",
    terms_of_service_url: "https://occupancynpv.com/terms-of-service/",
    payment_provider: "stripe",
    payment_account_binding: { kind: "PROVIDER_BINDING", key: OCCUPANCYNPV_STRIPE_ACCOUNT_ID, rawSecretStored: false },
  });
}

function stripeFetch(input: {
  accountId?: string;
  products?: Array<Record<string, unknown>>;
  prices?: Array<Record<string, unknown>>;
  posts?: number[];
  denyWrite?: boolean;
} = {}): typeof fetch {
  const products = [...(input.products ?? [])];
  const prices = [...(input.prices ?? [])];
  const posts = input.posts ?? [0];
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (method === "POST") posts[0] += 1;
    if (path.includes("/v1/account")) {
      return new Response(
        JSON.stringify({
          id: input.accountId ?? OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
          livemode: true,
          country: "US",
          charges_enabled: true,
          payouts_enabled: true,
        }),
        { status: 200 },
      );
    }
    if (path.includes("/v1/products") && method === "GET" && !/\/v1\/products\/prod_/.test(path)) {
      return new Response(JSON.stringify({ data: products }), { status: 200 });
    }
    if (path.includes("/v1/prices") && method === "GET" && !/\/v1\/prices\/price_/.test(path)) {
      return new Response(JSON.stringify({ data: prices }), { status: 200 });
    }
    if (path.includes("/v1/products") && method === "POST") {
      if (input.denyWrite) return new Response(JSON.stringify({ error: { message: "Permission denied" } }), { status: 403 });
      const created = {
        id: `prod_${products.length + 1}`,
        name: path.includes("never") ? "x" : products.length === 0 ? "OccupancyNPV Professional" : "OccupancyNPV Per-Deal",
        active: true,
        metadata: { infinity_venture: "occupancynpv", infinity_offer: products.length === 0 ? "PROFESSIONAL" : "PER_DEAL", infinity_environment: "production" },
      };
      products.push(created);
      return new Response(JSON.stringify(created), { status: 200 });
    }
    if (path.includes("/v1/prices") && method === "POST") {
      if (input.denyWrite) return new Response(JSON.stringify({ error: { message: "Permission denied" } }), { status: 403 });
      const created = {
        id: `price_${prices.length + 1}`,
        product: products[prices.length]?.id ?? "prod_1",
        unit_amount: prices.length === 0 ? 29000 : 14900,
        currency: "usd",
        active: true,
        recurring: prices.length === 0 ? { interval: "year", interval_count: 1 } : null,
        metadata: { infinity_venture: "occupancynpv", infinity_offer: prices.length === 0 ? "PROFESSIONAL" : "PER_DEAL", infinity_environment: "production" },
      };
      prices.push(created);
      return new Response(JSON.stringify(created), { status: 200 });
    }
    const productGet = path.match(/\/v1\/products\/(prod_[A-Za-z0-9]+)/);
    if (productGet) {
      return new Response(JSON.stringify(products.find((row) => row.id === productGet[1]) ?? {}), { status: 200 });
    }
    const priceGet = path.match(/\/v1\/prices\/(price_[A-Za-z0-9]+)/);
    if (priceGet) {
      return new Response(JSON.stringify(prices.find((row) => row.id === priceGet[1]) ?? {}), { status: 200 });
    }
    if (method === "POST") return new Response(JSON.stringify({ error: { message: "unexpected write" } }), { status: 403 });
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };
  return fetchImpl;
}

describe("CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    delete process.env.INFINITY_LOAD_LOCAL_ENV;
    process.env.STRIPE_SECRET_KEY = "rk_live_fixture_not_real";
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetInboundCommunicationRuntime();
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("registers the HQ wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreOccupancynpvStripeProductPriceConfigurationV1Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1_RUNTIME].missionType).toBe(
      CRE_OCCUPANCYNPV_STRIPE_PRODUCT_PRICE_CONFIGURATION_V1,
    );
  });

  it("stops with zero writes on account identity mismatch", async () => {
    seedRecord();
    const posts = [0];
    const result = await executeCreOccupancynpvStripeProductPriceConfigurationV1Mission({
      reloadEnv: false,
      fetchImpl: stripeFetch({ accountId: "acct_other1", posts }),
    });
    expect(result.nextState).toBe("CRE_STRIPE_ACCOUNT_IDENTITY_MISMATCH");
    expect(result.writes.productsCreated).toBe(0);
    expect(result.writes.pricesCreated).toBe(0);
    expect(posts[0]).toBe(0);
    expect(result.actions.charges).toBe(0);
    expect(result.record.publiclyLaunched).toBe("NO");
  });

  it("reuses exact existing objects without creating duplicates", async () => {
    seedRecord();
    const posts = [0];
    const result = await executeCreOccupancynpvStripeProductPriceConfigurationV1Mission({
      reloadEnv: false,
      fetchImpl: stripeFetch({
        posts,
        products: [
          { id: "prod_pro1", name: "OccupancyNPV Professional", active: true, metadata: { infinity_venture: "occupancynpv", infinity_offer: "PROFESSIONAL", infinity_environment: "production" } },
          { id: "prod_deal1", name: "OccupancyNPV Per-Deal", active: true, metadata: { infinity_venture: "occupancynpv", infinity_offer: "PER_DEAL", infinity_environment: "production" } },
        ],
        prices: [
          { id: "price_pro1", product: "prod_pro1", unit_amount: 29000, currency: "usd", active: true, recurring: { interval: "year", interval_count: 1 }, metadata: { infinity_venture: "occupancynpv", infinity_offer: "PROFESSIONAL" } },
          { id: "price_deal1", product: "prod_deal1", unit_amount: 14900, currency: "usd", active: true, metadata: { infinity_venture: "occupancynpv", infinity_offer: "PER_DEAL" } },
        ],
      }),
    });
    expect(result.professional.productExistedBefore).toBe("YES");
    expect(result.perDeal.productExistedBefore).toBe("YES");
    expect(result.writes.productsCreated).toBe(0);
    expect(result.writes.pricesCreated).toBe(0);
    expect(posts[0]).toBe(0);
    expect(result.professional.productId).toBe("prod_pro1");
    expect(result.perDeal.priceId).toBe("price_deal1");
    expect(result.duplicateProtection.result).toBe("PASS");
    expect(result.nextState).toBe("CRE_CANONICAL_STRIPE_CONFIGURATION_COMPLETE");
    expect(result.nextGovernedAction).toBe("CHECKOUT_WEBHOOK_AND_ANALYTICS_CONFIGURATION");
  });

  it("creates exactly two products and two prices when none exist", async () => {
    seedRecord();
    const posts = [0];
    const result = await executeCreOccupancynpvStripeProductPriceConfigurationV1Mission({
      reloadEnv: false,
      fetchImpl: stripeFetch({ posts }),
    });
    expect(result.identity.accountId).toBe(OCCUPANCYNPV_STRIPE_ACCOUNT_ID);
    expect(result.writes.productsCreated).toBe(2);
    expect(result.writes.pricesCreated).toBe(2);
    expect(result.writes.customers).toBe(0);
    expect(result.writes.checkoutSessions).toBe(0);
    expect(result.writes.charges).toBe(0);
    expect(result.professional.productReadback).toBe("PASS");
    expect(result.professional.priceReadback).toBe("PASS");
    expect(result.perDeal.productReadback).toBe("PASS");
    expect(result.perDeal.priceReadback).toBe("PASS");
    expect(result.commercialization.cleared).toContain("PAYMENT_CONFIGURATION");
    expect(result.commercialization.remaining).toEqual(
      expect.arrayContaining(["CHECKOUT_CONFIGURATION", "WEBHOOK_CONFIGURATION", "ANALYTICS_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"]),
    );
    expect(result.commercialization.remaining).not.toContain("PAYMENT_CONFIGURATION");
    expect(result.paymentReadiness.gate).toBe("BLOCKED");
    expect(result.checkout.activation).toBe("NO");
    expect(result.webhook.mutation).toBe("NO");
    expect(result.nextState).toBe("CRE_CANONICAL_STRIPE_CONFIGURATION_COMPLETE");
    expect(posts[0]).toBe(4);
  });

  it("stops on missing write permission without requesting a broader key", async () => {
    seedRecord();
    const posts = [0];
    const result = await executeCreOccupancynpvStripeProductPriceConfigurationV1Mission({
      reloadEnv: false,
      fetchImpl: stripeFetch({ posts, denyWrite: true }),
    });
    expect(result.nextState).toBe("CRE_STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED");
    expect(result.writes.productsCreated).toBe(0);
    expect(result.writes.pricesCreated).toBe(0);
    expect(result.identity.providerError).toBe("STRIPE_PRODUCT_PRICE_PERMISSION_REQUIRED");
  });

  it("does not create when duplicate canonical objects already exist", async () => {
    seedRecord();
    const posts = [0];
    const result = await executeCreOccupancynpvStripeProductPriceConfigurationV1Mission({
      reloadEnv: false,
      fetchImpl: stripeFetch({
        posts,
        products: [
          { id: "prod_a", name: "OccupancyNPV Professional", active: true, metadata: { infinity_venture: "occupancynpv", infinity_offer: "PROFESSIONAL" } },
          { id: "prod_b", name: "OccupancyNPV Professional", active: true, metadata: { infinity_venture: "occupancynpv", infinity_offer: "PROFESSIONAL" } },
        ],
        prices: [],
      }),
    });
    expect(posts[0]).toBe(0);
    expect(result.writes.productsCreated).toBe(0);
    expect(result.duplicateProtection.result).toBe("FAIL");
    expect(result.nextState).toBe("CRE_STRIPE_CONFIGURATION_FAILED");
  });
});
