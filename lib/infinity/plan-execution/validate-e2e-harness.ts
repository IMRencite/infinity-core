import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { PENDING_JOB_STATUSES } from "@/lib/infinity/constants";
import { runJobToCompletion } from "@/lib/infinity/build-factory/validate-e2e";
import { schedulePlanStep } from "@/lib/infinity/scheduler";
import { observeGovernedWorkerPlanSteps } from "@/lib/infinity/workers/observe-plan-steps";
import { observeBuildFactoryBuilds } from "@/lib/infinity/build-factory/observe-builds";
import { observeBuildFactoryJobs } from "@/lib/infinity/build-factory/observe-build-jobs";
import { observePlanExecution } from "@/lib/infinity/plan-execution/observe";
import { EXECUTION_QA_CAPABILITY } from "@/lib/infinity/plan-execution/constants";
import type { Plan, PlanStep } from "@/lib/infinity/types";

export const APE_E2E_LABEL = "autonomous_plan_execution_e2e_v1";

export const APE_E2E_LIMITS = {
  maxTotalMs: 20 * 60 * 1000,
  targetTotalMs: 10 * 60 * 1000,
  maxRuntimeTicks: 80,
  maxDrainCycles: 40,
  maxNoProgressCycles: 12,
  pollDelayMs: 120,
  maxJobsPerDrain: 4,
} as const;

export type ApeProgressSnapshot = {
  runtimeStage: string | null;
  runtimeStateVersion: number | null;
  planExecutionStatus: string | null;
  planExecutionPhase: string | null;
  buildJobStatus: string | null;
  buildJobLifecycleStage: string | null;
  buildStatus: string | null;
  buildReviewStatus: string | null;
  productQaStatus: string | null;
  genericQaStatus: string | null;
  reproducibilityStatus: string | null;
  snapshotCount: number;
  scopedPendingEngineJobs: number;
  scopedCompletedEngineJobs: number;
  scopedWorkerResultCount: number;
  executionQaCompleted: boolean;
};

export function progressFingerprint(s: ApeProgressSnapshot): string {
  return [
    s.runtimeStage,
    s.runtimeStateVersion,
    s.planExecutionStatus,
    s.planExecutionPhase,
    s.buildJobStatus,
    s.buildJobLifecycleStage,
    s.buildStatus,
    s.buildReviewStatus,
    s.productQaStatus,
    s.genericQaStatus,
    s.reproducibilityStatus,
    s.snapshotCount,
    s.scopedPendingEngineJobs,
    s.scopedCompletedEngineJobs,
    s.scopedWorkerResultCount,
    s.executionQaCompleted,
  ].join("|");
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function captureApeProgress(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    runtimeId: string;
    planId: string;
    planExecutionId: string | null;
    buildId: string | null;
    buildJobId: string | null;
    workerResultBaseline: number;
  },
): Promise<ApeProgressSnapshot> {
  const { data: rt } = await admin
    .from("mission_runtime_instances")
    .select("current_stage, state_version")
    .eq("id", input.runtimeId)
    .maybeSingle();

  const { data: pe } = input.planExecutionId
    ? await admin
        .from("plan_executions")
        .select("status, current_phase")
        .eq("id", input.planExecutionId)
        .maybeSingle()
    : { data: null };

  let buildJobStatus: string | null = null;
  let buildJobLifecycleStage: string | null = null;
  let productQaStatus: string | null = null;
  let genericQaStatus: string | null = null;
  let reproducibilityStatus: string | null = null;

  if (input.buildJobId) {
    const { data: bj } = await admin
      .from("build_jobs")
      .select(
        "status, lifecycle_stage, product_qa_status, generic_qa_status, reproducibility_status",
      )
      .eq("id", input.buildJobId)
      .maybeSingle();
    buildJobStatus = bj?.status ?? null;
    buildJobLifecycleStage = bj?.lifecycle_stage ?? null;
    productQaStatus = bj?.product_qa_status ?? null;
    genericQaStatus = bj?.generic_qa_status ?? null;
    reproducibilityStatus = bj?.reproducibility_status ?? null;
  }

  let buildStatus: string | null = null;
  let buildReviewStatus: string | null = null;
  let snapshotCount = 0;
  if (input.buildId) {
    const { data: build } = await admin
      .from("builds")
      .select("status, review_status")
      .eq("id", input.buildId)
      .maybeSingle();
    buildStatus = build?.status ?? null;
    buildReviewStatus = build?.review_status ?? null;
    const { count } = await admin
      .from("build_snapshots")
      .select("*", { count: "exact", head: true })
      .eq("build_id", input.buildId);
    snapshotCount = count ?? 0;
  }

  const { count: pending } = await admin
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("mission_id", input.missionId)
    .eq("plan_id", input.planId)
    .in("status", [...PENDING_JOB_STATUSES]);

  const { count: completedJobs } = await admin
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("mission_id", input.missionId)
    .eq("plan_id", input.planId)
    .eq("status", "completed");

  const { count: wrCount } = await admin
    .from("worker_results")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("mission_id", input.missionId);

  const { count: execQa } = await admin
    .from("worker_results")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("mission_id", input.missionId)
    .eq("capability_key", EXECUTION_QA_CAPABILITY)
    .eq("status", "completed");

  return {
    runtimeStage: rt?.current_stage ?? null,
    runtimeStateVersion: rt?.state_version ?? null,
    planExecutionStatus: pe?.status ?? null,
    planExecutionPhase: pe?.current_phase ?? null,
    buildJobStatus,
    buildJobLifecycleStage,
    buildStatus,
    buildReviewStatus,
    productQaStatus,
    genericQaStatus,
    reproducibilityStatus,
    snapshotCount,
    scopedPendingEngineJobs: pending ?? 0,
    scopedCompletedEngineJobs: completedJobs ?? 0,
    scopedWorkerResultCount: Math.max(0, (wrCount ?? 0) - input.workerResultBaseline),
    executionQaCompleted: (execQa ?? 0) > 0,
  };
}

export async function observeMissionScoped(
  admin: AdminSupabaseClient,
  organizationId: string,
  missionId: string,
): Promise<void> {
  await observeGovernedWorkerPlanSteps(admin, organizationId, missionId);
  await observeBuildFactoryBuilds(admin, organizationId, missionId);
  await observeBuildFactoryJobs(admin, organizationId, missionId);
  await observePlanExecution(admin, organizationId, missionId);
}

/** Drain only pending engine jobs for this mission + plan (never org-global queue). */
export async function drainScopedPlanEngineJobs(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    planId: string;
    correlationId?: string;
    maxJobs?: number;
  },
): Promise<number> {
  let query = admin
    .from("engine_jobs")
    .select("id, capability_key")
    .eq("organization_id", input.organizationId)
    .eq("mission_id", input.missionId)
    .eq("plan_id", input.planId)
    .in("status", [...PENDING_JOB_STATUSES])
    .order("created_at", { ascending: true })
    .limit(input.maxJobs ?? APE_E2E_LIMITS.maxJobsPerDrain);

  if (input.correlationId) {
    query = query.eq("correlation_id", input.correlationId);
  }

  const { data: pending } = await query;

  let executed = 0;
  for (const job of pending ?? []) {
    await runJobToCompletion(admin, job.id, input.organizationId, job.capability_key);
    executed += 1;
  }
  return executed;
}

export async function completeWebsiteBuildPlanSteps(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    planId: string;
    buildId: string;
    correlationId: string;
  },
): Promise<string[]> {
  const errors: string[] = [];
  const { data: mission } = await admin
    .from("missions")
    .select("*")
    .eq("id", input.missionId)
    .single();
  const { data: plan } = await admin.from("plans").select("*").eq("id", input.planId).single();
  if (!mission || !plan) {
    return ["mission or plan missing for build step completion"];
  }
  const { data: cycle } = await admin
    .from("command_cycles")
    .select("*")
    .eq("id", plan.command_cycle_id)
    .single();
  if (!cycle) {
    return ["command cycle missing"];
  }

  const { data: taskSteps } = await admin
    .from("plan_steps")
    .select("id, capability_key, step_order")
    .eq("organization_id", input.organizationId)
    .eq("plan_id", input.planId)
    .filter("constraints->>build_id", "eq", input.buildId)
    .order("step_order", { ascending: true });

  const isWebsiteBuild = (taskSteps ?? []).some((s) => s.capability_key.startsWith("website."));
  let packageWorkerResultId = "";
  let snapshotWorkerResultId = "";

  for (const step of taskSteps ?? []) {
    if (
      step.capability_key === "qa.verify_internal_build" ||
      step.capability_key === "qa.verify_internal_website" ||
      step.capability_key === "qa.verify_ai_generated_website" ||
      step.capability_key === "qa.verify_generic_internal_build"
    ) {
      continue;
    }
    if (isWebsiteBuild && step.capability_key === "build.snapshot_workspace") {
      continue;
    }

    const { count: existing } = await admin
      .from("engine_jobs")
      .select("*", { count: "exact", head: true })
      .eq("plan_step_id", step.id)
      .in("status", [...PENDING_JOB_STATUSES, "completed"]);
    if ((existing ?? 0) > 0) {
      continue;
    }

    const { data: fullStep } = await admin.from("plan_steps").select("*").eq("id", step.id).single();
    if (!fullStep) continue;

    const job = await schedulePlanStep(
      admin,
      input.organizationId,
      cycle,
      mission,
      plan as Plan,
      fullStep as PlanStep,
    );
    const exec = await runJobToCompletion(
      admin,
      job.id,
      input.organizationId,
      step.capability_key,
    );
    if (exec.status !== "completed") {
      errors.push(`build step ${step.capability_key} did not complete`);
      continue;
    }
    const out = exec.output as Record<string, unknown>;
    if (step.capability_key === "website.package_internal_source") {
      packageWorkerResultId = String(out.worker_result_id ?? "");
    }
    if (step.capability_key === "build.snapshot_workspace") {
      snapshotWorkerResultId = String(out.worker_result_id ?? "");
    }
  }

  const qaStep = (taskSteps ?? []).find(
    (s) =>
      s.capability_key === "qa.verify_internal_website" ||
      s.capability_key === "qa.verify_internal_build" ||
      s.capability_key === "qa.verify_ai_generated_website",
  );
  if (qaStep && packageWorkerResultId) {
    const { data: opp } = await admin
      .from("builds")
      .select("opportunity_id")
      .eq("id", input.buildId)
      .maybeSingle();
    await admin
      .from("plan_steps")
      .update({
        constraints: {
          organization_id: input.organizationId,
          mission_id: input.missionId,
          opportunity_id: opp?.opportunity_id,
          build_id: input.buildId,
          worker_result_id: packageWorkerResultId,
          plan_step_id: qaStep.id,
        },
      })
      .eq("id", qaStep.id);
    const { data: qaFull } = await admin.from("plan_steps").select("*").eq("id", qaStep.id).single();
    if (qaFull) {
      const qaJob = await schedulePlanStep(
        admin,
        input.organizationId,
        cycle,
        mission,
        plan as Plan,
        qaFull as PlanStep,
      );
      await runJobToCompletion(admin, qaJob.id, input.organizationId, qaStep.capability_key);
    }
  }

  const { data: buildRow } = await admin
    .from("builds")
    .select("review_status")
    .eq("id", input.buildId)
    .maybeSingle();

  if (buildRow?.review_status === "passed" && isWebsiteBuild) {
    const snapshotStep = (taskSteps ?? []).find(
      (s) => s.capability_key === "build.snapshot_workspace",
    );
    if (snapshotStep) {
      const { data: snapFull } = await admin
        .from("plan_steps")
        .select("*")
        .eq("id", snapshotStep.id)
        .single();
      if (snapFull) {
        const snapJob = await schedulePlanStep(
          admin,
          input.organizationId,
          cycle,
          mission,
          plan as Plan,
          snapFull as PlanStep,
        );
        await runJobToCompletion(admin, snapJob.id, input.organizationId, "build.snapshot_workspace");
      }
    }
  }

  const genericStep = (taskSteps ?? []).find(
    (s) => s.capability_key === "qa.verify_generic_internal_build",
  );
  if (genericStep) {
    const { data: buildRow } = await admin
      .from("builds")
      .select("opportunity_id")
      .eq("id", input.buildId)
      .maybeSingle();
    const { data: bj } = await admin
      .from("build_jobs")
      .select("id")
      .eq("build_id", input.buildId)
      .maybeSingle();
    await admin
      .from("plan_steps")
      .update({
        constraints: {
          organization_id: input.organizationId,
          mission_id: input.missionId,
          opportunity_id: buildRow?.opportunity_id,
          build_id: input.buildId,
          build_job_id: bj?.id,
          plan_step_id: genericStep.id,
        },
      })
      .eq("id", genericStep.id);
    const { data: gFull } = await admin
      .from("plan_steps")
      .select("*")
      .eq("id", genericStep.id)
      .single();
    if (gFull) {
      const { count: gJobs } = await admin
        .from("engine_jobs")
        .select("*", { count: "exact", head: true })
        .eq("plan_step_id", genericStep.id)
        .in("status", [...PENDING_JOB_STATUSES, "completed"]);
      if ((gJobs ?? 0) === 0) {
        const gJob = await schedulePlanStep(
          admin,
          input.organizationId,
          cycle,
          mission,
          plan as Plan,
          gFull as PlanStep,
        );
        await runJobToCompletion(
          admin,
          gJob.id,
          input.organizationId,
          "qa.verify_generic_internal_build",
        );
      }
    }
  }

  await observeMissionScoped(admin, input.organizationId, input.missionId);
  return errors;
}

export type ScopedDuplicateCounts = {
  planExecutions: number;
  allocationProposals: number;
  engineJobs: number;
  buildJobs: number;
  workerResults: number;
  buildSnapshots: number;
  executionQaResults: number;
  internallyCompleteEvents: number;
};

export async function countScopedDuplicates(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    planId: string;
    planExecutionIdempotencyKey: string;
    allocationProposalKeyPrefix: string;
    buildId: string | null;
  },
): Promise<ScopedDuplicateCounts> {
  const { count: planExecutions } = await admin
    .from("plan_executions")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("idempotency_key", input.planExecutionIdempotencyKey);

  const { count: allocationProposals } = await admin
    .from("allocation_proposals")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("mission_id", input.missionId)
    .like("proposal_key", `${input.allocationProposalKeyPrefix}%`);

  const { count: engineJobs } = await admin
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("mission_id", input.missionId)
    .eq("plan_id", input.planId);

  const { count: buildJobs } = await admin
    .from("build_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("mission_id", input.missionId);

  const { count: workerResults } = await admin
    .from("worker_results")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("mission_id", input.missionId);

  let buildSnapshots = 0;
  if (input.buildId) {
    const { count } = await admin
      .from("build_snapshots")
      .select("*", { count: "exact", head: true })
      .eq("build_id", input.buildId);
    buildSnapshots = count ?? 0;
  }

  const { count: executionQaResults } = await admin
    .from("worker_results")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("mission_id", input.missionId)
    .eq("capability_key", EXECUTION_QA_CAPABILITY);

  const { count: internallyCompleteEvents } = await admin
    .from("engine_events")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("event_type", "plan_execution.internally_completed")
    .contains("payload", { mission_id: input.missionId });

  return {
    planExecutions: planExecutions ?? 0,
    allocationProposals: allocationProposals ?? 0,
    engineJobs: engineJobs ?? 0,
    buildJobs: buildJobs ?? 0,
    workerResults: workerResults ?? 0,
    buildSnapshots,
    executionQaResults: executionQaResults ?? 0,
    internallyCompleteEvents: internallyCompleteEvents ?? 0,
  };
}
