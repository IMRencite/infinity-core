import {
  DEFAULT_COMBINED_DECISION_WEIGHTS,
  DEFAULT_VIABILITY_THRESHOLDS,
  type EconomicViabilityState,
} from "../constants";
import type { EconomicViabilityResult } from "../types";

export function calculateCombinedDecisionScore(input: {
  opportunityScore: number;
  monetizationScore: number;
  weights?: typeof DEFAULT_COMBINED_DECISION_WEIGHTS;
}): number {
  const weights = input.weights ?? DEFAULT_COMBINED_DECISION_WEIGHTS;
  const score =
    input.opportunityScore * weights.opportunity_score +
    input.monetizationScore * weights.monetization_score;
  return Math.round(score * 100) / 100;
}

export function evaluateEconomicViability(input: {
  opportunityScore: number;
  monetizationScore: number;
  combinedDecisionScore?: number;
  thresholds?: typeof DEFAULT_VIABILITY_THRESHOLDS;
}): EconomicViabilityResult {
  const combinedDecisionScore =
    input.combinedDecisionScore ??
    calculateCombinedDecisionScore({
      opportunityScore: input.opportunityScore,
      monetizationScore: input.monetizationScore,
    });

  const thresholds = input.thresholds ?? DEFAULT_VIABILITY_THRESHOLDS;
  let state: EconomicViabilityState;
  let rationale: string;

  if (combinedDecisionScore >= thresholds.strong) {
    state = "STRONG";
    rationale =
      "Strong combined opportunity and monetization signals with credible unit economics.";
  } else if (combinedDecisionScore >= thresholds.promising) {
    state = "PROMISING";
    rationale =
      "Promising economics but additional validation recommended before venture assembly.";
  } else if (combinedDecisionScore >= thresholds.speculative) {
    state = "SPECULATIVE";
    rationale =
      "Speculative economics with meaningful uncertainty in revenue, margin, or acquisition.";
  } else if (combinedDecisionScore >= thresholds.weak) {
    state = "WEAK";
    rationale = "Weak economic profile relative to Infinity automation and capital efficiency goals.";
  } else {
    state = "REJECT";
    rationale = "Insufficient combined opportunity and monetization evidence for further pursuit.";
  }

  return {
    state,
    combinedDecisionScore,
    opportunityScore: input.opportunityScore,
    monetizationScore: input.monetizationScore,
    rationale,
  };
}
