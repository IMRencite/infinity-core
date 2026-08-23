const CYCLE_SENTINEL_LABEL = "Autonomous Venture Cycle";

/**
 * Canonical research lineage is OpportunityCandidate.id.
 * Rejects cycle harness ids/labels so they cannot masquerade as a candidate.
 */
export function canonicalizeResearchCandidateId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidateId = value.trim();
  if (!candidateId) return null;
  if (candidateId === CYCLE_SENTINEL_LABEL) return null;
  if (candidateId.startsWith("favc1-cycle:")) return null;
  if (candidateId === "Autonomous Venture Cycle") return null;
  return candidateId;
}

export function readCandidateIdFromStructuredResult(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return canonicalizeResearchCandidateId((value as { candidateId?: unknown }).candidateId);
}
