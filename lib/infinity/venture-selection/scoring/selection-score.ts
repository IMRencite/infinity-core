import { DEFAULT_SELECTION_WEIGHTS } from "../constants";
import type {
  BuildabilityAssessment,
  ExpectedValueDerived,
  LoadedCandidateBundle,
  SpeedToValueMetrics,
} from "../types";

function normalizeScore(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 10000) / 10000;
}

export function calculateSelectionScore(input: {
  candidate: LoadedCandidateBundle;
  validationScore: number;
  buildability: BuildabilityAssessment;
  expectedValue: ExpectedValueDerived;
  speedToValue: SpeedToValueMetrics;
  fatalAssumptionRiskScore: number;
  assumptionUncertaintyScore: number;
  adversarialRiskInputs?: Record<string, number>;
}): { selectionScore: number; selectionScoreInputs: Record<string, number> } {
  const opportunityScore = (input.candidate.opportunityScore ?? 50) / 100;
  const monetizationScore = (input.candidate.monetization?.monetizationScore ?? 50) / 100;
  const validationNorm = input.validationScore / 100;
  const buildabilityNorm = input.buildability.buildabilityScore / 100;
  const automationNorm = input.buildability.automationScore / 100;
  const speedNorm = input.speedToValue.speedToValueScore / 100;
  const capitalEfficiencyNorm = normalizeScore(
    Math.min(1, Math.max(0, input.expectedValue.capitalEfficiency / 3)),
  );
  const profitabilityNorm = normalizeScore(
    Math.min(1, Math.max(0, input.expectedValue.expected12MonthProfit / 100000)),
  );
  const scalabilityNorm = normalizeScore(
    automationNorm * 0.7 + (input.buildability.canDeliverDigitally ? 0.3 : 0.1),
  );
  const defensibilityNorm = normalizeScore(
    0.55 - (input.adversarialRiskInputs?.competition_risk ?? 0) * 0.35,
  );
  const distributionNorm = normalizeScore(
    1 - (input.candidate.monetization?.primaryPlan?.customerAcquisitionDifficulty ?? 0.5),
  );
  const riskNorm = normalizeScore(
    1 -
      input.fatalAssumptionRiskScore * 0.35 -
      (input.adversarialRiskInputs?.execution_risk ?? 0) * 0.25 -
      (input.adversarialRiskInputs?.platform_risk ?? 0) * 0.2 -
      (input.adversarialRiskInputs?.regulatory_risk ?? 0) * 0.2,
  );
  const evidenceConfidenceNorm = normalizeScore(
    (input.candidate.monetization?.primaryPlan?.sourceUrls.length ?? 0) > 0 ? 0.72 : 0.48,
  );
  const assumptionUncertaintyNorm = normalizeScore(1 - input.assumptionUncertaintyScore);

  const selectionScoreInputs = {
    opportunity_attractiveness: opportunityScore,
    monetization_strength: monetizationScore,
    evidence_confidence: evidenceConfidenceNorm,
    buildability: buildabilityNorm,
    automation_potential: automationNorm,
    speed_to_revenue: speedNorm,
    capital_efficiency: capitalEfficiencyNorm,
    expected_profitability: profitabilityNorm,
    scalability: scalabilityNorm,
    defensibility: defensibilityNorm,
    distribution_feasibility: distributionNorm,
    risk: riskNorm,
    assumption_uncertainty: assumptionUncertaintyNorm,
    validation_score: validationNorm,
  };

  const weightedBreakdown = Object.entries(DEFAULT_SELECTION_WEIGHTS).map(([key, weight]) => ({
    key,
    value: (selectionScoreInputs[key as keyof typeof selectionScoreInputs] ?? 0) * weight,
  }));

  const selectionScore =
    Math.round(weightedBreakdown.reduce((sum, item) => sum + item.value, 0) * 10000) / 100;

  return { selectionScore, selectionScoreInputs };
}
