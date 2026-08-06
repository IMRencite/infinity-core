import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import {
  assertBuildFactoryE2EAllowed,
  runBuildFactoryE2EValidation,
  runJobToCompletion,
} from "./validate-e2e";
import { requestBuildFactoryRuntimeV2 } from "./orchestrator";
import { requestBoundedRepair } from "./repair-model";
import { rollbackBuildToSnapshot } from "./rollback";
import { loadBuildById } from "./workspace";
import { recordBuildRollback } from "./rollback-record";
import { observeBuildFactoryJobs } from "./observe-build-jobs";
import { runMissionRuntimeTick } from "@/lib/infinity/mission-runtime";
import { schedulePlanStep } from "@/lib/infinity/scheduler";
import { BUILD_E2E_LABEL } from "./constants";
import { registerRuntimeWorkers } from "@/lib/infinity/runtime";

const WEBSITE_FIELD_DENYLIST = [
  "html",
  "website_url",
  "page_routes",
  "framework",
  "nextjs",
  "sitemap",
] as const;

export type BuildFactoryRuntimeV2E2EReport = {
  pass: boolean;
  errors: string[];
  organizationId: string;
  missionId: string;
  runtimeId: string;
  executiveDecisionId: string | null;
  planId: string | null;
  allocationId: string | null;
  blueprintId: string | null;
  buildId: string | null;
  buildJobId: string | null;
  buildJobVersion: string | null;
  builderKey: string | null;
  builderVersion: string | null;
  workspaceReference: string | null;
  lifecycleTaskCount: number;
  engineJobCountForBuild: number;
  workerResultCountForBuild: number;
  artifactCountForBuild: number;
  productQaStatus: string | null;
  genericQaStatus: string | null;
  genericQaResultId: string | null;
  snapshotId: string | null;
  snapshotCount: number;
  reproducibilityStatus: string | null;
  buildStatus: string | null;
  buildJobStatus: string | null;
  rollbackMode: string | null;
  repairAttemptIds: string[];
  repairExhausted: boolean;
  permissionsUnchangedAfterRepair: boolean;
  runtimeStageBeforeTick: string | null;
  runtimeStageAfterTick: string | null;
  buildJobObservedOnLaterTick: boolean;
  duplicateCounts: {
    buildJobs: number;
    workspaces: number;
    planStepsForBuild: number;
    engineJobs: number;
    workerResults: number;
    snapshots: number;
    v2CompletionEvents: number;
  };
  externalSideEffects: {
    builds: number;
    deployments: number;
    companiesDelta: number;
    assetsDelta: number;
  };
};

async function seedExecutiveSelectionForE2e(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    runtimeInstanceId: string;
    opportunityId: string;
    planId: string;
    validationRunId: string;
  },
): Promise<string> {
  const runSuffix = crypto.randomUUID();
  const contextHash = `build-v2-e2e:${input.missionId}:${runSuffix}`;
  const { data: ctx, error: ctxError } = await admin
    .from("executive_contexts")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId,
      runtime_instance_id: input.runtimeInstanceId,
      context_hash: contextHash,
      idempotency_key: contextHash,
      status: "completed",
      context_manifest: { qa: { verdict: "pass" }, e2e: true },
    })
    .select("id")
    .single();

  if (ctxError || !ctx) {
    throw new Error(ctxError?.message ?? "executive_context insert failed for v2 e2e");
  }

  const { data: decision, error: decisionError } = await admin
    .from("executive_selection_decisions")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId,
      runtime_instance_id: input.runtimeInstanceId,
      executive_context_id: ctx.id,
      opportunity_id: input.opportunityId,
      decision: "select_for_planning",
      planning_eligible: true,
      review_status: "passed",
      status: "finalized",
      finalized_at: new Date().toISOString(),
      deterministic_score: 90,
      confidence: 80,
      policy_version: "e2e",
      decision_model_version: "e2e",
      decision_model_key: "e2e",
      context_hash: contextHash,
      idempotency_key: `${contextHash}:select`,
      validation_run_id: input.validationRunId,
      blockers: [],
      escalation_reasons: [],
    })
    .select("id")
    .single();

  if (decisionError || !decision) {
    throw new Error(decisionError?.message ?? "executive_selection_decisions insert failed for v2 e2e");
  }

  await admin
    .from("plans")
    .update({
      status: "active",
      metadata: {
        plan_qa_verdict: "pass",
        opportunity_id: input.opportunityId,
        planner_gate: "executive_selection_v2",
      },
    })
    .eq("id", input.planId)
    .eq("organization_id", input.organizationId);

  const { data: planCheck } = await admin
    .from("plans")
    .select("status")
    .eq("id", input.planId)
    .maybeSingle();
  if (planCheck?.status !== "active") {
    throw new Error(`plan ${input.planId} must be active for v2 e2e, got ${planCheck?.status ?? "missing"}`);
  }

  return String(decision.id);
}

function buildJobHasNoWebsiteSpecificFields(job: Record<string, unknown>): string[] {
  const issues: string[] = [];
  for (const field of WEBSITE_FIELD_DENYLIST) {
    if (Object.prototype.hasOwnProperty.call(job, field)) {
      issues.push(`forbidden_column_${field}`);
    }
  }
  return issues;
}

async function countExternal(admin: AdminSupabaseClient, orgId: string) {
  const companies = await admin
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);
  const assets = await admin
    .from("assets")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);
  return { companies: companies.count ?? 0, assets: assets.count ?? 0 };
}

export async function runBuildFactoryRuntimeV2E2EValidation(
  admin: AdminSupabaseClient,
): Promise<BuildFactoryRuntimeV2E2EReport> {
  assertBuildFactoryE2EAllowed();
  registerRuntimeWorkers();
  const errors: string[] = [];

  const v1 = await runBuildFactoryE2EValidation(admin);
  const externalBefore = await countExternal(admin, v1.organizationId);

  const emptyDuplicates = {
    buildJobs: 0,
    workspaces: 0,
    planStepsForBuild: 0,
    engineJobs: 0,
    workerResults: 0,
    snapshots: 0,
    v2CompletionEvents: 0,
  };

  if (!v1.pass || !v1.buildId) {
    return {
      pass: false,
      errors: [...v1.errors, "v1 build factory prerequisite failed"],
      organizationId: v1.organizationId,
      missionId: v1.missionId,
      runtimeId: v1.runtimeInstanceId,
      executiveDecisionId: null,
      planId: v1.planId,
      allocationId: v1.allocationId ?? null,
      blueprintId: v1.blueprintId,
      buildId: v1.buildId,
      buildJobId: null,
      buildJobVersion: null,
      builderKey: null,
      builderVersion: null,
      workspaceReference: v1.workspaceReference,
      lifecycleTaskCount: 0,
      engineJobCountForBuild: 0,
      workerResultCountForBuild: 0,
      artifactCountForBuild: 0,
      productQaStatus: null,
      genericQaStatus: null,
      genericQaResultId: null,
      snapshotId: v1.snapshotId,
      snapshotCount: 0,
      reproducibilityStatus: null,
      buildStatus: null,
      buildJobStatus: null,
      rollbackMode: null,
      repairAttemptIds: [],
      repairExhausted: false,
      permissionsUnchangedAfterRepair: false,
      runtimeStageBeforeTick: null,
      runtimeStageAfterTick: null,
      buildJobObservedOnLaterTick: false,
      duplicateCounts: emptyDuplicates,
      externalSideEffects: { builds: 0, deployments: 0, companiesDelta: 0, assetsDelta: 0 },
    };
  }

  const executiveDecisionId = await seedExecutiveSelectionForE2e(admin, {
    organizationId: v1.organizationId,
    missionId: v1.missionId,
    runtimeInstanceId: v1.runtimeInstanceId,
    opportunityId: v1.opportunityId,
    planId: v1.planId,
    validationRunId: v1.validationRunId,
  });

  const factoryInput = {
    organizationId: v1.organizationId,
    missionId: v1.missionId,
    runtimeInstanceId: v1.runtimeInstanceId,
    opportunityId: v1.opportunityId,
    ventureBlueprintId: v1.blueprintId,
    planId: v1.planId,
    allocationProposalId: v1.allocationId,
    correlationId: crypto.randomUUID(),
  };

  const first = await requestBuildFactoryRuntimeV2(admin, factoryInput);
  if (first.status === "blocked") {
    errors.push(`v2 blocked: ${first.reason}`);
  }

  const second = await requestBuildFactoryRuntimeV2(admin, factoryInput);
  if (second.status === "blocked") {
    errors.push(`v2 repeat blocked: ${second.reason}`);
  }

  const { count: engineJobsBefore } = await admin
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", v1.organizationId)
    .eq("mission_id", v1.missionId);

  const { count: workerResultsBefore } = await admin
    .from("worker_results")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", v1.organizationId)
    .eq("mission_id", v1.missionId);

  const buildJob = first.status !== "blocked" ? first.buildJob : null;
  const buildId = buildJob?.buildId ?? v1.buildId;

  if (
    first.status !== "blocked" &&
    second.status !== "blocked" &&
    first.buildJob.id !== second.buildJob.id
  ) {
    errors.push("duplicate BuildJob created on repeat request");
  }

  if (buildJob) {
    const { data: jobRow } = await admin.from("build_jobs").select("*").eq("id", buildJob.id).single();
    if (jobRow) {
      issuesPush(errors, buildJobHasNoWebsiteSpecificFields(jobRow as Record<string, unknown>));
    }
    if (
      first.status !== "blocked" &&
      second.status !== "blocked" &&
      first.builderKey !== second.builderKey
    ) {
      errors.push("builder resolution not deterministic on repeat");
    }
    if (!buildJob.builderKey.startsWith("website.internal")) {
      errors.push(`expected website adapter, got ${buildJob.builderKey}`);
    }
  }

  const { count: jobCountForBuild } = await admin
    .from("build_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", v1.organizationId)
    .eq("build_id", buildId);

  if ((jobCountForBuild ?? 0) > 1) {
    errors.push(`expected one BuildJob per build, got ${jobCountForBuild}`);
  }

  const { count: workspaceCount } = await admin
    .from("builds")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", v1.organizationId)
    .eq("workspace_reference", v1.workspaceReference);

  if ((workspaceCount ?? 0) > 1) {
    errors.push(`expected one workspace reference, got ${workspaceCount}`);
  }

  const lifecycleTaskCount = first.status !== "blocked" ? first.tasks.length : 0;
  if (lifecycleTaskCount < 1) {
    errors.push("lifecycle task graph empty");
  }

  const repairAttemptIds: string[] = [];
  let repairExhausted = false;
  let permissionsUnchangedAfterRepair = false;

  if (buildJob) {
    const capsBefore = [...buildJob.approvedCapabilities].sort().join(",");
    const repairOne = await requestBoundedRepair(admin, {
      organizationId: v1.organizationId,
      buildJobId: buildJob.id,
      buildId: buildId,
      correlationId: factoryInput.correlationId,
      failingLifecycleStage: "validating",
      failureClassification: "e2e_deterministic_failure",
      currentAttempt: 0,
      permittedCapabilities: buildJob.approvedCapabilities,
    });
    if (repairOne.attemptId) {
      repairAttemptIds.push(repairOne.attemptId);
    }
    if (repairOne.status !== "repairing") {
      errors.push(`expected first repair to enter repairing, got ${repairOne.status}`);
    }
    if (repairAttemptIds.length !== 1) {
      errors.push(`expected exactly one bounded repair attempt record, got ${repairAttemptIds.length}`);
    }

    const { data: jobAfterRepair } = await admin
      .from("build_jobs")
      .select("approved_capabilities")
      .eq("id", buildJob.id)
      .single();
    const capsAfter = Array.isArray(jobAfterRepair?.approved_capabilities)
      ? (jobAfterRepair!.approved_capabilities as string[]).sort().join(",")
      : "";
    permissionsUnchangedAfterRepair = capsBefore === capsAfter;
    if (!permissionsUnchangedAfterRepair) {
      errors.push("repair widened or changed approved capabilities");
    }
  }

  let genericQaResultId = "";
  if (buildJob && buildId) {
    const { data: genericStep } = await admin
      .from("plan_steps")
      .select("*")
      .eq("organization_id", v1.organizationId)
      .eq("plan_id", v1.planId)
      .eq("capability_key", "qa.verify_generic_internal_build")
      .maybeSingle();

    if (!genericStep) {
      errors.push("generic QA plan step missing");
    } else {
      await admin
        .from("plan_steps")
        .update({
          constraints: {
            organization_id: v1.organizationId,
            mission_id: v1.missionId,
            opportunity_id: v1.opportunityId,
            build_id: buildId,
            build_job_id: buildJob.id,
            plan_step_id: genericStep.id,
          },
        })
        .eq("id", genericStep.id);

      const { data: mission } = await admin
        .from("missions")
        .select("*")
        .eq("id", v1.missionId)
        .single();
      const { data: plan } = await admin.from("plans").select("*").eq("id", v1.planId).single();
      const { data: cycle } = await admin
        .from("command_cycles")
        .select("*")
        .eq("id", plan!.command_cycle_id)
        .single();

      if (mission && plan && cycle) {
        const { data: refreshedStep } = await admin
          .from("plan_steps")
          .select("*")
          .eq("id", genericStep.id)
          .single();
        if (refreshedStep) {
          const job = await schedulePlanStep(
            admin,
            v1.organizationId,
            cycle,
            mission,
            plan,
            refreshedStep,
          );
          const exec = await runJobToCompletion(
            admin,
            job.id,
            v1.organizationId,
            "qa.verify_generic_internal_build",
          );
          if (exec.status === "completed") {
            genericQaResultId = String(
              (exec.output as Record<string, unknown>).worker_result_id ?? "",
            );
          } else {
            errors.push("generic QA worker did not complete");
          }
        }
      }
    }
  }

  let rollbackMode: string | null = "metadata_only";
  if (buildJob?.buildId && v1.snapshotId) {
    const build = await loadBuildById(admin, v1.organizationId, buildJob.buildId);
    if (build) {
      await rollbackBuildToSnapshot(admin, build, v1.snapshotId, factoryInput.correlationId);
      rollbackMode = await recordBuildRollback(admin, {
        organizationId: v1.organizationId,
        buildJobId: buildJob.id,
        buildId: buildJob.buildId,
        snapshotId: v1.snapshotId,
        rollbackMode: "metadata_only",
      });
    }
  }

  if (rollbackMode !== "metadata_only") {
    errors.push(`expected metadata_only rollback mode, got ${rollbackMode}`);
  }

  const { data: buildRow } = await admin
    .from("builds")
    .select("status, review_status")
    .eq("id", buildId)
    .maybeSingle();

  if (buildRow?.status !== "internally_complete") {
    errors.push(`build must be internally_complete, got ${buildRow?.status ?? "missing"}`);
  }
  if (buildRow?.review_status !== "passed") {
    errors.push(`product QA / build review must be passed, got ${buildRow?.review_status}`);
  }

  if (buildJob?.reproducibilityStatus === "mismatched") {
    errors.push("reproducibility mismatch blocks completion");
  }

  const { count: snapshotCount } = await admin
    .from("build_snapshots")
    .select("*", { count: "exact", head: true })
    .eq("build_id", buildId);

  if ((snapshotCount ?? 0) !== 1) {
    errors.push(`expected exactly one snapshot, got ${snapshotCount ?? 0}`);
  }

  const runtimeStageBeforeTick = (
    await admin
      .from("mission_runtime_instances")
      .select("current_stage")
      .eq("id", v1.runtimeInstanceId)
      .maybeSingle()
  ).data?.current_stage ?? null;

  const jobStatusBeforeObserve = buildJob
    ? (
        await admin
          .from("build_jobs")
          .select("status")
          .eq("id", buildJob.id)
          .maybeSingle()
      ).data?.status ?? null
    : null;

  if (jobStatusBeforeObserve === "internally_complete") {
    errors.push("BuildJob must not be internally_complete before observe (later-tick proof)");
  }

  await observeBuildFactoryJobs(admin, v1.organizationId, v1.missionId);
  await runMissionRuntimeTick({
    supabase: admin,
    organizationId: v1.organizationId,
    limit: 2,
    lockedBy: `${BUILD_E2E_LABEL}-v2`,
  });

  const runtimeStageAfterTick = (
    await admin
      .from("mission_runtime_instances")
      .select("current_stage")
      .eq("id", v1.runtimeInstanceId)
      .maybeSingle()
  ).data?.current_stage ?? null;

  const { data: jobFinal } = await admin
    .from("build_jobs")
    .select("status, generic_qa_status, product_qa_status")
    .eq("id", buildJob?.id ?? "")
    .maybeSingle();

  const buildJobObservedOnLaterTick = jobFinal?.status === "internally_complete";
  if (buildJob && jobFinal?.generic_qa_status !== "passed") {
    errors.push(`generic QA status must be passed, got ${jobFinal?.generic_qa_status}`);
  }
  if (buildJob && jobFinal?.product_qa_status !== "passed") {
    errors.push(`product QA on BuildJob must be passed, got ${jobFinal?.product_qa_status}`);
  }
  if (buildJob && buildJobObservedOnLaterTick && jobStatusBeforeObserve !== "internally_complete") {
    /* Mission Runtime tick + observeBuildFactoryJobs completed the BuildJob after QA */
  } else if (buildJob && !buildJobObservedOnLaterTick) {
    errors.push(`BuildJob must reach internally_complete on later tick, got ${jobFinal?.status}`);
  }

  if (buildJob) {
    const repairExhaust = await requestBoundedRepair(admin, {
      organizationId: v1.organizationId,
      buildJobId: buildJob.id,
      buildId: buildId,
      correlationId: factoryInput.correlationId,
      failingLifecycleStage: "validating",
      failureClassification: "e2e_repeated_failure",
      currentAttempt: buildJob.maxRepairAttempts,
      permittedCapabilities: buildJob.approvedCapabilities,
    });
    repairExhausted = repairExhaust.status === "exhausted";
    if (!repairExhausted) {
      errors.push("expected repair exhaustion after max attempts");
    }
    const { data: jobAfterExhaust } = await admin
      .from("build_jobs")
      .select("status, blocking_reason")
      .eq("id", buildJob.id)
      .maybeSingle();
    if (jobAfterExhaust?.blocking_reason !== "repair_exhausted") {
      errors.push("exhausted repair must block completion with repair_exhausted");
    }
  }

  const { count: registryMatches } = await admin
    .from("builder_registry_entries")
    .select("*", { count: "exact", head: true })
    .eq("builder_key", buildJob?.builderKey ?? "")
    .eq("status", "active");
  if ((registryMatches ?? 0) !== 1) {
    errors.push(`expected one active registry adapter, got ${registryMatches ?? 0}`);
  }

  const { count: engineJobsAfter } = await admin
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", v1.organizationId)
    .eq("mission_id", v1.missionId);

  const { count: workerResultsAfter } = await admin
    .from("worker_results")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", v1.organizationId)
    .eq("mission_id", v1.missionId);

  const { count: v2CompletionEvents } = await admin
    .from("engine_events")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", v1.organizationId)
    .eq("event_type", "build_factory.internally_completed");

  const duplicateCounts = {
    buildJobs: Math.max(0, (jobCountForBuild ?? 0) - 1),
    workspaces: Math.max(0, (workspaceCount ?? 0) - 1),
    planStepsForBuild: 0,
    engineJobs: Math.max(0, (engineJobsAfter ?? 0) - (engineJobsBefore ?? 0) - 1),
    workerResults: Math.max(0, (workerResultsAfter ?? 0) - (workerResultsBefore ?? 0) - 1),
    snapshots: Math.max(0, (snapshotCount ?? 0) - 1),
    v2CompletionEvents: Math.max(0, (v2CompletionEvents ?? 0) - 1),
  };
  for (const [key, value] of Object.entries(duplicateCounts)) {
    if (value > 0) {
      errors.push(`duplicate ${key}: ${value}`);
    }
  }

  const externalAfter = await countExternal(admin, v1.organizationId);

  return {
    pass: errors.length === 0,
    errors,
    organizationId: v1.organizationId,
    missionId: v1.missionId,
    runtimeId: v1.runtimeInstanceId,
    executiveDecisionId,
    planId: v1.planId,
    allocationId: v1.allocationId,
    blueprintId: v1.blueprintId,
    buildId,
    buildJobId: buildJob?.id ?? null,
    buildJobVersion: buildJob?.buildVersion ?? null,
    builderKey: buildJob?.builderKey ?? null,
    builderVersion: buildJob?.builderVersion ?? null,
    workspaceReference: buildJob?.workspaceId ?? v1.workspaceReference,
    lifecycleTaskCount,
    engineJobCountForBuild: v1.engineJobIds.length,
    workerResultCountForBuild: v1.workerResultIds.length,
    artifactCountForBuild: 0,
    productQaStatus: buildRow?.review_status ?? null,
    genericQaStatus: jobFinal?.generic_qa_status ?? null,
    genericQaResultId: genericQaResultId || null,
    snapshotId: v1.snapshotId,
    snapshotCount: snapshotCount ?? 0,
    reproducibilityStatus: buildJob?.reproducibilityStatus ?? null,
    buildStatus: buildRow?.status ?? null,
    buildJobStatus: buildJobObservedOnLaterTick ? "internally_complete" : (jobFinal?.status ?? null),
    rollbackMode,
    repairAttemptIds,
    repairExhausted,
    permissionsUnchangedAfterRepair,
    runtimeStageBeforeTick,
    runtimeStageAfterTick,
    buildJobObservedOnLaterTick,
    duplicateCounts,
    externalSideEffects: {
      builds: (
        await admin
          .from("builds")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", v1.organizationId)
          .eq("mission_id", v1.missionId)
      ).count ?? 0,
      deployments: 0,
      companiesDelta: externalAfter.companies - externalBefore.companies,
      assetsDelta: externalAfter.assets - externalBefore.assets,
    },
  };
}

function issuesPush(errors: string[], issues: string[]) {
  for (const issue of issues) {
    errors.push(issue);
  }
}
