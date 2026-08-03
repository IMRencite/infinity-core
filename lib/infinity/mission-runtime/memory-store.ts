import type { Json } from "@/lib/supabase/database.types";
import {
  DEFAULT_LEASE_SECONDS,
  MISSION_RUNTIME_VERSION,
  type MissionRuntimeStage,
  type MissionRuntimeStatus,
} from "./constants";
import {
  assertStageTransitionAllowed,
  assertStatusTransitionAllowed,
  canAdvanceRuntime,
  statusForStageOutcome,
} from "./state-machine";
import type {
  AdvanceMissionRuntimeResult,
  MissionRuntimeCheckpoint,
  MissionRuntimeContext,
  MissionRuntimeInstance,
  MissionRuntimeTransition,
  RuntimeWorkRequest,
  StageInspectionSnapshot,
} from "./types";
import {
  emptyRuntimeContext,
  parseRuntimeContext,
  serializeRuntimeContext,
} from "./types";
import { evaluateStage } from "./stage-handlers";
import {
  eventTypeForOutcome,
  recordMissionRuntimeEvent,
} from "./events";

export type MissionRuntimeStore = {
  claimInstance(input: {
    runtimeInstanceId: string;
    organizationId: string;
    lockedBy: string;
    leaseSeconds?: number;
  }): Promise<MissionRuntimeInstance | null>;
  releaseInstance(input: {
    runtimeInstanceId: string;
    organizationId: string;
    lockedBy: string;
  }): Promise<void>;
  getInstance(runtimeInstanceId: string): Promise<MissionRuntimeInstance | null>;
  getActiveInstanceForMission(missionId: string): Promise<MissionRuntimeInstance | null>;
  insertInstance(input: {
    organizationId: string;
    missionId: string;
    correlationId: string;
    startKey: string;
  }): Promise<MissionRuntimeInstance>;
  updateInstance(instance: MissionRuntimeInstance): Promise<MissionRuntimeInstance>;
  insertTransition(
    transition: Omit<MissionRuntimeTransition, "id" | "occurredAt">,
  ): Promise<MissionRuntimeTransition | null>;
  insertCheckpoint(
    checkpoint: Omit<MissionRuntimeCheckpoint, "id" | "createdAt">,
  ): Promise<MissionRuntimeCheckpoint | null>;
  listTickCandidates(input: {
    organizationId?: string;
    now: string;
    limit: number;
  }): Promise<MissionRuntimeInstance[]>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function mapRowToInstance(row: Record<string, unknown>): MissionRuntimeInstance {
  return {
    id: String(row.id),
    organizationId: String(row.organizationId ?? row.organization_id),
    missionId: String(row.missionId ?? row.mission_id),
    runtimeVersion: String(row.runtimeVersion ?? row.runtime_version ?? MISSION_RUNTIME_VERSION),
    status: row.status as MissionRuntimeStatus,
    currentStage: (row.currentStage ?? row.current_stage) as MissionRuntimeStage,
    previousStage: (row.previousStage ?? row.previous_stage ?? null) as MissionRuntimeStage | null,
    stateVersion: Number(row.stateVersion ?? row.state_version ?? 1),
    startedAt: (row.startedAt ?? row.started_at ?? null) as string | null,
    lastAdvancedAt: (row.lastAdvancedAt ?? row.last_advanced_at ?? null) as string | null,
    pausedAt: (row.pausedAt ?? row.paused_at ?? null) as string | null,
    resumedAt: (row.resumedAt ?? row.resumed_at ?? null) as string | null,
    completedAt: (row.completedAt ?? row.completed_at ?? null) as string | null,
    failedAt: (row.failedAt ?? row.failed_at ?? null) as string | null,
    cancelledAt: (row.cancelledAt ?? row.cancelled_at ?? null) as string | null,
    wakeAt: (row.wakeAt ?? row.wake_at ?? null) as string | null,
    correlationId: (row.correlationId ?? row.correlation_id ?? null) as string | null,
    lockedBy: (row.lockedBy ?? row.locked_by ?? null) as string | null,
    lockedAt: (row.lockedAt ?? row.locked_at ?? null) as string | null,
    leaseExpiresAt: (row.leaseExpiresAt ?? row.lease_expires_at ?? null) as string | null,
    heartbeatAt: (row.heartbeatAt ?? row.heartbeat_at ?? null) as string | null,
    lastError: (row.lastError ?? row.last_error ?? {}) as Json,
    context: parseRuntimeContext((row.context ?? {}) as Json),
    metadata: (row.metadata ?? {}) as Json,
    createdAt: String(row.createdAt ?? row.created_at ?? nowIso()),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? nowIso()),
  };
}

const instances = new Map<string, Record<string, unknown>>();
const transitions: MissionRuntimeTransition[] = [];
const checkpoints: MissionRuntimeCheckpoint[] = [];

export function clearInMemoryMissionRuntimeStore(): void {
  instances.clear();
  transitions.length = 0;
  checkpoints.length = 0;
}

export function createInMemoryMissionRuntimeStore(): MissionRuntimeStore {
  return {
    async claimInstance({ runtimeInstanceId, organizationId, lockedBy, leaseSeconds }) {
      const row = instances.get(runtimeInstanceId);
      if (!row) return null;
      if (String(row.organization_id) !== organizationId) return null;

      const status = row.status as MissionRuntimeStatus;
      if (status === "paused" || status === "cancelled" || status === "completed" || status === "failed" || status === "archived") {
        return null;
      }

      const leaseExpiresAt = row.lease_expires_at as string | null;
      const lockedByExisting = row.locked_by as string | null;
      if (
        lockedByExisting &&
        leaseExpiresAt &&
        leaseExpiresAt > nowIso() &&
        lockedByExisting !== lockedBy
      ) {
        return null;
      }

      const lease = leaseSeconds ?? DEFAULT_LEASE_SECONDS;
      row.locked_by = lockedBy;
      row.locked_at = nowIso();
      row.heartbeat_at = nowIso();
      row.lease_expires_at = new Date(Date.now() + lease * 1000).toISOString();
      row.updated_at = nowIso();
      instances.set(runtimeInstanceId, row);
      return mapRowToInstance(row);
    },

    async releaseInstance({ runtimeInstanceId, organizationId, lockedBy }) {
      const row = instances.get(runtimeInstanceId);
      if (!row || String(row.organization_id) !== organizationId) return;
      if (row.locked_by && row.locked_by !== lockedBy) return;
      row.locked_by = null;
      row.locked_at = null;
      row.lease_expires_at = null;
      row.updated_at = nowIso();
    },

    async getInstance(runtimeInstanceId) {
      const row = instances.get(runtimeInstanceId);
      return row ? mapRowToInstance(row) : null;
    },

    async getActiveInstanceForMission(missionId) {
      for (const row of instances.values()) {
        if (String(row.mission_id) !== missionId) continue;
        const status = row.status as MissionRuntimeStatus;
        if (["ready", "running", "waiting", "blocked", "paused"].includes(status)) {
          return mapRowToInstance(row);
        }
      }
      return null;
    },

    async insertInstance({ organizationId, missionId, correlationId, startKey }) {
      const existing = await this.getActiveInstanceForMission(missionId);
      if (existing) {
        throw new Error("Active mission runtime already exists.");
      }

      const id = crypto.randomUUID();
      const row: Record<string, unknown> = {
        id,
        organization_id: organizationId,
        mission_id: missionId,
        runtime_version: MISSION_RUNTIME_VERSION,
        status: "running",
        current_stage: "command",
        previous_stage: null,
        state_version: 1,
        started_at: nowIso(),
        last_advanced_at: null,
        correlation_id: correlationId,
        context: serializeRuntimeContext({
          ...emptyRuntimeContext(),
          idempotency: { [startKey]: true },
        }),
        metadata: {},
        last_error: {},
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      instances.set(id, row);
      return mapRowToInstance(row);
    },

    async updateInstance(instance) {
      const row: Record<string, unknown> = {
        id: instance.id,
        organization_id: instance.organizationId,
        mission_id: instance.missionId,
        runtime_version: instance.runtimeVersion,
        status: instance.status,
        current_stage: instance.currentStage,
        previous_stage: instance.previousStage,
        state_version: instance.stateVersion,
        started_at: instance.startedAt,
        last_advanced_at: instance.lastAdvancedAt,
        paused_at: instance.pausedAt,
        resumed_at: instance.resumedAt,
        completed_at: instance.completedAt,
        failed_at: instance.failedAt,
        cancelled_at: instance.cancelledAt,
        wake_at: instance.wakeAt,
        correlation_id: instance.correlationId,
        locked_by: instance.lockedBy,
        locked_at: instance.lockedAt,
        lease_expires_at: instance.leaseExpiresAt,
        heartbeat_at: instance.heartbeatAt,
        last_error: instance.lastError,
        context: serializeRuntimeContext(instance.context),
        metadata: instance.metadata,
        created_at: instance.createdAt,
        updated_at: nowIso(),
      };
      instances.set(instance.id, row);
      return mapRowToInstance(row);
    },

    async insertTransition(input) {
      if (
        transitions.some(
          (t) =>
            t.runtimeInstanceId === input.runtimeInstanceId &&
            t.transitionKey === input.transitionKey,
        )
      ) {
        return null;
      }

      const transition: MissionRuntimeTransition = {
        ...input,
        id: crypto.randomUUID(),
        occurredAt: nowIso(),
      };
      transitions.push(transition);
      return transition;
    },

    async insertCheckpoint(input) {
      if (
        checkpoints.some(
          (c) =>
            c.runtimeInstanceId === input.runtimeInstanceId &&
            c.checkpointKey === input.checkpointKey,
        )
      ) {
        return null;
      }

      const checkpoint: MissionRuntimeCheckpoint = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: nowIso(),
      };
      checkpoints.push(checkpoint);
      return checkpoint;
    },

    async listTickCandidates({ organizationId, now, limit }) {
      const rows = [...instances.values()].filter((row) => {
        if (organizationId && String(row.organization_id) !== organizationId) return false;
        const status = row.status as MissionRuntimeStatus;
        if (!["ready", "running", "waiting", "blocked"].includes(status)) return false;
        const wakeAt = row.wake_at as string | null;
        if (wakeAt && wakeAt > now) return false;
        return true;
      });

      return rows.slice(0, limit).map((row) => mapRowToInstance(row));
    },
  };
}

export function listInMemoryMissionRuntimeTransitions(): MissionRuntimeTransition[] {
  return [...transitions];
}

export function listInMemoryMissionRuntimeCheckpoints(): MissionRuntimeCheckpoint[] {
  return [...checkpoints];
}

export type WorkExecutor = {
  executeWork(
    instance: MissionRuntimeInstance,
    work: RuntimeWorkRequest,
  ): Promise<{ contextPatch?: Partial<MissionRuntimeContext>; inspectionPatch?: Partial<StageInspectionSnapshot> }>;
};

export async function advanceMissionRuntimeWithStore(input: {
  store: MissionRuntimeStore;
  runtimeInstanceId: string;
  organizationId: string;
  lockedBy: string;
  inspection: StageInspectionSnapshot;
  workExecutor?: WorkExecutor;
}): Promise<AdvanceMissionRuntimeResult> {
  const claimed = await input.store.claimInstance({
    runtimeInstanceId: input.runtimeInstanceId,
    organizationId: input.organizationId,
    lockedBy: input.lockedBy,
  });

  if (!claimed) {
    return {
      status: "skipped",
      reason: "Unable to claim runtime instance.",
      instance: null,
    };
  }

  try {
    let instance = claimed;

    if (!canAdvanceRuntime(instance.status)) {
      return {
        status: "skipped",
        reason: `Runtime status ${instance.status} cannot advance.`,
        instance,
      };
    }

    let inspection = { ...input.inspection };
    let evaluation = evaluateStage(instance, inspection);

    if (evaluation.workRequest.kind !== "none" && input.workExecutor) {
      const key = evaluation.workRequest.idempotencyKey;

      if (key && !instance.context.idempotency[key]) {
        const result = await input.workExecutor.executeWork(instance, evaluation.workRequest);
        instance = {
          ...instance,
          context: {
            ...instance.context,
            ...result.contextPatch,
            idempotency: {
              ...instance.context.idempotency,
              ...(key ? { [key]: true } : {}),
            },
            lastWorkRequestKey: key,
          },
        };
        inspection = { ...inspection, ...result.inspectionPatch };
        evaluation = evaluateStage(instance, inspection);
      }
    }

    const outcome = evaluation.outcome;

    if (outcome.kind === "wait") {
      const nextStatus = statusForStageOutcome("wait");
      assertStatusTransitionAllowed(instance.status, nextStatus);
      instance = await input.store.updateInstance({
        ...instance,
        status: nextStatus,
        wakeAt: outcome.wakeAt ?? null,
        context: {
          ...instance.context,
          blockingReason: outcome.reason,
        },
      });

      recordMissionRuntimeEvent({
        eventType: "mission.stage_waiting",
        message: outcome.reason,
        payload: {
          organizationId: instance.organizationId,
          missionId: instance.missionId,
          runtimeInstanceId: instance.id,
          stage: instance.currentStage,
          status: instance.status,
          stateVersion: instance.stateVersion,
          correlationId: instance.correlationId,
          reason: outcome.reason,
        },
      });

      return { status: "waiting", instance, message: outcome.reason };
    }

    if (outcome.kind === "block") {
      instance = await input.store.updateInstance({
        ...instance,
        status: "blocked",
        context: { ...instance.context, blockingReason: outcome.reason },
      });

      recordMissionRuntimeEvent({
        eventType: "mission.runtime_blocked",
        message: outcome.reason,
        payload: {
          organizationId: instance.organizationId,
          missionId: instance.missionId,
          runtimeInstanceId: instance.id,
          stage: instance.currentStage,
          status: instance.status,
          stateVersion: instance.stateVersion,
          reason: outcome.reason,
        },
      });

      return { status: "blocked", instance, message: outcome.reason };
    }

    if (outcome.kind === "fail") {
      instance = await input.store.updateInstance({
        ...instance,
        status: "failed",
        failedAt: nowIso(),
        lastError: { message: outcome.reason } as Json,
      });

      return { status: "failed", instance, message: outcome.reason };
    }

    if (outcome.kind === "complete") {
      const transitionKey = `complete:${instance.stateVersion}`;
      const transition = await input.store.insertTransition({
        organizationId: instance.organizationId,
        runtimeInstanceId: instance.id,
        missionId: instance.missionId,
        fromStage: instance.currentStage,
        toStage: "completed",
        fromStatus: instance.status,
        toStatus: "completed",
        transitionReason: outcome.reason,
        transitionKey,
        correlationId: instance.correlationId,
        commandDecisionId: null,
        planId: null,
        engineJobId: null,
        workerRunId: null,
        contextSnapshot: serializeRuntimeContext(instance.context) as Json,
      });

      instance = await input.store.updateInstance({
        ...instance,
        status: "completed",
        currentStage: "completed",
        previousStage: instance.currentStage,
        completedAt: nowIso(),
        stateVersion: instance.stateVersion + 1,
        lastAdvancedAt: nowIso(),
      });

      if (transition) {
        await input.store.insertCheckpoint({
          organizationId: instance.organizationId,
          runtimeInstanceId: instance.id,
          missionId: instance.missionId,
          checkpointKey: `stage:completed:${instance.stateVersion}`,
          stage: "completed",
          status: "completed",
          stateVersion: instance.stateVersion,
          payload: { transitionKey } as Json,
        });
      }

      recordMissionRuntimeEvent({
        eventType: "mission.runtime_completed",
        message: outcome.reason,
        payload: {
          organizationId: instance.organizationId,
          missionId: instance.missionId,
          runtimeInstanceId: instance.id,
          stage: "completed",
          status: "completed",
          stateVersion: instance.stateVersion,
          transitionKey,
        },
      });

      return {
        status: "advanced",
        instance,
        transition: transition ?? {
          id: "duplicate",
          organizationId: instance.organizationId,
          runtimeInstanceId: instance.id,
          missionId: instance.missionId,
          fromStage: "review",
          toStage: "completed",
          fromStatus: "running",
          toStatus: "completed",
          transitionReason: outcome.reason,
          transitionKey,
          correlationId: instance.correlationId,
          commandDecisionId: null,
          planId: null,
          engineJobId: null,
          workerRunId: null,
          contextSnapshot: {},
          occurredAt: nowIso(),
        },
        message: outcome.reason,
      };
    }

    assertStageTransitionAllowed(instance.currentStage, outcome.nextStage);
    const nextStatus = statusForStageOutcome("advance");
    assertStatusTransitionAllowed(instance.status, nextStatus);

    const transitionKey = `stage:${instance.currentStage}->${outcome.nextStage}:v${instance.stateVersion}`;
    const transition = await input.store.insertTransition({
      organizationId: instance.organizationId,
      runtimeInstanceId: instance.id,
      missionId: instance.missionId,
      fromStage: instance.currentStage,
      toStage: outcome.nextStage,
      fromStatus: instance.status,
      toStatus: nextStatus,
      transitionReason: outcome.reason,
      transitionKey,
      correlationId: instance.correlationId,
      commandDecisionId: evaluation.related?.commandDecisionId ?? null,
      planId: evaluation.related?.planId ?? null,
      engineJobId: evaluation.related?.engineJobId ?? null,
      workerRunId: evaluation.related?.workerRunId ?? null,
      contextSnapshot: serializeRuntimeContext(instance.context) as Json,
    });

    if (!transition) {
      return {
        status: "unchanged",
        instance,
        message: "Transition already recorded (idempotent).",
      };
    }

    instance = await input.store.updateInstance({
      ...instance,
      previousStage: instance.currentStage,
      currentStage: outcome.nextStage,
      status: nextStatus,
      stateVersion: instance.stateVersion + 1,
      lastAdvancedAt: nowIso(),
      wakeAt: null,
      context: { ...instance.context, blockingReason: null },
    });

    await input.store.insertCheckpoint({
      organizationId: instance.organizationId,
      runtimeInstanceId: instance.id,
      missionId: instance.missionId,
      checkpointKey: `stage:${outcome.nextStage}:v${instance.stateVersion}`,
      stage: outcome.nextStage,
      status: instance.status,
      stateVersion: instance.stateVersion,
      payload: { transitionKey, reason: outcome.reason } as Json,
    });

    recordMissionRuntimeEvent({
      eventType: eventTypeForOutcome("advanced"),
      message: outcome.reason,
      payload: {
        organizationId: instance.organizationId,
        missionId: instance.missionId,
        runtimeInstanceId: instance.id,
        stage: instance.currentStage,
        status: instance.status,
        stateVersion: instance.stateVersion,
        transitionKey,
        correlationId: instance.correlationId,
      },
    });

    return {
      status: "advanced",
      instance,
      transition,
      message: outcome.reason,
    };
  } finally {
    await input.store.releaseInstance({
      runtimeInstanceId: input.runtimeInstanceId,
      organizationId: input.organizationId,
      lockedBy: input.lockedBy,
    });
  }
}
