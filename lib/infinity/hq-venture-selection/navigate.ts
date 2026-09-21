import {
  canonicalizeInspectionRef,
  resolvePreferredVentureIdFromInspect,
} from "@/lib/infinity/hq-inspection-identity/aliases";
import {
  INSPECTION_QUERY_PARAM,
  formatInspectionQuery,
  hqDashboardInspectionPath,
  type HqInspectionRef,
} from "@/lib/infinity/operator-console/inspection-model";
import { HQ_VENTURE_CLICK_THROUGH_CONTRACT, VENTURE_SELECTION_RESOLUTION_FAILED } from "./contract";

export function buildHqVentureInspectionHref(ref: HqInspectionRef, currentSearch?: string): string {
  const canonical = canonicalizeInspectionRef(ref) ?? ref;
  const params = new URLSearchParams(currentSearch ?? "");
  params.set(INSPECTION_QUERY_PARAM, formatInspectionQuery(canonical));
  return `/dashboard?${params.toString()}`;
}

export function buildHqClearInspectionHref(currentSearch?: string): string {
  const params = new URLSearchParams(currentSearch ?? "");
  params.delete(INSPECTION_QUERY_PARAM);
  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

export function resolveHqVentureClick(input: {
  sourceEntityType: HqInspectionRef["entityType"];
  sourceEntityId: string;
}): {
  contract: typeof HQ_VENTURE_CLICK_THROUGH_CONTRACT;
  sourceEntityType: HqInspectionRef["entityType"];
  sourceEntityId: string;
  resolvedCanonicalVentureId: string | null;
  inspectionRef: HqInspectionRef;
  targetInspectionPath: string;
  resolution: "canonical_venture" | "candidate_only" | "failed";
  error: string | null;
} {
  const source: HqInspectionRef = { entityType: input.sourceEntityType, entityId: input.sourceEntityId };
  if (!input.sourceEntityId.trim()) {
    return {
      contract: HQ_VENTURE_CLICK_THROUGH_CONTRACT,
      sourceEntityType: input.sourceEntityType,
      sourceEntityId: input.sourceEntityId,
      resolvedCanonicalVentureId: null,
      inspectionRef: source,
      targetInspectionPath: "/dashboard",
      resolution: "failed",
      error: VENTURE_SELECTION_RESOLUTION_FAILED,
    };
  }
  const canonical = canonicalizeInspectionRef(source) ?? source;
  const resolvedCanonicalVentureId = resolvePreferredVentureIdFromInspect(canonical);
  const candidateOnly = canonical.entityType === "OPPORTUNITY_CANDIDATE" && !resolvedCanonicalVentureId;
  return {
    contract: HQ_VENTURE_CLICK_THROUGH_CONTRACT,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
    resolvedCanonicalVentureId,
    inspectionRef: canonical,
    targetInspectionPath: hqDashboardInspectionPath(canonical),
    resolution: resolvedCanonicalVentureId ? "canonical_venture" : candidateOnly ? "candidate_only" : "failed",
    error: null,
  };
}

export function hqVenturePollPath(ventureId: string): string {
  return `/api/operator-console/ventures/${encodeURIComponent(ventureId)}`;
}
