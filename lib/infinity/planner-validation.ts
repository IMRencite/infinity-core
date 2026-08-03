import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { VALIDATION_CAPABILITY_KEY } from "./constants";
import { assertPlannerMayExecute } from "./planner-gating";
import { recordEngineEvent } from "./events";
import type { CommandCycle, CommandDecision, Mission, Plan, PlanStep } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function createValidationPlanFromDecision(
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
    VALIDATION_CAPABILITY_KEY,
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
      title: "Opportunity validation plan",
      objectives: [
        {
          key: "run_validation",
          description:
            "Prove or disprove opportunity assumptions deterministically before planning",
        },
      ],
      metadata: {
        source_decision_id: decision.id,
        opportunity_id: opportunityId,
      },
    })
    .select("*")
    .single();

  if (planError || !plan) {
    throw new Error(`Failed to create validation plan: ${planError?.message ?? "unknown error"}`);
  }

  const { data: step, error: stepError } = await supabase
    .from("plan_steps")
    .insert({
      organization_id: organizationId,
      plan_id: plan.id,
      step_order: 1,
      capability_key: VALIDATION_CAPABILITY_KEY,
      title: "Run opportunity validation",
      description:
        "Deterministic validation using stored evidence, scores, evaluation, and allocation context",
      constraints: {
        opportunity_id: opportunityId,
        mission_id: mission.id,
        integration: "validation_foundation_v1",
      },
      status: "pending",
    })
    .select("*")
    .single();

  if (stepError || !step) {
    throw new Error(
      `Failed to create validation plan step: ${stepError?.message ?? "unknown error"}`,
    );
  }

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "planner",
    eventType: "planner.plan_created",
    entityType: "plan",
    entityId: plan.id,
    message: "Planner created opportunity validation plan",
    correlationId: cycle.correlation_id,
    payload: {
      command_decision_id: decision.id,
      opportunity_id: opportunityId,
      steps: [
        {
          id: step.id,
          capability_key: step.capability_key,
          step_order: step.step_order,
        },
      ],
    },
  });

  return { plan, steps: [step] };
}
