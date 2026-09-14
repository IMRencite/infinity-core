export const CAPABILITY_SOURCE_REGISTRY = "CapabilitySourceRegistry" as const;
export const CANONICAL_CAPABILITY_PROJECTION = "CanonicalCapabilityProjection" as const;

export const CAPABILITY_IDS = [
  "CODING",
  "DOMAIN_REGISTRAR",
  "DNS",
  "HOSTING",
  "PAYMENTS",
  "TREASURY",
  "EMAIL",
  "DEPLOYMENT",
  "DATABASE",
  "AUTH",
  "ANALYTICS",
  "GROWTH",
  "CREATIVE_MEDIA",
  "FULFILLMENT",
  "PERFORMANCE_LEARNING",
] as const;
export type CapabilityId = (typeof CAPABILITY_IDS)[number];

export const CAPABILITY_SCOPES = [
  "PORTFOLIO",
  "PARENT_IMR",
  "INFINITY_RUNTIME",
  "HQ",
  "VENTURE",
  "PROJECT",
  "DEPLOYMENT",
] as const;
export type CapabilityScope = (typeof CAPABILITY_SCOPES)[number];

export const CAPABILITY_VALUES = [
  "READY",
  "CONNECTED",
  "CONFIGURED",
  "AVAILABLE",
  "ACTIVE",
  "PRESENT_IDLE",
  "LIVE",
  "KNOWN_EXTERNAL",
  "CONFIGURED_EXTERNAL",
  "NOT_CONFIGURED",
  "NOT_CONNECTED",
  "NOT_AVAILABLE",
  "UNKNOWN",
  "STALE",
  "VERIFICATION_REQUIRED",
  "DEGRADED",
  "FAILED",
  "BLOCKED",
] as const;
export type CapabilityValue = (typeof CAPABILITY_VALUES)[number];

export type CapabilityRecord = {
  capability_id: CapabilityId;
  capability_type: CapabilityId;
  provider: string | null;
  provider_account_reference: string | null;
  scope: CapabilityScope;
  value: CapabilityValue;
  configured: boolean | null;
  connected: boolean | null;
  available: boolean;
  read_capability: boolean;
  write_capability: boolean;
  mutation_authority: "LOCKED" | "GOVERNED" | "NOT_CONNECTED" | "UNKNOWN";
  verification_status: "VERIFIED" | "UNVERIFIED" | "STALE" | "UNKNOWN";
  verification_source: string;
  last_verified_at: string | null;
  staleness_threshold_ms: number;
  freshness: "CURRENT" | "STALE" | "UNKNOWN";
  error_state: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type CanonicalCapabilityProjection = {
  contract: typeof CANONICAL_CAPABILITY_PROJECTION;
  generated_at: string;
  capabilities: CapabilityRecord[];
};

export type CodingCapabilityProjection = {
  native_coder: {
    value: "READY" | "AVAILABLE" | "FAILED";
    source: string;
  };
  external_implementation_agent: {
    value: "ACTIVE" | "PRESENT_IDLE" | "AVAILABLE";
    source: string;
    last_activity_at: string | null;
  };
  connector_status: "NOT_CONNECTED" | "CONNECTED";
  current_coding_runs: number;
};

export type CanonicalSelectedVenture = {
  venture_id: string | null;
  venture_name: string;
  scope: "VENTURE" | "PORTFOLIO" | "NONE_SELECTED";
  rejected_harness_label: boolean;
};
