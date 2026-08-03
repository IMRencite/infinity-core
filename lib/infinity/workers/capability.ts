import {
  DEFAULT_CONCURRENCY_LIMIT,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_MAX_RUNTIME_MS,
  V1_ALLOWED_SIDE_EFFECTS,
  type V1WorkerCapabilityKey,
} from "./constants";
import type { WorkerCapabilityContract } from "./types";

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

export const WORKER_CAPABILITY_REGISTRY: Record<V1WorkerCapabilityKey, WorkerCapabilityContract> = {
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
};

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
