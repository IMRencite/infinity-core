import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { LOCKED_SUCCESS_CRITERIA } from "@/lib/infinity/market-validation-experiment/constants";
import type { EvidenceGap } from "./types";

export function calculateEvidenceGap(input: { now?: Date } = {}): EvidenceGap {
  const evidence = inspectRealMarketEvidence({ now: input.now });
  const qualified = evidence.counts.qualifiedSubmissions;
  const strong = evidence.counts.strongIntent;
  const pricing = evidence.counts.pricingSelections;
  return {
    qualifiedCurrent: qualified,
    qualifiedRequired: LOCKED_SUCCESS_CRITERIA.minQualifiedSample,
    qualifiedGap: Math.max(0, LOCKED_SUCCESS_CRITERIA.minQualifiedSample - qualified),
    strongIntentCurrent: strong,
    strongIntentRequired: LOCKED_SUCCESS_CRITERIA.minStrongIntentEvents,
    strongIntentGap: Math.max(0, LOCKED_SUCCESS_CRITERIA.minStrongIntentEvents - strong),
    pricingCurrent: pricing,
    pricingRequired: LOCKED_SUCCESS_CRITERIA.minPricingSelections,
    pricingGap: Math.max(0, LOCKED_SUCCESS_CRITERIA.minPricingSelections - pricing),
    qualifiedSubmissions: qualified,
    daysElapsed: evidence.clock.daysElapsed,
    daysRemaining: evidence.clock.daysRemaining,
    windowExpired: evidence.clock.windowExpired,
    evidenceSufficiency: evidence.decision.evidenceSufficiency,
    nextDeterministicState: evidence.decision.nextDeterministicState,
  };
}

export function discoverCollectingExperiments(input: { now?: Date } = {}) {
  const evidence = inspectRealMarketEvidence({ now: input.now });
  const active =
    evidence.experiment.state === "COLLECTING" &&
    !evidence.clock.windowExpired &&
    evidence.decision.evidenceSufficiency !== "SUFFICIENT_FOR_REVIEW";
  return {
    experiments: active
      ? [
          {
            candidateId: evidence.experiment.candidateId,
            experimentId: evidence.experiment.experimentId,
            artifactId: evidence.experiment.artifactId,
            state: evidence.experiment.state,
            syntheticOnly: false,
          },
        ]
      : [],
  };
}
