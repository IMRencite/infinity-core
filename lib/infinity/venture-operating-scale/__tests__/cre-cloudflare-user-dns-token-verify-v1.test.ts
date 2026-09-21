import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  CRE_CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1,
  CRE_CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1_RUNTIME,
  OCCUPANCYNPV_ZONE_ID,
  PREVIOUS_ACCOUNT_DNS_TOKEN_ID,
  USER_DNS_TOKEN_PROBE_NAME,
  executeCreCloudflareUserDnsTokenVerifyV1Mission,
  resetVentureOperatingScaleStore,
} from "..";
type VerifyView = {
  result: string;
  usedRegistrarToken: boolean;
  tokenType: {
    userOwnedToken: string;
    previousAccountToken: string;
    registrarTokenUsed: string;
    tokenId?: string;
  };
  zone: { found: string; match: string; dnsRead: string };
  capability: { dnsWrite: string; currentZoneWritable: string; tokenZoneScope: string };
  liveWrite: { create: string; readback: string; deleted: string; remaining: string };
  actions: { productionDnsWrites: number; temporaryRecordsRemaining: number };
};

async function runVerify(
  input: Parameters<typeof executeCreCloudflareUserDnsTokenVerifyV1Mission>[0],
): Promise<VerifyView> {
  return (await executeCreCloudflareUserDnsTokenVerifyV1Mission(input)) as unknown as VerifyView;
}

const ACCOUNT = "cfacct00000000000000000000000000";
const USER_TOKEN = "cfut_fixture_user_token_not_real_000000000000";
const ACCOUNT_TOKEN = "cfat_fixture_account_token_not_real_0000000000";

function verifyFetch(input: { writeForbidden?: boolean; userVerify?: boolean } = {}): typeof fetch {
  const records: Array<{ id: string; type: string; name: string; content: string }> = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    if (path.includes("/user/tokens/verify")) {
      if (input.userVerify === false) {
        return new Response(JSON.stringify({ success: false, errors: [{ code: 1000, message: "Invalid API Token" }] }), { status: 401 });
      }
      return new Response(JSON.stringify({ success: true, result: { status: "active", id: "tok_user_new" } }), { status: 200 });
    }
    if (path.includes("/accounts/") && path.endsWith("/tokens/verify")) {
      return new Response(JSON.stringify({ success: false, errors: [{ code: 1000, message: "Invalid API Token" }] }), { status: 401 });
    }
    if (path.includes("/user/tokens/") && !path.endsWith("/verify")) {
      return new Response(
        JSON.stringify({ success: true, result: { policies: [{ resources: { "com.cloudflare.api.account.zone.*": "*" } }] } }),
        { status: 200 },
      );
    }
    if (path.includes("/zones?name=") && method === "GET") {
      return new Response(
        JSON.stringify({
          success: true,
          result: [{ id: OCCUPANCYNPV_ZONE_ID, name: "occupancynpv.com", status: "active", account: { id: ACCOUNT } }],
        }),
        { status: 200 },
      );
    }
    if (path.includes("/zones") && path.includes("/dns_records") && method === "GET") {
      return new Response(JSON.stringify({ success: true, result: records }), { status: 200 });
    }
    if (path.includes("/dns_records") && method === "POST") {
      if (input.writeForbidden) {
        return new Response(JSON.stringify({ success: false, errors: [{ code: 10000, message: "Authentication error" }] }), { status: 403 });
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

describe("CRE_CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    process.env.CLOUDFLARE_ACCOUNT_ID = ACCOUNT;
    process.env.CLOUDFLARE_ENABLED = "true";
    process.env.CLOUDFLARE_API_TOKEN = USER_TOKEN;
    process.env.CLOUDFLARE_REGISTRAR_API_TOKEN = "cfut_fixture_registrar_token_not_real_00000000";
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
    expect(registry.runtimes.CreCloudflareUserDnsTokenVerifyV1Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1_RUNTIME].missionType).toBe(
      CRE_CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1,
    );
  });

  it("rejects an account-owned token without writing DNS", async () => {
    process.env.CLOUDFLARE_API_TOKEN = ACCOUNT_TOKEN;
    const result = await runVerify({
      reloadEnv: false,
      fetchImpl: verifyFetch(),
    });
    expect(result.result).toBe("CLOUDFLARE_USER_DNS_TOKEN_NOT_LOADED");
    expect(result.tokenType.userOwnedToken).toBe("NO");
    expect(result.liveWrite.create).toBe("NOT_ATTEMPTED");
    expect(result.actions.productionDnsWrites).toBe(0);
  });

  it("rejects user-prefix tokens that fail /user/tokens/verify", async () => {
    const result = await runVerify({
      reloadEnv: false,
      fetchImpl: verifyFetch({ userVerify: false }),
    });
    expect(result.result).toBe("CLOUDFLARE_USER_DNS_TOKEN_NOT_LOADED");
    expect(result.liveWrite.create).toBe("NOT_ATTEMPTED");
  });

  it("proves reversible TXT write for a user-owned token", async () => {
    const result = await runVerify({
      reloadEnv: false,
      fetchImpl: verifyFetch(),
    });
    expect(result.result).toBe("CLOUDFLARE_USER_DNS_TOKEN_WRITE_VERIFIED");
    expect(result.tokenType.userOwnedToken).toBe("YES");
    expect(result.tokenType.previousAccountToken).toBe("NO");
    expect(result.tokenType.registrarTokenUsed).toBe("NO");
    expect(result.zone.found).toBe("YES");
    expect(result.zone.match).toBe("PASS");
    expect(result.zone.dnsRead).toBe("READ_ONLY_VERIFIED");
    expect(result.capability.dnsWrite).toBe("LIVE_WRITE_VERIFIED");
    expect(result.capability.currentZoneWritable).toBe("YES");
    expect(result.capability.tokenZoneScope).toBe("ALL_ZONES");
    expect(result.usedRegistrarToken).toBe(false);
    expect(result.liveWrite.create).toBe("PASS");
    expect(result.liveWrite.readback).toBe("PASS");
    expect(result.liveWrite.deleted).toBe("PASS");
    expect(result.liveWrite.remaining).toBe("NO");
    expect(result.actions.temporaryRecordsRemaining).toBe(0);
    expect(USER_DNS_TOKEN_PROBE_NAME).toBe("_infinity-user-dns-token-check.occupancynpv.com");
    expect(OCCUPANCYNPV_ZONE_ID).toBe("dbc6bd7446d67b25699aa62c88d9e5a5");
    expect(result.tokenType.tokenId).not.toBe(PREVIOUS_ACCOUNT_DNS_TOKEN_ID);
    expect(JSON.stringify(result)).not.toMatch(/cfut_fixture|cfat_fixture|Bearer\s+[A-Za-z0-9._-]{12,}/);
  });

  it("returns write failed when user verify passes but create is forbidden", async () => {
    const result = await runVerify({
      reloadEnv: false,
      fetchImpl: verifyFetch({ writeForbidden: true }),
    });
    expect(result.result).toBe("CLOUDFLARE_USER_DNS_TOKEN_WRITE_FAILED");
    expect(result.liveWrite.create).toBe("FAIL");
    expect(result.liveWrite.remaining).toBe("NO");
  });
});
