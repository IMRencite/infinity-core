import { DEFAULT_VALIDATION_THRESHOLDS } from "./constants";
import type { ValidationModel } from "./types";
import type { CategoryResult } from "./types";

export function generateValidationRecommendation(input: {
  model: ValidationModel;
  overallScore: number | null;
  overallConfidence: number | null;
  categories: CategoryResult[];
  isSparseSystemValidation: boolean;
  hasCriticalBlockers: boolean;
  evaluationRecommendation: string | null;
}): string {
  const thresholds =
    typeof input.model.thresholds === "object" &&
    input.model.thresholds !== null &&
    !Array.isArray(input.model.thresholds)
      ? { ...DEFAULT_VALIDATION_THRESHOLDS, ...(input.model.thresholds as Record<string, number>) }
      : DEFAULT_VALIDATION_THRESHOLDS;

  if (input.isSparseSystemValidation && thresholds.sparse_system_blocks_approval) {
    return input.overallConfidence !== null &&
      input.overallConfidence <= thresholds.research_more_max_confidence
      ? "research_more"
      : "validate_again";
  }

  if (input.hasCriticalBlockers && thresholds.critical_blocker_blocks_approval) {
    return "hold";
  }

  if (
    input.overallScore !== null &&
    input.overallScore <= thresholds.reject_max_score
  ) {
    return "reject";
  }

  if (
    input.overallConfidence !== null &&
    input.overallConfidence <= thresholds.research_more_max_confidence
  ) {
    return "research_more";
  }

  const evidenceCategory = input.categories.find((c) => c.category === "evidence_strength");
  const evidenceScore = evidenceCategory?.score ?? null;
  const strategicCategory = input.categories.find((c) => c.category === "strategic");
  const strategicScore = strategicCategory?.score ?? null;

  const unknownCount = input.categories.filter((c) => c.dataStatus === "unknown").length;

  if (unknownCount >= 4) {
    return "research_more";
  }

  const canApprove =
    input.overallScore !== null &&
    input.overallScore >= thresholds.approve_planning_min_score &&
    input.overallConfidence !== null &&
    input.overallConfidence >= thresholds.approve_planning_min_confidence &&
    evidenceScore !== null &&
    evidenceScore >= thresholds.approve_planning_min_evidence_strength &&
    strategicScore !== null &&
    strategicScore >= 50 &&
    !input.isSparseSystemValidation &&
    !input.hasCriticalBlockers;

  if (canApprove) {
    return "approved_for_planning";
  }

  if (
    input.evaluationRecommendation === "validate" ||
    input.evaluationRecommendation === "approve_initiative"
  ) {
    return "validate_again";
  }

  return "hold";
}

export function isPlannerEligible(recommendation: string): boolean {
  return recommendation === "approved_for_planning";
}
