export const FAILED_ATTEMPTS_ARE_HISTORY = "FAILED ATTEMPTS ARE HISTORY." as const;
export const UNRESOLVED_FAILURES_ARE_CURRENT_STATE = "UNRESOLVED FAILURES ARE CURRENT STATE." as const;
export const REPAIRED_RERUN_FAILURES_ARE_SUPERSEDED =
  "REPAIRED + SUCCESSFULLY RERUN FAILURES BECOME SUPERSEDED HISTORY." as const;
export const CURRENT_HEALTH_FOLLOWS_LATEST_VALID =
  "CURRENT SYSTEM HEALTH MUST FOLLOW THE LATEST VALID RELEVANT VERIFICATION." as const;

export const EXECUTION_ATTEMPT_CONTRACT = "ExecutionAttemptContract" as const;
export const SUPERSEDED_EXECUTION_ATTEMPT_CONTRACT = "SupersededExecutionAttemptContract" as const;
export const SUPERSEDED_EXECUTION_ATTEMPT_GATE = "SupersededExecutionAttemptGate" as const;
export const CURRENT_EXECUTION_RESULT_PROJECTION = "CurrentExecutionResultProjection" as const;
export const CURRENT_MILESTONE_HEALTH_GATE = "CurrentMilestoneHealthGate" as const;
export const STALE_FAILURE_PROJECTION_GATE = "StaleFailureProjectionGate" as const;
export const EXECUTION_RESULT_LINEAGE_GATE = "ExecutionResultLineageGate" as const;

export const ATTEMPT_RESULTS = ["RUNNING", "PASS", "FAIL", "BLOCKED", "CANCELLED", "SUPERSEDED"] as const;
export type AttemptResult = (typeof ATTEMPT_RESULTS)[number];

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type ExecutionAttemptRecord = {
  contract: typeof EXECUTION_ATTEMPT_CONTRACT;
  attempt_id: string;
  mission_id: string;
  step_id: string;
  started_at: string;
  completed_at: string | null;
  execution_context_id: string;
  input_version: string;
  result: AttemptResult;
  failure_class: string | null;
  failure_reason: string | null;
  repair_reference: string | null;
  superseded_by: string | null;
  is_current: boolean;
  is_final: boolean;
  evidence: string[];
};

export type MilestoneRunHistory = {
  mission_id: string;
  current: ExecutionAttemptRecord | null;
  history: ExecutionAttemptRecord[];
  current_result: AttemptResult | "NONE";
  current_headline: string;
  superseded_count: number;
  unresolved_failures: number;
};
