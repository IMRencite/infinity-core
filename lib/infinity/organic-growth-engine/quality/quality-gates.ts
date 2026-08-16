import { DEFAULT_QUALITY_THRESHOLDS } from "../constants";
import type {
  CitationWorthinessScore,
  PageOpportunity,
  ThinContentRiskAssessment,
} from "../types";

export function assessThinContentRisk(opportunity: PageOpportunity): ThinContentRiskAssessment {
  const factors = {
    uniqueness: 1 - opportunity.uniquenessPotential,
    evidence: 1 - opportunity.evidenceAvailability,
    depth: 1 - opportunity.contentDepthPotential,
    programmatic: opportunity.programmaticPotential > 0.7 ? 0.4 : 0,
    cannibalization: opportunity.cannibalizationRisk,
    geoThin:
      opportunity.pageType === "neighborhood" && opportunity.uniquenessPotential < 0.45 ? 0.5 : 0,
  };

  const thinContentRiskScore = Math.round(
    (factors.uniqueness * 30 +
      factors.evidence * 20 +
      factors.depth * 20 +
      factors.programmatic * 15 +
      factors.cannibalization * 10 +
      factors.geoThin * 15) *
      100,
  ) / 100;

  const standalonePageValueScore = Math.round(
    (opportunity.uniquenessPotential * 25 +
      opportunity.contentDepthPotential * 20 +
      opportunity.evidenceAvailability * 15 +
      opportunity.citationPotential * 15 +
      opportunity.estimatedRevenueContribution / 100 +
      opportunity.crawlValue * 10) *
      100,
  ) / 100;

  let decision: ThinContentRiskAssessment["decision"] = "PASS";
  const reasons: string[] = [];

  if (thinContentRiskScore > DEFAULT_QUALITY_THRESHOLDS.maxThinContentRisk) {
    decision = opportunity.pageType === "neighborhood" ? "MERGE" : "REJECT";
    reasons.push(`Thin content risk ${thinContentRiskScore} exceeds threshold`);
  } else if (
    standalonePageValueScore < DEFAULT_QUALITY_THRESHOLDS.minStandalonePageValue &&
    opportunity.crawlValue >= 0.45 &&
    opportunity.pageType !== "neighborhood" &&
    thinContentRiskScore <= DEFAULT_QUALITY_THRESHOLDS.maxThinContentRisk * 0.85
  ) {
    decision = "NOINDEX";
    reasons.push(`Standalone page value ${standalonePageValueScore} below minimum — index suppressed`);
  } else if (standalonePageValueScore < DEFAULT_QUALITY_THRESHOLDS.minStandalonePageValue) {
    decision = "EXPAND";
    reasons.push(`Standalone page value ${standalonePageValueScore} below minimum`);
  }

  if (opportunity.programmaticPotential > 0.8 && opportunity.uniquenessPotential < 0.35) {
    decision = "REJECT";
    reasons.push("Programmatic template lacks meaningful unique value");
  }

  return {
    pageOpportunityId: opportunity.pageOpportunityId,
    thinContentRiskScore,
    standalonePageValueScore,
    decision,
    reasons,
  };
}

export function calculateCitationWorthiness(opportunity: PageOpportunity): CitationWorthinessScore {
  const factors = {
    answerClarity: opportunity.pageType === "question" ? 0.85 : 0.55,
    factualPrecision: opportunity.evidenceAvailability,
    topicCompleteness: opportunity.contentDepthPotential,
    sourceQuality: opportunity.evidenceAvailability * 0.9,
    originalInformationGain: opportunity.uniquenessPotential,
    entityClarity: opportunity.confidence,
    structuredExtraction: opportunity.aiAnswerDemandSignal.level,
    specificity: opportunity.uniquenessPotential,
  };

  const score = Math.round(
    Object.values(factors).reduce((sum, v) => sum + v, 0) / Object.keys(factors).length * 100,
  );

  return {
    pageOpportunityId: opportunity.pageOpportunityId,
    score,
    factors,
    definitiveResourceCandidate:
      score >= 70 &&
      (opportunity.authorityRelationship.includes("hub") || opportunity.citationPotential > 0.65),
  };
}

export function passesPreGenerationGate(input: {
  thin: ThinContentRiskAssessment;
  citation: CitationWorthinessScore;
  completenessScore: number;
  informationGainEstablished: boolean;
  evidenceSatisfiable: boolean;
}): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.thin.decision === "REJECT" || input.thin.decision === "NOINDEX") {
    reasons.push(`Thin content gate failed: ${input.thin.reasons.join("; ")}`);
  }
  if (!input.informationGainEstablished && input.thin.standalonePageValueScore < DEFAULT_QUALITY_THRESHOLDS.minStandalonePageValue) {
    reasons.push("Information gain not established");
  }
  if (!input.evidenceSatisfiable && input.thin.thinContentRiskScore > 25) {
    reasons.push("Evidence requirements not satisfiable");
  }
  if (input.completenessScore < DEFAULT_QUALITY_THRESHOLDS.minContentCompleteness && input.thin.standalonePageValueScore < 50) {
    reasons.push("Content completeness below threshold");
  }
  if (input.citation.score < DEFAULT_QUALITY_THRESHOLDS.minCitationWorthiness && input.citation.definitiveResourceCandidate) {
    reasons.push("Citation worthiness below threshold for definitive resource");
  }
  return { pass: reasons.length === 0, reasons };
}
