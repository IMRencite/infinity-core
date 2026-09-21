export const PROSPECT_SOURCE_TYPES = [
  "PUBLIC_GOVERNMENT",
  "BUSINESS_REGISTRY",
  "PROFESSIONAL_LICENSE",
  "PUBLIC_PERMIT",
  "PUBLIC_PROCUREMENT",
  "COMPANY_WEBSITE",
  "PUBLIC_BUSINESS_DIRECTORY",
  "PUBLIC_PROFESSIONAL_DIRECTORY",
  "PUBLIC_ORGANIZATION_DATA",
  "APPROVED_COMMERCIAL_PROVIDER",
  "INTERNAL_INFINITY",
  "OTHER_APPROVED",
] as const;
export type ProspectSourceType = (typeof PROSPECT_SOURCE_TYPES)[number];

export const SOURCE_HEALTH_STATUSES = [
  "HEALTHY",
  "DEGRADED",
  "RATE_LIMITED",
  "AUTH_REQUIRED",
  "BLOCKED",
  "DISABLED",
  "UNKNOWN",
] as const;
export type SourceHealthStatus = (typeof SOURCE_HEALTH_STATUSES)[number];

export type SourcePolicyStatus = "APPROVED" | "RESTRICTED" | "UNKNOWN" | "DISABLED";

export type SourcePolicy = {
  policy_status: SourcePolicyStatus;
  acquisition_allowed: boolean | "UNKNOWN_POLICY";
  commercial_use_allowed: boolean | "UNKNOWN_POLICY";
  redistribution_allowed: boolean | "UNKNOWN_POLICY";
  contact_data_use_allowed: boolean | "UNKNOWN_POLICY";
  refresh_allowed: boolean | "UNKNOWN_POLICY";
  rate_limit: { requests_per_minute: number; requests_per_hour: number; batch_limit: number };
  jurisdiction: string | null;
  terms_notes: string;
  license_notes: string;
  retention_notes: string;
};

export type SourceConnectorConfig = {
  enabled: boolean;
  priority: number;
  jurisdiction: string | null;
  industry_scope: string[];
  geography: {
    country?: string;
    region?: string;
    county?: string;
    city?: string;
    postal?: string;
    territory?: string;
  };
  refresh_cadence_ms: number;
  discovery_cadence_ms: number;
  rate_limit: SourcePolicy["rate_limit"];
  batch_size: number;
  live: boolean;
};

export type GeographyScope = SourceConnectorConfig["geography"];

export type DiscoveryRequest = {
  now: string;
  batch_size: number;
  cursor?: string | null;
  geography?: GeographyScope;
  industries?: string[];
};

export type RefreshRequest = {
  now: string;
  source_record_id: string;
  cursor?: string | null;
};

export type SourceHealth = {
  status: SourceHealthStatus;
  detail: string;
};

export type DiscoveredRecord = {
  source_record_id: string;
  source_url: string | null;
  raw_fields: Record<string, unknown>;
  entity_kind: "ORGANIZATION" | "PERSON";
};

export type DiscoveryResult = {
  records: DiscoveredRecord[];
  next_cursor: string | null;
  exhausted: boolean;
  schema_changed?: boolean;
};

export type RefreshResult = {
  record: DiscoveredRecord | null;
  changed_fields: string[];
  schema_changed?: boolean;
};

export type ProspectSourceConnector = {
  id: string;
  sourceType: ProspectSourceType;
  discover(input: DiscoveryRequest): Promise<DiscoveryResult>;
  refresh(input: RefreshRequest): Promise<RefreshResult>;
  health(): Promise<SourceHealth>;
};

export type SourceHealthRecord = {
  source_id: string;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  records_seen: number;
  records_created: number;
  records_updated: number;
  duplicates_resolved: number;
  ambiguous_records: number;
  duplicate_rate: number;
  error_rate: number;
  latency_ms: number;
  health_status: SourceHealthStatus;
  last_error: string | null;
};

export type AcquisitionCursor = {
  source_id: string;
  scope: string;
  cursor: string | null;
  last_completed_at: string | null;
  last_record_seen: string | null;
  next_due_at: string | null;
  status: "DUE" | "IN_PROGRESS" | "COMPLETE" | "BACKOFF";
};

export type ProspectAcquisitionPlan = {
  id: string;
  sourceIds: string[];
  geography: GeographyScope;
  industries: string[];
  ventureDemandSignals: string[];
  mode: "DISCOVERY" | "REFRESH";
  priority: number;
  targetBatchSize: number;
  scheduledAt: string;
};

export type EnrichmentJob = {
  job_id: string;
  entity_id: string;
  reason: string;
  priority: number;
  requested_at: string;
  completed_at: string | null;
};

export type RefreshJob = {
  job_id: string;
  entity_id: string;
  source_id: string;
  source_record_id: string | null;
  priority: number;
  requested_at: string;
  completed_at: string | null;
};

export type AcquisitionMetrics = {
  records_ingested: number;
  new_entities_created: number;
  existing_entities_updated: number;
  duplicates_resolved: number;
  ambiguous_records: number;
  manual_review_required: number;
  records_published_to_sales: number;
  source_failures: number;
};

export type SourceQualityMetrics = {
  source_id: string;
  venture_fit_yield: number;
  eligibility_yield: number;
  response_rate: number;
  meeting_rate: number;
  conversion_rate: number;
  revenue: number;
  duplicate_rate: number;
  stale_data_rate: number;
};

export type ProspectAcquisitionState = {
  health: Record<string, SourceHealthRecord>;
  cursors: Record<string, AcquisitionCursor>;
  plans: ProspectAcquisitionPlan[];
  enrichment_queue: EnrichmentJob[];
  refresh_queue: RefreshJob[];
  metrics: AcquisitionMetrics;
  source_quality: Record<string, SourceQualityMetrics>;
  last_tick_at: string | null;
  next_due_at: string | null;
};

export function emptyAcquisitionMetrics(): AcquisitionMetrics {
  return {
    records_ingested: 0,
    new_entities_created: 0,
    existing_entities_updated: 0,
    duplicates_resolved: 0,
    ambiguous_records: 0,
    manual_review_required: 0,
    records_published_to_sales: 0,
    source_failures: 0,
  };
}

export function emptyAcquisitionState(): ProspectAcquisitionState {
  return {
    health: {},
    cursors: {},
    plans: [],
    enrichment_queue: [],
    refresh_queue: [],
    metrics: emptyAcquisitionMetrics(),
    source_quality: {},
    last_tick_at: null,
    next_due_at: null,
  };
}

export function emptySourceHealth(sourceId: string): SourceHealthRecord {
  return {
    source_id: sourceId,
    last_attempt_at: null,
    last_success_at: null,
    last_failure_at: null,
    consecutive_failures: 0,
    records_seen: 0,
    records_created: 0,
    records_updated: 0,
    duplicates_resolved: 0,
    ambiguous_records: 0,
    duplicate_rate: 0,
    error_rate: 0,
    latency_ms: 0,
    health_status: "UNKNOWN",
    last_error: null,
  };
}
