import type {
  InventoryState,
  ProspectEventType,
  ProspectIntelligenceConsumer,
  ProspectWorkflowStage,
  ResolutionDecision,
} from "./contract";

export type Freshness = {
  first_seen_at: string;
  last_seen_at: string;
  last_verified_at: string | null;
  refresh_after: string | null;
  source_id: string;
  confidence: number;
  status: "CURRENT" | "STALE" | "UNKNOWN";
};

export type SourceRecord = {
  source_id: string;
  source_type: string;
  name: string;
  jurisdiction: string | null;
  base_url: string | null;
  acquisition_method: string;
  usage_policy: string;
  licensing_notes: string;
  data_categories: string[];
  refresh_cadence: string;
  reliability: number;
  enabled: boolean;
  last_success: string | null;
  last_failure: string | null;
  health: "HEALTHY" | "DEGRADED" | "FAILED" | "RATE_LIMITED" | "AUTH_REQUIRED" | "BLOCKED" | "DISABLED" | "UNKNOWN";
};

export type Observation = {
  observation_id: string;
  source_id: string;
  observed_at: string;
  entity_hint: string | null;
  field: string;
  raw_value: unknown;
  normalized_value: unknown;
  usage_restricted: boolean;
  superseded_by: string | null;
};

export type EntityKind =
  | "PERSON"
  | "ORGANIZATION"
  | "LOCATION"
  | "CONTACT_POINT"
  | "ROLE"
  | "DOMAIN"
  | "LICENSE"
  | "PERMIT"
  | "PROPERTY"
  | "TECHNOLOGY";

export type Entity = {
  entity_id: string;
  kind: EntityKind;
  canonical: true;
  venture_id?: never;
  identifiers: EntityIdentifier[];
  freshness: Freshness;
  merge_history: string[];
};

export type EntityIdentifier = {
  identifier_id: string;
  entity_id: string;
  scheme: string;
  value: string;
  source_id: string;
};

export type PersonRecord = {
  person_id: string;
  entity_id: string;
  display_name: string;
  given_name: string | null;
  family_name: string | null;
  freshness: Freshness;
};

export type OrganizationRecord = {
  organization_id: string;
  entity_id: string;
  legal_name: string;
  trade_name: string | null;
  industry: string | null;
  employee_range: string | null;
  freshness: Freshness;
};

export type EntityRelationship = {
  relationship_id: string;
  from_entity_id: string;
  to_entity_id: string;
  type:
    | "WORKS_AT"
    | "OWNS_OR_CONTROLS"
    | "HAS_ROLE"
    | "HAS_CONTACT"
    | "LOCATED_AT"
    | "OPERATES_AT"
    | "HAS_DOMAIN"
    | "HAS_LICENSE"
    | "HAS_PERMIT"
    | "USES_TECH"
    | "RELATED_TO"
    | "HAS_DECISION_MAKER";
  evidence_ids: string[];
  freshness: Freshness;
};

export type DerivedAttribute = {
  attribute_id: string;
  entity_id: string;
  name: string;
  value: unknown;
  inference: true;
  evidence_ids: string[];
  confidence: number;
  freshness: Freshness;
};

export type ProspectVentureMatch = {
  match_id: string;
  prospect_entity_id: string;
  venture_id: string;
  fit_score: number;
  fit_band: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  fit_reasons: string[];
  disqualifiers: string[];
  evidence_ids: string[];
  confidence: number;
  evaluated_at: string;
  next_evaluation_at: string | null;
};

export type VentureMatchRule = {
  rule_id: string;
  venture_id: string;
  icp: {
    industries: string[];
    roles: string[];
    geographies: string[];
    disqualifiers: string[];
  };
  updated_at: string;
};

export type CommunicationEligibility = {
  eligibility_id: string;
  entity_id: string;
  channel: "EMAIL" | "PHONE" | "SMS" | "UNKNOWN";
  status:
    | "email_allowed"
    | "phone_allowed"
    | "sms_allowed"
    | "unknown"
    | "suppressed"
    | "manual_block"
    | "opted_out"
    | "do_not_contact"
    | "invalid_contact"
    | "bounced"
    | "complaint"
    | "legal_or_policy_restriction";
  reason: string;
  updated_at: string;
};

export type SuppressionRecord = {
  suppression_id: string;
  entity_id: string;
  reason: string;
  kind:
    | "not_relevant"
    | "wrong_person"
    | "wrong_role"
    | "wrong_company"
    | "company_closed"
    | "already_customer"
    | "declined_venture"
    | "bad_contact"
    | "do_not_contact"
    | "duplicate"
    | "temporarily_unavailable"
    | "recycle_after_date";
  recycle_after: string | null;
  created_at: string;
};

export type ProspectOutcome = {
  outcome_id: string;
  entity_id: string;
  venture_id: string;
  kind:
    | "sent"
    | "delivered"
    | "bounced"
    | "opened"
    | "replied"
    | "positive_reply"
    | "negative_reply"
    | "meeting_booked"
    | "meeting_completed"
    | "qualified"
    | "disqualified"
    | "proposal_sent"
    | "won"
    | "lost"
    | "customer"
    | "unsubscribe"
    | "complaint"
    | "wrong_person"
    | "wrong_company"
    | "company_closed"
    | "contact_changed";
  at: string;
  evidence: string;
};

export type OutreachHistory = {
  outreach_id: string;
  entity_id: string;
  venture_id: string;
  channel: "EMAIL" | "PHONE" | "SMS";
  idempotency_key: string;
  scheduled_follow_up_at: string | null;
  sent_at: string | null;
  status: "CREATED" | "SENT" | "SUPPRESSED" | "DUPLICATE_BLOCKED";
};

export type VentureInventory = {
  venture_id: string;
  target_ready_inventory: number;
  minimum_ready_inventory: number;
  current_ready_inventory: number;
  average_daily_consumption: number;
  coverage_days: number;
  enrichment_backlog: number;
  refresh_health: "HEALTHY" | "STALE" | "LOW";
  states: Record<InventoryState, number>;
};

export type PersonIntelligenceProfile = {
  identity: PersonRecord;
  organizations: OrganizationRecord[];
  roles: string[];
  locations: string[];
  contact_points: string[];
  observed_facts: Observation[];
  derived_attributes: DerivedAttribute[];
  business_signals: string[];
  need_signals: string[];
  venture_matches: ProspectVentureMatch[];
  communication_eligibility: CommunicationEligibility[];
  suppression: SuppressionRecord[];
  outcomes: ProspectOutcome[];
  confidence: number;
  freshness: Freshness;
};

export type ProspectIntelligenceBrief = {
  identity: string;
  organization: string | null;
  role: string | null;
  location: string | null;
  business_context: string;
  key_signals: string[];
  venture_matches: Array<{ venture_id: string; fit_band: string; reasons: string[] }>;
  source_backed_reasons: string[];
  freshness: Freshness;
  contact_eligibility: string[];
  internal_only: true;
};

export type ProspectAccessRequest = {
  consumer: ProspectIntelligenceConsumer;
  write?: boolean;
};

export type ProspectCycleSnapshot = {
  workflow_stage: ProspectWorkflowStage;
  activity: "IDLE" | "MONITORING" | "ACTIVE";
  known_people: number;
  known_organizations: number;
  verified_contact_points: number;
  new_entities_today: number;
  updated_entities_today: number;
  entities_resolved: number;
  enrichment_backlog: number;
  identity_conflicts: number;
  freshness_coverage: number;
  source_health: "HEALTHY" | "DEGRADED" | "FAILED" | "UNKNOWN";
  venture_matches: number;
  ready_prospects: number;
  outbound_coverage_days: number;
  published_to_sales: number;
  sources_enabled: number;
  sources_healthy: number;
  sources_degraded: number;
  discovery_jobs: number;
  refresh_jobs: number;
  enrichment_jobs: number;
  duplicates_resolved: number;
  ambiguous_records: number;
  records_seen: number;
  events: ProspectEventType[];
  generic_activity: string;
};

export type ResolutionResult = {
  decision: ResolutionDecision;
  left_entity_id: string;
  right_entity_id: string;
  confidence: number;
  evidence: string[];
  merged_entity_id?: string;
};

export type NamedProspectGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};
