import type { OpportunityScoreResult, ReasoningConfig, ReasoningOutcome } from "./types";

export function prioritizeOpportunity(
  result: OpportunityScoreResult,
  config: ReasoningConfig,
): ReasoningOutcome {
  const { thresholds } = config;

  if (result.overallScore <= thresholds.reject_max_score) {
    return "REJECT";
  }

  if (
    result.confidence <= thresholds.research_more_max_confidence ||
    result.overallScore <= thresholds.research_more_max_score ||
    result.unknownDimensionCount > thresholds.max_unknown_dimensions_for_queue + 2
  ) {
    return "RESEARCH_MORE";
  }

  if (
    result.overallScore >= thresholds.approve_for_build_min_score &&
    result.confidence >= thresholds.approve_for_build_min_confidence &&
    result.unknownDimensionCount <= thresholds.max_unknown_dimensions_for_queue
  ) {
    return "APPROVE_FOR_BUILD";
  }

  if (
    result.overallScore <= thresholds.queue_max_score ||
    result.unknownDimensionCount > thresholds.max_unknown_dimensions_for_queue
  ) {
    return "RESEARCH_MORE";
  }

  return "QUEUE";
}
