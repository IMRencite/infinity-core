import {
  DEFAULT_AUTONOMOUS_COST_CEILING_USD,
  DEFAULT_MAX_SELECTIONS_PER_CYCLE,
  DEFAULT_MIN_CONFIDENCE,
  DEFAULT_MIN_EVIDENCE_QUALITY,
  DEFAULT_REJECTION_THRESHOLD,
  DEFAULT_SELECTION_THRESHOLD,
  DIMENSION_WEIGHTS,
  SCORE_DIMENSIONS,
  type ExecutiveScoreDimension,
} from "./constants";
import { readExecutiveProfile } from "./eligibility";
import type {
  EligibleOpportunityRow,
  ExecutiveScoreDimensionResult,
  OpportunityExecutiveScore,
} from "./types";

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function normalizeOptionalScore(value: number | null | undefined, fallback = 0.5): number {
  if (value == null) return fallback;
  return clamp01(Number(value) / 100);
}

function profileAdjustments(profile: string | null): Partial<Record<ExecutiveScoreDimension, number>> {
  switch (profile) {
    case "strong_in_policy":
      return {
        confidence: 0.22,
        evidence_quality: 0.18,
        demand: 0.12,
        revenue_potential: 0.12,
        strategic_fit: 0.1,
      };
    case "low_confidence":
      return { confidence: -0.25, evidence_quality: -0.15 };
    case "low_value":
      return { revenue_potential: -0.3, demand: -0.25, capital_efficiency: -0.2 };
    case "resource_constrained":
      return { startup_cost: -0.2, operating_cost: -0.15 };
    case "mandatory_escalation":
      return { risk: -0.05 };
    default:
      return {};
  }
}

export function scoreOpportunityDeterministic(opp: EligibleOpportunityRow): OpportunityExecutiveScore {
  const profile = readExecutiveProfile(opp);
  const adjustments = profileAdjustments(profile);

  const baseConfidence = normalizeOptionalScore(opp.confidence_score, 0.5);
  const baseOverall = normalizeOptionalScore(opp.overall_score, 0.5);

  const dimensions: ExecutiveScoreDimensionResult[] = SCORE_DIMENSIONS.map((dimension) => {
    let normalized = baseOverall;
    if (dimension === "confidence") normalized = baseConfidence;
    if (dimension === "evidence_quality") normalized = clamp01(baseConfidence * 0.9 + 0.05);
    if (dimension === "startup_cost" || dimension === "operating_cost") {
      const max = opp.estimated_startup_cost_max ?? 0;
      normalized = clamp01(1 - Math.min(max / DEFAULT_AUTONOMOUS_COST_CEILING_USD, 1));
    }
    if (dimension === "risk") {
      const riskCount = Array.isArray(opp.risks) ? opp.risks.length : 0;
      normalized = clamp01(1 - riskCount * 0.08);
    }

    const adj = adjustments[dimension] ?? 0;
    normalized = clamp01(normalized + adj);

    const weight = DIMENSION_WEIGHTS[dimension];
    const weightedScore = normalized * weight;
    const penalties: string[] = [];
    const blockers: string[] = [];
    const missingInformation: string[] = [];

    if (opp.overall_score == null) {
      missingInformation.push("overall_score_missing");
    }

    if (profile === "low_confidence" && dimension === "confidence") {
      penalties.push("profile_low_confidence");
    }

    return {
      dimension,
      normalizedScore: normalized,
      weight,
      weightedScore,
      sourceReferences: [`opportunity:${opp.id}`, `profile:${profile ?? "default"}`],
      confidence: baseConfidence,
      missingInformation,
      penalties,
      blockers,
    };
  });

  const weightSum = dimensions.reduce((sum, d) => sum + d.weight, 0);
  const aggregateScore =
    weightSum > 0 ? dimensions.reduce((sum, d) => sum + d.weightedScore, 0) / weightSum : 0;

  return {
    opportunityId: opp.id,
    dimensions,
    aggregateScore: clamp01(aggregateScore),
    aggregateConfidence: baseConfidence,
  };
}

export function scoreEligibleSet(opportunities: EligibleOpportunityRow[]): OpportunityExecutiveScore[] {
  return opportunities.map(scoreOpportunityDeterministic);
}

export function reproduceAggregateScore(dimensions: ExecutiveScoreDimensionResult[]): number {
  const weightSum = dimensions.reduce((sum, d) => sum + d.weight, 0);
  if (weightSum <= 0) return 0;
  return dimensions.reduce((sum, d) => sum + d.weightedScore, 0) / weightSum;
}

export type SelectionThresholds = {
  selection: number;
  rejection: number;
  minConfidence: number;
  minEvidenceQuality: number;
  maxSelections: number;
  autonomousCostCeilingUsd: number;
};

export function defaultSelectionThresholds(): SelectionThresholds {
  return {
    selection: DEFAULT_SELECTION_THRESHOLD,
    rejection: DEFAULT_REJECTION_THRESHOLD,
    minConfidence: DEFAULT_MIN_CONFIDENCE,
    minEvidenceQuality: DEFAULT_MIN_EVIDENCE_QUALITY,
    maxSelections: DEFAULT_MAX_SELECTIONS_PER_CYCLE,
    autonomousCostCeilingUsd: DEFAULT_AUTONOMOUS_COST_CEILING_USD,
  };
}

export { DEFAULT_SELECTION_THRESHOLD, DEFAULT_REJECTION_THRESHOLD };
