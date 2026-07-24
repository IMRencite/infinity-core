export const DECISION_MODEL_STATUSES = [
  "draft",
  "active",
  "experimental",
  "deprecated",
  "archived",
] as const;

export const EVALUATION_STATUSES = [
  "pending",
  "completed",
  "blocked",
  "invalidated",
  "superseded",
] as const;

export const EVALUATION_RECOMMENDATIONS = [
  "reject",
  "monitor",
  "hold",
  "research_more",
  "validate",
  "approve_initiative",
  "approve_build",
  "acquire",
  "partner",
  "scale",
] as const;

export const DEFAULT_DECISION_MODEL_NAME = "Enterprise Value Opportunity Model";
export const DEFAULT_DECISION_MODEL_VERSION = "1.0.0";

export const V1_SCORING_DIMENSIONS = [
  { key: "demand", direction: "higher_is_better" },
  { key: "competition_attractiveness", direction: "higher_is_better" },
  { key: "profitability", direction: "higher_is_better" },
  { key: "startup_cost_efficiency", direction: "higher_is_better" },
  { key: "time_to_value", direction: "higher_is_better" },
  { key: "automation_potential", direction: "higher_is_better" },
  { key: "strategic_fit", direction: "higher_is_better" },
  { key: "defensibility", direction: "higher_is_better" },
  { key: "distribution_feasibility", direction: "higher_is_better" },
  { key: "operational_simplicity", direction: "higher_is_better" },
  { key: "regulatory_risk", direction: "lower_risk_is_better" },
  { key: "validation_strength", direction: "higher_is_better" },
  { key: "compounding_potential", direction: "higher_is_better" },
  { key: "portfolio_synergy", direction: "higher_is_better" },
  { key: "evidence_confidence", direction: "higher_is_better" },
] as const;

export const DEFAULT_MODEL_WEIGHTS: Record<string, number> = {
  demand: 0.08,
  competition_attractiveness: 0.06,
  profitability: 0.08,
  startup_cost_efficiency: 0.08,
  time_to_value: 0.07,
  automation_potential: 0.08,
  strategic_fit: 0.1,
  defensibility: 0.08,
  distribution_feasibility: 0.06,
  operational_simplicity: 0.06,
  regulatory_risk: 0.06,
  validation_strength: 0.08,
  compounding_potential: 0.1,
  portfolio_synergy: 0.05,
  evidence_confidence: 0.06,
};

export const DEFAULT_MODEL_THRESHOLDS = {
  approve_build_min_overall: 85,
  approve_build_min_confidence: 80,
  approve_initiative_min_overall: 70,
  approve_initiative_min_confidence: 65,
  validate_min_overall: 55,
  research_more_max_confidence: 60,
  reject_max_overall: 35,
  sparse_validation_max_overall: 75,
} as const;

export function isEvaluationRecommendation(value: string): boolean {
  return (EVALUATION_RECOMMENDATIONS as readonly string[]).includes(value);
}

export function isEvaluationStatus(value: string): boolean {
  return (EVALUATION_STATUSES as readonly string[]).includes(value);
}
