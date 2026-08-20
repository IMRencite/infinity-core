export const PROVIDER_CAPABILITY_STATUSES = [
  "NOT_CONFIGURED",
  "PARTIALLY_CONFIGURED",
  "CONFIGURED_UNVERIFIED",
  "READ_ONLY_VERIFIED",
  "DEGRADED",
  "UNAVAILABLE",
  "FAILED",
  "WRITE_CAPABLE_NOT_AUTHORIZED",
] as const;
export type ProviderCapabilityStatus = (typeof PROVIDER_CAPABILITY_STATUSES)[number];

export const PROVIDER_FRESHNESS = ["VERIFIED_FRESH", "VERIFIED_STALE", "NOT_VERIFIED"] as const;
export type ProviderVerificationFreshness = (typeof PROVIDER_FRESHNESS)[number];

export const PROVIDER_FAILURE_CODES = [
  "NOT_CONFIGURED",
  "AUTH_FAILED",
  "PERMISSION_DENIED",
  "RATE_LIMITED",
  "NETWORK_ERROR",
  "PROVIDER_ERROR",
  "UNSUPPORTED_CAPABILITY",
  "READ_ONLY_MUTATION_BLOCKED",
  "INVALID_RESPONSE",
] as const;
export type ProviderProbeFailureCode = (typeof PROVIDER_FAILURE_CODES)[number];

export const VERIFICATION_FRESH_MS = 24 * 60 * 60 * 1000;

export function freshnessFromCompletedAt(completedAt: string | null, now = Date.now()): ProviderVerificationFreshness {
  if (!completedAt) return "NOT_VERIFIED";
  const at = Date.parse(completedAt);
  if (!Number.isFinite(at)) return "NOT_VERIFIED";
  return now - at <= VERIFICATION_FRESH_MS ? "VERIFIED_FRESH" : "VERIFIED_STALE";
}

export type CommercialProviderVerification = {
  id: string;
  organizationId: string;
  providerCategory: "REGISTRAR" | "DNS" | "HOSTING" | "PAYMENTS";
  providerKey: string;
  environment: "TEST" | "LIVE" | "SANDBOX" | "UNKNOWN";
  mode: "READ_ONLY";
  status: ProviderCapabilityStatus;
  capabilitiesChecked: string[];
  startedAt: string;
  completedAt: string;
  freshness: ProviderVerificationFreshness;
  failureCode: ProviderProbeFailureCode | null;
  failureReason: string | null;
  metadata: Record<string, string | number | boolean | null>;
  mutationAuthority: "LOCKED";
};

export function classifyHttpFailure(status: number): ProviderProbeFailureCode {
  if (status === 401) return "AUTH_FAILED";
  if (status === 403) return "PERMISSION_DENIED";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_ERROR";
  return "PROVIDER_ERROR";
}
