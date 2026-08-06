import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { ensureDefaultDecisionModel } from "@/lib/infinity/decision/models";
import { resolveExecutiveContextHash } from "./resolve-hash";
import {
  scheduleExecutiveBuildContextJob,
  scheduleExecutiveSelectionRemainderPipeline,
} from "./jobs";
import { executeJob, registerRuntimeWorkers } from "@/lib/infinity/runtime";
import { EXECUTIVE_SELECTION_CAPABILITY_KEYS } from "./constants";
import { loadEligibleOpportunitiesForMission } from "./eligibility";
import { advanceMissionRuntime, startMissionRuntime } from "@/lib/infinity/mission-runtime/lifecycle";
import { createSupabaseMissionRuntimeStore } from "@/lib/infinity/mission-runtime/persistence";
import { ensureDefaultValidationModel } from "@/lib/infinity/validation/models";

const E2E_LABEL = "executive_selection_e2e_v1";
const PROFILES = [
  "strong_in_policy",
  "low_confidence",
  "low_value",
  "resource_constrained",
  "mandatory_escalation",
] as const;

export type ExecutiveSelectionE2EReport = {
  pass: boolean;
  errors: string[];
  organizationId: string;
  missionId: string;
  runtimeId: string;
  executiveContextId: string | null;
  contextHash: string | null;
  opportunityIds: Record<string, string>;
  decisionDispositions: Record<string, string>;
  selectedOpportunityId: string | null;
  duplicateContextCount: number;
  stageBefore?: string;
  stageAfter?: string;
};

async function drainExecutiveJobs(
  admin: AdminSupabaseClient,
  organizationId: string,
  missionId: string,
  contextHash: string,
  max = 120,
) {
  registerRuntimeWorkers();
  const pendingStatuses = ["queued", "running", "waiting"];

  for (let i = 0; i < max; i += 1) {
    const { data: pending } = await admin
      .from("engine_jobs")
      .select("id, capability_key, status, payload")
      .eq("organization_id", organizationId)
      .eq("mission_id", missionId)
      .in("capability_key", [...EXECUTIVE_SELECTION_CAPABILITY_KEYS])
      .in("status", pendingStatuses)
      .order("created_at", { ascending: true })
      .limit(20);

    const job = (pending ?? []).find((row) => {
      const payload = row.payload as Record<string, unknown> | null;
      return payload?.context_hash === contextHash;
    });

    if (!job) break;

    try {
      await executeJob(admin, {
        engineJobId: job.id,
        organizationId,
        executorId: "executive-selection-e2e",
      });
    } catch (error) {
      throw new Error(
        `Executive job ${job.capability_key} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const { data: failed } = await admin
    .from("engine_jobs")
    .select("id, capability_key, status, last_error")
    .eq("organization_id", organizationId)
    .in("capability_key", [...EXECUTIVE_SELECTION_CAPABILITY_KEYS])
    .eq("status", "failed")
    .limit(5);

  if (failed && failed.length > 0) {
    throw new Error(
      `Executive jobs failed: ${failed.map((f) => `${f.capability_key}:${JSON.stringify(f.last_error)}`).join("; ")}`,
    );
  }
}

async function seedOpportunity(
  admin: AdminSupabaseClient,
  organizationId: string,
  missionId: string,
  profile: (typeof PROFILES)[number],
  decisionModelId: string,
  validationModelId: string,
) {
  const slug = `exec-sel-e2e-${profile.replace(/_/g, "-")}-${Date.now()}`;
  const scores: Record<string, number> = {
    strong_in_policy: 85,
    low_confidence: 65,
    low_value: 25,
    resource_constrained: 70,
    mandatory_escalation: 75,
  };
  const confidence: Record<string, number> = {
    strong_in_policy: 82,
    low_confidence: 38,
    low_value: 55,
    resource_constrained: 68,
    mandatory_escalation: 72,
  };

  const { data: opp, error } = await admin
    .from("opportunities")
    .insert({
      organization_id: organizationId,
      name: `${E2E_LABEL} ${profile}`,
      slug,
      status: "approved",
      decision: "pending",
      confidence_score: confidence[profile],
      overall_score: scores[profile],
      estimated_startup_cost_min: profile === "mandatory_escalation" ? 5000 : 0,
      estimated_startup_cost_max: profile === "mandatory_escalation" ? 12000 : 0,
      assumptions: {
        executive_selection_profile: profile,
        resource_constrained: profile === "resource_constrained",
      },
      risks: profile === "mandatory_escalation" ? [{ regulated: true }] : [],
      monetization_models: [],
    })
    .select("id")
    .single();

  if (error || !opp) throw new Error(error?.message ?? "opp insert failed");

  const { error: vrError } = await admin.from("validation_runs").insert({
    organization_id: organizationId,
    opportunity_id: opp.id,
    mission_id: missionId,
    validation_model_id: validationModelId,
    run_key: `${E2E_LABEL}:${opp.id}:${Date.now()}`,
    recommendation: "approved_for_planning",
    run_status: "completed",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    summary: { e2e: E2E_LABEL, critical: [] },
  });
  if (vrError) throw new Error(`validation insert failed: ${vrError.message}`);

  const { error: evalError } = await admin.from("opportunity_evaluations").upsert(
    {
      organization_id: organizationId,
      opportunity_id: opp.id,
      mission_id: missionId,
      decision_model_id: decisionModelId,
      evaluation_key: `${E2E_LABEL}:${opp.id}`,
      evaluation_status: "completed",
      recommendation: "approve_initiative",
      overall_score: scores[profile],
      confidence_score: confidence[profile],
      evaluated_at: new Date().toISOString(),
      dimension_scores: {},
      assumptions: {},
      policy_results: {},
      uncertainty: {},
    },
    { onConflict: "organization_id,evaluation_key" },
  );
  if (evalError) throw new Error(`evaluation upsert failed: ${evalError.message}`);

  const { error: evidenceError } = await admin.from("opportunity_evidence").insert({
    organization_id: organizationId,
    opportunity_id: opp.id,
    evidence_type: "market_signal",
    title: `${E2E_LABEL} evidence ${profile}`,
    summary: "E2E evidence",
    supports_opportunity: true,
  });
  if (evidenceError) throw new Error(`evidence insert failed: ${evidenceError.message}`);

  return opp.id;
}

export async function runExecutiveSelectionE2EValidation(
  admin: AdminSupabaseClient,
): Promise<ExecutiveSelectionE2EReport> {
  const errors: string[] = [];
  const { data: org } = await admin.from("organizations").select("id").limit(1).maybeSingle();
  if (!org) throw new Error("No organization for E2E");

  const { data: activeMission } = await admin
    .from("missions")
    .select("id")
    .eq("organization_id", org.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (activeMission) {
    await admin
      .from("missions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", activeMission.id)
      .eq("organization_id", org.id);
  }

  const { data: mission, error: missionError } = await admin
    .from("missions")
    .insert({
      organization_id: org.id,
      title: `${E2E_LABEL} ${Date.now()}`,
      status: "active",
      objectives: [{ e2e: E2E_LABEL }],
    })
    .select("id")
    .single();

  if (missionError || !mission) {
    throw new Error(missionError?.message ?? "Failed to create E2E mission");
  }

  const decisionModel = await ensureDefaultDecisionModel(admin, org.id);
  const validationModel = await ensureDefaultValidationModel(admin, org.id);

  const opportunityIds: Record<string, string> = {};
  for (const profile of PROFILES) {
    opportunityIds[profile] = await seedOpportunity(
      admin,
      org.id,
      mission.id,
      profile,
      decisionModel.id,
      validationModel.id,
    );
  }

  const store = createSupabaseMissionRuntimeStore(admin);
  const runtime = await startMissionRuntime({
    supabase: admin,
    organizationId: org.id,
    missionId: mission.id,
    correlationId: crypto.randomUUID(),
    store,
  });

  await admin
    .from("mission_runtime_instances")
    .update({ current_stage: "reasoning" })
    .eq("id", runtime.instance.id)
    .eq("organization_id", org.id);

  const contextHash = await resolveExecutiveContextHash(admin, {
    organizationId: org.id,
    missionId: mission.id,
    runtimeInstanceId: runtime.instance.id,
    correlationId: runtime.instance.correlationId,
  });

  const { count: jobsBefore } = await admin
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("capability_key", "executive.build_selection_context");

  await scheduleExecutiveBuildContextJob(admin, {
    organizationId: org.id,
    missionId: mission.id,
    runtimeInstanceId: runtime.instance.id,
    contextHash,
    correlationId: runtime.instance.correlationId,
  });

  const { count: jobsAfterSchedule } = await admin
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("capability_key", "executive.build_selection_context");

  if ((jobsAfterSchedule ?? 0) - (jobsBefore ?? 0) > 1) {
    errors.push("expected at most one new executive.build_selection_context job");
  }

  await drainExecutiveJobs(admin, org.id, mission.id, contextHash);

  const { data: context } = await admin
    .from("executive_contexts")
    .select("*")
    .eq("organization_id", org.id)
    .eq("mission_id", mission.id)
    .eq("context_hash", contextHash)
    .maybeSingle();

  if (!context || context.status !== "completed") {
    errors.push("executive context not completed");
  }

  await scheduleExecutiveSelectionRemainderPipeline(admin, {
    organizationId: org.id,
    missionId: mission.id,
    runtimeInstanceId: runtime.instance.id,
    contextHash,
    executiveContextId: context?.id ?? "",
    correlationId: runtime.instance.correlationId,
  });

  const { count: remainderQueued } = await admin
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("mission_id", mission.id)
    .in("capability_key", [...EXECUTIVE_SELECTION_CAPABILITY_KEYS])
    .neq("capability_key", "executive.build_selection_context")
    .eq("status", "queued");

  if ((remainderQueued ?? 0) < 1) {
    errors.push(`expected remainder pipeline jobs queued, found ${remainderQueued ?? 0}`);
  }

  await drainExecutiveJobs(admin, org.id, mission.id, contextHash);

  const { data: contextAfter } = await admin
    .from("executive_contexts")
    .select("context_manifest")
    .eq("id", context?.id ?? "")
    .maybeSingle();

  const manifestAfter = contextAfter?.context_manifest as { deterministicScores?: Record<string, unknown> } | null;
  if (!manifestAfter?.deterministicScores || Object.keys(manifestAfter.deterministicScores).length === 0) {
    errors.push("deterministic scores missing from executive context manifest after pipeline");
  }

  const { data: pipelineJobs } = await admin
    .from("engine_jobs")
    .select("capability_key, status, last_error, payload")
    .eq("organization_id", org.id)
    .eq("mission_id", mission.id)
    .in("capability_key", [...EXECUTIVE_SELECTION_CAPABILITY_KEYS]);

  const jobsForHash = (pipelineJobs ?? []).filter((job) => {
    const payload = job.payload as Record<string, unknown> | null;
    return payload?.context_hash === contextHash;
  });

  const jobSummary = jobsForHash.map((j) => `${j.capability_key}:${j.status}`).join(", ");
  if (!jobsForHash.some((j) => j.capability_key === "executive.select_opportunity" && j.status === "completed")) {
    errors.push(`executive.select_opportunity not completed (jobs: ${jobSummary || "none"})`);
  }

  const { data: decisions } = await admin
    .from("executive_selection_decisions")
    .select("*")
    .eq("organization_id", org.id)
    .eq("executive_context_id", context?.id ?? "");

  const decisionDispositions: Record<string, string> = {};
  for (const profile of PROFILES) {
    const oppId = opportunityIds[profile];
    const row = (decisions ?? []).find((d) => d.opportunity_id === oppId);
    if (row) decisionDispositions[profile] = row.decision;
  }

  const expected: Record<string, string> = {
    strong_in_policy: "select_for_planning",
    low_confidence: "request_more_validation",
    low_value: "reject",
    resource_constrained: "defer_due_to_constraints",
    mandatory_escalation: "escalate_for_human_review",
  };

  for (const profile of PROFILES) {
    if (decisionDispositions[profile] !== expected[profile]) {
      errors.push(
        `profile ${profile}: expected ${expected[profile]}, got ${decisionDispositions[profile] ?? "missing"}`,
      );
    }
  }

  const selected = (decisions ?? []).find(
    (d) => d.decision === "select_for_planning" && d.planning_eligible,
  );

  if (!selected) {
    const manifestQa = manifestAfter as { qa?: { issues?: string[]; verdict?: string } } | null;
    const qaIssues = manifestQa?.qa ?? {};
    errors.push(
      `no planning eligible selection (qa=${qaIssues.verdict ?? "unknown"}; ${(qaIssues.issues ?? []).join(",")})`,
    );
  }

  const stageBefore = "reasoning";
  await advanceMissionRuntime({
    supabase: admin,
    organizationId: org.id,
    runtimeInstanceId: runtime.instance.id,
    lockedBy: "e2e",
    store,
  });

  const { data: runtimeAfter } = await admin
    .from("mission_runtime_instances")
    .select("current_stage")
    .eq("id", runtime.instance.id)
    .maybeSingle();

  await scheduleExecutiveBuildContextJob(admin, {
    organizationId: org.id,
    missionId: mission.id,
    runtimeInstanceId: runtime.instance.id,
    contextHash,
    correlationId: runtime.instance.correlationId,
  });

  const { count: dupContexts } = await admin
    .from("executive_contexts")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("context_hash", contextHash);

  if ((dupContexts ?? 0) > 1) {
    errors.push("duplicate executive contexts for same hash");
  }

  return {
    pass: errors.length === 0,
    errors,
    organizationId: org.id,
    missionId: mission.id,
    runtimeId: runtime.instance.id,
    executiveContextId: context?.id ?? null,
    contextHash,
    opportunityIds,
    decisionDispositions,
    selectedOpportunityId: selected?.opportunity_id ?? null,
    duplicateContextCount: dupContexts ?? 0,
    stageBefore,
    stageAfter: runtimeAfter?.current_stage,
  };
}
