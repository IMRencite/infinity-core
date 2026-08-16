export const COMPANY_BUILDER_VERSION = "company_builder_v1";

export const VENTURE_BLUEPRINT_VERSION = "venture_blueprint_v1";

export const COMPANY_BUILDER_SCHEMA_VERSION = "company_builder_architecture_v1";

export const COMPANY_BUILDER_RUN_STATUSES = [
  "requested",
  "running",
  "architecting",
  "packaging",
  "completed",
  "failed",
  "policy_blocked",
] as const;

export type CompanyBuilderRunStatus = (typeof COMPANY_BUILDER_RUN_STATUSES)[number];

export const BUILD_PACKAGE_STATUSES = ["DRAFT", "READY", "BLOCKED", "SUPERSEDED"] as const;
export type BuildPackageStatus = (typeof BUILD_PACKAGE_STATUSES)[number];

export const ECONOMICS_COMPLIANCE_STATES = ["PASS", "WARNING", "FAIL"] as const;
export type EconomicsComplianceState = (typeof ECONOMICS_COMPLIANCE_STATES)[number];

export const FEATURE_PRIORITIES = ["MUST_HAVE", "SHOULD_HAVE", "LATER", "EXPERIMENTAL"] as const;
export type FeaturePriority = (typeof FEATURE_PRIORITIES)[number];

export const BUILD_VS_BUY_DECISIONS = ["BUILD", "BUY", "INTEGRATE", "DEFER"] as const;
export type BuildVsBuyDecision = (typeof BUILD_VS_BUY_DECISIONS)[number];

export const AUTOMATION_LEVELS = [
  "fully_automatable",
  "mostly_automatable",
  "human_vendor_dependent",
  "manual",
] as const;
export type AutomationLevel = (typeof AUTOMATION_LEVELS)[number];

export const ARCHITECTURE_FEEDBACK_FINDINGS = [
  "BUILDABILITY_OVERESTIMATED",
  "COST_OVERRUN_RISK",
  "TECHNICAL_COMPLEXITY_HIGHER",
  "EXTERNAL_DEPENDENCY_HIGHER",
  "REGULATORY_REQUIREMENTS_DISCOVERED",
  "TIME_TO_MARKET_HIGHER",
  "AUTOMATION_LOWER_THAN_EXPECTED",
  "MONETIZATION_IMPLEMENTATION_COMPLEXITY",
  "NO_MAJOR_CHANGE",
] as const;

export const ARCHITECTURE_FEEDBACK_ACTIONS = [
  "CONTINUE",
  "RESCORE",
  "REVALIDATE",
  "HOLD",
  "REJECT",
] as const;

export const VENTURE_TYPES = [
  "saas",
  "web_application",
  "mobile_application",
  "content_site",
  "affiliate_site",
  "lead_generation",
  "directory",
  "newsletter",
  "digital_product",
  "course",
  "membership",
  "community",
  "marketplace",
  "two_sided_marketplace",
  "creator_marketplace",
  "ecommerce",
  "print_on_demand",
  "subscription_commerce",
  "data_product",
  "api_business",
  "job_board",
  "service_product_hybrid",
  "software_service_hybrid",
  "media_business",
  "comparison_engine",
  "research_platform",
  "hybrid",
] as const;

export type VentureType = (typeof VENTURE_TYPES)[number];

export const COMPANY_BUILDER_LIMITS = {
  maxHandoffsPerRun: 5,
  maxEstimatedCostUsd: 25,
  maxAiEnrichmentCallsPerRun: 5,
} as const;

export const DEFAULT_READINESS_THRESHOLDS = {
  maxEstimatedBuildCostUsd: 250000,
  maxEstimatedFirst90DayCostUsd: 150000,
  maxBudgetOverrunRatio: 1.35,
  minMvpFeatureCount: 3,
  requireAnalyticsArchitecture: true,
  requireRevenuePath: true,
  requireDataModel: true,
  requireSourceLineage: true,
  blockOnEconomicsFail: true,
  blockOnFatalCompliance: true,
} as const;

export const DEFAULT_TECH_STACK_PREFERENCES = {
  preferExistingInfinityCapabilities: true,
  defaultFrontend: "Next.js App Router + React",
  defaultBackend: "Node.js API routes / server actions",
  defaultDatabase: "PostgreSQL (Supabase)",
  defaultAuth: "Supabase Auth or Clerk (evaluate)",
  defaultPayments: "Stripe (when required)",
  defaultAnalytics: "PostHog or Plausible + internal event pipeline",
} as const;
