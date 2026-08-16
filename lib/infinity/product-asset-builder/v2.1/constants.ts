export const PAB_V21_VERSION = "product_asset_builder_v2.1";

export const CODING_TASK_TYPES = [
  "CREATE_FILE",
  "MODIFY_FILE",
  "IMPLEMENT_FEATURE",
  "IMPLEMENT_API",
  "IMPLEMENT_DATABASE",
  "IMPLEMENT_UI",
  "WRITE_TESTS",
  "FIX_TESTS",
  "FIX_BUILD",
  "REFACTOR",
  "SECURITY_FIX",
  "INTEGRATION",
  "REVIEW_FIX",
] as const;

export type CodingTaskType = (typeof CODING_TASK_TYPES)[number];

export const CODING_TASK_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "blocked",
  "cancelled",
] as const;

export const CHANGE_OPERATIONS = ["create", "replace", "patch", "delete"] as const;

export type ChangeOperation = (typeof CHANGE_OPERATIONS)[number];

export const REVIEW_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"] as const;

export const FORBIDDEN_MUTATION_PATHS = [
  ".env",
  ".env.local",
  ".env.production",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
] as const;

export const DEFAULT_V21_BUDGET = {
  maxAICostUsd: 25,
  maxProviderCalls: 80,
  maxTokens: 2_000_000,
  maxRepairAttempts: 8,
  maxElapsedMs: 1_800_000,
  maxFilesChangedPerTask: 15,
  maxTaskCostUsd: 3,
} as const;

export const CONTEXT_BUDGET = {
  maxFiles: 12,
  maxCharsPerFile: 6000,
  maxTotalChars: 48000,
} as const;
