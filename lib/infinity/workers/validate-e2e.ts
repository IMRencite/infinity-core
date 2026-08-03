import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { registerRuntimeWorkers, executeJob } from "@/lib/infinity/runtime";
import { resolveCapability } from "@/lib/infinity/registry";
import { schedulePlanStep } from "@/lib/infinity/scheduler";
import { ensureFoundingMission } from "@/lib/infinity/missions";
import { runMissionRuntimeTick } from "@/lib/infinity/mission-runtime";
import { observeGovernedWorkerPlanSteps } from "@/lib/infinity/workers/observe-plan-steps";
import { getWorkerCapabilityContract } from "@/lib/infinity/workers/capability";
import { validateStructuredOutput } from "@/lib/infinity/workers/validation";
import { buildWorkerExecutionKey, hashWorkerInput } from "@/lib/infinity/workers/input-schema";
import { ensureDefaultValidationModel } from "@/lib/infinity/validation/models";
import { registerEvidenceSource } from "@/lib/infinity/intelligence/sources";
import { recordEvidence } from "@/lib/infinity/intelligence/evidence";

const RESEARCH_CAPABILITY = "research.summarize_internal_evidence";
const QA_CAPABILITY = "qa.verify_plan_step_output";
const E2E_LABEL = "worker_capability_e2e_dev_v1";

function readCompletedJob(
  exec: Awaited<ReturnType<typeof executeJob>>,
  label: string,
): { workerRunId: string; output: Record<string, unknown> } {
  if (exec.status !== "completed") {
    throw new Error(`${label} did not complete: ${exec.status}`);
  }
  const output =
    typeof exec.output === "object" && exec.output !== null && !Array.isArray(exec.output)
      ? (exec.output as Record<string, unknown>)
      : {};
  return { workerRunId: exec.workerRun.id, output };
}

export type WorkerE2EValidationReport = {
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string | null;
  planId: string;
  planStepId: string;
  qaPlanStepId: string;
  engineJobId: string;
  duplicateEngineJobId: string;
  workerRunId: string;
  workerResultId: string;
  qaResultId: string;
  artifactIds: string[];
  executionKey: string;
  workerResultCountForExecutionKey: number;
  completionEventCount: number;
  reuseEventCount: number;
  reviewRequestCount: number;
  runtimeTransitionBeforeReview: string | null;
  runtimeTransitionAfterReview: string | null;
  planStepStatusAfterReview: string;
  externalCountsUnchanged: boolean;
  pass: boolean;
  errors: string[];
};

export function assertWorkerE2EAllowed(): void {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const allow = process.env.ALLOW_WORKER_E2E === "true";
  if (nodeEnv === "production" && !allow) {
    throw new Error(
      "Worker E2E validation is development-only. Set ALLOW_WORKER_E2E=true to override in production.",
    );
  }
  if (process.env.VERCEL_ENV === "production" && !allow) {
    throw new Error("Worker E2E validation blocked on Vercel production.");
  }
}

async function countTable(
  admin: AdminSupabaseClient,
  table: "companies" | "assets" | "venture_blueprints",
  organizationId: string,
): Promise<number> {
  const { count } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  return count ?? 0;
}

async function listWorkerEvents(
  admin: AdminSupabaseClient,
  organizationId: string,
  workerResultId: string,
): Promise<{ eventType: string; createdAt: string }[]> {
  const { data } = await admin
    .from("engine_events")
    .select("event_type, created_at, payload")
    .eq("organization_id", organizationId)
    .like("event_type", "worker.%")
    .order("created_at", { ascending: true });

  return (data ?? [])
    .filter((row) => {
      if (typeof row.payload !== "object" || row.payload === null || Array.isArray(row.payload)) {
        return false;
      }
      const payload = row.payload as Record<string, unknown>;
      if (
        payload.worker_result_id === workerResultId ||
        payload.reviewed_worker_result_id === workerResultId
      ) {
        return true;
      }
      const output = payload.output;
      if (typeof output === "object" && output !== null && !Array.isArray(output)) {
        return (output as Record<string, unknown>).worker_result_id === workerResultId;
      }
      return false;
    })
    .map((row) => ({
      eventType: row.event_type,
      createdAt: row.created_at,
    }));
}

async function latestRuntimeTransition(
  admin: AdminSupabaseClient,
  organizationId: string,
  runtimeInstanceId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("mission_runtime_transitions")
    .select("to_stage")
    .eq("organization_id", organizationId)
    .eq("runtime_instance_id", runtimeInstanceId)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.to_stage ?? null;
}

async function ensureRuntimeInstance(
  admin: AdminSupabaseClient,
  organizationId: string,
  missionId: string,
): Promise<string> {
  const { data: existing } = await admin
    .from("mission_runtime_instances")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error } = await admin
    .from("mission_runtime_instances")
    .insert({
      organization_id: organizationId,
      mission_id: missionId,
      status: "running",
      current_stage: "execution",
      runtime_version: "v2",
      context: { e2e: E2E_LABEL },
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create runtime instance: ${error?.message ?? "unknown"}`);
  }

  return created.id;
}

async function ensureApprovedOpportunity(
  admin: AdminSupabaseClient,
  organizationId: string,
  missionId: string,
): Promise<{ opportunityId: string; evidenceId: string }> {
  const { data: existingOpp } = await admin
    .from("opportunities")
    .select("id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let opportunityId = existingOpp?.id;

  if (!opportunityId) {
    const { data: opp, error } = await admin
      .from("opportunities")
      .insert({
        organization_id: organizationId,
        name: `${E2E_LABEL} opportunity`,
        slug: `${E2E_LABEL}-${Date.now()}`,
        status: "approved",
        decision: "pending",
        discovered_at: new Date().toISOString(),
        assumptions: {},
        monetization_models: [],
        risks: {},
      })
      .select("id")
      .single();
    if (error || !opp) {
      throw new Error(`Failed to create opportunity: ${error?.message}`);
    }
    opportunityId = opp.id;
  }

  const model = await ensureDefaultValidationModel(admin, organizationId);
  const { data: existingRun } = await admin
    .from("validation_runs")
    .select("id, recommendation")
    .eq("organization_id", organizationId)
    .eq("opportunity_id", opportunityId)
    .eq("recommendation", "approved_for_planning")
    .limit(1)
    .maybeSingle();

  if (!existingRun) {
    const { error: vrError } = await admin.from("validation_runs").insert({
      organization_id: organizationId,
      opportunity_id: opportunityId,
      mission_id: missionId,
      validation_model_id: model.id,
      run_key: `${E2E_LABEL}:${opportunityId}`,
      recommendation: "approved_for_planning",
      run_status: "completed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      summary: { e2e: E2E_LABEL },
    });
    if (vrError) {
      throw new Error(`Failed to seed validation run: ${vrError.message}`);
    }
  }

  const source = await registerEvidenceSource(admin, {
    organizationId,
    sourceType: "internal_event",
    name: `${E2E_LABEL} source`,
    reliabilityStatus: "trusted",
    metadata: { e2e: E2E_LABEL },
  });

  const evidence = await recordEvidence(admin, {
    organizationId,
    sourceId: source.id,
    evidenceType: "other",
    title: `${E2E_LABEL} evidence`,
    summary: "Deterministic internal evidence for worker E2E validation.",
    structuredData: { e2e: E2E_LABEL },
    metadata: { e2e: E2E_LABEL },
  });

  return { opportunityId, evidenceId: evidence.id };
}

async function createCommandFixtures(
  admin: AdminSupabaseClient,
  organizationId: string,
  missionId: string,
) {
  const correlationId = crypto.randomUUID();
  const { data: cycle, error: cycleError } = await admin
    .from("command_cycles")
    .insert({
      organization_id: organizationId,
      mission_id: missionId,
      status: "completed",
      trigger_source: "system",
      correlation_id: correlationId,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      summary: { e2e: E2E_LABEL },
    })
    .select("*")
    .single();

  if (cycleError || !cycle) {
    throw new Error(`Failed to create command cycle: ${cycleError?.message}`);
  }

  const { data: decision, error: decisionError } = await admin
    .from("command_decisions")
    .insert({
      organization_id: organizationId,
      mission_id: missionId,
      command_cycle_id: cycle.id,
      decision_type: "worker_e2e",
      outcome: "worker_e2e_validation",
      reasoning: "Development-only worker capability E2E validation fixture.",
      confidence: 1,
      payload: { e2e: E2E_LABEL },
    })
    .select("*")
    .single();

  if (decisionError || !decision) {
    throw new Error(`Failed to create command decision: ${decisionError?.message}`);
  }

  return { cycle, decision, correlationId };
}

export async function runWorkerCapabilityE2EValidation(
  admin: AdminSupabaseClient,
): Promise<WorkerE2EValidationReport> {
  assertWorkerE2EAllowed();
  registerRuntimeWorkers();

  const errors: string[] = [];
  const orgId =
    process.env.WORKER_E2E_ORGANIZATION_ID ??
    (await admin.from("organizations").select("id").limit(1).maybeSingle()).data?.id;

  if (!orgId) {
    throw new Error("No organization available for worker E2E validation.");
  }

  const externalBefore = {
    companies: await countTable(admin, "companies", orgId),
    assets: await countTable(admin, "assets", orgId),
    blueprints: await countTable(admin, "venture_blueprints", orgId),
  };

  const { mission } = await ensureFoundingMission(admin, orgId);
  const missionId = mission.id;

  const { opportunityId, evidenceId } = await ensureApprovedOpportunity(admin, orgId, missionId);
  const runtimeInstanceId = await ensureRuntimeInstance(admin, orgId, missionId);

  const { cycle, decision } = await createCommandFixtures(admin, orgId, missionId);

  const { data: plan, error: planError } = await admin
    .from("plans")
    .insert({
      organization_id: orgId,
      mission_id: missionId,
      command_cycle_id: cycle.id,
      command_decision_id: decision.id,
      title: `${E2E_LABEL} plan`,
      status: "active",
      metadata: { e2e: E2E_LABEL, label: "development validation only" },
    })
    .select("*")
    .single();

  if (planError || !plan) {
    throw new Error(`Failed to create plan: ${planError?.message}`);
  }

  const researchPayload = {
    organization_id: orgId,
    mission_id: missionId,
    opportunity_id: opportunityId,
    evidence_record_ids: [evidenceId],
    constraints: { opportunity_id: opportunityId, mission_id: missionId, e2e: E2E_LABEL },
  } satisfies Json as Json;

  const { data: researchStep, error: stepError } = await admin
    .from("plan_steps")
    .insert({
      organization_id: orgId,
      plan_id: plan.id,
      step_order: 1,
      capability_key: RESEARCH_CAPABILITY,
      title: `${E2E_LABEL} research step`,
      description: "Development validation research worker step",
      constraints: researchPayload,
      status: "pending",
    })
    .select("*")
    .single();

  if (stepError || !researchStep) {
    throw new Error(`Failed to create research plan step: ${stepError?.message}`);
  }

  const capability = await resolveCapability(admin, orgId, RESEARCH_CAPABILITY);
  const researchJob = await schedulePlanStep(admin, orgId, cycle, mission, plan, researchStep);

  const { count: jobCountForStep } = await admin
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("plan_step_id", researchStep.id);

  if ((jobCountForStep ?? 0) !== 1) {
    errors.push(`Expected exactly 1 engine job for plan step, got ${jobCountForStep ?? 0}`);
  }

  const researchExec = await executeJob(admin, {
    engineJobId: researchJob.id,
    organizationId: orgId,
    executorId: E2E_LABEL,
  });

  if (researchExec.status !== "completed") {
    errors.push(`Research worker job did not complete: ${researchExec.status}`);
  }

  const researchCompleted =
    researchExec.status === "completed" ? readCompletedJob(researchExec, "Research") : null;
  const workerRunId = researchCompleted?.workerRunId ?? "";
  const output = researchCompleted?.output ?? {};
  const workerResultId = String(output.worker_result_id ?? "");

  const { data: workerResultRow } = await admin
    .from("worker_results")
    .select("*")
    .eq("id", workerResultId)
    .maybeSingle();

  const executionKey =
    workerResultRow?.execution_key ??
    buildWorkerExecutionKey({
      organizationId: orgId,
      missionId,
      planId: plan.id,
      planStepId: researchStep.id,
      capabilityKey: RESEARCH_CAPABILITY,
      capabilityVersion: capability.version,
      inputHash: hashWorkerInput(researchJob.payload),
    });

  const { data: resultsForKey } = await admin
    .from("worker_results")
    .select("id")
    .eq("organization_id", orgId)
    .eq("execution_key", executionKey);

  const workerResultCountForExecutionKey = resultsForKey?.length ?? 0;
  if (workerResultCountForExecutionKey !== 1) {
    errors.push(
      `Expected 1 worker_result for execution key, got ${workerResultCountForExecutionKey}`,
    );
  }

  const contract = getWorkerCapabilityContract(RESEARCH_CAPABILITY)!;
  const schemaCheck = validateStructuredOutput(
    contract,
    (workerResultRow?.structured_output ?? {}) as Record<string, unknown>,
  );
  if (!schemaCheck.valid) {
    errors.push(`Output schema validation failed: ${schemaCheck.errors.join("; ")}`);
  }

  const { data: artifacts } = await admin
    .from("worker_artifacts")
    .select("id")
    .eq("organization_id", orgId)
    .eq("worker_result_id", workerResultId);

  const artifactIds = (artifacts ?? []).map((a) => a.id);
  if (artifactIds.length < 1) {
    errors.push("Expected at least one internal worker artifact for research capability.");
  }

  const eventsAfterResearch = await listWorkerEvents(admin, orgId, workerResultId);
  const reviewRequestCount = eventsAfterResearch.filter(
    (e) => e.eventType === "worker.review_requested",
  ).length;
  if (reviewRequestCount !== 1) {
    errors.push(`Expected 1 review_requested event, got ${reviewRequestCount}`);
  }

  const completionEventCountAfterFirst = eventsAfterResearch.filter(
    (e) => e.eventType === "worker.execution_completed",
  ).length;

  const runtimeTransitionBeforeReview = await latestRuntimeTransition(
    admin,
    orgId,
    runtimeInstanceId,
  );

  const { data: planStepBeforeReview } = await admin
    .from("plan_steps")
    .select("status")
    .eq("id", researchStep.id)
    .maybeSingle();

  if (planStepBeforeReview?.status === "completed") {
    errors.push("Research plan step must remain incomplete before independent QA review.");
  }

  await observeGovernedWorkerPlanSteps(admin, orgId, missionId);
  await runMissionRuntimeTick({
    supabase: admin,
    organizationId: orgId,
    limit: 5,
    lockedBy: `${E2E_LABEL}-pre-review`,
  });

  const { data: planStepStillPending } = await admin
    .from("plan_steps")
    .select("status")
    .eq("id", researchStep.id)
    .maybeSingle();

  if (planStepStillPending?.status === "completed") {
    errors.push("Mission Runtime must not complete governed step before review passes.");
  }

  const { data: qaStep, error: qaStepError } = await admin
    .from("plan_steps")
    .insert({
      organization_id: orgId,
      plan_id: plan.id,
      step_order: 2,
      capability_key: QA_CAPABILITY,
      title: `${E2E_LABEL} QA step`,
      description: "Independent QA review of research worker output",
      constraints: {
        organization_id: orgId,
        mission_id: missionId,
        plan_step_id: researchStep.id,
        worker_result_id: workerResultId,
        opportunity_id: opportunityId,
        e2e: E2E_LABEL,
      },
      status: "pending",
    })
    .select("*")
    .single();

  if (qaStepError || !qaStep) {
    throw new Error(`Failed to create QA plan step: ${qaStepError?.message}`);
  }

  const qaJob = await schedulePlanStep(admin, orgId, cycle, mission, plan, qaStep);
  const qaExec = await executeJob(admin, {
    engineJobId: qaJob.id,
    organizationId: orgId,
    executorId: E2E_LABEL,
  });

  if (qaExec.status !== "completed") {
    errors.push(`QA worker job did not complete: ${qaExec.status}`);
  }

  const qaCompleted = qaExec.status === "completed" ? readCompletedJob(qaExec, "QA") : null;
  const qaResultId = String(qaCompleted?.output.worker_result_id ?? "");

  if (qaCompleted && workerRunId && qaCompleted.workerRunId === workerRunId) {
    errors.push("QA worker run must not reuse the producing worker run id.");
  }

  const { data: reviewedTarget } = await admin
    .from("worker_results")
    .select("review_status, worker_run_id")
    .eq("id", workerResultId)
    .maybeSingle();

  if (reviewedTarget?.review_status !== "passed") {
    errors.push(`Expected target review_status passed, got ${reviewedTarget?.review_status}`);
  }

  if (reviewedTarget?.worker_run_id === qaCompleted?.workerRunId) {
    errors.push("Producing worker must not approve its own result via QA run id match.");
  }

  await observeGovernedWorkerPlanSteps(admin, orgId, missionId);
  await runMissionRuntimeTick({
    supabase: admin,
    organizationId: orgId,
    limit: 1,
    lockedBy: E2E_LABEL,
  });

  const { data: planStepAfter } = await admin
    .from("plan_steps")
    .select("status")
    .eq("id", researchStep.id)
    .maybeSingle();

  const runtimeTransitionAfterReview = await latestRuntimeTransition(
    admin,
    orgId,
    runtimeInstanceId,
  );

  if (planStepAfter?.status !== "completed") {
    errors.push(`Expected research plan step completed after review, got ${planStepAfter?.status}`);
  }

  const { count: artifactCountBeforeDup } = await admin
    .from("worker_artifacts")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("worker_result_id", workerResultId);

  const { data: dupJob, error: dupJobError } = await admin
    .from("engine_jobs")
    .insert({
      organization_id: orgId,
      mission_id: missionId,
      command_cycle_id: cycle.id,
      plan_id: plan.id,
      plan_step_id: researchStep.id,
      capability_key: RESEARCH_CAPABILITY,
      resolved_capability_id: capability.id,
      resolved_engine_name: capability.engine_name ?? "worker_capability_engine",
      resolved_version: capability.version,
      status: "queued",
      priority: 100,
      idempotency_key: `${researchJob.idempotency_key}:dup-e2e`,
      correlation_id: crypto.randomUUID(),
      available_at: new Date().toISOString(),
      max_attempts: 3,
      timeout_seconds: 300,
      payload: researchJob.payload,
    })
    .select("*")
    .single();

  if (dupJobError || !dupJob) {
    throw new Error(`Failed to create duplicate engine job: ${dupJobError?.message}`);
  }

  const dupExec = await executeJob(admin, {
    engineJobId: dupJob.id,
    organizationId: orgId,
    executorId: `${E2E_LABEL}-dup`,
  });

  const dupCompleted = dupExec.status === "completed" ? readCompletedJob(dupExec, "Duplicate") : null;

  if (dupCompleted && String(dupCompleted.output.worker_result_id ?? "") !== workerResultId) {
    errors.push("Duplicate execution must return the original worker result ID.");
  }

  const { count: artifactCountAfterDup } = await admin
    .from("worker_artifacts")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("worker_result_id", workerResultId);

  if ((artifactCountAfterDup ?? 0) !== (artifactCountBeforeDup ?? 0)) {
    errors.push("Duplicate execution created additional artifacts.");
  }

  const eventsAfterDup = await listWorkerEvents(admin, orgId, workerResultId);
  const completionEventCount = eventsAfterDup.filter(
    (e) => e.eventType === "worker.execution_completed",
  ).length;
  const reuseEventCount = eventsAfterDup.filter(
    (e) => e.eventType === "worker.execution_reused",
  ).length;

  if (completionEventCount !== completionEventCountAfterFirst) {
    errors.push(
      `Duplicate execution added worker.execution_completed events (${completionEventCountAfterFirst} -> ${completionEventCount})`,
    );
  }

  if (reuseEventCount < 1) {
    errors.push("Expected at least one worker.execution_reused event after duplicate run.");
  }

  const reviewRequestAfterDup = eventsAfterDup.filter(
    (e) => e.eventType === "worker.review_requested",
  ).length;
  if (reviewRequestAfterDup !== reviewRequestCount) {
    errors.push("Duplicate execution created additional review_requested events.");
  }

  const externalAfter = {
    companies: await countTable(admin, "companies", orgId),
    assets: await countTable(admin, "assets", orgId),
    blueprints: await countTable(admin, "venture_blueprints", orgId),
  };

  const externalCountsUnchanged =
    externalBefore.companies === externalAfter.companies &&
    externalBefore.assets === externalAfter.assets &&
    externalBefore.blueprints === externalAfter.blueprints;

  if (!externalCountsUnchanged) {
    errors.push("External portfolio counts changed during worker E2E validation.");
  }

  return {
    organizationId: orgId,
    missionId,
    runtimeInstanceId,
    planId: plan.id,
    planStepId: researchStep.id,
    qaPlanStepId: qaStep.id,
    engineJobId: researchJob.id,
    duplicateEngineJobId: dupJob.id,
    workerRunId,
    workerResultId,
    qaResultId,
    artifactIds,
    executionKey,
    workerResultCountForExecutionKey,
    completionEventCount,
    reuseEventCount,
    reviewRequestCount,
    runtimeTransitionBeforeReview,
    runtimeTransitionAfterReview,
    planStepStatusAfterReview: planStepAfter?.status ?? "unknown",
    externalCountsUnchanged,
    pass: errors.length === 0,
    errors,
  };
}
