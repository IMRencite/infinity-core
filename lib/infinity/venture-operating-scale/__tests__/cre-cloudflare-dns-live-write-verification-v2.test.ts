import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  CRE_CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION_V2,
  CRE_CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION_V2_RUNTIME,
  DNS_WRITE_PROBE_NAME,
  OCCUPANCYNPV_ZONE_ID,
  executeCreCloudflareDnsLiveWriteVerificationV2Mission,
  resetVentureOperatingScaleStore,
} from "..";

const ACCOUNT = "cfacct00000000000000000000000000";

function probeFetch(input: { writeForbidden?: boolean } = {}): typeof fetch {
  const records: Array<{ id: string; type: string; name: string; content: string }> = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (path.includes("/tokens/verify")) {
      return new Response(JSON.stringify({ success: true, result: { status: "active", id: "tok_fixture" } }), { status: 200 });
    }
    if (path.includes("/tokens/tok_fixture")) {
      return new Response(
        JSON.stringify({ success: true, result: { policies: [{ resources: { "com.cloudflare.api.account.zone.*": "*" } }] } }),
        { status: 200 },
      );
    }
    if (path.includes("/zones?name=") && method === "GET") {
      return new Response(
        JSON.stringify({
          success: true,
          result: [{ id: OCCUPANCYNPV_ZONE_ID, name: "occupancynpv.com", status: "active", account: { id: ACCOUNT }, name_servers: ["a.ns.cloudflare.com"] }],
        }),
        { status: 200 },
      );
    }
    if (path.includes("/dns_records") && method === "GET") {
      return new Response(JSON.stringify({ success: true, result: records }), { status: 200 });
    }
    if (path.includes("/dns_records") && method === "POST") {
      if (input.writeForbidden) {
        return new Response(JSON.stringify({ success: false, errors: [{ code: 9109, message: "Unauthorized to access requested resource" }] }), { status: 403 });
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as { type: string; name: string; content: string };
      const row = { id: `rec_${records.length + 1}`, ...body };
      records.push(row);
      return new Response(JSON.stringify({ success: true, result: row }), { status: 200 });
    }
    if (path.includes("/dns_records/") && method === "DELETE") {
      const id = path.split("/").pop() ?? "";
      const index = records.findIndex((row) => row.id === id);
      if (index >= 0) records.splice(index, 1);
      return new Response(JSON.stringify({ success: true, result: { id } }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  };
  return fetchImpl;
}

describe("CRE_CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION_V2", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    process.env.CLOUDFLARE_ACCOUNT_ID = ACCOUNT;
    process.env.CLOUDFLARE_ENABLED = "true";
    process.env.CLOUDFLARE_API_TOKEN = "cf_general_fixture_token_not_real";
    process.env.CLOUDFLARE_REGISTRAR_API_TOKEN = "cf_registrar_should_not_be_used";
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetInboundCommunicationRuntime();
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_ENABLED;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_REGISTRAR_API_TOKEN;
  });

  it("registers the HQ wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreCloudflareDnsLiveWriteVerificationV2Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION_V2_RUNTIME].missionType).toBe(
      CRE_CLOUDFLARE_DNS_LIVE_WRITE_VERIFICATION_V2,
    );
  });

  it("proves create, readback, and delete without leaving the probe", async () => {
    const result = await executeCreCloudflareDnsLiveWriteVerificationV2Mission({
      reloadEnv: false,
      fetchImpl: probeFetch(),
    });
    expect(result.nextState).toBe("CLOUDFLARE_DNS_WRITE_VERIFIED");
    expect(result.liveWrite.create).toBe("PASS");
    expect(result.liveWrite.readback).toBe("PASS");
    expect(result.liveWrite.deleted).toBe("PASS");
    expect(result.liveWrite.remaining).toBe("NO");
    expect(result.liveWrite.probeName).toBe(DNS_WRITE_PROBE_NAME);
    expect(result.capability.dnsWrite).toBe("LIVE_WRITE_VERIFIED");
    expect(result.capability.currentZoneWritable).toBe("YES");
    expect(result.actions.productionDnsWrites).toBe(0);
    expect(result.actions.vercelMutations).toBe(0);
    expect(result.usedRegistrarToken).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/cf_general_fixture_token_not_real|cf_registrar_should_not_be_used/);
  });

  it("fails without production mutation when create is forbidden", async () => {
    const result = await executeCreCloudflareDnsLiveWriteVerificationV2Mission({
      reloadEnv: false,
      fetchImpl: probeFetch({ writeForbidden: true }),
    });
    expect(result.nextState).toBe("CLOUDFLARE_DNS_WRITE_FAILED");
    expect(result.liveWrite.create).toBe("FAIL");
    expect(result.capability.dnsWrite).toBe("UNVERIFIED");
    expect(result.actions.temporaryRecordsRemaining).toBe(0);
  });
});
