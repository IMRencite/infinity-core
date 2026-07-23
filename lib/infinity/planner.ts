import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DISCOVERY_CAPABILITY_KEY } from "./constants";
import { recordEngineEvent } from "./events";
import type { CommandCycle, CommandDecision, Mission, Plan, PlanStep } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function createPlanFromDecision(
  supabase: InfinitySupabase,
  organizationId: string,
  cycle: CommandCycle,
  mission: Mission,
  decision: CommandDecision,
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
      title: "Discovery scan plan",
      objectives: [
        {
          key: "run_discovery_scan",
          description: "Execute a bounded Discovery Engine scan under mission policy",
        },
      ],
      metadata: {
        source_decision_id: decision.id,
        requested_outcome: decision.outcome,
      },
    })
    .select("*")
    .single();

  if (planError || !plan) {
    throw new Error(`Failed to create plan: ${planError?.message ?? "unknown error"}`);
  }

  const { data: step, error: stepError } = await supabase
    .from("plan_steps")
    .insert({
      organization_id: organizationId,
      plan_id: plan.id,
      step_order: 1,
      capability_key: DISCOVERY_CAPABILITY_KEY,
      title: "Run Discovery scan",
      description:
        "Resolve Discovery capability via Registry and queue deterministic scan job",
      constraints: {
        scan_type: "broad_market",
        integration: "foundation_v1_stub",
      },
      status: "pending",
    })
    .select("*")
    .single();

  if (stepError || !step) {
    throw new Error(
      `Failed to create plan step: ${stepError?.message ?? "unknown error"}`,
    );
  }

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "planner",
    eventType: "planner.plan_created",
    entityType: "plan",
    entityId: plan.id,
    message: "Planner created discovery scan plan",
    correlationId: cycle.correlation_id,
    payload: {
      command_decision_id: decision.id,
      plan_version: plan.version,
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
