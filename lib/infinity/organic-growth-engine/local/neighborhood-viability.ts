import { DEFAULT_QUALITY_THRESHOLDS } from "../constants";
import type { NeighborhoodDecision, PageDecision } from "../constants";
import type {
  NeighborhoodInformationGainPlan,
  NeighborhoodPageViability,
  PageDecisionRecord,
  PageOpportunity,
} from "../types";

export function evaluateNeighborhoodViability(opportunity: PageOpportunity): NeighborhoodPageViability {
  const neighborhood = opportunity.geographicContext?.neighborhood ?? opportunity.primaryEntity;
  const city = opportunity.geographicContext?.city ?? "unknown";
  const meta = (opportunity as PageOpportunity & { metadata?: Record<string, unknown> }).metadata ?? {};

  const signals = {
    searchIntent: Number(meta.neighborhoodSearchIntent ?? opportunity.searchDemandSignal.level),
    serviceRelevance: Number(meta.serviceRelevance ?? 0.55),
    commercialRelevance: Number(meta.commercialRelevance ?? opportunity.estimatedConversionPotential * 10),
    localEntityDensity: Number(meta.localEntityDensity ?? 0.4),
    geographicDistinctness: Number(meta.geographicDistinctness ?? opportunity.uniquenessPotential),
    evidenceAvailability: opportunity.evidenceAvailability,
    contentUniqueness: opportunity.uniquenessPotential,
    conversionValue: Math.min(1, opportunity.estimatedRevenueContribution / 500),
  };

  const score = Math.round(
    (signals.searchIntent * 15 +
      signals.serviceRelevance * 15 +
      signals.commercialRelevance * 15 +
      signals.localEntityDensity * 10 +
      signals.geographicDistinctness * 20 +
      signals.evidenceAvailability * 15 +
      signals.contentUniqueness * 15 +
      signals.conversionValue * 10) *
      100,
  ) / 100;

  let decision: NeighborhoodDecision = "CREATE";
  const reasons: string[] = [];

  if (score < 35) {
    decision = "REJECT";
    reasons.push("Neighborhood page does not justify independent URL");
  } else if (score < DEFAULT_QUALITY_THRESHOLDS.minNeighborhoodViability) {
    decision = "MERGE_INTO_CITY_PAGE";
    reasons.push("Insufficient neighborhood differentiation — merge into city hub");
  } else if (signals.evidenceAvailability < 0.35) {
    decision = "DEFER";
    reasons.push("Await verified local evidence");
  } else if (signals.geographicDistinctness < 0.45 && signals.contentUniqueness < 0.45) {
    decision = "SUPPORTING_SECTION";
    reasons.push("Use on-page neighborhood section instead of standalone URL");
  } else {
    const verifiedEvidence = Array.isArray(meta.verifiedEvidence) ? meta.verifiedEvidence : [];
    const localCharacteristics = Array.isArray(meta.localCharacteristics) ? meta.localCharacteristics : [];
    if (verifiedEvidence.length === 0 || localCharacteristics.length === 0) {
      decision = "DEFER";
      reasons.push("Neighborhood CREATE requires verified local evidence and structured information gain");
    } else {
      reasons.push("Neighborhood page independently justified");
    }
  }

  return { pageOpportunityId: opportunity.pageOpportunityId, neighborhood, city, score, decision, reasons };
}

export function buildNeighborhoodInformationGainPlan(
  opportunity: PageOpportunity,
  viability: NeighborhoodPageViability,
): NeighborhoodInformationGainPlan {
  const localInformationGain: string[] = [];
  const verifiedLocalEvidence: string[] = [];
  const localEntities: string[] = [];

  const meta = opportunity as PageOpportunity & {
    metadata?: {
      localEntities?: string[];
      verifiedEvidence?: string[];
      localCharacteristics?: string[];
    };
  };

  if (Array.isArray(meta.metadata?.localCharacteristics)) {
    localInformationGain.push(...meta.metadata.localCharacteristics);
  }
  if (Array.isArray(meta.metadata?.localEntities)) {
    localEntities.push(...meta.metadata.localEntities);
    localInformationGain.push(...meta.metadata.localEntities.map((e) => `Local entity: ${e}`));
  }
  if (Array.isArray(meta.metadata?.verifiedEvidence)) {
    verifiedLocalEvidence.push(...meta.metadata.verifiedEvidence);
  }

  if (localInformationGain.length === 0 && viability.decision === "CREATE") {
    // No placeholder text — CREATE requires verified structured gain
  }

  const meaningfulGainEstablished =
    viability.decision === "CREATE" &&
    localInformationGain.length > 0 &&
    verifiedLocalEvidence.length > 0 &&
    opportunity.evidenceAvailability >= 0.45;

  return {
    pageOpportunityId: opportunity.pageOpportunityId,
    neighborhood: viability.neighborhood,
    city: viability.city,
    localInformationGain,
    verifiedLocalEvidence,
    localEntities,
    meaningfulGainEstablished,
  };
}

export function applyNeighborhoodDecisions(
  decisions: PageDecisionRecord[],
  neighborhoodResults: NeighborhoodPageViability[],
): PageDecisionRecord[] {
  const neighborhoodMap = new Map(neighborhoodResults.map((n) => [n.pageOpportunityId, n]));
  return decisions.map((d) => {
    const n = neighborhoodMap.get(d.pageOpportunityId);
    if (!n) return { ...d, reason: d.reason || "Not a neighborhood page" };
    if (n.decision === "CREATE") return d;
    const mappedDecision: PageDecision =
      n.decision === "MERGE_INTO_CITY_PAGE"
        ? "MERGE"
        : n.decision === "REJECT"
          ? "REJECT"
          : n.decision === "SUPPORTING_SECTION"
            ? "SUPPORTING_ONLY"
            : n.decision === "DEFER"
              ? "DEFER"
              : d.decision;
    return {
      pageOpportunityId: d.pageOpportunityId,
      decision: mappedDecision,
      reason: n.reasons.join("; "),
      neighborhoodDecision: n.decision,
    };
  });
}
