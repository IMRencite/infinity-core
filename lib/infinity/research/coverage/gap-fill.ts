import {
  isDirectExternalResearchUseful,
  type ResearchEvidenceDimension,
} from "./dimensions";
import type { ResearchCoverageAssessment } from "./assess";
import type { ResearchCoveragePlan } from "./plan";
import type { ResearchCoveragePolicy } from "./policy";
import {
  candidateQueriesForDimension,
  selectBoundedQueries,
  type PlannedResearchQuery,
  type ResearchCoverageSeed,
} from "./queries";

export type ResearchPhaseStopReason =
  | "material_coverage_sufficient"
  | "no_researchable_gap"
  | "gap_already_targeted"
  | "budget_exhausted"
  | "max_gap_fill_reached"
  | "low_information_value"
  | "initial_only";

export type GapFillDecision =
  | { eligible: false; reason: ResearchPhaseStopReason; queries: [] }
  | { eligible: true; reason: "material_gap_researchable"; queries: PlannedResearchQuery[] };

export function dimensionAlreadyTargeted(
  dimension: ResearchEvidenceDimension,
  issuedQueries: PlannedResearchQuery[],
): boolean {
  return issuedQueries.some((query) => query.targetDimensions.includes(dimension));
}

export function evaluateGapFillEligibility(input: {
  assessment: ResearchCoverageAssessment;
  plan: ResearchCoveragePlan;
  policy: ResearchCoveragePolicy;
  seed?: ResearchCoverageSeed;
  objective?: string;
  issuedQueries: PlannedResearchQuery[];
  gapFillPhasesUsed: number;
  recordedCostUsd: number | null;
  estimatedGapFillCostUsd: number | null;
}): GapFillDecision {
  if (input.assessment.materialCoverageSufficient) {
    return { eligible: false, reason: "material_coverage_sufficient", queries: [] };
  }
  if (input.gapFillPhasesUsed >= input.policy.maxGapFillPhases) {
    return { eligible: false, reason: "max_gap_fill_reached", queries: [] };
  }
  if (
    input.recordedCostUsd != null &&
    input.estimatedGapFillCostUsd != null &&
    input.recordedCostUsd + input.estimatedGapFillCostUsd > input.policy.maxEstimatedCostUsd
  ) {
    return { eligible: false, reason: "budget_exhausted", queries: [] };
  }
  if (input.recordedCostUsd != null && input.recordedCostUsd > input.policy.maxEstimatedCostUsd) {
    return { eligible: false, reason: "budget_exhausted", queries: [] };
  }

  const gaps = input.assessment.researchableGaps.filter((dimension) => isDirectExternalResearchUseful(dimension));
  if (gaps.length === 0) {
    return { eligible: false, reason: "no_researchable_gap", queries: [] };
  }

  const candidates = gaps.flatMap((dimension) =>
    candidateQueriesForDimension(dimension, input.seed ?? {}, input.objective ?? ""),
  );
  const queries = selectBoundedQueries(
    candidates,
    input.issuedQueries.map((query) => query.query),
    input.policy.maxGapFillQueries,
  );
  if (queries.length === 0) {
    const allTargeted = gaps.every((dimension) => dimensionAlreadyTargeted(dimension, input.issuedQueries));
    return {
      eligible: false,
      reason: allTargeted ? "gap_already_targeted" : "low_information_value",
      queries: [],
    };
  }
  return { eligible: true, reason: "material_gap_researchable", queries };
}
