import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { runExecutiveSelectionE2EValidation } from "./validate-e2e";
import { advanceMissionRuntime } from "@/lib/infinity/mission-runtime/lifecycle";
import { createSupabaseMissionRuntimeStore } from "@/lib/infinity/mission-runtime/persistence";
import { runMissionExecutivePlannerHandoff } from "@/lib/infinity/orchestration/mission-planner-handoff";
import { inspectMissionRuntimeStage } from "@/lib/infinity/mission-runtime/stage-inspection";

export type ExecutivePlannerHandoffE2EReport = {
  pass: boolean;
  errors: string[];
  organizationId: string;
  missionId: string;
  runtimeId: string;
  executiveContextId: string | null;
  canonicalSelectionDecisionId: string | null;
  selectedOpportunityId: string | null;
  executiveQaResultId: string | null;
  planningEligibilityEventCount: number;
  plannerAuthorizationResult: string | null;
  planId: string | null;
  planVersion: number | null;
  planStepIds: string[];
  planQaResultId: string | null;
  stageBeforeExecutiveCompletion: string | null;
  stageAfterHandoffTick: string | null;
  stageAfterPlanObservationTick: string | null;
  duplicatePlanCount: number;
  duplicateHandoffEventCount: number;
  supersedingDecisionId: string | null;
  revisedPlanId: string | null;
  externalSideEffects: {
    builds: number;
    ventures: number;
    deployments: number;
  };
};

async function countMissionPlans(admin: AdminSupabaseClient, organizationId: string, missionId: string) {
  const { count } = await admin
    .from("plans")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId);
  return count ?? 0;
}

async function loadRuntimeStage(admin: AdminSupabaseClient, runtimeId: string) {
  const { data } = await admin
    .from("mission_runtime_instances")
    .select("current_stage, context")
    .eq("id", runtimeId)
    .maybeSingle();
  return data;
}

function advanceMessage(result: Awaited<ReturnType<typeof advanceMissionRuntime>>): string {
  if ("message" in result) return result.message;
  if ("reason" in result) return result.reason;
  return "unknown";
}

export async function runExecutivePlannerHandoffE2EValidation(
  admin: AdminSupabaseClient,
): Promise<ExecutivePlannerHandoffE2EReport> {
  const errors: string[] = [];
  const selection = await runExecutiveSelectionE2EValidation(admin);

  if (!selection.pass) {
    return {
      pass: false,
      errors: [...selection.errors, "selection prerequisite failed"],
      organizationId: selection.organizationId,
      missionId: selection.missionId,
      runtimeId: selection.runtimeId,
      executiveContextId: selection.executiveContextId,
      canonicalSelectionDecisionId: null,
      selectedOpportunityId: selection.selectedOpportunityId,
      executiveQaResultId: null,
      planningEligibilityEventCount: 0,
      plannerAuthorizationResult: null,
      planId: null,
      planVersion: null,
      planStepIds: [],
      planQaResultId: null,
      stageBeforeExecutiveCompletion: null,
      stageAfterHandoffTick: null,
      stageAfterPlanObservationTick: null,
      duplicatePlanCount: 0,
      duplicateHandoffEventCount: 0,
      supersedingDecisionId: null,
      revisedPlanId: null,
      externalSideEffects: { builds: 0, ventures: 0, deployments: 0 },
    };
  }

  const { data: canonicalDecision } = await admin
    .from("executive_selection_decisions")
    .select("*")
    .eq("organization_id", selection.organizationId)
    .eq("mission_id", selection.missionId)
    .eq("decision", "select_for_planning")
    .eq("planning_eligible", true)
    .eq("status", "finalized")
    .eq("review_status", "passed")
    .limit(1)
    .maybeSingle();

  if (!canonicalDecision) {
    errors.push("canonical select_for_planning decision missing after selection E2E");
  }

  const plansBefore = await countMissionPlans(admin, selection.organizationId, selection.missionId);
  if (plansBefore > 0) {
    errors.push(`expected no plan before handoff, found ${plansBefore}`);
  }

  await admin
    .from("mission_runtime_instances")
    .update({
      current_stage: "executive",
      status: "running",
      context: {
        idempotency: {},
        stageArtifacts: {},
        blockingReason: null,
        lastWorkRequestKey: null,
        recoveryNotes: [],
      },
    })
    .eq("id", selection.runtimeId)
    .eq("organization_id", selection.organizationId);

  const stageBeforeExecutiveCompletion = (await loadRuntimeStage(admin, selection.runtimeId))
    ?.current_stage ?? null;

  const store = createSupabaseMissionRuntimeStore(admin);

  const execAdvance = await advanceMissionRuntime({
    supabase: admin,
    organizationId: selection.organizationId,
    runtimeInstanceId: selection.runtimeId,
    lockedBy: "handoff-e2e",
    store,
  });

  const stageAfterExec = (await loadRuntimeStage(admin, selection.runtimeId))?.current_stage ?? null;
  if (stageAfterExec !== "planning") {
    errors.push(`expected planning after executive tick, got ${stageAfterExec} (${advanceMessage(execAdvance)})`);
  }

  const plansAfterExecAdvance = await countMissionPlans(
    admin,
    selection.organizationId,
    selection.missionId,
  );
  if (plansAfterExecAdvance > 0) {
    errors.push("plan must not exist until planner handoff runs");
  }

  await advanceMissionRuntime({
    supabase: admin,
    organizationId: selection.organizationId,
    runtimeInstanceId: selection.runtimeId,
    lockedBy: "handoff-e2e",
    store,
  });

  const stageAfterHandoffTick = (await loadRuntimeStage(admin, selection.runtimeId))?.current_stage ?? null;

  const { data: handoffPlans } = await admin
    .from("plans")
    .select("id, version, metadata, status")
    .eq("organization_id", selection.organizationId)
    .eq("mission_id", selection.missionId)
    .eq("status", "active");

  const canonicalPlans = (handoffPlans ?? []).filter((plan) => {
    if (typeof plan.metadata !== "object" || plan.metadata === null || Array.isArray(plan.metadata)) {
      return false;
    }
    return (
      (plan.metadata as Record<string, unknown>).canonical_executive_selection_decision_id ===
      canonicalDecision?.id
    );
  });

  if (canonicalPlans.length !== 1) {
    errors.push(`expected exactly one canonical handoff plan, found ${canonicalPlans.length}`);
  }

  const plan = canonicalPlans[0] ?? null;
  const meta = plan?.metadata as Record<string, unknown> | undefined;
  if (meta?.plan_qa_verdict !== "pass") {
    errors.push(`plan QA must pass, got ${String(meta?.plan_qa_verdict ?? "missing")}`);
  }

  const { data: planSteps } = await admin
    .from("plan_steps")
    .select("id, capability_key")
    .eq("organization_id", selection.organizationId)
    .eq("plan_id", plan?.id ?? "")
    .order("step_order", { ascending: true });

  for (const step of planSteps ?? []) {
    if (
      step.capability_key.startsWith("build.") ||
      step.capability_key.includes("deploy") ||
      step.capability_key.startsWith("website.")
    ) {
      errors.push(`forbidden plan step capability ${step.capability_key}`);
    }
  }

  const observationAdvance = await advanceMissionRuntime({
    supabase: admin,
    organizationId: selection.organizationId,
    runtimeInstanceId: selection.runtimeId,
    lockedBy: "handoff-e2e",
    store,
  });

  const stageAfterPlanObservationTick =
    (await loadRuntimeStage(admin, selection.runtimeId))?.current_stage ?? null;

  if (stageAfterPlanObservationTick !== "allocation") {
    errors.push(
      `expected allocation after plan observation tick, got ${stageAfterPlanObservationTick} (${advanceMessage(observationAdvance)})`,
    );
  }

  const handoffRepeat = await runMissionExecutivePlannerHandoff(admin, {
    organizationId: selection.organizationId,
    missionId: selection.missionId,
    runtimeInstanceId: selection.runtimeId,
  });

  if (handoffRepeat.status !== "completed" || handoffRepeat.planStatus !== "reused") {
    errors.push(
      `repeat handoff should reuse plan, got ${handoffRepeat.status}/${"planStatus" in handoffRepeat ? handoffRepeat.planStatus : "n/a"}`,
    );
  }

  const plansAfterRepeat = await countMissionPlans(
    admin,
    selection.organizationId,
    selection.missionId,
  );
  const duplicatePlanCount = Math.max(0, plansAfterRepeat - 1);

  const { count: handoffCompletedEvents } = await admin
    .from("engine_events")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", selection.organizationId)
    .eq("event_type", "executive.planning_handoff_completed")
    .contains("payload", { plan_id: plan?.id ?? "" });

  const duplicateHandoffEventCount = Math.max(0, (handoffCompletedEvents ?? 0) - 1);

  const { count: builds } = await admin
    .from("builds")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", selection.organizationId)
    .eq("mission_id", selection.missionId);

  const ventures = 0;

  const inspection = await inspectMissionRuntimeStage(
    admin,
    selection.organizationId,
    selection.missionId,
    selection.runtimeId,
  );

  if (!inspection.canonicalExecutiveSelectionDecisionId) {
    errors.push("runtime inspection missing canonical executive selection decision id");
  }

  const { data: nonSelectedPlans } = await admin
    .from("executive_selection_decisions")
    .select("opportunity_id, decision")
    .eq("organization_id", selection.organizationId)
    .eq("executive_context_id", selection.executiveContextId ?? "")
    .neq("decision", "select_for_planning");

  for (const row of nonSelectedPlans ?? []) {
    if (!row.opportunity_id) continue;
    const stray = (handoffPlans ?? []).some((p) => {
      const m = p.metadata as Record<string, unknown> | null;
      return m?.opportunity_id === row.opportunity_id;
    });
    if (stray) {
      errors.push(`plan exists for non-selected disposition ${row.decision} opp ${row.opportunity_id}`);
    }
  }

  const { count: eligibilityEvents } = await admin
    .from("engine_events")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", selection.organizationId)
    .eq("event_type", "executive.planning_eligibility_granted")
    .eq("entity_id", canonicalDecision?.id ?? "");

  return {
    pass: errors.length === 0,
    errors,
    organizationId: selection.organizationId,
    missionId: selection.missionId,
    runtimeId: selection.runtimeId,
    executiveContextId: selection.executiveContextId,
    canonicalSelectionDecisionId: canonicalDecision?.id ?? null,
    selectedOpportunityId: selection.selectedOpportunityId,
    executiveQaResultId: canonicalDecision?.review_status === "passed" ? canonicalDecision.id : null,
    planningEligibilityEventCount: eligibilityEvents ?? 0,
    plannerAuthorizationResult: handoffRepeat.status === "completed" ? "verified_reused" : handoffRepeat.status,
    planId: plan?.id ?? null,
    planVersion: plan?.version ?? null,
    planStepIds: (planSteps ?? []).map((s) => s.id),
    planQaResultId: plan?.id ?? null,
    stageBeforeExecutiveCompletion,
    stageAfterHandoffTick,
    stageAfterPlanObservationTick,
    duplicatePlanCount,
    duplicateHandoffEventCount,
    supersedingDecisionId: null,
    revisedPlanId: null,
    externalSideEffects: {
      builds: builds ?? 0,
      ventures,
      deployments: 0,
    },
  };
}
