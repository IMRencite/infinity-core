import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { loadOperatorVentureList, loadOperatorVentureSnapshot } from "./operator-read-model";
import { resolveDefaultVentureId } from "./resolve-default-venture";
import type { OperatorVentureListItem, OperatorVentureSnapshot } from "./types";

const SNAPSHOT_PREFETCH_LIMIT = 12;

export type HqDashboardContext = {
  ventureList: OperatorVentureListItem[];
  defaultVentureId: string | null;
  snapshot: OperatorVentureSnapshot | null;
  snapshots: Map<string, OperatorVentureSnapshot>;
  favc1CycleMode: boolean;
  followFavc1Cycle: boolean;
};

export async function loadHqDashboardContext(
  admin: AdminSupabaseClient,
  organizationId: string,
  preferredVentureId?: string | null,
): Promise<HqDashboardContext> {
  const ventureList = await loadOperatorVentureList(admin, organizationId, 40);
  const snapshots = new Map<string, OperatorVentureSnapshot>();

  const prefetchIds = ventureList.slice(0, SNAPSHOT_PREFETCH_LIMIT).map((v) => v.ventureAssemblyId);
  if (preferredVentureId && !prefetchIds.includes(preferredVentureId)) {
    prefetchIds.unshift(preferredVentureId);
  }

  await Promise.all(
    prefetchIds.map(async (id) => {
      const snapshot = await loadOperatorVentureSnapshot(admin, organizationId, id);
      if (snapshot) snapshots.set(id, snapshot);
    }),
  );

  let resolvedId: string | null = null;
  if (preferredVentureId && snapshots.has(preferredVentureId)) {
    resolvedId = preferredVentureId;
  } else if (preferredVentureId) {
    const direct = await loadOperatorVentureSnapshot(admin, organizationId, preferredVentureId);
    if (direct) {
      snapshots.set(preferredVentureId, direct);
      resolvedId = preferredVentureId;
    }
  }

  if (!resolvedId) {
    resolvedId = resolveDefaultVentureId(ventureList, snapshots);
  }

  let snapshot = resolvedId ? snapshots.get(resolvedId) ?? null : null;
  if (resolvedId && !snapshot) {
    snapshot = await loadOperatorVentureSnapshot(admin, organizationId, resolvedId);
    if (snapshot) snapshots.set(resolvedId, snapshot);
  }

  return {
    ventureList,
    defaultVentureId: resolvedId,
    snapshot,
    snapshots,
    favc1CycleMode: false,
    followFavc1Cycle: false,
  };
}
