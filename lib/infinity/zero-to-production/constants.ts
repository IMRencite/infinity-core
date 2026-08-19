export const ZTP_VERSION = "zero_to_production_v1";

export const ZTP_ORIGINS = ["AUTONOMOUS_DISCOVERY", "FOUNDER_SUBMITTED", "FOUNDER_OVERRIDE"] as const;
export type ZtpOrigin = (typeof ZTP_ORIGINS)[number];

export const ZTP_STAGES = [
  "SOURCE",
  "RESEARCH",
  "MONETIZATION",
  "SELECTION",
  "BLUEPRINT",
  "BUILD_PLANNING",
  "BUILD",
  "QA",
  "REPAIR",
  "PACKAGE",
  "COMMERCIALIZATION",
  "TREASURY",
  "LAUNCH_READINESS",
  "READY",
] as const;
export type ZtpStage = (typeof ZTP_STAGES)[number];

export const ZTP_FUTURE_STAGES = ["LAUNCH", "PERFORMANCE", "LEARNING"] as const;

export const ZTP_STATUSES = ["PENDING", "RUNNING", "WAITING", "BLOCKED", "FAILED", "COMPLETE"] as const;
export type ZtpStatus = (typeof ZTP_STATUSES)[number];

export const ZTP_BUSINESS_DECISIONS = ["BUILD", "VALIDATE", "HOLD", "REJECT"] as const;
export type ZtpBusinessDecision = (typeof ZTP_BUSINESS_DECISIONS)[number];

export const ZTP_FAILURE_CODES = [
  "SOURCE_INVALID",
  "RESEARCH_FAILED",
  "MONETIZATION_FAILED",
  "SELECTION_BLOCKED",
  "VALIDATION_REQUIRED",
  "BLUEPRINT_FAILED",
  "BUILD_PLANNING_FAILED",
  "CODING_FAILED",
  "QA_FAILED",
  "REPAIR_EXHAUSTED",
  "PRODUCTION_ARTIFACT_FAILED",
  "COMMERCIALIZATION_FAILED",
  "TREASURY_BLOCKED",
  "LAUNCH_NOT_READY",
  "INFRASTRUCTURE_BLOCKED",
  "MISSING_AUTHORITY",
] as const;
export type ZtpFailureCode = (typeof ZTP_FAILURE_CODES)[number];

export const ZTP_READINESS = ["READY", "DEGRADED", "BLOCKED"] as const;
export type ZtpReadiness = (typeof ZTP_READINESS)[number];

export const PRODUCT_READINESS = [
  "CODE_COMPLETE",
  "QA_PASSED",
  "PRODUCTION_ARTIFACT_READY",
  "COMMERCIALIZATION_READY",
  "LAUNCH_READY",
  "PUBLICLY_LAUNCHED",
] as const;
export type ProductReadinessFlag = (typeof PRODUCT_READINESS)[number];

export const PERFORMANCE_HOOKS = [
  "visit",
  "signup",
  "activation",
  "core_action",
  "checkout_started",
  "purchase",
  "subscription_started",
] as const;

export const REQUIRED_STAGE_WEIGHT = 1;
