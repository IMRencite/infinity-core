import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  completeCommandCycle,
  createCommandCycle,
  createDiscoveryDecision,
} from "./command";
import { getActiveMission } from "./missions";
import { createPlanFromDecision } from "./planner";
import {
  executeJob,
  registerRuntimeWorkers,
  type JobExecutionResult,
} from "./runtime";
import { schedulePlanStep } from "./scheduler";
import type { CommandCycleResult, EngineJob, RunQueuedJobResult } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

function readScanId(output: Json | undefined): string | null {
  if (
    typeof output === "object" &&
    output !== null &&
    !Array.isArray(output) &&
    "opportunity_scan_id" in output
  ) {
    return String((output as Record<string, Json>).opportunity_scan_id);
  }

  return null;
}

function isJobDue(job: Pick<EngineJob, "status" | "next_attempt_at">, now: string): boolean {
  if (job.status === "queued") {
    return true;
  }

  return job.next_attempt_at === null || job.next_attempt_at <= now;
}

export async function findOldestDueQueuedJob(
  supabase: InfinitySupabase,
  organizationId: string,
): Promise<EngineJob | null> {
  const now = new Date().toISOString();

  const { data: jobs, error } = await supabase
    .from("engine_jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .in("status", ["queued", "waiting"])
    .lte("available_at", now)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    throw new Error(`Failed to load queued engine jobs: ${error.message}`);
  }

  return jobs?.find((job) => isJobDue(job, now)) ?? null;
}

function buildCompletedResult(
  cycleId: string,
  correlationId: string,
  missionId: string,
  decisionId: string,
  planId: string,
  planStepId: string,
  jobId: string,
  execution: Extract<JobExecutionResult, { status: "completed" }>,
): CommandCycleResult {
  return {
    status: "completed",
    cycleId,
    correlationId,
    missionId,
    decisionId,
    planId,
    planStepId,
    jobId,
    workerRunId: execution.workerRun.id,
    opportunityScanId: readScanId(execution.output),
    jobStatus: execution.job.status,
    workerRunStatus: execution.workerRun.status,
  };
}

export async function runDiscoveryCommandCycle(
  supabase: InfinitySupabase,
  organizationId: string,
  executorId: string,
  triggerSource: "manual" | "scheduled" | "event" | "system" = "manual",
): Promise<CommandCycleResult> {
  registerRuntimeWorkers();

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
      mission,
      plan,
      step,
    );

    const admin = createAdminClient();
    const execution = await executeJob(admin, {
      engineJobId: job.id,
      organizationId,
      executorId,
    });

    if (execution.status !== "completed") {
      throw new Error(
        execution.status === "already_terminal"
          ? execution.message
          : `Worker runtime finished with status ${execution.status}`,
      );
    }

    await completeCommandCycle(supabase, organizationId, cycle.id, cycle.correlation_id, {
      decision_id: decision.id,
      plan_id: plan.id,
      plan_step_id: step.id,
      job_id: job.id,
      worker_run_id: execution.workerRun.id,
      opportunity_scan_id: readScanId(execution.output),
      job_status: execution.job.status,
    });

    return buildCompletedResult(
      cycle.id,
      cycle.correlation_id,
      mission.id,
      decision.id,
      plan.id,
      step.id,
      job.id,
      execution,
    );
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
  executorId: string,
): Promise<CommandCycleResult> {
  registerRuntimeWorkers();

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

  const admin = createAdminClient();

  const { data: existingJob } = await supabase
    .from("engine_jobs")
    .select("*")
    .eq("command_cycle_id", cycleId)
    .eq("organization_id", organizationId)
    .in("status", ["queued", "waiting"])
    .maybeSingle();

  if (existingJob) {
    const execution = await executeJob(admin, {
      engineJobId: existingJob.id,
      organizationId,
      executorId,
    });

    if (execution.status !== "completed") {
      return {
        status: "failed",
        message:
          execution.status === "already_terminal"
            ? execution.message
            : `Worker runtime finished with status ${execution.status}`,
      };
    }

    await completeCommandCycle(supabase, organizationId, cycle.id, cycle.correlation_id, {
      job_id: existingJob.id,
      worker_run_id: execution.workerRun.id,
      opportunity_scan_id: readScanId(execution.output),
      resumed: true,
    });

    return buildCompletedResult(
      cycle.id,
      cycle.correlation_id,
      mission.id,
      "",
      existingJob.plan_id ?? "",
      existingJob.plan_step_id ?? "",
      existingJob.id,
      execution,
    );
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
      mission,
      plan,
      step,
    );

    const execution = await executeJob(admin, {
      engineJobId: job.id,
      organizationId,
      executorId,
    });

    if (execution.status !== "completed") {
      return {
        status: "failed",
        message: `Worker runtime finished with status ${execution.status}`,
      };
    }

    await completeCommandCycle(supabase, organizationId, cycle.id, cycle.correlation_id, {
      decision_id: created.id,
      plan_id: plan.id,
      plan_step_id: step.id,
      job_id: job.id,
      worker_run_id: execution.workerRun.id,
      opportunity_scan_id: readScanId(execution.output),
    });

    return buildCompletedResult(
      cycle.id,
      cycle.correlation_id,
      mission.id,
      created.id,
      plan.id,
      step.id,
      job.id,
      execution,
    );
  }

  return {
    status: "skipped",
    reason: "cycle_not_runnable",
    message: "Command cycle cannot be progressed from its current state.",
  };
}

export async function runNextQueuedJob(
  supabase: InfinitySupabase,
  organizationId: string,
  executorId: string,
): Promise<RunQueuedJobResult> {
  registerRuntimeWorkers();

  const job = await findOldestDueQueuedJob(supabase, organizationId);

  if (!job) {
    return {
      status: "skipped",
      reason: "no_due_job",
      message: "No due queued or waiting engine jobs found for this organization.",
    };
  }

  try {
    const admin = createAdminClient();
    const execution = await executeJob(admin, {
      engineJobId: job.id,
      organizationId,
      executorId,
    });

    if (execution.status === "completed") {
      if (job.command_cycle_id) {
        const { data: cycle } = await supabase
          .from("command_cycles")
          .select("id, correlation_id, status")
          .eq("id", job.command_cycle_id)
          .eq("organization_id", organizationId)
          .maybeSingle();

        if (cycle?.status === "running") {
          await completeCommandCycle(
            supabase,
            organizationId,
            cycle.id,
            cycle.correlation_id,
            {
              job_id: job.id,
              worker_run_id: execution.workerRun.id,
              opportunity_scan_id: readScanId(execution.output),
              resumed: true,
            },
          );
        }
      }

      const scanId = readScanId(execution.output);

      return {
        status: "completed",
        engineJobId: execution.job.id,
        engineJobStatus: execution.job.status,
        workerRunId: execution.workerRun.id,
        workerRunStatus: execution.workerRun.status,
        opportunityScanId: scanId,
        message: [
          "Queued engine job executed.",
          `Job ${execution.job.id.slice(0, 8)}… (${execution.job.status})`,
          `Worker run ${execution.workerRun.id.slice(0, 8)}… (${execution.workerRun.status})`,
          scanId ? `Scan ${scanId.slice(0, 8)}…` : "Scan none",
        ].join(" "),
      };
    }

    if (execution.status === "waiting") {
      return {
        status: "waiting",
        engineJobId: execution.job.id,
        engineJobStatus: execution.job.status,
        workerRunId: execution.workerRun.id,
        workerRunStatus: execution.workerRun.status,
        opportunityScanId: null,
        message: `Job retry scheduled for ${new Date(execution.nextAttemptAt).toLocaleString()}.`,
      };
    }

    if (execution.status === "dead_letter") {
      return {
        status: "dead_letter",
        engineJobId: execution.job.id,
        engineJobStatus: execution.job.status,
        workerRunId: execution.workerRun.id,
        workerRunStatus: execution.workerRun.status,
        opportunityScanId: null,
        message: "Engine job moved to dead letter after exhausted retries.",
      };
    }

    if (execution.status === "cancelled") {
      return {
        status: "cancelled",
        engineJobId: execution.job.id,
        engineJobStatus: execution.job.status,
        workerRunId: execution.workerRun?.id ?? null,
        workerRunStatus: execution.workerRun?.status ?? null,
        opportunityScanId: null,
        message: "Engine job was cancelled before worker execution.",
      };
    }

    return {
      status: "already_terminal",
      engineJobId: execution.job.id,
      engineJobStatus: execution.job.status,
      workerRunId: null,
      workerRunStatus: null,
      opportunityScanId: null,
      message: execution.message,
    };
  } catch (error) {
    return {
      status: "failed",
      message:
        error instanceof Error ? error.message : "Queued engine job execution failed unexpectedly.",
    };
  }
}

export { createCommandCycle, createDiscoveryDecision } from "./command";
export { createMission, getActiveMission } from "./missions";
export { createPlanFromDecision } from "./planner";
export { schedulePlanStep } from "./scheduler";
