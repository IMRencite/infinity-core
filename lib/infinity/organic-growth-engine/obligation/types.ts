export const ORGANIC_WORK_STATES = [
  "SELECTED",
  "SCHEDULED",
  "CLAIMED",
  "PUBLISHED",
  "VERIFIED",
  "DO_NOT_PUBLISH",
  "CANCELLED",
  "SUPERSEDED",
  "ESCALATED",
] as const;
export type OrganicWorkState = (typeof ORGANIC_WORK_STATES)[number];

export const ORGANIC_TERMINAL_STATES: OrganicWorkState[] = [
  "VERIFIED",
  "DO_NOT_PUBLISH",
  "CANCELLED",
  "SUPERSEDED",
];

export const ORGANIC_DECISIONS = [
  "NEW_PAGE",
  "EXPAND_EXISTING",
  "REFRESH_EXISTING",
  "MERGE",
  "NO_ACTION",
  "DO_NOT_PUBLISH",
] as const;
export type OrganicContentDecision = (typeof ORGANIC_DECISIONS)[number];

export const ORGANIC_FAILURE_CLASSES = [
  "TECHNICAL_RETRYABLE",
  "SEMANTIC_QUALITY_RETRYABLE",
  "EVIDENCE_INSUFFICIENT",
  "RENDER_RETRYABLE",
  "SCHEMA_RETRYABLE",
  "PUBLISH_RETRYABLE",
  "POST_PUBLISH_VERIFICATION_FAILURE",
  "NON_RETRYABLE_POLICY_FAILURE",
] as const;
export type OrganicFailureClass = (typeof ORGANIC_FAILURE_CLASSES)[number];

export type OrganicWorkObligation = {
  obligation_id: string;
  venture_id: string;
  opportunity_id: string;
  state: OrganicWorkState;
  version: number;
  owner: string | null;
  due_at: string | null;
  next_action_at: string | null;
  decision: OrganicContentDecision;
  decision_reason: string;
  asset_type: string;
  title: string;
  route: string;
  created_at: string;
  updated_at: string;
};

export type OrganicWorkAttempt = {
  attempt_id: string;
  obligation_id: string;
  attempt_no: number;
  strategy_id: string;
  started_at: string;
  completed_at: string | null;
  outcome: "PASS" | "FAIL" | "RUNNING";
  failure_class: OrganicFailureClass | null;
  failure_reason: string | null;
  actor: string;
};

export type OrganicTransitionLog = {
  obligation_id: string;
  from_state: OrganicWorkState | "NONE";
  to_state: OrganicWorkState;
  expected_version: number;
  new_version: number;
  actor: string;
  reason: string;
  evidence_ref: string | null;
  timestamp: string;
};

export type OrganicContentOpportunity = {
  opportunity_id: string;
  venture_id: string;
  topic: string;
  question: string;
  search_intent: string;
  customer_problem: string;
  source_signals: string[];
  voc_signals: string[];
  sales_signals: string[];
  search_signals: string[];
  existing_page_matches: string[];
  candidate_asset_type: string;
  business_value: number;
  search_value: number;
  geo_value: number;
  link_value: number;
  conversion_value: number;
  freshness_value: number;
  evidence_availability: number;
  cannibalization_risk: number;
  priority_score: number;
  decision: OrganicContentDecision;
  decision_reason: string;
  created_at: string;
  updated_at: string;
};
