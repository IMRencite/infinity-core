export const PLAN_EXECUTION_SCHEMA_VERSION = "plan_execution_v1";
export const PLAN_EXECUTION_POLICY_VERSION = "plan_execution_v1";
export const PLAN_EXECUTION_SCHEDULER_POLICY = "scheduler_v1";

export const PLAN_EXECUTION_STATUSES = [
  "requested",
  "awaiting_allocation",
  "allocation_approved",
  "scheduling",
  "running",
  "awaiting_review",
  "internally_complete",
  "blocked",
  "failed",
  "cancelled",
] as const;

export type PlanExecutionStatus = (typeof PLAN_EXECUTION_STATUSES)[number];

export const PLAN_EXECUTION_PHASES = [
  "requested",
  "allocation",
  "scheduling",
  "execution",
  "review",
  "complete",
] as const;

export type PlanExecutionPhase = (typeof PLAN_EXECUTION_PHASES)[number];

export const PLAN_STEP_ELIGIBILITY_BLOCKED_EXTERNAL = "blocked_external_capability_required";

export const PROHIBITED_EXTERNAL_CAPABILITY_PREFIXES = [
  "deploy.",
  "publish.",
  "domain.",
  "hosting.",
  "repository.",
  "shell.",
  "network.",
  "package.install",
  "browser.",
  "purchase.",
  "financial.",
] as const;

export const PLAN_EXECUTION_EVENTS = {
  requested: "plan_execution.requested",
  gated: "plan_execution.gated",
  blocked: "plan_execution.blocked",
  allocationRequested: "plan_execution.allocation_requested",
  allocationApproved: "plan_execution.allocation_approved",
  schedulingStarted: "plan_execution.scheduling_started",
  stepScheduled: "plan_execution.step_scheduled",
  stepStarted: "plan_execution.step_started",
  stepCompleted: "plan_execution.step_completed",
  stepFailed: "plan_execution.step_failed",
  stepBlocked: "plan_execution.step_blocked",
  reviewRequested: "plan_execution.review_requested",
  reviewCompleted: "plan_execution.review_completed",
  buildJobLinked: "plan_execution.build_job_linked",
  repairObserved: "plan_execution.repair_observed",
  repairExhausted: "plan_execution.repair_exhausted",
  executionQaRequested: "plan_execution.execution_qa_requested",
  executionQaCompleted: "plan_execution.execution_qa_completed",
  internallyCompleted: "plan_execution.internally_completed",
  executionReused: "plan_execution.execution_reused",
  cancelled: "plan_execution.cancelled",
} as const;

export const EXECUTION_QA_CAPABILITY = "qa.verify_autonomous_plan_execution";

export const DEFAULT_PLAN_EXECUTION_MAX_CONCURRENCY = 2;
