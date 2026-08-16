import {
  DEFAULT_SCORING_WEIGHTS,
  OPPORTUNITY_SCANNER_SCORING_VERSION,
  type ScoringWeights,
} from "../constants";
import type { NormalizedCandidateScores, ScoringAssessmentInput } from "../types";

function normalizeScore(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 10000) / 100;
}

export function calculateDeterministicScores(
  input: ScoringAssessmentInput,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): NormalizedCandidateScores {
  const demandScore = normalizeScore(input.demandStrength);
  const marketGrowthScore = normalizeScore(input.marketGrowth);
  const competitionOpportunityScore = normalizeScore(input.competitionWeakness);
  const monetizationPotentialScore = normalizeScore(input.monetizationPotential);
  const buildabilityScore = normalizeScore(input.buildability);
  const automationScore = normalizeScore(input.automationPotential);
  const distributionScore = normalizeScore(input.distributionStrength);
  const capitalEfficiencyScore = normalizeScore(input.capitalEfficiency);
  const speedToRevenueScore = normalizeScore(input.speedToRevenue);
  const evidenceConfidenceScore = normalizeScore(input.evidenceConfidence);

  const weightedBreakdown: Record<string, number> = {
    demand_score: demandScore * weights.demand_score,
    market_growth_score: marketGrowthScore * weights.market_growth_score,
    competition_opportunity_score:
      competitionOpportunityScore * weights.competition_opportunity_score,
    monetization_potential_score:
      monetizationPotentialScore * weights.monetization_potential_score,
    buildability_score: buildabilityScore * weights.buildability_score,
    automation_score: automationScore * weights.automation_score,
    distribution_score: distributionScore * weights.distribution_score,
    capital_efficiency_score: capitalEfficiencyScore * weights.capital_efficiency_score,
    speed_to_revenue_score: speedToRevenueScore * weights.speed_to_revenue_score,
    evidence_confidence_score: evidenceConfidenceScore * weights.evidence_confidence_score,
  };

  const opportunityScore =
    Math.round(
      Object.values(weightedBreakdown).reduce((sum, value) => sum + value, 0) * 100,
    ) / 100;

  return {
    scoringVersion: OPPORTUNITY_SCANNER_SCORING_VERSION,
    demandScore,
    marketGrowthScore,
    competitionOpportunityScore,
    monetizationPotentialScore,
    buildabilityScore,
    automationScore,
    distributionScore,
    capitalEfficiencyScore,
    speedToRevenueScore,
    evidenceConfidenceScore,
    opportunityScore,
    weightedBreakdown,
    scoringInputs: input,
  };
}

export function rankCandidates<T extends { opportunityScore: number | null; id: string }>(
  candidates: T[],
): Array<T & { rankPosition: number }> {
  return [...candidates]
    .sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0))
    .map((candidate, index) => ({ ...candidate, rankPosition: index + 1 }));
}
