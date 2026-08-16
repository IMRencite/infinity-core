import {
  DEFAULT_CONCURRENCY_LIMIT,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_MAX_RUNTIME_MS,
  V1_ALLOWED_SIDE_EFFECTS,
  type V1WorkerCapabilityKey,
} from "./constants";
import type { WorkerCapabilityContract } from "./types";
import { WEBSITE_WORKER_CAPABILITY_REGISTRY } from "./website-capabilities";
import { EXECUTIVE_WORKER_CAPABILITY_REGISTRY } from "./executive-capabilities";

const BASE: Omit<
  WorkerCapabilityContract,
  "capabilityKey" | "name" | "description" | "workerType" | "permissions" | "artifactTypesProduced" | "reviewRequirement" | "inputSchema" | "outputSchema"
> = {
  version: "1.0.0",
  requiredContext: ["organization", "mission", "engine_job", "worker_run"],
  requiredPolicies: ["organization_consistency", "mission_active", "capability_registered"],
  maximumRuntimeMs: DEFAULT_MAX_RUNTIME_MS,
  maximumAttempts: DEFAULT_MAX_ATTEMPTS,
  maximumEstimatedCost: 0,
  concurrencyLimit: DEFAULT_CONCURRENCY_LIMIT,
  idempotencyStrategy: "input_hash",
  cancellationSupport: true,
  retryPolicy: "runtime_default",
  sideEffectClass: "internal_read",
  status: "active",
};

const CORE_WORKER_CAPABILITY_REGISTRY = {
  "research.summarize_internal_evidence": {
    ...BASE,
    capabilityKey: "research.summarize_internal_evidence",
    name: "Summarize Internal Evidence",
    description: "Loads existing internal evidence records and produces a structured summary.",
    workerType: "research",
    permissions: ["evidence.read", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: {
      type: "object",
      required: ["organization_id", "evidence_record_ids"],
    },
    outputSchema: {
      type: "object",
      required: ["summary", "missing_evidence", "provenance"],
    },
    reviewRequirement: "pending",
    artifactTypesProduced: ["evidence_summary"],
  },
  "analysis.compare_opportunities": {
    ...BASE,
    capabilityKey: "analysis.compare_opportunities",
    name: "Compare Opportunities",
    description: "Deterministic comparison using stored evaluation scores.",
    workerType: "analysis",
    permissions: ["opportunity.read", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: {
      type: "object",
      required: ["organization_id", "opportunity_ids"],
    },
    outputSchema: {
      type: "object",
      required: ["ranked"],
    },
    reviewRequirement: "pending",
    artifactTypesProduced: ["comparison_report"],
  },
  "blueprint.validate": {
    ...BASE,
    capabilityKey: "blueprint.validate",
    name: "Validate Venture Blueprint",
    description: "Validates blueprint fields and template consistency without creating ventures.",
    workerType: "analysis",
    permissions: ["blueprint.read", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: {
      type: "object",
      required: ["organization_id", "venture_blueprint_id"],
    },
    outputSchema: {
      type: "object",
      required: ["valid", "blockers"],
    },
    reviewRequirement: "not_required",
    artifactTypesProduced: ["blueprint_validation_report"],
  },
  "qa.verify_plan_step_output": {
    ...BASE,
    capabilityKey: "qa.verify_plan_step_output",
    name: "QA Verify Plan Step Output",
    description: "Independent review of a worker result against declared output contract.",
    workerType: "quality_assurance",
    permissions: [
      "plan.read",
      "worker_result.read",
      "worker_result.write",
      "internal_artifact.write",
      "event.emit",
    ],
    inputSchema: {
      type: "object",
      required: ["organization_id", "plan_step_id", "worker_result_id"],
    },
    outputSchema: {
      type: "object",
      required: ["verdict"],
    },
    reviewRequirement: "independent_qa",
    artifactTypesProduced: ["qa_report"],
  },
  "build.workspace_initialize": {
    ...BASE,
    sideEffectClass: "internal_write",
    capabilityKey: "build.workspace_initialize",
    name: "Initialize Build Workspace",
    description: "Creates internal sandbox workspace metadata and root.",
    workerType: "software",
    permissions: ["build.workspace.write", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: { type: "object", required: ["organization_id", "build_id"] },
    outputSchema: { type: "object", required: ["workspace_reference", "initialized"] },
    reviewRequirement: "not_required",
    artifactTypesProduced: ["workspace_file_manifest"],
  },
  "build.persist_specification": {
    ...BASE,
    sideEffectClass: "internal_write",
    capabilityKey: "build.persist_specification",
    name: "Persist Build Specification",
    description: "Writes immutable specification JSON into workspace.",
    workerType: "software",
    permissions: ["build.workspace.write", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: { type: "object", required: ["organization_id", "build_id"] },
    outputSchema: { type: "object", required: ["specification_path", "specification_hash"] },
    reviewRequirement: "not_required",
    artifactTypesProduced: ["build_specification"],
  },
  "build.persist_manifest": {
    ...BASE,
    sideEffectClass: "internal_write",
    capabilityKey: "build.persist_manifest",
    name: "Persist Build Manifest",
    description: "Writes build manifest JSON into workspace.",
    workerType: "software",
    permissions: ["build.workspace.write", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: { type: "object", required: ["organization_id", "build_id"] },
    outputSchema: { type: "object", required: ["manifest_path", "manifest_hash"] },
    reviewRequirement: "not_required",
    artifactTypesProduced: ["build_manifest"],
  },
  "build.generate_template_scaffold": {
    ...BASE,
    sideEffectClass: "internal_write",
    capabilityKey: "build.generate_template_scaffold",
    name: "Generate Template Scaffold",
    description: "Copies registered internal template files (no npm install).",
    workerType: "software",
    permissions: ["build.workspace.write", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: { type: "object", required: ["organization_id", "build_id"] },
    outputSchema: { type: "object", required: ["files_written", "template_key"] },
    reviewRequirement: "not_required",
    artifactTypesProduced: ["internal_build_package"],
  },
  "build.validate_manifest": {
    ...BASE,
    capabilityKey: "build.validate_manifest",
    name: "Validate Build Manifest",
    description: "Verifies workspace files against manifest limits.",
    workerType: "quality_assurance",
    permissions: ["build.read", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: { type: "object", required: ["organization_id", "build_id"] },
    outputSchema: { type: "object", required: ["valid", "issues"] },
    reviewRequirement: "not_required",
    artifactTypesProduced: ["validation_report"],
  },
  "build.snapshot_workspace": {
    ...BASE,
    sideEffectClass: "internal_write",
    capabilityKey: "build.snapshot_workspace",
    name: "Snapshot Build Workspace",
    description: "Creates immutable internal snapshot manifest.",
    workerType: "software",
    permissions: ["build.workspace.write", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: { type: "object", required: ["organization_id", "build_id"] },
    outputSchema: { type: "object", required: ["snapshot_id", "root_hash"] },
    reviewRequirement: "not_required",
    artifactTypesProduced: ["snapshot_manifest"],
  },
  "qa.verify_internal_build": {
    ...BASE,
    capabilityKey: "qa.verify_internal_build",
    name: "QA Verify Internal Build",
    description: "Independent QA for internal build workspace (not deployment).",
    workerType: "quality_assurance",
    permissions: ["build.read", "worker_result.read", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: {
      type: "object",
      required: ["organization_id", "build_id", "plan_step_id", "worker_result_id"],
    },
    outputSchema: { type: "object", required: ["verdict"] },
    reviewRequirement: "independent_qa",
    artifactTypesProduced: ["qa_report"],
  },
  "qa.verify_generic_internal_build": {
    ...BASE,
    capabilityKey: "qa.verify_generic_internal_build",
    name: "QA Verify Generic Internal Build",
    description: "Independent generic Build Factory Runtime v2 QA (internal only).",
    workerType: "quality_assurance",
    permissions: ["build.read", "worker_result.read", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: {
      type: "object",
      required: ["organization_id", "build_id", "build_job_id"],
    },
    outputSchema: { type: "object", required: ["verdict"] },
    reviewRequirement: "independent_qa",
    artifactTypesProduced: ["qa_report"],
  },
  "qa.verify_autonomous_plan_execution": {
    ...BASE,
    capabilityKey: "qa.verify_autonomous_plan_execution",
    name: "QA Verify Autonomous Plan Execution",
    description: "Independent QA for governed autonomous internal plan execution.",
    workerType: "quality_assurance",
    permissions: ["worker_result.read", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: {
      type: "object",
      required: ["organization_id", "mission_id", "plan_execution_id"],
    },
    outputSchema: { type: "object", required: ["verdict"] },
    reviewRequirement: "independent_qa",
    artifactTypesProduced: ["qa_report"],
  },
  "venture.assemble_internal_package": {
    ...BASE,
    sideEffectClass: "internal_write",
    capabilityKey: "venture.assemble_internal_package",
    name: "Assemble Internal Venture Package",
    description:
      "Turns internally_complete plan execution and build artifacts into a durable venture assembly (no launch).",
    workerType: "operations",
    permissions: [
      "plan.read",
      "blueprint.read",
      "build.read",
      "worker_result.write",
      "internal_artifact.write",
      "event.emit",
    ],
    inputSchema: {
      type: "object",
      required: ["organization_id", "mission_id", "plan_execution_id", "venture_assembly_id"],
    },
    outputSchema: {
      type: "object",
      required: ["venture_assembly_id", "assembly_version", "readiness_status"],
    },
    reviewRequirement: "pending",
    artifactTypesProduced: ["venture_assembly_package"],
  },
  "qa.verify_venture_assembly": {
    ...BASE,
    capabilityKey: "qa.verify_venture_assembly",
    name: "QA Verify Venture Assembly",
    description: "Independent QA for internal venture assembly packages.",
    workerType: "quality_assurance",
    permissions: ["worker_result.read", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: {
      type: "object",
      required: ["organization_id", "mission_id", "venture_assembly_id"],
    },
    outputSchema: { type: "object", required: ["verdict"] },
    reviewRequirement: "independent_qa",
    artifactTypesProduced: ["qa_report"],
  },
  "launch.generate_plan": {
    ...BASE,
    sideEffectClass: "internal_write",
    capabilityKey: "launch.generate_plan",
    name: "Generate Launch Plan",
    description: "Derives ordered external action requests from an internally_ready venture assembly.",
    workerType: "operations",
    permissions: ["plan.read", "worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: {
      type: "object",
      required: ["organization_id", "mission_id", "venture_assembly_id"],
    },
    outputSchema: { type: "object", required: ["launch_plan_id"] },
    reviewRequirement: "not_required",
    artifactTypesProduced: ["qa_report"],
  },
  "launch.simulate_external_action": {
    ...BASE,
    sideEffectClass: "internal_write",
    capabilityKey: "launch.simulate_external_action",
    name: "Simulate External Action",
    description: "Routes external action through Launch Gateway mock adapter (simulation only).",
    workerType: "operations",
    permissions: [
      "worker_result.write",
      "internal_artifact.write",
      "event.emit",
      "network.read",
      "network.write",
      "domain.register",
      "repository.create",
      "publish.website",
    ],
    inputSchema: {
      type: "object",
      required: ["organization_id", "mission_id", "external_action_id"],
    },
    outputSchema: {
      type: "object",
      required: ["execution_status", "simulation"],
    },
    reviewRequirement: "not_required",
    artifactTypesProduced: ["qa_report"],
  },
  "launch.evaluate_external_authorization": {
    ...BASE,
    sideEffectClass: "internal_write",
    capabilityKey: "launch.evaluate_external_authorization",
    name: "Evaluate External Authorization",
    description:
      "Evaluates autonomous external action authorization policy and persists governed authorization decisions.",
    workerType: "operations",
    permissions: ["worker_result.write", "internal_artifact.write", "event.emit"],
    inputSchema: {
      type: "object",
      required: ["organization_id", "mission_id", "external_action_id"],
    },
    outputSchema: {
      type: "object",
      required: ["decision", "execution_status"],
    },
    reviewRequirement: "not_required",
    artifactTypesProduced: ["qa_report"],
  },
  "launch.execute_external_action": {
    ...BASE,
    sideEffectClass: "internal_write",
    capabilityKey: "launch.execute_external_action",
    name: "Execute External Action (Live)",
    description:
      "Routes approved live external actions through Launch Gateway provider adapters (gated; disabled by default).",
    workerType: "operations",
    permissions: [
      "worker_result.write",
      "internal_artifact.write",
      "event.emit",
      "network.read",
      "network.write",
      "repository.create",
      "publish.website",
    ],
    inputSchema: {
      type: "object",
      required: ["organization_id", "mission_id", "external_action_id"],
    },
    outputSchema: {
      type: "object",
      required: ["execution_status", "execution_mode", "blocked"],
    },
    reviewRequirement: "required",
    artifactTypesProduced: ["qa_report"],
  },
};

export const WORKER_CAPABILITY_REGISTRY = {
  ...CORE_WORKER_CAPABILITY_REGISTRY,
  ...WEBSITE_WORKER_CAPABILITY_REGISTRY,
  ...EXECUTIVE_WORKER_CAPABILITY_REGISTRY,
} as unknown as Record<V1WorkerCapabilityKey, WorkerCapabilityContract>;

export function getWorkerCapabilityContract(
  capabilityKey: string,
): WorkerCapabilityContract | null {
  if (capabilityKey in WORKER_CAPABILITY_REGISTRY) {
    return WORKER_CAPABILITY_REGISTRY[capabilityKey as V1WorkerCapabilityKey];
  }
  return null;
}

export function isGovernedWorkerCapabilityKey(capabilityKey: string): boolean {
  return capabilityKey in WORKER_CAPABILITY_REGISTRY;
}

export function assertSideEffectAllowed(sideEffectClass: string): void {
  if (!V1_ALLOWED_SIDE_EFFECTS.includes(sideEffectClass as (typeof V1_ALLOWED_SIDE_EFFECTS)[number])) {
    throw new Error(
      `Side effect class "${sideEffectClass}" is not enabled in Worker Capability Foundation v1`,
    );
  }
}
