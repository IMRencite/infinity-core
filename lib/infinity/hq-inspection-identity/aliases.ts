import type { HqInspectionIdentity, HqInspectionIdentityRef } from "./types";
import {
  ASKREVIEW_INSPECTION_LIFECYCLE,
  HQ_VENTURE_INSPECTION_CONTEXT_CONTRACT,
  OCCUPANCYNPV_INSPECTION_TITLE,
} from "./types";

export const OCCUPANCYNPV_CANDIDATE_ID = "7e7e924e-0741-4155-a729-8d529da77ea9" as const;
export const OCCUPANCYNPV_VENTURE_ID = `candidate:${OCCUPANCYNPV_CANDIDATE_ID}` as const;
export const OCCUPANCYNPV_PUBLIC_NAME = "OccupancyNPV" as const;
export const ASKREVIEW_CANDIDATE_ID = "f1336945-3350-4d08-921e-4dcb5bc77b8e" as const;
export const ASKREVIEW_VENTURE_ID = `candidate:${ASKREVIEW_CANDIDATE_ID}` as const;
export const ASKREVIEW_PUBLIC_NAME = "AskReview" as const;

export function stripCandidatePrefix(value: string): string {
  return value.startsWith("candidate:") ? value.slice("candidate:".length) : value;
}

export function withCandidatePrefix(value: string): string {
  return value.startsWith("candidate:") ? value : `candidate:${value}`;
}

export function hqVentureIdentityAliases(value: string | null | undefined): string[] {
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    decoded = trimmed;
  }
  const raw = stripCandidatePrefix(decoded);
  const prefixed = withCandidatePrefix(decoded);
  const aliases = new Set<string>([trimmed, decoded, raw, prefixed]);
  if (isOccupancynpvIdentity(decoded) || isOccupancynpvIdentity(raw) || isOccupancynpvIdentity(prefixed)) {
    aliases.add(OCCUPANCYNPV_VENTURE_ID);
    aliases.add(OCCUPANCYNPV_CANDIDATE_ID);
    aliases.add("occupancynpv");
    aliases.add(OCCUPANCYNPV_PUBLIC_NAME.toLowerCase());
  }
  if (isAskReviewIdentity(decoded) || isAskReviewIdentity(raw) || isAskReviewIdentity(prefixed)) {
    aliases.add(ASKREVIEW_VENTURE_ID);
    aliases.add(ASKREVIEW_CANDIDATE_ID);
    aliases.add("askreview");
  }
  return [...aliases];
}

export function isOccupancynpvIdentity(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === OCCUPANCYNPV_VENTURE_ID.toLowerCase() ||
    normalized === OCCUPANCYNPV_CANDIDATE_ID.toLowerCase() ||
    normalized === "occupancynpv" ||
    normalized === OCCUPANCYNPV_PUBLIC_NAME.toLowerCase() ||
    /occupancynpv|cre lease npv/i.test(value)
  );
}

export function isAskReviewIdentity(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === ASKREVIEW_VENTURE_ID.toLowerCase() ||
    normalized === ASKREVIEW_CANDIDATE_ID.toLowerCase() ||
    normalized === "askreview" ||
    /askreview/i.test(value)
  );
}

export function hqVentureIdentitiesMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) return false;
  if (isOccupancynpvIdentity(left) && isOccupancynpvIdentity(right)) return true;
  if (isAskReviewIdentity(left) && isAskReviewIdentity(right)) return true;
  const rightSet = new Set(
    [right, stripCandidatePrefix(right), withCandidatePrefix(right)].map((item) => item.toLowerCase()),
  );
  return [left, stripCandidatePrefix(left), withCandidatePrefix(left)].some((item) => rightSet.has(item.toLowerCase()));
}

export function projectKnownInspectionLifecycle(ventureId: string | null | undefined): string | null {
  if (isAskReviewIdentity(ventureId)) return ASKREVIEW_INSPECTION_LIFECYCLE;
  if (isOccupancynpvIdentity(ventureId)) return "PUBLICLY_LAUNCHED";
  return null;
}

export function resolveKnownHqInspectionVentureIdentity(
  inspect: HqInspectionIdentityRef | null | undefined,
): HqInspectionIdentity {
  if (!inspect?.entityId) {
    return {
      contract: HQ_VENTURE_INSPECTION_CONTEXT_CONTRACT,
      inspect: inspect ?? null,
      routeEntityType: inspect?.entityType ?? null,
      routeEntityId: inspect?.entityId ?? null,
      candidateId: null,
      canonicalVentureId: null,
      ventureName: null,
      productTitle: null,
      lifecycle: null,
      economicsVentureId: null,
      mappedFromCandidate: false,
      source: "none",
    };
  }

  if (isOccupancynpvIdentity(inspect.entityId)) {
    return {
      contract: HQ_VENTURE_INSPECTION_CONTEXT_CONTRACT,
      inspect,
      routeEntityType: inspect.entityType,
      routeEntityId: inspect.entityId,
      candidateId: OCCUPANCYNPV_CANDIDATE_ID,
      canonicalVentureId: OCCUPANCYNPV_VENTURE_ID,
      ventureName: OCCUPANCYNPV_PUBLIC_NAME,
      productTitle: OCCUPANCYNPV_INSPECTION_TITLE,
      lifecycle: "PUBLICLY_LAUNCHED",
      economicsVentureId: OCCUPANCYNPV_VENTURE_ID,
      mappedFromCandidate: inspect.entityType === "OPPORTUNITY_CANDIDATE",
      source: "canonical_venture",
    };
  }

  if (isAskReviewIdentity(inspect.entityId)) {
    return {
      contract: HQ_VENTURE_INSPECTION_CONTEXT_CONTRACT,
      inspect,
      routeEntityType: inspect.entityType,
      routeEntityId: inspect.entityId,
      candidateId: ASKREVIEW_CANDIDATE_ID,
      canonicalVentureId: ASKREVIEW_VENTURE_ID,
      ventureName: ASKREVIEW_PUBLIC_NAME,
      productTitle: ASKREVIEW_PUBLIC_NAME,
      lifecycle: ASKREVIEW_INSPECTION_LIFECYCLE,
      economicsVentureId: ASKREVIEW_VENTURE_ID,
      mappedFromCandidate: inspect.entityType === "OPPORTUNITY_CANDIDATE",
      source: "canonical_venture",
    };
  }

  if (inspect.entityType === "VENTURE") {
    return {
      contract: HQ_VENTURE_INSPECTION_CONTEXT_CONTRACT,
      inspect,
      routeEntityType: "VENTURE",
      routeEntityId: inspect.entityId,
      candidateId: inspect.entityId.startsWith("candidate:") ? stripCandidatePrefix(inspect.entityId) : null,
      canonicalVentureId: inspect.entityId,
      ventureName: null,
      productTitle: null,
      lifecycle: null,
      economicsVentureId: inspect.entityId,
      mappedFromCandidate: false,
      source: "canonical_venture",
    };
  }

  return {
    contract: HQ_VENTURE_INSPECTION_CONTEXT_CONTRACT,
    inspect,
    routeEntityType: inspect.entityType,
    routeEntityId: inspect.entityId,
    candidateId: inspect.entityId,
    canonicalVentureId: null,
    ventureName: null,
    productTitle: null,
    lifecycle: null,
    economicsVentureId: null,
    mappedFromCandidate: false,
    source: "unmapped_candidate",
  };
}

export function canonicalizeInspectionRef(
  inspect: HqInspectionIdentityRef | null | undefined,
): HqInspectionIdentityRef | null {
  if (!inspect) return null;
  const identity = resolveKnownHqInspectionVentureIdentity(inspect);
  if (identity.ventureName && identity.canonicalVentureId) {
    return { entityType: "VENTURE", entityId: identity.canonicalVentureId };
  }
  return inspect;
}

export function resolvePreferredVentureIdFromInspect(
  inspect: HqInspectionIdentityRef | null | undefined,
): string | null {
  const identity = resolveKnownHqInspectionVentureIdentity(inspect);
  if (identity.ventureName && identity.canonicalVentureId) return identity.canonicalVentureId;
  if (inspect?.entityType === "VENTURE") return inspect.entityId;
  return null;
}

export function isCanonicalInspectTarget(ventureId: string | null | undefined): boolean {
  return isOccupancynpvIdentity(ventureId) || isAskReviewIdentity(ventureId);
}
