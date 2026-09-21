import { CLOUDFLARE_ACCOUNT_ID_ENV, CLOUDFLARE_API_TOKEN_ENV, CLOUDFLARE_ENABLED_ENV, CLOUDFLARE_LIVE_ENV, CLOUDFLARE_PROBE_ZONE_ENV, CLOUDFLARE_REGISTRAR_API_TOKEN_ENV, CLOUDFLARE_ZONE_ID_ENV } from "../config";

export const CLOUDFLARE_API_BASE_URL = "https://api.cloudflare.com/client/v4";
export const CLOUDFLARE_DEFAULT_TIMEOUT_MS = 15_000;
export const CLOUDFLARE_REGISTRATION_TIMEOUT_MS = 60_000;
export const CLOUDFLARE_PAGE_SIZE = 50;
export const CLOUDFLARE_MAX_PAGES = 5;
export const CLOUDFLARE_RECORD_DETAIL_CAP = 5;

export type CloudflareTokenScope = "TOKEN_SCOPE_MINIMAL" | "TOKEN_SCOPE_BROADER_THAN_REQUIRED" | "UNKNOWN";

export type CloudflareTokenKind =
  | "USER_API_TOKEN"
  | "ACCOUNT_API_TOKEN"
  | "GLOBAL_API_KEY"
  | "LEGACY_UNPREFIXED"
  | "MISSING";

export function classifyCloudflareTokenKind(token: string | null | undefined): CloudflareTokenKind {
  const value = (token ?? "").trim();
  if (!value) return "MISSING";
  if (value.startsWith("cfut_")) return "USER_API_TOKEN";
  if (value.startsWith("cfat_")) return "ACCOUNT_API_TOKEN";
  if (value.startsWith("cfk_")) return "GLOBAL_API_KEY";
  return "LEGACY_UNPREFIXED";
}

export type CloudflarePublicConfig = {
  enabled: boolean;
  tokenConfigured: boolean;
  accountIdConfigured: boolean;
  timeoutMs: number;
  zoneId: string | null;
  probeZone: string | null;
  accountId: string | null;
};

export class CloudflareCredentials {
  readonly #token: string;

  constructor(token: string) {
    this.#token = token;
  }

  authorizationHeader(): string {
    return `Bearer ${this.#token}`;
  }

  redact(value: string): string {
    return this.#token ? value.split(this.#token).join("[REDACTED_CLOUDFLARE]") : value;
  }

  toJSON(): { configured: true } {
    return { configured: true };
  }
}

export type CloudflareResolvedConfig = {
  public: CloudflarePublicConfig;
  credentials: CloudflareCredentials | null;
};

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value == null || value.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function cloudflareEnabled(env: NodeJS.Dict<string> = process.env): boolean {
  return parseBoolean(env[CLOUDFLARE_ENABLED_ENV], false) || parseBoolean(env[CLOUDFLARE_LIVE_ENV], false);
}

export function loadCloudflareConfig(env: NodeJS.Dict<string> = process.env): CloudflareResolvedConfig {
  const enabled = cloudflareEnabled(env);
  const token = (env[CLOUDFLARE_API_TOKEN_ENV] ?? "").trim();
  const tokenConfigured = token.length >= 8;
  const accountId = (env[CLOUDFLARE_ACCOUNT_ID_ENV] ?? "").trim() || null;
  const configured = enabled && tokenConfigured;
  return {
    public: {
      enabled,
      tokenConfigured,
      accountIdConfigured: Boolean(accountId),
      timeoutMs: CLOUDFLARE_DEFAULT_TIMEOUT_MS,
      zoneId: (env[CLOUDFLARE_ZONE_ID_ENV] ?? "").trim() || null,
      probeZone: (env[CLOUDFLARE_PROBE_ZONE_ENV] ?? "").trim() || null,
      accountId,
    },
    credentials: configured ? new CloudflareCredentials(token) : null,
  };
}

export function serializeCloudflarePublicConfig(config: CloudflarePublicConfig): CloudflarePublicConfig {
  return { ...config };
}

/** Account API tokens verify at /accounts/{id}/tokens/verify. User tokens verify at /user/tokens/verify. */
export function cloudflareTokenVerifyPath(accountId: string | null): string {
  if (accountId) return `/accounts/${encodeURIComponent(accountId)}/tokens/verify`;
  return "/user/tokens/verify";
}

export type CloudflareRegistrarPublicConfig = {
  registrarTokenConfigured: boolean;
  generalTokenConfigured: boolean;
  tokensAreDistinct: boolean;
  accountIdConfigured: boolean;
  accountId: string | null;
  timeoutMs: number;
};

export type CloudflareRegistrarResolvedConfig = {
  public: CloudflareRegistrarPublicConfig;
  registrarCredentials: CloudflareCredentials | null;
  generalCredentials: CloudflareCredentials | null;
};

export function loadCloudflareRegistrarConfig(env: NodeJS.Dict<string> = process.env): CloudflareRegistrarResolvedConfig {
  const registrarToken = (env[CLOUDFLARE_REGISTRAR_API_TOKEN_ENV] ?? "").trim();
  const generalToken = (env[CLOUDFLARE_API_TOKEN_ENV] ?? "").trim();
  const accountId = (env[CLOUDFLARE_ACCOUNT_ID_ENV] ?? "").trim() || null;
  const registrarConfigured = registrarToken.length >= 8;
  return {
    public: {
      registrarTokenConfigured: registrarConfigured,
      generalTokenConfigured: generalToken.length >= 8,
      tokensAreDistinct: registrarConfigured && generalToken.length >= 8 && registrarToken !== generalToken,
      accountIdConfigured: Boolean(accountId),
      accountId,
      timeoutMs: CLOUDFLARE_DEFAULT_TIMEOUT_MS,
    },
    registrarCredentials: registrarConfigured ? new CloudflareCredentials(registrarToken) : null,
    generalCredentials: generalToken.length >= 8 ? new CloudflareCredentials(generalToken) : null,
  };
}
