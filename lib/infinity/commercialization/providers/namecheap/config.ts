import {
  NAMECHEAP_API_KEY_ENV,
  NAMECHEAP_API_USER_ENV,
  NAMECHEAP_CLIENT_IP_ENV,
  NAMECHEAP_ENABLED_ENV,
  NAMECHEAP_ENV_ENV,
  NAMECHEAP_LIVE_ENV,
  NAMECHEAP_USERNAME_ENV,
} from "../config";

export const NAMECHEAP_SANDBOX_BASE_URL = "https://api.sandbox.namecheap.com/xml.response";
export const NAMECHEAP_PRODUCTION_BASE_URL = "https://api.namecheap.com/xml.response";
export const NAMECHEAP_DEFAULT_TIMEOUT_MS = 15_000;
export const NAMECHEAP_PAGE_SIZE = 20;
export const NAMECHEAP_MAX_PAGES = 5;
export const NAMECHEAP_DETAIL_CAP = 5;

export const NAMECHEAP_READ_COMMANDS = [
  "namecheap.domains.getList",
  "namecheap.domains.getInfo",
  "namecheap.domains.check",
  "namecheap.domains.dns.getList",
] as const;

export const NAMECHEAP_WRITE_COMMANDS = [
  "namecheap.domains.create",
  "namecheap.domains.renew",
  "namecheap.domains.reactivate",
  "namecheap.domains.transfer.create",
  "namecheap.domains.setContacts",
  "namecheap.domains.ns.create",
  "namecheap.domains.ns.update",
  "namecheap.domains.ns.delete",
  "namecheap.domains.dns.setCustom",
  "namecheap.domains.dns.setDefault",
  "namecheap.domains.dns.setHosts",
] as const;

export type NamecheapMode = "SANDBOX" | "PRODUCTION" | "DISABLED";

export type NamecheapPublicConfig = {
  enabled: boolean;
  mode: NamecheapMode;
  baseUrl: string;
  credentialPresence: "YES" | "NO";
  clientIpConfigured: boolean;
  usernameConfigured: boolean;
  timeoutMs: number;
  clientIpWhitelistRequired: true;
};

export class NamecheapCredentials {
  readonly #apiUser: string;
  readonly #apiKey: string;
  readonly #userName: string;
  readonly #clientIp: string;

  constructor(input: { apiUser: string; apiKey: string; userName: string; clientIp: string }) {
    this.#apiUser = input.apiUser;
    this.#apiKey = input.apiKey;
    this.#userName = input.userName;
    this.#clientIp = input.clientIp;
  }

  toQuery(): { ApiUser: string; ApiKey: string; UserName: string; ClientIp: string } {
    return {
      ApiUser: this.#apiUser,
      ApiKey: this.#apiKey,
      UserName: this.#userName,
      ClientIp: this.#clientIp,
    };
  }

  redact(value: string): string {
    let out = value;
    for (const secret of [this.#apiKey, this.#apiUser, this.#userName, this.#clientIp]) {
      if (secret) out = out.split(secret).join("[REDACTED_NAMECHEAP]");
    }
    return out;
  }

  toJSON(): { configured: true } {
    return { configured: true };
  }
}

export type NamecheapResolvedConfig = {
  public: NamecheapPublicConfig;
  credentials: NamecheapCredentials | null;
};

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value == null || value.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseMode(env: NodeJS.Dict<string>, enabled: boolean): NamecheapMode {
  if (!enabled) return "DISABLED";
  const explicit = (env[NAMECHEAP_ENV_ENV] ?? "").trim().toLowerCase();
  if (explicit === "sandbox") return "SANDBOX";
  if (explicit === "production" || explicit === "prod" || explicit === "live") return "PRODUCTION";
  if (parseBoolean(env[NAMECHEAP_LIVE_ENV], false)) return "PRODUCTION";
  return "SANDBOX";
}

export function namecheapEnabled(env: NodeJS.Dict<string> = process.env): boolean {
  return parseBoolean(env[NAMECHEAP_ENABLED_ENV], false) || parseBoolean(env[NAMECHEAP_LIVE_ENV], false);
}

export function loadNamecheapConfig(env: NodeJS.Dict<string> = process.env): NamecheapResolvedConfig {
  const enabled = namecheapEnabled(env);
  const mode = parseMode(env, enabled);
  const apiUser = (env[NAMECHEAP_API_USER_ENV] ?? "").trim();
  const apiKey = (env[NAMECHEAP_API_KEY_ENV] ?? "").trim();
  const userName = (env[NAMECHEAP_USERNAME_ENV] ?? apiUser).trim();
  const clientIp = (env[NAMECHEAP_CLIENT_IP_ENV] ?? "").trim();
  const credentialsReady = apiUser.length >= 8 && apiKey.length >= 8 && clientIp.length >= 7;
  const configured = enabled && mode !== "DISABLED" && credentialsReady;
  return {
    public: {
      enabled,
      mode,
      baseUrl: mode === "PRODUCTION" ? NAMECHEAP_PRODUCTION_BASE_URL : NAMECHEAP_SANDBOX_BASE_URL,
      credentialPresence: credentialsReady ? "YES" : "NO",
      clientIpConfigured: clientIp.length >= 7,
      usernameConfigured: userName.length > 0,
      timeoutMs: NAMECHEAP_DEFAULT_TIMEOUT_MS,
      clientIpWhitelistRequired: true,
    },
    credentials: configured ? new NamecheapCredentials({ apiUser, apiKey, userName, clientIp }) : null,
  };
}

export function serializeNamecheapPublicConfig(config: NamecheapPublicConfig): NamecheapPublicConfig {
  return { ...config };
}
