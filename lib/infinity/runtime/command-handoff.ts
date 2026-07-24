import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { emitRuntimeEngineEvent } from "./persistence";
import type { EngineJob } from "./types";

export async function requestCommandReevaluation(
  admin: AdminSupabaseClient,
  job: EngineJob,
  reason: string,
  extraPayload: Json = {},
) {
  const basePayload: Record<string, Json | undefined> = {
    command_cycle_id: job.command_cycle_id,
    plan_id: job.plan_id,
    plan_step_id: job.plan_step_id,
    mission_id: job.mission_id,
    job_status: job.status,
  };

  const mergedPayload =
    typeof extraPayload === "object" &&
    extraPayload !== null &&
    !Array.isArray(extraPayload)
      ? { ...basePayload, ...(extraPayload as Record<string, Json>) }
      : basePayload;

  await emitRuntimeEngineEvent(admin, {
    organizationId: job.organization_id,
    engineName: "command",
    eventType: "command.reevaluation_requested",
    entityType: "engine_job",
    entityId: job.id,
    message: reason,
    correlationId: job.correlation_id,
    payload: mergedPayload,
  });
}
