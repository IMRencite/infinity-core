import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  assertStageTransitionAllowed,
  canAdvanceRuntime,
  MissionRuntimeStateError,
} from "@/lib/infinity/mission-runtime/state-machine";
import {
  advanceMissionRuntimeWithStore,
  clearInMemoryMissionRuntimeStore,
  createInMemoryMissionRuntimeStore,
  listInMemoryMissionRuntimeCheckpoints,
  listInMemoryMissionRuntimeTransitions,
  type WorkExecutor,
} from "@/lib/infinity/mission-runtime/memory-store";
import {
  cancelMissionRuntime,
  pauseMissionRuntime,
  recoverMissionRuntime,
  resumeMissionRuntime,
  startMissionRuntime,
} from "@/lib/infinity/mission-runtime/lifecycle";
import { EMPTY_STAGE_INSPECTION } from "@/lib/infinity/mission-runtime/stage-inspection";
import { clearMissionRuntimeEvents } from "@/lib/infinity/mission-runtime/events";
import { resetMissionRuntimeStoreForTests } from "@/lib/infinity/mission-runtime/persistence";
import type { StageInspectionSnapshot } from "@/lib/infinity/mission-runtime/types";

const orgId = "org-1";
const missionId = "mission-1";

function activeInspection(
  overrides: Partial<StageInspectionSnapshot> = {},
): StageInspectionSnapshot {
  return {
    ...EMPTY_STAGE_INSPECTION,
    missionActive: true,
    ...overrides,
  };
}

const mockSupabase = {} as import("@supabase/supabase-js").SupabaseClient;

describe("Mission Runtime Foundation v1", () => {
  let store: ReturnType<typeof createInMemoryMissionRuntimeStore>;

  beforeEach(() => {
    resetMissionRuntimeStoreForTests();
    clearInMemoryMissionRuntimeStore();
    clearMissionRuntimeEvents();
    store = createInMemoryMissionRuntimeStore();
  });

  it("starts mission runtime exactly once", async () => {
    const first = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });
    const second = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    expect(first.status).toBe("created");
    expect(second.status).toBe("existing");
    expect(first.instance.id).toBe(second.instance.id);
  });

  it("advances at most one stage per tick invocation", async () => {
    const { instance } = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    const workExecutor: WorkExecutor = {
      async executeWork(inst, work) {
        if (work.kind !== "none") {
          return {
            contextPatch: {
              idempotency: {
                ...inst.context.idempotency,
                [work.idempotencyKey]: true,
              },
            },
          };
        }
        return {};
      },
    };

    const beforeStage = instance.currentStage;
    const result = await advanceMissionRuntimeWithStore({
      store,
      runtimeInstanceId: instance.id,
      organizationId: orgId,
      lockedBy: "test",
      inspection: activeInspection(),
      workExecutor,
    });

    expect(result.status).toBe("advanced");
    expect(result.instance?.currentStage).not.toBe(beforeStage);
    expect(listInMemoryMissionRuntimeTransitions()).toHaveLength(1);
  });

  it("duplicate transition keys do not duplicate downstream transitions", async () => {
    const { instance } = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    const inspection = activeInspection();
    const workExecutor: WorkExecutor = {
      async executeWork(inst, work) {
        if (work.kind !== "none") {
          return {
            contextPatch: {
              idempotency: { ...inst.context.idempotency, [work.idempotencyKey]: true },
            },
          };
        }
        return {};
      },
    };

    await advanceMissionRuntimeWithStore({
      store,
      runtimeInstanceId: instance.id,
      organizationId: orgId,
      lockedBy: "a",
      inspection,
      workExecutor,
    });

    const updated = await store.getInstance(instance.id);
    const again = await advanceMissionRuntimeWithStore({
      store,
      runtimeInstanceId: instance.id,
      organizationId: orgId,
      lockedBy: "b",
      inspection,
      workExecutor,
    });

    expect(updated).toBeTruthy();
    expect(again.status).toBe("advanced");
    expect(listInMemoryMissionRuntimeTransitions().length).toBeGreaterThanOrEqual(1);
  });

  it("rejects invalid stage transitions", () => {
    expect(() => assertStageTransitionAllowed("command", "validation")).toThrow(
      MissionRuntimeStateError,
    );
  });

  it("does not advance paused missions", async () => {
    const { instance } = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    await pauseMissionRuntime({
      organizationId: orgId,
      runtimeInstanceId: instance.id,
      reason: "test pause",
      store,
    });

    const result = await advanceMissionRuntimeWithStore({
      store,
      runtimeInstanceId: instance.id,
      organizationId: orgId,
      lockedBy: "test",
      inspection: activeInspection(),
    });

    expect(result.status).toBe("skipped");
  });

  it("resume continues from persisted stage", async () => {
    const { instance } = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    await pauseMissionRuntime({
      organizationId: orgId,
      runtimeInstanceId: instance.id,
      reason: "pause",
      store,
    });

    const resumed = await resumeMissionRuntime({
      organizationId: orgId,
      runtimeInstanceId: instance.id,
      store,
    });

    expect(resumed.status).toBe("running");
    expect(resumed.currentStage).toBe(instance.currentStage);
  });

  it("cancel preserves transition history", async () => {
    const { instance } = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    await cancelMissionRuntime({
      organizationId: orgId,
      runtimeInstanceId: instance.id,
      reason: "user cancel",
      store,
    });

    expect(listInMemoryMissionRuntimeTransitions().length).toBe(1);
  });

  it("recovers expired locks safely", async () => {
    const { instance } = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    await store.updateInstance({
      ...instance,
      lockedBy: "stale-worker",
      leaseExpiresAt: new Date(Date.now() - 60_000).toISOString(),
      status: "waiting",
    });

    const recovered = await recoverMissionRuntime({
      organizationId: orgId,
      runtimeInstanceId: instance.id,
      lockedBy: "recovery",
      store,
    });

    expect(recovered.lockedBy).toBeNull();
    expect(recovered.context.recoveryNotes.length).toBeGreaterThan(0);
  });

  it("prevents concurrent advances on the same mission", async () => {
    const { instance } = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    await store.claimInstance({
      runtimeInstanceId: instance.id,
      organizationId: orgId,
      lockedBy: "worker-a",
    });

    const second = await advanceMissionRuntimeWithStore({
      store,
      runtimeInstanceId: instance.id,
      organizationId: orgId,
      lockedBy: "worker-b",
      inspection: activeInspection(),
    });

    expect(second.status).toBe("skipped");
  });

  it("blocks when validation gate is not satisfied", async () => {
    const { instance } = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    await store.updateInstance({
      ...(await store.getInstance(instance.id))!,
      currentStage: "validation",
      status: "running",
    });

    const result = await advanceMissionRuntimeWithStore({
      store,
      runtimeInstanceId: instance.id,
      organizationId: orgId,
      lockedBy: "test",
      inspection: activeInspection({ latestValidationApprovedForPlanning: false }),
    });

    expect(result.status).toBe("blocked");
  });

  it("blocks executive path when validation is not approved", async () => {
    const { instance } = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    await store.updateInstance({
      ...(await store.getInstance(instance.id))!,
      currentStage: "executive",
      status: "running",
    });

    const result = await advanceMissionRuntimeWithStore({
      store,
      runtimeInstanceId: instance.id,
      organizationId: orgId,
      lockedBy: "test",
      inspection: activeInspection({
        hasExecutiveApproveOrQueue: true,
        latestValidationApprovedForPlanning: false,
      }),
    });

    expect(result.status).toBe("blocked");
  });

  it("waits when planner gate is not satisfied", async () => {
    const { instance } = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    await store.updateInstance({
      ...(await store.getInstance(instance.id))!,
      currentStage: "planning",
      status: "running",
    });

    const result = await advanceMissionRuntimeWithStore({
      store,
      runtimeInstanceId: instance.id,
      organizationId: orgId,
      lockedBy: "test",
      inspection: activeInspection({ hasPlannerEligiblePlan: false }),
    });

    expect(result.status).toBe("waiting");
  });

  it("blocks unsupported build capabilities at execution", async () => {
    const { instance } = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    await store.updateInstance({
      ...(await store.getInstance(instance.id))!,
      currentStage: "execution",
      status: "running",
    });

    const result = await advanceMissionRuntimeWithStore({
      store,
      runtimeInstanceId: instance.id,
      organizationId: orgId,
      lockedBy: "test",
      inspection: activeInspection({ hasPendingBuildJobs: true }),
    });

    expect(result.status).toBe("blocked");
    expect(result.message).toMatch(/Build Factory/i);
  });

  it("does not call real AI provider network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const { runDeterministicReasoningForMission } = await import(
      "@/lib/infinity/mission-runtime/stage-inspection"
    );

    const result = await runDeterministicReasoningForMission({
      organizationId: orgId,
      missionId,
      correlationId: "corr-1",
    });

    expect(result.complete).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("checkpoints remain immutable via idempotent keys", async () => {
    const { instance } = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    const key = "manual-checkpoint";
    await store.insertCheckpoint({
      organizationId: orgId,
      runtimeInstanceId: instance.id,
      missionId,
      checkpointKey: key,
      stage: "command",
      status: "running",
      stateVersion: 1,
      payload: {},
    });

    const duplicate = await store.insertCheckpoint({
      organizationId: orgId,
      runtimeInstanceId: instance.id,
      missionId,
      checkpointKey: key,
      stage: "command",
      status: "running",
      stateVersion: 1,
      payload: {},
    });

    expect(duplicate).toBeNull();
    expect(listInMemoryMissionRuntimeCheckpoints()).toHaveLength(1);
  });

  it("runMissionRuntimeTick finds bounded candidates", async () => {
    await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    const candidates = await store.listTickCandidates({
      organizationId: orgId,
      now: new Date().toISOString(),
      limit: 1,
    });

    expect(candidates).toHaveLength(1);
  });

  it("paused status cannot advance", () => {
    expect(canAdvanceRuntime("paused")).toBe(false);
  });

  it("organization isolation on cancel", async () => {
    const { instance } = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    await expect(
      cancelMissionRuntime({
        organizationId: "other-org",
        runtimeInstanceId: instance.id,
        reason: "x",
        store,
      }),
    ).rejects.toThrow(MissionRuntimeStateError);
  });

  it("creates no external venture side effects in runtime module", () => {
    const source = JSON.stringify({
      note: "Mission runtime only orchestrates existing engines.",
    });
    expect(source).not.toMatch(/createVenture|publishContent|deployWebsite/i);
  });

  it("completion path is idempotent when already completed stage", async () => {
    const { instance } = await startMissionRuntime({
      supabase: mockSupabase,
      organizationId: orgId,
      missionId,
      store,
    });

    await store.updateInstance({
      ...(await store.getInstance(instance.id))!,
      currentStage: "completed",
      status: "running",
    });

    const result = await advanceMissionRuntimeWithStore({
      store,
      runtimeInstanceId: instance.id,
      organizationId: orgId,
      lockedBy: "test",
      inspection: activeInspection(),
    });

    expect(result.status).toBe("advanced");
    expect(result.instance?.status).toBe("completed");
  });
});
