export const EXECUTIVE_EVALUATE_CAPABILITY_KEY = "executive.evaluate_opportunity";

export const EXECUTIVE_ENGINE_NAME = "executive_engine";

export const DEFAULT_REASONING_VERSION = "rule_based_v1";

export const DEFAULT_EXECUTIVE_POLICY_VERSION = "executive_policy_v1";

export const COMMAND_DECISION_REQUEST_EXECUTIVE = "request_executive_evaluation";

export const COMMAND_DECISION_OUTCOME_EXECUTIVE = "run_executive_evaluation";

export const EXECUTIVE_DECISION_DB_VALUES = [
  "approve",
  "defer",
  "reject",
  "queue",
  "research_more",
] as const;

export type ExecutiveDecisionDb = (typeof EXECUTIVE_DECISION_DB_VALUES)[number];

export function executiveDecisionToDb(
  decision: "APPROVE" | "DEFER" | "REJECT" | "QUEUE" | "RESEARCH_MORE",
): ExecutiveDecisionDb {
  return decision.toLowerCase() as ExecutiveDecisionDb;
}

export function isExecutivePlanningEligibleDecision(
  decision: ExecutiveDecisionDb,
): boolean {
  return decision === "approve" || decision === "queue";
}

export function buildExecutiveDedupKey(input: {
  opportunityId: string;
  validationRunId: string;
  reasoningVersion: string;
  policyVersion: string;
}): string {
  return [
    "executive",
    input.opportunityId,
    "validation_run",
    input.validationRunId,
    "reasoning",
    input.reasoningVersion,
    "policy",
    input.policyVersion,
  ].join(":");
}
