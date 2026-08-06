import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { requestBuildFactoryRuntimeV2 } from "@/lib/infinity/build-factory/orchestrator";
import { schedulePlanStep } from "@/lib/infinity/scheduler";
import { PENDING_JOB_STATUSES } from "@/lib/infinity/constants";
import type { Plan, PlanStep } from "@/lib/infinity/types";
import {
  DEFAULT_PLAN_EXECUTION_MAX_CONCURRENCY,
  EXECUTION_QA_CAPABILITY,
  PLAN_EXECUTION_EVENTS,
  PLAN_EXECUTION_POLICY_VERSION,
  PLAN_STEP_ELIGIBILITY_BLOCKED_EXTERNAL,
} from "./constants";
import { evaluatePlanExecutionGates } from "./gates";
import { ensureZeroCostAllocationForPlanExecution } from "./allocation-integration";
import { emitPlanExecutionEvent } from "./events";
import { planExecutionIdempotencyKey } from "./idempotency";
import {
  findPlanExecutionByIdempotencyKey,
  insertPlanExecution,
  loadPlanExecutionById,
  updatePlanExecution,
} from "./persistence";
import { classifyPlanSteps } from "./step-classification";
import type { PlanExecutionContract } from "./contract";

export type RequestPlanExecutionResult =
  | { status: "created" | "reused"; planExecution: PlanExecutionContract }
  | { status: "blocked"; reason: string; classification: string };

export async function requestPlanExecution(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    runtimeInstanceId: string;
    planId: string;
    ventureBlueprintId: string;
    correlationId?: string | null;
  },
): Promise<RequestPlanExecutionResult> {
  const gates = await evaluatePlanExecutionGates(admin, {
    organizationId: input.organizationId,
    missionId: input.missionId,
    runtimeInstanceId: input.runtimeInstanceId,
    planId: input.planId,
    ventureBlueprintId: input.ventureBlueprintId,
  });

  if (!gates.allowed) {
    await emitPlanExecutionEvent(admin, {
      organizationId: input.organizationId,
      eventType: PLAN_EXECUTION_EVENTS.gated,
      message: gates.reason,
      correlationId: input.correlationId,
      missionId: input.missionId,
      runtimeInstanceId: input.runtimeInstanceId,
      planId: input.planId,
      payload: { classification: gates.classification },
    });
    return { status: "blocked", reason: gates.reason, classification: gates.classification };
  }

  const { data: plan } = await admin
    .from("plans")
    .select("*")
    .eq("id", input.planId)
    .eq("organization_id", input.organizationId)
    .single();

  if (!plan) {
    return { status: "blocked", reason: "Plan not found.", classification: "plan_missing" };
  }

  const idempotencyKey = planExecutionIdempotencyKey({
    organizationId: input.organizationId,
    missionId: input.missionId,
    runtimeInstanceId: input.runtimeInstanceId,
    executiveDecisionId: gates.executiveDecisionId,
    planId: input.planId,
    planVersion: plan.version ?? 1,
    executionPolicyVersion: PLAN_EXECUTION_POLICY_VERSION,
  });

  const existing = await findPlanExecutionByIdempotencyKey(
    admin,
    input.organizationId,
    idempotencyKey,
  );

  if (existing) {
    await emitPlanExecutionEvent(admin, {
      organizationId: input.organizationId,
      eventType: PLAN_EXECUTION_EVENTS.executionReused,
      message: "Plan execution reused",
      correlationId: input.correlationId,
      missionId: input.missionId,
      planExecutionId: existing.id,
      planId: input.planId,
    });
    return { status: "reused", planExecution: existing };
  }

  const { data: steps } = await admin
    .from("plan_steps")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("plan_id", input.planId)
    .order("step_order", { ascending: true });

  const classified = classifyPlanSteps((steps ?? []) as PlanStep[], {
    organizationId: input.organizationId,
    missionId: input.missionId,
    planId: input.planId,
    planVersion: plan.version ?? 1,
    executionPolicyVersion: PLAN_EXECUTION_POLICY_VERSION,
  });

  const blockedStepIds = classified
    .filter((s) => s.eligibilityStatus === PLAN_STEP_ELIGIBILITY_BLOCKED_EXTERNAL)
    .map((s) => s.stepId);

  const executableStepIds = classified
    .filter((s) => s.eligibilityStatus === "eligible")
    .map((s) => s.stepId);

  const planExecution = await insertPlanExecution(admin, {
    organization_id: input.organizationId,
    mission_id: input.missionId,
    runtime_instance_id: input.runtimeInstanceId,
    opportunity_id: gates.opportunityId,
    executive_decision_id: gates.executiveDecisionId,
    plan_id: input.planId,
    plan_version: plan.version ?? 1,
    venture_blueprint_id: input.ventureBlueprintId,
    execution_version: 1,
    current_phase: "allocation",
    executable_step_ids: executableStepIds as unknown as Json,
    completed_step_ids: [] as unknown as Json,
    blocked_step_ids: blockedStepIds as unknown as Json,
    failed_step_ids: [] as unknown as Json,
    execution_policy_version: PLAN_EXECUTION_POLICY_VERSION,
    scheduler_policy_version: "scheduler_v1",
    approved_capabilities: [] as unknown as Json,
    prohibited_capabilities: [] as unknown as Json,
    estimated_cost: 0,
    approved_cost: 0,
    maximum_runtime_ms: 900000,
    maximum_concurrency: DEFAULT_PLAN_EXECUTION_MAX_CONCURRENCY,
    idempotency_key: idempotencyKey,
    correlation_id: input.correlationId ?? null,
    status: "awaiting_allocation",
    started_at: new Date().toISOString(),
  });

  await emitPlanExecutionEvent(admin, {
    organizationId: input.organizationId,
    eventType: PLAN_EXECUTION_EVENTS.requested,
    message: "Autonomous plan execution requested",
    correlationId: input.correlationId,
    missionId: input.missionId,
    runtimeInstanceId: input.runtimeInstanceId,
    planExecutionId: planExecution.id,
    planId: input.planId,
  });

  return { status: "created", planExecution };
}

export async function approvePlanExecutionAllocation(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    opportunityId: string;
    planExecutionId: string;
    correlationId?: string | null;
  },
): Promise<PlanExecutionContract | null> {
  const pe = await loadPlanExecutionById(admin, input.organizationId, input.planExecutionId);
  if (!pe) {
    return null;
  }

  const allocation = await ensureZeroCostAllocationForPlanExecution(admin, {
    organizationId: input.organizationId,
    missionId: input.missionId,
    opportunityId: input.opportunityId,
    planExecution: pe,
    correlationId: input.correlationId,
  });

  if (allocation.status === "denied") {
    await updatePlanExecution(admin, input.organizationId, pe.id, {
      status: "blocked",
      blocking_reason: allocation.reason ?? "allocation_denied",
    });
    return loadPlanExecutionById(admin, input.organizationId, pe.id);
  }

  await updatePlanExecution(admin, input.organizationId, pe.id, {
    allocation_proposal_id: allocation.allocationId,
    status: "allocation_approved",
    current_phase: "scheduling",
  });

  return loadPlanExecutionById(admin, input.organizationId, pe.id);
}

export async function bootstrapPlanExecutionBuildSegment(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    runtimeInstanceId: string;
    planExecutionId: string;
    correlationId?: string | null;
  },
): Promise<{ buildId: string | null; buildJobId: string | null }> {
  const pe = await loadPlanExecutionById(admin, input.organizationId, input.planExecutionId);
  if (!pe || !pe.ventureBlueprintId || !pe.allocationProposalId) {
    return { buildId: null, buildJobId: null };
  }

  if (pe.buildJobId && pe.buildId) {
    return { buildId: pe.buildId, buildJobId: pe.buildJobId };
  }

  const v2 = await requestBuildFactoryRuntimeV2(admin, {
    organizationId: input.organizationId,
    missionId: input.missionId,
    runtimeInstanceId: input.runtimeInstanceId,
    opportunityId: pe.opportunityId,
    ventureBlueprintId: pe.ventureBlueprintId,
    planId: pe.planId,
    allocationProposalId: pe.allocationProposalId,
    correlationId: input.correlationId ?? pe.correlationId ?? crypto.randomUUID(),
  });

  if (v2.status === "blocked") {
    await updatePlanExecution(admin, input.organizationId, pe.id, {
      status: "blocked",
      blocking_reason: v2.reason,
    });
    return { buildId: null, buildJobId: null };
  }

  await updatePlanExecution(admin, input.organizationId, pe.id, {
    build_id: v2.buildId,
    build_job_id: v2.buildJob.id,
    status: "scheduling",
    current_phase: "scheduling",
  });

  await emitPlanExecutionEvent(admin, {
    organizationId: input.organizationId,
    eventType: PLAN_EXECUTION_EVENTS.buildJobLinked,
    message: "BuildJob linked to plan execution",
    correlationId: input.correlationId,
    missionId: input.missionId,
    planExecutionId: pe.id,
    planId: pe.planId,
    buildJobId: v2.buildJob.id,
    payload: { build_id: v2.buildId, builder_key: v2.builderKey },
  });

  const { data: buildSteps } = await admin
    .from("plan_steps")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("plan_id", pe.planId)
    .filter("constraints->>build_id", "eq", v2.buildId);

  const buildStepIds = (buildSteps ?? []).map((s) => s.id);
  const mergedExecutable = Array.from(new Set([...pe.executableStepIds, ...buildStepIds]));

  await updatePlanExecution(admin, input.organizationId, pe.id, {
    executable_step_ids: mergedExecutable as unknown as Json,
  });

  return { buildId: v2.buildId, buildJobId: v2.buildJob.id };
}

async function countPendingPlanExecutionJobs(
  admin: AdminSupabaseClient,
  organizationId: string,
  missionId: string,
  planId: string,
): Promise<number> {
  const { count } = await admin
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("plan_id", planId)
    .in("status", [...PENDING_JOB_STATUSES]);

  return count ?? 0;
}

export async function schedulePlanExecutionBatch(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    planExecutionId: string;
    maxToSchedule?: number;
  },
): Promise<number> {
  const pe = await loadPlanExecutionById(admin, input.organizationId, input.planExecutionId);
  if (!pe) {
    return 0;
  }

  const pending = await countPendingPlanExecutionJobs(
    admin,
    input.organizationId,
    input.missionId,
    pe.planId,
  );

  const slots = Math.max(
    0,
    Math.min(
      input.maxToSchedule ?? 1,
      pe.maximumConcurrency - pending,
    ),
  );

  if (slots <= 0) {
    return 0;
  }

  const { data: plan } = await admin
    .from("plans")
    .select("*")
    .eq("id", pe.planId)
    .eq("organization_id", input.organizationId)
    .single();

  if (!plan) {
    return 0;
  }

  const { data: mission } = await admin
    .from("missions")
    .select("*")
    .eq("id", input.missionId)
    .eq("organization_id", input.organizationId)
    .single();

  const { data: cycle } = await admin
    .from("command_cycles")
    .select("*")
    .eq("id", plan.command_cycle_id)
    .single();

  if (!mission || !cycle) {
    return 0;
  }

  const { data: steps } = await admin
    .from("plan_steps")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("plan_id", pe.planId)
    .order("step_order", { ascending: true });

  let scheduled = 0;
  const completed = new Set(pe.completedStepIds);
  const blocked = new Set(pe.blockedStepIds);
  const failed = new Set(pe.failedStepIds);

  for (const step of (steps ?? []) as PlanStep[]) {
    if (scheduled >= slots) {
      break;
    }
    if (completed.has(step.id) || blocked.has(step.id) || failed.has(step.id)) {
      continue;
    }
    if (step.status === "completed" || step.status === "cancelled") {
      continue;
    }
    if (!pe.executableStepIds.includes(step.id)) {
      continue;
    }

    const classified = classifyPlanSteps([step], {
      organizationId: input.organizationId,
      missionId: input.missionId,
      planId: pe.planId,
      planVersion: pe.planVersion,
      executionPolicyVersion: pe.executionPolicyVersion,
    })[0]!;

    if (classified.eligibilityStatus === PLAN_STEP_ELIGIBILITY_BLOCKED_EXTERNAL) {
      continue;
    }

    const { count: existingJob } = await admin
      .from("engine_jobs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", input.organizationId)
      .eq("plan_step_id", step.id)
      .in("status", [...PENDING_JOB_STATUSES, "completed"]);

    if ((existingJob ?? 0) > 0) {
      continue;
    }

    const job = await schedulePlanStep(
      admin,
      input.organizationId,
      cycle,
      mission,
      plan as Plan,
      step,
    );

    scheduled += 1;

    await emitPlanExecutionEvent(admin, {
      organizationId: input.organizationId,
      eventType: PLAN_EXECUTION_EVENTS.stepScheduled,
      message: `Scheduled ${step.capability_key}`,
      correlationId: pe.correlationId,
      missionId: input.missionId,
      planExecutionId: pe.id,
      planId: pe.planId,
      planStepId: step.id,
      payload: { engine_job_id: job.id, capability_key: step.capability_key },
    });

    await updatePlanExecution(admin, input.organizationId, pe.id, {
      active_step_id: step.id,
      status: "running",
      current_phase: "execution",
    });
  }

  if (scheduled > 0) {
    await emitPlanExecutionEvent(admin, {
      organizationId: input.organizationId,
      eventType: PLAN_EXECUTION_EVENTS.schedulingStarted,
      message: "Plan execution scheduling batch",
      correlationId: pe.correlationId,
      missionId: input.missionId,
      planExecutionId: pe.id,
      payload: { scheduled_count: scheduled },
    });
  }

  return scheduled;
}

export async function ensurePlanExecutionQaStep(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    planExecutionId: string;
  },
): Promise<string | null> {
  const pe = await loadPlanExecutionById(admin, input.organizationId, input.planExecutionId);
  if (!pe) {
    return null;
  }

  const { data: existing } = await admin
    .from("plan_steps")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("plan_id", pe.planId)
    .eq("capability_key", EXECUTION_QA_CAPABILITY)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: maxStep } = await admin
    .from("plan_steps")
    .select("step_order")
    .eq("plan_id", pe.planId)
    .order("step_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stepOrder = (maxStep?.step_order ?? 0) + 1;

  const { data: step, error } = await admin
    .from("plan_steps")
    .insert({
      organization_id: input.organizationId,
      plan_id: pe.planId,
      step_order: stepOrder,
      capability_key: EXECUTION_QA_CAPABILITY,
      title: "Autonomous plan execution QA",
      description: "Independent verification — internal only",
      constraints: {
        organization_id: input.organizationId,
        mission_id: pe.missionId,
        plan_execution_id: pe.id,
        plan_id: pe.planId,
      },
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !step) {
    return null;
  }

  const merged = Array.from(new Set([...pe.executableStepIds, step.id]));
  await updatePlanExecution(admin, input.organizationId, pe.id, {
    executable_step_ids: merged as unknown as Json,
  });

  return step.id;
}

export async function ensureDeferredExternalPlanStep(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    planId: string;
    missionId: string;
  },
): Promise<string | null> {
  const markerKey = "deploy.publish_external";
  const { data: existing } = await admin
    .from("plan_steps")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("plan_id", input.planId)
    .eq("capability_key", markerKey)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: step, error } = await admin
    .from("plan_steps")
    .insert({
      organization_id: input.organizationId,
      plan_id: input.planId,
      step_order: 9999,
      capability_key: markerKey,
      title: "External deploy (blocked)",
      description: "Unsupported external capability — must not execute",
      constraints: {
        mission_id: input.missionId,
        side_effect_class: "external_write",
        deferred: true,
      },
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !step) {
    return null;
  }
  return step.id;
}
