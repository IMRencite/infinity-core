import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DISCOVERY_ENGINE_NAME } from "./constants";
import { recordEngineEvent } from "./events";
import { resolveCapability } from "./registry";
import type { CommandCycle, EngineJob, Mission, Plan, PlanStep } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function schedulePlanStep(
  supabase: InfinitySupabase,
  organizationId: string,
  cycle: CommandCycle,
  mission: Mission,
  plan: Plan,
  step: PlanStep,
): Promise<EngineJob> {
  const capability = await resolveCapability(
    supabase,
    organizationId,
    step.capability_key,
  );

  const idempotencyKey = `discovery-scan:${cycle.id}:${step.id}`;

  const { data: job, error } = await supabase
    .from("engine_jobs")
    .insert({
      organization_id: organizationId,
      mission_id: mission.id,
      command_cycle_id: cycle.id,
      plan_id: plan.id,
      plan_step_id: step.id,
      capability_key: step.capability_key,
      resolved_capability_id: capability.id,
      resolved_engine_name: capability.engine_name ?? DISCOVERY_ENGINE_NAME,
      resolved_version: capability.version,
      status: "queued",
      priority: 100,
      idempotency_key: idempotencyKey,
      correlation_id: cycle.correlation_id,
      available_at: new Date().toISOString(),
      max_attempts: 3,
      timeout_seconds: 300,
      payload: {
        scan_type: "broad_market",
        plan_step_id: step.id,
        constraints: step.constraints,
      },
    })
    .select("*")
    .single();

  if (error || !job) {
    throw new Error(`Failed to create engine job: ${error?.message ?? "unknown error"}`);
  }

  await supabase
    .from("plan_steps")
    .update({ status: "scheduled" })
    .eq("id", step.id)
    .eq("organization_id", organizationId);

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "scheduler",
    eventType: "scheduler.job_queued",
    entityType: "engine_job",
    entityId: job.id,
    message: `Scheduler queued job for capability ${step.capability_key}`,
    correlationId: cycle.correlation_id,
    payload: {
      capability_key: step.capability_key,
      resolved_capability_id: capability.id,
      resolved_version: capability.version,
      plan_id: plan.id,
      plan_step_id: step.id,
      mission_id: mission.id,
    },
  });

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "registry",
    eventType: "registry.capability_resolved",
    entityType: "capability_registry",
    entityId: capability.id,
    message: `Registry resolved ${step.capability_key}@${capability.version}`,
    correlationId: cycle.correlation_id,
    payload: {
      capability_key: capability.capability_key,
      engine_name: capability.engine_name,
      health_status: capability.health_status,
      implementation_key:
        "implementation_key" in capability
          ? (capability.implementation_key as string | null)
          : null,
    },
  });

  return job;
}
