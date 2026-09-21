import { randomUUID } from "node:crypto";
import {
  analyzeFatalAssumptions,
  buildAssumptionRegister,
} from "@/lib/infinity/venture-selection/assumptions/register";
import type { ValidationEvidenceItem } from "@/lib/infinity/venture-selection/assumptions/register";
import { assessBuildability, assessSpeedToValue } from "@/lib/infinity/venture-selection/buildability/assess";
import {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
} from "@/lib/infinity/venture-selection/constants";
import {
  classifyDecision,
  passesBuildGate,
  simulateResourceAllocation,
} from "@/lib/infinity/venture-selection/decisions/classify";
import {
  calculateCapitalEfficiencyMetrics,
  calculateExpectedValue,
  deriveExpectedValueInputs,
} from "@/lib/infinity/venture-selection/economics/expected-value";
import { calculateSelectionScore } from "@/lib/infinity/venture-selection/scoring/selection-score";
import { calculateValidationDimensions } from "@/lib/infinity/venture-selection/scoring/validation-score";
import type { CandidateEvaluationDraft } from "@/lib/infinity/venture-selection/types";
import { DEFAULT_RESOURCE_CONSTRAINTS } from "@/lib/infinity/venture-selection/constants";

export function rescoreAfterValidation(input: {
  preValidationEvaluation: CandidateEvaluationDraft;
  validationEvidence: ValidationEvidenceItem[];
}): CandidateEvaluationDraft {
  const candidate = input.preValidationEvaluation.candidate;
  const adversarialReview = input.preValidationEvaluation.adversarialReview;

  const assumptions = buildAssumptionRegister(candidate, {
    adversarialRiskInputs: adversarialReview?.riskInputs,
    adversarialFindings: adversarialReview?.findings,
    validationEvidence: input.validationEvidence,
  });
  const fatal = analyzeFatalAssumptions(assumptions);
  const buildability = assessBuildability(candidate);
  const speedToValue = assessSpeedToValue(candidate);
  const expectedValueInputs = deriveExpectedValueInputs(candidate);
  const expectedValueDerived = calculateExpectedValue(expectedValueInputs);
  const capitalEfficiencyMetrics = calculateCapitalEfficiencyMetrics({
    startupCapital: expectedValueInputs.startupCapital,
    expected12MonthProfit: expectedValueDerived.expected12MonthProfit,
    probabilityAdjustedGrossProfit: expectedValueDerived.probabilityAdjustedGrossProfit,
    monthlyBurn: Math.round((candidate.monetization?.primaryPlan?.estimatedFixedCosts ?? 40000) / 12),
  });

  const { dimensions, validationScore } = calculateValidationDimensions({
    candidate,
    buildability,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    adversarialRiskInputs: adversarialReview?.riskInputs,
  });

  const { selectionScore, selectionScoreInputs } = calculateSelectionScore({
    candidate,
    validationScore,
    buildability,
    expectedValue: expectedValueDerived,
    speedToValue,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    adversarialRiskInputs: adversarialReview?.riskInputs,
  });

  const confidence =
    Math.round(
      (((candidate.monetization?.recommendation.confidence ?? 0.5) +
        (1 - fatal.assumptionUncertaintyScore) +
        (adversarialReview?.confidence ?? 0.5)) /
        3) *
        10000,
    ) / 10000;

  const evaluation: CandidateEvaluationDraft = {
    ...input.preValidationEvaluation,
    assumptions,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    blockingAssumptions: fatal.blockingAssumptions,
    validationScore,
    validationDimensions: dimensions,
    buildability,
    speedToValue,
    expectedValueInputs,
    expectedValueDerived,
    capitalEfficiencyMetrics,
    selectionScoreInputs,
    selectionScore,
    portfolioAdjustedScore: selectionScore,
    confidence,
    explanation: {
      ...input.preValidationEvaluation.explanation,
      confidence,
    },
  };

  const buildGate = passesBuildGate({
    evaluation,
    thresholds: DEFAULT_BUILD_GATE_THRESHOLDS,
  });
  const allocationPreview = simulateResourceAllocation({
    rankedEvaluations: [{ ...evaluation, decision: buildGate.passes ? "BUILD" : "VALIDATE" }],
    constraints: DEFAULT_RESOURCE_CONSTRAINTS,
  });
  const hasResourceCapacity =
    allocationPreview.allocations.some(
      (item) => item.candidateId === evaluation.candidate.candidateId && item.decision === "BUILD",
    ) || buildGate.passes;

  const classified = classifyDecision({
    evaluation,
    buildGatePassed: buildGate.passes,
    buildGateReasons: buildGate.reasons,
    hasResourceCapacity,
    decisionThresholds: DEFAULT_DECISION_THRESHOLDS,
  });

  return {
    ...evaluation,
    decision: classified.decision,
    recommendedNextAction: classified.recommendedNextAction,
    queueReason: `Post-validation rescored evaluation (${randomUUID().slice(0, 8)})`,
  };
}

export function postValidationEvaluationId(
  validationRunId: string,
  candidateId: string,
): string {
  return `post-validation:${validationRunId}:${candidateId}`;
}
