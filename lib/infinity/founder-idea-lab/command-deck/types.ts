import type { FounderEstimateStrength } from "../educated-estimates/types";
import type { FounderBuildPlanPhase, FounderRequiredSystem } from "../build-plan/types";
import type { MarketVsInfinityRow } from "../venture-brief/types";

export type CommandDeckMetric = {
  id: string;
  label: string;
  value: string;
  confidence: FounderEstimateStrength;
  help?: string;
};

export type CommandDeckNextMove = {
  recommendation: string;
  why: string;
  whatInfinityWouldTest: string;
  successLooksLike: string;
};

export type FounderVentureCommandDeck = {
  heading: "Venture Command Deck";
  identity: {
    name: string;
    concept: string;
    customer: string;
    problem: string;
    solution: string;
    businessModel: string;
  };
  thesis: string;
  whyThisCouldBeABusiness: string;
  businessCase: string;
  buildReadiness: string;
  buildReadinessReason: string;
  economicConfidence: "Weak" | "Moderate" | "Strong";
  currentPosition: string;
  nextMove: CommandDeckNextMove;
  metrics: CommandDeckMetric[];
  profit: {
    monthlyContribution: string;
    firstYearContribution: string;
    lifetimeContribution: string;
  };
  scaleAt100: {
    mrr: string;
    contribution: string;
    arr: string;
    note: "Scenario, not forecast.";
  } | null;
  biggestAdvantage: string;
  biggestRisk: string;
  primaryPain: string;
  howInfinityWouldSolve: string;
  marketEdge: MarketVsInfinityRow[];
  requiredSystems: FounderRequiredSystem[];
  systemsReady: number;
  systemsPartial: number;
  systemsMissing: number;
  systemsBlocked: number;
  coverageSummary: string;
  alreadyAvailable: string[];
  productSpecificWork: string[];
  buildComplexity: "LOW" | "MEDIUM" | "HIGH";
  next3Phases: FounderBuildPlanPhase[];
  synthesis: string;
  grantsBuild: false;
};
