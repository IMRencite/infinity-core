import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCommandCycle, createInitiativePlanningDecision } from "@/lib/infinity/command";
import { recordEngineEvent } from "@/lib/infinity/events";
import {
  loadCanonicalExecutiveSelectionForMission,
  resolvePlannerExecutiveAuthorization,
  assertPlannerExecutiveAuthorization,
} from "@/lib/infinity/executive-selection/authorization";
import { createInitiativePlanFromExecutiveAuthorization } from "@/lib/infinity/planner/v2-executive-handoff";
import { getActiveMission } from "@/lib/infinity/missions";

type InfinitySupabase = SupabaseClient<Database>;

export type MissionPlannerHandoffResult =
  | {
      status: "completed";
      planId: string;
      planStatus: "created" | "reused";
      authorizationSource: string;
      message: string;
    }
  | {
      status: "blocked" | "skipped";
      reason: string;
      message: string;
    };

export async function runMissionExecutivePlannerHandoff(
  supabase: InfinitySupabase,
  input: {
    organizationId: string;
    missionId: string;
    runtimeInstanceId: string;
    correlationId?: string | null;
  },
): Promise<MissionPlannerHandoffResult> {
  const mission = await getActiveMission(supabase, input.organizationId);

  if (!mission || mission.id !== input.missionId) {
    return {
      status: "skipped",
      reason: "mission_not_active",
      message: "Mission is not active for planner handoff.",
    };
  }

  const auth = await resolvePlannerExecutiveAuthorization({
    supabase,
    organizationId: input.organizationId,
    missionId: input.missionId,
    runtimeInstanceId: input.runtimeInstanceId,
    requireV2: true,
  });

  if (!auth) {
    return {
      status: "skipped",
      reason: "no_canonical_authorization",
      message: "No canonical Executive selection authorization for this mission.",
    };
  }

  try {
    await assertPlannerExecutiveAuthorization(supabase, auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authorization denied.";
    await recordEngineEvent(supabase, {
      organizationId: input.organizationId,
      engineName: "executive_engine",
      eventType: "planner.authorization_denied",
      entityType: "executive_selection_decision",
      entityId: auth.canonicalDecisionId,
      message,
      correlationId: input.correlationId ?? undefined,
      payload: { mission_id: input.missionId, runtime_instance_id: input.runtimeInstanceId },
    });
    return { status: "blocked", reason: "authorization_denied", message };
  }

  await recordEngineEvent(supabase, {
    organizationId: input.organizationId,
    engineName: "executive_engine",
    eventType: "executive.planning_handoff_requested",
    entityType: "executive_selection_decision",
    entityId: auth.canonicalDecisionId,
    message: "Executive planning handoff requested.",
    correlationId: input.correlationId ?? undefined,
    payload: {
      mission_id: input.missionId,
      runtime_instance_id: input.runtimeInstanceId,
      opportunity_id: auth.opportunityId,
    },
  });

  await recordEngineEvent(supabase, {
    organizationId: input.organizationId,
    engineName: "planner",
    eventType: "planner.authorization_verified",
    entityType: "executive_selection_decision",
    entityId: auth.canonicalDecisionId,
    message: "Planner Executive authorization verified.",
    correlationId: input.correlationId ?? undefined,
    payload: { source_system: auth.sourceSystem },
  });

  const cycleResult = await createCommandCycle(
    supabase,
    input.organizationId,
    mission,
    "system",
  );

  if (cycleResult.status === "skipped") {
    return {
      status: "skipped",
      reason: "command_cycle_busy",
      message: "Command cycle could not be started for planner handoff.",
    };
  }

  const cycle = cycleResult.cycle;

  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("id, name")
    .eq("organization_id", input.organizationId)
    .eq("id", auth.opportunityId)
    .maybeSingle();

  if (!opportunity) {
    return {
      status: "blocked",
      reason: "opportunity_not_found",
      message: "Selected opportunity not found.",
    };
  }

  const decision = await createInitiativePlanningDecision(
    supabase,
    input.organizationId,
    cycle,
    mission,
    opportunity,
  );

  await recordEngineEvent(supabase, {
    organizationId: input.organizationId,
    engineName: "planner",
    eventType: "planner.plan_requested",
    entityType: "command_decision",
    entityId: decision.id,
    message: "Planner plan requested for Executive handoff.",
    correlationId: input.correlationId ?? cycle.correlation_id,
    payload: {
      canonical_executive_selection_decision_id: auth.canonicalDecisionId,
      mission_id: input.missionId,
    },
  });

  const admin = createAdminClient();

  const handoff = await createInitiativePlanFromExecutiveAuthorization(admin, {
    organizationId: input.organizationId,
    mission,
    cycle,
    decision,
    authorization: auth,
    correlationId: input.correlationId ?? cycle.correlation_id,
  });

  await supabase
    .from("command_cycles")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      summary: {
        planner_handoff: true,
        plan_id: handoff.plan.id,
        reused: handoff.status === "reused",
      },
    })
    .eq("id", cycle.id)
    .eq("organization_id", input.organizationId);

  if (handoff.status !== "reused") {
    await recordEngineEvent(supabase, {
      organizationId: input.organizationId,
      engineName: "executive_engine",
      eventType: "executive.planning_handoff_completed",
      entityType: "plan",
      entityId: handoff.plan.id,
      message: "Executive planning handoff completed.",
      correlationId: input.correlationId ?? cycle.correlation_id,
      payload: {
        plan_id: handoff.plan.id,
        canonical_executive_selection_decision_id: auth.canonicalDecisionId,
        reused: false,
      },
    });
  }

  return {
    status: "completed",
    planId: handoff.plan.id,
    planStatus: handoff.status,
    authorizationSource: auth.sourceSystem,
    message: `Planner handoff ${handoff.status}: plan ${handoff.plan.id}`,
  };
}

export async function missionHasCanonicalHandoffPlan(
  supabase: InfinitySupabase,
  organizationId: string,
  missionId: string,
): Promise<{ hasPlan: boolean; planId: string | null; qaPassed: boolean }> {
  const auth = await loadCanonicalExecutiveSelectionForMission(
    supabase,
    organizationId,
    missionId,
  );

  if (!auth) {
    return { hasPlan: false, planId: null, qaPassed: false };
  }

  const { data: plans } = await supabase
    .from("plans")
    .select("id, metadata, status")
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(10);

  for (const plan of plans ?? []) {
    if (typeof plan.metadata !== "object" || plan.metadata === null || Array.isArray(plan.metadata)) {
      continue;
    }
    const meta = plan.metadata as Record<string, unknown>;
    if (meta.canonical_executive_selection_decision_id === auth.canonicalDecisionId) {
      const qa = meta.plan_qa_verdict;
      return {
        hasPlan: true,
        planId: plan.id,
        qaPassed: qa === "pass",
      };
    }
  }

  return { hasPlan: false, planId: null, qaPassed: false };
}
