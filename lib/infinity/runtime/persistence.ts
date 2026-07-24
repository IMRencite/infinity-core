import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "../events";
import type { EngineJob, WorkerRun } from "./types";

type AppendJobAttemptEventInput = {
  organizationId: string;
  engineJobId: string;
  workerRunId?: string | null;
  eventType: string;
  payload?: Json;
};

export async function appendJobAttemptEvent(
  admin: AdminSupabaseClient,
  input: AppendJobAttemptEventInput,
) {
  const { data, error } = await admin
    .from("job_attempt_events")
    .insert({
      organization_id: input.organizationId,
      engine_job_id: input.engineJobId,
      worker_run_id: input.workerRunId ?? null,
      event_type: input.eventType,
      payload: input.payload ?? {},
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to append job attempt event: ${error.message}`);
  }

  return data;
}

export async function emitRuntimeEngineEvent(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    engineName: string;
    eventType: string;
    entityType: string;
    entityId: string;
    message: string;
    correlationId: string;
    severity?: "debug" | "info" | "warning" | "error" | "critical";
    payload?: Json;
  },
) {
  return recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: input.engineName,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    message: input.message,
    correlationId: input.correlationId,
    severity: input.severity,
    payload: input.payload,
  });
}

export type ClaimResult = {
  job: EngineJob;
  workerRun: WorkerRun;
};

export async function claimEngineJob(
  admin: AdminSupabaseClient,
  engineJobId: string,
  organizationId: string,
  executorId: string,
): Promise<ClaimResult> {
  const { data, error } = await admin.rpc("claim_engine_job", {
    p_job_id: engineJobId,
    p_organization_id: organizationId,
    p_executor_id: executorId,
  });

  if (error) {
    throw new Error(`Failed to claim engine job: ${error.message}`);
  }

  if (!data || typeof data !== "object") {
    throw new Error("Claim engine job returned invalid payload");
  }

  const payload = data as { job?: EngineJob; worker_run?: WorkerRun };

  if (!payload.job || !payload.worker_run) {
    throw new Error("Claim engine job returned incomplete payload");
  }

  await emitRuntimeEngineEvent(admin, {
    organizationId,
    engineName: "scheduler",
    eventType: "scheduler.job_claimed",
    entityType: "engine_job",
    entityId: payload.job.id,
    message: "Scheduler claimed engine job for worker execution",
    correlationId: payload.job.correlation_id,
    payload: {
      worker_run_id: payload.worker_run.id,
      attempt_number: payload.worker_run.attempt_number,
      executor_id: executorId,
    },
  });

  await emitRuntimeEngineEvent(admin, {
    organizationId,
    engineName: "worker_runtime",
    eventType: "worker.run_started",
    entityType: "worker_run",
    entityId: payload.worker_run.id,
    message: "Worker run started",
    correlationId: payload.job.correlation_id,
    payload: {
      engine_job_id: payload.job.id,
      worker_name: payload.worker_run.worker_name,
      attempt_number: payload.worker_run.attempt_number,
    },
  });

  return {
    job: payload.job,
    workerRun: payload.worker_run,
  };
}
