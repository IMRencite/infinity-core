import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DISCOVERY_ENGINE_NAME } from "./constants";
import { recordEngineEvent } from "./events";
import { resolveCapability } from "./registry";
import type { CommandCycle, EngineJob, Mission, Plan, PlanStep } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

function buildIdempotencyKey(cycleId: string, stepId: string, capabilityKey: string): string {
  const prefix = capabilityKey.startsWith("decision.")
    ? "decision-evaluate"
    : capabilityKey.startsWith("discovery.")
      ? "discovery-scan"
      : capabilityKey.replaceAll(".", "-");

  return `${prefix}:${cycleId}:${stepId}`;
}

function buildJobPayload(step: PlanStep): Json {
  const constraints =
    typeof step.constraints === "object" &&
    step.constraints !== null &&
    !Array.isArray(step.constraints)
      ? (step.constraints as Record<string, unknown>)
      : {};

  if (step.capability_key.startsWith("decision.")) {
    return {
      opportunity_id:
        typeof constraints.opportunity_id === "string" ? constraints.opportunity_id : null,
      mission_id: typeof constraints.mission_id === "string" ? constraints.mission_id : null,
      plan_step_id: step.id,
      constraints: step.constraints,
    } satisfies Json as Json;
  }

  return {
    scan_type: typeof constraints.scan_type === "string" ? constraints.scan_type : "broad_market",
    plan_step_id: step.id,
    constraints: step.constraints,
  } satisfies Json as Json;
}

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

  const idempotencyKey = buildIdempotencyKey(cycle.id, step.id, step.capability_key);

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
      payload: buildJobPayload(step),
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
