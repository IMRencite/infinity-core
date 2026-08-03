import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { EXECUTIVE_EVALUATE_CAPABILITY_KEY } from "./constants";
import { isOpportunityApprovedForPlanning } from "./validation";
import { recordEngineEvent } from "./events";
import type { CommandCycle, CommandDecision, Mission, Plan, PlanStep } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function createExecutivePlanFromDecision(
  supabase: InfinitySupabase,
  organizationId: string,
  cycle: CommandCycle,
  mission: Mission,
  decision: CommandDecision,
  opportunityId: string,
  validationRunId: string,
): Promise<{ plan: Plan; steps: PlanStep[] }> {
  const approved = await isOpportunityApprovedForPlanning(
    supabase,
    organizationId,
    opportunityId,
  );

  if (!approved) {
    throw new Error(
      "Executive evaluation plan requires validation recommendation approved_for_planning.",
    );
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .insert({
      organization_id: organizationId,
      command_decision_id: decision.id,
      mission_id: mission.id,
      command_cycle_id: cycle.id,
      version: 1,
      status: "active",
      title: "Executive evaluation plan",
      objectives: [
        {
          key: "run_executive_evaluation",
          description:
            "Deterministic executive decision and enterprise queue update after reasoning",
        },
      ],
      metadata: {
        source_decision_id: decision.id,
        opportunity_id: opportunityId,
        validation_run_id: validationRunId,
      },
    })
    .select("*")
    .single();

  if (planError || !plan) {
    throw new Error(`Failed to create executive plan: ${planError?.message ?? "unknown error"}`);
  }

  const { data: step, error: stepError } = await supabase
    .from("plan_steps")
    .insert({
      organization_id: organizationId,
      plan_id: plan.id,
      step_order: 1,
      capability_key: EXECUTIVE_EVALUATE_CAPABILITY_KEY,
      title: "Run executive evaluation",
      description:
        "Load deterministic reasoning output, apply executive policy, persist decision and queue entry",
      constraints: {
        opportunity_id: opportunityId,
        mission_id: mission.id,
        validation_run_id: validationRunId,
        integration: "executive_foundation_v1",
        creates_venture: false,
        creates_asset: false,
      },
      status: "pending",
    })
    .select("*")
    .single();

  if (stepError || !step) {
    throw new Error(
      `Failed to create executive plan step: ${stepError?.message ?? "unknown error"}`,
    );
  }

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "planner",
    eventType: "planner.plan_created",
    entityType: "plan",
    entityId: plan.id,
    message: "Planner created executive evaluation plan",
    correlationId: cycle.correlation_id,
    payload: {
      command_decision_id: decision.id,
      opportunity_id: opportunityId,
      validation_run_id: validationRunId,
    },
  });

  return { plan, steps: [step] };
}
