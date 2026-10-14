export const HIGH_VALUE_PAGE_OPPORTUNITY_ENGINE_V1 = "HIGH_VALUE_PAGE_OPPORTUNITY_ENGINE_V1" as const;

export type HighValuePageKind =
  | "PILLAR"
  | "EVERGREEN_GUIDE"
  | "COMMERCIAL"
  | "COMPARISON"
  | "FAQ_HUB"
  | "GLOSSARY"
  | "TOOL"
  | "GEO";

export type HighValuePageOpportunity = {
  venture_id: string;
  kind: HighValuePageKind;
  topic: string;
  intent: string;
  score: number;
};

export function scoreHighValuePageOpportunity(input: {
  venture_id: string;
  kind: HighValuePageKind;
  topic: string;
  search_demand_signal: number;
  strategy_fit: number;
}): HighValuePageOpportunity {
  const score = Math.min(100, input.search_demand_signal * 0.6 + input.strategy_fit * 0.4);
  return {
    venture_id: input.venture_id,
    kind: input.kind,
    topic: input.topic,
    intent: input.kind === "COMMERCIAL" ? "commercial" : "informational",
    score,
  };
}

export function highValuePageOpportunityQc(opportunities: HighValuePageOpportunity[]): "PASS" | "FAIL" {
  return opportunities.some((o) => o.score >= 40) ? "PASS" : "FAIL";
}
