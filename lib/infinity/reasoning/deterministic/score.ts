import type {
  ReasoningConfig,
  ReasoningContext,
  ReasoningDimensionScore,
  ScoringStrategy,
  OpportunityScoreResult,
} from "./types";
import { assertValidatedForReasoning } from "./types";

const DIMENSION_LABELS: Record<ReasoningDimensionScore["key"], string> = {
  market_demand: "Market demand",
  competition: "Competition",
  revenue_potential: "Revenue potential",
  build_complexity: "Build complexity",
  time_to_launch: "Time to launch",
  strategic_fit: "Strategic fit",
  confidence: "Confidence",
  evidence_quality: "Evidence quality",
  capital_required: "Capital required",
  risk: "Risk",
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function dimension(
  key: ReasoningDimensionScore["key"],
  score: number | null,
  status: ReasoningDimensionScore["status"],
  source: string,
  notes?: string,
): ReasoningDimensionScore {
  return {
    key,
    label: DIMENSION_LABELS[key],
    score: score === null ? null : clampScore(score),
    status,
    source,
    notes,
  };
}

export function calculateReasoningDimensions(
  context: ReasoningContext,
): ReasoningDimensionScore[] {
  const scoreRow = context.latestScore;
  const evidence = context.evidence;

  const demandRaw = scoreRow?.demand_score ?? null;
  const competitionRaw = scoreRow?.competition_score ?? null;
  const revenueRaw = scoreRow?.profitability_score ?? null;
  const automationRaw = scoreRow?.automation_score ?? null;
  const operationalRaw = scoreRow?.operational_complexity_score ?? null;
  const strategicRaw = context.opportunity.overall_score ?? null;
  const startupCostRaw = scoreRow?.startup_cost_score ?? null;

  const evidenceQuality =
    evidence.length > 0
      ? evidence.reduce(
          (sum, item) =>
            sum + Number(item.credibility_score ?? item.relevance_score ?? 0),
          0,
        ) / evidence.length
      : null;

  const regulationEvidence = evidence.filter((e) => e.evidence_type === "regulation");
  const riskScore =
    regulationEvidence.length > 0
      ? clampScore(
          100 -
            regulationEvidence.reduce(
              (sum, item) => sum + Number(item.relevance_score ?? 50),
              0,
            ) /
              regulationEvidence.length,
        )
      : null;

  const buildComplexity =
    automationRaw !== null && operationalRaw !== null
      ? clampScore((Number(automationRaw) + (100 - Number(operationalRaw))) / 2)
      : automationRaw !== null
        ? clampScore(Number(automationRaw))
        : operationalRaw !== null
          ? clampScore(100 - Number(operationalRaw))
          : null;

  const snapshot = context.opportunity.source_snapshot;
  const timeToLaunchDays =
    typeof snapshot === "object" &&
    snapshot !== null &&
    !Array.isArray(snapshot) &&
    typeof (snapshot as Record<string, unknown>).estimated_time_to_launch_days === "number"
      ? Number((snapshot as Record<string, unknown>).estimated_time_to_launch_days)
      : null;

  const timeToLaunch =
    timeToLaunchDays === null ? null : clampScore(100 - Math.min(90, timeToLaunchDays));

  const capitalScore =
    context.allocationAmount !== null
      ? clampScore(100 - Math.min(100, context.allocationAmount / 1000))
      : startupCostRaw !== null
        ? clampScore(Number(startupCostRaw))
        : null;

  const validationConfidence = context.validation.overallConfidence;

  return [
    demandRaw === null
      ? dimension("market_demand", null, "unknown", "opportunity_scores.demand_score")
      : dimension(
          "market_demand",
          Number(demandRaw),
          "known",
          "opportunity_scores.demand_score",
        ),
    competitionRaw === null
      ? dimension("competition", null, "unknown", "opportunity_scores.competition_score")
      : dimension(
          "competition",
          100 - Number(competitionRaw),
          "known",
          "opportunity_scores.competition_score",
          "Lower competition increases attractiveness (100 - competition_score).",
        ),
    revenueRaw === null
      ? dimension("revenue_potential", null, "unknown", "opportunity_scores.profitability_score")
      : dimension(
          "revenue_potential",
          Number(revenueRaw),
          "known",
          "opportunity_scores.profitability_score",
        ),
    buildComplexity === null
      ? dimension(
          "build_complexity",
          null,
          "unknown",
          "opportunity_scores.automation_score/operational_complexity_score",
        )
      : dimension(
          "build_complexity",
          buildComplexity,
          "known",
          "opportunity_scores.automation_score/operational_complexity_score",
        ),
    timeToLaunch === null
      ? dimension("time_to_launch", null, "unknown", "opportunity.source_snapshot")
      : dimension("time_to_launch", timeToLaunch, "known", "opportunity.source_snapshot"),
    strategicRaw === null
      ? dimension("strategic_fit", null, "unknown", "opportunities.overall_score")
      : dimension("strategic_fit", Number(strategicRaw), "known", "opportunities.overall_score"),
    validationConfidence === null
      ? dimension("confidence", null, "unknown", "validation_runs.overall_confidence")
      : dimension(
          "confidence",
          Number(validationConfidence),
          "known",
          "validation_runs.overall_confidence",
        ),
    evidenceQuality === null
      ? dimension("evidence_quality", null, "unknown", "opportunity_evidence")
      : dimension("evidence_quality", evidenceQuality, "known", "opportunity_evidence"),
    capitalScore === null
      ? dimension("capital_required", null, "unknown", "allocation_proposals/resource_pools")
      : dimension(
          "capital_required",
          capitalScore,
          "known",
          context.allocationAmount !== null
            ? "allocation_proposals.requested_resources"
            : "opportunity_scores.startup_cost_score",
          "Higher score means lower capital burden.",
        ),
    riskScore === null
      ? dimension("risk", null, "unknown", "opportunity_evidence.regulation")
      : dimension("risk", riskScore, "known", "opportunity_evidence.regulation"),
  ];
}

function contextFallbackConfidence(dimensions: ReasoningDimensionScore[]): number {
  const knownRatio = dimensions.filter((d) => d.score !== null).length / dimensions.length;
  return clampScore(knownRatio * 100);
}

export function aggregateWeightedReasoningScore(
  dimensions: ReasoningDimensionScore[],
  config: ReasoningConfig,
): { overallScore: number; confidence: number; unknownDimensionCount: number } {
  const known = dimensions.filter((d) => d.score !== null);
  const unknownDimensionCount = dimensions.filter((d) => d.status === "unknown").length;

  if (known.length === 0) {
    return { overallScore: 0, confidence: 0, unknownDimensionCount };
  }

  let weightSum = 0;
  let weighted = 0;

  for (const entry of known) {
    const weight = config.weights[entry.key] ?? 0;
    weightSum += weight;
    weighted += (entry.score ?? 0) * weight;
  }

  const overallScore = weightSum > 0 ? clampScore(weighted / weightSum) : 0;

  const confidenceEntry = dimensions.find((d) => d.key === "confidence");
  let confidence = confidenceEntry?.score ?? contextFallbackConfidence(dimensions);

  confidence = clampScore(confidence - unknownDimensionCount * 3);

  return { overallScore, confidence, unknownDimensionCount };
}

export const ruleBasedScoringStrategy: ScoringStrategy = {
  score(context, config) {
    assertValidatedForReasoning(context.validation);

    const dimensions = calculateReasoningDimensions(context);
    const { overallScore, confidence, unknownDimensionCount } =
      aggregateWeightedReasoningScore(dimensions, config);

    return {
      organizationId: context.organizationId,
      opportunityId: context.opportunityId,
      opportunityName: context.opportunityName,
      overallScore,
      confidence,
      dimensions,
      unknownDimensionCount,
      validation: context.validation,
      scoredAt: new Date().toISOString(),
    };
  },
};

export function calculateOpportunityScore(
  context: ReasoningContext,
  config: ReasoningConfig,
  strategy: ScoringStrategy = ruleBasedScoringStrategy,
): OpportunityScoreResult {
  return strategy.score(context, config);
}
