import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { buildFavc1CycleSnapshot } from "./favc1-cycle/build-cycle-snapshot";
import { resolveLatestFavc1Cycle } from "./favc1-cycle/resolve-active-cycle";
import { isFavc1CycleVentureId, parseFavc1CycleVentureId } from "./favc1-cycle/types";
import { loadOperatorVentureSnapshot } from "./operator-read-model";
import type { OperatorVentureSnapshot } from "./types";

export async function loadVentureSnapshotForHq(
  admin: AdminSupabaseClient,
  organizationId: string,
  ventureId: string,
): Promise<OperatorVentureSnapshot | null> {
  if (isFavc1CycleVentureId(ventureId)) {
    const cycleKey = parseFavc1CycleVentureId(ventureId);
    if (!cycleKey) return null;
    const cycle = await resolveLatestFavc1Cycle(admin, organizationId, cycleKey);
    if (!cycle) return null;
    const { snapshot } = await buildFavc1CycleSnapshot(admin, cycle);
    return snapshot;
  }

  return loadOperatorVentureSnapshot(admin, organizationId, ventureId);
}
