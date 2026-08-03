export const WORKER_CAPABILITY_ENGINE_NAME = "worker_capability_engine";

export const GOVERNED_WORKER_IMPLEMENTATION_KEY = "workers.governed.v1";

export const V1_WORKER_CAPABILITY_KEYS = [
  "research.summarize_internal_evidence",
  "analysis.compare_opportunities",
  "blueprint.validate",
  "qa.verify_plan_step_output",
] as const;

export type V1WorkerCapabilityKey = (typeof V1_WORKER_CAPABILITY_KEYS)[number];

export const SIDE_EFFECT_CLASSES = [
  "none",
  "internal_read",
  "internal_write",
  "external_read",
  "external_write",
  "financial",
] as const;

export type SideEffectClass = (typeof SIDE_EFFECT_CLASSES)[number];

export const V1_ALLOWED_SIDE_EFFECTS: SideEffectClass[] = [
  "none",
  "internal_read",
  "internal_write",
];

export const WORKER_TYPES = [
  "research",
  "analysis",
  "content",
  "software",
  "design",
  "quality_assurance",
  "deployment",
  "marketing",
  "finance",
  "operations",
] as const;

export type WorkerType = (typeof WORKER_TYPES)[number];

export const WORKER_RESULT_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
  "blocked",
  "needs_review",
] as const;

export type WorkerResultStatus = (typeof WORKER_RESULT_STATUSES)[number];

export const REVIEW_STATUSES = [
  "not_required",
  "pending",
  "passed",
  "failed",
  "needs_human_review",
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const WORKER_PERMISSIONS = [
  "evidence.read",
  "opportunity.read",
  "validation.read",
  "reasoning.read",
  "executive.read",
  "plan.read",
  "blueprint.read",
  "worker_result.read",
  "worker_result.write",
  "internal_artifact.write",
  "event.emit",
] as const;

export type WorkerPermission = (typeof WORKER_PERMISSIONS)[number];

export const INTERNAL_ARTIFACT_TYPES = [
  "evidence_summary",
  "comparison_report",
  "blueprint_validation_report",
  "qa_report",
] as const;

export type InternalArtifactType = (typeof INTERNAL_ARTIFACT_TYPES)[number];

export const DEFAULT_MAX_RUNTIME_MS = 120_000;
export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_CONCURRENCY_LIMIT = 2;
