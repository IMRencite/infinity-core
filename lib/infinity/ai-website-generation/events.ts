import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { emitRuntimeEngineEvent } from "@/lib/infinity/runtime/persistence";

const AI_WEBSITE_ENGINE_NAME = "ai_website_generation";

export async function emitAiWebsiteEvent(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    eventType: string;
    message: string;
    buildId?: string;
    planId?: string;
    correlationId?: string | null;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  const safePayload = {
    build_id: input.buildId,
    generation_plan_id: input.planId,
    ...input.payload,
  } satisfies Record<string, unknown>;

  await emitRuntimeEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: AI_WEBSITE_ENGINE_NAME,
    eventType: input.eventType,
    entityType: "ai_website_generation_plan",
    entityId: input.planId ?? input.buildId ?? "unknown",
    message: input.message,
    correlationId: input.correlationId ?? crypto.randomUUID(),
    severity: "info",
    payload: safePayload as Json,
  });
}
