import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { recordEngineEvent } from "@/lib/infinity/events";

type InfinitySupabase = SupabaseClient<Database>;

export async function emitExecutiveSelectionEvent(
  supabase: InfinitySupabase,
  input: {
    organizationId: string;
    eventType: string;
    message: string;
    correlationId?: string | null;
    missionId?: string;
    runtimeInstanceId?: string;
    executiveContextId?: string;
    decisionId?: string;
    opportunityId?: string;
    payload?: Record<string, unknown>;
  },
) {
  await recordEngineEvent(supabase, {
    organizationId: input.organizationId,
    engineName: "executive_engine",
    eventType: input.eventType,
    entityType: "executive_context",
    entityId: input.executiveContextId ?? input.decisionId ?? input.missionId ?? null,
    message: input.message,
    correlationId: input.correlationId ?? undefined,
    payload: {
      mission_id: input.missionId,
      runtime_instance_id: input.runtimeInstanceId,
      executive_context_id: input.executiveContextId,
      decision_id: input.decisionId,
      opportunity_id: input.opportunityId,
      ...(input.payload ?? {}),
    },
  });
}
