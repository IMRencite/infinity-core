import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { VENTURE_SELECTION_RESOLUTION_FAILED } from "@/lib/infinity/hq-venture-selection/contract";
import { snapshotMatchesRequestedVenture } from "@/lib/infinity/hq-venture-selection/identity";
import { resolveSnapshotLoadId } from "@/lib/infinity/hq-venture-selection/resolve";
import { attachGlobalHqFloorRooms } from "./attach-global-hq-floor";
import { buildFavc1CycleSnapshot } from "./favc1-cycle/build-cycle-snapshot";
import { isVerificationVentureName } from "./favc1-cycle/exclude-fixtures";
import { resolveLatestFavc1Cycle, shouldPreferFavc1CycleForHq } from "./favc1-cycle/resolve-active-cycle";
import { isFavc1CycleVentureId } from "./favc1-cycle/types";
import { loadOperatorVentureList, loadOperatorVentureSnapshot } from "./operator-read-model";
import { resolveDefaultVentureId } from "./resolve-default-venture";
import type { OperatorVentureListItem, OperatorVentureSnapshot } from "./types";
import { withHqFinancialTruth } from "@/lib/infinity/financial-truth/attach-live";
import { projectAutonomousOperations } from "@/lib/infinity/autonomous-operating-loop/project";

function withAutonomousOperating(snapshot: OperatorVentureSnapshot): OperatorVentureSnapshot {
  return {
    ...snapshot,
    autonomousOperating: projectAutonomousOperations({ now: snapshot.generatedAt }),
  };
}

export type HqDashboardContext = {
  ventureList: OperatorVentureListItem[];
  defaultVentureId: string | null;
  snapshot: OperatorVentureSnapshot | null;
  snapshots: Map<string, OperatorVentureSnapshot>;
  favc1CycleMode: boolean;
  followFavc1Cycle: boolean;
  selectionError: string | null;
};

/**
 * HQ only displays one inspected venture. Prefetching N full engine snapshots
 * (each ~30 org-wide SELECT * reads) was unused by the client and dominated
 * initial /dashboard time. Load the list, resolve the target, then load that
 * one snapshot.
 */
export async function loadHqDashboardContext(
  admin: AdminSupabaseClient,
  organizationId: string,
  preferredVentureId?: string | null,
): Promise<HqDashboardContext> {
  const needsFavc1Lookup = !preferredVentureId || isFavc1CycleVentureId(preferredVentureId);
  const [ventureList, favc1Cycle] = await Promise.all([
    loadOperatorVentureList(admin, organizationId, 40),
    needsFavc1Lookup ? resolveLatestFavc1Cycle(admin, organizationId) : Promise.resolve(null),
  ]);

  const snapshots = new Map<string, OperatorVentureSnapshot>();
  const explicitPreferred = Boolean(preferredVentureId?.trim());
  let resolvedId: string | null = preferredVentureId ?? null;
  let favc1CycleMode = false;
  let followFavc1Cycle = false;
  let snapshot: OperatorVentureSnapshot | null = null;
  let selectionError: string | null = null;

  const defaultVenture = resolvedId
    ? ventureList.find((item) => item.ventureAssemblyId === resolvedId) ?? null
    : ventureList.find((item) => item.ventureAssemblyId === resolveDefaultVentureId(ventureList, snapshots)) ??
      null;

  if (
    favc1Cycle &&
    (!preferredVentureId || isFavc1CycleVentureId(preferredVentureId)) &&
    (favc1Cycle.ventureAssemblyId
      ? !preferredVentureId
      : shouldPreferFavc1CycleForHq({
          cycle: favc1Cycle,
          defaultVentureName: defaultVenture?.ventureName ?? null,
          defaultVentureLatestActivityAt: defaultVenture?.latestActivityAt ?? null,
        }) || isVerificationVentureName(defaultVenture?.ventureName ?? ""))
  ) {
    if (favc1Cycle.ventureAssemblyId && !preferredVentureId) {
      resolvedId = favc1Cycle.ventureAssemblyId;
      followFavc1Cycle = true;
    } else if (!favc1Cycle.ventureAssemblyId) {
      const { snapshot: cycleSnapshot } = await buildFavc1CycleSnapshot(admin, favc1Cycle);
      resolvedId = cycleSnapshot.venture.ventureAssemblyId;
      snapshot = cycleSnapshot;
      snapshots.set(resolvedId, cycleSnapshot);
      favc1CycleMode = true;
      followFavc1Cycle = true;
      const financedCycle = await withHqFinancialTruth(
        await attachGlobalHqFloorRooms(cycleSnapshot, admin, organizationId),
        "ssr",
      );
      if (!financedCycle) {
        return {
          ventureList,
          defaultVentureId: resolvedId,
          snapshot: null,
          snapshots,
          favc1CycleMode,
          followFavc1Cycle,
          selectionError: null,
        };
      }
      snapshot = withAutonomousOperating(financedCycle);
      snapshots.set(resolvedId, snapshot);
      return {
        ventureList,
        defaultVentureId: resolvedId,
        snapshot,
        snapshots,
        favc1CycleMode,
        followFavc1Cycle,
        selectionError: null,
      };
    }
  }

  if (explicitPreferred && preferredVentureId) {
    const loadId = resolveSnapshotLoadId(ventureList, preferredVentureId) ?? preferredVentureId;
    snapshot = await loadOperatorVentureSnapshot(admin, organizationId, loadId);
    if (!snapshot && loadId !== preferredVentureId) {
      snapshot = await loadOperatorVentureSnapshot(admin, organizationId, preferredVentureId);
    }
    if (snapshot && !snapshotMatchesRequestedVenture(snapshot, preferredVentureId)) {
      snapshot = null;
    }
    if (!snapshot) {
      const { buildCanonicalOperatorSnapshot } = await import(
        "@/lib/infinity/hq-inspection-identity/canonical-snapshot"
      );
      const canonical = buildCanonicalOperatorSnapshot(organizationId, preferredVentureId);
      if (canonical && snapshotMatchesRequestedVenture(canonical, preferredVentureId)) {
        snapshot = canonical;
      }
    }
    if (snapshot) {
      const financedPreferred = await withHqFinancialTruth(
        await attachGlobalHqFloorRooms(snapshot, admin, organizationId),
        "ssr",
      );
      if (!financedPreferred) {
        return {
          ventureList,
          defaultVentureId: preferredVentureId,
          snapshot: null,
          snapshots,
          favc1CycleMode: false,
          followFavc1Cycle: false,
          selectionError: VENTURE_SELECTION_RESOLUTION_FAILED,
        };
      }
      snapshot = withAutonomousOperating(financedPreferred);
      snapshots.set(preferredVentureId, snapshot);
      return {
        ventureList,
        defaultVentureId: preferredVentureId,
        snapshot,
        snapshots,
        favc1CycleMode: false,
        followFavc1Cycle: false,
        selectionError: null,
      };
    }
    return {
      ventureList,
      defaultVentureId: preferredVentureId,
      snapshot: null,
      snapshots,
      favc1CycleMode: false,
      followFavc1Cycle: false,
      selectionError: VENTURE_SELECTION_RESOLUTION_FAILED,
    };
  }

  if (!resolvedId) {
    resolvedId = resolveDefaultVentureId(ventureList, snapshots);
  }

  if (resolvedId) {
    snapshot = await loadOperatorVentureSnapshot(admin, organizationId, resolvedId);
    if (snapshot) snapshots.set(resolvedId, snapshot);
  }

  if (snapshot) {
    const financed = await withHqFinancialTruth(
      await attachGlobalHqFloorRooms(snapshot, admin, organizationId),
      "ssr",
    );
    snapshot = financed ? withAutonomousOperating(financed) : financed;
    if (resolvedId && snapshot) snapshots.set(resolvedId, snapshot);
  }

  return {
    ventureList,
    defaultVentureId: resolvedId,
    snapshot,
    snapshots,
    favc1CycleMode,
    followFavc1Cycle,
    selectionError,
  };
}
