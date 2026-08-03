import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { EngineJob, WorkerRun } from "@/lib/infinity/runtime/types";
import type { WorkerExecutionResult } from "@/lib/infinity/runtime/types";
import { emitWorkerCapabilityEvent } from "./events";
import { planStepMayComplete } from "./lifecycle";
import type { PersistedWorkerResultRef } from "./types";

export function buildIdempotentWorkerOutput(existing: PersistedWorkerResultRef): WorkerExecutionResult {
  const structured =
    typeof existing.structuredOutput === "object" &&
    existing.structuredOutput !== null &&
    !Array.isArray(existing.structuredOutput)
      ? (existing.structuredOutput as Record<string, Json>)
      : {};

  return {
    output: {
      worker_result_id: existing.id,
      idempotent: true,
      review_status: existing.reviewStatus,
      ...structured,
    } as Json,
    metrics: { idempotent: true },
  };
}

export function isWorkerResultReusable(existing: PersistedWorkerResultRef): boolean {
  if (existing.status === "needs_review" && existing.reviewStatus === "pending") {
    return true;
  }
  if (existing.status === "completed" && planStepMayComplete(existing.reviewStatus)) {
    return true;
  }
  return false;
}

export async function emitWorkerExecutionReused(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    correlationId: string;
    job: EngineJob;
    workerRun: WorkerRun;
    existing: PersistedWorkerResultRef;
    capabilityVersion: string;
    executionKey: string;
  },
): Promise<void> {
  await emitWorkerCapabilityEvent(admin, {
    organizationId: input.organizationId,
    eventType: "worker.execution_reused",
    message: "Returning existing worker result for execution key (idempotent reuse)",
    correlationId: input.correlationId,
    payload: {
      worker_result_id: input.existing.id,
      execution_key: input.executionKey,
      capability_key: input.job.capability_key,
      capability_version: input.capabilityVersion,
      original_completed_at: input.existing.completedAt,
      correlation_id: input.correlationId,
      engine_job_id: input.job.id,
      worker_run_id: input.workerRun.id,
    },
  });
}

export async function returnIdempotentWorkerResultIfReusable(
  admin: AdminSupabaseClient,
  input: {
    job: EngineJob;
    workerRun: WorkerRun;
    existing: PersistedWorkerResultRef;
    capabilityVersion: string;
    executionKey: string;
  },
): Promise<WorkerExecutionResult | null> {
  if (!isWorkerResultReusable(input.existing)) {
    return null;
  }

  await emitWorkerExecutionReused(admin, {
    organizationId: input.job.organization_id,
    correlationId: input.job.correlation_id,
    job: input.job,
    workerRun: input.workerRun,
    existing: input.existing,
    capabilityVersion: input.capabilityVersion,
    executionKey: input.executionKey,
  });

  return buildIdempotentWorkerOutput(input.existing);
}

export function isIdempotentWorkerExecutionResult(result: WorkerExecutionResult): boolean {
  if (
    typeof result.metrics === "object" &&
    result.metrics !== null &&
    !Array.isArray(result.metrics) &&
    (result.metrics as Record<string, unknown>).idempotent === true
  ) {
    return true;
  }
  if (
    typeof result.output === "object" &&
    result.output !== null &&
    !Array.isArray(result.output) &&
    (result.output as Record<string, unknown>).idempotent === true
  ) {
    return true;
  }
  return false;
}
