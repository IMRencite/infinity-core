import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { reloadCloudflareRegistrarFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { LOCKED_CRE_EXPERIMENT_ID, LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  CRE_CLOUDFLARE_REGISTRAR_LIVE_VERIFICATION_V2,
  CRE_CLOUDFLARE_REGISTRAR_LIVE_VERIFICATION_V2_RUNTIME,
  CRE_DOMAIN_SHORTLIST,
  backfillCreVentureOperationalRecord,
  executeCreCloudflareRegistrarLiveVerificationV2Mission,
  rankCloudflareDomain,
  resetVentureOperatingScaleStore,
  routeDomainProvider,
} from "..";

const ACCOUNT = "cfacct00000000000000000000000000";

function registrarFetch(): typeof fetch {
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
          result: { domains: [{ name: "leasenpv.com", registrable: true, tier: "standard", pricing: { currency: "USD", registration_cost: "9.15", renewal_cost: "9.15" } }] },
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
              registrable: name === "leasebasis.com" || name === "leasenpv.com",
              tier: name === "leasecomp.com" ? "premium" : "standard",
              pricing:
                name === "leasebasis.com" || name === "leasenpv.com"
                  ? { currency: "USD", registration_cost: name === "leasebasis.com" ? "10.44" : "9.15", renewal_cost: "10.44" }
                  : undefined,
              reason: name === "leasebasis.com" || name === "leasenpv.com" ? undefined : "unavailable",
            })),
          },
        }),
        { status: 200 },
      );
    }
    if (path.includes("/registrar/domains") && method === "GET") {
      return new Response(JSON.stringify({ success: true, result: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false, errors: [{ message: "unhandled" }] }), { status: 404 });
  };
  return fetchImpl;
}

describe("CRE_CLOUDFLARE_REGISTRAR_LIVE_VERIFICATION_V2", () => {
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
    delete process.env.INFINITY_LOAD_LOCAL_ENV;
  });

  it("registers the wrapper and reloads only the registrar token", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreCloudflareRegistrarLiveVerificationV2Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_CLOUDFLARE_REGISTRAR_LIVE_VERIFICATION_V2_RUNTIME].missionType).toBe(
      CRE_CLOUDFLARE_REGISTRAR_LIVE_VERIFICATION_V2,
    );
    const dir = join(tmpdir(), `infinity-cf-registrar-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, ".env.local"),
      "CLOUDFLARE_ACCOUNT_ID=cfacct11111111111111111111111111\nCLOUDFLARE_API_TOKEN=cf_general_should_not_replace\nCLOUDFLARE_REGISTRAR_API_TOKEN=cf_registrar_updated_fixture\n",
    );
    process.env.INFINITY_LOAD_LOCAL_ENV = "1";
    process.env.CLOUDFLARE_API_TOKEN = "cf_general_should_not_replace";
    process.env.CLOUDFLARE_REGISTRAR_API_TOKEN = "cf_registrar_old_fixture";
    const reload = reloadCloudflareRegistrarFromLocalFile(dir);
    expect(reload.loaded).toBe(true);
    expect(reload.replaced).toBe(true);
    expect(reload.confirmed).toBe(true);
    expect(reload.generalPreserved).toBe(true);
    expect(process.env.CLOUDFLARE_API_TOKEN).toBe("cf_general_should_not_replace");
    expect(JSON.stringify(reload)).not.toMatch(/cf_registrar_/);
  });

  it("stops when the registrar token is missing", async () => {
    delete process.env.CLOUDFLARE_REGISTRAR_API_TOKEN;
    const result = await executeCreCloudflareRegistrarLiveVerificationV2Mission({
      reloadEnv: false,
      fetchImpl: registrarFetch(),
    });
    expect(result.nextState).toBe("CLOUDFLARE_REGISTRAR_ENV_RELOAD_REQUIRED");
    expect(result.purchases).toBe(0);
    expect(result.dnsWrites).toBe(0);
  });

  it("uses domain-check as source of truth and does not purchase", async () => {
    backfillCreVentureOperationalRecord();
    const result = await executeCreCloudflareRegistrarLiveVerificationV2Mission({
      reloadEnv: false,
      fetchImpl: registrarFetch(),
    });
    expect(result.mission).toBe(CRE_CLOUDFLARE_REGISTRAR_LIVE_VERIFICATION_V2);
    expect(result.env.registrarTokenSelected).toBe("PASS");
    expect(result.env.generalTokenPreserved).toBe("PASS");
    expect(result.env.duplicateAccountIdRequired).toBe("NO");
    expect(result.account.verified).toBe("YES");
    expect(result.account.matchesRuntime).toBe("PASS");
    expect(result.capabilities["domain.availability"]).toBe("READ_ONLY_VERIFIED");
    expect(result.capabilities["domain.pricing"]).toBe("READ_ONLY_VERIFIED");
    expect(result.capabilities["domain.registration"]).toBe("UNVERIFIED");
    expect(result.checked).toHaveLength(10);
    expect(result.preferred.domain).toBe("leasenpv.com");
    expect(result.preferred.availability).toBe("YES");
    expect("searchUsedAsDiscoveryOnly" in result && result.searchUsedAsDiscoveryOnly).toBe(true);
    expect("checkUsedAsSourceOfTruth" in result && result.checkUsedAsSourceOfTruth).toBe(true);
    expect(result.purchases).toBe(0);
    expect(result.dnsWrites).toBe(0);
    expect(result.registrationPosts).toBe(0);
    expect(result.routing.preferred).toBe("cloudflare.registrar_v1");
    expect(result.routing.fallback).toBe("namecheap.com_v1");
    expect(result.namecheap).toBe("NAMECHEAP_API_USER_BLOCKED_BY_ADMINISTRATOR");
    expect(result.record.primary_domain).toBe("UNCONFIGURED");
    expect(result.record.dns_state).toBe("UNCONFIGURED");
    expect(result.record.ssl_state).toBe("UNCONFIGURED");
    expect(result.record.domain_provider).toBe("cloudflare.registrar_v1");
    expect(result.daily.snapshot.learningSignals).toEqual(
      expect.arrayContaining(["domain_acquisition_status", "experiment_waiting_externally"]),
    );
    expect(result.experiment.state).toBe("COLLECTING");
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.experiment.tracked).toBeGreaterThanOrEqual(4);
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(result.hqMission.researchGrid).toBe("ACTIVE_WORK");
    expect(result.hqMission.financialGovernance).toBe("ACTIVE_WORK");
    expect(result.hqMission.after.active).toBe(0);
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(0);
    expect(JSON.stringify(result)).not.toMatch(/cf_registrar_fixture_token_not_real/);
  });

  it("ranks available domains and treats unknown cost as not zero", () => {
    expect(rankCloudflareDomain({ seedScore: 80, available: "YES", premium: "NO", firstYear: 10, renewal: 10 })).toBeGreaterThan(
      rankCloudflareDomain({ seedScore: 88, available: "NO", premium: "NO", firstYear: "UNKNOWN", renewal: "UNKNOWN" }),
    );
    const routing = routeDomainProvider({ cloudflareRegistrarVerified: true, namecheapBlocked: true });
    expect(routing.preferred).toBe("cloudflare.registrar_v1");
    expect(routing.fallback).toBe("namecheap.com_v1");
  });
});
