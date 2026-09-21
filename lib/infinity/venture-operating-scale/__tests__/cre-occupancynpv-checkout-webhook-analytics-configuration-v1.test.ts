import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  CRE_OCCUPANCYNPV_CHECKOUT_WEBHOOK_ANALYTICS_CONFIGURATION_V1,
  CRE_OCCUPANCYNPV_CHECKOUT_WEBHOOK_ANALYTICS_CONFIGURATION_V1_RUNTIME,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  backfillCreVentureOperationalRecord,
  buildOccupancynpvCheckoutSessionRequest,
  executeCreOccupancynpvCheckoutWebhookAnalyticsConfigurationV1Mission,
  processOccupancynpvStripeWebhookEvent,
  resetVentureOperatingScaleStore,
  verifyStripeWebhookSignature,
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
    pricing_state: "CONFIGURED",
    payment_products: [
      { id: "prod_VDIjmRpY19C9HZ", name: "OccupancyNPV Professional", providerProductRef: { kind: "PROVIDER_BINDING", key: "prod_VDIjmRpY19C9HZ", rawSecretStored: false } },
      { id: "prod_VDIju0S2lBO9i5", name: "OccupancyNPV Per-Deal", providerProductRef: { kind: "PROVIDER_BINDING", key: "prod_VDIju0S2lBO9i5", rawSecretStored: false } },
    ],
    payment_prices: [
      { id: "price_1UCs7hLdvXKx7R7GF2TPmwGL", productId: "prod_VDIjmRpY19C9HZ", amountUsd: 290, providerPriceRef: { kind: "PROVIDER_BINDING", key: "price_1UCs7hLdvXKx7R7GF2TPmwGL", rawSecretStored: false } },
      { id: "price_1UCs7iLdvXKx7R7GmikBTGx4", productId: "prod_VDIju0S2lBO9i5", amountUsd: 149, providerPriceRef: { kind: "PROVIDER_BINDING", key: "price_1UCs7iLdvXKx7R7GmikBTGx4", rawSecretStored: false } },
    ],
  });
}

function html(body: string) {
  return new Response(`<html><body>${body}</body></html>`, { status: 200 });
}

function missionFetch(input: { accountId?: string; posts?: number[]; webhooks?: Array<Record<string, unknown>> } = {}): typeof fetch {
  const posts = input.posts ?? [0];
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (method === "POST") posts[0] += 1;
    if (path.includes("/v1/account")) {
      return new Response(JSON.stringify({ id: input.accountId ?? OCCUPANCYNPV_STRIPE_ACCOUNT_ID, livemode: true }), { status: 200 });
    }
    if (path.includes("/v1/webhook_endpoints")) {
      return new Response(JSON.stringify({ data: input.webhooks ?? [] }), { status: 200 });
    }
    if (path.includes("www.occupancynpv.com")) {
      return new Response(null, { status: 301, headers: { location: "https://occupancynpv.com/" } });
    }
    if (path.includes("occupancynpv.com")) {
      if (path.includes("privacy-policy")) return html("does not collect payment card data or process purchases. same-origin validation events.");
      if (path.includes("pricing")) return html("Interest only. Payment is not collected.");
      if (path.includes("early-access")) return html("Pilot request form");
      return html("OccupancyNPV");
    }
    if (method === "POST") return new Response(JSON.stringify({ error: { message: "unexpected write" } }), { status: 403 });
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };
  return fetchImpl;
}

function signedWebhook(secret: string, payload: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return { rawBody: payload, signature: `t=${timestamp},v1=${digest}` };
}

describe("CRE_OCCUPANCYNPV_CHECKOUT_WEBHOOK_ANALYTICS_CONFIGURATION_V1", () => {
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
    expect(registry.runtimes.CreOccupancynpvCheckoutWebhookAnalyticsConfigurationV1Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_OCCUPANCYNPV_CHECKOUT_WEBHOOK_ANALYTICS_CONFIGURATION_V1_RUNTIME].missionType).toBe(
      CRE_OCCUPANCYNPV_CHECKOUT_WEBHOOK_ANALYTICS_CONFIGURATION_V1,
    );
  });

  it("blocks unknown offers and arbitrary price injection without creating sessions", () => {
    expect(buildOccupancynpvCheckoutSessionRequest({ offer: "ENTERPRISE" }).reason).toBe("UNKNOWN_OFFER");
    expect(buildOccupancynpvCheckoutSessionRequest({ offer: "PROFESSIONAL", clientPriceId: "price_other" }).reason).toBe("ARBITRARY_PRICE_BLOCKED");
    const ok = buildOccupancynpvCheckoutSessionRequest({ offer: "PER_DEAL" });
    expect(ok.request?.mode).toBe("payment");
    expect(ok.createSession).toBe(false);
    expect(ok.reason).toBe("FULFILLMENT_NOT_READY");
  });

  it("verifies webhook signatures and ignores duplicate events", () => {
    const secret = "whsec_fixture_architecture";
    const payload = JSON.stringify({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { metadata: { infinity_offer: "PROFESSIONAL" } } },
    });
    const signed = signedWebhook(secret, payload);
    expect(verifyStripeWebhookSignature({ secret, signature: signed.signature, rawBody: signed.rawBody }).valid).toBe(true);
    const seen = new Set<string>();
    const first = processOccupancynpvStripeWebhookEvent({ secret, signature: signed.signature, rawBody: signed.rawBody, seenEventIds: seen });
    const second = processOccupancynpvStripeWebhookEvent({ secret, signature: signed.signature, rawBody: signed.rawBody, seenEventIds: seen });
    expect(first.accepted).toBe(true);
    expect(first.canonicalEvent).toBe("CHECKOUT_COMPLETED");
    expect(second.duplicate).toBe(true);
    expect(processOccupancynpvStripeWebhookEvent({
      secret,
      signature: "t=1,v1=bad",
      rawBody: payload,
      seenEventIds: new Set(),
    }).rejected).toBe(true);
  });

  it("configures checkout and analytics locally without Stripe webhook mutation", async () => {
    seedRecord();
    const posts = [0];
    const result = await executeCreOccupancynpvCheckoutWebhookAnalyticsConfigurationV1Mission({
      reloadEnv: false,
      validateAllRoutes: false,
      fetchImpl: missionFetch({ posts }),
    });
    expect(result.checkout.configuration).toBe("PASS");
    expect(result.checkout.canonicalOfferValidation).toBe("PASS");
    expect(result.checkout.arbitraryPriceInjectionBlocked).toBe("PASS");
    expect(result.execution.liveCheckoutSessionsCreated).toBe(0);
    expect(result.writes.webhookEndpointsCreated).toBe(0);
    expect(result.writes.webhookEndpointsUpdated).toBe(0);
    expect(posts[0]).toBe(0);
    expect(result.webhookProvider.providerWriteAuthorization).toBe("NO");
    expect(result.analytics.privacyAlignment).toBe("PASS");
    expect(result.commercialization.cleared).toContain("CHECKOUT_CONFIGURATION");
    expect(result.commercialization.cleared).toContain("ANALYTICS_CONFIGURATION");
    expect(result.commercialization.remaining).toContain("WEBHOOK_CONFIGURATION");
    expect(result.commercialization.remaining).toContain("PAYMENT_ACTIVATION");
    expect(result.commercialization.remaining).toContain("PUBLIC_LAUNCH");
    expect(result.record.publiclyLaunched).toBe("NO");
    expect(result.paymentReadiness.gate).toBe("BLOCKED");
    expect(result.nextState).toBe("CRE_STRIPE_WEBHOOK_WRITE_AUTHORIZATION_REQUIRED");
    expect(result.nextGovernedAction).toBe("GOVERNED_STRIPE_WEBHOOK_CONFIGURATION_AUTHORIZATION");
  });

  it("does not create a webhook endpoint even when one is missing", async () => {
    seedRecord();
    const posts = [0];
    const result = await executeCreOccupancynpvCheckoutWebhookAnalyticsConfigurationV1Mission({
      reloadEnv: false,
      validateAllRoutes: false,
      fetchImpl: missionFetch({ posts, webhooks: [] }),
    });
    expect(result.webhookProvider.existingCanonicalEndpoint).toBe("NO");
    expect(result.webhookProvider.endpointCreated).toBe("NO");
    expect(result.actions.webhookMutations).toBe(0);
    expect(posts[0]).toBe(0);
  });
});
