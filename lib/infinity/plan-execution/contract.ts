import type { PlanExecutionPhase, PlanExecutionStatus } from "./constants";

export type PlanExecutionContract = {
  id: string;
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string | null;
  opportunityId: string;
  executiveDecisionId: string;
  planId: string;
  planVersion: number;
  allocationProposalId: string | null;
  executionVersion: number;
  ventureBlueprintId: string | null;
  buildId: string | null;
  buildJobId: string | null;
  executableStepIds: string[];
  completedStepIds: string[];
  blockedStepIds: string[];
  failedStepIds: string[];
  activeStepId: string | null;
  currentPhase: PlanExecutionPhase;
  executionPolicyVersion: string;
  schedulerPolicyVersion: string;
  approvedCapabilities: string[];
  prohibitedCapabilities: string[];
  totalEstimatedCost: number;
  approvedCost: number;
  maximumRuntimeMs: number;
  maximumConcurrency: number;
  idempotencyKey: string;
  correlationId: string | null;
  status: PlanExecutionStatus;
  blockingReason: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
};

export type PlanStepClassification =
  | "analysis"
  | "validation"
  | "reasoning"
  | "planning_support"
  | "allocation_support"
  | "build"
  | "QA"
  | "review"
  | "snapshot"
  | "reproducibility"
  | "unsupported_external";

export type ClassifiedPlanStep = {
  stepId: string;
  stepKey: string;
  stepVersion: string;
  capabilityKey: string;
  capabilityVersion: string;
  builderKey: string | null;
  builderVersion: string | null;
  classification: PlanStepClassification;
  sideEffectClass: string;
  reviewRequirement: string;
  eligibilityStatus: "eligible" | typeof import("./constants").PLAN_STEP_ELIGIBILITY_BLOCKED_EXTERNAL;
  estimatedCost: number;
  idempotencyKey: string;
};
