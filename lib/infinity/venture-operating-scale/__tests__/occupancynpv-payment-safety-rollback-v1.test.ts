import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  CRE_OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1,
  CRE_OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1_RUNTIME,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS,
  backfillCreVentureOperationalRecord,
  buildOccupancynpvCheckoutSessionRequest,
  composeOccupancynpvPaymentSafetyRollbackFiles,
  evaluateFulfillmentReadinessGate,
  evaluatePaidOfferFulfillmentInvariant,
  evaluatePaymentReadinessGate,
  executeCreOccupancynpvPaymentSafetyRollbackV1Mission,
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
    checkout_state: "ACTIVATED",
    analytics_provider: "infinity.performance_intelligence",
    revenue_state: "PAYMENT_ACTIVATED",
    fulfillment_state: "UNCONFIGURED",
    payment_webhooks: { kind: "PROVIDER_BINDING", key: "we_1UCssQLdvXKx7R7GcHonT3rh", rawSecretStored: false },
    payment_products: [
      { id: "prod_VDIjmRpY19C9HZ", name: "OccupancyNPV Professional", providerProductRef: { kind: "PROVIDER_BINDING", key: "prod_VDIjmRpY19C9HZ", rawSecretStored: false } },
      { id: "prod_VDIju0S2lBO9i5", name: "OccupancyNPV Per-Deal", providerProductRef: { kind: "PROVIDER_BINDING", key: "prod_VDIju0S2lBO9i5", rawSecretStored: false } },
    ],
    payment_prices: [
      { id: "price_1UCs7hLdvXKx7R7GF2TPmwGL", productId: "prod_VDIjmRpY19C9HZ", amountUsd: 290, providerPriceRef: { kind: "PROVIDER_BINDING", key: "price_1UCs7hLdvXKx7R7GF2TPmwGL", rawSecretStored: false } },
      { id: "price_1UCs7iLdvXKx7R7GmikBTGx4", productId: "prod_VDIju0S2lBO9i5", amountUsd: 149, providerPriceRef: { kind: "PROVIDER_BINDING", key: "price_1UCs7iLdvXKx7R7GmikBTGx4", rawSecretStored: false } },
    ],
    blocked_actions: ["PUBLIC_LAUNCH"],
  });
}

function html(body: string, status = 200, location?: string) {
  return new Response(`<html><body>${body}</body></html>`, {
    status,
    headers: location ? { location } : undefined,
  });
}

function rollbackFetch(): typeof fetch {
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (path.includes("/v1/checkout/sessions") || path.includes("/v1/customers") || path.includes("/v1/payment_intents") || path.includes("/v1/charges") || path.includes("/v1/subscriptions") || path.includes("/v1/invoices")) {
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }
    if (path.includes("/v1/products/prod_VDIjmRpY19C9HZ")) {
      return new Response(JSON.stringify({ id: "prod_VDIjmRpY19C9HZ", active: true }), { status: 200 });
    }
    if (path.includes("/v1/products/prod_VDIju0S2lBO9i5")) {
      return new Response(JSON.stringify({ id: "prod_VDIju0S2lBO9i5", active: true }), { status: 200 });
    }
    if (path.includes("/v1/prices/price_1UCs7hLdvXKx7R7GF2TPmwGL")) {
      return new Response(JSON.stringify({ id: "price_1UCs7hLdvXKx7R7GF2TPmwGL", unit_amount: 29000, currency: "usd", active: true }), { status: 200 });
    }
    if (path.includes("/v1/prices/price_1UCs7iLdvXKx7R7GmikBTGx4")) {
      return new Response(JSON.stringify({ id: "price_1UCs7iLdvXKx7R7GmikBTGx4", unit_amount: 14900, currency: "usd", active: true }), { status: 200 });
    }
    if (path.includes("/v1/webhook_endpoints/we_1UCssQLdvXKx7R7GcHonT3rh")) {
      return new Response(JSON.stringify({
        id: "we_1UCssQLdvXKx7R7GcHonT3rh",
        url: "https://occupancynpv.com/api/webhooks/stripe",
        livemode: true,
        status: "enabled",
        enabled_events: EVENTS,
      }), { status: 200 });
    }
    if (path.includes("www.occupancynpv.com")) return html("", 307, "https://occupancynpv.com/");
    if (path.includes("occupancynpv.com")) {
      if (path.includes("/api/checkout/start") && method === "POST") {
        return new Response(JSON.stringify({ ok: false, reason: "FULFILLMENT_NOT_READY", createSession: false }), { status: 403 });
      }
      if (path.includes("/api/checkout/start")) {
        return new Response(JSON.stringify({ activated: false, createSession: false, fulfillment: "UNCONFIGURED" }), { status: 200 });
      }
      if (path.includes("/api/webhooks/stripe")) {
        return new Response(JSON.stringify({ ready: true, createCustomerState: false }), { status: 200 });
      }
      if (path.includes("pricing")) return html("$290 / year $149 / deal Interest only — not a purchase");
      return html("OccupancyNPV");
    }
    if (method === "POST") return new Response(JSON.stringify({ error: { message: "unexpected write" } }), { status: 403 });
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };
  return fetchImpl;
}

describe("OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1", () => {
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
    expect(registry.contracts[CRE_OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1_RUNTIME].missionType).toBe(
      CRE_OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1,
    );
  });

  it("blocks checkout when a paid offer exists and fulfillment is not PASS", () => {
    const invariant = evaluatePaidOfferFulfillmentInvariant({
      paidOfferExists: true,
      fulfillment: evaluateFulfillmentReadinessGate().result,
    });
    expect(invariant.paymentActivation).toBe("BLOCKED");
    expect(invariant.checkoutSessionCreation).toBe("BLOCKED");
    expect(invariant.failClosed).toBe(true);
    expect(buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", activationAuthorized: true }).createSession).toBe(false);
    expect(buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", activationAuthorized: true }).reason).toBe("FULFILLMENT_NOT_READY");
    expect(evaluatePaymentReadinessGate({
      stripeConnected: true,
      stripeVerification: "LIVE_WRITE_VERIFIED",
      stripeEnvironment: "LIVE",
      offersConsistent: true,
      checkoutArchitecture: true,
      webhookArchitecture: true,
      revenueLineage: true,
      domainBound: true,
      legalReady: true,
      objectsConfigured: true,
      paymentsActivated: true,
      paidOfferExists: true,
    }).result).toBe("BLOCKED");
  });

  it("composes a rollback surface without purchase controls", () => {
    const composed = composeOccupancynpvPaymentSafetyRollbackFiles();
    expect(composed.purchaseControlsDisabled).toBe(true);
    const pricing = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx");
    expect(pricing?.content).toContain("$290");
    expect(pricing?.content).toContain("$149");
    expect(pricing?.content).not.toContain('action="/api/checkout/start"');
    const checkout = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/api/checkout/start/route.ts");
    expect(checkout?.content).toContain("FULFILLMENT_NOT_READY");
    expect(checkout?.content).toContain("paymentActivation = false");
  });

  it("rolls back payment activation without creating customer payment state", async () => {
    seedRecord();
    const result = await executeCreOccupancynpvPaymentSafetyRollbackV1Mission({
      reloadEnv: false,
      deploy: false,
      validateAllRoutes: false,
      fetchImpl: rollbackFetch(),
    });
    expect(result.mission).toBe(CRE_OCCUPANCYNPV_PAYMENT_SAFETY_ROLLBACK_V1);
    expect(result.audit.orphanedPaidCustomerCount).toBe(0);
    expect(result.rollback.currentPaymentActivation).toBe("NO");
    expect(result.rollback.checkoutSessionCreation).toBe("BLOCKED");
    expect(result.infrastructure.products).toBe("PRESERVED");
    expect(result.infrastructure.prices).toBe("PRESERVED");
    expect(result.infrastructure.webhook).toBe("PRESERVED");
    expect(result.fulfillment.paymentReadinessGate).toBe("BLOCKED");
    expect(result.commercialization.remaining).toEqual(["FULFILLMENT_CONFIGURATION", "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"]);
    expect(result.writes).toEqual({
      stripeWrites: 0,
      refunds: 0,
      newCustomers: 0,
      newCheckoutSessions: 0,
      newPaymentIntents: 0,
      newCharges: 0,
      newSubscriptions: 0,
      dnsWrites: 0,
      publicLaunch: 0,
    });
    expect(result.nextState).toBe("OCCUPANCYNPV_PAYMENT_SAFELY_DEACTIVATED_PENDING_FULFILLMENT");
    expect(result.nextGovernedAction).toBe("VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1");
  });
});
