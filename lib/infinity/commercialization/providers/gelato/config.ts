import {
  GELATO_API_KEY_SANDBOX_ENV,
  GELATO_LEGACY_API_KEY_ENV,
  GELATO_LIVE_API_KEY_ENV,
  GELATO_MODE_ENV,
} from "../config";

export const GELATO_PRODUCT_API_BASE = "https://product.gelatoapis.com";
export const GELATO_ORDER_API_BASE = "https://order.gelatoapis.com";
export const GELATO_SHIPMENT_API_BASE = "https://shipment.gelatoapis.com";
export const GELATO_DEFAULT_TIMEOUT_MS = 15_000;

export type GelatoEnvironment = "SANDBOX" | "LIVE" | "UNCONFIGURED";

export class GelatoCredentials {
  readonly #key: string;

  constructor(key: string) {
    this.#key = key;
  }

  headerValue(): string {
    return this.#key;
  }

  redact(value: string): string {
    return this.#key ? value.split(this.#key).join("[REDACTED_GELATO]") : value;
  }

  toJSON(): { configured: true } {
    return { configured: true };
  }
}

export type GelatoResolvedConfig = {
  environment: GelatoEnvironment;
  sandboxKeyConfigured: boolean;
  liveKeyConfigured: boolean;
  credentials: GelatoCredentials | null;
  timeoutMs: number;
};

function parseMode(value: string | undefined): "sandbox" | "live" | "unknown" {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "sandbox" || normalized === "test") return "sandbox";
  if (normalized === "live" || normalized === "production") return "live";
  return "unknown";
}

export function loadGelatoConfig(env: NodeJS.Dict<string> = process.env): GelatoResolvedConfig {
  const sandbox = (env[GELATO_API_KEY_SANDBOX_ENV] ?? env[GELATO_LEGACY_API_KEY_ENV] ?? "").trim();
  const live = (env[GELATO_LIVE_API_KEY_ENV] ?? "").trim();
  const mode = parseMode(env[GELATO_MODE_ENV]);
  const sandboxKeyConfigured = sandbox.length >= 8;
  const liveKeyConfigured = live.length >= 8;
  const useSandbox = sandboxKeyConfigured && mode !== "live";
  const liveActive = liveKeyConfigured && mode === "live";
  return {
    environment: useSandbox ? "SANDBOX" : liveActive ? "LIVE" : "UNCONFIGURED",
    sandboxKeyConfigured,
    liveKeyConfigured,
    credentials: useSandbox
      ? new GelatoCredentials(sandbox)
      : liveActive
        ? new GelatoCredentials(live)
        : null,
    timeoutMs: GELATO_DEFAULT_TIMEOUT_MS,
  };
}

export function assertGelatoLiveProduction(config: GelatoResolvedConfig = loadGelatoConfig()): void {
  if (config.environment !== "LIVE" || !config.credentials) {
    throw new Error("GELATO_LIVE_UNCONFIGURED");
  }
}

export function assertGelatoSandboxOnly(config: GelatoResolvedConfig = loadGelatoConfig()): void {
  if (config.liveKeyConfigured) {
    throw new Error("GELATO_LIVE_KEY_FORBIDDEN");
  }
  if (config.environment !== "SANDBOX" || !config.credentials) {
    throw new Error("GELATO_SANDBOX_UNCONFIGURED");
  }
}
