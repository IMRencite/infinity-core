import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID, LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1,
  CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1_RUNTIME,
  CRE_DOMAIN_SHORTLIST,
  backfillCreVentureOperationalRecord,
  executeCreCloudflareRegistrarShortlistPricingV1Mission,
  resetVentureOperatingScaleStore,
  screenBoundedShortlistConflict,
  writeVentureOperationalRecord,
} from "..";

const ACCOUNT = "cfacct00000000000000000000000000";

function shortlistFetch(input: {
  available?: string[];
  premium?: string[];
  omitTier?: string[];
  omitPricing?: string[];
} = {}): typeof fetch {
  const available = new Set(input.available ?? ["leasebasis.com", "occupancynpv.com", "dealnpv.com"]);
  const premium = new Set(input.premium ?? ["leasecomp.com"]);
  const omitTier = new Set(input.omitTier ?? []);
  const omitPricing = new Set(input.omitPricing ?? []);
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (path.includes("/registrar/registrations") && method === "POST") {
      return new Response(JSON.stringify({ success: false, errors: [{ message: "blocked" }] }), { status: 400 });
    }
    if (path.includes("/tokens/verify")) {
      return new Response(JSON.stringify({ success: true, result: { status: "active" } }), { status: 200 });
    }
    if (path.includes(`/accounts/${ACCOUNT}`) && method === "GET" && !path.includes("registrar") && !path.includes("tokens")) {
      return new Response(JSON.stringify({ success: true, result: { id: ACCOUNT, name: "IMR fixture" } }), { status: 200 });
    }
    if (path.includes("/registrar/domain-search")) {
      return new Response(
        JSON.stringify({
          success: true,
          result: { domains: [{ name: "leasebasis.com", registrable: true, tier: "standard" }] },
        }),
        { status: 200 },
      );
    }
    if (path.includes("/registrar/domain-check") && method === "POST") {
      const body = JSON.parse(String(init?.body ?? "{}")) as { domains?: string[] };
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            domains: (body.domains ?? [...CRE_DOMAIN_SHORTLIST]).map((name) => ({
              name,
              registrable: available.has(name),
              ...(omitTier.has(name) ? {} : { tier: premium.has(name) ? "premium" : "standard" }),
              ...(omitPricing.has(name) || !available.has(name)
                ? {}
                : { pricing: { currency: "USD", registration_cost: "10.44", renewal_cost: "10.44" } }),
              reason: available.has(name) ? undefined : "unavailable",
            })),
          },
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ success: false, errors: [{ message: "unhandled" }] }), { status: 404 });
  };
  return fetchImpl;
}

describe("CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1", () => {
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
    expect(registry.runtimes.CreCloudflareRegistrarShortlistPricingV1Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1_RUNTIME].missionType).toBe(
      CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1,
    );
  });

  it("does not treat a missing premium tier as NO", () => {
    expect(screenBoundedShortlistConflict("leasecomp.com").formalTrademarkClearance).toBe("NOT_PERFORMED");
    expect(screenBoundedShortlistConflict("leasecomp.com").obviousConflict).toBe("NO");
  });

  it("checks the shortlist, ranks only available domains, and replaces stale leasenpv.com", async () => {
    const seeded = backfillCreVentureOperationalRecord();
    writeVentureOperationalRecord({
      ...seeded,
      domain_history: [
        {
          domain: "leasenpv.com",
          event: "SELECTED",
          at: "2026-09-05T10:26:40.975Z",
          evidence: "Selected candidate preserved; not purchased.",
        },
      ],
    });
    const result = await executeCreCloudflareRegistrarShortlistPricingV1Mission({
      reloadEnv: false,
      fetchImpl: shortlistFetch(),
    });
    expect(result.mission).toBe(CRE_CLOUDFLARE_REGISTRAR_SHORTLIST_PRICING_V1);
    expect(result.auth.tokenAccepted).toBe("YES");
    expect(result.auth.accountVerified).toBe("YES");
    expect(result.capabilities["domain.availability"]).toBe("READ_ONLY_VERIFIED");
    expect(result.capabilities["domain.pricing"]).toBe("READ_ONLY_VERIFIED");
    expect(result.capabilities["domain.registration"]).toBe("UNVERIFIED");
    expect(result.checked).toHaveLength(10);
    expect(result.checked.find((row) => row.domain === "leasenpv.com")?.available).toBe("NO");
    expect(result.ranked.every((row) => row.available === "YES")).toBe(true);
    expect(result.preferred.domain).toBe("leasebasis.com");
    expect(result.preferred.domain).not.toBe("leasenpv.com");
    expect(result.preferred.availability).toBe("YES");
    expect(result.preferred.firstYear).toBe(10.44);
    expect(result.routing.cloudflareRegistrar).toBe("LIVE_PROVIDER_VERIFIED");
    expect(result.routing.namecheap).toBe("NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR");
    expect(result.routing.preferred).toBe("cloudflare.registrar_v1");
    expect(result.governance.purchaseReadiness).toBe("DOMAIN_PURCHASE_FINANCIAL_AUTHORIZATION_REQUIRED");
    expect(result.nextState).toBe("CRE_CLOUDFLARE_DOMAIN_FINANCIAL_AUTHORIZATION_REQUIRED");
    expect(result.nextAction).toBe("GOVERNED_SINGLE_DOMAIN_PURCHASE_AUTHORIZATION");
    expect(result.record.primary_domain).toBe("UNCONFIGURED");
    expect(result.record.dns_state).toBe("UNCONFIGURED");
    expect(result.record.ssl_state).toBe("UNCONFIGURED");
    expect(result.record.public_launch_state).toBe("NO");
    expect(result.record.domain_provider).toBe("cloudflare.registrar_v1");
    expect(result.record.domain_history.some((row) => row.domain === "leasenpv.com" && row.event === "RELEASED")).toBe(true);
    expect(result.record.domain_history.some((row) => row.domain === "leasebasis.com" && row.event === "SELECTED")).toBe(true);
    expect(result.purchases).toBe(0);
    expect(result.registrationPosts).toBe(0);
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.experiment.tracked).toBeGreaterThanOrEqual(4);
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(result.hqMission.researchGrid).toBe("ACTIVE_WORK");
    expect(result.hqMission.financialGovernance).toBe("ACTIVE_WORK");
    expect(result.hqMission.after.active).toBe(0);
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(0);
    expect(JSON.stringify(result)).not.toMatch(/cf_registrar_fixture_token_not_real/);
  });

  it("keeps pricing UNVERIFIED when available domains have no Registrar price evidence", async () => {
    backfillCreVentureOperationalRecord();
    const result = await executeCreCloudflareRegistrarShortlistPricingV1Mission({
      reloadEnv: false,
      fetchImpl: shortlistFetch({ omitPricing: ["leasebasis.com", "occupancynpv.com", "dealnpv.com"] }),
    });
    expect(result.capabilities["domain.pricing"]).toBe("UNVERIFIED");
    expect(result.preferred.domain).toBe("leasebasis.com");
    expect(result.preferred.firstYear).toBe("UNKNOWN");
    expect(result.governance.purchaseReadiness).toBe("DOMAIN_PRICING_EVIDENCE_REQUIRED");
    expect(result.nextState).toBe("CRE_DOMAIN_PRICING_EVIDENCE_REQUIRED");
    expect(result.purchases).toBe(0);
  });

  it("marks premium UNKNOWN when Cloudflare omits tier", async () => {
    backfillCreVentureOperationalRecord();
    const result = await executeCreCloudflareRegistrarShortlistPricingV1Mission({
      reloadEnv: false,
      fetchImpl: shortlistFetch({ omitTier: ["leasebasis.com"] }),
    });
    expect(result.checked.find((row) => row.domain === "leasebasis.com")?.premium).toBe("UNKNOWN");
    expect(result.purchases).toBe(0);
  });
});
