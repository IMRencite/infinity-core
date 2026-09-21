import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type InfinitySupabase = SupabaseClient<Database>;

const ENGINE_NAME = "market_validation_acquisition";
const CLAIM_ENTITY = "acquisition_tick_claim";
const COMPLETE_ENTITY = "acquisition_tick_complete";

export type DurableTickRecord = {
  tickKey: string;
  experimentId: string;
  lastStep: string | null;
  completedAt: string | null;
  startedAt: string;
  retryEligible: boolean;
  nextRetryAt: string | null;
};

export async function loadDurableAcquisitionTick(
  supabase: InfinitySupabase,
  organizationId: string,
  experimentId: string,
): Promise<DurableTickRecord | null> {
  const { data, error } = await supabase
    .from("engine_events")
    .select("event_type, entity_type, entity_id, payload, created_at")
    .eq("organization_id", organizationId)
    .eq("engine_name", ENGINE_NAME)
    .in("entity_type", [CLAIM_ENTITY, COMPLETE_ENTITY])
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return null;
  const matching = data.find((row) => {
    const payload = row.payload as { experimentId?: string } | null;
    return payload?.experimentId === experimentId || row.entity_id?.startsWith(experimentId);
  });
  if (!matching) return null;
  const payload = (matching.payload ?? {}) as Partial<DurableTickRecord>;
  return {
    tickKey: payload.tickKey ?? matching.entity_id ?? "",
    experimentId,
    lastStep: payload.lastStep ?? null,
    completedAt: payload.completedAt ?? (matching.entity_type === COMPLETE_ENTITY ? matching.created_at : null),
    startedAt: payload.startedAt ?? matching.created_at,
    retryEligible: Boolean(payload.retryEligible),
    nextRetryAt: payload.nextRetryAt ?? null,
  };
}

export async function persistDurableAcquisitionTick(
  supabase: InfinitySupabase,
  organizationId: string,
  record: DurableTickRecord,
  kind: "claim" | "complete",
): Promise<void> {
  await supabase.from("engine_events").insert({
    organization_id: organizationId,
    engine_name: ENGINE_NAME,
    event_type: kind === "claim" ? "acquisition.tick_claimed" : "acquisition.tick_completed",
    entity_type: kind === "claim" ? CLAIM_ENTITY : COMPLETE_ENTITY,
    entity_id: record.tickKey,
    message: record.lastStep ?? kind,
    severity: "info",
    payload: record as never,
  });
}
