export const PRODUCT_ASSET_BUILDER_VERSION = "product_asset_builder_v1";

export const PAB_RUN_STATUSES = [
  "requested",
  "building",
  "validating",
  "repairing",
  "ready",
  "failed",
  "blocked",
] as const;

export type PabRunStatus = (typeof PAB_RUN_STATUSES)[number];

export const ARTIFACT_STATUSES = [
  "planned",
  "building",
  "validating",
  "repairing",
  "ready",
  "failed",
  "blocked",
] as const;

export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];

export const TASK_RUN_STATUSES = ["pending", "running", "completed", "failed", "skipped"] as const;
export type TaskRunStatus = (typeof TASK_RUN_STATUSES)[number];

export const FILE_OPERATIONS = ["CREATE", "READ", "PATCH", "DELETE", "MOVE"] as const;
export type FileOperation = (typeof FILE_OPERATIONS)[number];

export const DEFAULT_PAB_LIMITS = {
  maxRepairAttemptsPerTask: 3,
  maxRepairCostUsd: 10,
  maxBuildCostUsd: 50,
  maxTokenUsage: 500_000,
  maxElapsedMs: 30 * 60 * 1000,
} as const;

export const PROHIBITED_WORKSPACE_SEGMENTS = [
  ".env",
  ".env.local",
  ".git",
  "node_modules",
  ".infinity/core",
] as const;

export const INFINITY_CORE_DENIED_PREFIXES = [
  "app/",
  "lib/infinity/",
  "supabase/",
  "scripts/",
  ".env",
] as const;

export const DEFAULT_MAX_FILE_BYTES = 512_000;
export const DEFAULT_MAX_FILES = 500;
export const DEFAULT_MAX_WORKSPACE_BYTES = 50_000_000;
