import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DECISION_EVALUATE_CAPABILITY_KEY } from "./constants";
import { recordEngineEvent } from "./events";
import type { CommandCycle, CommandDecision, Mission, Plan, PlanStep } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function createEvaluationPlanFromDecision(
  supabase: InfinitySupabase,
  organizationId: string,
  cycle: CommandCycle,
  mission: Mission,
  decision: CommandDecision,
  opportunityId: string,
): Promise<{ plan: Plan; steps: PlanStep[] }> {
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .insert({
      organization_id: organizationId,
      command_decision_id: decision.id,
      mission_id: mission.id,
      command_cycle_id: cycle.id,
      version: 1,
      status: "active",
      title: "Opportunity evaluation plan",
      objectives: [
        {
          key: "evaluate_opportunity",
          description:
            "Run deterministic Decision Engine evaluation and optional allocation proposal",
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
    throw new Error(`Failed to create evaluation plan: ${planError?.message ?? "unknown error"}`);
  }

  const { data: step, error: stepError } = await supabase
    .from("plan_steps")
    .insert({
      organization_id: organizationId,
      plan_id: plan.id,
      step_order: 1,
      capability_key: DECISION_EVALUATE_CAPABILITY_KEY,
      title: "Evaluate opportunity",
      description:
        "Evaluate discovered opportunity using active decision model and mission policies",
      constraints: {
        opportunity_id: opportunityId,
        mission_id: mission.id,
        integration: "decision_foundation_v1",
      },
      status: "pending",
    })
    .select("*")
    .single();

  if (stepError || !step) {
    throw new Error(
      `Failed to create evaluation plan step: ${stepError?.message ?? "unknown error"}`,
    );
  }

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "planner",
    eventType: "planner.plan_created",
    entityType: "plan",
    entityId: plan.id,
    message: "Planner created opportunity evaluation plan",
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
