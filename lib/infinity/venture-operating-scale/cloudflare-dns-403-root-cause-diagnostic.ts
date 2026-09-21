import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  reloadCloudflareDnsTokenFromLocalFile,
  reloadCloudflareRegistrarFromLocalFile,
} from "@/lib/infinity/communication-provider/load-local-env";
import {
  CLOUDFLARE_API_BASE_URL,
  classifyCloudflareTokenKind,
} from "@/lib/infinity/commercialization/providers/cloudflare/config";
import { CloudflareDnsWriteAdapter } from "@/lib/infinity/commercialization/providers/cloudflare/dns-write-adapter";
import {
  CRE_CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1,
  OCCUPANCYNPV_DOMAIN,
} from "./constants";
import { OCCUPANCYNPV_ZONE_ID } from "./cloudflare-dns-live-write-verification";

export const RAW_DNS_PROBE_NAME = `_infinity-raw-dns-probe.${OCCUPANCYNPV_DOMAIN}` as const;
const STORED_ZONE_ID = OCCUPANCYNPV_ZONE_ID;

type Envelope = {
  success?: boolean;
  result?: unknown;
  errors?: Array<{ message?: string; code?: number }>;
};

type RootCause =
  | "LOCAL_CLOUDFLARE_DNS_ADAPTER_DEFECT"
  | "CLOUDFLARE_TOKEN_OR_ACCOUNT_AUTHORIZATION_DEFECT"
  | "CLOUDFLARE_RUNTIME_TOKEN_DEFECT"
  | "CLOUDFLARE_ZONE_IDENTIFIER_DEFECT"
  | "CLOUDFLARE_DNS_WRITE_VERIFIED";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function inspectFileTokenSyntax(name: string, cwd: string): {
  keyCount: number;
  quoted: boolean;
  leadingWhitespace: boolean;
  trailingWhitespace: boolean;
  hasNewline: boolean;
  bearerPrefixed: boolean;
  empty: boolean;
} {
  const empty = {
    keyCount: 0,
    quoted: false,
    leadingWhitespace: false,
    trailingWhitespace: false,
    hasNewline: false,
    bearerPrefixed: false,
    empty: true,
  };
  const file = join(cwd, ".env.local");
  if (!existsSync(file)) return empty;
  const text = readFileSync(file, "utf8");
  let keyCount = 0;
  let raw = "";
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    if (trimmed.slice(0, index).trim() !== name) continue;
    keyCount += 1;
    raw = trimmed.slice(index + 1);
  }
  const quoted =
    (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"));
  return {
    keyCount,
    quoted,
    leadingWhitespace: raw !== raw.trimStart(),
    trailingWhitespace: raw !== raw.trimEnd(),
    hasNewline: /[\r\n]/.test(raw),
    bearerPrefixed: raw.trim().toLowerCase().startsWith("bearer "),
    empty: raw.trim() === "",
  };
}

async function rawRequest(
  fetchImpl: typeof fetch,
  token: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
): Promise<{
  ok: boolean;
  status: number;
  success: boolean | null;
  errorCode: number | string | null;
  errorMessage: string | null;
  result: unknown;
}> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (method !== "GET") headers["Content-Type"] = "application/json";
  const response = await fetchImpl(`${CLOUDFLARE_API_BASE_URL}${path}`, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });
  let envelope: Envelope = {};
  try {
    envelope = (await response.json()) as Envelope;
  } catch {
    envelope = {};
  }
  const first = Array.isArray(envelope.errors) ? envelope.errors[0] : null;
  return {
    ok: response.ok && envelope.success !== false,
    status: response.status,
    success: typeof envelope.success === "boolean" ? envelope.success : null,
    errorCode: first?.code ?? null,
    errorMessage: first?.message ?? (response.ok ? null : `CLOUDFLARE_HTTP_${response.status}`),
    result: envelope.result,
  };
}

function tokenFields(result: unknown): {
  id: string | null;
  status: string | null;
  expiresOn: string | null;
  notBefore: string | null;
} {
  const row = asRecord(result);
  return {
    id: typeof row.id === "string" ? row.id : null,
    status: typeof row.status === "string" ? row.status : null,
    expiresOn: typeof row.expires_on === "string" ? row.expires_on : null,
    notBefore: typeof row.not_before === "string" ? row.not_before : null,
  };
}

export async function executeCreCloudflareDns403RootCauseDiagnostic(input: {
  fetchImpl?: typeof fetch;
  reloadEnv?: boolean;
  cwd?: string;
} = {}) {
  if (input.reloadEnv !== false) {
    reloadCloudflareRegistrarFromLocalFile(input.cwd);
    reloadCloudflareDnsTokenFromLocalFile(input.cwd);
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const cwd = input.cwd ?? process.cwd();
  const token = (process.env.CLOUDFLARE_API_TOKEN ?? "").trim();
  const registrar = (process.env.CLOUDFLARE_REGISTRAR_API_TOKEN ?? "").trim();
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
  const fileSyntax = inspectFileTokenSyntax("CLOUDFLARE_API_TOKEN", cwd);
  const tokenKind = classifyCloudflareTokenKind(token);
  const distinctFromRegistrar =
    token && registrar ? (digest(token) !== digest(registrar) ? "YES" : "NO") : "UNKNOWN";
  const syntaxDefects: string[] = [];
  if (!token) syntaxDefects.push("EMPTY_BEARER_VALUE");
  if (fileSyntax.quoted) syntaxDefects.push("QUOTED_TOKEN");
  if (fileSyntax.leadingWhitespace || fileSyntax.trailingWhitespace) syntaxDefects.push("WHITESPACE_CORRUPTION");
  if (fileSyntax.hasNewline) syntaxDefects.push("NEWLINE_CORRUPTION");
  if (fileSyntax.bearerPrefixed) syntaxDefects.push("BEARER_PREFIX_IN_TOKEN_VALUE");
  if (tokenKind === "GLOBAL_API_KEY") syntaxDefects.push("GLOBAL_API_KEY_USED_AS_BEARER");
  const authenticationSyntax = syntaxDefects.length === 0 && token.length > 0 ? "PASS" : "FAIL";
  const adapter = new CloudflareDnsWriteAdapter({ fetchImpl });
  const adapterShape = adapter.inspectDnsCreateRequest(STORED_ZONE_ID);

  const finish = (rootCause: RootCause, extra: Record<string, unknown>) => {
    const writeVerified = rootCause === "CLOUDFLARE_DNS_WRITE_VERIFIED";
    return {
      mission: CRE_CLOUDFLARE_DNS_403_ROOT_CAUSE_DIAGNOSTIC_V1,
      tokenVerify: extra.tokenVerify,
      runtimeAuthentication: extra.runtimeAuthentication,
      zone: extra.zone,
      adapterRequest: extra.adapterRequest,
      rawApiProbe: extra.rawApiProbe,
      rootCause,
      authorizationSubclass: extra.authorizationSubclass ?? "NONE",
      repair: extra.repair ?? { codeChanged: "NO" as const, filesChanged: [] as string[], exactDefectRepaired: "NONE" },
      capability: {
        dnsRead: extra.dnsRead ?? "UNVERIFIED",
        dnsWrite: writeVerified ? "LIVE_WRITE_VERIFIED" as const : "UNVERIFIED" as const,
        currentZoneWritable: writeVerified ? "YES" as const : "NO" as const,
      },
      nextAction: extra.nextAction,
      actions: {
        productionDnsWrites: 0 as const,
        vercelMutations: 0 as const,
        domainPurchases: 0 as const,
        stripeWrites: 0 as const,
        deployments: 0 as const,
        temporaryRecordsRemaining: extra.temporaryRecordsRemaining ?? 0,
        publiclyLaunched: "NO" as const,
      },
      usedRegistrarToken: false,
      tokenKind,
    };
  };

  const runtimeAuthentication = {
    credentialSource: "CLOUDFLARE_API_TOKEN",
    registrarTokenUsed: "NO" as const,
    authorizationScheme: "Bearer",
    bearerHeader: token ? "PASS" as const : "FAIL" as const,
    legacyApiKeyHeaders: "NO" as const,
    authenticationSyntax,
    tokenKind,
    distinctFromRegistrar,
    fileKeyCount: fileSyntax.keyCount,
    syntaxDefects: syntaxDefects.length > 0 ? syntaxDefects : ["NONE"],
    lineage: {
      envResolution: "reloadCloudflareDnsTokenFromLocalFile / process.env.CLOUDFLARE_API_TOKEN",
      providerAdapter: "CloudflareDnsWriteAdapter",
      requestBuilder: "CloudflareDnsWriteAdapter.request + CloudflareCredentials.authorizationHeader",
      httpClient: "global fetch",
      dnsCreateRequest: "CloudflareDnsWriteAdapter.createTxtRecord POST /zones/{zoneId}/dns_records",
    },
  };

  const adapterRequest = {
    method: adapterShape.method,
    endpoint: adapterShape.endpoint,
    credentialRoute: adapterShape.credentialRoute,
    requestConstruction: adapterShape.authenticationSyntax,
    defect: authenticationSyntax === "FAIL" ? syntaxDefects.join(",") : adapterShape.defect,
  };

  if (!token) {
    return finish("CLOUDFLARE_RUNTIME_TOKEN_DEFECT", {
      tokenVerify: {
        http: 0,
        success: "NO",
        tokenId: "UNKNOWN",
        status: "MISSING",
        tokenActive: "NO",
        expiresOn: null,
        notBefore: null,
        userVerifyHttp: 0,
        accountVerifyHttp: 0,
      },
      runtimeAuthentication,
      zone: {
        domain: OCCUPANCYNPV_DOMAIN,
        providerZoneId: "UNKNOWN",
        storedZoneId: STORED_ZONE_ID,
        match: "FAIL",
      },
      adapterRequest,
      rawApiProbe: {
        attempted: "NO",
        create: "NOT_ATTEMPTED",
        readback: "NOT_ATTEMPTED",
        deleted: "NOT_ATTEMPTED",
        remaining: "NO",
        http: 0,
        code: "NONE",
        message: "CLOUDFLARE_API_TOKEN_MISSING",
        success: null,
      },
      dnsRead: "UNVERIFIED",
      temporaryRecordsRemaining: 0,
      nextAction: "CLOUDFLARE_DNS_TOKEN_AUTHENTICATION_FAILED",
    });
  }

  const userVerify = await rawRequest(fetchImpl, token, "GET", "/user/tokens/verify");
  const accountVerify = accountId
    ? await rawRequest(fetchImpl, token, "GET", `/accounts/${encodeURIComponent(accountId)}/tokens/verify`)
    : { ok: false, status: 0, success: false as boolean | null, errorCode: null, errorMessage: "CLOUDFLARE_ACCOUNT_ID_MISSING", result: null };
  const userFields = tokenFields(userVerify.result);
  const accountFields = tokenFields(accountVerify.result);
  const verified = userVerify.ok || accountVerify.ok;
  const fields = userVerify.ok ? userFields : accountFields;
  const tokenActive = verified && (fields.status ?? "active") === "active" ? "YES" : "NO";
  const tokenVerify = {
    http: userVerify.status,
    success: userVerify.ok ? "YES" as const : "NO" as const,
    tokenId: fields.id ?? "UNKNOWN",
    status: fields.status ?? (verified ? "UNKNOWN" : userVerify.errorMessage ?? "UNVERIFIED"),
    tokenActive,
    expiresOn: fields.expiresOn,
    notBefore: fields.notBefore,
    userVerifyHttp: userVerify.status,
    userVerifySuccess: userVerify.ok ? "YES" as const : "NO" as const,
    accountVerifyHttp: accountVerify.status,
    accountVerifySuccess: accountVerify.ok ? "YES" as const : "NO" as const,
    userVerifyMessage: userVerify.ok ? "NONE" : userVerify.errorMessage ?? "NONE",
    accountVerifyMessage: accountVerify.ok ? "NONE" : accountVerify.errorMessage ?? "NONE",
  };

  if (!verified) {
    return finish("CLOUDFLARE_RUNTIME_TOKEN_DEFECT", {
      tokenVerify,
      runtimeAuthentication,
      zone: {
        domain: OCCUPANCYNPV_DOMAIN,
        providerZoneId: "UNKNOWN",
        storedZoneId: STORED_ZONE_ID,
        match: "FAIL",
      },
      adapterRequest,
      rawApiProbe: {
        attempted: "NO",
        create: "NOT_ATTEMPTED",
        readback: "NOT_ATTEMPTED",
        deleted: "NOT_ATTEMPTED",
        remaining: "NO",
        http: userVerify.status,
        code: userVerify.errorCode ?? "NONE",
        message: userVerify.errorMessage ?? "TOKEN_VERIFY_FAILED",
        success: userVerify.success,
      },
      dnsRead: "UNVERIFIED",
      temporaryRecordsRemaining: 0,
      nextAction: "CLOUDFLARE_DNS_TOKEN_AUTHENTICATION_FAILED",
    });
  }

  const listed = await rawRequest(
    fetchImpl,
    token,
    "GET",
    `/zones?name=${encodeURIComponent(OCCUPANCYNPV_DOMAIN)}`,
  );
  const rows = Array.isArray(listed.result) ? listed.result : [];
  const first = asRecord(rows[0]);
  const providerZoneId = typeof first.id === "string" ? first.id : "UNKNOWN";
  const zoneMatch = providerZoneId === STORED_ZONE_ID ? "PASS" : "FAIL";
  const zoneStatus = typeof first.status === "string" ? first.status : "UNKNOWN";
  const zone = {
    domain: OCCUPANCYNPV_DOMAIN,
    providerZoneId,
    storedZoneId: STORED_ZONE_ID,
    match: zoneMatch,
    status: zoneStatus,
  };
  const dnsRead = listed.ok && providerZoneId !== "UNKNOWN" ? "READ_ONLY_VERIFIED" : "UNVERIFIED";

  if (zoneMatch !== "PASS") {
    return finish("CLOUDFLARE_ZONE_IDENTIFIER_DEFECT", {
      tokenVerify,
      runtimeAuthentication,
      zone,
      adapterRequest,
      rawApiProbe: {
        attempted: "NO",
        create: "NOT_ATTEMPTED",
        readback: "NOT_ATTEMPTED",
        deleted: "NOT_ATTEMPTED",
        remaining: "NO",
        http: listed.status,
        code: listed.errorCode ?? "NONE",
        message: listed.errorMessage ?? "ZONE_ID_MISMATCH",
        success: listed.success,
      },
      dnsRead,
      temporaryRecordsRemaining: 0,
      nextAction: "Correct the zone identifier used for DNS mutation to the provider-returned zone ID.",
    });
  }

  const membership = await rawRequest(fetchImpl, token, "GET", "/memberships");
  const user = await rawRequest(fetchImpl, token, "GET", "/user");
  const membershipRows = Array.isArray(membership.result) ? membership.result : [];
  const roles = membershipRows.flatMap((row) => {
    const item = asRecord(row);
    const roleList = Array.isArray(item.roles) ? item.roles : [];
    return roleList
      .map((role) => (typeof asRecord(role).name === "string" ? String(asRecord(role).name) : null))
      .filter((name): name is string => Boolean(name));
  });
  const userOk = user.ok ? "YES" : "NO";

  const before = await rawRequest(
    fetchImpl,
    token,
    "GET",
    `/zones/${encodeURIComponent(providerZoneId)}/dns_records?per_page=100`,
  );
  const beforeRows = Array.isArray(before.result) ? before.result : [];
  const leftovers = beforeRows.filter(
    (row) => asRecord(row).type === "TXT" && String(asRecord(row).name ?? "").toLowerCase() === RAW_DNS_PROBE_NAME,
  );
  for (const row of leftovers) {
    const id = asRecord(row).id;
    if (typeof id === "string") {
      await rawRequest(fetchImpl, token, "DELETE", `/zones/${encodeURIComponent(providerZoneId)}/dns_records/${encodeURIComponent(id)}`);
    }
  }

  const probeValue = `infinity-raw-dns-probe-${randomBytes(6).toString("hex")}`;
  const created = await rawRequest(
    fetchImpl,
    token,
    "POST",
    `/zones/${encodeURIComponent(providerZoneId)}/dns_records`,
    { type: "TXT", name: RAW_DNS_PROBE_NAME, content: probeValue, ttl: 120 },
  );

  let create: "PASS" | "FAIL" = created.ok ? "PASS" : "FAIL";
  let readback: "PASS" | "FAIL" | "NOT_ATTEMPTED" = "NOT_ATTEMPTED";
  let deleted: "PASS" | "FAIL" | "NOT_ATTEMPTED" = "NOT_ATTEMPTED";
  let remaining: "YES" | "NO" = "NO";
  let tempRemaining = 0;
  let recordId = typeof asRecord(created.result).id === "string" ? String(asRecord(created.result).id) : null;

  if (created.ok) {
    const listedAfter = await rawRequest(
      fetchImpl,
      token,
      "GET",
      `/zones/${encodeURIComponent(providerZoneId)}/dns_records?per_page=100`,
    );
    const found = (Array.isArray(listedAfter.result) ? listedAfter.result : []).find((row) => {
      const item = asRecord(row);
      return item.type === "TXT" && String(item.name ?? "").toLowerCase() === RAW_DNS_PROBE_NAME && String(item.content ?? "").replace(/^"|"$/g, "") === probeValue;
    });
    readback = found ? "PASS" : "FAIL";
    recordId = typeof asRecord(found).id === "string" ? String(asRecord(found).id) : recordId;
    if (recordId) {
      const removed = await rawRequest(
        fetchImpl,
        token,
        "DELETE",
        `/zones/${encodeURIComponent(providerZoneId)}/dns_records/${encodeURIComponent(recordId)}`,
      );
      deleted = removed.ok ? "PASS" : "FAIL";
    } else {
      deleted = "FAIL";
    }
    const after = await rawRequest(
      fetchImpl,
      token,
      "GET",
      `/zones/${encodeURIComponent(providerZoneId)}/dns_records?per_page=100`,
    );
    const stillThere = (Array.isArray(after.result) ? after.result : []).some(
      (row) => asRecord(row).type === "TXT" && String(asRecord(row).name ?? "").toLowerCase() === RAW_DNS_PROBE_NAME,
    );
    remaining = stillThere ? "YES" : "NO";
    tempRemaining = stillThere ? 1 : 0;
  }

  const rawApiProbe = {
    attempted: "YES" as const,
    create,
    readback,
    deleted,
    remaining,
    http: created.status,
    code: created.errorCode ?? "NONE",
    message: created.errorMessage ?? "NONE",
    success: created.success,
    dnsRecordsListHttp: before.status,
    dnsRecordsListOk: before.ok ? "YES" as const : "NO" as const,
    membershipHttp: membership.status,
    membershipOk: membership.ok ? "YES" as const : "NO" as const,
    userHttp: user.status,
    userOk,
    roles: roles.length > 0 ? roles : ["UNKNOWN"],
  };

  if (create === "PASS" && readback === "PASS" && deleted === "PASS" && remaining === "NO") {
    const adapterCreated = await adapter.createTxtRecord({
      zoneId: providerZoneId,
      name: RAW_DNS_PROBE_NAME,
      content: `infinity-adapter-dns-probe-${randomBytes(6).toString("hex")}`,
      ttl: 120,
    });
    if (!adapterCreated.ok) {
      return finish("LOCAL_CLOUDFLARE_DNS_ADAPTER_DEFECT", {
        tokenVerify,
        runtimeAuthentication,
        zone,
        adapterRequest: {
          ...adapterRequest,
          defect: "ADAPTER_POST_FAILED_AFTER_RAW_POST_PASSED",
          adapterHttp: adapterCreated.status,
          adapterCode: adapterCreated.errorCode ?? "NONE",
          adapterMessage: adapterCreated.safeError ?? "NONE",
        },
        rawApiProbe,
        dnsRead,
        temporaryRecordsRemaining: 0,
        nextAction: "Repair the proven Cloudflare DNS adapter request difference and rerun the reversible TXT probe.",
      });
    }
    if (adapterCreated.recordId !== "UNKNOWN") {
      await adapter.deleteRecord(providerZoneId, adapterCreated.recordId);
    }
    return finish("CLOUDFLARE_DNS_WRITE_VERIFIED", {
      tokenVerify,
      runtimeAuthentication,
      zone,
      adapterRequest,
      rawApiProbe,
      dnsRead,
      temporaryRecordsRemaining: 0,
      nextAction: "RESUME_CLOUDFLARE_DNS_AND_VERCEL_BINDING",
    });
  }

  let authorizationSubclass = "OTHER_PROVIDER_AUTHORIZATION_FAILURE";
  if (tokenActive !== "YES") authorizationSubclass = "TOKEN_NOT_ACTIVE";
  else if (tokenKind === "ACCOUNT_API_TOKEN") authorizationSubclass = "TOKEN_RESOURCE_SCOPE_PROBLEM";
  else if (roles.length > 0 && !roles.some((role) => /admin|super/i.test(role))) {
    authorizationSubclass = "USER_ACCOUNT_ROLE_RESTRICTION";
  } else if (created.status === 403 && created.errorCode === 10000) {
    authorizationSubclass = "TOKEN_RESOURCE_SCOPE_PROBLEM";
  }

  return finish("CLOUDFLARE_TOKEN_OR_ACCOUNT_AUTHORIZATION_DEFECT", {
    tokenVerify,
    runtimeAuthentication,
    zone,
    adapterRequest,
    rawApiProbe,
    authorizationSubclass,
    dnsRead,
    temporaryRecordsRemaining: tempRemaining,
    nextAction:
      tokenKind === "ACCOUNT_API_TOKEN"
        ? "The loaded CLOUDFLARE_API_TOKEN is an account-owned token, not the expected user-owned token. Put the already-created user-owned DNS token into CLOUDFLARE_API_TOKEN only. Do not create another token. Do not change Cloudflare permissions."
        : "Cloudflare rejected a correctly formed Bearer DNS POST. Confirm the existing user-owned token is the value in CLOUDFLARE_API_TOKEN and that the user role can edit DNS. Do not create another token. Do not change permissions.",
  });
}

export type CloudflareDns403RootCauseDiagnosticResult = Awaited<
  ReturnType<typeof executeCreCloudflareDns403RootCauseDiagnostic>
>;
