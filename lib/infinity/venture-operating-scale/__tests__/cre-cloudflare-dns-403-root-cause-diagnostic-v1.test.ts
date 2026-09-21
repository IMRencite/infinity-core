import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { instrumentedRuntimeRegistry, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import { classifyCloudflareTokenKind } from "@/lib/infinity/commercialization/providers/cloudflare/config";
import {
  CRE_CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1,
  CRE_CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1_RUNTIME,
  OCCUPANCYNPV_ZONE_ID,
  RAW_DNS_PROBE_NAME,
  executeCreCloudflareDns403RootCauseDiagnosticV1Mission,
  resetVentureOperatingScaleStore,
} from "..";
type DiagnosticView = {
  rootCause: string;
  nextAction: string;
  usedRegistrarToken: boolean;
  tokenKind?: string;
  capability: { dnsWrite: string; currentZoneWritable?: string };
  repair: { codeChanged: string };
  actions: { temporaryRecordsRemaining: number };
  rawApiProbe: {
    attempted: string;
    create?: string;
    readback?: string;
    deleted?: string;
    http?: number;
    code?: number | string;
    message?: string;
    remaining?: string;
  };
  zone: { match: string };
  runtimeAuthentication: {
    authenticationSyntax: string;
    registrarTokenUsed: string;
    legacyApiKeyHeaders: string;
    credentialSource?: string;
  };
  tokenVerify: {
    success?: string;
    accountVerifySuccess?: string;
    tokenActive?: string;
  };
};

async function runDiagnostic(
  input: Parameters<typeof executeCreCloudflareDns403RootCauseDiagnosticV1Mission>[0],
): Promise<DiagnosticView> {
  return (await executeCreCloudflareDns403RootCauseDiagnosticV1Mission(input)) as unknown as DiagnosticView;
}

const ACCOUNT = "cfacct00000000000000000000000000";
const GENERAL = "cfat_fixture_account_token_not_real_0000000000";
const USER_TOKEN = "cfut_fixture_user_token_not_real_000000000000";
const REGISTRAR = "cfut_fixture_registrar_token_not_real_00000000";

function diagnosticFetch(input: {
  userVerify?: boolean;
  accountVerify?: boolean;
  zoneId?: string;
  writeForbidden?: boolean;
} = {}): typeof fetch {
  const records: Array<{ id: string; type: string; name: string; content: string }> = [];
  const zoneId = input.zoneId ?? OCCUPANCYNPV_ZONE_ID;
  const fetchImpl: typeof fetch = async (url, init) => {
    const path = String(url);
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    if (headers.get("X-Auth-Email") || headers.get("X-Auth-Key")) {
      return new Response(JSON.stringify({ success: false, errors: [{ code: 10000, message: "legacy headers" }] }), { status: 403 });
    }
    if (!String(headers.get("Authorization") ?? "").startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, errors: [{ code: 10000, message: "missing bearer" }] }), { status: 403 });
    }
    if (path.includes("/user/tokens/verify")) {
      if (input.userVerify === false) {
        return new Response(JSON.stringify({ success: false, errors: [{ code: 10000, message: "Authentication error" }] }), { status: 403 });
      }
      return new Response(JSON.stringify({ success: true, result: { status: "active", id: "tok_user_fixture" } }), { status: 200 });
    }
    if (path.includes("/accounts/") && path.endsWith("/tokens/verify")) {
      if (input.accountVerify === false) {
        return new Response(JSON.stringify({ success: false, errors: [{ code: 10000, message: "Authentication error" }] }), { status: 403 });
      }
      return new Response(JSON.stringify({ success: true, result: { status: "active", id: "tok_account_fixture" } }), { status: 200 });
    }
    if (path.includes("/memberships")) {
      return new Response(JSON.stringify({ success: true, result: [] }), { status: 200 });
    }
    if (path.endsWith("/user")) {
      return new Response(JSON.stringify({ success: true, result: { id: "user_fixture" } }), { status: 200 });
    }
    if (path.includes("/zones?name=") && method === "GET") {
      return new Response(
        JSON.stringify({
          success: true,
          result: [{ id: zoneId, name: "occupancynpv.com", status: "active", account: { id: ACCOUNT } }],
        }),
        { status: 200 },
      );
    }
    if (path.includes("/dns_records") && method === "GET") {
      return new Response(JSON.stringify({ success: true, result: records }), { status: 200 });
    }
    if (path.includes("/dns_records") && method === "POST") {
      if (input.writeForbidden) {
        return new Response(
          JSON.stringify({ success: false, errors: [{ code: 10000, message: "Authentication error" }] }),
          { status: 403 },
        );
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

describe("CRE_CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    process.env.CLOUDFLARE_ACCOUNT_ID = ACCOUNT;
    process.env.CLOUDFLARE_ENABLED = "true";
    process.env.CLOUDFLARE_API_TOKEN = GENERAL;
    process.env.CLOUDFLARE_REGISTRAR_API_TOKEN = REGISTRAR;
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
    expect(registry.runtimes.CreCloudflareDns403RootCauseDiagnosticV1Runtime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[CRE_CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1_RUNTIME].missionType).toBe(
      CRE_CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1,
    );
  });

  it("classifies prefixed Cloudflare token kinds without printing values", () => {
    expect(classifyCloudflareTokenKind(GENERAL)).toBe("ACCOUNT_API_TOKEN");
    expect(classifyCloudflareTokenKind(USER_TOKEN)).toBe("USER_API_TOKEN");
    expect(classifyCloudflareTokenKind("")).toBe("MISSING");
  });

  it("stops as a runtime token defect when both verify endpoints fail", async () => {
    const result = await runDiagnostic({
      reloadEnv: false,
      fetchImpl: diagnosticFetch({ userVerify: false, accountVerify: false }),
    });
    expect(result.rootCause).toBe("CLOUDFLARE_RUNTIME_TOKEN_DEFECT");
    expect(result.rawApiProbe.attempted).toBe("NO");
    expect(result.nextAction).toBe("CLOUDFLARE_DNS_TOKEN_AUTHENTICATION_FAILED");
    expect(result.usedRegistrarToken).toBe(false);
  });

  it("classifies a provider zone mismatch without writing DNS", async () => {
    const result = await runDiagnostic({
      reloadEnv: false,
      fetchImpl: diagnosticFetch({ zoneId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }),
    });
    expect(result.rootCause).toBe("CLOUDFLARE_ZONE_IDENTIFIER_DEFECT");
    expect(result.zone.match).toBe("FAIL");
    expect(result.rawApiProbe.attempted).toBe("NO");
  });

  it("classifies raw 403/10000 as Cloudflare authorization, not an adapter auth-syntax defect", async () => {
    const result = await runDiagnostic({
      reloadEnv: false,
      fetchImpl: diagnosticFetch({ writeForbidden: true }),
    });
    expect(result.rootCause).toBe("CLOUDFLARE_TOKEN_OR_ACCOUNT_AUTHORIZATION_DEFECT");
    expect(result.runtimeAuthentication.authenticationSyntax).toBe("PASS");
    expect(result.runtimeAuthentication.registrarTokenUsed).toBe("NO");
    expect(result.runtimeAuthentication.legacyApiKeyHeaders).toBe("NO");
    expect(result.rawApiProbe.create).toBe("FAIL");
    expect(result.rawApiProbe.http).toBe(403);
    expect(result.rawApiProbe.code).toBe(10000);
    expect(result.rawApiProbe.message).toBe("Authentication error");
    expect(result.rawApiProbe.remaining).toBe("NO");
    expect(result.capability.dnsWrite).toBe("UNVERIFIED");
    expect(result.repair.codeChanged).toBe("NO");
    expect(result.tokenKind).toBe("ACCOUNT_API_TOKEN");
    expect(JSON.stringify(result)).not.toMatch(/cfat_fixture|cfut_fixture|Bearer\s+[A-Za-z0-9._-]{12,}/);
  });

  it("proves a reversible raw TXT when Cloudflare accepts the Bearer POST", async () => {
    process.env.CLOUDFLARE_API_TOKEN = USER_TOKEN;
    const result = await runDiagnostic({
      reloadEnv: false,
      fetchImpl: diagnosticFetch(),
    });
    expect(result.rootCause).toBe("CLOUDFLARE_DNS_WRITE_VERIFIED");
    expect(result.rawApiProbe.create).toBe("PASS");
    expect(result.rawApiProbe.readback).toBe("PASS");
    expect(result.rawApiProbe.deleted).toBe("PASS");
    expect(result.rawApiProbe.remaining).toBe("NO");
    expect(result.actions.temporaryRecordsRemaining).toBe(0);
    expect(result.capability.currentZoneWritable).toBe("YES");
    expect(result.nextAction).toBe("RESUME_CLOUDFLARE_DNS_AND_VERCEL_BINDING");
    expect(result.rawApiProbe).toEqual(expect.objectContaining({ attempted: "YES" }));
    expect(RAW_DNS_PROBE_NAME).toBe("_infinity-raw-dns-probe.occupancynpv.com");
  });

  it("classifies a local adapter defect when raw POST works and adapter POST fails", async () => {
    const records: Array<{ id: string; type: string; name: string; content: string }> = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      const path = String(url);
      const method = init?.method ?? "GET";
      if (path.includes("/tokens/verify") || path.endsWith("/user") || path.includes("/memberships")) {
        return new Response(JSON.stringify({ success: true, result: { status: "active", id: "tok_fixture" } }), { status: 200 });
      }
      if (path.includes("/zones?name=")) {
        return new Response(
          JSON.stringify({ success: true, result: [{ id: OCCUPANCYNPV_ZONE_ID, name: "occupancynpv.com", status: "active" }] }),
          { status: 200 },
        );
      }
      if (path.includes("/dns_records") && method === "GET") {
        return new Response(JSON.stringify({ success: true, result: records }), { status: 200 });
      }
      if (path.includes("/dns_records") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { type: string; name: string; content: string; proxied?: boolean };
        if (body.proxied !== undefined) {
          return new Response(
            JSON.stringify({ success: false, errors: [{ code: 10000, message: "Authentication error" }] }),
            { status: 403 },
          );
        }
        const row = { id: `rec_${records.length + 1}`, type: body.type, name: body.name, content: body.content };
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
    const result = await runDiagnostic({
      reloadEnv: false,
      fetchImpl,
    });
    expect(result.rootCause).toBe("LOCAL_CLOUDFLARE_DNS_ADAPTER_DEFECT");
    expect(result.rawApiProbe.create).toBe("PASS");
    expect(result.repair.codeChanged).toBe("NO");
  });

  it("continues when only the account token verify path succeeds", async () => {
    const result = await runDiagnostic({
      reloadEnv: false,
      fetchImpl: diagnosticFetch({ userVerify: false, accountVerify: true, writeForbidden: true }),
    });
    expect(result.tokenVerify.success).toBe("NO");
    expect(result.tokenVerify.accountVerifySuccess).toBe("YES");
    expect(result.tokenVerify.tokenActive).toBe("YES");
    expect(result.rawApiProbe.attempted).toBe("YES");
    expect(result.rootCause).toBe("CLOUDFLARE_TOKEN_OR_ACCOUNT_AUTHORIZATION_DEFECT");
  });
});
