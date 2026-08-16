export const PERFORMANCE_INTELLIGENCE_ENGINE_VERSION = "performance_intelligence_engine_v1";

export const DEFAULT_INTELLIGENCE_BUDGET = {
  maxCostPerRunUsd: 5,
  maxAiDiagnosisCostUsd: 0.5,
  minOpportunityValueUsd: 10,
};

export type PerformanceSourceType =
  | "WEB_ANALYTICS"
  | "SEARCH_ANALYTICS"
  | "REVENUE"
  | "CRM"
  | "AD_PLATFORM"
  | "VIDEO_PLATFORM"
  | "SOCIAL_PLATFORM"
  | "EMAIL"
  | "APPLICATION"
  | "MARKETPLACE"
  | "INTERNAL"
  | "MANUAL_IMPORT";

export type IngestionMode = "PULL" | "PUSH" | "INTERNAL_EVENT";

export type DataQualityStatus =
  | "COMPLETE"
  | "PARTIAL"
  | "STALE"
  | "CONFLICTING"
  | "LOW_CONFIDENCE"
  | "MISSING";

export type DiagnosisCategory =
  | "ACQUISITION_VOLUME"
  | "ACQUISITION_COST"
  | "SEARCH_VISIBILITY"
  | "CONTENT_PERFORMANCE"
  | "CREATIVE_PERFORMANCE"
  | "LANDING_PAGE_CONVERSION"
  | "CHECKOUT_CONVERSION"
  | "PRICING"
  | "OFFER"
  | "RETENTION"
  | "CHURN"
  | "PRODUCT_QUALITY"
  | "TECHNICAL_FAILURE"
  | "ATTRIBUTION"
  | "DATA_QUALITY"
  | "ECONOMIC_MODEL"
  | "EXECUTION_RELIABILITY";

export type OptimizationActionType =
  | "EXPAND"
  | "REFRESH"
  | "REPAIR"
  | "REWRITE"
  | "RELINK"
  | "PRUNE"
  | "CHANGE_CREATIVE"
  | "CHANGE_THUMBNAIL"
  | "CHANGE_OFFER"
  | "CHANGE_PRICE"
  | "CHANGE_ACQUISITION_MIX"
  | "CHANGE_TARGETING"
  | "CHANGE_PAGE_STRUCTURE"
  | "FIX_TECHNICAL_ISSUE"
  | "IMPROVE_CONVERSION"
  | "REQUEST_MORE_EVIDENCE"
  | "PAUSE"
  | "PIVOT"
  | "SHUTDOWN";

export type EconomicPriorityDecision =
  | "EXECUTE_NOW"
  | "QUEUE"
  | "TEST_FIRST"
  | "COLLECT_MORE_DATA"
  | "DEFER"
  | "REJECT";

export type LearningDecisionType =
  | "EXPAND"
  | "KEEP"
  | "REFRESH"
  | "REPAIR"
  | "REWRITE"
  | "RELINK"
  | "PRUNE"
  | "CHANGE_CREATIVE"
  | "CHANGE_OFFER"
  | "CHANGE_PRICING"
  | "CHANGE_ACQUISITION"
  | "PIVOT"
  | "PAUSE"
  | "SHUTDOWN"
  | "COLLECT_MORE_DATA";

export type LearningDecisionStatus =
  | "PROPOSED"
  | "READY"
  | "MORE_DATA_REQUIRED"
  | "BLOCKED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED"
  | "SUPERSEDED";

export type AttributionConfidence = "DIRECT" | "HIGH_CONFIDENCE" | "INFERRED" | "LOW_CONFIDENCE" | "UNKNOWN";

export type VentureModelType = "lead_gen" | "subscription" | "marketplace" | "content_media" | "generic";

export type TimeWindow = "hour" | "day" | "week" | "month" | "rolling_7d" | "launch_to_date" | "custom";

export type ValueClassification = "KNOWN" | "DERIVED" | "ESTIMATED" | "UNKNOWN";

export type MissionTargetEngine = "creative_media" | "organic_growth" | "product_asset_builder" | "external_action";
