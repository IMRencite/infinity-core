import type { DiscoveryStrategyId } from "../constants";

export type DiscoveryStrategyDefinition = {
  id: DiscoveryStrategyId;
  label: string;
  signalCategories: string[];
  buildResearchObjective: (scope: Record<string, unknown>) => string;
};

const DEFAULT_GEO = "United States";

function scopeText(scope: Record<string, unknown>): string {
  const geo = typeof scope.geography === "string" ? scope.geography : DEFAULT_GEO;
  const focus =
    typeof scope.focus === "string"
      ? scope.focus
      : "software-driven and automatable business models across SaaS, marketplaces, content, lead-gen, APIs, data products, ecommerce, and other digital models";
  return `Geography: ${geo}. Focus: ${focus}.`;
}

export const DISCOVERY_STRATEGIES: Record<DiscoveryStrategyId, DiscoveryStrategyDefinition> = {
  market_pain_discovery: {
    id: "market_pain_discovery",
    label: "Market pain discovery",
    signalCategories: ["demand", "competition"],
    buildResearchObjective: (scope) =>
      `${scopeText(scope)} Discover 2-3 recurring business/customer pain points with evidence of spending, manual workflows, complaints, or weak incumbent solutions. Evidence only — do not recommend ventures.`,
  },
  emerging_trend_discovery: {
    id: "emerging_trend_discovery",
    label: "Emerging trend discovery",
    signalCategories: ["market_change", "demand"],
    buildResearchObjective: (scope) =>
      `${scopeText(scope)} Discover 2-3 emerging market/technology trends creating new online business openings for small software-driven companies. Provide current signals and sources.`,
  },
  expensive_workflow_discovery: {
    id: "expensive_workflow_discovery",
    label: "Expensive workflow discovery",
    signalCategories: ["demand", "monetization", "buildability"],
    buildResearchObjective: (scope) =>
      `${scopeText(scope)} Discover 2-3 expensive or fragmented business workflows that small software companies could automate or replace. Include pricing/pain evidence.`,
  },
  underserved_niche_discovery: {
    id: "underserved_niche_discovery",
    label: "Underserved niche discovery",
    signalCategories: ["demand", "competition", "distribution"],
    buildResearchObjective: (scope) =>
      `${scopeText(scope)} Discover 2-3 underserved niches where demand exists but incumbent solutions are weak, outdated, or poorly distributed.`,
  },
  software_replacement_discovery: {
    id: "software_replacement_discovery",
    label: "Software replacement discovery",
    signalCategories: ["competition", "buildability"],
    buildResearchObjective: (scope) =>
      `${scopeText(scope)} Discover 2-3 categories of outdated/expensive software ripe for replacement by focused modern tools.`,
  },
  search_demand_discovery: {
    id: "search_demand_discovery",
    label: "Search demand discovery",
    signalCategories: ["demand", "distribution"],
    buildResearchObjective: (scope) =>
      `${scopeText(scope)} Discover 2-3 areas of growing online search demand indicating unmet needs suitable for digital businesses.`,
  },
  marketplace_gap_discovery: {
    id: "marketplace_gap_discovery",
    label: "Marketplace gap discovery",
    signalCategories: ["competition", "monetization"],
    buildResearchObjective: (scope) =>
      `${scopeText(scope)} Discover 2-3 marketplace/platform gaps where buyers and sellers lack efficient matching infrastructure.`,
  },
  business_model_discovery: {
    id: "business_model_discovery",
    label: "Business model discovery",
    signalCategories: ["monetization", "market_change"],
    buildResearchObjective: (scope) =>
      `${scopeText(scope)} Discover 2-3 novel or underused online business models gaining traction that a small software company could adopt.`,
  },
};

export function resolveDiscoveryStrategies(
  strategyIds: DiscoveryStrategyId[],
): DiscoveryStrategyDefinition[] {
  return strategyIds.map((id) => {
    const strategy = DISCOVERY_STRATEGIES[id];
    if (!strategy) {
      throw new Error(`Unknown discovery strategy: ${id}`);
    }
    return strategy;
  });
}

export function listDiscoveryStrategyIds(): DiscoveryStrategyId[] {
  return Object.keys(DISCOVERY_STRATEGIES) as DiscoveryStrategyId[];
}
