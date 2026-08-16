import {
  DEFAULT_PAGE_OPPORTUNITY_WEIGHTS,
  ORGANIC_GROWTH_SCORING_VERSION,
  type PageOpportunityScoreWeights,
} from "../constants";
import type { PageOpportunity, PageOpportunityScore } from "../types";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function calculatePageOpportunityScore(
  opportunity: PageOpportunity,
  weights: PageOpportunityScoreWeights = DEFAULT_PAGE_OPPORTUNITY_WEIGHTS,
): PageOpportunityScore {
  const factors: Record<string, number> = {
    searchDemand: clamp01(opportunity.searchDemandSignal.level) * 100,
    aiAnswerDemand: clamp01(opportunity.aiAnswerDemandSignal.level) * 100,
    commercialIntent: intentCommercialScore(opportunity.primaryIntent),
    conversionPotential: clamp01(opportunity.estimatedConversionPotential) * 100,
    revenueRelationship: clamp01(opportunity.estimatedRevenueContribution / 5000) * 100,
    authorityContribution: clamp01(opportunity.authorityRelationship.includes("hub") ? 0.85 : 0.45) * 100,
    internalLinkContribution: clamp01(opportunity.crawlValue) * 100,
    contentUniqueness: clamp01(opportunity.uniquenessPotential) * 100,
    informationGain: clamp01(opportunity.uniquenessPotential * 0.6 + opportunity.contentDepthPotential * 0.4) * 100,
    evidenceAvailability: clamp01(opportunity.evidenceAvailability) * 100,
    customerUsefulness: clamp01(opportunity.contentDepthPotential) * 100,
    entityImportance: clamp01(opportunity.confidence) * 100,
    citationPotential: clamp01(opportunity.citationPotential) * 100,
    cannibalizationRisk: clamp01(opportunity.cannibalizationRisk) * 100,
    thinContentRisk: clamp01(opportunity.thinContentRisk) * 100,
    productionCost: clamp01(opportunity.estimatedProductionCost / 1000) * 100,
    researchCost: clamp01(opportunity.estimatedResearchCost / 500) * 100,
    maintenanceCost: clamp01(opportunity.estimatedMaintenanceCost / 200) * 100,
    lowDifferentiation: clamp01(1 - opportunity.uniquenessPotential) * 100,
    weakEvidence: clamp01(1 - opportunity.evidenceAvailability) * 100,
    weakBusinessRelevance: clamp01(opportunity.commercialRelationship === "none" ? 0.8 : 0.1) * 100,
  };

  const weightedBreakdown: Record<string, number> = {};
  let score = 0;
  for (const [key, value] of Object.entries(factors)) {
    const weight = weights[key as keyof PageOpportunityScoreWeights] ?? 0;
    const contribution = value * weight;
    weightedBreakdown[key] = Math.round(contribution * 100) / 100;
    score += contribution;
  }

  return {
    pageOpportunityId: opportunity.pageOpportunityId,
    score: Math.round(Math.max(0, Math.min(100, score)) * 100) / 100,
    weightedBreakdown,
    scoringVersion: ORGANIC_GROWTH_SCORING_VERSION,
  };
}

function intentCommercialScore(intent: string): number {
  if (/transactional|commercial|local_commercial/.test(intent)) return 90;
  if (/comparison|decision/.test(intent)) return 75;
  if (/informational/.test(intent)) return 50;
  return 40;
}

export function scorePageOpportunities(opportunities: PageOpportunity[]): PageOpportunityScore[] {
  return opportunities.map((o) => calculatePageOpportunityScore(o));
}
