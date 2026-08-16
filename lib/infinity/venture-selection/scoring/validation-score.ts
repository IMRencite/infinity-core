import { DEFAULT_VALIDATION_WEIGHTS } from "../constants";
import type { BuildabilityAssessment, LoadedCandidateBundle, ValidationDimensionScores } from "../types";

function normalizeScore(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 10000) / 10000;
}

export function calculateValidationDimensions(input: {
  candidate: LoadedCandidateBundle;
  buildability: BuildabilityAssessment;
  fatalAssumptionRiskScore: number;
  assumptionUncertaintyScore: number;
  adversarialRiskInputs?: Record<string, number>;
}): { dimensions: ValidationDimensionScores; validationScore: number } {
  const plan = input.candidate.monetization?.primaryPlan;
  const opportunityScore = (input.candidate.opportunityScore ?? 50) / 100;
  const monetizationScore = (input.candidate.monetization?.monetizationScore ?? 50) / 100;
  const evidenceCount =
    input.candidate.demandEvidence.length +
    input.candidate.monetizationEvidence.length +
    (plan?.sourceUrls.length ?? 0);

  const dimensions: ValidationDimensionScores = {
    demand_strength: normalizeScore(opportunityScore),
    evidence_quality: normalizeScore(Math.min(1, evidenceCount / 8)),
    problem_severity: normalizeScore(opportunityScore * 0.9 + 0.1),
    monetization_strength: normalizeScore(monetizationScore),
    recurring_revenue: normalizeScore(
      /subscription|saas|membership|retainer|recurring/.test(
        `${plan?.modelType ?? ""} ${input.candidate.revenueMechanismCandidates.join(" ")}`,
      )
        ? 0.8
        : 0.45,
    ),
    margin_potential: normalizeScore((plan?.estimatedGrossMarginPercent ?? 50) / 100),
    cac_feasibility: normalizeScore(
      1 - (plan?.customerAcquisitionDifficulty ?? 0.5) - (input.adversarialRiskInputs?.acquisition_risk ?? 0) * 0.2,
    ),
    ltv_potential: normalizeScore(
      plan?.ltvCacRatio != null ? Math.min(1, plan.ltvCacRatio / 5) : 0.5,
    ),
    speed_to_revenue: normalizeScore(
      1 - Math.min(1, ((plan?.estimatedMonthsToFirstRevenue ?? 6) / 12)),
    ),
    capital_efficiency: normalizeScore(
      plan?.estimatedCapitalRequired != null
        ? 1 - Math.min(1, plan.estimatedCapitalRequired / 300000)
        : 0.5,
    ),
    buildability: normalizeScore(input.buildability.buildabilityScore / 100),
    automation_potential: normalizeScore(input.buildability.automationScore / 100),
    scalability: normalizeScore(
      (input.buildability.automationScore / 100) * 0.6 +
        (input.buildability.canDeliverDigitally ? 0.25 : 0) +
        (1 - (plan?.operationalComplexity ?? 0.4)) * 0.15,
    ),
    distribution_feasibility: normalizeScore(
      1 -
        (plan?.customerAcquisitionDifficulty ?? 0.5) * 0.6 -
        (input.adversarialRiskInputs?.distribution_risk ?? 0) * 0.2,
    ),
    defensibility: normalizeScore(
      0.5 +
        (input.candidate.competitionEvidence.length > 0 ? 0.1 : 0) -
        (input.adversarialRiskInputs?.competition_risk ?? 0) * 0.3,
    ),
    execution_risk: normalizeScore(
      1 -
        (plan?.technicalComplexity ?? 0.4) * 0.25 -
        (plan?.operationalComplexity ?? 0.4) * 0.25 -
        (input.adversarialRiskInputs?.execution_risk ?? 0) * 0.25 -
        input.fatalAssumptionRiskScore * 0.25,
    ),
    assumption_uncertainty: normalizeScore(1 - input.assumptionUncertaintyScore),
    evidence_confidence: normalizeScore(
      (plan?.sourceUrls.length ?? 0) > 0 ? 0.7 : 0.45,
    ),
  };

  const weightedBreakdown = Object.entries(DEFAULT_VALIDATION_WEIGHTS).map(([key, weight]) => ({
    key,
    value: (dimensions[key] ?? 0) * weight,
  }));

  const validationScore =
    Math.round(weightedBreakdown.reduce((sum, item) => sum + item.value, 0) * 10000) / 100;

  return { dimensions, validationScore };
}
