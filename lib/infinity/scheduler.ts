import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DISCOVERY_ENGINE_NAME } from "./constants";
import { recordEngineEvent } from "./events";
import { resolveCapability } from "./registry";
import type { CommandCycle, EngineJob, Plan, PlanStep } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function schedulePlanStep(
  supabase: InfinitySupabase,
  organizationId: string,
  cycle: CommandCycle,
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
    eventType: "scheduler.job_created",
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
    },
  });

  return job;
}

export async function executeDiscoveryJob(
  supabase: InfinitySupabase,
  organizationId: string,
  job: EngineJob,
): Promise<{ scanId: string }> {
  const now = new Date().toISOString();

  const { error: runningError } = await supabase
    .from("engine_jobs")
    .update({ status: "running", started_at: now })
    .eq("id", job.id)
    .eq("organization_id", organizationId);

  if (runningError) {
    throw new Error(`Failed to mark job running: ${runningError.message}`);
  }

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: job.resolved_engine_name ?? DISCOVERY_ENGINE_NAME,
    eventType: "discovery.scan_started",
    entityType: "engine_job",
    entityId: job.id,
    message: "Discovery scan started (Foundation v1 deterministic stub)",
    correlationId: job.correlation_id,
    payload: {
      scan_type: "broad_market",
      integration: "foundation_v1_stub",
    },
  });

  const { data: scan, error: scanError } = await supabase
    .from("opportunity_scans")
    .insert({
      organization_id: organizationId,
      status: "completed",
      scan_type: "broad_market",
      objective: "Foundation v1 deterministic discovery scan (no external sources)",
      search_scope: { mode: "stub", version: "foundation_v1" },
      constraints: job.payload,
      started_at: now,
      completed_at: now,
      opportunities_discovered: 0,
      metadata: {
        engine_job_id: job.id,
        correlation_id: job.correlation_id,
        deterministic: true,
      },
    })
    .select("id")
    .single();

  if (scanError || !scan) {
    await supabase
      .from("engine_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: scanError?.message ?? "Failed to create opportunity scan",
      })
      .eq("id", job.id);

    throw new Error(
      `Failed to create opportunity scan: ${scanError?.message ?? "unknown error"}`,
    );
  }

  const completedAt = new Date().toISOString();

  const { error: jobCompleteError } = await supabase
    .from("engine_jobs")
    .update({
      status: "completed",
      completed_at: completedAt,
      result: {
        opportunity_scan_id: scan.id,
        opportunities_discovered: 0,
      },
    })
    .eq("id", job.id)
    .eq("organization_id", organizationId);

  if (jobCompleteError) {
    throw new Error(`Failed to complete engine job: ${jobCompleteError.message}`);
  }

  if (job.plan_step_id) {
    await supabase
      .from("plan_steps")
      .update({ status: "completed" })
      .eq("id", job.plan_step_id)
      .eq("organization_id", organizationId);
  }

  if (job.plan_id) {
    await supabase
      .from("plans")
      .update({ status: "completed" })
      .eq("id", job.plan_id)
      .eq("organization_id", organizationId);
  }

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: job.resolved_engine_name ?? DISCOVERY_ENGINE_NAME,
    eventType: "discovery.scan_completed",
    entityType: "opportunity_scan",
    entityId: scan.id,
    message: "Discovery scan completed (stub; zero external opportunities)",
    correlationId: job.correlation_id,
    payload: {
      engine_job_id: job.id,
      opportunities_discovered: 0,
    },
  });

  await recordEngineEvent(supabase, {
    organizationId,
    engineName: "scheduler",
    eventType: "scheduler.job_completed",
    entityType: "engine_job",
    entityId: job.id,
    message: "Scheduler job completed",
    correlationId: job.correlation_id,
    payload: {
      opportunity_scan_id: scan.id,
    },
  });

  return { scanId: scan.id };
}
