import type { Tables } from "@/lib/supabase/database.types";
import type {
  DecisionModel,
  DimensionScore,
  EvaluationDimensionScores,
} from "./types";

type Opportunity = Tables<"opportunities">;
type OpportunityScore = Tables<"opportunity_scores">;
type OpportunityEvidence = Tables<"opportunity_evidence">;
type DiscoverySignal = Tables<"discovery_signals">;
type OpportunityReview = Tables<"opportunity_reviews">;

export type ScoringContext = {
  opportunity: Opportunity;
  latestScore: OpportunityScore | null;
  evidence: OpportunityEvidence[];
  signals: DiscoverySignal[];
  reviews: OpportunityReview[];
};

function readJsonFlag(value: unknown, key: string): boolean {
  if (typeof value === "object" && value !== null && !Array.isArray(value) && key in value) {
    return Boolean((value as Record<string, unknown>)[key]);
  }

  return false;
}

function knownScore(value: number | null | undefined, source: string): DimensionScore {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return { score: null, status: "unknown", source };
  }

  return {
    score: Math.max(0, Math.min(100, Number(value))),
    status: "known",
    source,
  };
}

function invertCompetitionScore(raw: number | null | undefined): DimensionScore {
  if (raw === null || raw === undefined) {
    return { score: null, status: "unknown", source: "opportunity_scores.competition_score" };
  }

  return {
    score: Math.max(0, Math.min(100, 100 - Number(raw))),
    status: "known",
    source: "opportunity_scores.competition_score",
    transform: "100 - competition_score (lower competition => higher attractiveness)",
  };
}

function invertStartupCostScore(raw: number | null | undefined): DimensionScore {
  if (raw === null || raw === undefined) {
    return {
      score: null,
      status: "unknown",
      source: "opportunity_scores.startup_cost_score",
    };
  }

  return {
    score: Math.max(0, Math.min(100, Number(raw))),
    status: "known",
    source: "opportunity_scores.startup_cost_score",
    transform: "startup_cost_score already represents cost efficiency (higher is better)",
  };
}

function regulatoryRiskFromEvidence(evidence: OpportunityEvidence[]): DimensionScore {
  const regulationEvidence = evidence.filter((item) => item.evidence_type === "regulation");
  if (regulationEvidence.length === 0) {
    return { score: null, status: "unknown", source: "opportunity_evidence.regulation" };
  }

  const avgRelevance =
    regulationEvidence.reduce(
      (sum, item) => sum + Number(item.relevance_score ?? 50),
      0,
    ) / regulationEvidence.length;

  return {
    score: Math.max(0, Math.min(100, 100 - avgRelevance)),
    status: "known",
    source: "opportunity_evidence.regulation",
    transform: "100 - average regulation evidence relevance (lower risk => higher score)",
  };
}

export function calculateDeterministicDimensionScores(
  _model: DecisionModel,
  context: ScoringContext,
): EvaluationDimensionScores {
  const score = context.latestScore;
  const sourceSnapshot = context.opportunity.source_snapshot;
  const isSparseValidation =
    readJsonFlag(sourceSnapshot, "not_market_opportunity") ||
    readJsonFlag(sourceSnapshot, "validation_scope") ||
    context.opportunity.industry === "system_validation";

  const validationStrength: DimensionScore = isSparseValidation
    ? {
        score: 40,
        status: "known",
        source: "source_snapshot.validation_scope",
        transform: "labeled foundation stub reduces validation strength",
      }
    : context.reviews.some((review) => review.verdict === "pass")
      ? knownScore(80, "opportunity_reviews.pass")
      : { score: null, status: "unknown", source: "opportunity_reviews" };

  const evidenceConfidence: DimensionScore = isSparseValidation
    ? {
        score: 35,
        status: "known",
        source: "source_snapshot.not_market_opportunity",
        transform: "system-validation data is not market evidence",
      }
    : context.evidence.length > 0
      ? knownScore(
          context.evidence.reduce(
            (sum, item) => sum + Number(item.credibility_score ?? item.relevance_score ?? 0),
            0,
          ) / context.evidence.length,
          "opportunity_evidence.average_credibility",
        )
      : { score: null, status: "unknown", source: "opportunity_evidence" };

  return {
    demand: knownScore(score?.demand_score, "opportunity_scores.demand_score"),
    competition_attractiveness: invertCompetitionScore(score?.competition_score),
    profitability: knownScore(score?.profitability_score, "opportunity_scores.profitability_score"),
    startup_cost_efficiency: invertStartupCostScore(score?.startup_cost_score),
    time_to_value: knownScore(
      score?.time_to_revenue_score,
      "opportunity_scores.time_to_revenue_score",
    ),
    automation_potential: knownScore(
      score?.automation_score,
      "opportunity_scores.automation_score",
    ),
    strategic_fit: knownScore(context.opportunity.overall_score, "opportunities.overall_score"),
    defensibility: knownScore(
      score?.defensibility_score,
      "opportunity_scores.defensibility_score",
    ),
    distribution_feasibility: knownScore(
      score?.distribution_score,
      "opportunity_scores.distribution_score",
    ),
    operational_simplicity: knownScore(
      score?.operational_complexity_score
        ? 100 - Number(score.operational_complexity_score)
        : null,
      "opportunity_scores.operational_complexity_score",
    ),
    regulatory_risk: regulatoryRiskFromEvidence(context.evidence),
    validation_strength: validationStrength,
    compounding_potential: knownScore(
      score?.profitability_score,
      "opportunity_scores.profitability_score",
    ),
    portfolio_synergy: knownScore(50, "foundation.default_neutral"),
    evidence_confidence: evidenceConfidence,
  };
}

export function aggregateWeightedScore(
  model: DecisionModel,
  dimensions: EvaluationDimensionScores,
): {
  overallScore: number | null;
  missingDimensions: string[];
  knownDimensions: string[];
} {
  const weights =
    typeof model.weights === "object" &&
    model.weights !== null &&
    !Array.isArray(model.weights)
      ? (model.weights as Record<string, number>)
      : {};

  let weightedSum = 0;
  let weightTotal = 0;
  const missingDimensions: string[] = [];
  const knownDimensions: string[] = [];

  for (const [key, dimension] of Object.entries(dimensions)) {
    const weight = weights[key] ?? 0;
    if (weight <= 0) {
      continue;
    }

    if (dimension.status === "unknown" || dimension.score === null) {
      missingDimensions.push(key);
      continue;
    }

    weightedSum += dimension.score * weight;
    weightTotal += weight;
    knownDimensions.push(key);
  }

  if (weightTotal <= 0) {
    return { overallScore: null, missingDimensions, knownDimensions };
  }

  return {
    overallScore: Math.round((weightedSum / weightTotal) * 100) / 100,
    missingDimensions,
    knownDimensions,
  };
}

export function calculateConfidenceScore(
  dimensions: EvaluationDimensionScores,
  missingDimensions: string[],
): number {
  const totalDimensions = Object.keys(dimensions).length;
  const knownCount = totalDimensions - missingDimensions.length;
  const coverageRatio = totalDimensions > 0 ? knownCount / totalDimensions : 0;

  const evidence = dimensions.evidence_confidence;
  const validation = dimensions.validation_strength;

  let confidence = coverageRatio * 70;

  if (evidence.status === "known" && evidence.score !== null) {
    confidence += evidence.score * 0.2;
  }

  if (validation.status === "known" && validation.score !== null) {
    confidence += validation.score * 0.1;
  }

  if (missingDimensions.includes("demand") || missingDimensions.includes("profitability")) {
    confidence -= 15;
  }

  return Math.max(0, Math.min(100, Math.round(confidence * 100) / 100));
}

export function extractTopPositiveDimensions(
  dimensions: EvaluationDimensionScores,
  limit = 3,
): string[] {
  return Object.entries(dimensions)
    .filter(([, value]) => value.status === "known" && value.score !== null)
    .sort((a, b) => (b[1].score ?? 0) - (a[1].score ?? 0))
    .slice(0, limit)
    .map(([key]) => key);
}

export function extractTopRisks(
  dimensions: EvaluationDimensionScores,
  missingDimensions: string[],
  limit = 3,
): string[] {
  const lowScores = Object.entries(dimensions)
    .filter(([, value]) => value.status === "known" && value.score !== null && value.score < 50)
    .sort((a, b) => (a[1].score ?? 0) - (b[1].score ?? 0))
    .map(([key]) => key);

  return [...missingDimensions.map((key) => `missing:${key}`), ...lowScores].slice(0, limit);
}
