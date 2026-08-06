export const EXECUTIVE_SELECTION_MODEL_KEY = "executive_selection_v1";
export const EXECUTIVE_SELECTION_MODEL_VERSION = "1.0.0";
export const EXECUTIVE_SELECTION_POLICY_VERSION = "1.0.0";

export const EXECUTIVE_SELECTION_CAPABILITY_KEYS = [
  "executive.build_selection_context",
  "executive.score_opportunity_set",
  "executive.request_ai_advisory",
  "executive.evaluate_constraints",
  "executive.select_opportunity",
  "qa.verify_executive_selection",
  "executive.persist_selection_decisions",
] as const;

export type ExecutiveSelectionCapabilityKey =
  (typeof EXECUTIVE_SELECTION_CAPABILITY_KEYS)[number];

export const EXECUTIVE_SELECTION_DECISIONS = [
  "select_for_planning",
  "reject",
  "monitor",
  "request_more_validation",
  "defer_due_to_constraints",
  "escalate_for_human_review",
] as const;

export type ExecutiveSelectionDecisionType =
  (typeof EXECUTIVE_SELECTION_DECISIONS)[number];

export const EXECUTIVE_AI_MODES = ["mock", "shadow", "advisory", "disabled"] as const;
export type ExecutiveAiAdvisoryMode = (typeof EXECUTIVE_AI_MODES)[number];

export const DEFAULT_SELECTION_THRESHOLD = 0.62;
export const DEFAULT_REJECTION_THRESHOLD = 0.35;
export const DEFAULT_MIN_CONFIDENCE = 0.55;
export const DEFAULT_MIN_EVIDENCE_QUALITY = 0.45;
export const DEFAULT_MAX_SELECTIONS_PER_CYCLE = 1;
export const DEFAULT_AUTONOMOUS_COST_USD = 0;

/** Above this projected startup cost max → mandatory human review */
export const DEFAULT_AUTONOMOUS_COST_CEILING_USD = 500;

export const SCORE_DIMENSIONS = [
  "demand",
  "revenue_potential",
  "time_to_value",
  "confidence",
  "competition",
  "startup_cost",
  "operating_cost",
  "execution_complexity",
  "maintenance_burden",
  "risk",
  "evidence_quality",
  "strategic_fit",
  "portfolio_synergy",
  "capability_reuse",
  "defensibility",
  "scalability",
  "capital_efficiency",
] as const;

export type ExecutiveScoreDimension = (typeof SCORE_DIMENSIONS)[number];

export const DIMENSION_WEIGHTS: Record<ExecutiveScoreDimension, number> = {
  demand: 1.1,
  revenue_potential: 1.2,
  time_to_value: 0.9,
  confidence: 1.3,
  competition: 0.8,
  startup_cost: 0.7,
  operating_cost: 0.7,
  execution_complexity: 0.85,
  maintenance_burden: 0.75,
  risk: 1.0,
  evidence_quality: 1.15,
  strategic_fit: 1.0,
  portfolio_synergy: 0.95,
  capability_reuse: 0.85,
  defensibility: 0.9,
  scalability: 1.0,
  capital_efficiency: 1.05,
};

export const EXECUTIVE_SELECTION_PROFILE_KEY = "executive_selection_profile";
