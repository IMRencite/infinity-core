/** Commercialization provider credential env keys — never log values */

export const NAMECHEAP_API_USER_ENV = "NAMECHEAP_API_USER";
export const NAMECHEAP_API_KEY_ENV = "NAMECHEAP_API_KEY";
export const NAMECHEAP_CLIENT_IP_ENV = "NAMECHEAP_CLIENT_IP";
export const NAMECHEAP_LIVE_ENV = "NAMECHEAP_LIVE_ENABLED";

export const CLOUDFLARE_API_TOKEN_ENV = "CLOUDFLARE_API_TOKEN";
export const CLOUDFLARE_ZONE_ID_ENV = "CLOUDFLARE_ZONE_ID";
export const CLOUDFLARE_PROBE_ZONE_ENV = "CLOUDFLARE_PROBE_ZONE";
export const CLOUDFLARE_LIVE_ENV = "CLOUDFLARE_LIVE_ENABLED";

export const STRIPE_SECRET_KEY_ENV = "STRIPE_SECRET_KEY";
export const STRIPE_WEBHOOK_SECRET_ENV = "STRIPE_WEBHOOK_SECRET";
export const STRIPE_LIVE_ENV = "STRIPE_LIVE_ENABLED";

export {
  VERCEL_TOKEN_ENV,
  VERCEL_TEAM_ID_ENV,
  VERCEL_LIVE_ENV,
} from "@/lib/infinity/launch-gateway/provider-config";

export type CredentialPresence = "CONFIGURED" | "MISSING" | "INVALID";

export function credentialPresence(envKey: string, minLength = 8): CredentialPresence {
  const value = process.env[envKey]?.trim();
  if (!value) return "MISSING";
  if (value.length < minLength) return "INVALID";
  return "CONFIGURED";
}

export function envFlagConfigured(envKey: string): CredentialPresence {
  const raw = process.env[envKey];
  if (!raw) return "MISSING";
  return raw === "true" || raw === "1" ? "CONFIGURED" : "MISSING";
}
