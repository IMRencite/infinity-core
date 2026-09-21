import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_CONFIGURATION_V1,
  CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_CONFIGURATION_V1_RUNTIME,
  OCCUPANCYNPV_DOMAIN,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  OCCUPANCYNPV_STRIPE_WEBHOOK_EVENTS,
  backfillCreVentureOperationalRecord,
  executeCreOccupancynpvStripeWebhookConfigurationV1Mission,
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

function webhookFetch(input: {
  accountId?: string;
  posts?: number[];
  endpoints?: Array<Record<string, unknown>>;
  denyWrite?: boolean;
} = {}): typeof fetch {
  const endpoints = [...(input.endpoints ?? [])];
  const posts = input.posts ?? [0];
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (method === "POST") posts[0] += 1;
    if (path.includes("/v1/account")) {
      return new Response(JSON.stringify({ id: input.accountId ?? OCCUPANCYNPV_STRIPE_ACCOUNT_ID, livemode: true }), { status: 200 });
    }
    if (path.includes("/v1/webhook_endpoints") && method === "GET" && !/\/v1\/webhook_endpoints\/we_/.test(path)) {
      return new Response(JSON.stringify({ data: endpoints }), { status: 200 });
    }
    if (path.includes("/v1/webhook_endpoints") && method === "POST" && !/\/v1\/webhook_endpoints\/we_/.test(path)) {
      if (input.denyWrite) return new Response(JSON.stringify({ error: { message: "Permission denied" } }), { status: 403 });
      const created = {
        id: "we_canonical1",
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
    if (method === "POST") return new Response(JSON.stringify({ error: { message: "unexpected write" } }), { status: 403 });
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };
  return fetchImpl;
}

describe("CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_CONFIGURATION_V1", () => {
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
    expect(registry.runtimes.CreOccupancynpvStripeWebhookConfigurationV1Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_CONFIGURATION_V1_RUNTIME].missionType).toBe(
      CRE_OCCUPANCYNPV_STRIPE_WEBHOOK_CONFIGURATION_V1,
    );
  });

  it("stops with zero webhook mutations on account identity mismatch", async () => {
    seedRecord();
    const posts = [0];
    const result = await executeCreOccupancynpvStripeWebhookConfigurationV1Mission({
      reloadEnv: false,
      fetchImpl: webhookFetch({ accountId: "acct_other1", posts }),
    });
    expect(result.identity.identity).toBe("FAIL");
    expect(result.identity.providerError).toBe("STRIPE_ACCOUNT_IDENTITY_MISMATCH");
    expect(result.writes.webhookEndpointsCreated).toBe(0);
    expect(result.writes.webhookEndpointsUpdated).toBe(0);
    expect(posts[0]).toBe(0);
    expect(result.nextState).toBe("CRE_STRIPE_WEBHOOK_CONFIGURATION_FAILED");
  });

  it("reuses an exact existing endpoint without creating a duplicate", async () => {
    seedRecord();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_existing_runtime_only";
    const posts = [0];
    const result = await executeCreOccupancynpvStripeWebhookConfigurationV1Mission({
      reloadEnv: false,
      fetchImpl: webhookFetch({
        posts,
        endpoints: [
          {
            id: "we_existing1",
            url: "https://occupancynpv.com/api/webhooks/stripe",
            enabled_events: EVENTS,
            status: "enabled",
            livemode: true,
          },
        ],
      }),
    });
    expect(result.existingWebhook.canonicalEndpointExisted).toBe("YES");
    expect(result.mutation.endpointCreated).toBe("NO");
    expect(result.mutation.endpointId).toBe("we_existing1");
    expect(result.writes.webhookEndpointsCreated).toBe(0);
    expect(posts[0]).toBe(0);
    expect(result.mutation.providerReadback).toBe("PASS");
    expect(result.secret.secretExposed).toBe("NO");
    expect(JSON.stringify(result)).not.toMatch(/whsec_/);
    expect(result.nextState).toBe("CRE_WEBHOOK_CONFIGURATION_COMPLETE");
    expect(result.paymentReadiness.gate).toBe("BLOCKED");
    expect(result.commercialization.remaining).toEqual(["PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"]);
  });

  it("creates exactly one canonical endpoint when none exists", async () => {
    seedRecord();
    const posts = [0];
    const result = await executeCreOccupancynpvStripeWebhookConfigurationV1Mission({
      reloadEnv: false,
      fetchImpl: webhookFetch({ posts }),
    });
    expect(result.existingWebhook.canonicalEndpointExisted).toBe("NO");
    expect(result.mutation.endpointCreated).toBe("YES");
    expect(result.mutation.endpointId).toBe("we_canonical1");
    expect(result.writes.webhookEndpointsCreated).toBe(1);
    expect(result.writes.customers).toBe(0);
    expect(result.writes.checkoutSessions).toBe(0);
    expect(result.writes.charges).toBe(0);
    expect(result.secret.webhookSigningSecretReceived).toBe("YES");
    expect(result.secret.serverSideSecretConfigured).toBe("YES");
    expect(result.secret.runtimeSecretReference).toBe("STRIPE_WEBHOOK_SECRET");
    expect(JSON.stringify(result)).not.toMatch(/whsec_/);
    expect(result.performanceLineage.revenueFabrication).toBe("NO");
    expect(result.autonomy.durableProviderMutationAuthority).toBe("MISSING");
    expect(result.nextState).toBe("CRE_WEBHOOK_CONFIGURATION_COMPLETE");
    expect(result.nextGovernedAction).toBe("DURABLE_COMMERCIAL_PROVIDER_MUTATION_AUTHORITY_AND_PAYMENT_ACTIVATION_POLICY");
    expect(posts[0]).toBe(1);
  });

  it("does not create when duplicate canonical endpoints already exist", async () => {
    seedRecord();
    const posts = [0];
    const result = await executeCreOccupancynpvStripeWebhookConfigurationV1Mission({
      reloadEnv: false,
      fetchImpl: webhookFetch({
        posts,
        endpoints: [
          { id: "we_a", url: "https://occupancynpv.com/api/webhooks/stripe", enabled_events: EVENTS, livemode: true, status: "enabled" },
          { id: "we_b", url: "https://occupancynpv.com/api/webhooks/stripe", enabled_events: EVENTS, livemode: true, status: "enabled" },
        ],
      }),
    });
    expect(posts[0]).toBe(0);
    expect(result.existingWebhook.duplicateCanonicalEndpoints).toBe(1);
    expect(result.writes.webhookEndpointsCreated).toBe(0);
    expect(result.nextState).toBe("CRE_STRIPE_WEBHOOK_CONFIGURATION_FAILED");
  });
});
