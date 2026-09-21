import { LOCKED_SUCCESS_CRITERIA } from "./constants";
import type { ExperimentCounts, ExperimentOutcome, SuccessCriteria, WtpLevel } from "./types";

export function assertCriteriaLocked(criteria: SuccessCriteria): boolean {
  return (
    criteria.lockedBeforeLaunch === true &&
    criteria.minQualifiedSample === LOCKED_SUCCESS_CRITERIA.minQualifiedSample &&
    criteria.minStrongIntentEvents === LOCKED_SUCCESS_CRITERIA.minStrongIntentEvents &&
    criteria.minPricingSelections === LOCKED_SUCCESS_CRITERIA.minPricingSelections &&
    criteria.maxDurationDays === LOCKED_SUCCESS_CRITERIA.maxDurationDays
  );
}

export function classifyWtp(input: {
  counts: ExperimentCounts;
  observedPayment: boolean;
  criteria: SuccessCriteria;
}): WtpLevel {
  if (input.observedPayment) return "NONE";
  if (input.counts.qualifiedSubmissions === 0 && input.counts.strongIntent === 0) return "NONE";
  if (input.counts.qualifiedSubmissions < input.criteria.minQualifiedSample) {
    return input.counts.strongIntent > 0 ? "WEAK" : "NONE";
  }
  if (input.counts.strongIntent >= input.criteria.minStrongIntentEvents) return "STRONG";
  if (input.counts.pricingSelections >= input.criteria.minPricingSelections) return "MODERATE";
  return "WEAK";
}

export function analyzeExperiment(input: {
  counts: ExperimentCounts;
  criteria: SuccessCriteria;
  startedAt: string;
  now: string;
  deployed: boolean;
  invalid?: boolean;
  aborted?: boolean;
  observedPayment?: boolean;
}): {
  outcome: ExperimentOutcome;
  wtp: WtpLevel;
  confidence: "NONE" | "WEAK" | "MODERATE" | "STRONG";
  timedOut: boolean;
} {
  if (input.invalid) {
    return { outcome: "INVALID_EXPERIMENT", wtp: "NONE", confidence: "NONE", timedOut: false };
  }
  if (input.aborted) {
    return { outcome: "ABORTED", wtp: "NONE", confidence: "NONE", timedOut: false };
  }
  if (input.observedPayment) {
    return { outcome: "INVALID_EXPERIMENT", wtp: "NONE", confidence: "NONE", timedOut: false };
  }
  const elapsedDays = (Date.parse(input.now) - Date.parse(input.startedAt)) / 86_400_000;
  const timedOut = elapsedDays >= input.criteria.maxDurationDays;
  const wtp = classifyWtp({
    counts: input.counts,
    observedPayment: false,
    criteria: input.criteria,
  });

  const sample = input.counts.qualifiedSubmissions;
  const rate = sample > 0 ? input.counts.strongIntent / sample : 0;

  if (sample > 0 && sample < 8 && input.counts.pageViews > 0 && sample / Math.max(input.counts.pageViews, 1) > 0.4) {
    // Tiny samples (e.g. 2 of 4) cannot validate.
    if (sample < input.criteria.minQualifiedSample) {
      return { outcome: "PROMISING_BUT_INSUFFICIENT", wtp, confidence: "WEAK", timedOut };
    }
  }

  if (sample >= input.criteria.minQualifiedSample && rate < input.criteria.negativeStrongIntentRate) {
    return { outcome: "NEGATIVE_SIGNAL", wtp, confidence: "MODERATE", timedOut };
  }

  if (
    sample >= input.criteria.minQualifiedSample &&
    input.counts.strongIntent >= input.criteria.minStrongIntentEvents &&
    input.counts.pricingSelections >= input.criteria.minPricingSelections
  ) {
    return { outcome: "PROMISING_BUT_INSUFFICIENT", wtp, confidence: "MODERATE", timedOut };
  }

  if (timedOut && sample < input.criteria.minQualifiedSample) {
    return { outcome: "INCONCLUSIVE", wtp, confidence: sample ? "WEAK" : "NONE", timedOut };
  }

  if (!input.deployed) {
    return { outcome: "INCONCLUSIVE", wtp: "NONE", confidence: "NONE", timedOut: false };
  }

  return { outcome: "INCONCLUSIVE", wtp, confidence: sample ? "WEAK" : "NONE", timedOut };
}

export function paymentsDisabledMakesObservedPaymentImpossible(): true {
  return true;
}
