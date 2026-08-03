import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { recordEngineEvent } from "@/lib/infinity/events";
import { DISCOVERY_ENGINE_VERSION } from "../providers/config";

export async function emitDiscoveryPipelineEvent(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    eventType: string;
    entityType: string;
    entityId: string;
    message: string;
    correlationId?: string | null;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "discovery_engine",
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    message: input.message,
    correlationId: input.correlationId ?? undefined,
    payload: {
      discovery_engine_version: DISCOVERY_ENGINE_VERSION,
      ...(input.payload ?? {}),
    },
  });
}
