import { CLOUDFLARE_ACCOUNT_ID_ENV, CLOUDFLARE_API_TOKEN_ENV, CLOUDFLARE_ENABLED_ENV, CLOUDFLARE_LIVE_ENV, CLOUDFLARE_PROBE_ZONE_ENV, CLOUDFLARE_ZONE_ID_ENV } from "../config";

export const CLOUDFLARE_API_BASE_URL = "https://api.cloudflare.com/client/v4";
export const CLOUDFLARE_DEFAULT_TIMEOUT_MS = 15_000;
export const CLOUDFLARE_PAGE_SIZE = 50;
export const CLOUDFLARE_MAX_PAGES = 5;
export const CLOUDFLARE_RECORD_DETAIL_CAP = 5;

export type CloudflareTokenScope = "TOKEN_SCOPE_MINIMAL" | "TOKEN_SCOPE_BROADER_THAN_REQUIRED" | "UNKNOWN";

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
