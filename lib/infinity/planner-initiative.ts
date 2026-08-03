import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { PLANNER_INITIATIVE_GATE_CAPABILITY_KEY } from "./constants";
import { recordEngineEvent } from "./events";
import { assertExecutiveEligibleForInitiativePlanning } from "./executive/gating";
import { assertPlannerMayExecute } from "./planner-gating";
import type { CommandCycle, CommandDecision, Mission, Plan, PlanStep } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

/**
 * Foundation v1: records planner eligibility after validation.
 * Does not create ventures, assets, or Build Factory work.
 */
export async function createInitiativePlanningRecordFromDecision(
  supabase: InfinitySupabase,
  organizationId: string,
  cycle: CommandCycle,
  mission: Mission,
  decision: CommandDecision,
  opportunityId: string,
): Promise<{ plan: Plan; steps: PlanStep[] }> {
  await assertPlannerMayExecute(
    supabase,
    organizationId,
    PLANNER_INITIATIVE_GATE_CAPABILITY_KEY,
    opportunityId,
  );

  await assertExecutiveEligibleForInitiativePlanning(
    supabase,
    organizationId,
    opportunityId,
  );

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .insert({
      organization_id: organizationId,
      command_decision_id: decision.id,
      mission_id: mission.id,
      command_cycle_id: cycle.id,
      version: 1,
      status: "active",
      title: "Validated initiative planning record",
      objectives: [
        {
          key: "planner_gate_validated",
          description:
            "Opportunity passed deterministic validation for planning eligibility. Build Factory not invoked.",
        },
      ],
      metadata: {
        source_decision_id: decision.id,
        opportunity_id: opportunityId,
        planner_gate: "approved_for_planning",
        build_factory: false,
      },
    })
    .select("*")
    .single();

  if (planError || !plan) {
    throw new Error(`Failed to create planning record: ${planError?.message ?? "unknown"}`);
  }

  const { data: step, error: stepError } = await supabase
    .from("plan_steps")
    .insert({
      organization_id: organizationId,
      plan_id: plan.id,
      step_order: 1,
      capability_key: "planner.initiative_gate",
      title: "Planner eligibility recorded",
      description:
        "Validation approved planning. Initiative promotion and Build Factory remain future milestones.",
      constraints: {
        opportunity_id: opportunityId,
        integration: "validation_foundation_v1",
        creates_venture: false,
        creates_asset: false,
      },
      status: "completed",
    })
    .select("*")
    .single();

  if (stepError || !step) {
    throw new Error(
      `Failed to create planning record step: ${stepError?.message ?? "unknown error"}`,
    );
  }

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "planner",
    eventType: "planner.plan_created",
    entityType: "plan",
    entityId: plan.id,
    message: "Planner recorded validated opportunity (no build execution)",
    correlationId: cycle.correlation_id,
    payload: {
      command_decision_id: decision.id,
      opportunity_id: opportunityId,
      validation_gate: "approved_for_planning",
    },
  });

  return { plan, steps: [step] };
}
