import type { Json } from "@/lib/supabase/database.types";
import { recordEngineEvent } from "@/lib/infinity/events";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { REASONING_ENGINE_NAME } from "./constants";

type InfinitySupabase = SupabaseClient<Database>;

export type ReasoningEventType =
  | "reasoning.session_requested"
  | "reasoning.session_started"
  | "reasoning.context_built"
  | "reasoning.provider_called"
  | "reasoning.response_received"
  | "reasoning.output_validated"
  | "reasoning.output_rejected"
  | "reasoning.session_completed"
  | "reasoning.session_failed"
  | "reasoning.session_policy_blocked"
  | "reasoning.executive_review_requested";

export async function emitReasoningEvent(
  supabase: InfinitySupabase,
  input: {
    organizationId: string;
    eventType: ReasoningEventType;
    message: string;
    entityId?: string | null;
    correlationId?: string | null;
    payload?: Json;
  },
): Promise<void> {
  const payload: Json = {
    ...(typeof input.payload === "object" && input.payload !== null ? input.payload : {}),
    event_type: input.eventType,
  };

  await recordEngineEvent(supabase, {
    organizationId: input.organizationId,
    engineName: REASONING_ENGINE_NAME,
    eventType: input.eventType,
    entityType: "reasoning_session",
    entityId: input.entityId ?? null,
    message: input.message,
    correlationId: input.correlationId ?? undefined,
    payload,
  });
}
