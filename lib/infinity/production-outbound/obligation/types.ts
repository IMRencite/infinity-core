export const COMMUNICATION_OBLIGATION_STATES = [
  "RECEIVED",
  "SCHEDULED",
  "CLAIMED",
  "SENT",
  "CONFIRMED",
  "SUPPRESSED",
  "NO_REPLY_POLICY",
  "COVERED",
  "ESCALATED",
] as const;
export type CommunicationObligationState = (typeof COMMUNICATION_OBLIGATION_STATES)[number];

export const COMMUNICATION_TERMINAL_STATES: CommunicationObligationState[] = [
  "CONFIRMED",
  "SUPPRESSED",
  "NO_REPLY_POLICY",
  "COVERED",
];

export const COMMUNICATION_FAILURE_CLASSES = [
  "TECHNICAL_RETRYABLE",
  "SEMANTIC_RETRYABLE",
  "PROVIDER_UNCERTAIN",
  "SUPPRESSION_CHECK_ERROR",
  "POLICY_TERMINAL",
  "HUMAN_ESCALATION_REQUIRED",
] as const;
export type CommunicationFailureClass = (typeof COMMUNICATION_FAILURE_CLASSES)[number];

export type CommunicationObligationRole = "PROSPECT" | "INFINITY" | "SYSTEM" | "UNKNOWN" | "QUARANTINED_UNKNOWN";

export type CommunicationObligation = {
  obligation_id: string;
  mailbox_id: string;
  provider_message_id: string;
  thread_id: string;
  state: CommunicationObligationState;
  version: number;
  owner: string | null;
  due_at: string | null;
  next_action_at: string | null;
  next_action: string | null;
  received_at: string;
  role: CommunicationObligationRole;
  role_evidence: string;
  authorship_resolution: string;
  planner_intent: string | null;
  planner_version: string | null;
  conversation_stage: string | null;
  covered_by_outbound_id: string | null;
  terminal_reason: string | null;
  strategy_id: string | null;
  recovered: boolean;
  clean_eligible: boolean;
  recovery_reason_codes: string[];
  created_at: string;
  updated_at: string;
};

export type CommunicationAttemptStage =
  | "COMPOSING"
  | "COMPOSED"
  | "VALIDATED"
  | "SENDING"
  | "PROVIDER_ACCEPTED";

export type CommunicationAttempt = {
  attempt_id: string;
  obligation_id: string;
  attempt_no: number;
  strategy_id: string;
  strategy: string | null;
  planner_version: string;
  composer_version: string;
  stage: CommunicationAttemptStage;
  started_at: string;
  completed_at: string | null;
  outcome: "PASS" | "FAIL" | "RUNNING";
  failure_class: CommunicationFailureClass | null;
  failure_reason: string | null;
  provider_status: string | null;
  rfc_message_id: string | null;
  provider_message_id: string | null;
  body_hash: string | null;
  recovered: boolean;
  actor: string;
  deployment_id: string | null;
  created_at: string;
};

export type CommunicationOutboundLedger = {
  obligation_id: string;
  attempt_id: string;
  rfc_message_id: string;
  custom_header: string | null;
  thread_id: string;
  answered_inbound_provider_message_id?: string | null;
  path?: "LEGACY" | "OBLIGATION";
  body_hash: string;
  created_at: string;
  provider_message_id: string | null;
  accepted_at: string | null;
};

export type CommunicationTransitionLog = {
  obligation_id: string;
  from_state: CommunicationObligationState | "NONE";
  to_state: CommunicationObligationState;
  expected_version: number;
  new_version: number;
  actor: string;
  reason: string;
  evidence_ref: string | null;
  timestamp: string;
};
