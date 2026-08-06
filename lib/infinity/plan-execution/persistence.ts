import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { PlanExecutionContract } from "./contract";
import type { PlanExecutionStatus } from "./constants";
import { PLAN_EXECUTION_POLICY_VERSION } from "./constants";

function parseIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((v): v is string => typeof v === "string");
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((v): v is string => typeof v === "string");
}

export function mapPlanExecutionRow(row: Record<string, unknown>): PlanExecutionContract {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    missionId: String(row.mission_id),
    runtimeInstanceId: row.runtime_instance_id ? String(row.runtime_instance_id) : null,
    opportunityId: String(row.opportunity_id),
    executiveDecisionId: String(row.executive_decision_id),
    planId: String(row.plan_id),
    planVersion: Number(row.plan_version ?? 1),
    allocationProposalId: row.allocation_proposal_id ? String(row.allocation_proposal_id) : null,
    executionVersion: Number(row.execution_version ?? 1),
    ventureBlueprintId: row.venture_blueprint_id ? String(row.venture_blueprint_id) : null,
    buildId: row.build_id ? String(row.build_id) : null,
    buildJobId: row.build_job_id ? String(row.build_job_id) : null,
    executableStepIds: parseIdArray(row.executable_step_ids),
    completedStepIds: parseIdArray(row.completed_step_ids),
    blockedStepIds: parseIdArray(row.blocked_step_ids),
    failedStepIds: parseIdArray(row.failed_step_ids),
    activeStepId: row.active_step_id ? String(row.active_step_id) : null,
    currentPhase: String(row.current_phase ?? "requested") as PlanExecutionContract["currentPhase"],
    executionPolicyVersion: String(row.execution_policy_version ?? PLAN_EXECUTION_POLICY_VERSION),
    schedulerPolicyVersion: String(row.scheduler_policy_version ?? "scheduler_v1"),
    approvedCapabilities: parseStringArray(row.approved_capabilities),
    prohibitedCapabilities: parseStringArray(row.prohibited_capabilities),
    totalEstimatedCost: Number(row.estimated_cost ?? 0),
    approvedCost: Number(row.approved_cost ?? 0),
    maximumRuntimeMs: Number(row.maximum_runtime_ms ?? 900000),
    maximumConcurrency: Number(row.maximum_concurrency ?? 2),
    idempotencyKey: String(row.idempotency_key),
    correlationId: row.correlation_id ? String(row.correlation_id) : null,
    status: String(row.status) as PlanExecutionStatus,
    blockingReason: row.blocking_reason ? String(row.blocking_reason) : null,
    createdAt: String(row.created_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    failedAt: row.failed_at ? String(row.failed_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
  };
}

export async function findPlanExecutionByIdempotencyKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
): Promise<PlanExecutionContract | null> {
  const { data } = await admin
    .from("plan_executions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (!data) {
    return null;
  }
  return mapPlanExecutionRow(data as Record<string, unknown>);
}

export async function loadPlanExecutionById(
  admin: AdminSupabaseClient,
  organizationId: string,
  planExecutionId: string,
): Promise<PlanExecutionContract | null> {
  const { data } = await admin
    .from("plan_executions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", planExecutionId)
    .maybeSingle();

  if (!data) {
    return null;
  }
  return mapPlanExecutionRow(data as Record<string, unknown>);
}

export async function loadActivePlanExecutionForMission(
  admin: AdminSupabaseClient,
  organizationId: string,
  missionId: string,
): Promise<PlanExecutionContract | null> {
  const { data } = await admin
    .from("plan_executions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .not("status", "in", '("cancelled")')
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return null;
  }
  if (data.status === "internally_complete" || data.status === "failed") {
    return mapPlanExecutionRow(data as Record<string, unknown>);
  }
  return mapPlanExecutionRow(data as Record<string, unknown>);
}

export async function updatePlanExecution(
  admin: AdminSupabaseClient,
  organizationId: string,
  planExecutionId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await admin
    .from("plan_executions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", planExecutionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function insertPlanExecution(
  admin: AdminSupabaseClient,
  row: Database["public"]["Tables"]["plan_executions"]["Insert"],
): Promise<PlanExecutionContract> {
  const { data, error } = await admin.from("plan_executions").insert(row).select("*").single();
  if (error || !data) {
    throw new Error(error?.message ?? "plan_executions insert failed");
  }
  return mapPlanExecutionRow(data as Record<string, unknown>);
}
