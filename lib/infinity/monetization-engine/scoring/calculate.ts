import {
  DEFAULT_SCORING_WEIGHTS,
  MONETIZATION_SCORING_VERSION,
  type MonetizationScoringWeights,
} from "../constants";
import type {
  MonetizationScoringAssessmentInput,
  NormalizedMonetizationScores,
} from "../types";

function normalizeScore(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 10000) / 100;
}

function invertComplexity(value: number): number {
  return normalizeScore(1 - value);
}

export function calculateDeterministicMonetizationScores(
  input: MonetizationScoringAssessmentInput,
  weights: MonetizationScoringWeights = DEFAULT_SCORING_WEIGHTS,
): NormalizedMonetizationScores {
  const revenuePotentialScore = normalizeScore(input.revenuePotential);
  const marginPotentialScore = normalizeScore(input.marginPotential);
  const speedToRevenueScore = normalizeScore(input.speedToRevenue);
  const recurringRevenuePotentialScore = normalizeScore(input.recurringRevenuePotential);
  const automationPotentialScore = normalizeScore(input.automationPotential);
  const scalabilityScore = normalizeScore(input.scalability);
  const customerAcquisitionFeasibilityScore = normalizeScore(
    input.customerAcquisitionFeasibility,
  );
  const capitalEfficiencyScore = normalizeScore(input.capitalEfficiency);
  const competitionScore = normalizeScore(input.competition);
  const platformDependencyScore = invertComplexity(input.platformDependency);
  const operationalComplexityScore = invertComplexity(input.operationalComplexity);
  const technicalComplexityScore = invertComplexity(input.technicalComplexity);
  const evidenceConfidenceScore = normalizeScore(input.evidenceConfidence);

  const weightedBreakdown: Record<string, number> = {
    revenue_potential_score: revenuePotentialScore * weights.revenue_potential_score,
    margin_potential_score: marginPotentialScore * weights.margin_potential_score,
    speed_to_revenue_score: speedToRevenueScore * weights.speed_to_revenue_score,
    recurring_revenue_potential_score:
      recurringRevenuePotentialScore * weights.recurring_revenue_potential_score,
    automation_potential_score: automationPotentialScore * weights.automation_potential_score,
    scalability_score: scalabilityScore * weights.scalability_score,
    customer_acquisition_feasibility_score:
      customerAcquisitionFeasibilityScore * weights.customer_acquisition_feasibility_score,
    capital_efficiency_score: capitalEfficiencyScore * weights.capital_efficiency_score,
    competition_score: competitionScore * weights.competition_score,
    platform_dependency_score: platformDependencyScore * weights.platform_dependency_score,
    operational_complexity_score:
      operationalComplexityScore * weights.operational_complexity_score,
    technical_complexity_score: technicalComplexityScore * weights.technical_complexity_score,
    evidence_confidence_score: evidenceConfidenceScore * weights.evidence_confidence_score,
  };

  const monetizationScore =
    Math.round(
      Object.values(weightedBreakdown).reduce((sum, value) => sum + value, 0) * 100,
    ) / 100;

  return {
    scoringVersion: MONETIZATION_SCORING_VERSION,
    revenuePotentialScore,
    marginPotentialScore,
    speedToRevenueScore,
    recurringRevenuePotentialScore,
    automationPotentialScore,
    scalabilityScore,
    customerAcquisitionFeasibilityScore,
    capitalEfficiencyScore,
    competitionScore,
    platformDependencyScore,
    operationalComplexityScore,
    technicalComplexityScore,
    evidenceConfidenceScore,
    monetizationScore,
    weightedBreakdown,
    scoringInputs: input,
  };
}

export function selectBestPlanScore<T extends { monetizationScore: number }>(plans: T[]): T | null {
  if (plans.length === 0) return null;
  return [...plans].sort((a, b) => b.monetizationScore - a.monetizationScore)[0] ?? null;
}
