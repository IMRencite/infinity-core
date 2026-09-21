import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_WRITE_RETRY_V2,
  CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_WRITE_RETRY_V2_RUNTIME,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS,
  backfillCreVentureOperationalRecord,
  executeCreOccupancynpvStripeWebhookWriteRetryV2Mission,
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

function webhookFetch(input: { posts?: number[]; denyWrite?: boolean; endpoints?: Array<Record<string, unknown>> } = {}): typeof fetch {
  const endpoints = [...(input.endpoints ?? [])];
  const posts = input.posts ?? [0];
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (method === "POST") posts[0] += 1;
    if (path.includes("/v1/account")) {
      return new Response(JSON.stringify({ id: OCCUPANCYNPV_STRIPE_ACCOUNT_ID, livemode: true }), { status: 200 });
    }
    if (path.includes("/v1/webhook_endpoints") && method === "GET" && !/\/v1\/webhook_endpoints\/we_/.test(path)) {
      return new Response(JSON.stringify({ data: endpoints }), { status: 200 });
    }
    if (path.includes("/v1/webhook_endpoints") && method === "POST" && !/\/v1\/webhook_endpoints\/we_/.test(path)) {
      if (input.denyWrite) {
        return new Response(JSON.stringify({ error: { message: "Enabling Webhook Endpoints, Event Destinations Write ('webhook_write') permissions on this key would allow this request to continue." } }), { status: 403 });
      }
      const created = {
        id: "we_retry1",
        url: "https://occupancynpv.com/api/webhooks/stripe",
        enabled_events: EVENTS,
        status: "enabled",
        livemode: true,
        secret: "whsec_fixture_not_for_output",
      };
      endpoints.push(created);
      return new Response(JSON.stringify(created), { status: 200 });
    }
    const getOne = path.match(/\/v1\/webhook_endpoints\/(we_[A-Za-z0-9]+)/);
    if (getOne && method === "GET") {
      const found = endpoints.find((row) => row.id === getOne[1]) ?? {
        id: getOne[1],
        url: "https://occupancynpv.com/api/webhooks/stripe",
        enabled_events: EVENTS,
        status: "enabled",
        livemode: true,
      };
      return new Response(JSON.stringify({ ...found, secret: undefined }), { status: 200 });
    }
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };
  return fetchImpl;
}

describe("CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_WRITE_RETRY_V2", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    delete process.env.INFINITY_LOAD_LOCAL_ENV;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = "rk_live_fixture_not_real";
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetInboundCommunicationRuntime();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("registers the HQ wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreOccupancynpvStripeWebhookWriteRetryV2Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_WRITE_RETRY_V2_RUNTIME].missionType).toBe(
      CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_WRITE_RETRY_V2,
    );
  });

  it("stops with write-permission required when webhook_write is still unavailable", async () => {
    seedRecord();
    const posts = [0];
    const result = await executeCreOccupancynpvStripeWebhookWriteRetryV2Mission({
      reloadEnv: false,
      fetchImpl: webhookFetch({ posts, denyWrite: true }),
    });
    expect(result.identity.webhookRead).toBe("READ_ONLY_VERIFIED");
    expect(result.identity.webhookWrite).toBe("UNAVAILABLE");
    expect(result.writes.webhookEndpointsCreated).toBe(0);
    expect(result.nextState).toBe("CRE_STRIPE_WEBHOOK_WRITE_PERMISSION_REQUIRED");
    expect(JSON.stringify(result)).not.toMatch(/whsec_/);
  });

  it("creates the canonical endpoint when write permission is available", async () => {
    seedRecord();
    const result = await executeCreOccupancynpvStripeWebhookWriteRetryV2Mission({
      reloadEnv: false,
      fetchImpl: webhookFetch(),
    });
    expect(result.mission).toBe(CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_WRITE_RETRY_V2);
    expect(result.identity.webhookWrite).toBe("LIVE_WRITE_VERIFIED");
    expect(result.mutation.endpointCreated).toBe("YES");
    expect(result.mutation.endpointId).toBe("we_retry1");
    expect(result.secret.secretExposed).toBe("NO");
    expect(result.commercialization.remaining).toEqual(["PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"]);
    expect(result.paymentReadiness.gate).toBe("BLOCKED");
    expect(result.nextState).toBe("CRE_WEBHOOK_CONFIGURATION_COMPLETE");
    expect(result.nextGovernedAction).toBe("DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_AND_PAYMENT_ACTIVATION_POLICY");
  });
});
