export const VENTURE_SELECTION_VERSION = "venture_selection_v1";

export const VENTURE_SELECTION_SCORING_VERSION = "venture_selection_scoring_v1";

export const ADVERSARIAL_REVIEW_SCHEMA_VERSION = "venture_selection_adversarial_v1";

export const VENTURE_SELECTION_RUN_STATUSES = [
  "requested",
  "running",
  "validating",
  "ranking",
  "completed",
  "failed",
  "policy_blocked",
] as const;

export type VentureSelectionRunStatus = (typeof VENTURE_SELECTION_RUN_STATUSES)[number];

export const SELECTION_DECISIONS = ["BUILD", "VALIDATE", "HOLD", "REJECT"] as const;
export type SelectionDecision = (typeof SELECTION_DECISIONS)[number];

export const ASSUMPTION_TYPES = ["fact", "derived", "estimated", "unknown"] as const;
export type AssumptionType = (typeof ASSUMPTION_TYPES)[number];

export const DEPENDENCY_TAG_CATEGORIES = [
  "seo",
  "google_search",
  "affiliate_network",
  "marketplace_platform",
  "api_dependency",
  "paid_ads",
  "content",
  "saas",
  "ecommerce",
  "marketplace",
  "lead_generation",
  "b2b_sales",
  "regulated",
  "community",
  "data_product",
] as const;

export type DependencyTagCategory = (typeof DEPENDENCY_TAG_CATEGORIES)[number];

export const VENTURE_SELECTION_LIMITS = {
  maxCandidatesPerRun: 10,
  maxAdversarialReviewsPerRun: 10,
  maxEstimatedCostUsd: 15,
  evidenceFreshDays: 30,
  recheckAfterDays: 21,
  staleAfterDays: 90,
} as const;

export const DEFAULT_VALIDATION_WEIGHTS = {
  demand_strength: 0.08,
  evidence_quality: 0.07,
  monetization_strength: 0.08,
  recurring_revenue: 0.06,
  margin_potential: 0.07,
  cac_feasibility: 0.05,
  ltv_potential: 0.05,
  speed_to_revenue: 0.06,
  capital_efficiency: 0.05,
  buildability: 0.06,
  automation_potential: 0.05,
  scalability: 0.06,
  distribution_feasibility: 0.06,
  defensibility: 0.05,
  execution_risk: 0.05,
  assumption_uncertainty: 0.05,
  evidence_confidence: 0.05,
} as const;

export const DEFAULT_SELECTION_WEIGHTS = {
  opportunity_attractiveness: 0.12,
  monetization_strength: 0.12,
  evidence_confidence: 0.08,
  buildability: 0.08,
  automation_potential: 0.08,
  speed_to_revenue: 0.08,
  capital_efficiency: 0.08,
  expected_profitability: 0.08,
  scalability: 0.06,
  defensibility: 0.05,
  distribution_feasibility: 0.05,
  risk: 0.06,
  assumption_uncertainty: 0.06,
} as const;

export const DEFAULT_BUILD_GATE_THRESHOLDS = {
  minSelectionScore: 72,
  minMonetizationScore: 65,
  minValidationScore: 60,
  minBuildabilityScore: 55,
  minEvidenceConfidence: 0.55,
  maxFatalAssumptionRisk: 0.45,
  maxStartupCapital: 250000,
  maxPlatformDependency: 0.75,
  maxRegulatoryRisk: 0.7,
  minExpectedRoi: 1.5,
  minLtvCacRatio: 2,
} as const;

export const DEFAULT_DECISION_THRESHOLDS = {
  rejectSelectionScore: 45,
  validateSelectionScore: 58,
  holdSelectionScore: 65,
} as const;

export const DEFAULT_RESOURCE_CONSTRAINTS = {
  availableVentureCapital: 100000,
  monthlyOperatingBudget: 15000,
  aiApiBudget: 500,
  buildCapacity: 2,
  maxSimultaneousBuilds: 1,
  maxSimultaneousValidations: 3,
  riskTolerance: 0.6,
} as const;

export const CORRELATION_PENALTY_WEIGHT = 0.08;

export const PRODUCT_TYPE_HINTS = [
  "content_site",
  "saas",
  "ecommerce",
  "marketplace",
  "community",
  "directory",
  "digital_product",
  "newsletter",
  "lead_generation",
  "hybrid",
  "other",
] as const;

export type RecommendedProductType = (typeof PRODUCT_TYPE_HINTS)[number];
