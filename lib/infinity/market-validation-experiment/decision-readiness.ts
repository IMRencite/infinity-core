import { LOCKED_SUCCESS_CRITERIA } from "./constants";
import type { ExperimentCounts } from "./types";
import type { ExperimentClock } from "./experiment-clock";

export const DECISION_READINESS_STATES = [
  "CONTINUE_COLLECTING",
  "EXTERNAL_ACQUISITION_ACTION_REQUIRED",
  "THRESHOLD_MET",
  "INSUFFICIENT_EVIDENCE",
  "NEGATIVE_SIGNAL",
  "EXPERIMENT_WINDOW_EXPIRED",
  "READY_FOR_VALIDATION_DECISION",
] as const;

export type DecisionReadinessState = (typeof DECISION_READINESS_STATES)[number];

export function evaluateDecisionReadiness(input: {
  counts: ExperimentCounts;
  clock: ExperimentClock;
  deployedPublic: boolean;
}): {
  currentDecision: "VALIDATE";
  buildReady: false;
  evidenceSufficiency: "INSUFFICIENT" | "SUFFICIENT_FOR_REVIEW" | "NEGATIVE";
  nextDeterministicState: DecisionReadinessState;
  thresholdStatus: string;
  progress: {
    qualifiedSample: { current: number; required: number };
    strongIntent: { current: number; required: number };
    pricingSelections: { current: number; required: number };
  };
  conversion: { value: null; denominatorValid: false; reason: string } | { value: number; denominatorValid: true; reason: string };
} {
  const criteria = LOCKED_SUCCESS_CRITERIA;
  const qualified = input.counts.qualifiedSubmissions;
  const strong = input.counts.strongIntent;
  const pricing = input.counts.pricingSelections;
  const sampleMet = qualified >= criteria.minQualifiedSample;
  const strongMet = strong >= criteria.minStrongIntentEvents;
  const pricingMet = pricing >= criteria.minPricingSelections;
  const allMet = sampleMet && strongMet && pricingMet;
  const rate = qualified > 0 ? strong / qualified : null;
  const negative = qualified >= criteria.minQualifiedSample && rate !== null && rate < criteria.negativeStrongIntentRate;

  let next: DecisionReadinessState = "CONTINUE_COLLECTING";
  let sufficiency: "INSUFFICIENT" | "SUFFICIENT_FOR_REVIEW" | "NEGATIVE" = "INSUFFICIENT";
  if (input.clock.windowExpired && !allMet) {
    next = "EXPERIMENT_WINDOW_EXPIRED";
  } else if (negative) {
    next = "NEGATIVE_SIGNAL";
    sufficiency = "NEGATIVE";
  } else if (allMet) {
    next = "READY_FOR_VALIDATION_DECISION";
    sufficiency = "SUFFICIENT_FOR_REVIEW";
  } else if (sampleMet && (!strongMet || !pricingMet)) {
    next = "THRESHOLD_MET";
    sufficiency = "INSUFFICIENT";
  } else if (input.deployedPublic && qualified === 0) {
    next = "EXTERNAL_ACQUISITION_ACTION_REQUIRED";
  } else if (qualified > 0 && !allMet) {
    next = "CONTINUE_COLLECTING";
  }

  const conversion =
    input.counts.pageViews > 0
      ? {
          value: qualified / input.counts.pageViews,
          denominatorValid: true as const,
          reason: "Conversion uses real non-synthetic page views as the denominator.",
        }
      : {
          value: null,
          denominatorValid: false as const,
          reason: "No real page-view denominator exists. Conversion is not computed.",
        };

  return {
    currentDecision: "VALIDATE",
    buildReady: false,
    evidenceSufficiency: sufficiency,
    nextDeterministicState: next,
    thresholdStatus: allMet
      ? "ALL_LOCKED_THRESHOLDS_MET"
      : input.clock.windowExpired
        ? "WINDOW_EXPIRED_BEFORE_THRESHOLDS"
        : "THRESHOLDS_NOT_MET",
    progress: {
      qualifiedSample: { current: qualified, required: criteria.minQualifiedSample },
      strongIntent: { current: strong, required: criteria.minStrongIntentEvents },
      pricingSelections: { current: pricing, required: criteria.minPricingSelections },
    },
    conversion,
  };
}
