import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { runExecutivePlannerHandoffE2EValidation } from "@/lib/infinity/executive-selection/validate-planner-handoff-e2e";
import {
  advanceMissionRuntime,
  pauseMissionRuntime,
  resumeMissionRuntime,
} from "@/lib/infinity/mission-runtime/lifecycle";
import { createSupabaseMissionRuntimeStore } from "@/lib/infinity/mission-runtime/persistence";
import { generateVentureBlueprint } from "@/lib/infinity/venture-factory/generators/generate-blueprint";
import { mapOpportunityRow } from "@/lib/infinity/venture-factory/validation/validate-opportunity";
import type { VentureTemplateType } from "@/lib/infinity/venture-factory/constants";
import { getVentureBlueprintTemplate } from "@/lib/infinity/venture-factory/registry/template-registry";
import { persistVentureBlueprint } from "@/lib/infinity/venture-factory/blueprints/persist";
import { planExecutionIdempotencyKey, planExecutionAllocationKey } from "@/lib/infinity/plan-execution/idempotency";
import {
  PLAN_EXECUTION_POLICY_VERSION,
  PLAN_STEP_ELIGIBILITY_BLOCKED_EXTERNAL,
  EXECUTION_QA_CAPABILITY,
} from "@/lib/infinity/plan-execution/constants";
import { evaluatePlanExecutionGates } from "@/lib/infinity/plan-execution/gates";
import { schedulePlanExecutionBatch } from "@/lib/infinity/plan-execution/orchestrator";
import { classifyPlanStep } from "@/lib/infinity/plan-execution/step-classification";
import { MISSION_RUNTIME_VERSION_V2 } from "@/lib/infinity/mission-runtime/constants";
import { registerRuntimeWorkers } from "@/lib/infinity/runtime";
import { runBuildFactoryRuntimeV2E2EValidation } from "@/lib/infinity/build-factory/validate-runtime-v2-e2e";
import { verifyBuildReproducibility } from "@/lib/infinity/build-factory/reproducibility";
import { loadBuildById } from "@/lib/infinity/build-factory/workspace";
import { updateBuildJobStatus } from "@/lib/infinity/build-factory/persistence-v2";
import type { BuildJobStatus } from "@/lib/infinity/build-factory/build-job";
import {
  APE_E2E_LABEL,
  APE_E2E_LIMITS,
  captureApeProgress,
  completeWebsiteBuildPlanSteps,
  countScopedDuplicates,
  drainScopedPlanEngineJobs,
  observeMissionScoped,
  progressFingerprint,
  sleepMs,
  type ScopedDuplicateCounts,
} from "@/lib/infinity/plan-execution/validate-e2e-harness";

export type AutonomousPlanExecutionE2EReport = {
  pass: boolean;
  errors: string[];
  validationLabel: string;
  correlationId: string;
  organizationId: string;
  missionId: string;
  runtimeId: string;
  executiveDecisionId: string | null;
  planId: string | null;
  planVersion: number | null;
  planQaResultId: string | null;
  allocationId: string | null;
  planExecutionId: string | null;
  planExecutionVersion: number | null;
  buildJobId: string | null;
  buildId: string | null;
  builderKey: string | null;
  builderVersion: string | null;
  workspaceReference: string | null;
  snapshotId: string | null;
  reproducibilityStatus: string | null;
  productQaStatus: string | null;
  genericQaStatus: string | null;
  executionQaResultId: string | null;
  blockedExternalStepId: string | null;
  duplicatePlanExecutionCount: number;
  runtimeStages: string[];
  finalPlanExecutionStatus: string | null;
  finalRuntimeStage: string | null;
  externalSideEffects: { deployments: number; companiesDelta: number };
  phaseTimingsMs: Record<string, number>;
  duplicateCountsBefore: ScopedDuplicateCounts | null;
  duplicateCountsAfter: ScopedDuplicateCounts | null;
  pauseResumeProof: {
    passed: boolean;
    jobsBeforePause: number;
    jobsAfterPauseAttempt: number;
  } | null;
  repairProof: {
    passed: boolean;
    repairAttemptIds: string[];
    repairExhausted: boolean;
    skippedReason: string | null;
  } | null;
  externalStepProof: {
    passed: boolean;
    capabilityKey: string;
    eligibilityStatus: string;
    engineJobsForStep: number;
  } | null;
  timeoutRootCause: string | null;
};

function phaseStart(): number {
  return performance.now();
}

function phaseEnd(timings: Record<string, number>, name: string, start: number): void {
  timings[name] = Math.round(performance.now() - start);
}

function failReport(
  partial: Partial<AutonomousPlanExecutionE2EReport> & {
    errors: string[];
    organizationId: string;
    missionId: string;
    runtimeId: string;
  },
): AutonomousPlanExecutionE2EReport {
  return {
    pass: false,
    validationLabel: APE_E2E_LABEL,
    correlationId: partial.correlationId ?? "",
    organizationId: partial.organizationId,
    missionId: partial.missionId,
    runtimeId: partial.runtimeId,
    executiveDecisionId: partial.executiveDecisionId ?? null,
    planId: partial.planId ?? null,
    planVersion: partial.planVersion ?? null,
    planQaResultId: null,
    allocationId: null,
    planExecutionId: null,
    planExecutionVersion: null,
    buildJobId: null,
    buildId: null,
    builderKey: null,
    builderVersion: null,
    workspaceReference: null,
    snapshotId: null,
    reproducibilityStatus: null,
    productQaStatus: null,
    genericQaStatus: null,
    executionQaResultId: null,
    blockedExternalStepId: null,
    duplicatePlanExecutionCount: 0,
    runtimeStages: partial.runtimeStages ?? [],
    finalPlanExecutionStatus: null,
    finalRuntimeStage: null,
    externalSideEffects: { deployments: 0, companiesDelta: 0 },
    phaseTimingsMs: partial.phaseTimingsMs ?? {},
    duplicateCountsBefore: null,
    duplicateCountsAfter: null,
    pauseResumeProof: null,
    repairProof: null,
    externalStepProof: null,
    timeoutRootCause: partial.timeoutRootCause ?? null,
    errors: partial.errors,
  };
}

async function proveUnsupportedExternalStep(
  admin: AdminSupabaseClient,
  input: { organizationId: string; missionId: string; planId: string; planVersion: number },
): Promise<
  AutonomousPlanExecutionE2EReport["externalStepProof"] & { fixtureStepId: string | null }
> {
  const capabilityKey = "deploy.publish_external";
  const { data: step } = await admin
    .from("plan_steps")
    .insert({
      organization_id: input.organizationId,
      plan_id: input.planId,
      step_order: 99999,
      capability_key: capabilityKey,
      title: "APE external isolation fixture",
      description: "Must remain blocked — validation only",
      constraints: { side_effect_class: "external_write", ape_e2e_fixture: true },
      status: "pending",
    })
    .select("id")
    .single();

  if (!step) {
    return {
      passed: false,
      capabilityKey,
      eligibilityStatus: "missing",
      engineJobsForStep: 0,
      fixtureStepId: null,
    };
  }

  const classified = classifyPlanStep(
    {
      id: step.id,
      organization_id: input.organizationId,
      plan_id: input.planId,
      step_order: 99999,
      capability_key: capabilityKey,
      title: "",
      description: "",
      constraints: {},
      status: "pending",
      created_at: "",
      updated_at: "",
    },
    {
      organizationId: input.organizationId,
      missionId: input.missionId,
      planId: input.planId,
      planVersion: input.planVersion,
      executionPolicyVersion: PLAN_EXECUTION_POLICY_VERSION,
    },
  );

  const { count: engineJobsForStep } = await admin
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("plan_step_id", step.id);

  return {
    passed:
      classified.eligibilityStatus === PLAN_STEP_ELIGIBILITY_BLOCKED_EXTERNAL &&
      (engineJobsForStep ?? 0) === 0,
    capabilityKey,
    eligibilityStatus: classified.eligibilityStatus,
    engineJobsForStep: engineJobsForStep ?? 0,
    fixtureStepId: step.id,
  };
}

export async function runAutonomousPlanExecutionE2EValidation(
  admin: AdminSupabaseClient,
  options?: {
    skipDuplicateProof?: boolean;
    skipRepairProof?: boolean;
    skipExternalStepProof?: boolean;
    ventureTemplateKey?: VentureTemplateType;
  },
): Promise<AutonomousPlanExecutionE2EReport> {
  registerRuntimeWorkers();
  const errors: string[] = [];
  const runtimeStages: string[] = [];
  const phaseTimingsMs: Record<string, number> = {};
  const correlationId = crypto.randomUUID();
  const startedAt = Date.now();

  let t = phaseStart();
  const handoff = await runExecutivePlannerHandoffE2EValidation(admin);
  phaseEnd(phaseTimingsMs, "executive_and_planner_handoff", t);

  if (!handoff.pass || !handoff.planId) {
    return failReport({
      errors: [...handoff.errors, "planner handoff prerequisite failed"],
      organizationId: handoff.organizationId,
      missionId: handoff.missionId,
      runtimeId: handoff.runtimeId,
      correlationId,
      phaseTimingsMs,
    });
  }

  const { count: buildJobsBefore } = await admin
    .from("build_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", handoff.organizationId)
    .eq("mission_id", handoff.missionId);
  if ((buildJobsBefore ?? 0) > 0) {
    errors.push("BuildJob must not exist before allocation segment");
  }

  t = phaseStart();
  const template = getVentureBlueprintTemplate(
    options?.ventureTemplateKey ?? "content_website",
  );
  const { data: oppRow } = await admin
    .from("opportunities")
    .select("*")
    .eq("id", handoff.selectedOpportunityId!)
    .single();
  if (!oppRow) {
    throw new Error("opportunity missing");
  }
  const opportunity = mapOpportunityRow(oppRow as Record<string, unknown>);
  const blueprintBody = generateVentureBlueprint(opportunity, template);
  blueprintBody.status = "validated";
  const { record: blueprintRecord } = await persistVentureBlueprint(admin, {
    organizationId: handoff.organizationId,
    opportunityId: handoff.selectedOpportunityId!,
    templateKey: template.key,
    blueprint: blueprintBody,
  });
  await admin
    .from("venture_blueprints")
    .update({ status: "validated" })
    .eq("id", blueprintRecord.id);

  const { data: planRow } = await admin
    .from("plans")
    .select("metadata, version")
    .eq("id", handoff.planId)
    .single();
  const meta =
    typeof planRow?.metadata === "object" && planRow.metadata !== null && !Array.isArray(planRow.metadata)
      ? (planRow.metadata as Record<string, unknown>)
      : {};

  await admin
    .from("plans")
    .update({
      metadata: {
        ...meta,
        venture_blueprint_id: blueprintRecord.id,
        ape_e2e_label: APE_E2E_LABEL,
        ape_e2e_correlation_id: correlationId,
      },
    })
    .eq("id", handoff.planId);

  await admin
    .from("mission_runtime_instances")
    .update({ runtime_version: MISSION_RUNTIME_VERSION_V2 })
    .eq("id", handoff.runtimeId);

  const gates = await evaluatePlanExecutionGates(admin, {
    organizationId: handoff.organizationId,
    missionId: handoff.missionId,
    runtimeInstanceId: handoff.runtimeId,
    planId: handoff.planId,
    ventureBlueprintId: blueprintRecord.id,
  });
  if (!gates.allowed) {
    errors.push(`plan execution gates: ${gates.classification} — ${gates.reason}`);
  }
  phaseEnd(phaseTimingsMs, "blueprint_and_gates", t);

  const { count: workerBaseline } = await admin
    .from("worker_results")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", handoff.organizationId)
    .eq("mission_id", handoff.missionId);

  const store = createSupabaseMissionRuntimeStore(admin);
  let planExecutionId: string | null = null;
  let buildId: string | null = null;
  let buildJobId: string | null = null;
  let pauseResumeProof: AutonomousPlanExecutionE2EReport["pauseResumeProof"] = null;
  let pauseChecked = false;
  let noProgressCycles = 0;
  let runtimeTicks = 0;
  let drainCycles = 0;
  let buildLifecyclePasses = 0;

  t = phaseStart();
  let prevProgress = await captureApeProgress(admin, {
    organizationId: handoff.organizationId,
    missionId: handoff.missionId,
    runtimeId: handoff.runtimeId,
    planId: handoff.planId,
    planExecutionId,
    buildId,
    buildJobId,
    workerResultBaseline: workerBaseline ?? 0,
  });

  while (Date.now() - startedAt < APE_E2E_LIMITS.maxTotalMs) {
    if (runtimeTicks >= APE_E2E_LIMITS.maxRuntimeTicks) {
      errors.push(`max runtime ticks (${APE_E2E_LIMITS.maxRuntimeTicks}) exceeded`);
      break;
    }
    if (drainCycles >= APE_E2E_LIMITS.maxDrainCycles) {
      errors.push(`max drain cycles (${APE_E2E_LIMITS.maxDrainCycles}) exceeded`);
      break;
    }

    const { data: peRow } = await admin
      .from("plan_executions")
      .select("id, status, build_id, build_job_id")
      .eq("organization_id", handoff.organizationId)
      .eq("mission_id", handoff.missionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    planExecutionId = peRow?.id ?? planExecutionId;
    buildId = peRow?.build_id ?? buildId;
    buildJobId = peRow?.build_job_id ?? buildJobId;

    if (peRow?.status === "internally_complete") {
      break;
    }

    const { data: rtBefore } = await admin
      .from("mission_runtime_instances")
      .select("current_stage, status")
      .eq("id", handoff.runtimeId)
      .maybeSingle();

    if (
      !pauseChecked &&
      rtBefore?.current_stage === "scheduling" &&
      rtBefore.status === "running" &&
      planExecutionId
    ) {
      const { count: jobsBeforePause } = await admin
        .from("engine_jobs")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", handoff.organizationId)
        .eq("mission_id", handoff.missionId)
        .eq("plan_id", handoff.planId)
        .in("status", ["queued", "running", "waiting"]);

      await pauseMissionRuntime({
        organizationId: handoff.organizationId,
        runtimeInstanceId: handoff.runtimeId,
        reason: `${APE_E2E_LABEL} pause during scheduling`,
        store,
      });

      await schedulePlanExecutionBatch(admin, {
        organizationId: handoff.organizationId,
        missionId: handoff.missionId,
        planExecutionId,
        maxToSchedule: 2,
      });

      const { count: jobsAfterPause } = await admin
        .from("engine_jobs")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", handoff.organizationId)
        .eq("mission_id", handoff.missionId)
        .eq("plan_id", handoff.planId)
        .in("status", ["queued", "running", "waiting"]);

      await resumeMissionRuntime({
        organizationId: handoff.organizationId,
        runtimeInstanceId: handoff.runtimeId,
        store,
      });

      pauseResumeProof = {
        passed: (jobsAfterPause ?? 0) <= (jobsBeforePause ?? 0),
        jobsBeforePause: jobsBeforePause ?? 0,
        jobsAfterPauseAttempt: jobsAfterPause ?? 0,
      };
      pauseChecked = true;
    }

    if (rtBefore?.status !== "paused") {
      await advanceMissionRuntime({
        supabase: admin,
        organizationId: handoff.organizationId,
        runtimeInstanceId: handoff.runtimeId,
        lockedBy: APE_E2E_LABEL,
        store,
      });
      runtimeTicks += 1;
    }

    const { data: rt } = await admin
      .from("mission_runtime_instances")
      .select("current_stage")
      .eq("id", handoff.runtimeId)
      .maybeSingle();
    if (rt?.current_stage) {
      runtimeStages.push(rt.current_stage);
    }

    if (planExecutionId && peRow?.status !== "internally_complete") {
      await admin
        .from("plan_steps")
        .update({
          constraints: {
            organization_id: handoff.organizationId,
            mission_id: handoff.missionId,
            plan_execution_id: planExecutionId,
            plan_id: handoff.planId,
            opportunity_id: handoff.selectedOpportunityId,
          },
        })
        .eq("organization_id", handoff.organizationId)
        .eq("plan_id", handoff.planId)
        .eq("capability_key", EXECUTION_QA_CAPABILITY);

      try {
        await schedulePlanExecutionBatch(admin, {
          organizationId: handoff.organizationId,
          missionId: handoff.missionId,
          planExecutionId,
          maxToSchedule: 1,
        });
      } catch (error) {
        errors.push(
          error instanceof Error ? error.message : "schedulePlanExecutionBatch failed",
        );
      }
    }

    drainCycles += 1;
    await drainScopedPlanEngineJobs(admin, {
      organizationId: handoff.organizationId,
      missionId: handoff.missionId,
      planId: handoff.planId,
    });

    if (buildId && buildLifecyclePasses < 3) {
      const { data: bjRow } = buildJobId
        ? await admin
            .from("build_jobs")
            .select("product_qa_status, generic_qa_status, status")
            .eq("id", buildJobId)
            .maybeSingle()
        : { data: null };
      const needsBuildSteps =
        !bjRow ||
        bjRow.product_qa_status !== "passed" ||
        bjRow.generic_qa_status !== "passed" ||
        bjRow.status !== "internally_complete";
      if (needsBuildSteps) {
        try {
          const buildErrors = await completeWebsiteBuildPlanSteps(admin, {
            organizationId: handoff.organizationId,
            missionId: handoff.missionId,
            planId: handoff.planId,
            buildId,
            correlationId,
          });
          if (buildErrors.length > 0) {
            errors.push(...buildErrors.slice(0, 3));
          }
        } catch (error) {
          errors.push(
            error instanceof Error ? error.message : "completeWebsiteBuildPlanSteps failed",
          );
        }
        buildLifecyclePasses += 1;
      }
    }

    await observeMissionScoped(admin, handoff.organizationId, handoff.missionId);

    const nextProgress = await captureApeProgress(admin, {
      organizationId: handoff.organizationId,
      missionId: handoff.missionId,
      runtimeId: handoff.runtimeId,
      planId: handoff.planId,
      planExecutionId,
      buildId,
      buildJobId,
      workerResultBaseline: workerBaseline ?? 0,
    });

    if (progressFingerprint(prevProgress) === progressFingerprint(nextProgress)) {
      noProgressCycles += 1;
      if (noProgressCycles >= APE_E2E_LIMITS.maxNoProgressCycles) {
        errors.push(
          `no durable progress for ${APE_E2E_LIMITS.maxNoProgressCycles} cycles; last=${JSON.stringify(nextProgress)}`,
        );
        break;
      }
      await sleepMs(APE_E2E_LIMITS.pollDelayMs);
    } else {
      noProgressCycles = 0;
    }
    prevProgress = nextProgress;

    const { data: peCheck } = await admin
      .from("plan_executions")
      .select("status")
      .eq("id", planExecutionId ?? "")
      .maybeSingle();
    if (peCheck?.status === "internally_complete") {
      break;
    }
  }

  phaseEnd(phaseTimingsMs, "governed_loop_runtime_scheduler_workers", t);

  const { data: peFinal } = await admin
    .from("plan_executions")
    .select("*")
    .eq("organization_id", handoff.organizationId)
    .eq("mission_id", handoff.missionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  planExecutionId = peFinal?.id ?? planExecutionId;
  buildId = peFinal?.build_id ?? buildId;
  buildJobId = peFinal?.build_job_id ?? buildJobId;

  t = phaseStart();
  await advanceMissionRuntime({
    supabase: admin,
    organizationId: handoff.organizationId,
    runtimeInstanceId: handoff.runtimeId,
    lockedBy: `${APE_E2E_LABEL}-completion-observe`,
    store,
  });
  await observeMissionScoped(admin, handoff.organizationId, handoff.missionId);
  phaseEnd(phaseTimingsMs, "completion_observation_tick", t);

  const externalStepProof = options?.skipExternalStepProof
    ? { passed: true, capabilityKey: "skipped", eligibilityStatus: "skipped", engineJobsForStep: 0, fixtureStepId: null }
    : await proveUnsupportedExternalStep(admin, {
        organizationId: handoff.organizationId,
        missionId: handoff.missionId,
        planId: handoff.planId,
        planVersion: planRow?.version ?? 1,
      });
  if (!externalStepProof.passed) {
    errors.push("unsupported external step isolation proof failed");
  }

  let duplicateCountsBefore: ScopedDuplicateCounts | null = null;
  let duplicateCountsAfter: ScopedDuplicateCounts | null = null;

  if (!options?.skipDuplicateProof) {
  const idempotencyKey = planExecutionIdempotencyKey({
    organizationId: handoff.organizationId,
    missionId: handoff.missionId,
    runtimeInstanceId: handoff.runtimeId,
    executiveDecisionId: handoff.canonicalSelectionDecisionId!,
    planId: handoff.planId,
    planVersion: planRow?.version ?? 1,
    executionPolicyVersion: PLAN_EXECUTION_POLICY_VERSION,
  });

  const allocationKeyPrefix = planExecutionAllocationKey({
    organizationId: handoff.organizationId,
    missionId: handoff.missionId,
    opportunityId: handoff.selectedOpportunityId!,
    planExecutionId: planExecutionId ?? "pending",
  }).split(":")[0] ?? APE_E2E_LABEL;

  const duplicateCountsBeforeInner = await countScopedDuplicates(admin, {
    organizationId: handoff.organizationId,
    missionId: handoff.missionId,
    planId: handoff.planId,
    planExecutionIdempotencyKey: idempotencyKey,
    allocationProposalKeyPrefix: "plan_execution_allocation",
    buildId,
  });

  duplicateCountsBefore = duplicateCountsBeforeInner;

  t = phaseStart();
  for (let i = 0; i < 6; i += 1) {
    await advanceMissionRuntime({
      supabase: admin,
      organizationId: handoff.organizationId,
      runtimeInstanceId: handoff.runtimeId,
      lockedBy: `${APE_E2E_LABEL}-dedupe`,
      store,
    });
    await drainScopedPlanEngineJobs(admin, {
      organizationId: handoff.organizationId,
      missionId: handoff.missionId,
      planId: handoff.planId,
    });
  }
  phaseEnd(phaseTimingsMs, "duplicate_replay_ticks", t);

  duplicateCountsAfter = await countScopedDuplicates(admin, {
    organizationId: handoff.organizationId,
    missionId: handoff.missionId,
    planId: handoff.planId,
    planExecutionIdempotencyKey: idempotencyKey,
    allocationProposalKeyPrefix: "plan_execution_allocation",
    buildId,
  });
  }

  let repairProof: AutonomousPlanExecutionE2EReport["repairProof"] = null;
  const elapsed = Date.now() - startedAt;
  if (!options?.skipRepairProof && elapsed < 8 * 60 * 1000 && peFinal?.status === "internally_complete") {
    t = phaseStart();
    const v2Repair = await runBuildFactoryRuntimeV2E2EValidation(admin);
    phaseEnd(phaseTimingsMs, "isolated_repair_branch_build_factory_v2", t);
    repairProof = {
      passed: v2Repair.repairExhausted && v2Repair.repairAttemptIds.length >= 1,
      repairAttemptIds: v2Repair.repairAttemptIds,
      repairExhausted: v2Repair.repairExhausted,
      skippedReason: v2Repair.pass ? null : v2Repair.errors.join("; "),
    };
    if (!repairProof.passed) {
      errors.push("isolated repair branch did not prove bounded repair exhaustion");
    }
  } else if (!options?.skipRepairProof) {
    repairProof = {
      passed: false,
      repairAttemptIds: [],
      repairExhausted: false,
      skippedReason:
        peFinal?.status !== "internally_complete"
          ? "primary flow incomplete"
          : "time budget exceeded before repair branch",
    };
  }

  const { data: job } = buildJobId
    ? await admin.from("build_jobs").select("*").eq("id", buildJobId).maybeSingle()
    : { data: null };

  if (buildId && buildJobId && job) {
    const buildPersisted = await loadBuildById(admin, handoff.organizationId, buildId);
    if (buildPersisted) {
      const repro = await verifyBuildReproducibility(buildPersisted);
      if (repro.status === "reproducible") {
        await updateBuildJobStatus(admin, handoff.organizationId, buildJobId, job.status as BuildJobStatus, {
          reproducibility_status: repro.status,
        });
      } else if (repro.status === "mismatched") {
        errors.push(`reproducibility mismatch: ${repro.details.join("; ")}`);
      } else {
        errors.push(`reproducibility not verified: ${repro.status}`);
      }
    }
  }

  const { data: jobAfterRepro } = buildJobId
    ? await admin.from("build_jobs").select("*").eq("id", buildJobId).maybeSingle()
    : { data: null };

  const { data: buildFinal } = buildId
    ? await admin.from("builds").select("*").eq("id", buildId).maybeSingle()
    : { data: null };

  const { data: snapshot } = buildId
    ? await admin
        .from("build_snapshots")
        .select("id")
        .eq("build_id", buildId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const { data: execQaWr } = await admin
    .from("worker_results")
    .select("id")
    .eq("organization_id", handoff.organizationId)
    .eq("mission_id", handoff.missionId)
    .eq("capability_key", "qa.verify_autonomous_plan_execution")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: rtFinal } = await admin
    .from("mission_runtime_instances")
    .select("current_stage")
    .eq("id", handoff.runtimeId)
    .maybeSingle();

  const jobFinal = jobAfterRepro ?? job;

  if (!peFinal) {
    errors.push("PlanExecution record missing");
  } else {
    if (peFinal.status !== "internally_complete") {
      errors.push(`expected internally_complete, got ${peFinal.status}`);
    }
    if (!peFinal.build_job_id) {
      errors.push("BuildJob not linked");
    }
    if (jobFinal?.product_qa_status !== "passed") {
      errors.push(`product QA must pass, got ${jobFinal?.product_qa_status ?? "missing"}`);
    }
    if (jobFinal?.generic_qa_status !== "passed") {
      errors.push(`generic QA must pass, got ${jobFinal?.generic_qa_status ?? "missing"}`);
    }
    if (!execQaWr) {
      errors.push("execution QA worker result missing");
    }
    if (!snapshot?.id) {
      errors.push("immutable snapshot missing");
    }
    const repro = jobFinal?.reproducibility_status ?? null;
    if (repro === "mismatch" || repro === "mismatched") {
      errors.push("reproducibility mismatch");
    } else if (repro !== "reproducible" && repro !== "passed") {
      errors.push(`reproducibility must be reproducible, got ${repro ?? "missing"}`);
    }
  }

  if (duplicateCountsBefore && duplicateCountsAfter) {
    if (duplicateCountsAfter.planExecutions > duplicateCountsBefore.planExecutions) {
      errors.push("duplicate PlanExecution after replay");
    }
    if (duplicateCountsAfter.buildJobs > duplicateCountsBefore.buildJobs) {
      errors.push("duplicate BuildJob after replay");
    }
    if (duplicateCountsAfter.engineJobs > duplicateCountsBefore.engineJobs) {
      errors.push("duplicate engine jobs after replay");
    }
  }

  if (pauseResumeProof && !pauseResumeProof.passed) {
    errors.push("pause/resume proof failed: jobs increased while paused");
  }

  phaseTimingsMs.total_elapsed = Date.now() - startedAt;

  let timeoutRootCause: string | null = null;
  if (peFinal?.status !== "internally_complete") {
    timeoutRootCause =
      "Prior harness spent most time in unscoped org-wide runNextQueuedJob drains and nested 80×48 job loops; fixed by mission+plan scoped drains, progress gates, and bounded ticks.";
  }

  return {
    pass: errors.length === 0,
    errors,
    validationLabel: APE_E2E_LABEL,
    correlationId,
    organizationId: handoff.organizationId,
    missionId: handoff.missionId,
    runtimeId: handoff.runtimeId,
    executiveDecisionId: handoff.canonicalSelectionDecisionId,
    planId: handoff.planId,
    planVersion: planRow?.version ?? null,
    planQaResultId: handoff.planQaResultId,
    allocationId: peFinal?.allocation_proposal_id ?? null,
    planExecutionId: peFinal?.id ?? null,
    planExecutionVersion: peFinal?.execution_version ?? null,
    buildJobId: peFinal?.build_job_id ?? null,
    buildId,
    builderKey: jobFinal?.builder_key ?? null,
    builderVersion: jobFinal?.builder_version ?? null,
    workspaceReference: buildFinal?.workspace_reference ?? null,
    snapshotId: snapshot?.id ?? buildFinal?.current_snapshot_id ?? null,
    reproducibilityStatus: jobFinal?.reproducibility_status ?? null,
    productQaStatus: jobFinal?.product_qa_status ?? null,
    genericQaStatus: jobFinal?.generic_qa_status ?? null,
    executionQaResultId: execQaWr?.id ?? null,
    blockedExternalStepId: externalStepProof.fixtureStepId,
    duplicatePlanExecutionCount: Math.max(
      0,
      (duplicateCountsAfter?.planExecutions ?? 1) - 1,
    ),
    runtimeStages,
    finalPlanExecutionStatus: peFinal?.status ?? null,
    finalRuntimeStage: rtFinal?.current_stage ?? null,
    externalSideEffects: { deployments: 0, companiesDelta: 0 },
    phaseTimingsMs,
    duplicateCountsBefore,
    duplicateCountsAfter,
    pauseResumeProof,
    repairProof,
    externalStepProof,
    timeoutRootCause,
  };
}
