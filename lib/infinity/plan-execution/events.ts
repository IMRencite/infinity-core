import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { recordEngineEvent } from "@/lib/infinity/events";
import { PLAN_EXECUTION_EVENTS } from "./constants";

export async function emitPlanExecutionEvent(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    eventType: string;
    message: string;
    correlationId?: string | null;
    missionId?: string;
    runtimeInstanceId?: string | null;
    planExecutionId?: string;
    planId?: string;
    planStepId?: string;
    allocationId?: string | null;
    buildJobId?: string | null;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "plan_execution",
    eventType: input.eventType,
    entityType: "plan_execution",
    entityId: input.planExecutionId ?? input.planId ?? input.organizationId,
    message: input.message,
    correlationId: input.correlationId ?? undefined,
    payload: {
      mission_id: input.missionId,
      runtime_instance_id: input.runtimeInstanceId,
      plan_execution_id: input.planExecutionId,
      plan_id: input.planId,
      plan_step_id: input.planStepId,
      allocation_id: input.allocationId,
      build_job_id: input.buildJobId,
      ...(input.payload ?? {}),
    } as Json,
  });
}

export { PLAN_EXECUTION_EVENTS };
