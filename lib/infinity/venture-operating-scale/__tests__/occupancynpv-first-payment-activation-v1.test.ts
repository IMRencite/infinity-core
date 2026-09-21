import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  CRE_OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1,
  CRE_OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1_RUNTIME,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS,
  backfillCreVentureOperationalRecord,
  buildOccupancynpvCheckoutSessionRequest,
  composeOccupancynpvPaymentActivationFiles,
  executeCreOccupancynpvFirstPaymentActivationV1Mission,
  resetOccupancynpvDurableAuthorityStore,
  resetVentureOperatingScaleStore,
  writeVentureOperationalRecord,
} from "..";

const EVENTS = [...OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS];

function seedRecord() {
  const existing = backfillCreVentureOperationalRecord();
  return writeVentureOperationalRecord({
    ...existing,
    primary_domain: OCCUPANCYNPV_DOMAIN,
    canonical_url: "https://occupancynpv.com",
    public_url: "https://occupancynpv.com",
    public_launch_state: "NO",
    dns_state: "CONFIGURED",
    ssl_state: "VERIFIED",
    legal_configuration_state: "LEGAL_CONFIGURATION_COMPLETE",
    privacy_policy_url: "https://occupancynpv.com/privacy-policy/",
    terms_of_service_url: "https://occupancynpv.com/terms-of-service/",
    payment_provider: "stripe",
    payment_account_binding: { kind: "PROVIDER_BINDING", key: OCCUPANCYNPV_STRIPE_ACCOUNT_ID, rawSecretStored: false },
    pricing_state: "CONFIGURED",
    checkout_state: "CONFIGURED",
    analytics_provider: "infinity.performance_intelligence",
    revenue_state: "UNCONFIGURED",
    payment_webhooks: { kind: "PROVIDER_BINDING", key: "we_1UCssQLdvXKx7R7GcHonT3rh", rawSecretStored: false },
    payment_products: [
      { id: "prod_VDIjmRpY19C9HZ", name: "OccupancyNPV Professional", providerProductRef: { kind: "PROVIDER_BINDING", key: "prod_VDIjmRpY19C9HZ", rawSecretStored: false } },
      { id: "prod_VDIju0S2lBO9i5", name: "OccupancyNPV Per-Deal", providerProductRef: { kind: "PROVIDER_BINDING", key: "prod_VDIju0S2lBO9i5", rawSecretStored: false } },
    ],
    payment_prices: [
      { id: "price_1UCs7hLdvXKx7R7GF2TPmwGL", productId: "prod_VDIjmRpY19C9HZ", amountUsd: 290, providerPriceRef: { kind: "PROVIDER_BINDING", key: "price_1UCs7hLdvXKx7R7GF2TPmwGL", rawSecretStored: false } },
      { id: "price_1UCs7iLdvXKx7R7GmikBTGx4", productId: "prod_VDIju0S2lBO9i5", amountUsd: 149, providerPriceRef: { kind: "PROVIDER_BINDING", key: "price_1UCs7iLdvXKx7R7GmikBTGx4", rawSecretStored: false } },
    ],
    blocked_actions: ["PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"],
  });
}

function html(body: string, status = 200, location?: string) {
  return new Response(`<html><body>${body}</body></html>`, {
    status,
    headers: location ? { location } : undefined,
  });
}

function activationFetch(input: { accountId?: string; priceAmount?: number; webhookUrl?: string } = {}): typeof fetch {
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (path.includes("/v1/account")) {
      return new Response(JSON.stringify({
        id: input.accountId ?? OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      }), { status: 200 });
    }
    if (path.includes("/v1/products/prod_VDIjmRpY19C9HZ")) {
      return new Response(JSON.stringify({ id: "prod_VDIjmRpY19C9HZ", active: true, livemode: true }), { status: 200 });
    }
    if (path.includes("/v1/products/prod_VDIju0S2lBO9i5")) {
      return new Response(JSON.stringify({ id: "prod_VDIju0S2lBO9i5", active: true, livemode: true }), { status: 200 });
    }
    if (path.includes("/v1/prices/price_1UCs7hLdvXKx7R7GF2TPmwGL")) {
      return new Response(JSON.stringify({
        id: "price_1UCs7hLdvXKx7R7GF2TPmwGL",
        active: true,
        livemode: true,
        unit_amount: input.priceAmount ?? 29000,
        currency: "usd",
        recurring: { interval: "year", interval_count: 1 },
        product: "prod_VDIjmRpY19C9HZ",
      }), { status: 200 });
    }
    if (path.includes("/v1/prices/price_1UCs7iLdvXKx7R7GmikBTGx4")) {
      return new Response(JSON.stringify({
        id: "price_1UCs7iLdvXKx7R7GmikBTGx4",
        active: true,
        livemode: true,
        unit_amount: 14900,
        currency: "usd",
        recurring: null,
        product: "prod_VDIju0S2lBO9i5",
      }), { status: 200 });
    }
    if (path.includes("/v1/webhook_endpoints/we_1UCssQLdvXKx7R7GcHonT3rh")) {
      return new Response(JSON.stringify({
        id: "we_1UCssQLdvXKx7R7GcHonT3rh",
        url: input.webhookUrl ?? "https://occupancynpv.com/api/webhooks/stripe",
        livemode: true,
        status: "enabled",
        enabled_events: EVENTS,
      }), { status: 200 });
    }
    if (path.includes("www.occupancynpv.com")) {
      return html("", 307, "https://occupancynpv.com/");
    }
    if (path.includes("occupancynpv.com")) {
      if (path.includes("/api/checkout/start") || path.includes("/api/webhooks/stripe")) {
        return new Response("not found", { status: 404 });
      }
      if (path.includes("pricing")) return html("$290 / year $149 / deal Interest only. Payment is not collected.");
      return html("OccupancyNPV");
    }
    if (method === "POST") return new Response(JSON.stringify({ error: { message: "unexpected write" } }), { status: 403 });
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };
  return fetchImpl;
}

describe("OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetOccupancynpvDurableAuthorityStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    process.env.STRIPE_SECRET_KEY = "rk_live_fixture_not_real";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_fixture_architecture";
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetOccupancynpvDurableAuthorityStore();
    resetInboundCommunicationRuntime();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("registers the HQ wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreOccupancynpvFirstPaymentActivationV1Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1_RUNTIME].missionType).toBe(
      CRE_OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1,
    );
  });

  it("creates sessions only after activation authorization", () => {
    expect(buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL" }).createSession).toBe(false);
    expect(buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", activationAuthorized: true }).createSession).toBe(false);
    expect(buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", activationAuthorized: true }).reason).toBe("FULFILLMENT_NOT_READY");
    const activated = buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", activationAuthorized: true, fulfillmentReady: true });
    expect(activated.createSession).toBe(true);
    expect(activated.reason).toBe("PAYMENT_ACTIVATED");
    expect(buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", clientPriceId: "price_other", activationAuthorized: true, fulfillmentReady: true }).reason).toBe("ARBITRARY_PRICE_BLOCKED");
  });

  it("composes the already-defined checkout and webhook surface", () => {
    const composed = composeOccupancynpvPaymentActivationFiles();
    expect(composed.purchaseSurfaceReady).toBe(true);
    expect(composed.changedPaths).toContain("app/api/checkout/start/route.ts");
    expect(composed.changedPaths).toContain("app/api/webhooks/stripe/route.ts");
    const pricing = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx");
    expect(pricing?.content).toContain("$290 / year");
    expect(pricing?.content).toContain("$149 / deal");
    expect(pricing?.content).toContain("/api/checkout/start");
  });

  it("activates payments under founder grant without creating customer payment state", async () => {
    seedRecord();
    const result = await executeCreOccupancynpvFirstPaymentActivationV1Mission({
      reloadEnv: false,
      deploy: false,
      validateAllRoutes: false,
      fetchImpl: activationFetch(),
    });
    expect(result.mission).toBe(CRE_OCCUPANCYNPV_FIRST_PAYMENT_ACTIVATION_V1);
    expect(result.stripe.identity).toBe("PASS");
    expect(result.offers.professional.readback).toBe("PASS");
    expect(result.offers.perDeal.readback).toBe("PASS");
    expect(result.activation.succeeded).toBe("NO");
    expect(result.activation.paymentActivation).toBe("NO");
    expect(result.record.publiclyLaunched).toBe("NO");
    expect(result.gates.paymentReadinessGate).toBe("BLOCKED");
    expect(result.commercialization.cleared).toEqual([]);
    expect(result.commercialization.remaining).toContain("FULFILLMENT_CONFIGURATION");
    expect(result.runtime.perCustomerFounderApproval).toBe("NO");
    expect(result.writes).toEqual({
      productsCreated: 0,
      pricesCreated: 0,
      customersManuallyCreated: 0,
      checkoutSessionsManuallyCreated: 0,
      paymentIntentsManuallyCreated: 0,
      chargesManuallyCreated: 0,
      subscriptionsManuallyCreated: 0,
      webhookEndpointsCreated: 0,
      dnsWrites: 0,
      searchSubmissions: 0,
      outreach: 0,
      publicLaunch: 0,
    });
    expect(result.nextState).toBe("OCCUPANCYNPV_PAYMENT_ACTIVATION_BLOCKED");
    expect(result.hqMission.after.fakeContinuousActiveWork).toBe(false);
  });

  it("stops on Stripe account identity mismatch", async () => {
    seedRecord();
    const result = await executeCreOccupancynpvFirstPaymentActivationV1Mission({
      reloadEnv: false,
      deploy: false,
      validateAllRoutes: false,
      fetchImpl: activationFetch({ accountId: "acct_other" }),
    });
    expect(result.nextState).toBe("STRIPE_ACCOUNT_IDENTITY_MISMATCH");
    expect(result.activation.paymentActivation).toBe("NO");
    expect(result.writes.checkoutSessionsManuallyCreated).toBe(0);
  });

  it("stops on canonical payment object mismatch without repairing prices", async () => {
    seedRecord();
    const result = await executeCreOccupancynpvFirstPaymentActivationV1Mission({
      reloadEnv: false,
      deploy: false,
      validateAllRoutes: false,
      fetchImpl: activationFetch({ priceAmount: 99900 }),
    });
    expect(result.nextState).toBe("CANONICAL_PAYMENT_OBJECT_MISMATCH");
    expect(result.writes.pricesCreated).toBe(0);
  });

  it("stops when the webhook is not the approved production endpoint", async () => {
    seedRecord();
    const result = await executeCreOccupancynpvFirstPaymentActivationV1Mission({
      reloadEnv: false,
      deploy: false,
      validateAllRoutes: false,
      fetchImpl: activationFetch({ webhookUrl: "https://example.com/hook" }),
    });
    expect(result.nextState).toBe("WEBHOOK_ACTIVATION_BLOCKED");
    expect(result.writes.webhookEndpointsCreated).toBe(0);
  });
});
