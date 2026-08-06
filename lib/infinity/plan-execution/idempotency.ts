export function planExecutionIdempotencyKey(input: {
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string;
  executiveDecisionId: string;
  planId: string;
  planVersion: number;
  executionPolicyVersion: string;
}): string {
  return [
    "plan_execution",
    input.organizationId,
    input.missionId,
    input.runtimeInstanceId,
    input.executiveDecisionId,
    input.planId,
    String(input.planVersion),
    input.executionPolicyVersion,
  ].join(":");
}

export function planExecutionAllocationKey(input: {
  organizationId: string;
  missionId: string;
  opportunityId: string;
  planExecutionId: string;
}): string {
  return [
    "plan_execution_allocation",
    input.organizationId,
    input.missionId,
    input.opportunityId,
    input.planExecutionId,
  ].join(":");
}
