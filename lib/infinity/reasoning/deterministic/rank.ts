import { explainOpportunityScore } from "./explain";
import { prioritizeOpportunity } from "./prioritize";
import type {
  OpportunityScoreResult,
  RankedOpportunity,
  ReasoningConfig,
} from "./types";
import { mergeReasoningConfig } from "./types";

function compareForRanking(a: OpportunityScoreResult, b: OpportunityScoreResult): number {
  if (b.overallScore !== a.overallScore) {
    return b.overallScore - a.overallScore;
  }

  if (b.confidence !== a.confidence) {
    return b.confidence - a.confidence;
  }

  return a.opportunityName.localeCompare(b.opportunityName);
}

export function rankValidatedOpportunities(
  results: OpportunityScoreResult[],
  config?: Partial<ReasoningConfig>,
): RankedOpportunity[] {
  const merged = mergeReasoningConfig(config);
  const sorted = [...results].sort(compareForRanking);

  return sorted.map((result, index) => {
    const outcome = prioritizeOpportunity(result, merged);
    return {
      ...result,
      rank: index + 1,
      outcome,
      explanation: explainOpportunityScore(result, merged),
    };
  });
}

export function selectTopValidatedOpportunity(
  results: OpportunityScoreResult[],
  config?: Partial<ReasoningConfig>,
): RankedOpportunity | null {
  const ranked = rankValidatedOpportunities(results, config);
  return ranked[0] ?? null;
}
