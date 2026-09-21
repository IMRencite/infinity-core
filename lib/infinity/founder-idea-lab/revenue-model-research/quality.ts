import type { RevenueAttractivenessState, RevenueModelCoverageStatus, RevenueQualityState, RevenueStream } from "./types";

export function assessRevenueQuality(input: {
  coverageStatus: RevenueModelCoverageStatus;
  streams: RevenueStream[];
  annualContracts: boolean;
  serviceHeavy: boolean;
  transactional: boolean;
}): { assessment: RevenueQualityState; reason: string } {
  if (input.coverageStatus === "REVENUE_MODEL_INSUFFICIENT" || !input.streams.length) {
    return { assessment: "INSUFFICIENT_DATA", reason: "Not enough grounded monetization evidence to judge revenue quality." };
  }
  if (input.transactional && !input.streams.some((item) => item.recurringOrOneTime === "RECURRING")) {
    return { assessment: "TRANSACTIONAL", reason: "Observed streams are commission/transactional without a recurring core." };
  }
  if (!input.streams.some((item) => item.priceRange.base != null || item.priceRange.low != null)) {
    return { assessment: "LOW_VISIBILITY", reason: "Monetization structure is described qualitatively without numeric prices." };
  }
  if (input.serviceHeavy || input.streams.some((item) => item.type === "ONE_TIME_IMPLEMENTATION" || item.type === "MANAGED_SERVICE_RETAINER")) {
    return {
      assessment: "MIXED_RECURRING_SERVICE",
      reason: "Recurring software/package revenue is mixed with setup and/or managed service intensity.",
    };
  }
  if (input.annualContracts || input.streams.some((item) => item.recurringOrOneTime === "RECURRING")) {
    return {
      assessment: "HIGH_QUALITY_RECURRING",
      reason: "Grounded recurring pricing exists with limited forced service intensity.",
    };
  }
  return { assessment: "LOW_VISIBILITY", reason: "Revenue quality cannot be classified beyond available evidence." };
}

export function assessRevenueAttractiveness(input: {
  coverageStatus: RevenueModelCoverageStatus;
  quality: RevenueQualityState;
  numericComparables: number;
}): { assessment: RevenueAttractivenessState; reason: string } {
  if (input.coverageStatus === "REVENUE_MODEL_INSUFFICIENT") {
    return {
      assessment: "INSUFFICIENT_REVENUE_EVIDENCE",
      reason: "Infinity does not yet understand how this business could plausibly make money from grounded evidence.",
    };
  }
  if (input.quality === "TRANSACTIONAL") {
    return { assessment: "WEAK_REVENUE_MODEL", reason: "Comparable money model is transactional with weak recurring visibility." };
  }
  if (input.quality === "LOW_VISIBILITY" || input.numericComparables < 2) {
    return { assessment: "MIXED_REVENUE_MODEL", reason: "A money model is visible but numeric comparable support is still thin." };
  }
  if (input.quality === "HIGH_QUALITY_RECURRING" || input.quality === "MIXED_RECURRING_SERVICE") {
    return {
      assessment: "PROMISING_REVENUE_MODEL",
      reason: "Grounded comparable monetization supports a defensible recurring (or hybrid) money model. This is not a profitability promise.",
    };
  }
  return { assessment: "MIXED_REVENUE_MODEL", reason: "Evidence supports a money model with material unknowns remaining." };
}
