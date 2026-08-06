import type { BuildJobStatus } from "./build-job";

export type GenericBuildJob = {
  id: string;
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string | null;
  opportunityId: string;
  ventureBlueprintId: string;
  executiveDecisionId: string | null;
  planId: string | null;
  planStepId: string | null;
  allocationProposalId: string | null;
  buildId: string | null;
  buildVersion: string;
  builderKey: string;
  builderVersion: string;
  projectType: string;
  buildSpecificationId: string;
  buildManifestId: string;
  workspaceId: string;
  inputManifest: Record<string, unknown>;
  policyManifest: Record<string, unknown>;
  approvedCapabilities: string[];
  prohibitedCapabilities: string[];
  resourceBudget: Record<string, unknown>;
  runtimeBudget: Record<string, unknown>;
  outputContracts: Record<string, unknown>;
  requiredReviews: string[];
  idempotencyKey: string;
  correlationId: string | null;
  status: BuildJobStatus;
  blockingReason: string | null;
  lifecycleStage: string | null;
  genericQaStatus: string;
  productQaStatus: string;
  reproducibilityStatus: string | null;
  rollbackMode: string | null;
  repairAttemptCount: number;
  maxRepairAttempts: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
};

export function buildJobIdempotencyKey(input: {
  organizationId: string;
  missionId: string;
  executiveDecisionId: string;
  planId: string;
  planStepId?: string | null;
  ventureBlueprintId: string;
  specificationHash: string;
  builderKey: string;
  builderVersion: string;
}): string {
  return [
    "build-job-v2",
    input.organizationId,
    input.missionId,
    input.executiveDecisionId,
    input.planId,
    input.planStepId ?? "none",
    input.ventureBlueprintId,
    input.specificationHash,
    input.builderKey,
    input.builderVersion,
  ].join(":");
}

export function mapBuildJobRow(row: Record<string, unknown>): GenericBuildJob {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    missionId: String(row.mission_id),
    runtimeInstanceId: row.runtime_instance_id ? String(row.runtime_instance_id) : null,
    opportunityId: String(row.opportunity_id),
    ventureBlueprintId: String(row.venture_blueprint_id),
    executiveDecisionId: row.executive_decision_id ? String(row.executive_decision_id) : null,
    planId: row.plan_id ? String(row.plan_id) : null,
    planStepId: row.plan_step_id ? String(row.plan_step_id) : null,
    allocationProposalId: row.allocation_proposal_id
      ? String(row.allocation_proposal_id)
      : null,
    buildId: row.build_id ? String(row.build_id) : null,
    buildVersion: String(row.build_version ?? "1"),
    builderKey: String(row.builder_key),
    builderVersion: String(row.builder_version),
    projectType: String(row.project_type),
    buildSpecificationId: String(row.build_specification_id ?? ""),
    buildManifestId: String(row.build_manifest_id ?? ""),
    workspaceId: String(row.workspace_id ?? ""),
    inputManifest: (row.input_manifest as Record<string, unknown>) ?? {},
    policyManifest: (row.policy_manifest as Record<string, unknown>) ?? {},
    approvedCapabilities: Array.isArray(row.approved_capabilities)
      ? (row.approved_capabilities as string[])
      : [],
    prohibitedCapabilities: Array.isArray(row.prohibited_capabilities)
      ? (row.prohibited_capabilities as string[])
      : [],
    resourceBudget: (row.resource_budget as Record<string, unknown>) ?? {},
    runtimeBudget: (row.runtime_budget as Record<string, unknown>) ?? {},
    outputContracts: (row.output_contracts as Record<string, unknown>) ?? {},
    requiredReviews: Array.isArray(row.required_reviews)
      ? (row.required_reviews as string[])
      : [],
    idempotencyKey: String(row.idempotency_key),
    correlationId: row.correlation_id ? String(row.correlation_id) : null,
    status: String(row.status) as BuildJobStatus,
    blockingReason: row.blocking_reason ? String(row.blocking_reason) : null,
    lifecycleStage: row.lifecycle_stage ? String(row.lifecycle_stage) : null,
    genericQaStatus: String(row.generic_qa_status ?? "pending"),
    productQaStatus: String(row.product_qa_status ?? "pending"),
    reproducibilityStatus: row.reproducibility_status
      ? String(row.reproducibility_status)
      : null,
    rollbackMode: row.rollback_mode ? String(row.rollback_mode) : null,
    repairAttemptCount: Number(row.repair_attempt_count ?? 0),
    maxRepairAttempts: Number(row.max_repair_attempts ?? 2),
    createdAt: String(row.created_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    failedAt: row.failed_at ? String(row.failed_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
  };
}
