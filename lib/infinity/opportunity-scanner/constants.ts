export const OPPORTUNITY_SCANNER_VERSION = "opportunity_scanner_v1";

export const OPPORTUNITY_SCANNER_SCORING_VERSION = "opportunity_scanner_scoring_v1";

export const OPPORTUNITY_SCANNER_EXTRACTION_SCHEMA_VERSION =
  "opportunity_scanner_extraction_v1";

export const DISCOVERY_RUN_STATUSES = [
  "requested",
  "running",
  "researching",
  "extracting",
  "scoring",
  "completed",
  "failed",
  "policy_blocked",
] as const;

export type DiscoveryRunStatus = (typeof DISCOVERY_RUN_STATUSES)[number];

export const SIGNAL_CATEGORIES = [
  "demand",
  "market_change",
  "competition",
  "monetization",
  "buildability",
  "distribution",
] as const;

export type SignalCategory = (typeof SIGNAL_CATEGORIES)[number];

export const DEMAND_SIGNAL_TYPES = [
  "growing_search_demand",
  "recurring_questions",
  "high_intent_queries",
  "unmet_needs",
  "underserved_niches",
  "expensive_solutions",
  "fragmented_workflows",
  "recurring_pain_points",
] as const;

export const MARKET_CHANGE_SIGNAL_TYPES = [
  "emerging_technologies",
  "regulatory_changes",
  "platform_changes",
  "demographic_shifts",
  "new_industries",
  "changing_consumer_behavior",
  "new_distribution_channels",
] as const;

export const COMPETITION_SIGNAL_TYPES = [
  "weak_incumbents",
  "poor_user_experience",
  "expensive_incumbents",
  "fragmented_competitors",
  "outdated_software",
  "underserved_markets",
  "missing_features",
] as const;

export const MONETIZATION_SIGNAL_TYPES = [
  "willingness_to_pay",
  "existing_pricing",
  "transaction_economics",
  "advertising_potential",
  "affiliate_potential",
  "subscription_potential",
  "lead_value",
  "product_margins",
  "recurring_revenue_potential",
] as const;

export const BUILDABILITY_SIGNAL_TYPES = [
  "technical_complexity",
  "required_integrations",
  "required_external_services",
  "regulatory_burden",
  "human_labor_dependency",
  "startup_capital_requirements",
  "time_to_mvp",
  "automation_potential",
] as const;

export const DISTRIBUTION_SIGNAL_TYPES = [
  "seo_opportunity",
  "geo_ai_search_opportunity",
  "paid_acquisition_feasibility",
  "social_distribution",
  "marketplace_app_stores",
  "partnerships",
  "direct_sales",
  "viral_network_effects",
  "existing_communities",
] as const;

export const DISCOVERY_STRATEGY_IDS = [
  "market_pain_discovery",
  "emerging_trend_discovery",
  "expensive_workflow_discovery",
  "underserved_niche_discovery",
  "software_replacement_discovery",
  "search_demand_discovery",
  "marketplace_gap_discovery",
  "business_model_discovery",
] as const;

export type DiscoveryStrategyId = (typeof DISCOVERY_STRATEGY_IDS)[number];

export const DEFAULT_V1_TEST_STRATEGIES: DiscoveryStrategyId[] = [
  "market_pain_discovery",
  "search_demand_discovery",
  "expensive_workflow_discovery",
  "underserved_niche_discovery",
];

export const OPPORTUNITY_SCANNER_LIMITS = {
  maxStrategiesPerRun: 8,
  maxResearchCallsPerRun: 10,
  maxCandidatesPerRun: 10,
  maxCandidatesPerStrategy: 3,
  maxEvidencePerCandidate: 32,
  maxTitleLength: 240,
  maxSummaryLength: 4000,
} as const;

export const DEFAULT_SCORING_WEIGHTS = {
  demand_score: 0.14,
  market_growth_score: 0.09,
  competition_opportunity_score: 0.11,
  monetization_potential_score: 0.13,
  buildability_score: 0.09,
  automation_score: 0.11,
  distribution_score: 0.09,
  capital_efficiency_score: 0.07,
  speed_to_revenue_score: 0.07,
  evidence_confidence_score: 0.1,
} as const;

export type ScoringWeights = typeof DEFAULT_SCORING_WEIGHTS;

export const BUSINESS_MODEL_CANDIDATE_TYPES = [
  "saas",
  "micro_saas",
  "ai_software",
  "marketplace",
  "directory",
  "content_business",
  "seo_geo_property",
  "lead_generation",
  "affiliate",
  "ecommerce",
  "digital_product",
  "print_on_demand",
  "publishing",
  "data_product",
  "api",
  "workflow_automation",
  "niche_community",
  "subscription",
  "advertising_supported",
  "transaction_fee",
  "creator_tool",
  "b2b_automated_service",
  "consumer_app",
  "specialized_platform",
  "other",
] as const;

export type BusinessModelCandidateType = (typeof BUSINESS_MODEL_CANDIDATE_TYPES)[number];
