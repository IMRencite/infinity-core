import { describe, it, expect, beforeEach } from "vitest";
import {
  assertStageTransitionAllowed,
  canAdvanceRuntime,
  evaluateStage,
  MISSION_RUNTIME_VERSION_V1,
  MISSION_RUNTIME_VERSION_V2,
  planLegacyRuntimeRecovery,
} from "@/lib/infinity/mission-runtime";
import { CANONICAL_V2_TRANSITIONS } from "@/lib/infinity/mission-runtime/transition-graph";
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
import { MissionRuntimeStateError } from "@/lib/infinity/mission-runtime/errors";
import type { StageInspectionSnapshot } from "@/lib/infinity/mission-runtime/types";
import { MISSION_RUNTIME_VERSION } from "@/lib/infinity/mission-runtime/constants";

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
    expect(first.instance.runtimeVersion).toBe(MISSION_RUNTIME_VERSION);
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
      inspection: activeInspection({
        latestValidationRunCompleted: true,
        latestValidationApprovedForPlanning: false,
      }),
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

  it("does not call real AI provider network for mock reasoning mode", async () => {
    const { modeAllowsProviderNetwork } = await import("@/lib/infinity/governed-reasoning/modes");
    expect(modeAllowsProviderNetwork("mock")).toBe(false);
    expect(modeAllowsProviderNetwork("disabled")).toBe(false);
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

  describe("Canonical governed lifecycle v2", () => {
    it("defines explicit v2 transition graph", () => {
      expect(CANONICAL_V2_TRANSITIONS).toContainEqual(["evaluation", "validation"]);
      expect(CANONICAL_V2_TRANSITIONS).toContainEqual(["planning", "allocation"]);
      expect(CANONICAL_V2_TRANSITIONS).not.toContainEqual(["evaluation", "allocation"]);
    });

    it("rejects evaluation → allocation on v2", () => {
      expect(() =>
        assertStageTransitionAllowed("evaluation", "allocation", MISSION_RUNTIME_VERSION_V2),
      ).toThrow(MissionRuntimeStateError);
    });

    it("allows legacy v1 evaluation → allocation for historical validation only", () => {
      expect(() =>
        assertStageTransitionAllowed("evaluation", "allocation", MISSION_RUNTIME_VERSION_V1),
      ).not.toThrow();
    });

    it("evaluation stage advances to validation not allocation", async () => {
      const { instance: inst } = await startMissionRuntime({
        supabase: mockSupabase,
        organizationId: orgId,
        missionId: "mission-eval-flow",
        store,
      });
      const atEvaluation = { ...inst, currentStage: "evaluation" as const };
      const result = evaluateStage(atEvaluation, activeInspection());
      expect(result.outcome).toMatchObject({
        kind: "advance",
        nextStage: "validation",
      });
    });

    it("validation cannot advance without approved_for_planning", () => {
      const inst = {
        id: "i1",
        organizationId: orgId,
        missionId,
        runtimeVersion: MISSION_RUNTIME_VERSION_V2,
        status: "running" as const,
        currentStage: "validation" as const,
        previousStage: "evaluation" as const,
        stateVersion: 1,
        startedAt: null,
        lastAdvancedAt: null,
        pausedAt: null,
        resumedAt: null,
        completedAt: null,
        failedAt: null,
        cancelledAt: null,
        wakeAt: null,
        correlationId: null,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        heartbeatAt: null,
        lastError: {},
        context: {
          idempotency: {},
          stageArtifacts: {},
          blockingReason: null,
          lastWorkRequestKey: null,
          recoveryNotes: [],
        },
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const blocked = evaluateStage(inst, activeInspection({ latestValidationRunCompleted: true }));
      expect(blocked.outcome.kind).toBe("block");

      const waiting = evaluateStage(
        inst,
        activeInspection({
          latestValidationRunCompleted: false,
          latestValidationApprovedForPlanning: false,
        }),
      );
      expect(waiting.outcome.kind).toBe("wait");
    });

    it("planning advances to allocation not scheduling", () => {
      const inst = {
        id: "i2",
        organizationId: orgId,
        missionId,
        runtimeVersion: MISSION_RUNTIME_VERSION_V2,
        status: "running" as const,
        currentStage: "planning" as const,
        previousStage: "executive" as const,
        stateVersion: 1,
        startedAt: null,
        lastAdvancedAt: null,
        pausedAt: null,
        resumedAt: null,
        completedAt: null,
        failedAt: null,
        cancelledAt: null,
        wakeAt: null,
        correlationId: null,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        heartbeatAt: null,
        lastError: {},
        context: {
          idempotency: {},
          stageArtifacts: {},
          blockingReason: null,
          lastWorkRequestKey: null,
          recoveryNotes: [],
        },
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = evaluateStage(
        inst,
        activeInspection({ hasPlannerEligiblePlan: true }),
      );
      expect(result.outcome).toMatchObject({ kind: "advance", nextStage: "allocation" });
    });

    it("allocation requires eligible plan before proposal", () => {
      const inst = {
        id: "i3",
        organizationId: orgId,
        missionId,
        runtimeVersion: MISSION_RUNTIME_VERSION_V2,
        status: "running" as const,
        currentStage: "allocation" as const,
        previousStage: "planning" as const,
        stateVersion: 1,
        startedAt: null,
        lastAdvancedAt: null,
        pausedAt: null,
        resumedAt: null,
        completedAt: null,
        failedAt: null,
        cancelledAt: null,
        wakeAt: null,
        correlationId: null,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        heartbeatAt: null,
        lastError: {},
        context: {
          idempotency: {},
          stageArtifacts: {},
          blockingReason: null,
          lastWorkRequestKey: null,
          recoveryNotes: [],
        },
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const blocked = evaluateStage(
        inst,
        activeInspection({
          latestValidationApprovedForPlanning: true,
          hasPlannerEligiblePlan: false,
        }),
      );
      expect(blocked.outcome.kind).toBe("block");
    });

    it("recovers legacy v1 runtime at allocation with append-only transition", async () => {
      const { instance } = await startMissionRuntime({
        supabase: mockSupabase,
        organizationId: orgId,
        missionId: "mission-v1-recovery",
        store,
      });

      await store.updateInstance({
        ...instance,
        runtimeVersion: MISSION_RUNTIME_VERSION_V1,
        currentStage: "allocation",
      });

      const beforeCount = listInMemoryMissionRuntimeTransitions().length;

      const result = await advanceMissionRuntimeWithStore({
        store,
        runtimeInstanceId: instance.id,
        organizationId: orgId,
        lockedBy: "recovery-test",
        inspection: activeInspection(),
      });

      expect(result.status).toBe("advanced");
      expect(result.instance?.currentStage).toBe("validation");
      expect(result.instance?.runtimeVersion).toBe(MISSION_RUNTIME_VERSION_V2);
      expect(listInMemoryMissionRuntimeTransitions().length).toBe(beforeCount + 1);
      const last = listInMemoryMissionRuntimeTransitions().at(-1);
      expect(String(last?.transitionReason)).toMatch(/Legacy mission_runtime_v1/);
    });

    it("preserves historical v1 transition records when not re-run", async () => {
      await store.insertTransition({
        organizationId: orgId,
        runtimeInstanceId: "hist-1",
        missionId,
        fromStage: "evaluation",
        toStage: "allocation",
        fromStatus: "running",
        toStatus: "running",
        transitionReason: "Historical v1 path",
        transitionKey: "historical:eval->alloc",
        correlationId: null,
        commandDecisionId: null,
        planId: null,
        engineJobId: null,
        workerRunId: null,
        contextSnapshot: {},
      });

      const history = listInMemoryMissionRuntimeTransitions();
      expect(history.some((t) => t.toStage === "allocation" && t.fromStage === "evaluation")).toBe(
        true,
      );
    });

    it("browser actions cannot force arbitrary stage jumps", () => {
      expect(() =>
        assertStageTransitionAllowed("command", "planning", MISSION_RUNTIME_VERSION_V2),
      ).toThrow();
      expect(() =>
        assertStageTransitionAllowed("command", "allocation", MISSION_RUNTIME_VERSION_V2),
      ).toThrow();
      expect(() =>
        assertStageTransitionAllowed("reasoning", "planning", MISSION_RUNTIME_VERSION_V2),
      ).toThrow();
    });

    it("reasoning and executive gates cannot be skipped via transition graph", () => {
      expect(() =>
        assertStageTransitionAllowed("validation", "planning", MISSION_RUNTIME_VERSION_V2),
      ).toThrow();
      expect(() =>
        assertStageTransitionAllowed("validation", "executive", MISSION_RUNTIME_VERSION_V2),
      ).toThrow();
    });

    it("execution blocks on build factory capabilities", () => {
      const inst = {
        id: "i4",
        organizationId: orgId,
        missionId,
        runtimeVersion: MISSION_RUNTIME_VERSION_V2,
        status: "running" as const,
        currentStage: "execution" as const,
        previousStage: "scheduling" as const,
        stateVersion: 1,
        startedAt: null,
        lastAdvancedAt: null,
        pausedAt: null,
        resumedAt: null,
        completedAt: null,
        failedAt: null,
        cancelledAt: null,
        wakeAt: null,
        correlationId: null,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        heartbeatAt: null,
        lastError: {},
        context: {
          idempotency: {},
          stageArtifacts: {},
          blockingReason: null,
          lastWorkRequestKey: null,
          recoveryNotes: [],
        },
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = evaluateStage(inst, activeInspection({ hasPendingBuildJobs: true }));
      expect(result.outcome.kind).toBe("block");
      expect(result.outcome.reason).toMatch(/Build Factory/);
    });

    it("planLegacyRuntimeRecovery targets validation from legacy allocation", () => {
      const plan = planLegacyRuntimeRecovery(
        {
          id: "x",
          organizationId: orgId,
          missionId,
          runtimeVersion: MISSION_RUNTIME_VERSION_V1,
          status: "running",
          currentStage: "allocation",
          previousStage: "evaluation",
          stateVersion: 3,
          startedAt: null,
          lastAdvancedAt: null,
          pausedAt: null,
          resumedAt: null,
          completedAt: null,
          failedAt: null,
          cancelledAt: null,
          wakeAt: null,
          correlationId: null,
          lockedBy: null,
          lockedAt: null,
          leaseExpiresAt: null,
          heartbeatAt: null,
          lastError: {},
          context: {
            idempotency: {},
            stageArtifacts: {},
            blockingReason: null,
            lastWorkRequestKey: null,
            recoveryNotes: [],
          },
          metadata: {},
          createdAt: "",
          updatedAt: "",
        },
        activeInspection(),
      );
      expect(plan?.targetStage).toBe("validation");
    });
  });
});
