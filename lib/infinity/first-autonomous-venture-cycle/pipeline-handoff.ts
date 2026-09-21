export type PipelineHandoffExclusion = {
  candidateId: string;
  stage: "monetization" | "venture_selection";
  reason: string;
  classification:
    | "monetization_input_truncated"
    | "monetization_analysis_failed"
    | "monetization_research_budget_exhausted"
    | "monetization_not_requested";
};

export type MonetizationHandoffSummary = {
  requestedCandidateIds: string[];
  processedCandidateIds: string[];
  monetizedCandidateIds: string[];
  excludedCandidates: PipelineHandoffExclusion[];
};

export type Favc1PipelineHandoff = {
  discoveryRunId: string;
  monetizationRunId: string;
  discoveredCandidateIds: string[];
  monetizedCandidateIds: string[];
  selectionCandidateIds: string[];
  excludedCandidates: PipelineHandoffExclusion[];
};

export type SelectionPoolAdequacy = "SUFFICIENT" | "LIMITED" | "WEAK" | "EMPTY";

export function buildFavc1SelectionHandoff(input: {
  discoveryRunId: string;
  discoveredCandidateIds: string[];
  monetizationRunId: string;
  monetizationHandoff: MonetizationHandoffSummary;
}): Favc1PipelineHandoff {
  const selectionCandidateIds = [...input.monetizationHandoff.monetizedCandidateIds];

  return {
    discoveryRunId: input.discoveryRunId,
    monetizationRunId: input.monetizationRunId,
    discoveredCandidateIds: input.discoveredCandidateIds,
    monetizedCandidateIds: selectionCandidateIds,
    selectionCandidateIds,
    excludedCandidates: input.monetizationHandoff.excludedCandidates,
  };
}

export function assessSelectionPoolAdequacy(poolSize: number): SelectionPoolAdequacy {
  if (poolSize === 0) return "EMPTY";
  if (poolSize === 1) return "WEAK";
  if (poolSize <= 4) return "LIMITED";
  return "SUFFICIENT";
}

export function validateFavc1SelectionHandoff(handoff: Favc1PipelineHandoff): void {
  if (handoff.selectionCandidateIds.length === 0) {
    throw new Error(
      "FAVC1_PIPELINE_HANDOFF_ERROR: no monetized candidates available for venture selection",
    );
  }

  const selectionSet = new Set(handoff.selectionCandidateIds);
  for (const candidateId of handoff.selectionCandidateIds) {
    if (!handoff.monetizedCandidateIds.includes(candidateId)) {
      throw new Error(
        `FAVC1_PIPELINE_HANDOFF_ERROR: selection candidate ${candidateId} missing current-run monetization analysis`,
      );
    }
  }

  for (const monetizedId of handoff.monetizedCandidateIds) {
    if (!selectionSet.has(monetizedId)) {
      throw new Error(
        `FAVC1_PIPELINE_HANDOFF_ERROR: monetized candidate ${monetizedId} absent from selection set`,
      );
    }
  }
}
