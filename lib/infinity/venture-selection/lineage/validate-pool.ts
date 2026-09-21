import { VentureSelectionError } from "../failures";
import type { LoadedCandidateBundle } from "../types";

export const SELECTION_POOL_LINEAGE_ERROR = "SELECTION_POOL_LINEAGE_ERROR";

export function validateSelectionPoolLineage(input: {
  organizationId: string;
  expectedCandidateIds: string[];
  expectedDiscoveryRunId?: string;
  expectedMonetizationRunId?: string;
  bundles: LoadedCandidateBundle[];
}): void {
  if (!input.expectedCandidateIds.length) {
    throw new VentureSelectionError(
      `${SELECTION_POOL_LINEAGE_ERROR}: explicit candidate IDs are required for lineage-pure selection`,
      "selection_pool_lineage_error",
    );
  }

  const expectedIds = new Set(input.expectedCandidateIds);
  const loadedIds = new Set(input.bundles.map((bundle) => bundle.candidateId));

  for (const candidateId of input.expectedCandidateIds) {
    if (!loadedIds.has(candidateId)) {
      throw new VentureSelectionError(
        `${SELECTION_POOL_LINEAGE_ERROR}: expected candidate ${candidateId} missing from selection pool (requires monetization analysis for the current run)`,
        "selection_pool_lineage_error",
      );
    }
  }

  for (const bundle of input.bundles) {
    if (!expectedIds.has(bundle.candidateId)) {
      throw new VentureSelectionError(
        `${SELECTION_POOL_LINEAGE_ERROR}: unexpected candidate ${bundle.candidateId} entered selection pool`,
        "selection_pool_lineage_error",
      );
    }

    if (input.expectedDiscoveryRunId && bundle.discoveryRunId !== input.expectedDiscoveryRunId) {
      throw new VentureSelectionError(
        `${SELECTION_POOL_LINEAGE_ERROR}: candidate ${bundle.candidateId} discovery run ${bundle.discoveryRunId} does not match expected ${input.expectedDiscoveryRunId}`,
        "selection_pool_lineage_error",
      );
    }

    if (
      input.expectedMonetizationRunId &&
      bundle.monetization?.monetizationRunId !== input.expectedMonetizationRunId
    ) {
      throw new VentureSelectionError(
        `${SELECTION_POOL_LINEAGE_ERROR}: candidate ${bundle.candidateId} monetization run ${bundle.monetization?.monetizationRunId ?? "none"} does not match expected ${input.expectedMonetizationRunId}`,
        "selection_pool_lineage_error",
      );
    }

    if (!bundle.monetization) {
      throw new VentureSelectionError(
        `${SELECTION_POOL_LINEAGE_ERROR}: candidate ${bundle.candidateId} missing monetization analysis`,
        "selection_pool_lineage_error",
      );
    }
  }
}

export function requiresExplicitSelectionPool(runPurpose?: string): boolean {
  return runPurpose === "first_autonomous_venture_v1";
}
