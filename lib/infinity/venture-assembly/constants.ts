export const VENTURE_ASSEMBLY_MANIFEST_SCHEMA_VERSION = "venture_assembly_manifest_v1";
export const VENTURE_ASSEMBLY_POLICY_VERSION = "venture_assembly_v1";

export const VENTURE_ASSEMBLY_STATUSES = [
  "assembly_requested",
  "assembling",
  "needs_review",
  "blocked",
  "internally_ready",
  "superseded",
  "failed",
] as const;

export type VentureAssemblyStatus = (typeof VENTURE_ASSEMBLY_STATUSES)[number];

export const VENTURE_ASSEMBLY_READINESS_STATUSES = [
  "internally_ready",
  "needs_review",
  "blocked",
] as const;

export type VentureAssemblyReadinessStatus =
  (typeof VENTURE_ASSEMBLY_READINESS_STATUSES)[number];

export const EXTERNAL_DEPENDENCY_STATUSES = [
  "not_required",
  "unresolved",
  "requires_approval",
  "requires_external_capability",
  "ready",
  "satisfied",
] as const;

export type ExternalDependencyStatus = (typeof EXTERNAL_DEPENDENCY_STATUSES)[number];

export const VENTURE_ASSEMBLY_CAPABILITY = "venture.assemble_internal_package";
export const VENTURE_ASSEMBLY_QA_CAPABILITY = "qa.verify_venture_assembly";

export const VENTURE_ASSEMBLY_EVENTS = {
  assemblyRequested: "venture.assembly_requested",
  assemblyStarted: "venture.assembly_started",
  identityCreated: "venture.identity_created",
  businessModelCreated: "venture.business_model_created",
  brandPackageCreated: "venture.brand_package_created",
  marketingPackageCreated: "venture.marketing_package_created",
  operationsPackageCreated: "venture.operations_package_created",
  dependenciesIdentified: "venture.dependencies_identified",
  assemblyQaPassed: "venture.assembly_qa_passed",
  internallyReady: "venture.internally_ready",
  assemblyBlocked: "venture.assembly_blocked",
  assemblySuperseded: "venture.assembly_superseded",
  assemblyFailed: "venture.assembly_failed",
  assemblyReused: "venture.assembly_reused",
} as const;

export const VENTURE_ASSEMBLY_INTERNAL_LABEL =
  "Internal venture assembly — not deployed, published, or live.";

export const READINESS_DIMENSIONS = [
  "strategy_complete",
  "identity_complete",
  "business_model_complete",
  "build_complete",
  "qa_complete",
  "reproducibility_complete",
  "monetization_defined",
  "marketing_defined",
  "operations_defined",
  "legal_requirements_identified",
  "analytics_defined",
  "external_dependencies_identified",
] as const;

export type ReadinessDimension = (typeof READINESS_DIMENSIONS)[number];
