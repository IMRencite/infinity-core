import type { FounderEstimateStrength } from "../educated-estimates/types";

export const CONTRIBUTION_PROFIT_HELP =
  "Revenue left after modeled variable delivery costs. This is not final company net profit.";

export type VentureBriefMetric = {
  id: string;
  label: string;
  primary: string;
  range: string;
  confidence: FounderEstimateStrength;
  kind: "estimated" | "actual" | "modeled";
  help: string;
};

export type FounderProfitBreakdown = {
  monthlyRevenue: string;
  monthlyVariableCost: string;
  monthlyContributionProfit: string;
  firstYearRecurringRevenue: string;
  firstYearSetupRevenue: string;
  firstYearTotalRevenue: string;
  firstYearContributionProfit: string;
  lifetimeContribution: string;
  setupProfitIncluded: false;
  labelsContributionNotNet: true;
  warning: string | null;
  waterfall: Array<{ id: string; label: string; value: string }>;
};

export type MarketAdvantageCard = {
  id: string;
  label: string;
  value: string;
  evidence: string;
};

export type WhyWinRow = {
  problem: string;
  response: string;
  commercialWhy: string;
  evidence: string;
};

export type MarketVsInfinityRow = {
  dimension: string;
  marketToday: string;
  infinityOpportunity: string;
  evidence: string;
};

export type FounderVentureBriefView = {
  heading: "Infinity Venture Brief";
  outlook: string;
  summary: string;
  metrics: VentureBriefMetric[];
  profit: FounderProfitBreakdown;
  advantage: {
    biggestProblem: string;
    infinityCouldDoBetter: string;
    strongestDifferentiator: string;
    biggestCompetitorWeakness: string;
    biggestRisk: string;
    cards: MarketAdvantageCard[];
  };
  whyThisCouldWin: WhyWinRow[];
  marketGetsWrong: string[];
  doDifferently: string[];
  marketVsInfinity: MarketVsInfinityRow[];
  grantsBuild: false;
};
