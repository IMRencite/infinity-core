import type { PlanningBand } from "../constants";
import type {
  DigitalRealEstateExpansionAssessment,
  DigitalRealEstateExpansionScore,
  PageOpportunity,
} from "../types";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function assessDigitalRealEstateExpansion(
  opportunities: PageOpportunity[],
  assessmentInput: Partial<DigitalRealEstateExpansionAssessment> = {},
): DigitalRealEstateExpansionScore {
  const uniqueIntents = new Set(opportunities.map((o) => `${o.primaryIntent}:${o.proposedTopic}`)).size;
  const entityCount = new Set(opportunities.map((o) => o.primaryEntity)).size;
  const geoDimensions = new Set(
    opportunities
      .filter((o) => o.geographicContext)
      .map((o) => `${o.geographicContext?.city ?? ""}:${o.geographicContext?.neighborhood ?? ""}`),
  ).size;

  const assessment: DigitalRealEstateExpansionAssessment = {
    addressableUniqueIntents: assessmentInput.addressableUniqueIntents ?? uniqueIntents,
    entityCount: assessmentInput.entityCount ?? entityCount,
    topicDepth: assessmentInput.topicDepth ?? clamp01(opportunities.filter((o) => o.pageType === "guide" || o.authorityRelationship.includes("hub")).length / 20),
    questionDepth: assessmentInput.questionDepth ?? clamp01(opportunities.filter((o) => o.pageType === "question").length / 30),
    geographicDimensions: assessmentInput.geographicDimensions ?? geoDimensions,
    productServiceDimensions: assessmentInput.productServiceDimensions ?? clamp01(opportunities.filter((o) => /product|service|category/.test(o.pageType)).length / 40),
    comparisonDimensions: assessmentInput.comparisonDimensions ?? clamp01(opportunities.filter((o) => o.pageType === "comparison").length / 15),
    programmaticFeasibility: assessmentInput.programmaticFeasibility ?? clamp01(opportunities.filter((o) => o.programmaticPotential > 0.5).length / opportunities.length),
    contentUniqueness: assessmentInput.contentUniqueness ?? average(opportunities.map((o) => o.uniquenessPotential)),
    conversionValue: assessmentInput.conversionValue ?? average(opportunities.map((o) => o.estimatedRevenueContribution)) / 1000,
    customerLifetimeValue: assessmentInput.customerLifetimeValue ?? 1,
    authorityCompounding: assessmentInput.authorityCompounding ?? clamp01(opportunities.filter((o) => o.authorityRelationship.includes("hub")).length / 10),
    internalLinkCompounding: assessmentInput.internalLinkCompounding ?? clamp01(opportunities.length / 100),
    aiAnswerOpportunity: assessmentInput.aiAnswerOpportunity ?? average(opportunities.map((o) => o.aiAnswerDemandSignal.level)),
    citationOpportunity: assessmentInput.citationOpportunity ?? average(opportunities.map((o) => o.citationPotential)),
    maintenanceCost: assessmentInput.maintenanceCost ?? clamp01(average(opportunities.map((o) => o.estimatedMaintenanceCost)) / 100),
    productionCost: assessmentInput.productionCost ?? clamp01(average(opportunities.map((o) => o.estimatedProductionCost)) / 500),
    researchCost: assessmentInput.researchCost ?? clamp01(average(opportunities.map((o) => o.estimatedResearchCost)) / 250),
    indexingConstraints: assessmentInput.indexingConstraints ?? 0.3,
    expectedMarginalPageValue: assessmentInput.expectedMarginalPageValue ?? average(opportunities.map((o) => o.estimatedRevenueContribution - o.estimatedProductionCost - o.estimatedResearchCost)) / 500,
  };

  const positive =
    clamp01(assessment.addressableUniqueIntents / 200) * 0.15 +
    clamp01(assessment.entityCount / 100) * 0.1 +
    assessment.topicDepth * 0.08 +
    assessment.questionDepth * 0.08 +
    clamp01(assessment.geographicDimensions / 50) * 0.08 +
    assessment.contentUniqueness * 0.12 +
    clamp01(assessment.conversionValue) * 0.12 +
    assessment.authorityCompounding * 0.1 +
    assessment.aiAnswerOpportunity * 0.08 +
    assessment.citationOpportunity * 0.09;

  const negative =
    assessment.maintenanceCost * 0.08 +
    assessment.productionCost * 0.08 +
    assessment.researchCost * 0.06 +
    assessment.indexingConstraints * 0.05 +
    (assessment.expectedMarginalPageValue < 0 ? 0.15 : 0);

  const score = Math.round(Math.max(0, Math.min(100, (positive - negative) * 100)));

  const planningBand = resolvePlanningBand(score, opportunities.length);
  return {
    score,
    planningBand,
    initialArchitectureRecommendation: describeInitialBand(planningBand),
    longTermExpansionPotential: describeLongTerm(score, assessment),
    assessment,
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function resolvePlanningBand(score: number, candidateCount: number): PlanningBand {
  if (score < 25 || candidateCount < 15) return "Compact";
  if (score < 45 || candidateCount < 40) return "Standard";
  if (score < 65 || candidateCount < 120) return "Authority";
  if (score < 82 || candidateCount < 400) return "Large Authority";
  return "Massive Digital Real Estate";
}

function describeInitialBand(band: PlanningBand): string {
  switch (band) {
    case "Compact":
      return "Initial wave: 10–30 high-value pages focused on core hubs and commercial intent";
    case "Standard":
      return "Initial wave: 30–100 pages with hub-and-spoke authority structure";
    case "Authority":
      return "Initial wave: 100–300 pages with question-led and entity clusters";
    case "Large Authority":
      return "Initial wave: up to 300 quality-approved pages; staged expansion thereafter";
    default:
      return "Large-scale expansion only for pages passing all quality/economic gates";
  }
}

function describeLongTerm(score: number, assessment: DigitalRealEstateExpansionAssessment): string {
  if (score < 30) return "Limited long-term expansion expected";
  if (assessment.expectedMarginalPageValue < 0) return "Expand only while marginal page value remains positive";
  if (score > 75) return "Long-term digital real estate expansion justified if quality invariants hold per page";
  return "Moderate staged expansion after foundation and validation waves perform";
}

export function assignExpansionWave(
  opportunity: PageOpportunity,
  decision: string,
): "FOUNDATION" | "VALIDATION" | "EXPANSION" | "SCALE" {
  if (decision !== "CREATE") return "EXPANSION";
  if (opportunity.pageType === "homepage" || opportunity.authorityRelationship.includes("hub")) return "FOUNDATION";
  if (/commercial|transactional|product|service|category/.test(opportunity.pageType)) return "FOUNDATION";
  if (opportunity.pageType === "question" || opportunity.pageType === "comparison" || opportunity.pageType === "city") {
    return "VALIDATION";
  }
  if (opportunity.programmaticPotential > 0.7) return "SCALE";
  return "EXPANSION";
}
