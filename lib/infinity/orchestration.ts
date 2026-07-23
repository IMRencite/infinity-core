import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  completeCommandCycle,
  createCommandCycle,
  createDiscoveryDecision,
} from "./command";
import { getActiveMission } from "./missions";
import { createPlanFromDecision } from "./planner";
import { executeDiscoveryJob, schedulePlanStep } from "./scheduler";
import type { CommandCycleResult } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

export async function runDiscoveryCommandCycle(
  supabase: InfinitySupabase,
  organizationId: string,
  triggerSource: "manual" | "scheduled" | "event" | "system" = "manual",
): Promise<CommandCycleResult> {
  const mission = await getActiveMission(supabase, organizationId);

  if (!mission) {
    return {
      status: "skipped",
      reason: "no_active_mission",
      message: "No active mission exists for this organization.",
    };
  }

  const cycleResult = await createCommandCycle(
    supabase,
    organizationId,
    mission,
    triggerSource,
  );

  if (cycleResult.status === "skipped") {
    return {
      status: "skipped",
      reason: "pending_discovery_jobs",
      message: "Discovery jobs are already queued or running.",
    };
  }

  const cycle = cycleResult.cycle;

  try {
    const decision = await createDiscoveryDecision(
      supabase,
      organizationId,
      cycle,
      mission,
    );

    const { plan, steps } = await createPlanFromDecision(
      supabase,
      organizationId,
      cycle,
      mission,
      decision,
    );

    const step = steps[0];
    if (!step) {
      throw new Error("Plan was created without steps.");
    }

    const job = await schedulePlanStep(
      supabase,
      organizationId,
      cycle,
      plan,
      step,
    );

    const { scanId } = await executeDiscoveryJob(supabase, organizationId, job);

    await completeCommandCycle(supabase, organizationId, cycle.id, cycle.correlation_id, {
      decision_id: decision.id,
      plan_id: plan.id,
      job_id: job.id,
      opportunity_scan_id: scanId,
    });

    return {
      status: "completed",
      cycleId: cycle.id,
      decisionId: decision.id,
      planId: plan.id,
      jobId: job.id,
      correlationId: cycle.correlation_id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Command cycle failed unexpectedly.";

    await supabase
      .from("command_cycles")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        summary: { error: message },
      })
      .eq("id", cycle.id)
      .eq("organization_id", organizationId);

    return {
      status: "failed",
      message,
    };
  }
}

export async function progressCommandCycle(
  supabase: InfinitySupabase,
  organizationId: string,
  cycleId: string,
): Promise<CommandCycleResult> {
  const { data: cycle, error: cycleError } = await supabase
    .from("command_cycles")
    .select("*")
    .eq("id", cycleId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (cycleError || !cycle) {
    return {
      status: "failed",
      message: cycleError?.message ?? "Command cycle not found.",
    };
  }

  if (cycle.status !== "running") {
    return {
      status: "skipped",
      reason: "cycle_not_runnable",
      message: `Command cycle is ${cycle.status} and cannot be progressed.`,
    };
  }

  const mission = await getActiveMission(supabase, organizationId);

  if (!mission || mission.id !== cycle.mission_id) {
    return {
      status: "skipped",
      reason: "no_active_mission",
      message: "Mission is no longer active for this cycle.",
    };
  }

  const { data: existingJob } = await supabase
    .from("engine_jobs")
    .select("*")
    .eq("command_cycle_id", cycleId)
    .eq("organization_id", organizationId)
    .in("status", ["queued", "running"])
    .maybeSingle();

  if (existingJob) {
    if (existingJob.status === "queued") {
      const { scanId } = await executeDiscoveryJob(
        supabase,
        organizationId,
        existingJob,
      );

      await completeCommandCycle(
        supabase,
        organizationId,
        cycle.id,
        cycle.correlation_id,
        {
          job_id: existingJob.id,
          opportunity_scan_id: scanId,
          resumed: true,
        },
      );

      return {
        status: "completed",
        cycleId: cycle.id,
        decisionId: "",
        planId: existingJob.plan_id ?? "",
        jobId: existingJob.id,
        correlationId: cycle.correlation_id,
      };
    }

    return {
      status: "skipped",
      reason: "pending_discovery_jobs",
      message: "Discovery job is already running.",
    };
  }

  const { data: decision } = await supabase
    .from("command_decisions")
    .select("*")
    .eq("command_cycle_id", cycleId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!decision) {
    const created = await createDiscoveryDecision(
      supabase,
      organizationId,
      cycle,
      mission,
    );

    const { plan, steps } = await createPlanFromDecision(
      supabase,
      organizationId,
      cycle,
      mission,
      created,
    );

    const step = steps[0];
    if (!step) {
      return { status: "failed", message: "Plan was created without steps." };
    }

    const job = await schedulePlanStep(
      supabase,
      organizationId,
      cycle,
      plan,
      step,
    );

    const { scanId } = await executeDiscoveryJob(supabase, organizationId, job);

    await completeCommandCycle(supabase, organizationId, cycle.id, cycle.correlation_id, {
      decision_id: created.id,
      plan_id: plan.id,
      job_id: job.id,
      opportunity_scan_id: scanId,
    });

    return {
      status: "completed",
      cycleId: cycle.id,
      decisionId: created.id,
      planId: plan.id,
      jobId: job.id,
      correlationId: cycle.correlation_id,
    };
  }

  return {
    status: "skipped",
    reason: "cycle_not_runnable",
    message: "Command cycle cannot be progressed from its current state.",
  };
}

export { createCommandCycle, createDiscoveryDecision } from "./command";
export { createMission, getActiveMission } from "./missions";
export { createPlanFromDecision } from "./planner";
export { schedulePlanStep, executeDiscoveryJob } from "./scheduler";
