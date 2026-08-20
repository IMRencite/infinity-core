export type CanonicalVentureAssemblyIdentity = {
  opportunityCandidateId: string | null;
  opportunityId: string | null;
  displayName: string;
  workingName: string;
  origin: string;
  rank: number | null;
  blueprintId: string | null;
  companyId: string | null;
};

export type CanonicalVentureAssemblyIdentityInput = {
  opportunityCandidateId?: string | null;
  opportunityId?: string | null;
  candidateTitle?: string | null;
  displayName?: string | null;
  workingName?: string | null;
  origin: string;
  rank?: number | null;
  blueprintId?: string | null;
  companyId?: string | null;
};

export type PersistedAssemblyIdentity = {
  identityPackage: {
    workingName: string;
    displayName: string;
    opportunityCandidateId: string | null;
    origin: string;
    rank: number | null;
  };
  manifestLineage: {
    opportunityCandidateId: string | null;
    origin: string;
    rank: number | null;
    companyBuilderBlueprintId: string | null;
  };
};

function readTrimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readId(value: unknown): string | null {
  return readTrimmed(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function candidateIdFromLineageRecord(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  return (
    readId(record.opportunityCandidateId) ??
    readId(record.opportunity_candidate_id) ??
    readId(record.candidateId) ??
    readId(record.selectedCandidateId) ??
    readId(record.selected_candidate_id)
  );
}

export function candidateIdFromLineageSources(values: unknown[]): string | null {
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = candidateIdFromLineageRecord(item);
        if (nested) return nested;
      }
      continue;
    }
    const direct = candidateIdFromLineageRecord(value);
    if (direct) return direct;
  }
  return null;
}

function firstName(values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = readTrimmed(value);
    if (trimmed) return trimmed;
  }
  return "Venture";
}

export function buildCanonicalVentureAssemblyIdentity(
  input: CanonicalVentureAssemblyIdentityInput,
): CanonicalVentureAssemblyIdentity {
  const humanName = firstName([input.candidateTitle, input.displayName, input.workingName]);
  const rank =
    typeof input.rank === "number" && Number.isFinite(input.rank) && input.rank > 0
      ? Math.floor(input.rank)
      : null;
  return {
    opportunityCandidateId: readId(input.opportunityCandidateId),
    opportunityId: readId(input.opportunityId),
    displayName: humanName,
    workingName: humanName,
    origin: readTrimmed(input.origin) ?? "venture_assembly",
    rank,
    blueprintId: readId(input.blueprintId),
    companyId: readId(input.companyId),
  };
}

export function persistCanonicalVentureAssemblyIdentity(
  identity: CanonicalVentureAssemblyIdentity,
): PersistedAssemblyIdentity {
  return {
    identityPackage: {
      workingName: identity.workingName,
      displayName: identity.displayName,
      opportunityCandidateId: identity.opportunityCandidateId,
      origin: identity.origin,
      rank: identity.rank,
    },
    manifestLineage: {
      opportunityCandidateId: identity.opportunityCandidateId,
      origin: identity.origin,
      rank: identity.rank,
      companyBuilderBlueprintId: identity.blueprintId,
    },
  };
}
