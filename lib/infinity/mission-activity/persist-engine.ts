import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { mergeMissionActivityEvents, refreshMissionActivityFromDisk } from "./store";
import type { MissionActivityEvent } from "./types";

const ENGINE_NAME = "mission_activity";

let lastEnginePersistError: string | null = null;

export function lastMissionActivityEnginePersistError(): string | null {
  return lastEnginePersistError;
}

function isDuplicateEngineError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "23505" || /duplicate|unique/i.test(error.message ?? "");
}

export async function persistMissionActivityToEngineEvents(
  admin: AdminSupabaseClient,
  events: MissionActivityEvent[],
): Promise<number> {
  let written = 0;
  for (const event of events) {
    const { error } = await admin.from("engine_events").insert({
      organization_id: event.organizationId,
      engine_name: ENGINE_NAME,
      event_type: event.eventType,
      entity_type: "mission_activity_event",
      entity_id: event.eventId,
      message: event.summary,
      severity: event.eventType.endsWith("_FAILED") ? "error" : "info",
      payload: event as never,
    });
    if (!error || isDuplicateEngineError(error)) {
      written += 1;
    } else {
      lastEnginePersistError = error.message ?? error.code ?? "ENGINE_INSERT_FAILED";
    }
  }
  return written;
}

export async function persistMissionActivityEventBestEffort(event: MissionActivityEvent): Promise<number> {
  if (process.env.VITEST && process.env.INFINITY_MISSION_ACTIVITY_ENGINE_PERSIST !== "1") return 0;
  if (process.env.INFINITY_MISSION_ACTIVITY_ENGINE_PERSIST === "0") return 0;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    lastEnginePersistError = "SUPABASE_ENV_MISSING";
    return 0;
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const written = await persistMissionActivityToEngineEvents(createAdminClient(), [event]);
    lastEnginePersistError = written > 0 ? null : "ENGINE_INSERT_ZERO";
    return written;
  } catch (error) {
    lastEnginePersistError = error instanceof Error ? error.message : String(error);
    return 0;
  }
}

export async function hydrateMissionActivityFromEngineEvents(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<number> {
  const { data, error } = await admin
    .from("engine_events")
    .select("payload")
    .eq("organization_id", organizationId)
    .eq("engine_name", ENGINE_NAME)
    .eq("entity_type", "mission_activity_event")
    .order("created_at", { ascending: true })
    .limit(400);
  if (error || !data) return 0;
  const events = data
    .map((row) => row.payload as MissionActivityEvent)
    .filter((item) => item && item.eventId && item.missionId && item.eventType);
  const unique = [...new Map(events.map((event) => [event.eventId, event])).values()];
  return mergeMissionActivityEvents(unique, false);
}

export async function refreshMissionActivityFromDurableStores(
  admin: AdminSupabaseClient | null,
  organizationId: string,
): Promise<{ fromDisk: number; fromEngine: number }> {
  const fromDisk = refreshMissionActivityFromDisk();
  const fromEngine = admin ? await hydrateMissionActivityFromEngineEvents(admin, organizationId).catch(() => 0) : 0;
  return { fromDisk, fromEngine };
}
