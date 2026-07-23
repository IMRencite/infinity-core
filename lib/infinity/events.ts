import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type InfinitySupabase = SupabaseClient<Database>;

type RecordEngineEventInput = {
  organizationId: string;
  engineName: string;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  message: string;
  severity?: "debug" | "info" | "warning" | "error" | "critical";
  payload?: Json;
  correlationId?: string;
};

export async function recordEngineEvent(
  supabase: InfinitySupabase,
  input: RecordEngineEventInput,
) {
  const payload: Json = {
    ...(typeof input.payload === "object" && input.payload !== null
      ? (input.payload as Record<string, Json>)
      : {}),
    ...(input.correlationId ? { correlation_id: input.correlationId } : {}),
  };

  const { data, error } = await supabase
    .from("engine_events")
    .insert({
      organization_id: input.organizationId,
      engine_name: input.engineName,
      event_type: input.eventType,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      message: input.message,
      severity: input.severity ?? "info",
      payload,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to record engine event ${input.eventType}: ${error.message}`);
  }

  return data;
}
