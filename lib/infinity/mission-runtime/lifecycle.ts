import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  advanceMissionRuntimeWithStore,
  type MissionRuntimeStore,
  type WorkExecutor,
} from "./memory-store";
import {
  emitLocalRuntimeStarted,
  getMissionRuntimeStore,
  recordMissionRuntimeEngineEvent,
} from "./persistence";
import { inspectMissionRuntimeStage } from "./stage-inspection";
import { observeGovernedWorkerPlanSteps } from "@/lib/infinity/workers/observe-plan-steps";
import { observeBuildFactoryBuilds } from "@/lib/infinity/build-factory/observe-builds";
import { observeBuildFactoryJobs } from "@/lib/infinity/build-factory/observe-build-jobs";
import { observePlanExecution } from "@/lib/infinity/plan-execution/observe";
import { loadGovernedReasoningMode } from "@/lib/infinity/governed-reasoning/modes";
import { scheduleReasoningAdvisoryJob } from "@/lib/infinity/governed-reasoning/jobs";
import {
  scheduleExecutiveBuildContextJob,
  scheduleExecutiveSelectionRemainderPipeline,
} from "@/lib/infinity/executive-selection/jobs";
import { resolveExecutiveContextHash } from "@/lib/infinity/executive-selection/resolve-hash";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdvanceMissionRuntimeResult, MissionRuntimeInstance, RuntimeWorkRequest } from "./types";
import { recordMissionRuntimeEvent } from "./events";
import { recordEngineEvent } from "@/lib/infinity/events";
import { DEFAULT_TICK_LIMIT } from "./constants";
import type { MissionRuntimeTickResult } from "./types";
import { MissionRuntimeStateError } from "./state-machine";

type InfinitySupabase = SupabaseClient<Database>;

export function buildDefaultWorkExecutor(supabase: InfinitySupabase): WorkExecutor {
  return {
    async executeWork(instance, work: RuntimeWorkRequest) {
      if (work.kind === "reasoning_advisory_job") {
        if (!work.opportunityId) {
          throw new Error("opportunityId required for reasoning advisory job.");
        }

        await scheduleReasoningAdvisoryJob(supabase, {
          organizationId: instance.organizationId,
          missionId: instance.missionId,
          opportunityId: work.opportunityId,
          runtimeInstanceId: instance.id,
          correlationId: instance.correlationId,
          mode: loadGovernedReasoningMode(),
          idempotencyKey: `reasoning-advisory:${instance.id}:${work.idempotencyKey}`,
        });

        return {};
      }

      if (work.kind === "executive_build_context") {
        let contextHash = work.contextHash;
        if (contextHash === "pending") {
          const admin = createAdminClient();
          contextHash = await resolveExecutiveContextHash(admin, {
            organizationId: instance.organizationId,
            missionId: instance.missionId,
            runtimeInstanceId: instance.id,
            correlationId: instance.correlationId,
          });
        }

        await scheduleExecutiveBuildContextJob(supabase, {
          organizationId: instance.organizationId,
          missionId: instance.missionId,
          runtimeInstanceId: instance.id,
          contextHash,
          correlationId: instance.correlationId,
        });
        return {};
      }

      if (work.kind === "executive_selection_remainder") {
        await scheduleExecutiveSelectionRemainderPipeline(supabase, {
          organizationId: instance.organizationId,
          missionId: instance.missionId,
          runtimeInstanceId: instance.id,
          contextHash: work.contextHash,
          executiveContextId: work.executiveContextId,
          correlationId: instance.correlationId,
        });
        return {};
      }

      if (work.kind === "run_next_job") {
        const { runNextQueuedJob } = await import("@/lib/infinity/orchestration");
        await runNextQueuedJob(supabase, instance.organizationId, "mission-runtime");
        return {};
      }

      if (work.kind === "command_discovery") {
        const { runDiscoveryCommandCycle } = await import("@/lib/infinity/orchestration");
        await runDiscoveryCommandCycle(
          supabase,
          instance.organizationId,
          "mission-runtime",
          "system",
        );
        return { inspectionPatch: { hasCompletedPlanStepJob: true } };
      }

      if (work.kind === "planner_executive_handoff") {
        const { runMissionExecutivePlannerHandoff } = await import(
          "@/lib/infinity/orchestration/mission-planner-handoff"
        );
        const result = await runMissionExecutivePlannerHandoff(supabase, {
          organizationId: instance.organizationId,
          missionId: instance.missionId,
          runtimeInstanceId: instance.id,
          correlationId: instance.correlationId,
        });

        if (result.status === "blocked") {
          await recordEngineEvent(supabase, {
            organizationId: instance.organizationId,
            engineName: "executive_engine",
            eventType: "executive.planning_handoff_blocked",
            entityType: "mission",
            entityId: instance.missionId,
            message: result.message,
            correlationId: instance.correlationId ?? undefined,
            payload: { reason: result.reason, runtime_instance_id: instance.id },
          }).catch(() => undefined);
        }

        return {};
      }

      if (work.kind === "plan_execution_begin") {
        const {
          requestPlanExecution,
          ensureDeferredExternalPlanStep,
        } = await import("@/lib/infinity/plan-execution/orchestrator");
        const result = await requestPlanExecution(
          supabase as import("@/lib/supabase/admin").AdminSupabaseClient,
          {
            organizationId: instance.organizationId,
            missionId: instance.missionId,
            runtimeInstanceId: instance.id,
            planId: work.planId,
            ventureBlueprintId: work.ventureBlueprintId,
            correlationId: instance.correlationId,
          },
        );
        if (result.status !== "blocked") {
          await ensureDeferredExternalPlanStep(
            supabase as import("@/lib/supabase/admin").AdminSupabaseClient,
            {
              organizationId: instance.organizationId,
              planId: work.planId,
              missionId: instance.missionId,
            },
          );
          return { inspectionPatch: { allocationProposalRecorded: true } };
        }
        return { skipIdempotency: true };
      }

      if (work.kind === "plan_execution_allocate") {
        const { approvePlanExecutionAllocation } = await import(
          "@/lib/infinity/plan-execution/orchestrator"
        );
        await approvePlanExecutionAllocation(
          supabase as import("@/lib/supabase/admin").AdminSupabaseClient,
          {
            organizationId: instance.organizationId,
            missionId: instance.missionId,
            opportunityId: work.opportunityId,
            planExecutionId: work.planExecutionId,
            correlationId: instance.correlationId,
          },
        );
        const { loadPlanExecutionById } = await import("@/lib/infinity/plan-execution/persistence");
        const refreshed = await loadPlanExecutionById(
          supabase as import("@/lib/supabase/admin").AdminSupabaseClient,
          instance.organizationId,
          work.planExecutionId,
        );
        if (refreshed?.status === "allocation_approved") {
          return { inspectionPatch: { allocationProposalRecorded: true } };
        }
        return { skipIdempotency: true };
      }

      if (work.kind === "plan_execution_bootstrap") {
        const {
          bootstrapPlanExecutionBuildSegment,
          ensurePlanExecutionQaStep,
        } = await import("@/lib/infinity/plan-execution/orchestrator");
        await bootstrapPlanExecutionBuildSegment(
          supabase as import("@/lib/supabase/admin").AdminSupabaseClient,
          {
            organizationId: instance.organizationId,
            missionId: instance.missionId,
            runtimeInstanceId: instance.id,
            planExecutionId: work.planExecutionId,
            correlationId: instance.correlationId,
          },
        );
        await ensurePlanExecutionQaStep(
          supabase as import("@/lib/supabase/admin").AdminSupabaseClient,
          {
            organizationId: instance.organizationId,
            planExecutionId: work.planExecutionId,
          },
        );
        return { inspectionPatch: { planExecutionBuildJobLinked: true } };
      }

      if (work.kind === "plan_execution_schedule") {
        const { schedulePlanExecutionBatch } = await import(
          "@/lib/infinity/plan-execution/orchestrator"
        );
        await schedulePlanExecutionBatch(
          supabase as import("@/lib/supabase/admin").AdminSupabaseClient,
          {
            organizationId: instance.organizationId,
            missionId: instance.missionId,
            planExecutionId: work.planExecutionId,
            maxToSchedule: 1,
          },
        );
        return {};
      }

      if (work.kind === "command_autonomous") {
        const { runAutonomousCommandCycle } = await import("@/lib/infinity/orchestration");
        await runAutonomousCommandCycle(
          supabase,
          instance.organizationId,
          "mission-runtime",
          "system",
        );

        if (instance.currentStage === "allocation") {
          return { inspectionPatch: { allocationProposalRecorded: true } };
        }

        return {};
      }

      return {};
    },
  };
}

export async function advanceMissionRuntime(input: {
  supabase: InfinitySupabase;
  organizationId: string;
  runtimeInstanceId: string;
  lockedBy: string;
  store?: MissionRuntimeStore;
}): Promise<AdvanceMissionRuntimeResult> {
  const store = input.store ?? getMissionRuntimeStore();
  const instance = await store.getInstance(input.runtimeInstanceId);
  if (!instance) {
    return { status: "skipped", reason: "Runtime instance not found.", instance: null };
  }

  const missionInspection = await inspectMissionRuntimeStage(
    input.supabase,
    input.organizationId,
    instance.missionId,
    instance.id,
  );

  await observeGovernedWorkerPlanSteps(
    input.supabase,
    input.organizationId,
    instance.missionId,
  ).catch(() => undefined);

  await observeBuildFactoryBuilds(
    input.supabase,
    input.organizationId,
    instance.missionId,
  ).catch(() => undefined);

  await observeBuildFactoryJobs(
    input.supabase as import("@/lib/supabase/admin").AdminSupabaseClient,
    input.organizationId,
    instance.missionId,
  ).catch(() => undefined);

  await observePlanExecution(
    input.supabase as import("@/lib/supabase/admin").AdminSupabaseClient,
    input.organizationId,
    instance.missionId,
  ).catch(() => undefined);

  const result = await advanceMissionRuntimeWithStore({
    store,
    runtimeInstanceId: input.runtimeInstanceId,
    organizationId: input.organizationId,
    lockedBy: input.lockedBy,
    inspection: missionInspection,
    workExecutor: buildDefaultWorkExecutor(input.supabase),
  });

  if (result.instance && result.status !== "skipped") {
    await recordMissionRuntimeEngineEvent(input.supabase, {
      organizationId: input.organizationId,
      eventType: `mission.runtime_${result.status}`,
      message: result.message,
      entityId: result.instance.id,
      correlationId: result.instance.correlationId,
    }).catch(() => undefined);
  }

  return result;
}

export async function runMissionRuntimeTick(input: {
  supabase: InfinitySupabase;
  organizationId?: string;
  limit?: number;
  now?: string;
  lockedBy?: string;
  store?: MissionRuntimeStore;
}): Promise<MissionRuntimeTickResult> {
  const store = input.store ?? getMissionRuntimeStore();
  const now = input.now ?? new Date().toISOString();
  const limit = input.limit ?? DEFAULT_TICK_LIMIT;
  const lockedBy = input.lockedBy ?? "mission-runtime-tick";

  const candidates = await store.listTickCandidates({
    organizationId: input.organizationId,
    now,
    limit,
  });

  const results: MissionRuntimeTickResult["results"] = [];

  for (const candidate of candidates) {
    try {
      const advance = await advanceMissionRuntime({
        supabase: input.supabase,
        organizationId: candidate.organizationId,
        runtimeInstanceId: candidate.id,
        lockedBy,
        store,
      });

      results.push({
        runtimeInstanceId: candidate.id,
        missionId: candidate.missionId,
        status: advance.status,
        message: "message" in advance ? advance.message : advance.reason,
      });
    } catch (error) {
      results.push({
        runtimeInstanceId: candidate.id,
        missionId: candidate.missionId,
        status: "error",
        message: error instanceof Error ? error.message : "Tick failed.",
      });
    }
  }

  recordMissionRuntimeEvent({
    eventType: "mission.tick_completed",
    message: `Processed ${results.length} mission runtime candidates.`,
    payload: {
      organizationId: input.organizationId ?? "all",
      missionId: "batch",
      runtimeInstanceId: "batch",
      stage: "command",
      status: "running",
      stateVersion: 0,
      reason: `processed=${results.length}`,
    },
  });

  return { processed: results.length, results };
}

export async function startMissionRuntime(input: {
  supabase: InfinitySupabase;
  organizationId: string;
  missionId: string;
  correlationId?: string;
  store?: MissionRuntimeStore;
}): Promise<{ status: "created" | "existing"; instance: MissionRuntimeInstance }> {
  const store = input.store ?? getMissionRuntimeStore();
  const existing = await store.getActiveInstanceForMission(input.missionId);

  if (existing) {
    return { status: "existing", instance: existing };
  }

  const correlationId = input.correlationId ?? crypto.randomUUID();
  const startKey = `runtime_start:${input.missionId}`;

  const instance = await store.insertInstance({
    organizationId: input.organizationId,
    missionId: input.missionId,
    correlationId,
    startKey,
  });

  emitLocalRuntimeStarted(instance);

  await recordMissionRuntimeEngineEvent(input.supabase, {
    organizationId: input.organizationId,
    eventType: "mission.runtime_started",
    message: "Mission runtime started.",
    entityId: instance.id,
    correlationId,
  }).catch(() => undefined);

  return { status: "created", instance };
}

export async function pauseMissionRuntime(input: {
  organizationId: string;
  runtimeInstanceId: string;
  reason: string;
  store?: MissionRuntimeStore;
}): Promise<MissionRuntimeInstance> {
  const store = input.store ?? getMissionRuntimeStore();
  const instance = await store.getInstance(input.runtimeInstanceId);

  if (!instance || instance.organizationId !== input.organizationId) {
    throw new MissionRuntimeStateError("Runtime instance not found.");
  }

  const updated = await store.updateInstance({
    ...instance,
    status: "paused",
    pausedAt: new Date().toISOString(),
    context: { ...instance.context, blockingReason: input.reason },
  });

  recordMissionRuntimeEvent({
    eventType: "mission.runtime_paused",
    message: input.reason,
    payload: {
      organizationId: updated.organizationId,
      missionId: updated.missionId,
      runtimeInstanceId: updated.id,
      stage: updated.currentStage,
      status: updated.status,
      stateVersion: updated.stateVersion,
      reason: input.reason,
    },
  });

  return updated;
}

export async function resumeMissionRuntime(input: {
  organizationId: string;
  runtimeInstanceId: string;
  store?: MissionRuntimeStore;
}): Promise<MissionRuntimeInstance> {
  const store = input.store ?? getMissionRuntimeStore();
  const instance = await store.getInstance(input.runtimeInstanceId);

  if (!instance || instance.organizationId !== input.organizationId) {
    throw new MissionRuntimeStateError("Runtime instance not found.");
  }

  if (instance.status !== "paused") {
    throw new MissionRuntimeStateError("Runtime is not paused.");
  }

  const updated = await store.updateInstance({
    ...instance,
    status: "running",
    resumedAt: new Date().toISOString(),
    wakeAt: null,
  });

  recordMissionRuntimeEvent({
    eventType: "mission.runtime_resumed",
    message: "Mission runtime resumed.",
    payload: {
      organizationId: updated.organizationId,
      missionId: updated.missionId,
      runtimeInstanceId: updated.id,
      stage: updated.currentStage,
      status: updated.status,
      stateVersion: updated.stateVersion,
    },
  });

  return updated;
}

export async function cancelMissionRuntime(input: {
  organizationId: string;
  runtimeInstanceId: string;
  reason: string;
  store?: MissionRuntimeStore;
}): Promise<MissionRuntimeInstance> {
  const store = input.store ?? getMissionRuntimeStore();
  const instance = await store.getInstance(input.runtimeInstanceId);

  if (!instance || instance.organizationId !== input.organizationId) {
    throw new MissionRuntimeStateError("Runtime instance not found.");
  }

  const updated = await store.updateInstance({
    ...instance,
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
    context: { ...instance.context, blockingReason: input.reason },
  });

  await store.insertTransition({
    organizationId: updated.organizationId,
    runtimeInstanceId: updated.id,
    missionId: updated.missionId,
    fromStage: updated.currentStage,
    toStage: updated.currentStage,
    fromStatus: instance.status,
    toStatus: "cancelled",
    transitionReason: input.reason,
    transitionKey: `cancel:v${updated.stateVersion}`,
    correlationId: updated.correlationId,
    commandDecisionId: null,
    planId: null,
    engineJobId: null,
    workerRunId: null,
    contextSnapshot: {},
  });

  recordMissionRuntimeEvent({
    eventType: "mission.runtime_cancelled",
    message: input.reason,
    payload: {
      organizationId: updated.organizationId,
      missionId: updated.missionId,
      runtimeInstanceId: updated.id,
      stage: updated.currentStage,
      status: updated.status,
      stateVersion: updated.stateVersion,
      reason: input.reason,
    },
  });

  return updated;
}

export async function getMissionRuntimeState(input: {
  organizationId: string;
  missionId: string;
  store?: MissionRuntimeStore;
}): Promise<MissionRuntimeInstance | null> {
  const store = input.store ?? getMissionRuntimeStore();
  const instance = await store.getActiveInstanceForMission(input.missionId);
  if (!instance || instance.organizationId !== input.organizationId) {
    return null;
  }
  return instance;
}

export async function recoverMissionRuntime(input: {
  organizationId: string;
  runtimeInstanceId: string;
  lockedBy: string;
  store?: MissionRuntimeStore;
}): Promise<MissionRuntimeInstance> {
  const store = input.store ?? getMissionRuntimeStore();
  const instance = await store.getInstance(input.runtimeInstanceId);

  if (!instance || instance.organizationId !== input.organizationId) {
    throw new MissionRuntimeStateError("Runtime instance not found.");
  }

  const leaseExpired =
    instance.leaseExpiresAt !== null && instance.leaseExpiresAt <= new Date().toISOString();

  const updated = await store.updateInstance({
    ...instance,
    lockedBy: leaseExpired ? null : instance.lockedBy,
    lockedAt: leaseExpired ? null : instance.lockedAt,
    leaseExpiresAt: leaseExpired ? null : instance.leaseExpiresAt,
    status: instance.status === "waiting" ? "running" : instance.status,
    context: {
      ...instance.context,
      recoveryNotes: [
        ...instance.context.recoveryNotes,
        leaseExpired ? "Recovered expired lease." : "Recovery inspected durable state.",
      ],
    },
  });

  recordMissionRuntimeEvent({
    eventType: "mission.runtime_recovered",
    message: "Mission runtime recovery completed.",
    payload: {
      organizationId: updated.organizationId,
      missionId: updated.missionId,
      runtimeInstanceId: updated.id,
      stage: updated.currentStage,
      status: updated.status,
      stateVersion: updated.stateVersion,
    },
  });

  return updated;
}

export async function checkpointMissionRuntime(input: {
  organizationId: string;
  runtimeInstanceId: string;
  checkpointKey: string;
  payload?: Record<string, unknown>;
  store?: MissionRuntimeStore;
}) {
  const store = input.store ?? getMissionRuntimeStore();
  const instance = await store.getInstance(input.runtimeInstanceId);

  if (!instance || instance.organizationId !== input.organizationId) {
    throw new MissionRuntimeStateError("Runtime instance not found.");
  }

  return store.insertCheckpoint({
    organizationId: instance.organizationId,
    runtimeInstanceId: instance.id,
    missionId: instance.missionId,
    checkpointKey: input.checkpointKey,
    stage: instance.currentStage,
    status: instance.status,
    stateVersion: instance.stateVersion,
    payload: (input.payload ?? {}) as import("@/lib/supabase/database.types").Json,
  });
}
