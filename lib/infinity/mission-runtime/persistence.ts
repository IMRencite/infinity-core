import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { MISSION_RUNTIME_ENGINE_NAME, MISSION_RUNTIME_VERSION } from "./constants";
import {
  clearInMemoryMissionRuntimeStore,
  createInMemoryMissionRuntimeStore,
  type MissionRuntimeStore,
} from "./memory-store";
import { recordMissionRuntimeEvent } from "./events";
import type { MissionRuntimeInstance } from "./types";
import { parseRuntimeContext, serializeRuntimeContext } from "./types";
import type { MissionRuntimeStage, MissionRuntimeStatus } from "./constants";

type InfinitySupabase = SupabaseClient<Database>;

function mapDbInstance(row: Record<string, unknown>): MissionRuntimeInstance {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    missionId: String(row.mission_id),
    runtimeVersion: String(row.runtime_version),
    status: row.status as MissionRuntimeStatus,
    currentStage: row.current_stage as MissionRuntimeStage,
    previousStage: (row.previous_stage as MissionRuntimeStage | null) ?? null,
    stateVersion: Number(row.state_version),
    startedAt: (row.started_at as string | null) ?? null,
    lastAdvancedAt: (row.last_advanced_at as string | null) ?? null,
    pausedAt: (row.paused_at as string | null) ?? null,
    resumedAt: (row.resumed_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    failedAt: (row.failed_at as string | null) ?? null,
    cancelledAt: (row.cancelled_at as string | null) ?? null,
    wakeAt: (row.wake_at as string | null) ?? null,
    correlationId: (row.correlation_id as string | null) ?? null,
    lockedBy: (row.locked_by as string | null) ?? null,
    lockedAt: (row.locked_at as string | null) ?? null,
    leaseExpiresAt: (row.lease_expires_at as string | null) ?? null,
    heartbeatAt: (row.heartbeat_at as string | null) ?? null,
    lastError: (row.last_error as Json) ?? {},
    context: parseRuntimeContext(row.context as Json),
    metadata: (row.metadata as Json) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function createSupabaseMissionRuntimeStore(
  admin: InfinitySupabase = createAdminClient(),
): MissionRuntimeStore {
  return {
    async claimInstance({ runtimeInstanceId, organizationId, lockedBy, leaseSeconds }) {
      const { data, error } = await admin.rpc("claim_mission_runtime_instance", {
        p_runtime_instance_id: runtimeInstanceId,
        p_organization_id: organizationId,
        p_locked_by: lockedBy,
        p_lease_seconds: leaseSeconds ?? 120,
      });

      if (error || !data) {
        return null;
      }

      return mapDbInstance(data as Record<string, unknown>);
    },

    async releaseInstance({ runtimeInstanceId, organizationId, lockedBy }) {
      await admin.rpc("release_mission_runtime_instance", {
        p_runtime_instance_id: runtimeInstanceId,
        p_organization_id: organizationId,
        p_locked_by: lockedBy,
      });
    },

    async getInstance(runtimeInstanceId) {
      const { data, error } = await admin
        .from("mission_runtime_instances")
        .select("*")
        .eq("id", runtimeInstanceId)
        .maybeSingle();

      if (error || !data) return null;
      return mapDbInstance(data as Record<string, unknown>);
    },

    async getActiveInstanceForMission(missionId) {
      const { data, error } = await admin
        .from("mission_runtime_instances")
        .select("*")
        .eq("mission_id", missionId)
        .in("status", ["ready", "running", "waiting", "blocked", "paused"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return mapDbInstance(data as Record<string, unknown>);
    },

    async insertInstance({ organizationId, missionId, correlationId, startKey }) {
      const { data, error } = await admin
        .from("mission_runtime_instances")
        .insert({
          organization_id: organizationId,
          mission_id: missionId,
          runtime_version: MISSION_RUNTIME_VERSION,
          status: "running",
          current_stage: "command",
          state_version: 1,
          started_at: new Date().toISOString(),
          correlation_id: correlationId,
          context: serializeRuntimeContext({
            idempotency: { [startKey]: true },
            stageArtifacts: {},
            blockingReason: null,
            lastWorkRequestKey: null,
            recoveryNotes: [],
          }),
        })
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to insert mission runtime instance.");
      }

      return mapDbInstance(data as Record<string, unknown>);
    },

    async updateInstance(instance) {
      const { data, error } = await admin
        .from("mission_runtime_instances")
        .update({
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
        })
        .eq("id", instance.id)
        .eq("organization_id", instance.organizationId)
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to update mission runtime instance.");
      }

      return mapDbInstance(data as Record<string, unknown>);
    },

    async insertTransition(input) {
      const { data, error } = await admin
        .from("mission_runtime_transitions")
        .insert({
          organization_id: input.organizationId,
          runtime_instance_id: input.runtimeInstanceId,
          mission_id: input.missionId,
          from_stage: input.fromStage,
          to_stage: input.toStage,
          from_status: input.fromStatus,
          to_status: input.toStatus,
          transition_reason: input.transitionReason,
          transition_key: input.transitionKey,
          correlation_id: input.correlationId,
          command_decision_id: input.commandDecisionId,
          plan_id: input.planId,
          engine_job_id: input.engineJobId,
          worker_run_id: input.workerRunId,
          context_snapshot: input.contextSnapshot,
        })
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") return null;
        throw new Error(error.message);
      }

      if (!data) return null;

      return {
        id: String(data.id),
        organizationId: String(data.organization_id),
        runtimeInstanceId: String(data.runtime_instance_id),
        missionId: String(data.mission_id),
        fromStage: data.from_stage as MissionRuntimeStage | null,
        toStage: data.to_stage as MissionRuntimeStage,
        fromStatus: data.from_status as MissionRuntimeStatus | null,
        toStatus: data.to_status as MissionRuntimeStatus,
        transitionReason: String(data.transition_reason),
        transitionKey: String(data.transition_key),
        correlationId: data.correlation_id as string | null,
        commandDecisionId: data.command_decision_id as string | null,
        planId: data.plan_id as string | null,
        engineJobId: data.engine_job_id as string | null,
        workerRunId: data.worker_run_id as string | null,
        contextSnapshot: data.context_snapshot as Json,
        occurredAt: String(data.occurred_at),
      };
    },

    async insertCheckpoint(input) {
      const { data, error } = await admin
        .from("mission_runtime_checkpoints")
        .insert({
          organization_id: input.organizationId,
          runtime_instance_id: input.runtimeInstanceId,
          mission_id: input.missionId,
          checkpoint_key: input.checkpointKey,
          stage: input.stage,
          status: input.status,
          state_version: input.stateVersion,
          payload: input.payload,
        })
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") return null;
        throw new Error(error.message);
      }

      if (!data) return null;

      return {
        id: String(data.id),
        organizationId: String(data.organization_id),
        runtimeInstanceId: String(data.runtime_instance_id),
        missionId: String(data.mission_id),
        checkpointKey: String(data.checkpoint_key),
        stage: data.stage as MissionRuntimeStage,
        status: data.status as MissionRuntimeStatus,
        stateVersion: Number(data.state_version),
        payload: data.payload as Json,
        createdAt: String(data.created_at),
      };
    },

    async listTickCandidates({ organizationId, now, limit }) {
      let query = admin
        .from("mission_runtime_instances")
        .select("*")
        .in("status", ["ready", "running", "waiting", "blocked"])
        .or(`wake_at.is.null,wake_at.lte.${now}`)
        .order("last_advanced_at", { ascending: true, nullsFirst: true })
        .limit(limit);

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;
      if (error || !data) return [];
      return data.map((row) => mapDbInstance(row as Record<string, unknown>));
    },
  };
}

let defaultStore: MissionRuntimeStore | null = null;

export function getMissionRuntimeStore(options?: {
  mode?: "memory" | "supabase";
}): MissionRuntimeStore {
  if (options?.mode === "memory") {
    return createInMemoryMissionRuntimeStore();
  }

  if (process.env.MISSION_RUNTIME_STORE === "memory") {
    return createInMemoryMissionRuntimeStore();
  }

  if (!defaultStore) {
    defaultStore = createSupabaseMissionRuntimeStore();
  }

  return defaultStore;
}

export function resetMissionRuntimeStoreForTests(): void {
  defaultStore = null;
  clearInMemoryMissionRuntimeStore();
}

export function emitLocalRuntimeStarted(instance: MissionRuntimeInstance): void {
  recordMissionRuntimeEvent({
    eventType: "mission.runtime_started",
    message: "Mission runtime started.",
    payload: {
      organizationId: instance.organizationId,
      missionId: instance.missionId,
      runtimeInstanceId: instance.id,
      stage: instance.currentStage,
      status: instance.status,
      stateVersion: instance.stateVersion,
      correlationId: instance.correlationId,
    },
  });
}

export async function recordMissionRuntimeEngineEvent(
  supabase: InfinitySupabase,
  input: {
    organizationId: string;
    eventType: string;
    message: string;
    entityId: string;
    payload?: Json;
    correlationId?: string | null;
  },
): Promise<void> {
  const { recordEngineEvent } = await import("@/lib/infinity/events");
  await recordEngineEvent(supabase, {
    organizationId: input.organizationId,
    engineName: MISSION_RUNTIME_ENGINE_NAME,
    eventType: input.eventType,
    entityType: "mission_runtime_instance",
    entityId: input.entityId,
    message: input.message,
    payload: input.payload,
    correlationId: input.correlationId ?? undefined,
  });
}
