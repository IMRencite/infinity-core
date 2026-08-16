export const PAB_V2_VERSION = "product_asset_builder_v2";

export const EXECUTION_CLASSES = ["FAST", "STANDARD", "COMPLEX", "HIGH_VALUE", "CRITICAL"] as const;
export type ExecutionClass = (typeof EXECUTION_CLASSES)[number];

export const FEATURE_CONTRACT_STATUSES = [
  "PLANNED",
  "IMPLEMENTING",
  "REVIEWING",
  "VALIDATING",
  "PASS",
  "FAIL",
  "BLOCKED",
] as const;
export type FeatureContractStatus = (typeof FEATURE_CONTRACT_STATUSES)[number];

export const DEFECT_TYPES = [
  "TYPE_ERROR",
  "TEST_FAILURE",
  "BUILD_FAILURE",
  "FUNCTIONAL_FAILURE",
  "SECURITY_FAILURE",
  "ARCHITECTURE_FAILURE",
  "REQUIREMENT_GAP",
  "INTEGRATION_FAILURE",
  "PLACEHOLDER_DETECTED",
] as const;
export type DefectType = (typeof DEFECT_TYPES)[number];

export const DEFAULT_V2_BUDGET = {
  maxAICostUsd: 25,
  maxProviderCalls: 200,
  maxTokens: 500_000,
  maxRepairAttempts: 8,
  maxElapsedMs: 45 * 60 * 1000,
} as const;

export const PLACEHOLDER_PATTERNS = [
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /coming soon/i,
  /lorem ipsum/i,
  /fake user/i,
  /dummy payment/i,
  /hard-?coded fake/i,
  /mock implementation used in production/i,
  /not implemented/i,
  /placeholder/i,
] as const;
