import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { recordEngineEvent } from "@/lib/infinity/events";
import { VENTURE_ASSEMBLY_EVENTS } from "./constants";

export async function emitVentureAssemblyEvent(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    eventType: string;
    message: string;
    correlationId?: string | null;
    missionId?: string;
    ventureAssemblyId?: string;
    planExecutionId?: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "venture_assembly",
    eventType: input.eventType,
    entityType: "venture_assembly",
    entityId: input.ventureAssemblyId ?? input.organizationId,
    message: input.message,
    correlationId: input.correlationId ?? undefined,
    payload: {
      mission_id: input.missionId,
      venture_assembly_id: input.ventureAssemblyId,
      plan_execution_id: input.planExecutionId,
      ...(input.payload ?? {}),
    } as Json,
  });
}

export { VENTURE_ASSEMBLY_EVENTS };
