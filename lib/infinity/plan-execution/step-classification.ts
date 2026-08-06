import type { PlanStep } from "@/lib/infinity/types";
import {
  PLAN_STEP_ELIGIBILITY_BLOCKED_EXTERNAL,
  PROHIBITED_EXTERNAL_CAPABILITY_PREFIXES,
} from "./constants";
import type { ClassifiedPlanStep, PlanStepClassification } from "./contract";

function isProhibitedExternalCapability(capabilityKey: string): boolean {
  const key = capabilityKey.toLowerCase();
  return PROHIBITED_EXTERNAL_CAPABILITY_PREFIXES.some(
    (prefix) => key.startsWith(prefix) || key.includes(prefix),
  );
}

export function classifyPlanStepCapability(capabilityKey: string): PlanStepClassification {
  if (isProhibitedExternalCapability(capabilityKey)) {
    return "unsupported_external";
  }
  if (capabilityKey.startsWith("build.") || capabilityKey.startsWith("website.")) {
    return "build";
  }
  if (capabilityKey.startsWith("qa.")) {
    return "QA";
  }
  if (capabilityKey === "build.snapshot_workspace") {
    return "snapshot";
  }
  if (capabilityKey.startsWith("validation.")) {
    return "validation";
  }
  if (capabilityKey.startsWith("reasoning.")) {
    return "reasoning";
  }
  if (capabilityKey.startsWith("executive.") || capabilityKey.startsWith("planner.")) {
    return "planning_support";
  }
  if (capabilityKey.startsWith("decision.") || capabilityKey.startsWith("allocation.")) {
    return "allocation_support";
  }
  if (capabilityKey.startsWith("research.") || capabilityKey.startsWith("analysis.")) {
    return "analysis";
  }
  if (capabilityKey.startsWith("blueprint.")) {
    return "validation";
  }
  return "review";
}

export function classifyPlanStep(
  step: PlanStep,
  input: {
    organizationId: string;
    missionId: string;
    planId: string;
    planVersion: number;
    executionPolicyVersion: string;
  },
): ClassifiedPlanStep {
  const capabilityKey = step.capability_key;
  const classification = classifyPlanStepCapability(capabilityKey);
  const blocked = classification === "unsupported_external";

  const constraints =
    typeof step.constraints === "object" && step.constraints !== null && !Array.isArray(step.constraints)
      ? (step.constraints as Record<string, unknown>)
      : {};

  const stepKey = String(constraints.step_key ?? step.capability_key);
  const stepVersion = String(constraints.step_version ?? "1.0.0");

  return {
    stepId: step.id,
    stepKey,
    stepVersion,
    capabilityKey,
    capabilityVersion: "1.0.0",
    builderKey: typeof constraints.builder_key === "string" ? constraints.builder_key : null,
    builderVersion: typeof constraints.builder_version === "string" ? constraints.builder_version : null,
    classification,
    sideEffectClass: blocked ? "external_write" : "internal_write",
    reviewRequirement: capabilityKey.startsWith("qa.") ? "not_required" : "pending",
    eligibilityStatus: blocked ? PLAN_STEP_ELIGIBILITY_BLOCKED_EXTERNAL : "eligible",
    estimatedCost: 0,
    idempotencyKey: [
      input.organizationId,
      input.missionId,
      input.planId,
      String(input.planVersion),
      step.id,
      stepVersion,
      input.executionPolicyVersion,
    ].join(":"),
  };
}

export function classifyPlanSteps(
  steps: PlanStep[],
  input: {
    organizationId: string;
    missionId: string;
    planId: string;
    planVersion: number;
    executionPolicyVersion: string;
  },
): ClassifiedPlanStep[] {
  return steps.map((step) => classifyPlanStep(step, input));
}
