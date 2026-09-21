import { randomBytes } from "node:crypto";
import {
  reloadCloudflareDnsTokenFromLocalFile,
  reloadCloudflareRegistrarFromLocalFile,
} from "@/lib/infinity/communication-provider/load-local-env";
import {
  CLOUDFLARE_API_BASE_URL,
  classifyCloudflareTokenKind,
} from "@/lib/infinity/commercialization/providers/cloudflare/config";
import { CloudflareDnsWriteAdapter, dnsContentEqual } from "@/lib/infinity/commercialization/providers/cloudflare/dns-write-adapter";
import { CRE_CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1, OCCUPANCYNPV_DOMAIN } from "./constants";
import { OCCUPANCYNPV_ZONE_ID } from "./cloudflare-dns-live-write-verification";

export const USER_DNS_TOKEN_PROBE_NAME = `_infinity-user-dns-token-check.${OCCUPANCYNPV_DOMAIN}` as const;
export const PREVIOUS_ACCOUNT_DNS_TOKEN_ID = "ad7f4f880e304481baf3039225b9e0cc" as const;

type Envelope = {
  success?: boolean;
  result?: unknown;
  errors?: Array<{ message?: string; code?: number }>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

async function rawGet(fetchImpl: typeof fetch, token: string, path: string) {
  const response = await fetchImpl(`${CLOUDFLARE_API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  let envelope: Envelope = {};
  try {
    envelope = (await response.json()) as Envelope;
  } catch {
    envelope = {};
  }
  const first = Array.isArray(envelope.errors) ? envelope.errors[0] : null;
  const result = asRecord(envelope.result);
  return {
    ok: response.ok && envelope.success !== false,
    status: response.status,
    success: envelope.success === true,
    tokenId: typeof result.id === "string" ? result.id : null,
    tokenStatus: typeof result.status === "string" ? result.status : null,
    errorCode: first?.code ?? null,
    errorMessage: first?.message ?? (response.ok ? null : `CLOUDFLARE_HTTP_${response.status}`),
  };
}

export async function executeCreCloudflareUserDnsTokenVerify(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
} = {}) {
  if (input.reloadEnv !== false) {
    reloadCloudflareRegistrarFromLocalFile();
    reloadCloudflareDnsTokenFromLocalFile();
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const token = (process.env.CLOUDFLARE_API_TOKEN ?? "").trim();
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
  const tokenKind = classifyCloudflareTokenKind(token);
  const prefixClass = tokenKind === "USER_API_TOKEN" ? "cfut_" : tokenKind === "ACCOUNT_API_TOKEN" ? "cfat_" : tokenKind === "GLOBAL_API_KEY" ? "cfk_" : "UNKNOWN";
  const dns = new CloudflareDnsWriteAdapter({ fetchImpl });
  const emptyZone = {
    domain: OCCUPANCYNPV_DOMAIN,
    found: "NO" as const,
    status: "UNKNOWN",
    providerZoneId: "UNKNOWN",
    storedZoneId: OCCUPANCYNPV_ZONE_ID,
    match: "FAIL" as const,
    dnsRead: "UNVERIFIED" as const,
  };
  const emptyCapability = {
    dnsWrite: "UNVERIFIED" as const,
    currentZoneWritable: "NO" as const,
    tokenZoneScope: "UNKNOWN" as const,
    zoneLifecycleAuthority: "UNKNOWN" as const,
    futureZoneDnsManagement: "UNKNOWN" as const,
  };
  const emptyWrite = {
    create: "NOT_ATTEMPTED" as const,
    readback: "NOT_ATTEMPTED" as const,
    deleted: "NOT_ATTEMPTED" as const,
    remaining: "NO" as const,
    http: 0 as number | string,
    code: "NONE" as string | number,
    message: "NONE",
  };

  const finish = (result: "CLOUDFLARE_USER_DNS_TOKEN_WRITE_VERIFIED" | "CLOUDFLARE_USER_DNS_TOKEN_NOT_LOADED" | "CLOUDFLARE_USER_DNS_TOKEN_WRITE_FAILED", extra: Record<string, unknown>) => ({
    mission: CRE_CLOUDFLARE_USER_DNS_TOKEN_VERIFY_V1,
    tokenType: extra.tokenType,
    zone: extra.zone ?? emptyZone,
    liveWrite: extra.liveWrite ?? emptyWrite,
    capability: extra.capability ?? emptyCapability,
    result,
    nextAction: result === "CLOUDFLARE_USER_DNS_TOKEN_WRITE_VERIFIED" ? "RESUME_CLOUDFLARE_DNS_AND_VERCEL_BINDING" : result,
    providerError: extra.providerError ?? "NONE",
    usedRegistrarToken: false,
    credentialSource: "CLOUDFLARE_API_TOKEN",
    registrarCredential: "CLOUDFLARE_REGISTRAR_API_TOKEN",
    accountIdPresent: accountId ? "YES" as const : "NO" as const,
    actions: {
      productionDnsWrites: 0 as const,
      vercelMutations: 0 as const,
      domainPurchases: 0 as const,
      stripeWrites: 0 as const,
      deployments: 0 as const,
      customerCharges: 0 as const,
      temporaryRecordsRemaining: extra.temporaryRecordsRemaining ?? 0,
      publiclyLaunched: "NO" as const,
    },
  });

  const userVerify = token
    ? await rawGet(fetchImpl, token, "/user/tokens/verify")
    : { ok: false, status: 0, success: false, tokenId: null, tokenStatus: null, errorCode: null, errorMessage: "CLOUDFLARE_API_TOKEN_MISSING" };
  const accountVerify = token && accountId
    ? await rawGet(fetchImpl, token, `/accounts/${encodeURIComponent(accountId)}/tokens/verify`)
    : { ok: false, status: 0, success: false, tokenId: null, tokenStatus: null, errorCode: null, errorMessage: "CLOUDFLARE_ACCOUNT_ID_MISSING" };
  const previousAccountToken =
    accountVerify.ok && accountVerify.tokenId === PREVIOUS_ACCOUNT_DNS_TOKEN_ID ? "YES" : "NO";
  const userOwned =
    userVerify.ok && tokenKind === "USER_API_TOKEN" && previousAccountToken === "NO" ? "YES" : "NO";
  const tokenType = {
    http: userVerify.status,
    success: userVerify.ok ? "YES" as const : "NO" as const,
    status: userVerify.tokenStatus ?? userVerify.errorMessage ?? (tokenKind === "MISSING" ? "MISSING" : tokenKind),
    userOwnedToken: userOwned,
    prefixClass,
    accountVerifyHttp: accountVerify.status,
    accountVerifySuccess: accountVerify.ok ? "YES" as const : "NO" as const,
    previousAccountToken,
    tokenId: userVerify.tokenId ?? accountVerify.tokenId ?? "UNKNOWN",
    credentialSource: "CLOUDFLARE_API_TOKEN",
    registrarTokenUsed: "NO" as const,
  };

  if (userOwned !== "YES") {
    return finish("CLOUDFLARE_USER_DNS_TOKEN_NOT_LOADED", {
      tokenType,
      liveWrite: {
        ...emptyWrite,
        http: userVerify.status,
        code: userVerify.errorCode ?? (tokenKind === "ACCOUNT_API_TOKEN" ? "LOADED_TOKEN_IS_ACCOUNT_OWNED_CFAT" : "NONE"),
        message: userVerify.errorMessage ?? (tokenKind === "ACCOUNT_API_TOKEN" ? "LOADED_TOKEN_IS_ACCOUNT_OWNED_CFAT" : "CLOUDFLARE_USER_DNS_TOKEN_NOT_LOADED"),
      },
      providerError: previousAccountToken === "YES"
        ? "LOADED_TOKEN_MATCHES_PREVIOUS_ACCOUNT_DNS_TOKEN"
        : `${userVerify.status} ${userVerify.errorCode ?? ""} ${userVerify.errorMessage ?? (tokenKind === "ACCOUNT_API_TOKEN" ? "LOADED_TOKEN_IS_ACCOUNT_OWNED_CFAT" : "USER_TOKEN_VERIFY_FAILED")}`.trim(),
      temporaryRecordsRemaining: 0,
    });
  }

  const foundZone = await dns.findZone(OCCUPANCYNPV_DOMAIN);
  const zoneMatch = foundZone.exists && foundZone.zoneId === OCCUPANCYNPV_ZONE_ID ? "PASS" as const : "FAIL" as const;
  const zone = {
    domain: OCCUPANCYNPV_DOMAIN,
    found: foundZone.exists ? "YES" as const : "NO" as const,
    status: foundZone.status,
    providerZoneId: foundZone.zoneId,
    storedZoneId: OCCUPANCYNPV_ZONE_ID,
    match: zoneMatch,
    dnsRead: foundZone.exists && zoneMatch === "PASS" ? "READ_ONLY_VERIFIED" as const : "UNVERIFIED" as const,
  };
  const scope = await dns.inspectTokenScope(foundZone.zoneId === "UNKNOWN" ? OCCUPANCYNPV_ZONE_ID : foundZone.zoneId);
  const capabilityBase = {
    dnsWrite: "UNVERIFIED" as const,
    currentZoneWritable: "NO" as const,
    tokenZoneScope: scope.zoneScope,
    zoneLifecycleAuthority: scope.zoneScope === "ALL_ZONES" ? "CONFIGURED" as const : "UNKNOWN" as const,
    futureZoneDnsManagement: scope.zoneScope === "ALL_ZONES" ? "CONFIGURED" as const : "UNKNOWN" as const,
  };
  if (zoneMatch !== "PASS") {
    return finish("CLOUDFLARE_USER_DNS_TOKEN_WRITE_FAILED", {
      tokenType,
      zone,
      capability: capabilityBase,
      liveWrite: {
        ...emptyWrite,
        http: foundZone.httpStatus,
        code: "ZONE_ID_MISMATCH",
        message: foundZone.safeError ?? "ZONE_ID_MISMATCH",
      },
      providerError: `ZONE_ID_MISMATCH provider=${foundZone.zoneId} stored=${OCCUPANCYNPV_ZONE_ID}`,
      temporaryRecordsRemaining: 0,
    });
  }

  const listedBefore = await dns.listRecords(OCCUPANCYNPV_ZONE_ID);
  for (const row of listedBefore.records.filter(
    (item) => item.recordType === "TXT" && item.name.toLowerCase() === USER_DNS_TOKEN_PROBE_NAME,
  )) {
    await dns.deleteRecord(OCCUPANCYNPV_ZONE_ID, row.recordId);
  }

  const probeValue = `infinity-user-dns-token-${randomBytes(6).toString("hex")}`;
  const created = await dns.createTxtRecord({
    zoneId: OCCUPANCYNPV_ZONE_ID,
    name: USER_DNS_TOKEN_PROBE_NAME,
    content: probeValue,
    ttl: 120,
  });
  if (!created.ok) {
    return finish("CLOUDFLARE_USER_DNS_TOKEN_WRITE_FAILED", {
      tokenType,
      zone,
      capability: capabilityBase,
      liveWrite: {
        create: "FAIL",
        readback: "FAIL",
        deleted: "FAIL",
        remaining: "NO",
        http: created.status,
        code: created.errorCode ?? "NONE",
        message: created.safeError ?? "WRITE_FAILED",
      },
      providerError: `${created.status} ${created.errorCode ?? ""} ${created.safeError ?? "WRITE_FAILED"}`.trim(),
      temporaryRecordsRemaining: 0,
    });
  }

  const listed = await dns.listRecords(OCCUPANCYNPV_ZONE_ID);
  const found = listed.records.find(
    (row) =>
      row.recordType === "TXT" &&
      row.name.toLowerCase() === USER_DNS_TOKEN_PROBE_NAME &&
      dnsContentEqual((row.content ?? "").replace(/^"|"$/g, ""), probeValue),
  );
  if (!found) {
    if (created.recordId !== "UNKNOWN") await dns.deleteRecord(OCCUPANCYNPV_ZONE_ID, created.recordId);
    const afterMiss = await dns.listRecords(OCCUPANCYNPV_ZONE_ID);
    const stillThere = afterMiss.records.some(
      (row) => row.recordType === "TXT" && row.name.toLowerCase() === USER_DNS_TOKEN_PROBE_NAME,
    );
    return finish("CLOUDFLARE_USER_DNS_TOKEN_WRITE_FAILED", {
      tokenType,
      zone,
      capability: capabilityBase,
      liveWrite: {
        create: "PASS",
        readback: "FAIL",
        deleted: stillThere ? "FAIL" : "PASS",
        remaining: stillThere ? "YES" : "NO",
        http: listed.status,
        code: "TXT_READBACK_FAILED",
        message: "TXT_READBACK_FAILED",
      },
      providerError: "TXT_READBACK_FAILED",
      temporaryRecordsRemaining: stillThere ? 1 : 0,
    });
  }

  const removed = await dns.deleteRecord(OCCUPANCYNPV_ZONE_ID, found.recordId);
  const after = await dns.listRecords(OCCUPANCYNPV_ZONE_ID);
  const remaining = after.records.some(
    (row) => row.recordType === "TXT" && row.name.toLowerCase() === USER_DNS_TOKEN_PROBE_NAME,
  )
    ? "YES" as const
    : "NO" as const;
  const liveWrite = {
    create: "PASS" as const,
    readback: "PASS" as const,
    deleted: removed.ok ? "PASS" as const : "FAIL" as const,
    remaining,
    http: removed.status,
    code: removed.errorCode ?? "NONE",
    message: removed.safeError ?? "NONE",
  };
  if (liveWrite.deleted === "PASS" && remaining === "NO") {
    return finish("CLOUDFLARE_USER_DNS_TOKEN_WRITE_VERIFIED", {
      tokenType,
      zone,
      capability: {
        ...capabilityBase,
        dnsWrite: "LIVE_WRITE_VERIFIED",
        currentZoneWritable: "YES",
      },
      liveWrite,
      providerError: "NONE",
      temporaryRecordsRemaining: 0,
    });
  }
  return finish("CLOUDFLARE_USER_DNS_TOKEN_WRITE_FAILED", {
    tokenType,
    zone,
    capability: capabilityBase,
    liveWrite,
    providerError: `${removed.status} ${removed.errorCode ?? ""} ${removed.safeError ?? "DELETE_FAILED"}`.trim(),
    temporaryRecordsRemaining: remaining === "YES" ? 1 : 0,
  });
}

export type CloudflareUserDnsTokenVerifyResult = Awaited<ReturnType<typeof executeCreCloudflareUserDnsTokenVerify>>;
