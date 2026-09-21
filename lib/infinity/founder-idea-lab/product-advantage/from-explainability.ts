import type { FounderExplainability } from "../explainability/types";
import { emptyMonetizationLayers } from "../monetization-levels";
import type { FounderResearchPacket } from "../research-packet";
import { buildProductAdvantage } from "./from-packet";
import type { FounderProductAdvantageView } from "./types";

function packetFromExplainability(explain: FounderExplainability): FounderResearchPacket {
  return {
    researchRunId: "persisted-explainability",
    candidateId: "persisted",
    submissionId: "persisted",
    grounded: explain.keyFindings.some((item) => item.grounded),
    failed: false,
    failureCode: null,
    summary: explain.executiveSummary,
    findings: explain.keyFindings.map((item) => ({
      findingId: item.findingId,
      dimension: item.dimension,
      claim: item.claim,
      polarity: "mixed",
      grounded: item.grounded,
      confidence: item.confidence,
      sourceUrls: item.sourceRefs,
      limitations: [],
      verifiesFounderCompetitor: null,
    })),
    sources: explain.sourceTrace.map((item) => ({
      url: item.sourceUrl,
      title: null,
      domain: null,
    })),
    competitorLeads: [],
    verifiedCompetitors: [],
    monetizationLayers: emptyMonetizationLayers(),
    requiresMoreResearch: false,
  };
}

export function activateProductAdvantage(explain: FounderExplainability): FounderProductAdvantageView | null {
  if (explain.productAdvantage) return explain.productAdvantage;
  if (!explain.keyFindings.length) return null;
  return buildProductAdvantage({
    packet: packetFromExplainability(explain),
    context: {
      proposedSolution: explain.executiveSummary,
      pricingHypothesis: null,
      businessModelHypothesis: explain.revenueModel?.recommended?.recommendedModel ?? null,
      targetCustomer: null,
    },
    willingnessToPay: null,
    economicUncertainty: explain.economics.willThisWork,
  });
}
