import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { EngineJob } from "@/lib/infinity/runtime/types";
import type { WorkerRun } from "@/lib/infinity/runtime/types";
import { getWorkerCapabilityContract } from "./capability";
import {
  buildWorkerExecutionKey,
  hashWorkerInput,
  normalizeWorkerInput,
} from "./input-schema";
import type { WorkerExecutionContextBound } from "./types";

export async function buildWorkerExecutionContext(
  admin: AdminSupabaseClient,
  job: EngineJob,
  workerRun: WorkerRun,
  capabilityVersion: string,
): Promise<WorkerExecutionContextBound> {
  const contract = getWorkerCapabilityContract(job.capability_key);
  if (!contract) {
    throw new Error(`No worker contract for ${job.capability_key}`);
  }

  const approvedInput = job.payload;
  const normalized = normalizeWorkerInput(approvedInput);
  const inputHash = hashWorkerInput(approvedInput);
  const executionKey = buildWorkerExecutionKey({
    organizationId: job.organization_id,
    missionId: job.mission_id,
    planId: job.plan_id,
    planStepId: job.plan_step_id,
    capabilityKey: job.capability_key,
    capabilityVersion,
    inputHash,
  });

  let runtimeInstanceId: string | null = null;
  if (job.mission_id) {
    const { data: runtime } = await admin
      .from("mission_runtime_instances")
      .select("id")
      .eq("organization_id", job.organization_id)
      .eq("mission_id", job.mission_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    runtimeInstanceId = runtime?.id ?? null;
  }

  const opportunityId = readOpportunityId(normalized, job.payload);

  return {
    organizationId: job.organization_id,
    missionId: job.mission_id,
    runtimeInstanceId,
    opportunityId,
    planId: job.plan_id,
    planStepId: job.plan_step_id,
    engineJobId: job.id,
    workerRunId: workerRun.id,
    correlationId: job.correlation_id,
    capabilityKey: job.capability_key,
    capabilityVersion,
    idempotencyKey: job.idempotency_key,
    executionKey,
    attemptNumber: workerRun.attempt_number,
    approvedInput: approvedInput as Json,
    constraints: readConstraints(normalized),
    grantedPermissions: new Set(contract.permissions),
  };
}

function readOpportunityId(
  normalized: Record<string, unknown>,
  payload: Json,
): string | null {
  const direct = normalized.opportunity_id;
  if (typeof direct === "string") {
    return direct;
  }
  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    const constraints = (payload as Record<string, Json>).constraints;
    if (typeof constraints === "object" && constraints !== null && !Array.isArray(constraints)) {
      const oid = (constraints as Record<string, unknown>).opportunity_id;
      if (typeof oid === "string") {
        return oid;
      }
    }
  }
  return null;
}

function readConstraints(normalized: Record<string, unknown>): Record<string, unknown> {
  const constraints = normalized.constraints;
  if (typeof constraints === "object" && constraints !== null && !Array.isArray(constraints)) {
    return constraints as Record<string, unknown>;
  }
  return {};
}
