import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID, LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_V2,
  CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_V2_RUNTIME,
  OCCUPANCYNPV_DOMAIN,
  backfillCreVentureOperationalRecord,
  executeCreOccupancynpvDomainPurchaseV2Mission,
  resetVentureOperatingScaleStore,
} from "..";

const ACCOUNT = "cfacct00000000000000000000000000";

function purchaseFetch(input: {
  price?: number;
  available?: boolean;
  owned?: boolean;
  billingReady?: boolean;
} = {}): typeof fetch {
  let owned = input.owned ?? false;
  const price = input.price ?? 10.46;
  const available = input.available ?? true;
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (path.includes("/tokens/verify")) {
      return new Response(JSON.stringify({ success: true, result: { status: "active" } }), { status: 200 });
    }
    if (path.includes(`/accounts/${ACCOUNT}`) && method === "GET" && !path.includes("registrar") && !path.includes("tokens") && !path.includes("payment") && !path.includes("billing")) {
      return new Response(JSON.stringify({ success: true, result: { id: ACCOUNT, name: "IMR fixture" } }), { status: 200 });
    }
    if (path.includes("/registrar/domain-check") && method === "POST") {
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            domains: [
              {
                name: OCCUPANCYNPV_DOMAIN,
                registrable: available,
                tier: "standard",
                pricing: available ? { currency: "USD", registration_cost: String(price), renewal_cost: String(price) } : undefined,
                reason: available ? undefined : "domain_unavailable",
              },
            ],
          },
        }),
        { status: 200 },
      );
    }
    if (path.includes(`/registrar/registrations/${OCCUPANCYNPV_DOMAIN}`) && method === "GET") {
      if (!owned) return new Response(JSON.stringify({ success: false, errors: [{ message: "not found" }] }), { status: 404 });
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            domain_name: OCCUPANCYNPV_DOMAIN,
            status: "active",
            created_at: "2026-09-06T05:00:00.000Z",
            expires_at: "2027-09-06T05:00:00.000Z",
            auto_renew: false,
            name_servers: ["a.ns.cloudflare.com", "b.ns.cloudflare.com"],
          },
        }),
        { status: 200 },
      );
    }
    if (path.includes("/registrar/registrations") && method === "POST") {
      owned = true;
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            state: "succeeded",
            completed: true,
            context: {
              registration: {
                domain_name: OCCUPANCYNPV_DOMAIN,
                status: "active",
                created_at: "2026-09-06T05:00:00.000Z",
                expires_at: "2027-09-06T05:00:00.000Z",
                auto_renew: false,
                pricing: { currency: "USD", registration_cost: String(price) },
              },
            },
          },
        }),
        { status: 201 },
      );
    }
    if (path.includes("/payment-methods")) {
      return new Response(
        JSON.stringify({ success: true, result: input.billingReady === false ? [] : [{ default: true }] }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ success: false, errors: [{ message: "unhandled" }] }), { status: 404 });
  };
  return fetchImpl;
}

describe("CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_V2", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    process.env.CLOUDFLARE_ACCOUNT_ID = ACCOUNT;
    process.env.CLOUDFLARE_API_TOKEN = "cf_general_fixture_token_not_real";
    process.env.CLOUDFLARE_REGISTRAR_API_TOKEN = "cf_registrar_fixture_token_not_real";
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetInboundCommunicationRuntime();
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_REGISTRAR_API_TOKEN;
  });

  it("registers the HQ wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreOccupancynpvDomainPurchaseV2Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_V2_RUNTIME].missionType).toBe(
      CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_V2,
    );
  });

  it("blocks when the live price exceeds the USD 15 ceiling and does not purchase", async () => {
    backfillCreVentureOperationalRecord();
    const result = await executeCreOccupancynpvDomainPurchaseV2Mission({
      reloadEnv: false,
      fetchImpl: purchaseFetch({ price: 16 }),
      prerequisiteOverride: { billing: "READY", registrant: "READY", agreement: "ACCEPTED" },
    });
    expect(result.nextState).toBe("CRE_DOMAIN_PURCHASE_BLOCKED_PRICE");
    expect(result.purchase.attempted).toBe("NO");
    expect(result.registrationPosts).toBe(0);
    expect(result.record.primary_domain).not.toBe(OCCUPANCYNPV_DOMAIN);
  });

  it("does not purchase when registrant or agreement cannot be proven", async () => {
    backfillCreVentureOperationalRecord();
    const result = await executeCreOccupancynpvDomainPurchaseV2Mission({
      reloadEnv: false,
      fetchImpl: purchaseFetch(),
    });
    expect(result.prerequisites.registrant).toBe("UNKNOWN");
    expect(result.prerequisites.agreement).toBe("UNKNOWN");
    expect(result.purchase.attempted).toBe("NO");
    expect(result.nextState).toBe("CRE_DOMAIN_PURCHASE_BLOCKED_PROVIDER");
    expect(result.registrationPosts).toBe(0);
  });

  it("does not repurchase an already-owned domain", async () => {
    backfillCreVentureOperationalRecord();
    const result = await executeCreOccupancynpvDomainPurchaseV2Mission({
      reloadEnv: false,
      fetchImpl: purchaseFetch({ owned: true }),
      prerequisiteOverride: { billing: "READY", registrant: "READY", agreement: "ACCEPTED" },
    });
    expect(result.nextState).toBe("CRE_DOMAIN_ALREADY_OWNED");
    expect(result.purchase.attempted).toBe("NO");
    expect(result.ownership.owned).toBe("YES");
    expect(result.record.domain_history.some((row) => row.domain === OCCUPANCYNPV_DOMAIN && row.event === "PURCHASED")).toBe(true);
  });

  it("purchases occupancynpv.com once when every gate passes", async () => {
    backfillCreVentureOperationalRecord();
    const result = await executeCreOccupancynpvDomainPurchaseV2Mission({
      reloadEnv: false,
      fetchImpl: purchaseFetch(),
      prerequisiteOverride: { billing: "READY", registrant: "READY", agreement: "ACCEPTED" },
    });
    expect(result.mission).toBe(CRE_OCCUPANCYNPV_DOMAIN_PURCHASE_V2);
    expect(result.purchase.attempted).toBe("YES");
    expect(result.purchase.succeeded).toBe("YES");
    expect(result.ownership.owned).toBe("YES");
    expect(result.nextState).toBe("CRE_DOMAIN_ACQUIRED");
    expect(result.registrationPosts).toBe(1);
    expect(result.record.primary_domain).toBe(OCCUPANCYNPV_DOMAIN);
    expect(result.record.dns_state).toBe("UNCONFIGURED");
    expect(result.record.ssl_state).toBe("UNCONFIGURED");
    expect(result.record.public_launch_state).toBe("NO");
    expect(result.nextGovernedAction).toBe("CLOUDFLARE_DNS_AND_VERCEL_PRODUCTION_DOMAIN_BINDING");
    expect(result.hqMission.after.active).toBe(0);
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(0);
    expect(JSON.stringify(result)).not.toMatch(/cf_registrar_fixture_token_not_real/);
  });
});
