import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { requestCommandReevaluation } from "./command-handoff";
import {
  appendJobAttemptEvent,
  claimEngineJob,
  emitRuntimeEngineEvent,
} from "./persistence";
import { assertPlannerMayExecuteEngineJob } from "../planner-gating";
import {
  calculateNextAttemptAt,
  defaultClassifyFailure,
  serializeError,
} from "./retry";
import type {
  EngineJob,
  FailureClass,
  JobExecutionResult,
  WorkerRun,
} from "./types";
import { resolveWorkerForJob } from "./worker-registry";
import { WorkerTimeoutError } from "./workers/discovery-scan-worker";

type ExecuteJobInput = {
  engineJobId: string;
  organizationId: string;
  executorId: string;
};

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new WorkerTimeoutError(message));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function markPlanArtifactsCompleted(
  admin: AdminSupabaseClient,
  job: EngineJob,
) {
  if (job.plan_step_id) {
    await admin
      .from("plan_steps")
      .update({ status: "completed" })
      .eq("id", job.plan_step_id)
      .eq("organization_id", job.organization_id);
  }

  if (job.plan_id) {
    await admin
      .from("plans")
      .update({ status: "completed" })
      .eq("id", job.plan_id)
      .eq("organization_id", job.organization_id);
  }
}

async function handleCancellation(
  admin: AdminSupabaseClient,
  job: EngineJob,
): Promise<JobExecutionResult> {
  const now = new Date().toISOString();

  const { data: cancelledJob, error: jobError } = await admin
    .from("engine_jobs")
    .update({
      status: "cancelled",
      completed_at: now,
      last_error: {
        class: "cancellation",
        message: "Cancellation requested before execution",
      },
      locked_at: null,
      locked_by: null,
    })
    .eq("id", job.id)
    .eq("organization_id", job.organization_id)
    .select("*")
    .single();

  if (jobError || !cancelledJob) {
    throw new Error(`Failed to cancel job: ${jobError?.message ?? "unknown error"}`);
  }

  await appendJobAttemptEvent(admin, {
    organizationId: job.organization_id,
    engineJobId: job.id,
    eventType: "job.cancelled",
    payload: {
      cancelled_at: now,
    },
  });

  await emitRuntimeEngineEvent(admin, {
    organizationId: job.organization_id,
    engineName: "scheduler",
    eventType: "scheduler.job_cancelled",
    entityType: "engine_job",
    entityId: job.id,
    message: "Engine job cancelled before worker execution",
    correlationId: job.correlation_id,
  });

  await requestCommandReevaluation(
    admin,
    cancelledJob,
    "Engine job cancelled; Command re-evaluation requested",
    { terminal_state: "cancelled" },
  );

  return {
    status: "cancelled",
    job: cancelledJob,
    workerRun: null,
  };
}

async function handleFailure(
  admin: AdminSupabaseClient,
  job: EngineJob,
  workerRun: WorkerRun,
  failureClass: FailureClass,
  error: unknown,
): Promise<JobExecutionResult> {
  const now = new Date().toISOString();
  const serialized = serializeError(error);
  const workerStatus =
    failureClass === "timeout" ? "timed_out" : "failed";

  const durationMs =
    workerRun.started_at !== null
      ? Math.max(0, Date.parse(now) - Date.parse(workerRun.started_at))
      : null;

  await admin
    .from("worker_runs")
    .update({
      status: workerStatus,
      completed_at: now,
      duration_ms: durationMs,
      error: {
        class: failureClass,
        ...serialized,
      },
    })
    .eq("id", workerRun.id)
    .eq("organization_id", job.organization_id);

  await appendJobAttemptEvent(admin, {
    organizationId: job.organization_id,
    engineJobId: job.id,
    workerRunId: workerRun.id,
    eventType: "worker.failed",
    payload: {
      class: failureClass,
      ...serialized,
    },
  });

  await emitRuntimeEngineEvent(admin, {
    organizationId: job.organization_id,
    engineName: "worker_runtime",
    eventType: "worker.run_failed",
    entityType: "worker_run",
    entityId: workerRun.id,
    message: `Worker run ${workerStatus}`,
    correlationId: job.correlation_id,
    severity: failureClass === "timeout" ? "warning" : "error",
    payload: {
      class: failureClass,
      engine_job_id: job.id,
    },
  });

  const shouldRetry =
    (failureClass === "retryable" || failureClass === "timeout") &&
    workerRun.attempt_number < job.max_attempts;

  if (shouldRetry) {
    const nextAttemptAt = calculateNextAttemptAt(workerRun.attempt_number);

    const { data: waitingJob, error: waitingError } = await admin
      .from("engine_jobs")
      .update({
        status: "waiting",
        next_attempt_at: nextAttemptAt,
        last_error: {
          class: failureClass,
          ...serialized,
        },
        locked_at: null,
        locked_by: null,
        error_message: serialized.message ? String(serialized.message) : "Worker failed",
      })
      .eq("id", job.id)
      .eq("organization_id", job.organization_id)
      .select("*")
      .single();

    if (waitingError || !waitingJob) {
      throw new Error(
        `Failed to schedule retry: ${waitingError?.message ?? "unknown error"}`,
      );
    }

    await appendJobAttemptEvent(admin, {
      organizationId: job.organization_id,
      engineJobId: job.id,
      workerRunId: workerRun.id,
      eventType: "job.retry_scheduled",
      payload: {
        next_attempt_at: nextAttemptAt,
        attempt_number: workerRun.attempt_number,
      },
    });

    await emitRuntimeEngineEvent(admin, {
      organizationId: job.organization_id,
      engineName: "scheduler",
      eventType: "scheduler.retry_scheduled",
      entityType: "engine_job",
      entityId: job.id,
      message: "Scheduler scheduled job retry",
      correlationId: job.correlation_id,
      payload: {
        next_attempt_at: nextAttemptAt,
        attempt_number: workerRun.attempt_number,
      },
    });

    return {
      status: "waiting",
      job: waitingJob,
      workerRun,
      nextAttemptAt,
    };
  }

  const { data: deadLetterJob, error: deadLetterError } = await admin
    .from("engine_jobs")
    .update({
      status: "dead_letter",
      completed_at: now,
      last_error: {
        class: failureClass,
        ...serialized,
      },
      locked_at: null,
      locked_by: null,
      error_message: serialized.message ? String(serialized.message) : "Worker failed",
    })
    .eq("id", job.id)
    .eq("organization_id", job.organization_id)
    .select("*")
    .single();

  if (deadLetterError || !deadLetterJob) {
    throw new Error(
      `Failed to dead-letter job: ${deadLetterError?.message ?? "unknown error"}`,
    );
  }

  await appendJobAttemptEvent(admin, {
    organizationId: job.organization_id,
    engineJobId: job.id,
    workerRunId: workerRun.id,
    eventType: "job.dead_lettered",
    payload: {
      class: failureClass,
      attempt_number: workerRun.attempt_number,
    },
  });

  await emitRuntimeEngineEvent(admin, {
    organizationId: job.organization_id,
    engineName: "scheduler",
    eventType: "scheduler.job_dead_lettered",
    entityType: "engine_job",
    entityId: job.id,
    message: "Engine job moved to dead letter after exhausted retries",
    correlationId: job.correlation_id,
    severity: "critical",
    payload: {
      attempt_number: workerRun.attempt_number,
      max_attempts: job.max_attempts,
    },
  });

  await requestCommandReevaluation(
    admin,
    deadLetterJob,
    "Engine job dead-lettered; Command re-evaluation requested",
    { terminal_state: "dead_letter" },
  );

  return {
    status: "dead_letter",
    job: deadLetterJob,
    workerRun,
  };
}

export async function executeJob(
  admin: AdminSupabaseClient,
  input: ExecuteJobInput,
): Promise<JobExecutionResult> {
  const { data: existingJob, error: loadError } = await admin
    .from("engine_jobs")
    .select("*")
    .eq("id", input.engineJobId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (loadError || !existingJob) {
    throw new Error(loadError?.message ?? "Engine job not found");
  }

  if (["completed", "dead_letter", "cancelled"].includes(existingJob.status)) {
    return {
      status: "already_terminal",
      job: existingJob,
      message: `Job is already ${existingJob.status}`,
    };
  }

  if (existingJob.status === "running") {
    return {
      status: "already_terminal",
      job: existingJob,
      message: "Job is already running and cannot be claimed again",
    };
  }

  if (existingJob.cancellation_requested_at) {
    return handleCancellation(admin, existingJob);
  }

  await assertPlannerMayExecuteEngineJob(admin, input.organizationId, {
    capability_key: existingJob.capability_key,
    payload: existingJob.payload,
  });

  const { job, workerRun } = await claimEngineJob(
    admin,
    input.engineJobId,
    input.organizationId,
    input.executorId,
  );

  await appendJobAttemptEvent(admin, {
    organizationId: job.organization_id,
    engineJobId: job.id,
    workerRunId: workerRun.id,
    eventType: "job.started",
    payload: {
      attempt_number: workerRun.attempt_number,
    },
  });

  const worker = await resolveWorkerForJob(
    admin,
    job.organization_id,
    job.capability_key,
    job.resolved_capability_id,
  );

  const timeoutSeconds = job.timeout_seconds ?? worker.timeoutSeconds ?? 300;
  const context = {
    admin,
    organizationId: job.organization_id,
    missionId: job.mission_id,
    engineJobId: job.id,
    workerRunId: workerRun.id,
    correlationId: job.correlation_id,
    attemptNumber: workerRun.attempt_number,
    input: job.payload,
  };

  try {
    const result = await withTimeout(
      worker.execute(job.payload, context),
      timeoutSeconds * 1000,
      `Worker timed out after ${timeoutSeconds} seconds`,
    );

    const completedAt = new Date().toISOString();
    const durationMs =
      workerRun.started_at !== null
        ? Math.max(0, Date.parse(completedAt) - Date.parse(workerRun.started_at))
        : null;

    const { data: completedWorkerRun, error: workerUpdateError } = await admin
      .from("worker_runs")
      .update({
        status: "completed",
        output: result.output,
        metrics: result.metrics ?? {},
        confidence_score: result.confidenceScore ?? null,
        quality_score: result.qualityScore ?? null,
        cost_amount: result.costAmount ?? null,
        cost_currency: result.costCurrency ?? null,
        completed_at: completedAt,
        duration_ms: durationMs,
      })
      .eq("id", workerRun.id)
      .eq("organization_id", job.organization_id)
      .select("*")
      .single();

    if (workerUpdateError || !completedWorkerRun) {
      throw new Error(
        `Failed to update worker run: ${workerUpdateError?.message ?? "unknown error"}`,
      );
    }

    const { data: completedJob, error: jobUpdateError } = await admin
      .from("engine_jobs")
      .update({
        status: "completed",
        completed_at: completedAt,
        result: result.output,
        last_error: {},
        locked_at: null,
        locked_by: null,
        error_message: null,
      })
      .eq("id", job.id)
      .eq("organization_id", job.organization_id)
      .select("*")
      .single();

    if (jobUpdateError || !completedJob) {
      throw new Error(
        `Failed to complete engine job: ${jobUpdateError?.message ?? "unknown error"}`,
      );
    }

    await markPlanArtifactsCompleted(admin, completedJob);

    await appendJobAttemptEvent(admin, {
      organizationId: job.organization_id,
      engineJobId: job.id,
      workerRunId: workerRun.id,
      eventType: "worker.completed",
      payload: {
        output: result.output,
      },
    });

    await appendJobAttemptEvent(admin, {
      organizationId: job.organization_id,
      engineJobId: job.id,
      workerRunId: workerRun.id,
      eventType: "job.completed",
      payload: {
        result: result.output,
      },
    });

    await emitRuntimeEngineEvent(admin, {
      organizationId: job.organization_id,
      engineName: worker.engineName,
      eventType: "discovery.scan_completed",
      entityType: "opportunity_scan",
      entityId:
        typeof result.output === "object" &&
        result.output !== null &&
        !Array.isArray(result.output) &&
        "opportunity_scan_id" in result.output
          ? String((result.output as Record<string, Json>).opportunity_scan_id)
          : job.id,
      message: "Discovery scan completed via Worker Runtime",
      correlationId: job.correlation_id,
      payload: {
        engine_job_id: job.id,
        worker_run_id: workerRun.id,
        output: result.output,
      },
    });

    await emitRuntimeEngineEvent(admin, {
      organizationId: job.organization_id,
      engineName: "worker_runtime",
      eventType: "worker.run_completed",
      entityType: "worker_run",
      entityId: workerRun.id,
      message: "Worker run completed",
      correlationId: job.correlation_id,
      payload: {
        engine_job_id: job.id,
        output: result.output,
      },
    });

    await emitRuntimeEngineEvent(admin, {
      organizationId: job.organization_id,
      engineName: "scheduler",
      eventType: "scheduler.job_completed",
      entityType: "engine_job",
      entityId: job.id,
      message: "Scheduler job completed",
      correlationId: job.correlation_id,
      payload: {
        worker_run_id: workerRun.id,
        result: result.output,
      },
    });

    await requestCommandReevaluation(
      admin,
      completedJob,
      "Engine job completed; Command re-evaluation requested",
      { terminal_state: "completed", result: result.output },
    );

    return {
      status: "completed",
      job: completedJob,
      workerRun: completedWorkerRun,
      output: result.output,
    };
  } catch (error) {
    const classify = worker.classifyFailure ?? defaultClassifyFailure;
    const failureClass = classify(error);
    return handleFailure(admin, job, workerRun, failureClass, error);
  }
}
