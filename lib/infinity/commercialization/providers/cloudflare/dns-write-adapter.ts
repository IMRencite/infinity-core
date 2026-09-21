import {
  CLOUDFLARE_API_BASE_URL,
  CLOUDFLARE_DEFAULT_TIMEOUT_MS,
  CloudflareCredentials,
  loadCloudflareConfig,
} from "./config";
import { normalizeCloudflareRecord, normalizeCloudflareZone } from "./normalize";

type Envelope = {
  success?: boolean;
  result?: unknown;
  errors?: Array<{ message?: string; code?: number }>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function dnsContentEqual(left: string | null | undefined, right: string | null | undefined): boolean {
  return (left ?? "").replace(/\.$/, "").toLowerCase() === (right ?? "").replace(/\.$/, "").toLowerCase();
}

export class CloudflareDnsWriteAdapter {
  writeHttpCalls = 0;
  readHttpCalls = 0;
  zoneCreates = 0;
  recordWrites = 0;
  private readonly fetchImpl: typeof fetch;
  private readonly credentials: CloudflareCredentials | null;
  private readonly accountId: string | null;
  private readonly timeoutMs: number;
  readonly usedRegistrarToken = false;

  constructor(options: { env?: NodeJS.Dict<string>; fetchImpl?: typeof fetch } = {}) {
    const env = options.env ?? process.env;
    const loaded = loadCloudflareConfig(env);
    const token = (env.CLOUDFLARE_API_TOKEN ?? "").trim();
    this.credentials = loaded.credentials ?? (token.length >= 8 ? new CloudflareCredentials(token) : null);
    this.accountId = loaded.public.accountId;
    this.timeoutMs = loaded.public.timeoutMs || CLOUDFLARE_DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  tokenPresent(): boolean {
    return Boolean(this.credentials);
  }

  inspectDnsCreateRequest(zoneId: string): {
    method: "POST";
    endpoint: string;
    credentialRoute: string;
    authorizationScheme: "Bearer";
    bearerHeader: "PASS" | "FAIL";
    registrarTokenUsed: false;
    globalApiKeyUsed: false;
    legacyApiKeyHeaders: false;
    authenticationSyntax: "PASS" | "FAIL";
    headerNames: string[];
    bodyKeys: string[];
    defect: string;
  } {
    const populated = Boolean(this.credentials);
    return {
      method: "POST",
      endpoint: `${CLOUDFLARE_API_BASE_URL}/zones/${encodeURIComponent(zoneId)}/dns_records`,
      credentialRoute:
        "CLOUDFLARE_API_TOKEN -> loadCloudflareConfig/CloudflareCredentials.authorizationHeader -> Authorization Bearer",
      authorizationScheme: "Bearer",
      bearerHeader: populated ? "PASS" : "FAIL",
      registrarTokenUsed: false,
      globalApiKeyUsed: false,
      legacyApiKeyHeaders: false,
      authenticationSyntax: populated ? "PASS" : "FAIL",
      headerNames: ["Authorization", "Accept", "Content-Type"],
      bodyKeys: ["type", "name", "content", "ttl", "proxied"],
      defect: populated ? "NONE" : "CLOUDFLARE_API_TOKEN_MISSING",
    };
  }

  private async request(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
    options: { allowWrite?: boolean } = {},
  ): Promise<{
    ok: boolean;
    status: number;
    envelope: Envelope;
    safeError: string | null;
    errorCode: number | string | null;
  }> {
    if (!this.credentials) {
      return { ok: false, status: 0, envelope: {}, safeError: "CLOUDFLARE_API_TOKEN_MISSING", errorCode: null };
    }
    if (method !== "GET" && !options.allowWrite) {
      return { ok: false, status: 0, envelope: {}, safeError: "DNS_WRITE_BLOCKED", errorCode: null };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${CLOUDFLARE_API_BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: this.credentials.authorizationHeader(),
          Accept: "application/json",
          ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
        },
        body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
        signal: controller.signal,
      });
      if (method === "GET") this.readHttpCalls += 1;
      else this.writeHttpCalls += 1;
      let envelope: Envelope = {};
      try {
        envelope = (await response.json()) as Envelope;
      } catch {
        envelope = {};
      }
      const raw = Array.isArray(envelope.errors)
        ? envelope.errors.map((row) => row.message ?? String(row.code ?? "error")).join("; ")
        : response.ok
          ? null
          : `CLOUDFLARE_HTTP_${response.status}`;
      const errorCode = Array.isArray(envelope.errors) && envelope.errors[0]?.code != null
        ? envelope.errors[0].code
        : null;
      return {
        ok: response.ok && envelope.success !== false,
        status: response.status,
        envelope,
        safeError: raw ? this.credentials.redact(raw) : null,
        errorCode,
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        envelope: {},
        safeError: this.credentials.redact(error instanceof Error ? error.message : "CLOUDFLARE_DNS_REQUEST_FAILED"),
        errorCode: null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async verifyToken(): Promise<{ ok: boolean; status: number; safeError: string | null; tokenId: string | null }> {
    const accountPath = this.accountId ? `/accounts/${encodeURIComponent(this.accountId)}/tokens/verify` : null;
    const user = await this.request("GET", "/user/tokens/verify");
    const userId = typeof asRecord(user.envelope.result).id === "string" ? String(asRecord(user.envelope.result).id) : null;
    if (user.ok) return { ok: true, status: user.status, safeError: null, tokenId: userId };
    if (!accountPath) return { ok: false, status: user.status, safeError: user.safeError, tokenId: userId };
    const account = await this.request("GET", accountPath);
    const accountId = typeof asRecord(account.envelope.result).id === "string" ? String(asRecord(account.envelope.result).id) : userId;
    return { ok: account.ok, status: account.status, safeError: account.safeError ?? user.safeError, tokenId: accountId };
  }

  async inspectTokenScope(currentZoneId: string): Promise<{
    futureAccountZonesCovered: "YES" | "NO" | "UNKNOWN";
    currentZoneInPolicy: "YES" | "NO" | "UNKNOWN";
    zoneScope: "ALL_ZONES" | "SPECIFIC_ZONE" | "UNKNOWN";
    safeError: string | null;
  }> {
    const verified = await this.verifyToken();
    if (!verified.ok || !verified.tokenId) {
      return {
        futureAccountZonesCovered: "UNKNOWN",
        currentZoneInPolicy: "UNKNOWN",
        zoneScope: "UNKNOWN",
        safeError: verified.safeError,
      };
    }
    const user = await this.request("GET", `/user/tokens/${encodeURIComponent(verified.tokenId)}`);
    const account = !user.ok && this.accountId
      ? await this.request("GET", `/accounts/${encodeURIComponent(this.accountId)}/tokens/${encodeURIComponent(verified.tokenId)}`)
      : user;
    if (!account.ok) {
      return {
        futureAccountZonesCovered: "UNKNOWN",
        currentZoneInPolicy: "UNKNOWN",
        zoneScope: "UNKNOWN",
        safeError: account.safeError,
      };
    }
    const policies = Array.isArray(asRecord(account.envelope.result).policies)
      ? (asRecord(account.envelope.result).policies as unknown[])
      : [];
    let future: "YES" | "NO" | "UNKNOWN" = "UNKNOWN";
    let current: "YES" | "NO" | "UNKNOWN" = "UNKNOWN";
    for (const policy of policies) {
      const resources = asRecord(asRecord(policy).resources);
      for (const key of Object.keys(resources)) {
        if (/account\.zone\.\*$/i.test(key) || /account\.\*$/i.test(key)) future = "YES";
        if (currentZoneId && key.toLowerCase().includes(currentZoneId.toLowerCase())) current = "YES";
      }
    }
    if (future === "YES" && current === "UNKNOWN") current = "YES";
    if (future === "UNKNOWN" && current === "UNKNOWN" && policies.length > 0) future = "NO";
    return {
      futureAccountZonesCovered: future,
      currentZoneInPolicy: current,
      zoneScope: future === "YES" ? "ALL_ZONES" : future === "NO" || current === "YES" ? "SPECIFIC_ZONE" : "UNKNOWN",
      safeError: null,
    };
  }

  async createTxtRecord(input: {
    zoneId: string;
    name: string;
    content: string;
    ttl?: number;
  }): Promise<{
    ok: boolean;
    status: number;
    recordId: string | "UNKNOWN";
    errorCode: number | string | null;
    safeError: string | null;
  }> {
    this.recordWrites += 1;
    const result = await this.request(
      "POST",
      `/zones/${encodeURIComponent(input.zoneId)}/dns_records`,
      { type: "TXT", name: input.name, content: input.content, ttl: input.ttl ?? 120, proxied: false },
      { allowWrite: true },
    );
    const body = asRecord(result.envelope.result);
    return {
      ok: result.ok,
      status: result.status,
      recordId: typeof body.id === "string" ? body.id : "UNKNOWN",
      errorCode: result.errorCode,
      safeError: result.safeError,
    };
  }

  async deleteRecord(zoneId: string, recordId: string): Promise<{
    ok: boolean;
    status: number;
    errorCode: number | string | null;
    safeError: string | null;
  }> {
    this.recordWrites += 1;
    const result = await this.request(
      "DELETE",
      `/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`,
      undefined,
      { allowWrite: true },
    );
    return { ok: result.ok, status: result.status, errorCode: result.errorCode, safeError: result.safeError };
  }

  async findZone(name: string): Promise<{
    exists: boolean;
    zoneId: string | "UNKNOWN";
    status: string | "UNKNOWN";
    nameservers: string[] | "UNKNOWN";
    accountId: string | "UNKNOWN";
    httpStatus: number;
    safeError: string | null;
  }> {
    const query = `/zones?name=${encodeURIComponent(name)}${this.accountId ? `&account.id=${encodeURIComponent(this.accountId)}` : ""}`;
    const result = await this.request("GET", query);
    const rows = Array.isArray(result.envelope.result) ? result.envelope.result : [];
    const first = asRecord(rows[0]);
    const zone = normalizeCloudflareZone(first, new Date().toISOString());
    const nameservers = Array.isArray(first.name_servers)
      ? first.name_servers.filter((row): row is string => typeof row === "string")
      : "UNKNOWN";
    return {
      exists: Boolean(zone),
      zoneId: zone?.zoneId ?? "UNKNOWN",
      status: zone?.status ?? "UNKNOWN",
      nameservers: nameservers === "UNKNOWN" || nameservers.length === 0 ? "UNKNOWN" : nameservers,
      accountId: zone?.accountId ?? this.accountId ?? "UNKNOWN",
      httpStatus: result.status,
      safeError: result.safeError,
    };
  }

  async createZone(name: string): Promise<{
    ok: boolean;
    zoneId: string | "UNKNOWN";
    status: string | "UNKNOWN";
    nameservers: string[] | "UNKNOWN";
    httpStatus: number;
    safeError: string | null;
  }> {
    if (!this.accountId) {
      return { ok: false, zoneId: "UNKNOWN", status: "UNKNOWN", nameservers: "UNKNOWN", httpStatus: 0, safeError: "CLOUDFLARE_ACCOUNT_ID_MISSING" };
    }
    this.zoneCreates += 1;
    const result = await this.request(
      "POST",
      "/zones",
      { name, account: { id: this.accountId } },
      { allowWrite: true },
    );
    const body = asRecord(result.envelope.result);
    const zone = normalizeCloudflareZone(body, new Date().toISOString());
    const nameservers = Array.isArray(body.name_servers)
      ? body.name_servers.filter((row): row is string => typeof row === "string")
      : "UNKNOWN";
    return {
      ok: result.ok && Boolean(zone),
      zoneId: zone?.zoneId ?? "UNKNOWN",
      status: zone?.status ?? "UNKNOWN",
      nameservers: nameservers === "UNKNOWN" || nameservers.length === 0 ? "UNKNOWN" : nameservers,
      httpStatus: result.status,
      safeError: result.safeError,
    };
  }

  async listRecords(zoneId: string) {
    const result = await this.request("GET", `/zones/${encodeURIComponent(zoneId)}/dns_records?per_page=100`);
    const rows = Array.isArray(result.envelope.result) ? result.envelope.result : [];
    return {
      ok: result.ok,
      status: result.status,
      records: rows
        .map((row) => normalizeCloudflareRecord(asRecord(row), zoneId, new Date().toISOString()))
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      safeError: result.safeError,
    };
  }

  async upsertRecord(input: {
    zoneId: string;
    type: string;
    name: string;
    content: string;
    proxied: boolean;
    ttl?: number;
  }): Promise<{
    ok: boolean;
    created: boolean;
    updated: boolean;
    unchanged: boolean;
    httpStatus: number;
    recordId: string | "UNKNOWN";
    type: string;
    name: string;
    content: string | null;
    proxied: boolean | null;
    ttl: number | null;
    safeError: string | null;
  }> {
    const listed = await this.listRecords(input.zoneId);
    const existing = listed.records.find(
      (row) => row.recordType === input.type && row.name.toLowerCase() === input.name.toLowerCase(),
    );
    const ttl = input.proxied ? 1 : input.ttl ?? 1;
    if (existing && dnsContentEqual(existing.content, input.content) && existing.proxied === input.proxied) {
      return {
        ok: true,
        created: false,
        updated: false,
        unchanged: true,
        httpStatus: listed.status,
        recordId: existing.recordId,
        type: existing.recordType,
        name: existing.name,
        content: existing.content,
        proxied: existing.proxied,
        ttl: existing.ttl,
        safeError: null,
      };
    }
    this.recordWrites += 1;
    const result = existing
      ? await this.request(
          "PATCH",
          `/zones/${encodeURIComponent(input.zoneId)}/dns_records/${encodeURIComponent(existing.recordId)}`,
          { type: input.type, name: input.name, content: input.content, proxied: input.proxied, ttl },
          { allowWrite: true },
        )
      : await this.request(
          "POST",
          `/zones/${encodeURIComponent(input.zoneId)}/dns_records`,
          { type: input.type, name: input.name, content: input.content, proxied: input.proxied, ttl },
          { allowWrite: true },
        );
    const body = asRecord(result.envelope.result);
    const normalized = normalizeCloudflareRecord(body, input.zoneId, new Date().toISOString());
    return {
      ok: result.ok && Boolean(normalized),
      created: !existing,
      updated: Boolean(existing),
      unchanged: false,
      httpStatus: result.status,
      recordId: normalized?.recordId ?? "UNKNOWN",
      type: normalized?.recordType ?? input.type,
      name: normalized?.name ?? input.name,
      content: normalized?.content ?? null,
      proxied: normalized?.proxied ?? null,
      ttl: normalized?.ttl ?? null,
      safeError: result.safeError,
    };
  }
}
