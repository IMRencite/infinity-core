export const BUILD_JOB_SCHEMA_VERSION = "build_job_v2";

export const BUILD_JOB_STATUSES = [
  "requested",
  "gated",
  "builder_resolved",
  "workspace_ready",
  "initialized",
  "validating",
  "generating",
  "repairing",
  "testing",
  "review_pending",
  "internally_complete",
  "blocked",
  "failed",
  "cancelled",
  "rolled_back",
] as const;

export type BuildJobStatus = (typeof BUILD_JOB_STATUSES)[number];

export const DEFAULT_MAX_REPAIR_ATTEMPTS = 2;

export const GENERIC_LIFECYCLE_TASK_CATEGORIES = [
  "build.workspace.initialize",
  "build.builder.initialize",
  "build.builder.validate",
  "build.builder.generate",
  "build.builder.repair",
  "build.builder.test",
  "build.builder.complete_request",
  "build.qa.review",
  "build.workspace.snapshot",
  "build.rollback",
  "build.reproducibility.verify",
] as const;

export const BUILD_FACTORY_V2_EVENTS = {
  jobRequested: "build_factory.job_requested",
  jobBlocked: "build_factory.job_blocked",
  builderResolved: "build_factory.builder_resolved",
  builderUnsupported: "build_factory.builder_unsupported",
  workspaceReady: "build_factory.workspace_ready",
  lifecycleStarted: "build_factory.lifecycle_started",
  qaRequested: "build_factory.qa_requested",
  qaCompleted: "build_factory.qa_completed",
  internallyCompleted: "build_factory.internally_completed",
  executionReused: "build_factory.execution_reused",
  repairRequested: "build_factory.repair_requested",
  repairExhausted: "build_factory.repair_exhausted",
  reproducibilityVerified: "build_factory.reproducibility_verified",
  rollbackCompleted: "build_factory.rollback_completed",
} as const;

export const ROLLBACK_MODES = ["metadata_only", "byte_perfect"] as const;
export type RollbackMode = (typeof ROLLBACK_MODES)[number];

export const ARTIFACT_INTERNAL_PACKAGE_LABEL =
  "Internal build artifact — not deployed or published.";

export type { GenericBuildJob } from "./build-job-types";
export { buildJobIdempotencyKey, mapBuildJobRow } from "./build-job-types";
