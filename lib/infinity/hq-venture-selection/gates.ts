import { hqVentureIdentitiesMatch } from "@/lib/infinity/hq-inspection-identity/aliases";
import {
  FOUNDER_VENTURE_CLICK_THROUGH_ACCEPTANCE_GATE,
  HQ_INSPECTION_HYDRATION_CONSISTENCY_GATE,
  HQ_VENTURE_CLICK_THROUGH_CONTRACT,
  HQ_VENTURE_LINK_INTEGRITY_GATE,
  HQ_VENTURE_POLL_IDENTITY_GATE,
  HQ_VENTURE_ROUTE_SELECTOR_SYNC_CONTRACT,
  HQ_VENTURE_SELECTION_AUTHORITY_CONTRACT,
  HQ_VENTURE_SELECTION_FALLBACK_MASKING_GATE,
  HQ_VENTURE_SNAPSHOT_ISOLATION_GATE,
  VENTURE_SELECTION_RESOLUTION_FAILED,
  type NamedSelectionGate,
} from "./contract";
import { resolveHqVentureClick } from "./navigate";
import { findVentureListItem, projectHqVentureRouteSelectorSync, resolveHqVentureSelectionAuthority } from "./resolve";

export function evaluateHQVentureSelectionAuthorityContract(input: {
  explicitRouteVentureId?: string | null;
  dropdownVentureId?: string | null;
  priorInspectionVentureId?: string | null;
  defaultFallbackVentureId?: string | null;
}): NamedSelectionGate {
  const authority = resolveHqVentureSelectionAuthority(input);
  const reasons: string[] = [];
  if (authority.explicitRouteVentureId && authority.authoritativeVentureId !== authority.explicitRouteVentureId) {
    reasons.push("ROUTE_SELECTION_NOT_AUTHORITATIVE");
  }
  if (authority.fallbackOverrodeRoute) reasons.push("FALLBACK_OVERRODE_ROUTE");
  return {
    gate: HQ_VENTURE_SELECTION_AUTHORITY_CONTRACT,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQVentureRouteSelectorSyncContract(input: {
  routeVentureId: string | null;
  selectorVentureId: string | null;
}): NamedSelectionGate {
  const sync = projectHqVentureRouteSelectorSync(input);
  return {
    gate: HQ_VENTURE_ROUTE_SELECTOR_SYNC_CONTRACT,
    result: sync.synchronized ? "PASS" : "FAIL",
    reasons: sync.synchronized ? [] : ["ROUTE_SELECTOR_DESYNC"],
  };
}

export function evaluateHQInspectionHydrationConsistencyGate(input: {
  serverVentureId: string | null;
  clientVentureId: string | null;
  dropdownVentureId: string | null;
  renderedVentureId: string | null;
}): NamedSelectionGate {
  const ids = [input.serverVentureId, input.clientVentureId, input.dropdownVentureId, input.renderedVentureId];
  const present = ids.filter((id): id is string => Boolean(id));
  const reasons: string[] = [];
  if (present.length === 0) reasons.push("NO_VENTURE_IDENTITY");
  const first = present[0];
  if (first && !present.every((id) => hqVentureIdentitiesMatch(id, first))) {
    reasons.push("HYDRATION_VENTURE_MISMATCH");
  }
  return {
    gate: HQ_INSPECTION_HYDRATION_CONSISTENCY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQVentureSnapshotIsolationGate(input: {
  requestedVentureId: string;
  snapshotVentureId: string | null;
  cacheKey: string;
}): NamedSelectionGate {
  const reasons: string[] = [];
  if (!input.cacheKey.includes(input.requestedVentureId)) {
    reasons.push("ORG_WIDE_CACHE_SLOT");
  }
  if (input.snapshotVentureId && !hqVentureIdentitiesMatch(input.requestedVentureId, input.snapshotVentureId)) {
    reasons.push("SNAPSHOT_CROSS_VENTURE_CONTAMINATION");
  }
  return { gate: HQ_VENTURE_SNAPSHOT_ISOLATION_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQVenturePollIdentityGate(input: {
  requestedVentureId: string;
  responseVentureId: string | null;
}): NamedSelectionGate {
  const reasons: string[] = [];
  if (!input.responseVentureId) reasons.push("POLL_VENTURE_MISSING");
  else if (!hqVentureIdentitiesMatch(input.requestedVentureId, input.responseVentureId)) {
    reasons.push("POLL_RETURNED_WRONG_VENTURE");
  }
  return { gate: HQ_VENTURE_POLL_IDENTITY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQVentureSelectionFallbackMaskingGate(input: {
  explicitVentureId: string | null;
  renderedVentureId: string | null;
  usedFallback: boolean;
}): NamedSelectionGate {
  const reasons: string[] = [];
  if (input.explicitVentureId && input.usedFallback) reasons.push("SILENT_FALLBACK_MASKED_EXPLICIT_SELECTION");
  if (
    input.explicitVentureId &&
    input.renderedVentureId &&
    !hqVentureIdentitiesMatch(input.explicitVentureId, input.renderedVentureId)
  ) {
    reasons.push(VENTURE_SELECTION_RESOLUTION_FAILED);
  }
  return { gate: HQ_VENTURE_SELECTION_FALLBACK_MASKING_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQVentureClickThroughContract(input: {
  sourceEntityType: "VENTURE" | "OPPORTUNITY_CANDIDATE";
  sourceEntityId: string;
  renderedInspectionId: string | null;
}): NamedSelectionGate {
  const click = resolveHqVentureClick(input);
  const expected = click.resolvedCanonicalVentureId ?? (click.resolution === "candidate_only" ? click.inspectionRef.entityId : null);
  const reasons: string[] = [];
  if (click.resolution === "failed") reasons.push(VENTURE_SELECTION_RESOLUTION_FAILED);
  if (expected && input.renderedInspectionId && !hqVentureIdentitiesMatch(expected, input.renderedInspectionId)) {
    reasons.push("CLICKED_ENTITY_NOT_RENDERED");
  }
  return { gate: HQ_VENTURE_CLICK_THROUGH_CONTRACT, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateHQVentureLinkIntegrityGate(input: {
  usesSharedNavigator: boolean;
  adHocInspectHref: boolean;
}): NamedSelectionGate {
  const reasons: string[] = [];
  if (!input.usesSharedNavigator) reasons.push("AD_HOC_VENTURE_LINK");
  if (input.adHocInspectHref) reasons.push("BYPASSED_AUTHORITATIVE_SELECTION_PATH");
  return { gate: HQ_VENTURE_LINK_INTEGRITY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateFounderVentureClickThroughAcceptanceGate(input: {
  founderVerifiedOccupancynpv: boolean;
  founderVerifiedAskReview: boolean;
  requiredManualDropdown: boolean;
}): NamedSelectionGate {
  const reasons: string[] = [];
  if (!input.founderVerifiedOccupancynpv || !input.founderVerifiedAskReview) {
    reasons.push("FOUNDER_PHYSICAL_VERIFICATION_REQUIRED");
  }
  if (input.requiredManualDropdown) reasons.push("MANUAL_DROPDOWN_STILL_REQUIRED");
  return {
    gate: FOUNDER_VENTURE_CLICK_THROUGH_ACCEPTANCE_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQVentureRouteOptionPresence(input: {
  routeVentureId: string;
  optionValues: string[];
}): NamedSelectionGate {
  const options = input.optionValues.map((value) => ({
    ventureAssemblyId: value,
    organizationId: "org",
    canonicalVentureId: value,
    candidateId: value.replace(/^candidate:/, ""),
    ventureName: value,
    status: "ACTIVE",
    activeDepartment: null,
    latestActivity: null,
    latestActivityAt: null,
    launchState: null,
    knownSpendUsd: null,
    latestDecision: null,
    missionId: value,
  }));
  const present = Boolean(findVentureListItem(options, input.routeVentureId));
  return {
    gate: HQ_VENTURE_ROUTE_SELECTOR_SYNC_CONTRACT,
    result: present ? "PASS" : "FAIL",
    reasons: present ? [] : ["ROUTE_VALUE_NOT_IN_DROPDOWN_OPTIONS"],
  };
}
