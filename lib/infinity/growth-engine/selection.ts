import {
  GROWTH_TACTIC_SELECTION_ENGINE,
  type GrowthTacticId,
} from "./contract";

export type GrowthTacticScore = {
  rank: number;
  tactic: GrowthTacticId;
  score: number;
  expectedValue: string;
  evidence: string;
  cost: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  timeToEvidence: "FAST" | "MEDIUM" | "SLOW";
  implementationReadiness: "READY" | "PARTIAL" | "BLOCKED";
};

export type GrowthTacticSelectionInput = {
  publiclyLaunched: boolean;
  checkoutWorks: boolean;
  fulfillmentWorks: boolean;
  traffic: "NONE" | "SPARSE" | "PRESENT";
  timeToValue: "FAST" | "MEDIUM" | "SLOW" | "UNKNOWN";
  marginalFulfillmentCost: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  outreachAppropriate: boolean;
  searchableFiniteMarket: boolean;
  organicDemandEvidenced: boolean;
  interactivePreviewAlreadyLive: boolean;
  trialAuthorized: boolean;
  communicationPathVerified: boolean;
};

function scoreRow(
  tactic: GrowthTacticId,
  points: number,
  extras: Omit<GrowthTacticScore, "rank" | "tactic" | "score">,
): Omit<GrowthTacticScore, "rank"> {
  return { tactic, score: points, ...extras };
}

export function selectGrowthTactics(input: GrowthTacticSelectionInput): GrowthTacticScore[] {
  const rows: Array<Omit<GrowthTacticScore, "rank">> = [
    scoreRow("OUTBOUND_EMAIL", 0, {
      expectedValue: "Qualified CRE conversations and pricing/usefulness evidence",
      evidence: "Finite searchable tenant-rep market; live checkout can convert a qualified reply",
      cost: "UNKNOWN mailbox/labor; not treated as zero",
      risk: "MEDIUM",
      confidence: input.outreachAppropriate && input.searchableFiniteMarket ? "MEDIUM" : "LOW",
      timeToEvidence: "FAST",
      implementationReadiness: input.communicationPathVerified ? "READY" : "PARTIAL",
    }),
    scoreRow("INTERACTIVE_PREVIEW", 0, {
      expectedValue: "Low-friction first comparison for people already on the product",
      evidence: input.interactivePreviewAlreadyLive
        ? "The live OccupancyNPV comparison is already the preview; it does not source new operators"
        : "Preview still needs to be built",
      cost: "LOW",
      risk: "LOW",
      confidence: "HIGH",
      timeToEvidence: input.traffic === "PRESENT" ? "MEDIUM" : "SLOW",
      implementationReadiness: input.interactivePreviewAlreadyLive ? "READY" : "PARTIAL",
    }),
    scoreRow("FIRST_USE_FREE", 0, {
      expectedValue: "First comparison free as an entry experiment, not a price change",
      evidence: "Fast TTV and low marginal fulfillment make a usage-limited entry testable later",
      cost: input.marginalFulfillmentCost === "UNKNOWN" ? "UNKNOWN" : input.marginalFulfillmentCost,
      risk: "MEDIUM",
      confidence: "MEDIUM",
      timeToEvidence: "MEDIUM",
      implementationReadiness: input.trialAuthorized ? "READY" : "BLOCKED",
    }),
    scoreRow("FREE_TRIAL", 0, {
      expectedValue: "Professional time-based trial if suitability and activation gates pass",
      evidence: "Competitive trial norms exist; abuse/support cost remain UNKNOWN",
      cost: "UNKNOWN",
      risk: "MEDIUM",
      confidence: "LOW",
      timeToEvidence: "MEDIUM",
      implementationReadiness: input.trialAuthorized ? "PARTIAL" : "BLOCKED",
    }),
    scoreRow("SEO", 0, {
      expectedValue: "Compounding discovery if search demand is evidenced",
      evidence: input.organicDemandEvidenced ? "Organic demand evidenced" : "Organic demand is not evidenced; do not wait passively",
      cost: "UNKNOWN",
      risk: "LOW",
      confidence: input.organicDemandEvidenced ? "MEDIUM" : "LOW",
      timeToEvidence: "SLOW",
      implementationReadiness: "PARTIAL",
    }),
    scoreRow("ORGANIC_CONTENT", 0, {
      expectedValue: "Offer-aligned pages, not URL count",
      evidence: "Secondary to a live outbound evidence loop",
      cost: "UNKNOWN",
      risk: "LOW",
      confidence: "LOW",
      timeToEvidence: "SLOW",
      implementationReadiness: "PARTIAL",
    }),
    scoreRow("DEMO", 0, {
      expectedValue: "Direct purchase remains available at live prices",
      evidence: "Checkout already works; waiting for inbound buyers is passive",
      cost: "LOW",
      risk: "LOW",
      confidence: "HIGH",
      timeToEvidence: "SLOW",
      implementationReadiness: input.checkoutWorks && input.fulfillmentWorks ? "READY" : "BLOCKED",
    }),
  ];

  for (const row of rows) {
    if (row.tactic === "OUTBOUND_EMAIL") {
      if (input.publiclyLaunched) row.score += 18;
      if (input.checkoutWorks) row.score += 12;
      if (input.outreachAppropriate) row.score += 14;
      if (input.searchableFiniteMarket) row.score += 12;
      if (input.traffic !== "PRESENT") row.score += 10;
      if (input.communicationPathVerified) row.score += 8;
      if (!input.outreachAppropriate) row.score = -100;
    }
    if (row.tactic === "INTERACTIVE_PREVIEW") {
      row.score += input.interactivePreviewAlreadyLive ? 16 : 8;
      if (input.traffic === "PRESENT") row.score += 12;
      if (input.traffic === "SPARSE") row.score += 4;
    }
    if (row.tactic === "FIRST_USE_FREE") {
      if (input.timeToValue === "FAST") row.score += 10;
      if (input.marginalFulfillmentCost === "LOW") row.score += 8;
      if (!input.trialAuthorized) row.score -= 20;
    }
    if (row.tactic === "FREE_TRIAL") {
      if (input.timeToValue === "FAST") row.score += 6;
      if (!input.trialAuthorized) row.score -= 24;
    }
    if (row.tactic === "SEO" || row.tactic === "ORGANIC_CONTENT") {
      row.score += input.organicDemandEvidenced ? 14 : 3;
    }
    if (row.tactic === "DEMO") {
      row.score += input.checkoutWorks ? 8 : 0;
    }
  }

  return rows
    .sort((a, b) => b.score - a.score)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function selectFirstGrowthTactic(input: GrowthTacticSelectionInput): GrowthTacticScore {
  const ranked = selectGrowthTactics(input);
  const first = ranked[0];
  if (!first) {
    throw new Error(`${GROWTH_TACTIC_SELECTION_ENGINE}: no eligible tactic`);
  }
  return first;
}

export function growthTacticSelectionEngineId(): typeof GROWTH_TACTIC_SELECTION_ENGINE {
  return GROWTH_TACTIC_SELECTION_ENGINE;
}
