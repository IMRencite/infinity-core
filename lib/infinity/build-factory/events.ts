import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { emitRuntimeEngineEvent } from "@/lib/infinity/runtime/persistence";
import { BUILD_FACTORY_ENGINE_NAME } from "./constants";

export async function emitBuildFactoryEvent(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    eventType: string;
    message: string;
    correlationId: string;
    buildId: string;
    payload?: Record<string, unknown>;
    severity?: "info" | "warning" | "error" | "critical";
  },
): Promise<void> {
  const safePayload = JSON.parse(
    JSON.stringify(
      {
        build_id: input.buildId,
        ...input.payload,
      },
      (_key, value) => {
        if (typeof value === "string") {
          if (/sk-[a-zA-Z0-9_-]{10,}/.test(value)) return "[REDACTED]";
          if (/Bearer\s+/i.test(value)) return "[REDACTED]";
          if (value.includes(".env.local")) return "[REDACTED_PATH]";
        }
        return value;
      },
    ),
  ) as Record<string, unknown>;

  await emitRuntimeEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: BUILD_FACTORY_ENGINE_NAME,
    eventType: input.eventType,
    entityType: "build",
    entityId: input.buildId,
    message: input.message,
    correlationId: input.correlationId,
    severity: input.severity ?? "info",
    payload: safePayload as Json,
  });
}
