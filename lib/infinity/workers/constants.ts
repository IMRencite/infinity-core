export const WORKER_CAPABILITY_ENGINE_NAME = "worker_capability_engine";

export const GOVERNED_WORKER_IMPLEMENTATION_KEY = "workers.governed.v1";

export const V1_WORKER_CAPABILITY_KEYS = [
  "research.summarize_internal_evidence",
  "analysis.compare_opportunities",
  "blueprint.validate",
  "qa.verify_plan_step_output",
  "build.workspace_initialize",
  "build.persist_specification",
  "build.persist_manifest",
  "build.generate_template_scaffold",
  "build.validate_manifest",
  "build.snapshot_workspace",
  "qa.verify_internal_build",
  "qa.verify_generic_internal_build",
  "website.generate_structure",
  "website.generate_components",
  "website.generate_pages",
  "website.generate_styles",
  "website.generate_metadata",
  "website.generate_sitemap",
  "website.generate_robots",
  "website.validate_structure",
  "website.validate_accessibility",
  "website.validate_seo",
  "website.validate_security",
  "website.package_internal_source",
  "qa.verify_internal_website",
  "ai_website.build_context",
  "ai_website.generate_plan",
  "ai_website.validate_plan",
  "ai_website.request_review",
  "ai_website.translate_approved_plan",
  "website.generate_ai_planned_pages",
  "website.generate_ai_planned_content",
  "qa.verify_ai_generated_website",
  "qa.verify_autonomous_plan_execution",
  "executive.build_selection_context",
  "executive.score_opportunity_set",
  "executive.request_ai_advisory",
  "executive.evaluate_constraints",
  "executive.select_opportunity",
  "executive.persist_selection_decisions",
  "qa.verify_executive_selection",
  "venture.assemble_internal_package",
  "qa.verify_venture_assembly",
  "launch.generate_plan",
  "launch.simulate_external_action",
  "launch.execute_external_action",
  "launch.evaluate_external_authorization",
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
  "build.read",
  "build.workspace.write",
  "worker_result.read",
  "worker_result.write",
  "internal_artifact.write",
  "event.emit",
  "network.read",
  "network.write",
  "publish.website",
  "domain.register",
  "repository.create",
  "email.send",
  "payment.configure",
  "purchase",
  "social.publish",
] as const;

export type WorkerPermission = (typeof WORKER_PERMISSIONS)[number];

export const INTERNAL_ARTIFACT_TYPES = [
  "evidence_summary",
  "comparison_report",
  "blueprint_validation_report",
  "qa_report",
  "build_specification",
  "build_manifest",
  "workspace_file_manifest",
  "validation_report",
  "snapshot_manifest",
  "internal_build_package",
  "internal_website_package",
  "venture_assembly_package",
] as const;

export type InternalArtifactType = (typeof INTERNAL_ARTIFACT_TYPES)[number];

export const DEFAULT_MAX_RUNTIME_MS = 120_000;
export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_CONCURRENCY_LIMIT = 2;
