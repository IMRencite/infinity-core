import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { registerRuntimeWorkers, executeJob } from "@/lib/infinity/runtime";
import { schedulePlanStep } from "@/lib/infinity/scheduler";
import { ensureFoundingMission } from "@/lib/infinity/missions";
import { runMissionRuntimeTick } from "@/lib/infinity/mission-runtime";
import { observeGovernedWorkerPlanSteps } from "@/lib/infinity/workers/observe-plan-steps";
import { observeBuildFactoryBuilds } from "@/lib/infinity/build-factory/observe-builds";
import { requestBuildFactory } from "@/lib/infinity/build-factory/factory";
import { buildIdempotencyKey } from "@/lib/infinity/build-factory/specifications";
import { rejectPathTraversalAttempt } from "@/lib/infinity/build-factory/sandbox";
import { BUILD_E2E_LABEL } from "@/lib/infinity/build-factory/constants";
import { ensureDefaultValidationModel } from "@/lib/infinity/validation/models";
import { generateVentureBlueprint } from "@/lib/infinity/venture-factory/generators/generate-blueprint";
import { getVentureBlueprintTemplate } from "@/lib/infinity/venture-factory/registry/template-registry";
import { persistVentureBlueprint } from "@/lib/infinity/venture-factory/blueprints/persist";

export type BuildFactoryE2EReport = {
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string;
  opportunityId: string;
  validationRunId: string;
  executiveDecisionId: string;
  planId: string;
  allocationId: string;
  blueprintId: string;
  buildId: string;
  specificationVersion: string;
  manifestHash: string;
  workspaceReference: string;
  taskIds: string[];
  engineJobIds: string[];
  workerResultIds: string[];
  qaResultId: string;
  snapshotId: string;
  buildCountForIdempotencyKey: number;
  workspaceCount: number;
  taskCountBefore: number;
  taskCountAfter: number;
  completionEventCount: number;
  externalCountsUnchanged: boolean;
  pass: boolean;
  errors: string[];
};

export function assertBuildFactoryE2EAllowed(): void {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv === "production" && process.env.ALLOW_BUILD_FACTORY_E2E !== "true") {
    throw new Error("Build Factory E2E is development-only.");
  }
}

export async function runJobToCompletion(
  admin: AdminSupabaseClient,
  engineJobId: string,
  organizationId: string,
  label: string,
): Promise<Awaited<ReturnType<typeof executeJob>>> {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    try {
      const exec = await executeJob(admin, {
        engineJobId,
        organizationId,
        executorId: BUILD_E2E_LABEL,
      });
      if (exec.status === "completed" || exec.status === "already_terminal") {
        return exec;
      }
      if (exec.status !== "waiting") {
        return exec;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("retry is not yet due")) {
        throw error;
      }
    }
    const { data: jobRow } = await admin
      .from("engine_jobs")
      .select("available_at, last_error, status")
      .eq("id", engineJobId)
      .maybeSingle();
    const waitUntil = jobRow?.available_at ? Date.parse(jobRow.available_at) : Date.now() + 800;
    const delay = Math.max(500, waitUntil - Date.now() + 50);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  const { data: jobRow } = await admin
    .from("engine_jobs")
    .select("last_error, error_message, status")
    .eq("id", engineJobId)
    .maybeSingle();
  throw new Error(
    `${label} did not complete after retries: ${JSON.stringify(jobRow?.last_error ?? jobRow?.error_message)}`,
  );
}

export async function runBuildFactoryE2EValidation(
  admin: AdminSupabaseClient,
): Promise<BuildFactoryE2EReport> {
  assertBuildFactoryE2EAllowed();
  registerRuntimeWorkers();
  const errors: string[] = [];

  const orgId =
    process.env.BUILD_E2E_ORGANIZATION_ID ??
    (await admin.from("organizations").select("id").limit(1).maybeSingle()).data?.id;

  if (!orgId) {
    throw new Error("No organization for build factory E2E");
  }

  await admin
    .from("worker_results")
    .update({
      status: "failed",
      failed_at: new Date().toISOString(),
    })
    .eq("organization_id", orgId)
    .like("capability_key", "build.%")
    .eq("status", "running");

  const externalBefore = await countExternal(admin, orgId);
  const { mission } = await ensureFoundingMission(admin, orgId);

  const { data: opp, error: oppErr } = await admin
    .from("opportunities")
    .insert({
      organization_id: orgId,
      name: `${BUILD_E2E_LABEL} opp`,
      slug: `build-factory-e2e-${Date.now()}`,
      status: "approved",
      decision: "pending",
      discovered_at: new Date().toISOString(),
      assumptions: {},
      monetization_models: [],
      risks: {},
    })
    .select("id")
    .single();

  if (oppErr || !opp) {
    throw new Error(oppErr?.message ?? "opp");
  }

  const model = await ensureDefaultValidationModel(admin, orgId);
  const { data: validationRun, error: vrErr } = await admin
    .from("validation_runs")
    .insert({
      organization_id: orgId,
      opportunity_id: opp.id,
      mission_id: mission.id,
      validation_model_id: model.id,
      run_key: `${BUILD_E2E_LABEL}:${opp.id}`,
      recommendation: "approved_for_planning",
      run_status: "completed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      summary: { e2e: BUILD_E2E_LABEL },
    })
    .select("id")
    .single();

  if (vrErr || !validationRun) {
    throw new Error(vrErr?.message ?? "validation");
  }

  const correlationId = crypto.randomUUID();
  const { data: cycle } = await admin
    .from("command_cycles")
    .insert({
      organization_id: orgId,
      mission_id: mission.id,
      status: "completed",
      trigger_source: "system",
      correlation_id: correlationId,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      summary: { e2e: BUILD_E2E_LABEL },
    })
    .select("*")
    .single();

  const { data: decision, error: decErr } = await admin
    .from("command_decisions")
    .insert({
      organization_id: orgId,
      mission_id: mission.id,
      command_cycle_id: cycle!.id,
      decision_type: "build_e2e",
      outcome: "build_e2e_validation",
      reasoning: "Development build factory E2E fixture.",
      confidence: 1,
      payload: { e2e: BUILD_E2E_LABEL },
    })
    .select("id")
    .single();

  if (decErr || !decision) {
    throw new Error(decErr?.message ?? "decision");
  }

  const { data: allocation, error: allocErr } = await admin
    .from("allocation_proposals")
    .insert({
      organization_id: orgId,
      mission_id: mission.id,
      opportunity_id: opp.id,
      allocation_type: "build",
      expected_outcome: "internal_build",
      proposal_key: `${BUILD_E2E_LABEL}:${opp.id}`,
      status: "approved",
      approved_at: new Date().toISOString(),
      requested_resources: { cost_usd: 0 },
      approved_resources: { cost_usd: 0 },
      rationale: "Zero-cost internal build E2E",
    })
    .select("id")
    .single();

  if (allocErr || !allocation) {
    throw new Error(allocErr?.message ?? "allocation");
  }

  const template = getVentureBlueprintTemplate("content_website");
  const blueprintBody = generateVentureBlueprint(
    {
      id: opp.id,
      organizationId: orgId,
      name: "E2E Content Site",
      summary: "E2E",
      problem: null,
      targetCustomer: null,
      industry: null,
      category: null,
      businessModel: null,
      recommendedBuilder: null,
      status: "approved",
      decision: "pending",
      overallScore: 70,
      confidenceScore: 70,
    },
    template,
  );
  blueprintBody.status = "validated";

  const { record: blueprintRecord } = await persistVentureBlueprint(admin, {
    organizationId: orgId,
    opportunityId: opp.id,
    blueprint: blueprintBody,
    templateKey: template.key,
  });

  await admin
    .from("venture_blueprints")
    .update({ status: "validated" })
    .eq("id", blueprintRecord.id)
    .eq("organization_id", orgId);

  const { data: existingRuntime } = await admin
    .from("mission_runtime_instances")
    .select("id")
    .eq("mission_id", mission.id)
    .in("status", ["ready", "running", "waiting", "blocked", "paused"])
    .maybeSingle();

  let runtimeId = existingRuntime?.id ?? "";
  if (!runtimeId) {
    const { data: runtime, error: runtimeError } = await admin
      .from("mission_runtime_instances")
      .insert({
        organization_id: orgId,
        mission_id: mission.id,
        status: "running",
        current_stage: "execution",
        runtime_version: "v2",
        context: { e2e: BUILD_E2E_LABEL },
      })
      .select("id")
      .single();
    if (runtimeError || !runtime) {
      throw new Error(runtimeError?.message ?? "mission runtime instance required for build E2E");
    }
    runtimeId = runtime.id;
  }

  const { data: plan } = await admin
    .from("plans")
    .insert({
      organization_id: orgId,
      mission_id: mission.id,
      command_cycle_id: cycle!.id,
      command_decision_id: decision.id,
      title: `${BUILD_E2E_LABEL} plan`,
      status: "active",
      metadata: { e2e: BUILD_E2E_LABEL, label: "development validation only" },
    })
    .select("*")
    .single();

  if (!plan) {
    throw new Error("plan");
  }

  const factoryInput = {
    organizationId: orgId,
    missionId: mission.id,
    runtimeInstanceId: runtimeId,
    opportunityId: opp.id,
    ventureBlueprintId: blueprintRecord.id,
    planId: plan.id,
    allocationProposalId: allocation.id,
    correlationId,
  };

  const first = await requestBuildFactory(admin, factoryInput);
  if (first.status === "blocked") {
    errors.push(`Build blocked: ${first.reason}`);
  }

  const build = first.status !== "blocked" ? first.build : null;
  if (!build) {
    return failReport(errors, orgId, mission.id, runtimeId, opp.id, validationRun.id, decision.id, plan.id, blueprintRecord.id);
  }

  const spec = build.specification;
  const idempotencyKey = buildIdempotencyKey({
    organizationId: orgId,
    missionId: mission.id,
    ventureBlueprintId: blueprintRecord.id,
    planId: plan.id,
    buildVersion: spec.buildVersion,
    specificationHash: spec.specificationHash,
  });

  const second = await requestBuildFactory(admin, factoryInput);
  if (second.status !== "reused") {
    errors.push(`Expected reused build on duplicate request, got ${second.status}`);
  }

  const { count: buildCount } = await admin
    .from("builds")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("idempotency_key", idempotencyKey);

  const { data: taskSteps } = await admin
    .from("plan_steps")
    .select("id, capability_key")
    .eq("organization_id", orgId)
    .eq("plan_id", plan.id)
    .filter("constraints->>build_id", "eq", build.id)
    .order("step_order", { ascending: true });

  const taskCountBefore = taskSteps?.length ?? 0;
  await requestBuildFactory(admin, factoryInput);
  const { data: taskStepsAfter } = await admin
    .from("plan_steps")
    .select("id")
    .eq("organization_id", orgId)
    .eq("plan_id", plan.id)
    .filter("constraints->>build_id", "eq", build.id);

  const engineJobIds: string[] = [];
  const workerResultIds: string[] = [];
  let packageWorkerResultId = "";
  let snapshotWorkerResultId = "";
  const isWebsiteBuild = (taskSteps ?? []).some((s) =>
    s.capability_key.startsWith("website."),
  );

  for (const step of taskSteps ?? []) {
    if (
      step.capability_key === "qa.verify_internal_build" ||
      step.capability_key === "qa.verify_internal_website" ||
      step.capability_key === "qa.verify_ai_generated_website"
    ) {
      continue;
    }
    if (isWebsiteBuild && step.capability_key === "build.snapshot_workspace") {
      continue;
    }
    const { data: fullStep } = await admin.from("plan_steps").select("*").eq("id", step.id).single();
    if (!fullStep) continue;
    const job = await schedulePlanStep(admin, orgId, cycle!, mission, plan, fullStep);
    engineJobIds.push(job.id);
    const exec = await runJobToCompletion(admin, job.id, orgId, step.capability_key);
    if (exec.status === "completed") {
      const out = exec.output as Record<string, unknown>;
      if (typeof out.worker_result_id === "string") {
        workerResultIds.push(out.worker_result_id);
      }
      if (step.capability_key === "build.snapshot_workspace") {
        snapshotWorkerResultId = String(out.worker_result_id ?? "");
      }
      if (step.capability_key === "website.package_internal_source") {
        packageWorkerResultId = String(out.worker_result_id ?? "");
      }
    } else {
      const { data: failedJob } = await admin
        .from("engine_jobs")
        .select("last_error, status, error_message")
        .eq("id", job.id)
        .maybeSingle();
      errors.push(
        `Job ${step.capability_key} status ${exec.status}: ${JSON.stringify(failedJob?.last_error ?? failedJob?.error_message)}`,
      );
    }
  }

  const qaStep = (taskSteps ?? []).find(
    (s) =>
      s.capability_key === "qa.verify_internal_build" ||
      s.capability_key === "qa.verify_internal_website" ||
      s.capability_key === "qa.verify_ai_generated_website",
  );
  let qaResultId = "";
  const qaTargetWorkerResultId = isWebsiteBuild
    ? packageWorkerResultId
    : snapshotWorkerResultId;
  if (qaStep && qaTargetWorkerResultId) {
    await admin
      .from("plan_steps")
      .update({
        constraints: {
          organization_id: orgId,
          mission_id: mission.id,
          opportunity_id: opp.id,
          build_id: build.id,
          worker_result_id: qaTargetWorkerResultId,
          plan_step_id: qaStep.id,
        },
      })
      .eq("id", qaStep.id);

    const { data: qaFull } = await admin.from("plan_steps").select("*").eq("id", qaStep.id).single();
    if (qaFull) {
      const qaJob = await schedulePlanStep(admin, orgId, cycle!, mission, plan, qaFull);
      engineJobIds.push(qaJob.id);
      const qaExec = await runJobToCompletion(
        admin,
        qaJob.id,
        orgId,
        qaStep.capability_key,
      );
      if (qaExec.status === "completed") {
        qaResultId = String((qaExec.output as Record<string, unknown>).worker_result_id ?? "");
        workerResultIds.push(qaResultId);
      } else {
        errors.push("QA job failed");
      }
    }
  }

  if (isWebsiteBuild) {
    const { data: buildBeforeSnapshot } = await admin
      .from("builds")
      .select("review_status")
      .eq("id", build.id)
      .maybeSingle();

    if (buildBeforeSnapshot?.review_status !== "passed") {
      if (!qaResultId) {
        errors.push(
          `Independent QA did not pass before snapshot (review_status=${buildBeforeSnapshot?.review_status ?? "unknown"}, packageWorkerResultId=${packageWorkerResultId || "missing"})`,
        );
      } else {
        const { data: qaWr } = await admin
          .from("worker_results")
          .select("structured_output")
          .eq("id", qaResultId)
          .maybeSingle();
        errors.push(
          `Independent QA did not pass before snapshot: ${JSON.stringify(qaWr?.structured_output ?? {})}`,
        );
      }
    } else {
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
          const snapJob = await schedulePlanStep(admin, orgId, cycle!, mission, plan, snapFull);
          engineJobIds.push(snapJob.id);
          const snapExec = await runJobToCompletion(
            admin,
            snapJob.id,
            orgId,
            "build.snapshot_workspace",
          );
          if (snapExec.status === "completed") {
            snapshotWorkerResultId = String(
              (snapExec.output as Record<string, unknown>).worker_result_id ?? "",
            );
            workerResultIds.push(snapshotWorkerResultId);
          } else {
            errors.push("Website snapshot job failed");
          }
        }
      }
    }
  }

  await observeGovernedWorkerPlanSteps(admin, orgId, mission.id);
  await observeBuildFactoryBuilds(admin, orgId, mission.id);
  await runMissionRuntimeTick({
    supabase: admin,
    organizationId: orgId,
    limit: 3,
    lockedBy: BUILD_E2E_LABEL,
  });

  const { data: buildFinal } = await admin
    .from("builds")
    .select("status, review_status, current_snapshot_id")
    .eq("id", build.id)
    .maybeSingle();

  if (buildFinal?.status !== "internally_complete") {
    errors.push(`Expected internally_complete, got ${buildFinal?.status}`);
  }

  try {
    rejectPathTraversalAttempt("../outside");
  } catch {
    /* expected */
  }

  const { count: completionEvents } = await admin
    .from("engine_events")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("event_type", "build.internally_completed")
    .contains("payload", { build_id: build.id } as Record<string, unknown>);

  const externalAfter = await countExternal(admin, orgId);
  const externalCountsUnchanged =
    externalBefore.companies === externalAfter.companies &&
    externalBefore.assets === externalAfter.assets;

  const { count: workspaceCount } = await admin
    .from("builds")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("workspace_reference", build.workspaceReference);

  return {
    organizationId: orgId,
    missionId: mission.id,
    runtimeInstanceId: runtimeId,
    opportunityId: opp.id,
    validationRunId: validationRun.id,
    executiveDecisionId: decision.id,
    planId: plan.id,
    allocationId: allocation.id,
    blueprintId: blueprintRecord.id,
    buildId: build.id,
    specificationVersion: build.specificationVersion,
    manifestHash: build.manifestHash,
    workspaceReference: build.workspaceReference,
    taskIds: (taskSteps ?? []).map((s) => s.id),
    engineJobIds,
    workerResultIds,
    qaResultId,
    snapshotId: buildFinal?.current_snapshot_id ?? "",
    buildCountForIdempotencyKey: buildCount ?? 0,
    workspaceCount: workspaceCount ?? 0,
    taskCountBefore,
    taskCountAfter: taskStepsAfter?.length ?? 0,
    completionEventCount: completionEvents ?? 0,
    externalCountsUnchanged,
    pass: errors.length === 0,
    errors,
  };
}

async function countExternal(admin: AdminSupabaseClient, orgId: string) {
  const companies = await admin.from("companies").select("*", { count: "exact", head: true }).eq("organization_id", orgId);
  const assets = await admin.from("assets").select("*", { count: "exact", head: true }).eq("organization_id", orgId);
  return { companies: companies.count ?? 0, assets: assets.count ?? 0 };
}

function failReport(
  errors: string[],
  organizationId: string,
  missionId: string,
  runtimeInstanceId: string,
  opportunityId: string,
  validationRunId: string,
  executiveDecisionId: string,
  planId: string,
  blueprintId: string,
): BuildFactoryE2EReport {
  return {
    organizationId,
    missionId,
    runtimeInstanceId,
    opportunityId,
    validationRunId,
    executiveDecisionId,
    planId,
    allocationId: "",
    blueprintId,
    buildId: "",
    specificationVersion: "",
    manifestHash: "",
    workspaceReference: "",
    taskIds: [],
    engineJobIds: [],
    workerResultIds: [],
    qaResultId: "",
    snapshotId: "",
    buildCountForIdempotencyKey: 0,
    workspaceCount: 0,
    taskCountBefore: 0,
    taskCountAfter: 0,
    completionEventCount: 0,
    externalCountsUnchanged: true,
    pass: false,
    errors,
  };
}
