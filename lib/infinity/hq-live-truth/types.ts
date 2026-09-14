export const LIVE_HQ_DATUM_CONTRACT = "LiveHQDatumContract" as const;
export const CANONICAL_HQ_LIVE_PROJECTION = "CanonicalHQLiveProjection" as const;

export const HQ_LIVE_OPERATIONAL_TRUTH_RULE =
  "ALL MATERIAL OPERATIONAL DATA ON HQ MUST BE ACTIVE, CURRENT, CANONICAL, AND FRESHNESS-AWARE. HQ MUST NOT PRESENT STATIC OPERATIONAL SNAPSHOTS AS CURRENT TRUTH. HQ IS A LIVE PROJECTION, NOT A SECOND DATABASE." as const;

export const HQ_DATUM_FRESHNESS_STATES = [
  "LIVE",
  "CURRENT_CANONICAL",
  "STALE",
  "UNKNOWN",
  "VERIFICATION_REQUIRED",
  "RECONNECTING",
] as const;
export type HqDatumFreshnessState = (typeof HQ_DATUM_FRESHNESS_STATES)[number];

export const HQ_DATUM_SOURCE_KINDS = [
  "LIVE_PROVIDER",
  "CANONICAL_PERSISTED",
  "CURRENT_RUNTIME",
  "CURRENT_VENTURE",
  "CURRENT_ECONOMIC",
  "CURRENT_TREASURY",
  "CURRENT_WORK",
  "QC_STATE",
] as const;
export type HqDatumSourceKind = (typeof HQ_DATUM_SOURCE_KINDS)[number];

export type LiveHQDatum = {
  contract: typeof LIVE_HQ_DATUM_CONTRACT;
  datum_id: string;
  category: string;
  value: string | number | boolean | null;
  scope: string;
  source: string;
  source_kind: HqDatumSourceKind;
  verification_status: "VERIFIED" | "UNVERIFIED" | "STALE" | "UNKNOWN";
  last_verified_at: string | null;
  last_changed_at: string | null;
  freshness_state: HqDatumFreshnessState;
  staleness_threshold_ms: number;
  confidence: number | null;
  error_state: string | null;
  canonical_reference: string;
};

export type CanonicalHQLiveProjection = {
  contract: typeof CANONICAL_HQ_LIVE_PROJECTION;
  generated_at: string;
  connection_status: HqDatumFreshnessState;
  datums: LiveHQDatum[];
};
