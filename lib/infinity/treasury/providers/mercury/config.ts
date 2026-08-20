import {
  MERCURY_PRODUCTION_BASE_URL,
  MERCURY_SANDBOX_BASE_URL,
  type ProviderEnvironment,
  type ProviderHealth,
} from "../../constants";

export const MERCURY_DEFAULT_TIMEOUT_MS = 15_000;
export const MERCURY_MAX_TRANSACTION_PAGES = 20;
export const MERCURY_TRANSACTION_PAGE_LIMIT = 100;
export const MERCURY_MAX_TRANSACTIONS = 2_000;

export type MercuryProviderMode = ProviderEnvironment;

export type MercuryPublicConfig = {
  enabled: boolean;
  mode: MercuryProviderMode;
  baseUrl: string;
  tokenConfigured: boolean;
  health: Extract<ProviderHealth, "NOT_CONFIGURED" | "CONFIGURED">;
  timeoutMs: number;
};

export class MercuryCredentials {
  readonly #token: string;

  constructor(token: string) {
    this.#token = token;
  }

  authorizationHeader(): string {
    return `Bearer ${this.#token}`;
  }

  matches(value: string): boolean {
    return Boolean(this.#token) && value.includes(this.#token);
  }

  redact(value: string): string {
    if (!this.#token) return value;
    return value.split(this.#token).join("[REDACTED_MERCURY_TOKEN]");
  }

  toJSON(): { configured: true } {
    return { configured: true };
  }
}

export type MercuryResolvedConfig = {
  public: MercuryPublicConfig;
  credentials: MercuryCredentials | null;
};

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value == null || value.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseMode(value: string | undefined, enabled: boolean): MercuryProviderMode {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!enabled || normalized === "disabled" || normalized === "") return "DISABLED";
  if (normalized === "production" || normalized === "prod" || normalized === "live") return "PRODUCTION";
  if (normalized === "sandbox") return "SANDBOX";
  return "DISABLED";
}

function expectedBaseUrl(mode: MercuryProviderMode): string {
  if (mode === "PRODUCTION") return MERCURY_PRODUCTION_BASE_URL;
  return MERCURY_SANDBOX_BASE_URL;
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

export function resolveMercuryBaseUrl(mode: MercuryProviderMode, override?: string | null): string {
  const expected = expectedBaseUrl(mode);
  if (!override || !override.trim()) return expected;
  const normalized = normalizeBaseUrl(override.trim());
  const host = hostOf(normalized);
  const expectedHost = hostOf(expected);
  if (!host || !expectedHost) return expected;
  if (mode === "SANDBOX" && host !== "api-sandbox.mercury.com") return expected;
  if (mode === "PRODUCTION" && host !== "api.mercury.com") return expected;
  return normalized;
}

export function isMercurySandboxConfigured(env: NodeJS.Dict<string> = process.env): boolean {
  const resolved = loadMercuryConfig(env);
  return resolved.public.enabled && resolved.public.mode === "SANDBOX" && resolved.public.tokenConfigured;
}

export function loadMercuryPublicConfig(env: NodeJS.Dict<string> = process.env): MercuryPublicConfig {
  return loadMercuryConfig(env).public;
}

export function loadMercuryConfig(env: NodeJS.Dict<string> = process.env): MercuryResolvedConfig {
  const enabled = parseBoolean(env.MERCURY_ENABLED, false);
  const mode = parseMode(env.MERCURY_ENV, enabled);
  const token = typeof env.MERCURY_API_TOKEN === "string" ? env.MERCURY_API_TOKEN.trim() : "";
  const tokenConfigured = token.length > 0;
  const baseUrl = mode === "DISABLED" ? MERCURY_SANDBOX_BASE_URL : resolveMercuryBaseUrl(mode, env.MERCURY_BASE_URL);
  const configured = enabled && mode !== "DISABLED" && tokenConfigured;
  const publicConfig: MercuryPublicConfig = {
    enabled,
    mode,
    baseUrl,
    tokenConfigured: configured,
    health: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    timeoutMs: MERCURY_DEFAULT_TIMEOUT_MS,
  };
  return {
    public: publicConfig,
    credentials: configured ? new MercuryCredentials(token) : null,
  };
}

export function serializeMercuryPublicConfig(config: MercuryPublicConfig): MercuryPublicConfig {
  return {
    enabled: config.enabled,
    mode: config.mode,
    baseUrl: config.baseUrl,
    tokenConfigured: config.tokenConfigured,
    health: config.health,
    timeoutMs: config.timeoutMs,
  };
}
