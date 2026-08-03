import type { DiscoveredOpportunity, ScoredDiscoveredOpportunity } from "../types/opportunity";
import { DISCOVERY_RULE_SCORING_VERSION } from "../constants";

const SOURCE_CONFIDENCE: Record<string, number> = {
  manual: 95,
  hackernews: 78,
  reddit: 72,
  product_hunt: 80,
  github_trending: 75,
  google_trends: 70,
  rss: 68,
};

const CATEGORY_DEMAND: Record<string, number> = {
  search_demand: 85,
  product_demand: 80,
  social_discussion: 65,
  technology: 70,
  market_signal: 60,
  other: 50,
};

const MARKET_REVENUE_FACTOR: Record<string, number> = {
  b2b: 1.15,
  b2c: 1.0,
  developer_tools: 1.1,
  general: 0.95,
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function scoreDiscoveredOpportunity(
  opportunity: DiscoveredOpportunity,
): ScoredDiscoveredOpportunity {
  const keywordBoost = Math.min(opportunity.keywords.length * 4, 20);
  const baseDemand = CATEGORY_DEMAND[opportunity.category] ?? CATEGORY_DEMAND.other;
  const estimatedDemand = clamp(baseDemand + keywordBoost);

  const titleLength = opportunity.title.length;
  const competitionPenalty = titleLength > 80 ? 15 : titleLength > 40 ? 8 : 0;
  const estimatedCompetition = clamp(55 + competitionPenalty - keywordBoost / 2);

  const marketFactor = MARKET_REVENUE_FACTOR[opportunity.market] ?? 1;
  const estimatedRevenuePotential = clamp(
    (estimatedDemand * 0.55 + (100 - estimatedCompetition) * 0.45) * marketFactor,
  );

  const confidence = clamp(
    (SOURCE_CONFIDENCE[opportunity.source] ?? 60) + (opportunity.url.startsWith("http") ? 5 : 0),
  );

  const overallScore = clamp(
    estimatedDemand * 0.35 +
      (100 - estimatedCompetition) * 0.25 +
      estimatedRevenuePotential * 0.25 +
      confidence * 0.15,
  );

  return {
    ...opportunity,
    estimatedDemand,
    estimatedCompetition,
    estimatedRevenuePotential,
    confidence,
    overallScore,
    scoringVersion: DISCOVERY_RULE_SCORING_VERSION,
    scoreBreakdown: {
      demand: estimatedDemand,
      competition: estimatedCompetition,
      revenuePotential: estimatedRevenuePotential,
      confidence,
    },
  };
}

export function rankScoredOpportunities(
  opportunities: ScoredDiscoveredOpportunity[],
): ScoredDiscoveredOpportunity[] {
  return [...opportunities].sort((a, b) => {
    if (b.overallScore !== a.overallScore) {
      return b.overallScore - a.overallScore;
    }
    return b.confidence - a.confidence;
  });
}
