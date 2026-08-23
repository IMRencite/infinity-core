import {
  canonicalizeResearchCandidateId,
  readCandidateIdFromStructuredResult,
} from "@/lib/infinity/research/candidate-lineage";

export function parseResearchRunIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function addResearchRunCandidateLinks(
  index: Map<string, string[]>,
  researchRunIds: unknown,
  candidateId: string,
): void {
  const canonical = canonicalizeResearchCandidateId(candidateId);
  if (!canonical) return;
  for (const runId of parseResearchRunIdList(researchRunIds)) {
    const existing = index.get(runId) ?? [];
    if (!existing.includes(canonical)) existing.push(canonical);
    index.set(runId, existing);
  }
}

export function resolveResearchRunCandidateIds(input: {
  researchRunId: string;
  structuredResult?: unknown;
  runIdToCandidateIds: Map<string, string[]>;
  validationCandidateId?: string | null;
  isValidationRun?: boolean;
}): string[] {
  const ids: string[] = [];
  const fromResult = readCandidateIdFromStructuredResult(input.structuredResult);
  if (fromResult && !ids.includes(fromResult)) ids.push(fromResult);

  for (const linked of input.runIdToCandidateIds.get(input.researchRunId) ?? []) {
    const canonical = canonicalizeResearchCandidateId(linked);
    if (canonical && !ids.includes(canonical)) ids.push(canonical);
  }

  if (input.isValidationRun) {
    const validationId = canonicalizeResearchCandidateId(input.validationCandidateId);
    if (validationId && !ids.includes(validationId)) ids.push(validationId);
  }

  return ids;
}

export function researchLineageMetadata(candidateIds: string[]): {
  candidateId?: string;
  candidateIds?: string;
} {
  if (candidateIds.length === 0) return {};
  if (candidateIds.length === 1) return { candidateId: candidateIds[0] };
  return { candidateIds: candidateIds.join(",") };
}
