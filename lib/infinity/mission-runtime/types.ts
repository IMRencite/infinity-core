import type { Json } from "@/lib/supabase/database.types";
import type {
  MissionRuntimeStage,
  MissionRuntimeStatus,
} from "./constants";

export type MissionRuntimeContext = {
  idempotency: Record<string, boolean>;
  stageArtifacts: Record<string, Json>;
  blockingReason: string | null;
  lastWorkRequestKey: string | null;
  recoveryNotes: string[];
};

export type MissionRuntimeInstance = {
  id: string;
  organizationId: string;
  missionId: string;
  runtimeVersion: string;
  status: MissionRuntimeStatus;
  currentStage: MissionRuntimeStage;
  previousStage: MissionRuntimeStage | null;
  stateVersion: number;
  startedAt: string | null;
  lastAdvancedAt: string | null;
  pausedAt: string | null;
  resumedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  wakeAt: string | null;
  correlationId: string | null;
  lockedBy: string | null;
  lockedAt: string | null;
  leaseExpiresAt: string | null;
  heartbeatAt: string | null;
  lastError: Json;
  context: MissionRuntimeContext;
  metadata: Json;
  createdAt: string;
  updatedAt: string;
};

export type MissionRuntimeTransition = {
  id: string;
  organizationId: string;
  runtimeInstanceId: string;
  missionId: string;
  fromStage: MissionRuntimeStage | null;
  toStage: MissionRuntimeStage;
  fromStatus: MissionRuntimeStatus | null;
  toStatus: MissionRuntimeStatus;
  transitionReason: string;
  transitionKey: string;
  correlationId: string | null;
  commandDecisionId: string | null;
  planId: string | null;
  engineJobId: string | null;
  workerRunId: string | null;
  contextSnapshot: Json;
  occurredAt: string;
};

export type MissionRuntimeCheckpoint = {
  id: string;
  organizationId: string;
  runtimeInstanceId: string;
  missionId: string;
  checkpointKey: string;
  stage: MissionRuntimeStage;
  status: MissionRuntimeStatus;
  stateVersion: number;
  payload: Json;
  createdAt: string;
};

export type StageHandlerOutcome =
  | { kind: "advance"; nextStage: MissionRuntimeStage; reason: string }
  | { kind: "wait"; reason: string; wakeAt?: string | null }
  | { kind: "block"; reason: string }
  | { kind: "fail"; reason: string }
  | { kind: "complete"; reason: string };

export type RuntimeWorkRequest =
  | {
      kind: "command_autonomous";
      idempotencyKey: string;
    }
  | {
      kind: "command_discovery";
      idempotencyKey: string;
    }
  | {
      kind: "run_next_job";
      idempotencyKey: string;
    }
  | {
      kind: "reasoning_advisory_job";
      idempotencyKey: string;
      opportunityId: string;
    }
  | {
      kind: "executive_build_context";
      idempotencyKey: string;
      contextHash: string;
    }
  | {
      kind: "executive_selection_remainder";
      idempotencyKey: string;
      contextHash: string;
      executiveContextId: string;
    }
  | {
      kind: "planner_executive_handoff";
      idempotencyKey: string;
    }
  | { kind: "none" };

export type StageEvaluation = {
  outcome: StageHandlerOutcome;
  workRequest: RuntimeWorkRequest;
  related?: {
    commandDecisionId?: string | null;
    planId?: string | null;
    engineJobId?: string | null;
    workerRunId?: string | null;
  };
};

export type MissionRuntimeEventPayload = {
  organizationId: string;
  missionId: string;
  runtimeInstanceId: string;
  stage: MissionRuntimeStage;
  status: MissionRuntimeStatus;
  stateVersion: number;
  transitionKey?: string | null;
  correlationId?: string | null;
  planId?: string | null;
  engineJobId?: string | null;
  workerRunId?: string | null;
  reason?: string | null;
};

export type AdvanceMissionRuntimeResult =
  | {
      status: "advanced";
      instance: MissionRuntimeInstance;
      transition: MissionRuntimeTransition;
      message: string;
    }
  | {
      status: "waiting" | "blocked" | "unchanged" | "failed";
      instance: MissionRuntimeInstance;
      message: string;
    }
  | {
      status: "skipped";
      reason: string;
      instance: MissionRuntimeInstance | null;
    };

export type MissionRuntimeTickResult = {
  processed: number;
  results: Array<{
    runtimeInstanceId: string;
    missionId: string;
    status: AdvanceMissionRuntimeResult["status"] | "error";
    message: string;
  }>;
};

export type StageInspectionSnapshot = {
  missionActive: boolean;
  hasPendingDiscoveryJobs: boolean;
  hasPendingDecisionJobs: boolean;
  hasPendingValidationJobs: boolean;
  hasPendingExecutiveJobs: boolean;
  hasPendingBuildJobs: boolean;
  latestValidationRunCompleted: boolean;
  latestValidationApprovedForPlanning: boolean;
  hasExecutiveApproveOrQueue: boolean;
  hasExecutiveRejectOrDefer: boolean;
  hasPlannerEligiblePlan: boolean;
  hasCompletedPlanStepJob: boolean;
  hasDeterministicReasoningComplete: boolean;
  hasPendingReasoningJobs: boolean;
  hasCompletedGovernedReasoningSession: boolean;
  governedReasoningMode: string;
  hasExecutiveContext: boolean;
  hasExecutiveSelectionQaPassed: boolean;
  hasExecutiveSelectionPlanningEligible: boolean;
  hasExecutiveEscalationPending: boolean;
  canonicalExecutiveSelectionDecisionId: string | null;
  plannerHandoffPlanId: string | null;
  plannerHandoffBlocker: string | null;
  executiveContextId: string | null;
  executiveContextHash: string | null;
  allocationProposalRecorded: boolean;
  primaryOpportunityId: string | null;
  hasPendingWorkerCapabilityJobs: boolean;
  hasWorkerResultsAwaitingReview: boolean;
  hasCompletedReviewedWorkerResults: boolean;
};

export function emptyRuntimeContext(): MissionRuntimeContext {
  return {
    idempotency: {},
    stageArtifacts: {},
    blockingReason: null,
    lastWorkRequestKey: null,
    recoveryNotes: [],
  };
}

export function parseRuntimeContext(raw: Json | undefined): MissionRuntimeContext {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return emptyRuntimeContext();
  }

  const record = raw as Record<string, unknown>;
  const idempotency =
    typeof record.idempotency === "object" &&
    record.idempotency !== null &&
    !Array.isArray(record.idempotency)
      ? (record.idempotency as Record<string, boolean>)
      : {};

  const stageArtifacts =
    typeof record.stageArtifacts === "object" &&
    record.stageArtifacts !== null &&
    !Array.isArray(record.stageArtifacts)
      ? (record.stageArtifacts as Record<string, Json>)
      : {};

  return {
    idempotency,
    stageArtifacts,
    blockingReason:
      typeof record.blockingReason === "string" ? record.blockingReason : null,
    lastWorkRequestKey:
      typeof record.lastWorkRequestKey === "string" ? record.lastWorkRequestKey : null,
    recoveryNotes: Array.isArray(record.recoveryNotes)
      ? record.recoveryNotes.filter((v): v is string => typeof v === "string")
      : [],
  };
}

export function serializeRuntimeContext(context: MissionRuntimeContext): Json {
  return context as unknown as Json;
}
