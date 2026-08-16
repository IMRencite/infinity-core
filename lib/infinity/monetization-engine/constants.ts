export const MONETIZATION_ENGINE_VERSION = "monetization_engine_v1";

export const MONETIZATION_SCORING_VERSION = "monetization_scoring_v1";

export const MONETIZATION_EXTRACTION_SCHEMA_VERSION = "monetization_extraction_v1";

export const MONETIZATION_RUN_STATUSES = [
  "requested",
  "running",
  "researching",
  "analyzing",
  "scoring",
  "completed",
  "failed",
  "policy_blocked",
] as const;

export type MonetizationRunStatus = (typeof MONETIZATION_RUN_STATUSES)[number];

export const ECONOMIC_VIABILITY_STATES = [
  "STRONG",
  "PROMISING",
  "SPECULATIVE",
  "WEAK",
  "REJECT",
] as const;

export type EconomicViabilityState = (typeof ECONOMIC_VIABILITY_STATES)[number];

export const MONETIZATION_ARCHETYPE_TYPES = [
  "saas_subscription",
  "usage_based_saas",
  "freemium_saas",
  "digital_products",
  "paid_membership",
  "marketplace_commissions",
  "transaction_fees",
  "lead_generation",
  "lead_resale",
  "affiliate_commissions",
  "display_advertising",
  "sponsorships",
  "ecommerce",
  "print_on_demand",
  "subscription_commerce",
  "directories",
  "paid_listings",
  "job_boards",
  "data_products",
  "research_products",
  "reports",
  "api_access",
  "licensing",
  "templates",
  "courses_education",
  "service_product_hybrid",
  "software_plus_service",
  "content_sites",
  "newsletter_monetization",
  "creator_marketplace",
  "two_sided_marketplace",
  "b2b_marketplace",
  "consumer_marketplace",
  "other",
] as const;

export type MonetizationArchetypeType = (typeof MONETIZATION_ARCHETYPE_TYPES)[number];

export const PLAN_ROLES = ["primary", "secondary", "future"] as const;
export type PlanRole = (typeof PLAN_ROLES)[number];

export const REVENUE_STREAM_ROLES = ["primary", "secondary", "future"] as const;
export type RevenueStreamRole = (typeof REVENUE_STREAM_ROLES)[number];

export const SCENARIO_TYPES = ["conservative", "base", "aggressive"] as const;
export type ScenarioType = (typeof SCENARIO_TYPES)[number];

export const SCENARIO_MILESTONES = [1, 3, 6, 12] as const;
export type ScenarioMilestone = (typeof SCENARIO_MILESTONES)[number];

export const VALIDATION_EXPERIMENT_TYPES = [
  "landing_page_demand_test",
  "waitlist",
  "pricing_test",
  "seo_demand_validation",
  "keyword_demand",
  "competitor_traffic_research",
  "marketplace_supply_test",
  "customer_interview",
  "outbound_response_test",
  "preorder_test",
  "lead_capture_test",
] as const;

export type ValidationExperimentType = (typeof VALIDATION_EXPERIMENT_TYPES)[number];

export const MONETIZATION_EVIDENCE_TYPES = [
  "competitor_pricing",
  "market_pricing",
  "commission_rates",
  "advertising_economics",
  "affiliate_commissions",
  "saas_pricing",
  "customer_acquisition_economics",
  "marketplace_take_rates",
  "industry_margins",
  "purchase_behavior",
  "market_growth",
  "existing_alternatives",
  "other",
] as const;

export type MonetizationEvidenceType = (typeof MONETIZATION_EVIDENCE_TYPES)[number];

export const MONETIZATION_LIMITS = {
  maxCandidatesPerRun: 5,
  maxResearchCallsPerRun: 8,
  maxPlansPerCandidate: 3,
  maxRevenueStreamsPerPlan: 8,
  maxValidationExperimentsPerCandidate: 6,
  maxEstimatedCostUsd: 12,
} as const;

export const DEFAULT_SCORING_WEIGHTS = {
  revenue_potential_score: 0.13,
  margin_potential_score: 0.11,
  speed_to_revenue_score: 0.09,
  recurring_revenue_potential_score: 0.09,
  automation_potential_score: 0.09,
  scalability_score: 0.08,
  customer_acquisition_feasibility_score: 0.08,
  capital_efficiency_score: 0.07,
  competition_score: 0.06,
  platform_dependency_score: 0.04,
  operational_complexity_score: 0.04,
  technical_complexity_score: 0.04,
  evidence_confidence_score: 0.08,
} as const;

export type MonetizationScoringWeights = typeof DEFAULT_SCORING_WEIGHTS;

export const DEFAULT_VIABILITY_THRESHOLDS = {
  strong: 75,
  promising: 60,
  speculative: 45,
  weak: 30,
} as const;

export const DEFAULT_COMBINED_DECISION_WEIGHTS = {
  opportunity_score: 0.4,
  monetization_score: 0.6,
} as const;

export const SCENARIO_MULTIPLIERS = {
  conservative: { customers: 0.5, price: 0.85, cost: 1.1 },
  base: { customers: 1.0, price: 1.0, cost: 1.0 },
  aggressive: { customers: 1.5, price: 1.15, cost: 0.95 },
} as const;

export const MONTH_RAMP_FACTORS: Record<number, number> = {
  1: 0.05,
  3: 0.2,
  6: 0.5,
  12: 1.0,
};
