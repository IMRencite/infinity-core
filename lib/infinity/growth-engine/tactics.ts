import {
  GROWTH_TACTIC_CONTRACT,
  GROWTH_TACTIC_REGISTRY,
  GROWTH_TACTICS,
  type GrowthTacticContract,
  type GrowthTacticId,
} from "./contract";

export type RankedGrowthTactic = {
  tactic: GrowthTacticId;
  expectedValue: string;
  cost: string;
  risk: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: string;
  recommendedExperiment: string;
};

export function listGrowthTactics(): readonly GrowthTacticId[] {
  return GROWTH_TACTICS;
}

export function isRegisteredGrowthTactic(value: string): value is GrowthTacticId {
  return (GROWTH_TACTICS as readonly string[]).includes(value);
}

export function rankGrowthTactics(input: {
  productModel: string;
  timeToValue: "FAST" | "MEDIUM" | "SLOW" | "UNKNOWN";
  marginalFulfillmentCost: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  supportBurden: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  traffic: "NONE" | "SPARSE" | "PRESENT";
  competitiveNormsIncludeTrial: boolean;
  outreachAppropriate: boolean;
}): RankedGrowthTactic[] {
  const ranked: RankedGrowthTactic[] = [
    {
      tactic: "INTERACTIVE_PREVIEW",
      expectedValue: "Low-cost proof of value before payment",
      cost: input.marginalFulfillmentCost === "UNKNOWN" ? "UNKNOWN" : "LOW",
      risk: "LOW",
      confidence: input.timeToValue === "FAST" ? "HIGH" : "MEDIUM",
      evidence: "Time-to-value and fulfillment cost",
      recommendedExperiment: "Interactive sample versus direct purchase",
    },
    {
      tactic: input.timeToValue === "FAST" && input.marginalFulfillmentCost === "LOW" ? "FIRST_USE_FREE" : "DEMO",
      expectedValue: "First meaningful use without a universal free trial",
      cost: input.marginalFulfillmentCost === "UNKNOWN" ? "UNKNOWN" : input.marginalFulfillmentCost,
      risk: "MEDIUM",
      confidence: "MEDIUM",
      evidence: "Usage frequency and abuse risk remain UNKNOWN until tested",
      recommendedExperiment: "Usage-limited entry versus time-based trial",
    },
    {
      tactic: "OUTBOUND_EMAIL",
      expectedValue: "Decision-grade conversations when market is finite and searchable",
      cost: "UNKNOWN",
      risk: "MEDIUM",
      confidence: input.outreachAppropriate ? "MEDIUM" : "LOW",
      evidence: "Outreach is not universal; only where recipients can be qualified",
      recommendedExperiment: "10 qualified new prospects/business day for ~20 business days",
    },
    {
      tactic: "SEO",
      expectedValue: "Compounding discovery when search demand exists",
      cost: "UNKNOWN",
      risk: "LOW",
      confidence: input.traffic === "NONE" ? "LOW" : "MEDIUM",
      evidence: "Organic demand must be evidenced, not assumed",
      recommendedExperiment: "Offer-aligned organic pages, not URL count",
    },
  ];
  if (!input.outreachAppropriate) {
    return ranked.filter((row) => row.tactic !== "OUTBOUND_EMAIL");
  }
  return ranked;
}

export function growthTacticRegistryId(): typeof GROWTH_TACTIC_REGISTRY {
  return GROWTH_TACTIC_REGISTRY;
}

export function growthTacticContract(tactic: GrowthTacticId, enabled = true): GrowthTacticContract {
  return { contract: GROWTH_TACTIC_CONTRACT, tactic, providerNeutral: true, enabled };
}
