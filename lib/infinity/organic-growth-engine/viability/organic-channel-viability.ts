import {
  DEFAULT_VIABILITY_THRESHOLDS,
  DEFAULT_VIABILITY_WEIGHTS,
  ORGANIC_GROWTH_SCORING_VERSION,
  type OrganicViabilityRecommendation,
  type OrganicViabilityThresholds,
  type OrganicViabilityWeights,
} from "../constants";
import type { OrganicChannelViability, OrganicChannelViabilityInput } from "../types";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeScore(value: number): number {
  return Math.round(clamp01(value) * 100);
}

function invert(value: number): number {
  return 1 - clamp01(value);
}

export function recommendOrganicStrategy(
  score: number,
  thresholds: OrganicViabilityThresholds = DEFAULT_VIABILITY_THRESHOLDS,
): OrganicViabilityRecommendation {
  if (score <= thresholds.noneMax) return "NONE";
  if (score <= thresholds.limitedMax) return "LIMITED";
  if (score <= thresholds.standardMax) return "STANDARD";
  if (score <= thresholds.authorityMax) return "AUTHORITY";
  return "LARGE_SCALE";
}

export function calculateOrganicChannelViability(
  input: OrganicChannelViabilityInput,
  weights: OrganicViabilityWeights = DEFAULT_VIABILITY_WEIGHTS,
  thresholds: OrganicViabilityThresholds = DEFAULT_VIABILITY_THRESHOLDS,
): OrganicChannelViability {
  const signals = {
    searchDemand: normalizeScore(input.searchDemand),
    aiAnswerDemand: normalizeScore(input.aiAnswerDemand),
    commercialIntent: normalizeScore(input.commercialIntent),
    customerValue: normalizeScore(input.customerValue),
    conversionPotential: normalizeScore(input.conversionPotential),
    competition: normalizeScore(invert(input.serpCompetition) * 0.5 + invert(input.answerEngineCompetition) * 0.5),
    contentProductionCost: normalizeScore(invert(input.contentProductionCost)),
    authorityRequirements: normalizeScore(invert(input.authorityRequirements)),
    timeToSignal: normalizeScore(invert(input.timeToSignal)),
    timeToRevenue: normalizeScore(invert(input.timeToRevenue)),
    topicDepth: normalizeScore(input.topicDepth),
    evidenceAvailability: normalizeScore(input.evidenceAvailability),
    brandRelevance: normalizeScore(input.brandRelevance),
    marginalPageValue: normalizeScore(input.expectedMarginalPageValue),
  };

  const weighted =
    signals.searchDemand * weights.searchDemand +
    signals.aiAnswerDemand * weights.aiAnswerDemand +
    signals.commercialIntent * weights.commercialIntent +
    signals.customerValue * weights.customerValue +
    signals.conversionPotential * weights.conversionPotential +
    signals.competition * weights.competition +
    signals.contentProductionCost * weights.contentProductionCost +
    signals.authorityRequirements * weights.authorityRequirements +
    signals.timeToSignal * weights.timeToSignal +
    signals.timeToRevenue * weights.timeToRevenue +
    signals.topicDepth * weights.topicDepth +
    signals.evidenceAvailability * weights.evidenceAvailability +
    signals.brandRelevance * weights.brandRelevance +
    signals.marginalPageValue * weights.marginalPageValue;

  const organicViabilityScore = Math.round(weighted * 100) / 100;
  const recommendation = recommendOrganicStrategy(organicViabilityScore, thresholds);
  const rationale: string[] = [];

  if (recommendation === "NONE") {
    rationale.push("Organic acquisition economics or differentiation do not justify investment.");
  } else if (recommendation === "LIMITED") {
    rationale.push("Limited organic footprint recommended — focus on high-value core pages.");
  } else if (recommendation === "STANDARD") {
    rationale.push("Standard authority site architecture is economically justified.");
  } else if (recommendation === "AUTHORITY") {
    rationale.push("Hub-and-spoke authority architecture is justified by demand and economics.");
  } else {
    rationale.push("Large-scale digital real estate may be justified if quality gates pass per page.");
  }

  if (input.evidenceAvailability < 0.35) {
    rationale.push("Evidence availability is weak — expansion should remain conservative.");
  }
  if (input.contentDifferentiation < 0.4) {
    rationale.push("Differentiation risk is elevated — avoid programmatic keyword permutations.");
  }

  return {
    organicViabilityScore,
    recommendation,
    rationale,
    inputSignals: input,
    organicAcquisitionRecommended: recommendation !== "NONE",
  };
}

export { ORGANIC_GROWTH_SCORING_VERSION };
