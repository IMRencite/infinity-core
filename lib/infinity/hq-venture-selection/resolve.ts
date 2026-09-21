import { hqVentureIdentitiesMatch } from "@/lib/infinity/hq-inspection-identity/aliases";
import type { OperatorVentureListItem } from "@/lib/infinity/operator-console/types";
import {
  HQ_VENTURE_SELECTION_AUTHORITY_CONTRACT,
  HQ_VENTURE_ROUTE_SELECTOR_SYNC_CONTRACT,
  type HqVentureRouteSelectorSync,
  type HqVentureSelectionAuthority,
} from "./contract";

export function selectorOptionId(item: OperatorVentureListItem): string {
  return item.canonicalVentureId ?? item.ventureAssemblyId;
}

export function findVentureListItem(
  ventures: OperatorVentureListItem[],
  inspectedId: string | null | undefined,
): OperatorVentureListItem | null {
  if (!inspectedId) return null;
  return ventures.find((item) => ventureListItemMatches(item, inspectedId)) ?? null;
}

export function resolveSnapshotLoadId(
  ventures: OperatorVentureListItem[],
  preferredVentureId: string | null | undefined,
): string | null {
  if (!preferredVentureId) return null;
  const match = findVentureListItem(ventures, preferredVentureId);
  if (!match) return preferredVentureId;
  if (match.canonicalVentureId && hqVentureIdentitiesMatch(match.canonicalVentureId, preferredVentureId)) {
    return match.ventureAssemblyId || match.canonicalVentureId;
  }
  return match.ventureAssemblyId || match.canonicalVentureId || preferredVentureId;
}

export function ventureListItemMatches(
  item: OperatorVentureListItem,
  inspectedId: string | null | undefined,
): boolean {
  if (!inspectedId) return false;
  return (
    hqVentureIdentitiesMatch(item.ventureAssemblyId, inspectedId) ||
    hqVentureIdentitiesMatch(item.canonicalVentureId, inspectedId) ||
    hqVentureIdentitiesMatch(item.candidateId, inspectedId)
  );
}

export function resolveSelectorValue(
  ventures: OperatorVentureListItem[],
  inspectedId: string | null | undefined,
): string {
  if (!inspectedId) return "";
  const match = ventures.find((item) => ventureListItemMatches(item, inspectedId));
  return match ? selectorOptionId(match) : inspectedId;
}

export function resolveHqVentureSelectionAuthority(input: {
  explicitRouteVentureId?: string | null;
  dropdownVentureId?: string | null;
  priorInspectionVentureId?: string | null;
  defaultFallbackVentureId?: string | null;
}): HqVentureSelectionAuthority {
  const explicit = input.explicitRouteVentureId?.trim() || null;
  const dropdown = input.dropdownVentureId?.trim() || null;
  const prior = input.priorInspectionVentureId?.trim() || null;
  const fallback = input.defaultFallbackVentureId?.trim() || null;
  if (explicit) {
    return {
      contract: HQ_VENTURE_SELECTION_AUTHORITY_CONTRACT,
      explicitRouteVentureId: explicit,
      dropdownVentureId: dropdown,
      priorInspectionVentureId: prior,
      defaultFallbackVentureId: fallback,
      authoritativeVentureId: explicit,
      source: "explicit_route",
      fallbackOverrodeRoute: false,
    };
  }
  if (dropdown) {
    return {
      contract: HQ_VENTURE_SELECTION_AUTHORITY_CONTRACT,
      explicitRouteVentureId: null,
      dropdownVentureId: dropdown,
      priorInspectionVentureId: prior,
      defaultFallbackVentureId: fallback,
      authoritativeVentureId: dropdown,
      source: "current_dropdown",
      fallbackOverrodeRoute: false,
    };
  }
  if (prior) {
    return {
      contract: HQ_VENTURE_SELECTION_AUTHORITY_CONTRACT,
      explicitRouteVentureId: null,
      dropdownVentureId: null,
      priorInspectionVentureId: prior,
      defaultFallbackVentureId: fallback,
      authoritativeVentureId: prior,
      source: "prior_inspection_history",
      fallbackOverrodeRoute: false,
    };
  }
  return {
    contract: HQ_VENTURE_SELECTION_AUTHORITY_CONTRACT,
    explicitRouteVentureId: null,
    dropdownVentureId: null,
    priorInspectionVentureId: null,
    defaultFallbackVentureId: fallback,
    authoritativeVentureId: fallback,
    source: fallback ? "default_fallback" : "none",
    fallbackOverrodeRoute: false,
  };
}

export function projectHqVentureRouteSelectorSync(input: {
  routeVentureId: string | null;
  selectorVentureId: string | null;
}): HqVentureRouteSelectorSync {
  const synchronized =
    (!input.routeVentureId && !input.selectorVentureId) ||
    hqVentureIdentitiesMatch(input.routeVentureId, input.selectorVentureId);
  return {
    contract: HQ_VENTURE_ROUTE_SELECTOR_SYNC_CONTRACT,
    routeVentureId: input.routeVentureId,
    selectorVentureId: input.selectorVentureId,
    synchronized,
  };
}
