import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { emitRuntimeEngineEvent } from "@/lib/infinity/runtime/persistence";

export async function emitWorkerCapabilityEvent(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    eventType: string;
    message: string;
    correlationId: string;
    severity?: "info" | "warning" | "error" | "critical";
    payload: Record<string, unknown>;
  },
): Promise<void> {
  const safePayload = JSON.parse(
    JSON.stringify(input.payload, (_key, value) => {
      if (typeof value === "string") {
        if (/sk-[a-zA-Z0-9_-]{10,}/.test(value)) {
          return "[REDACTED]";
        }
        if (/Bearer\s+/i.test(value)) {
          return "[REDACTED]";
        }
      }
      return value;
    }),
  ) as Record<string, unknown>;

  const entityId =
    typeof safePayload.worker_result_id === "string"
      ? safePayload.worker_result_id
      : typeof safePayload.engine_job_id === "string"
        ? safePayload.engine_job_id
        : "worker-capability-event";

  await emitRuntimeEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "worker_capability_engine",
    eventType: input.eventType,
    entityType: "worker_result",
    entityId,
    message: input.message,
    correlationId: input.correlationId,
    severity: input.severity ?? "info",
    payload: safePayload as Json,
  });
}
