import {
  CLOUDFLARE_API_BASE_URL,
  CLOUDFLARE_REGISTRATION_TIMEOUT_MS,
  loadCloudflareRegistrarConfig,
  type CloudflareCredentials,
} from "./config";

export const CLOUDFLARE_REGISTRAR_PROVIDER = "cloudflare.registrar_v1" as const;

type CloudflareEnvelope = {
  success?: boolean;
  result?: unknown;
  errors?: Array<{ message?: string; code?: number }>;
};

export type CloudflareCheckedDomain = {
  domain: string;
  available: "YES" | "NO" | "UNKNOWN";
  premium: "YES" | "NO" | "UNKNOWN";
  firstYear: number | "UNKNOWN";
  renewal: number | "UNKNOWN";
  currency: string;
  reason: string | null;
  evidence: string;
  timestamp: string;
};

function redact(credentials: CloudflareCredentials | null, value: string): string {
  return credentials ? credentials.redact(value) : value.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
}

function money(value: unknown): number | "UNKNOWN" {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return "UNKNOWN";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function parseChecked(row: Record<string, unknown>, timestamp: string): CloudflareCheckedDomain {
  const domain = String(row.name ?? row.domain ?? "").toLowerCase();
  const registrable = row.registrable;
  const available = registrable === true ? "YES" : registrable === false ? "NO" : "UNKNOWN";
  const tier = String(row.tier ?? "").toLowerCase();
  const premium = tier === "premium" ? "YES" : tier === "standard" ? "NO" : "UNKNOWN";
  const pricing = asRecord(row.pricing);
  return {
    domain,
    available,
    premium,
    firstYear: money(pricing.registration_cost ?? pricing.registrationCost ?? row.registration_cost),
    renewal: money(pricing.renewal_cost ?? pricing.renewalCost ?? row.renewal_cost),
    currency: String(pricing.currency ?? row.currency ?? "USD").toUpperCase(),
    reason: typeof row.reason === "string" ? row.reason : null,
    evidence: "POST /accounts/{account_id}/registrar/domain-check",
    timestamp,
  };
}

export class CloudflareRegistrarAdapter {
  readonly config = loadCloudflareRegistrarConfig();
  readHttpCalls = 0;
  writeHttpCalls = 0;
  registrationPosts = 0;
  checkPosts = 0;
  private readonly fetchImpl: typeof fetch;

  constructor(options: { env?: NodeJS.Dict<string>; fetchImpl?: typeof fetch } = {}) {
    this.config = loadCloudflareRegistrarConfig(options.env ?? process.env);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  registrarTokenSelected(): "PASS" | "FAIL" {
    return this.config.registrarCredentials && this.config.public.registrarTokenConfigured ? "PASS" : "FAIL";
  }

  generalTokenPreserved(priorGeneral: string | null): "PASS" | "FAIL" {
    const current = process.env.CLOUDFLARE_API_TOKEN ?? "";
    if (priorGeneral == null) return this.config.public.generalTokenConfigured ? "PASS" : "FAIL";
    return current === priorGeneral ? "PASS" : "FAIL";
  }

  tokensAreSeparated(): boolean {
    return this.config.public.tokensAreDistinct || !this.config.public.generalTokenConfigured;
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
    options: { allowRegistrationWrite?: boolean; timeoutMs?: number } = {},
  ): Promise<{ ok: boolean; status: number; envelope: CloudflareEnvelope; safeError: string | null }> {
    const credentials = this.config.registrarCredentials;
    if (!credentials) {
      return { ok: false, status: 0, envelope: {}, safeError: "CLOUDFLARE_REGISTRAR_API_TOKEN_MISSING" };
    }
    if (path.includes("/registrar/registrations") && method === "POST" && !options.allowRegistrationWrite) {
      this.registrationPosts += 1;
      return { ok: false, status: 0, envelope: {}, safeError: "REGISTRATION_WRITE_BLOCKED" };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? this.config.public.timeoutMs);
    try {
      const response = await this.fetchImpl(`${CLOUDFLARE_API_BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: credentials.authorizationHeader(),
          Accept: "application/json",
          ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        },
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
        signal: controller.signal,
      });
      if (method === "POST") {
        if (path.includes("/domain-check")) this.checkPosts += 1;
        else this.writeHttpCalls += 1;
      } else {
        this.readHttpCalls += 1;
      }
      let envelope: CloudflareEnvelope = {};
      try {
        envelope = (await response.json()) as CloudflareEnvelope;
      } catch {
        envelope = {};
      }
      const rawError = Array.isArray(envelope.errors)
        ? envelope.errors.map((row) => row.message ?? String(row.code ?? "error")).join("; ")
        : response.ok
          ? null
          : `CLOUDFLARE_HTTP_${response.status}`;
      return {
        ok: response.ok && envelope.success !== false,
        status: response.status,
        envelope,
        safeError: rawError ? redact(credentials, rawError) : null,
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        envelope: {},
        safeError: redact(credentials, error instanceof Error ? error.message : "CLOUDFLARE_REGISTRAR_REQUEST_FAILED"),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async verifyToken(): Promise<{ ok: boolean; status: number; safeError: string | null; path: string }> {
    const user = await this.request("GET", "/user/tokens/verify");
    if (user.ok) {
      return { ok: true, status: user.status, safeError: null, path: "/user/tokens/verify" };
    }
    const accountId = this.config.public.accountId;
    if (!accountId) {
      return { ok: user.ok, status: user.status, safeError: user.safeError, path: "/user/tokens/verify" };
    }
    const accountPath = `/accounts/${encodeURIComponent(accountId)}/tokens/verify`;
    const account = await this.request("GET", accountPath);
    return {
      ok: account.ok,
      status: account.status,
      safeError: account.safeError ?? user.safeError,
      path: account.ok ? accountPath : "/user/tokens/verify",
    };
  }

  async readAccount(): Promise<{
    ok: boolean;
    accountId: string | "UNKNOWN";
    name: string | "UNKNOWN";
    matchesRuntime: "PASS" | "FAIL";
    safeError: string | null;
  }> {
    const expected = this.config.public.accountId;
    if (!expected) {
      return { ok: false, accountId: "UNKNOWN", name: "UNKNOWN", matchesRuntime: "FAIL", safeError: "CLOUDFLARE_ACCOUNT_ID_MISSING" };
    }
    const result = await this.request("GET", `/accounts/${encodeURIComponent(expected)}`);
    const body = asRecord(result.envelope.result);
    const accountId = typeof body.id === "string" ? body.id : expected;
    return {
      ok: result.ok,
      accountId,
      name: typeof body.name === "string" && body.name.trim() ? body.name : "UNKNOWN",
      matchesRuntime: result.ok && accountId === expected ? "PASS" : "FAIL",
      safeError: result.safeError,
    };
  }

  async searchDomains(query: string): Promise<{ ok: boolean; status: number; rows: CloudflareCheckedDomain[]; safeError: string | null }> {
    const timestamp = new Date().toISOString();
    const accountId = this.config.public.accountId;
    if (!accountId) return { ok: false, status: 0, rows: [], safeError: "CLOUDFLARE_ACCOUNT_ID_MISSING" };
    const result = await this.request(
      "GET",
      `/accounts/${encodeURIComponent(accountId)}/registrar/domain-search?q=${encodeURIComponent(query)}`,
    );
    const payload = asRecord(result.envelope.result);
    const list = Array.isArray(payload.domains)
      ? payload.domains
      : Array.isArray(result.envelope.result)
        ? result.envelope.result
        : [];
    return {
      ok: result.ok,
      status: result.status,
      rows: (list as Array<Record<string, unknown>>).map((row) => parseChecked(row, timestamp)),
      safeError: result.safeError,
    };
  }

  async checkDomains(domains: string[]): Promise<{ ok: boolean; status: number; rows: CloudflareCheckedDomain[]; safeError: string | null }> {
    const timestamp = new Date().toISOString();
    const accountId = this.config.public.accountId;
    if (!accountId) return { ok: false, status: 0, rows: [], safeError: "CLOUDFLARE_ACCOUNT_ID_MISSING" };
    const result = await this.request("POST", `/accounts/${encodeURIComponent(accountId)}/registrar/domain-check`, {
      domains,
    });
    const payload = asRecord(result.envelope.result);
    const list = Array.isArray(payload.domains)
      ? payload.domains
      : Array.isArray(result.envelope.result)
        ? result.envelope.result
        : [];
    const parsed = (list as Array<Record<string, unknown>>).map((row) => parseChecked(row, timestamp));
    const byName = new Map(parsed.map((row) => [row.domain, row]));
    return {
      ok: result.ok,
      status: result.status,
      rows: domains.map((domain) => byName.get(domain.toLowerCase()) ?? {
        domain,
        available: "UNKNOWN",
        premium: "UNKNOWN",
        firstYear: "UNKNOWN",
        renewal: "UNKNOWN",
        currency: "USD",
        reason: result.safeError,
        evidence: "POST /accounts/{account_id}/registrar/domain-check",
        timestamp,
      }),
      safeError: result.safeError,
    };
  }

  async listRegisteredDomains(): Promise<{ ok: boolean; count: number; safeError: string | null }> {
    const accountId = this.config.public.accountId;
    if (!accountId) return { ok: false, count: 0, safeError: "CLOUDFLARE_ACCOUNT_ID_MISSING" };
    const result = await this.request("GET", `/accounts/${encodeURIComponent(accountId)}/registrar/domains`);
    const list = Array.isArray(result.envelope.result)
      ? result.envelope.result
      : Array.isArray(asRecord(result.envelope.result).domains)
        ? asRecord(result.envelope.result).domains
        : [];
    return { ok: result.ok, count: Array.isArray(list) ? list.length : 0, safeError: result.safeError };
  }

  async getRegistration(domain: string): Promise<{
    ok: boolean;
    status: number;
    owned: boolean;
    registrationState: string;
    createdAt: string | "UNKNOWN";
    expiresAt: string | "UNKNOWN";
    autoRenew: "YES" | "NO" | "UNKNOWN";
    renewal: number | "UNKNOWN";
    nameservers: string[] | "UNKNOWN";
    providerReference: string | "UNKNOWN";
    safeError: string | null;
  }> {
    const accountId = this.config.public.accountId;
    if (!accountId) {
      return {
        ok: false,
        status: 0,
        owned: false,
        registrationState: "UNKNOWN",
        createdAt: "UNKNOWN",
        expiresAt: "UNKNOWN",
        autoRenew: "UNKNOWN",
        renewal: "UNKNOWN",
        nameservers: "UNKNOWN",
        providerReference: "UNKNOWN",
        safeError: "CLOUDFLARE_ACCOUNT_ID_MISSING",
      };
    }
    const result = await this.request(
      "GET",
      `/accounts/${encodeURIComponent(accountId)}/registrar/registrations/${encodeURIComponent(domain)}`,
    );
    const body = asRecord(result.envelope.result);
    const owned = result.ok && (typeof body.domain_name === "string" || typeof body.status === "string");
    const nameservers = Array.isArray(body.name_servers)
      ? (body.name_servers as unknown[]).filter((row): row is string => typeof row === "string")
      : Array.isArray(body.nameservers)
        ? (body.nameservers as unknown[]).filter((row): row is string => typeof row === "string")
        : "UNKNOWN";
    return {
      ok: result.ok,
      status: result.status,
      owned,
      registrationState: typeof body.status === "string" ? body.status : result.ok ? "UNKNOWN" : "FAILED",
      createdAt: typeof body.created_at === "string" ? body.created_at : "UNKNOWN",
      expiresAt: typeof body.expires_at === "string" ? body.expires_at : "UNKNOWN",
      autoRenew: body.auto_renew === true ? "YES" : body.auto_renew === false ? "NO" : "UNKNOWN",
      renewal: money(asRecord(body.pricing).renewal_cost ?? body.renewal_cost),
      nameservers: nameservers === "UNKNOWN" || nameservers.length === 0 ? "UNKNOWN" : nameservers,
      providerReference: typeof body.id === "string" ? body.id : typeof body.domain_name === "string" ? body.domain_name : "UNKNOWN",
      safeError: result.safeError,
    };
  }

  async inspectBillingReadiness(): Promise<{ state: "READY" | "NOT_READY" | "UNKNOWN"; safeError: string | null }> {
    const accountId = this.config.public.accountId;
    if (!accountId) return { state: "UNKNOWN", safeError: "CLOUDFLARE_ACCOUNT_ID_MISSING" };
    const methods = await this.request("GET", `/accounts/${encodeURIComponent(accountId)}/payment-methods`);
    if (methods.ok) {
      const list = Array.isArray(methods.envelope.result)
        ? methods.envelope.result
        : Array.isArray(asRecord(methods.envelope.result).payment_methods)
          ? asRecord(methods.envelope.result).payment_methods
          : [];
      const hasDefault = Array.isArray(list) && list.some((row) => asRecord(row).default === true);
      return { state: hasDefault || (Array.isArray(list) && list.length > 0) ? "READY" : "NOT_READY", safeError: null };
    }
    const profile = await this.request("GET", `/accounts/${encodeURIComponent(accountId)}/billing/profile`);
    if (profile.ok && profile.envelope.result) return { state: "READY", safeError: null };
    if (methods.status === 403 || profile.status === 403) return { state: "UNKNOWN", safeError: "BILLING_READ_NOT_AUTHORIZED" };
    return { state: "UNKNOWN", safeError: methods.safeError ?? profile.safeError };
  }

  async inspectExtension(extension: string): Promise<{ ok: boolean; supported: boolean; safeError: string | null }> {
    const accountId = this.config.public.accountId;
    if (!accountId) return { ok: false, supported: false, safeError: "CLOUDFLARE_ACCOUNT_ID_MISSING" };
    const result = await this.request(
      "GET",
      `/accounts/${encodeURIComponent(accountId)}/registrar/extensions/${encodeURIComponent(extension)}`,
    );
    return { ok: result.ok, supported: result.ok, safeError: result.safeError };
  }

  async registerAuthorizedDomain(input: {
    domain: string;
    years?: 1;
    autoRenew?: false;
  }): Promise<{
    ok: boolean;
    pending: boolean;
    status: number;
    providerReference: string | "UNKNOWN";
    registrationState: string;
    createdAt: string | "UNKNOWN";
    expiresAt: string | "UNKNOWN";
    autoRenew: "YES" | "NO" | "UNKNOWN";
    actualCharge: number | "UNKNOWN";
    currency: string;
    safeError: string | null;
  }> {
    const accountId = this.config.public.accountId;
    const domain = input.domain.trim().toLowerCase();
    if (!accountId) {
      return {
        ok: false,
        pending: false,
        status: 0,
        providerReference: "UNKNOWN",
        registrationState: "FAILED",
        createdAt: "UNKNOWN",
        expiresAt: "UNKNOWN",
        autoRenew: "UNKNOWN",
        actualCharge: "UNKNOWN",
        currency: "USD",
        safeError: "CLOUDFLARE_ACCOUNT_ID_MISSING",
      };
    }
    this.registrationPosts += 1;
    const result = await this.request(
      "POST",
      `/accounts/${encodeURIComponent(accountId)}/registrar/registrations`,
      {
        domain_name: domain,
        years: input.years ?? 1,
        auto_renew: input.autoRenew ?? false,
      },
      { allowRegistrationWrite: true, timeoutMs: CLOUDFLARE_REGISTRATION_TIMEOUT_MS },
    );
    const body = asRecord(result.envelope.result);
    const context = asRecord(body.context);
    const registration = asRecord(context.registration);
    const merged = Object.keys(registration).length ? registration : body;
    const pending =
      result.status === 202 ||
      result.status === 0 ||
      body.state === "pending" ||
      body.state === "in_progress" ||
      body.completed === false;
    return {
      ok: result.ok || pending,
      pending,
      status: result.status,
      providerReference: typeof merged.id === "string" ? merged.id : typeof merged.domain_name === "string" ? merged.domain_name : "UNKNOWN",
      registrationState: typeof body.state === "string" ? body.state : typeof merged.status === "string" ? merged.status : result.ok ? "UNKNOWN" : "FAILED",
      createdAt: typeof merged.created_at === "string" ? merged.created_at : "UNKNOWN",
      expiresAt: typeof merged.expires_at === "string" ? merged.expires_at : "UNKNOWN",
      autoRenew: merged.auto_renew === true ? "YES" : merged.auto_renew === false ? "NO" : "UNKNOWN",
      actualCharge: money(asRecord(merged.pricing).registration_cost ?? merged.registration_cost ?? context.charged_amount),
      currency: String(asRecord(merged.pricing).currency ?? merged.currency ?? "USD").toUpperCase(),
      safeError: result.safeError,
    };
  }
}
