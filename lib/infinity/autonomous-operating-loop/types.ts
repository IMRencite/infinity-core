export const AUTONOMOUS_DAILY_OPERATING_LOOP = "AutonomousDailyOperatingLoop" as const;
export const AUTONOMOUS_NEXT_MISSION_RESOLVER = "AutonomousNextMissionResolver" as const;
export const AUTONOMOUS_DECISION_EXPLANATION = "AutonomousDecisionExplanation" as const;
export const AUTONOMOUS_LOOP_STATE_PATH = ".infinity/autonomous-operating-loop/state.json" as const;

export const AUTONOMOUS_LOOP_STATES = [
  "BOOTSTRAPPING",
  "OBSERVING",
  "DECIDING",
  "MISSION_ACTIVE",
  "WAITING_FOR_EVIDENCE",
  "WAITING_FOR_DEPENDENCY",
  "BLOCKED",
  "IDLE_NO_ACTION",
  "PAUSED",
  "DEGRADED",
] as const;
export type AutonomousLoopState = (typeof AUTONOMOUS_LOOP_STATES)[number];

export const AUTONOMOUS_DECISION_OUTCOMES = [
  "EXECUTE_ACTION",
  "CONTINUE_EXISTING_ACTION",
  "WAIT_FOR_EVIDENCE",
  "RESEARCH_REQUIRED",
  "REPAIR_REQUIRED",
  "NO_ACTION_JUSTIFIED",
  "BLOCKED_BY_POLICY",
  "BLOCKED_BY_CAPITAL",
  "BLOCKED_BY_PROVIDER",
  "BLOCKED_BY_QC",
] as const;
export type AutonomousDecisionOutcome = (typeof AUTONOMOUS_DECISION_OUTCOMES)[number];

export const AUTONOMOUS_FAILURE_CLASSES = [
  "TRANSIENT_FAILURE",
  "PERMANENT_FAILURE",
  "POLICY_BLOCK",
  "PROVIDER_FAILURE",
  "QC_FAILURE",
  "EVIDENCE_INSUFFICIENT",
] as const;
export type AutonomousFailureClass = (typeof AUTONOMOUS_FAILURE_CLASSES)[number];

export const CUSTOMER_REPLY_CLASSES = [
  "POSITIVE",
  "INTERESTED",
  "QUESTION",
  "OBJECTION",
  "NOT_INTERESTED",
  "UNSUBSCRIBE",
  "BOUNCE",
  "SPAM_RISK",
  "UNKNOWN",
] as const;
export type CustomerReplyClass = (typeof CUSTOMER_REPLY_CLASSES)[number];

export const OPERATING_PRIORITY = [
  "CUSTOMER_PAYMENT_FULFILLMENT_FAILURE",
  "PRODUCTION_SECURITY_QC_FAILURE",
  "ACTIVE_REVENUE_OPPORTUNITY",
  "EXISTING_GROWTH_CONTINUATION",
  "CUSTOMER_RESPONSE_FOLLOW_UP",
  "CONVERSION_BOTTLENECK",
  "EVIDENCE_SUPPORTED_PRODUCT_IMPROVEMENT",
  "ORGANIC_GROWTH",
  "EXPERIMENTATION",
  "RESEARCH_DISCOVERY",
  "NO_ACTION_WAIT",
] as const;
export type OperatingPriority = (typeof OPERATING_PRIORITY)[number];

export type AutonomousLoopEvent = {
  type: string;
  at: string;
  venture_id: string | null;
  reason: string;
};

export type RecommendedCommitment = {
  amount: number;
  category: string;
  reason: string;
  evidence: string[];
  expected_benefit: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  authority_available: number;
  created: false;
};

export type AutonomousDecision = {
  contract: typeof AUTONOMOUS_NEXT_MISSION_RESOLVER;
  outcome: AutonomousDecisionOutcome;
  selected_mission: string | null;
  reason: string;
  priority: OperatingPriority;
  expected_outcome: string;
  evidence: string[];
  venture_id: string | null;
  capability_required: string;
  financial_exposure: number;
  spend_required: number;
  commitment_required: number;
  authorization_class: "NONE" | "FOUNDER_DIRECT" | "POLICY" | "EAG";
  review_condition: string | null;
  fallback: AutonomousLoopState;
  alternatives_considered: string[];
  founder_approval_required: boolean;
  recommended_commitment: RecommendedCommitment | null;
  learning_applied: string[];
};

export type AutonomousDecisionExplanation = {
  contract: typeof AUTONOMOUS_DECISION_EXPLANATION;
  why_now: string;
  evidence: string[];
  priority_rationale: string;
  alternatives_considered: string[];
  why_selected: string;
  why_others_deferred: string[];
  financial_exposure: number;
  risk: string;
  expected_measurement: string;
};

export type VentureDailyReview = {
  venture_id: string;
  display_name: string;
  eligible: boolean;
  paused: boolean;
  healthy: boolean;
  growth_action_active: boolean;
  customer_response_pending: boolean;
  revenue_status: string;
  actual_costs: number;
  contribution: number | null;
  conversion_evidence: string;
  provider_health: string;
  fulfillment_health: string;
  capital_state: string;
  highest_value_next_action: string;
};

export type AutonomousLoopPersistedState = {
  contract: typeof AUTONOMOUS_DAILY_OPERATING_LOOP;
  portfolio_state: AutonomousLoopState;
  venture_states: Record<string, AutonomousLoopState>;
  last_decision: AutonomousDecision | null;
  last_explanation: AutonomousDecisionExplanation | null;
  last_mission_id: string | null;
  last_completed_mission_id: string | null;
  last_action_idempotency_key: string | null;
  last_external_action_key: string | null;
  last_action_at: string | null;
  last_action_kind: string | null;
  waiting_dependency: { kind: string; since: string; reason: string } | null;
  last_daily_review_at: string | null;
  next_daily_review_at: string | null;
  next_run_at: string | null;
  daily_reviews: VentureDailyReview[];
  pending_events: AutonomousLoopEvent[];
  consecutive_failures: number;
  same_decision_streak: number;
  learning: Array<{ at: string; class: string; changes_business_inference: boolean; next_behavior: string }>;
  decision_history: AutonomousDecision[];
  action_history: Array<{ at: string; kind: string; idempotency_key: string; result: string }>;
  mission_history: string[];
  updated_at: string;
};

export type AutonomousOperationsProjection = {
  contract: typeof AUTONOMOUS_DAILY_OPERATING_LOOP;
  loop_state: AutonomousLoopState;
  current_venture: string | null;
  current_mission: string | null;
  why_this_mission: string;
  priority: OperatingPriority | "NONE";
  expected_outcome: string;
  current_step: string;
  rooms: string[];
  agents: string[];
  financial_exposure: number;
  spend_required: number;
  commitment_required: number;
  last_completed_mission: string | null;
  next_review: string | null;
  waiting_condition: string | null;
  explanation: AutonomousDecisionExplanation | null;
  money_movement_enabled: false;
  autonomous_commitment_creation: false;
};
