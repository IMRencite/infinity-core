/**
 * Normalized opportunity emitted by the Discovery Engine pipeline (pre-persistence).
 */
export type DiscoveredOpportunity = {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  category: string;
  market: string;
  keywords: string[];
  estimatedDemand: number;
  estimatedCompetition: number;
  estimatedRevenuePotential: number;
  confidence: number;
  discoveredAt: string;
  rawPayload: Record<string, unknown>;
};

export type ScoredDiscoveredOpportunity = DiscoveredOpportunity & {
  overallScore: number;
  scoringVersion: string;
  scoreBreakdown: Record<string, number>;
};
