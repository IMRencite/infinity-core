export const VALIDATION_MODEL_STATUSES = [
  "draft",
  "active",
  "experimental",
  "deprecated",
  "archived",
] as const;

export const VALIDATION_RUN_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "blocked",
  "superseded",
] as const;

export const VALIDATION_RECOMMENDATIONS = [
  "reject",
  "hold",
  "research_more",
  "validate_again",
  "approved_for_planning",
] as const;

export const VALIDATION_CATEGORIES = [
  "demand",
  "competition",
  "financial",
  "technical",
  "strategic",
  "operational",
  "legal",
  "portfolio_synergy",
  "compounding_potential",
  "evidence_strength",
] as const;

export const DEFAULT_VALIDATION_MODEL_NAME = "Enterprise Value Validation Model";
export const DEFAULT_VALIDATION_MODEL_VERSION = "1.0.0";

export const DEFAULT_VALIDATION_THRESHOLDS = {
  approve_planning_min_confidence: 70,
  approve_planning_min_score: 65,
  approve_planning_min_evidence_strength: 60,
  research_more_max_confidence: 55,
  reject_max_score: 35,
  critical_blocker_blocks_approval: true,
  sparse_system_blocks_approval: true,
} as const;

export function isValidationRecommendation(value: string): boolean {
  return (VALIDATION_RECOMMENDATIONS as readonly string[]).includes(value);
}

export function isValidationCategory(value: string): boolean {
  return (VALIDATION_CATEGORIES as readonly string[]).includes(value);
}
