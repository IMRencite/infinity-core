import {
  DEFAULT_CONCURRENCY_LIMIT,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_MAX_RUNTIME_MS,
} from "./constants";
import type { WorkerCapabilityContract } from "./types";

const EXECUTIVE_BASE = {
  version: "1.0.0",
  requiredContext: ["organization", "mission", "engine_job", "worker_run"],
  requiredPolicies: ["organization_consistency", "mission_active", "capability_registered"],
  maximumRuntimeMs: DEFAULT_MAX_RUNTIME_MS,
  maximumAttempts: DEFAULT_MAX_ATTEMPTS,
  maximumEstimatedCost: 0,
  concurrencyLimit: DEFAULT_CONCURRENCY_LIMIT,
  idempotencyStrategy: "input_hash" as const,
  cancellationSupport: true,
  retryPolicy: "runtime_default" as const,
  sideEffectClass: "internal_read" as const,
  status: "active" as const,
};

const executiveRead = (capabilityKey: string, name: string): WorkerCapabilityContract => ({
  ...EXECUTIVE_BASE,
  capabilityKey,
  name,
  description: `Executive selection: ${name}`,
  workerType: "analysis",
  permissions: [
    "opportunity.read",
    "validation.read",
    "reasoning.read",
    "executive.read",
    "worker_result.write",
    "internal_artifact.write",
    "event.emit",
  ],
  inputSchema: {
    type: "object",
    required: ["organization_id", "mission_id", "runtime_instance_id", "context_hash"],
  },
  outputSchema: { type: "object", required: ["valid"] },
  reviewRequirement: "not_required",
  artifactTypesProduced: ["validation_report", "comparison_report", "qa_report"],
});

export const EXECUTIVE_WORKER_CAPABILITY_REGISTRY = {
  "executive.build_selection_context": executiveRead(
    "executive.build_selection_context",
    "Build Selection Context",
  ),
  "executive.score_opportunity_set": executiveRead(
    "executive.score_opportunity_set",
    "Score Opportunity Set",
  ),
  "executive.request_ai_advisory": executiveRead(
    "executive.request_ai_advisory",
    "Request AI Advisory",
  ),
  "executive.evaluate_constraints": executiveRead(
    "executive.evaluate_constraints",
    "Evaluate Constraints",
  ),
  "executive.select_opportunity": executiveRead(
    "executive.select_opportunity",
    "Select Opportunity",
  ),
  "executive.persist_selection_decisions": executiveRead(
    "executive.persist_selection_decisions",
    "Persist Selection Decisions",
  ),
  "qa.verify_executive_selection": {
    ...executiveRead("qa.verify_executive_selection", "Verify Executive Selection"),
    workerType: "quality_assurance",
    reviewRequirement: "independent_qa",
    artifactTypesProduced: ["qa_report"],
  },
} as const;
