import {
  DEFAULT_SCORING_WEIGHTS,
  OPPORTUNITY_SCANNER_SCORING_VERSION,
} from "@/lib/infinity/opportunity-scanner/constants";
import type {
  NormalizedCandidateScores,
  ScoringAssessmentInput,
} from "@/lib/infinity/opportunity-scanner/types";
import type { EvidenceCoverage, EvidenceDimension, EvidencePolarity } from "./evidence-coverage";
import { monetizationPotentialFromLayers, type MonetizationEvidenceLayers } from "./monetization-levels";

export type ScoreProvenanceRow = {
  dimension: string;
  rawInput: number | null;
  normalizedInput: number | null;
  weight: number;
  weightedContribution: number | null;
  evidenceRefs: string[];
  confidence: number | null;
  evidenceState: EvidencePolarity;
};

const DIMENSION_TO_INPUT: Record<
  Exclude<EvidenceDimension, "pricing">,
  keyof ScoringAssessmentInput
> = {
  demand: "demandStrength",
  market: "marketGrowth",
  competition: "competitionWeakness",
  monetization: "monetizationPotential",
  distribution: "distributionStrength",
  buildability: "buildability",
  capital_efficiency: "capitalEfficiency",
  speed_to_revenue: "speedToRevenue",
};

function normalizeScore(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 10000) / 100;
}

function rawFromPolarity(polarity: EvidencePolarity, confidence: number | null): number | null {
  if (polarity === "unknown") return null;
  const c = confidence == null ? 0.5 : Math.max(0, Math.min(1, confidence));
  if (polarity === "positive") return Math.round((0.58 + 0.32 * c) * 100) / 100;
  if (polarity === "negative") return Math.round((0.32 * (1 - c) + 0.08) * 100) / 100;
  return 0.48;
}

export function scoreFromEvidenceCoverage(input: {
  coverage: EvidenceCoverage;
  monetizationLayers: MonetizationEvidenceLayers;
}): {
  scores: NormalizedCandidateScores | null;
  scoringInputs: Partial<ScoringAssessmentInput>;
  provenance: ScoreProvenanceRow[];
  usedSharedFallback: false;
} {
  const monetization = monetizationPotentialFromLayers(input.monetizationLayers);
  const raw: Partial<ScoringAssessmentInput> = {};
  const provenance: ScoreProvenanceRow[] = [];

  const knownWeights: Array<{ key: keyof ScoringAssessmentInput; weightKey: keyof typeof DEFAULT_SCORING_WEIGHTS; raw: number; refs: string[]; confidence: number | null; state: EvidencePolarity }> = [];

  for (const [dimension, inputKey] of Object.entries(DIMENSION_TO_INPUT) as Array<
    [Exclude<EvidenceDimension, "pricing">, keyof ScoringAssessmentInput]
  >) {
    const coverage = input.coverage.dimensions[dimension];
    let value =
      dimension === "monetization"
        ? monetization.raw
        : rawFromPolarity(coverage.polarity, coverage.confidence);
    let state: EvidencePolarity = dimension === "monetization" ? monetization.state : coverage.polarity;
    if (dimension === "buildability" || inputKey === "automationPotential") {
      if (coverage.polarity === "unknown") {
        value = null;
        state = "unknown";
      }
    }
    if (value != null) raw[inputKey] = value;
    const weightKey = weightKeyFor(inputKey);
    if (value != null && weightKey) {
      knownWeights.push({
        key: inputKey,
        weightKey,
        raw: value,
        refs: coverage.evidenceRefs,
        confidence: coverage.confidence,
        state,
      });
    } else {
      provenance.push({
        dimension: inputKey,
        rawInput: null,
        normalizedInput: null,
        weight: weightKey ? DEFAULT_SCORING_WEIGHTS[weightKey] : 0,
        weightedContribution: null,
        evidenceRefs: coverage.evidenceRefs,
        confidence: coverage.confidence,
        evidenceState: state,
      });
    }
  }

  const automationCoverage = input.coverage.dimensions.buildability;
  const automationRaw = rawFromPolarity(automationCoverage.polarity, automationCoverage.confidence);
  if (automationRaw != null) raw.automationPotential = automationRaw;
  if (automationRaw != null) {
    knownWeights.push({
      key: "automationPotential",
      weightKey: "automation_score",
      raw: automationRaw,
      refs: automationCoverage.evidenceRefs,
      confidence: automationCoverage.confidence,
      state: automationCoverage.polarity,
    });
  } else {
    provenance.push({
      dimension: "automationPotential",
      rawInput: null,
      normalizedInput: null,
      weight: DEFAULT_SCORING_WEIGHTS.automation_score,
      weightedContribution: null,
      evidenceRefs: automationCoverage.evidenceRefs,
      confidence: automationCoverage.confidence,
      evidenceState: "unknown",
    });
  }

  const confidenceValues = Object.values(input.coverage.dimensions)
    .map((item) => item.confidence)
    .filter((item): item is number => item != null);
  if (confidenceValues.length > 0) {
    raw.evidenceConfidence = confidenceValues.reduce((sum, item) => sum + item, 0) / confidenceValues.length;
  }
  if (raw.evidenceConfidence != null) {
    knownWeights.push({
      key: "evidenceConfidence",
      weightKey: "evidence_confidence_score",
      raw: raw.evidenceConfidence,
      refs: [],
      confidence: raw.evidenceConfidence,
      state: input.coverage.researched ? "mixed" : "unknown",
    });
  } else {
    provenance.push({
      dimension: "evidenceConfidence",
      rawInput: null,
      normalizedInput: null,
      weight: DEFAULT_SCORING_WEIGHTS.evidence_confidence_score,
      weightedContribution: null,
      evidenceRefs: [],
      confidence: null,
      evidenceState: "unknown",
    });
  }

  if (knownWeights.length === 0) {
    return { scores: null, scoringInputs: raw, provenance, usedSharedFallback: false };
  }

  const knownWeightSum = knownWeights.reduce((sum, item) => sum + DEFAULT_SCORING_WEIGHTS[item.weightKey], 0);
  const weightedBreakdown: Record<string, number> = {};
  let opportunity = 0;
  const completeInputs: ScoringAssessmentInput = {
    demandStrength: raw.demandStrength ?? 0,
    marketGrowth: raw.marketGrowth ?? 0,
    competitionWeakness: raw.competitionWeakness ?? 0,
    monetizationPotential: raw.monetizationPotential ?? 0,
    buildability: raw.buildability ?? 0,
    automationPotential: raw.automationPotential ?? 0,
    distributionStrength: raw.distributionStrength ?? 0,
    capitalEfficiency: raw.capitalEfficiency ?? 0,
    speedToRevenue: raw.speedToRevenue ?? 0,
    evidenceConfidence: raw.evidenceConfidence ?? 0,
  };

  for (const item of knownWeights) {
    const originalWeight = DEFAULT_SCORING_WEIGHTS[item.weightKey];
    const renormalized = knownWeightSum > 0 ? originalWeight / knownWeightSum : 0;
    const normalized = normalizeScore(item.raw);
    const contribution = normalized * renormalized;
    weightedBreakdown[item.weightKey] = contribution;
    opportunity += contribution;
    completeInputs[item.key] = item.raw;
    provenance.push({
      dimension: item.key,
      rawInput: item.raw,
      normalizedInput: normalized,
      weight: renormalized,
      weightedContribution: Math.round(contribution * 100) / 100,
      evidenceRefs: item.refs,
      confidence: item.confidence,
      evidenceState: item.state,
    });
  }

  const scores: NormalizedCandidateScores = {
    scoringVersion: `${OPPORTUNITY_SCANNER_SCORING_VERSION}+founder_evidence`,
    demandScore: raw.demandStrength != null ? normalizeScore(raw.demandStrength) : 0,
    marketGrowthScore: raw.marketGrowth != null ? normalizeScore(raw.marketGrowth) : 0,
    competitionOpportunityScore: raw.competitionWeakness != null ? normalizeScore(raw.competitionWeakness) : 0,
    monetizationPotentialScore: raw.monetizationPotential != null ? normalizeScore(raw.monetizationPotential) : 0,
    buildabilityScore: raw.buildability != null ? normalizeScore(raw.buildability) : 0,
    automationScore: raw.automationPotential != null ? normalizeScore(raw.automationPotential) : 0,
    distributionScore: raw.distributionStrength != null ? normalizeScore(raw.distributionStrength) : 0,
    capitalEfficiencyScore: raw.capitalEfficiency != null ? normalizeScore(raw.capitalEfficiency) : 0,
    speedToRevenueScore: raw.speedToRevenue != null ? normalizeScore(raw.speedToRevenue) : 0,
    evidenceConfidenceScore: raw.evidenceConfidence != null ? normalizeScore(raw.evidenceConfidence) : 0,
    opportunityScore: Math.round(opportunity * 100) / 100,
    weightedBreakdown,
    scoringInputs: completeInputs,
  };

  return { scores, scoringInputs: raw, provenance, usedSharedFallback: false };
}

function weightKeyFor(inputKey: keyof ScoringAssessmentInput): keyof typeof DEFAULT_SCORING_WEIGHTS | null {
  switch (inputKey) {
    case "demandStrength":
      return "demand_score";
    case "marketGrowth":
      return "market_growth_score";
    case "competitionWeakness":
      return "competition_opportunity_score";
    case "monetizationPotential":
      return "monetization_potential_score";
    case "buildability":
      return "buildability_score";
    case "automationPotential":
      return "automation_score";
    case "distributionStrength":
      return "distribution_score";
    case "capitalEfficiency":
      return "capital_efficiency_score";
    case "speedToRevenue":
      return "speed_to_revenue_score";
    case "evidenceConfidence":
      return "evidence_confidence_score";
    default:
      return null;
  }
}

export function recommendScoreDisplay(input: {
  opportunityScore: number | null;
  evidenceConfidence: number | null;
  unknownCount: number;
}): string {
  if (input.opportunityScore == null) return "UNKNOWN";
  if (input.unknownCount > 4 || (input.evidenceConfidence != null && input.evidenceConfidence < 0.4)) {
    return `${Math.round(input.opportunityScore)} (low confidence)`;
  }
  return String(Math.round(input.opportunityScore));
}
