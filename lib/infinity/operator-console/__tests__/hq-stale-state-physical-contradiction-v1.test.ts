import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CANONICAL_WORK_STORE_PATH,
  listCanonicalWork,
  reloadCanonicalWorkIfDiskChanged,
  resetCanonicalWorkStore,
} from "@/lib/infinity/canonical-work/store";
import { CANONICAL_WORK_EXECUTION_CONTRACT, ACTIVE_WORK_FRESHNESS_GATE } from "@/lib/infinity/canonical-work/types";
import { evaluateActiveWorkFreshnessGate } from "@/lib/infinity/canonical-work/freshness";
import { evaluateHQCommandActiveWorkConsistencyGate } from "@/lib/infinity/canonical-work/gates";
import { commitHqClientPollPayload, resetHqClientSnapshotStore } from "../hq-client-snapshot-commit";
import { acceptHqPollSnapshot, hqPollFreshnessFromSnapshot } from "../hq-poll-generation";
import {
  evaluateHQLiveRefreshGate,
  evaluateHQReconnectCatchupGate,
  HQ_CONNECTED_FRESHNESS_MS,
  HQ_LIVE_REFRESH_GATE,
  HQ_RECONNECT_CATCHUP_GATE,
  liveFreshnessIntervalMs,
} from "../hq-live-policy";
import { idleFavc1HarnessSnapshot } from "../hq-live-projection-harness";

const ROOT = join(process.cwd());

function source(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("HQ stale state physical contradiction repair v1", () => {
  let backup: string | null = null;

  afterEach(() => {
    if (backup != null && existsSync(join(ROOT, ".infinity/canonical-work"))) {
      writeFileSync(CANONICAL_WORK_STORE_PATH, backup);
    }
    backup = null;
    resetCanonicalWorkStore();
    resetHqClientSnapshotStore();
    delete process.env.INFINITY_CANONICAL_WORK_PERSIST;
  });

  it("reopens live refresh and reconnect catch-up gates", () => {
    const hook = source("components/dashboard/operator-console/use-hq-live-projection.ts");
    const store = source("lib/infinity/canonical-work/store.ts");
    const watch = source("lib/infinity/operator-console/hq-canonical-watch.ts");
    const sse = source("app/api/operator-console/hq-events/route.ts");
    const consoleUi = source("components/dashboard/operator-console/venture-operator-console.tsx");
    const commit = source("lib/infinity/operator-console/hq-client-snapshot-commit.ts");
    const favc1 = source("app/api/operator-console/favc1-cycle/route.ts");
    const liveState = source("app/api/operator-console/hq-live-state/route.ts");
    const liveStateLib = source("lib/infinity/operator-console/hq-canonical-live-state.ts");
    const refresh = evaluateHQLiveRefreshGate({
      sseRouteExists: sse.includes("text/event-stream") && sse.includes("X-Accel-Buffering"),
      snapshotReloadsDisk: store.includes("reloadCanonicalWorkIfDiskChanged") && liveStateLib.includes("reloadCanonicalWorkIfDiskChanged"),
      processLocalEventsOnly: !watch.includes("CANONICAL_DISK_CHANGED") || !sse.includes("startHqCanonicalDiskWatch") || !favc1.includes("attachHqCanonicalLiveState"),
      focusCatchUp: hook.includes("visibilitychange") && hook.includes("focus") && hook.includes("pageshow") && hook.includes("detachEventSource"),
      connectedFreshnessPoll: hook.includes("liveFreshnessIntervalMs") && liveFreshnessIntervalMs({ visible: true, realtimeConnected: true }) === HQ_CONNECTED_FRESHNESS_MS,
      catchUpAppliesSnapshot: commit.includes("CATCH_UP_RESPONSE") && consoleUi.includes("hq-live-state") && liveState.includes("loadHqCanonicalLiveState"),
    });
    const reconnect = evaluateHQReconnectCatchupGate({
      reconnectCatchUp: hook.includes('realtimeState.current = "open"') && hook.includes("catchUp"),
      visibilityCatchUp: hook.includes('document.visibilityState === "visible"'),
      diskReloadOnRead: store.includes("reloadCanonicalWorkIfDiskChanged"),
      pageshowCatchUp: hook.includes("pageshow"),
    });
    expect(refresh.gate).toBe(HQ_LIVE_REFRESH_GATE);
    expect(refresh.result).toBe("PASS");
    expect(reconnect.gate).toBe(HQ_RECONNECT_CATCHUP_GATE);
    expect(reconnect.result).toBe("PASS");
    expect(evaluateActiveWorkFreshnessGate({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      work_id: "work:test",
      mission_id: "mission:test",
      venture_id: "occupancynpv",
      work_type: "QC",
      title: "t",
      description: "t",
      stage: "QC",
      status: "ACTIVE",
      assigned_rooms: ["executive_office"],
      assigned_workers: [],
      source: "EXTERNAL_IMPLEMENTATION_AGENT",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      blocked_reason: null,
      authorization_state: null,
      progress: "x",
      latest_output: "x",
      artifact_refs: [],
      evidence_refs: [],
      parent_work_id: null,
      traceability_links: [],
      requires_infinity_worker_execution: false,
      next_expected_transition: "x",
    }).gate).toBe(ACTIVE_WORK_FRESHNESS_GATE);
    expect(evaluateHQCommandActiveWorkConsistencyGate({
      work: null,
      command_sentence: "Infinity is idle",
      infinity_state: "IDLE",
    }).result).toBe("PASS");
  });

  it("reads canonical work written by another process without resetting memory", () => {
    process.env.INFINITY_CANONICAL_WORK_PERSIST = "1";
    backup = existsSync(CANONICAL_WORK_STORE_PATH) ? readFileSync(CANONICAL_WORK_STORE_PATH, "utf8") : "";
    resetCanonicalWorkStore();
    const now = new Date().toISOString();
    mkdirSync(join(ROOT, ".infinity/canonical-work"), { recursive: true });
    writeFileSync(CANONICAL_WORK_STORE_PATH, `${JSON.stringify({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      executions: [{
        contract: CANONICAL_WORK_EXECUTION_CONTRACT,
        work_id: "work:hq:stale-state-proof",
        mission_id: "mission:hq:stale-state-proof",
        venture_id: "occupancynpv",
        work_type: "QC",
        title: "HQ stale-state proof",
        description: "Cross-process disk write",
        stage: "QC",
        status: "ACTIVE",
        assigned_rooms: ["executive_office"],
        assigned_workers: ["Venture Operator"],
        source: "EXTERNAL_IMPLEMENTATION_AGENT",
        started_at: now,
        updated_at: now,
        completed_at: null,
        blocked_reason: null,
        authorization_state: null,
        progress: "ACTIVE",
        latest_output: "written outside HQ",
        artifact_refs: [],
        evidence_refs: [],
        parent_work_id: null,
        traceability_links: [],
        requires_infinity_worker_execution: false,
        next_expected_transition: "Show in HQ without refresh",
      }],
    }, null, 2)}\n`);
    expect(reloadCanonicalWorkIfDiskChanged()).toBe(true);
    expect(listCanonicalWork().some((row) => row.work_id === "work:hq:stale-state-proof" && row.status === "ACTIVE")).toBe(true);
  });

  it("forces catch-up snapshots even when poll freshness would reject", () => {
    const first = idleFavc1HarnessSnapshot();
    first.venture = { ...first.venture, ventureAssemblyId: "favc1-cycle:stale-state-catchup" };
    first.generatedAt = "2026-09-12T20:00:00.000Z";
    first.currentActivity = { ...first.currentActivity, latestActivityAt: "2026-09-12T20:00:00.000Z" };
    const accepted = commitHqClientPollPayload({
      ventureId: first.venture.ventureAssemblyId,
      payload: first,
      requestSequence: 1,
    });
    expect(accepted.accepted).toBe(true);
    const older = {
      ...first,
      generatedAt: "2026-09-12T19:00:00.000Z",
      currentActivity: { ...first.currentActivity, latestActivityAt: "2026-09-12T18:00:00.000Z" },
    };
    const rejected = commitHqClientPollPayload({
      ventureId: first.venture.ventureAssemblyId,
      payload: older,
      requestSequence: 2,
    });
    expect(rejected.accepted).toBe(false);
    const forced = commitHqClientPollPayload({
      ventureId: first.venture.ventureAssemblyId,
      payload: older,
      requestSequence: 3,
      source: "CATCH_UP_RESPONSE",
    });
    expect(forced.accepted).toBe(true);
    expect(forced.reason).toBe("forced catch-up");
  });

  it("accepts a newer completion even when another older mission stays active", () => {
    const live = idleFavc1HarnessSnapshot();
    live.venture = { ...live.venture, ventureAssemblyId: "favc1-cycle:stale-state-complete" };
    live.generatedAt = "2026-09-13T01:20:00.000Z";
    live.currentActivity = { ...live.currentActivity, active: true, latestActivityAt: "2026-09-13T01:20:23.000Z" };
    live.currentExecution = {
      currentMission: "HQ_STALE_STATE_PHYSICAL_PROOF",
      currentPhase: "QC",
      currentStep: "HQ_LIVE_CATCHUP",
      currentRoom: "quality_control",
      currentWorker: "Validation Station",
      currentTask: "Worker proving HQ live catch-up.",
      status: "ACTIVE_WORK",
      why: "proof",
      startedAt: "2026-09-13T01:20:16.000Z",
      lastActivity: "focus",
      lastActivityAt: "2026-09-13T01:20:23.000Z",
      nextExpectedStep: null,
      blocker: null,
      authorizationRequired: null,
    };
    live.latestCompletedExecution = {
      summary: "older terminal",
      completedAt: "2026-09-10T08:27:09.437Z",
      missionType: "QUESTION_KNOWLEDGE_GRAPH_ANSWER_AUTHORITY_QC",
      missionId: "msn_qkg_answer_authority_qc_v1",
      outcome: "COMPLETED",
    };
    const applied = hqPollFreshnessFromSnapshot(live);
    const incoming = {
      ...live,
      generatedAt: "2026-09-13T01:20:26.000Z",
      currentActivity: { ...live.currentActivity, active: true, latestActivityAt: "2026-09-12T18:00:00.000Z" },
      currentExecution: {
        ...live.currentExecution!,
        currentMission: "Infinity — Global Page Depth QC + OccupancyNPV Layout Repair",
        lastActivityAt: "2026-09-12T18:00:00.000Z",
      },
      latestCompletedExecution: {
        summary: "HQ stale-state physical proof completed outside the HQ tab.",
        completedAt: "2026-09-13T01:20:26.694Z",
        missionType: "HQ_STALE_STATE_PHYSICAL_PROOF",
        missionId: "mission:hq:stale-state-physical-proof",
        outcome: "COMPLETED",
      },
    };
    incoming.commandActivity = {
      generatedAt: incoming.generatedAt,
      counts: { activeMissions: 1, blockedMissions: 0, waitingMissions: 0, authorizationRequired: 0 },
      rooms: live.commandActivity?.rooms ?? ({} as never),
      nowInspecting: incoming.currentExecution!,
      systemView: {
        missionId: "mission:hq:stale-state-physical-proof",
        engine: "quality_control",
        step: "HQ_LIVE_CATCHUP",
        workerOrProvider: null,
        artifactId: null,
        deploymentId: null,
        experimentId: null,
        traceId: null,
        startedAt: "2026-09-13T01:20:16.000Z",
        durationMs: null,
        latestEvent: "MISSION_COMPLETED",
        failureCode: null,
        costState: null,
      },
      latestCompleted: incoming.latestCompletedExecution,
      recentEvents: [],
      activeWorkers: [],
      executionClass: "VENTURE_EXECUTION",
    };
    expect(acceptHqPollSnapshot(applied, hqPollFreshnessFromSnapshot(incoming))).toBe(false);
    const completed = hqPollFreshnessFromSnapshot({
      ...incoming,
      currentExecution: {
        ...incoming.currentExecution!,
        currentWorkId: null,
        currentMission: null,
        status: "PRESENT_IDLE",
        lastActivityAt: "2026-09-13T01:20:26.694Z",
      },
      commandActivity: {
        ...incoming.commandActivity!,
        counts: { ...incoming.commandActivity!.counts, activeMissions: 0 },
        nowInspecting: {
          ...incoming.currentExecution!,
          currentWorkId: null,
          currentMission: null,
          status: "PRESENT_IDLE",
          lastActivityAt: "2026-09-13T01:20:26.694Z",
        },
      },
    });
    expect(acceptHqPollSnapshot(applied, completed)).toBe(true);
  });

  it("keeps visible live diagnostics and proof cookie for EventSource", () => {
    const bar = source("components/dashboard/operator-console/venture-command-bar.tsx");
    const hook = source("components/dashboard/operator-console/use-hq-live-projection.ts");
    expect(bar).toContain("data-hq-live-diagnostics");
    expect(bar).toContain("data-hq-sse-state");
    expect(bar).toContain("data-hq-last-event-type");
    expect(hook).toContain("HQ_LIVE_PROOF_COOKIE");
    expect(hook).toContain("HQ_REFRESH_TIMEOUT_MS");
    expect(source("app/api/operator-console/hq-events/route.ts")).toContain("startHqCanonicalDiskWatch");
  });

  it("overlays canonical live state onto a FAVC1 snapshot that omitted commandActivity", async () => {
    const { applyHqCanonicalLiveState } = await import("../hq-poll-generation");
    const { projectCommandActivity } = await import("@/lib/infinity/mission-activity/project");
    process.env.INFINITY_CANONICAL_WORK_PERSIST = "1";
    backup = existsSync(CANONICAL_WORK_STORE_PATH) ? readFileSync(CANONICAL_WORK_STORE_PATH, "utf8") : "";
    resetCanonicalWorkStore();
    const now = new Date().toISOString();
    mkdirSync(join(ROOT, ".infinity/canonical-work"), { recursive: true });
    writeFileSync(CANONICAL_WORK_STORE_PATH, `${JSON.stringify({
      contract: CANONICAL_WORK_EXECUTION_CONTRACT,
      executions: [{
        contract: CANONICAL_WORK_EXECUTION_CONTRACT,
        work_id: "work:hq:stale-state-proof",
        mission_id: "mission:hq:stale-state-proof",
        venture_id: "occupancynpv",
        work_type: "QC",
        title: "HQ stale-state proof",
        description: "Cross-process disk write",
        stage: "QC",
        status: "ACTIVE",
        assigned_rooms: ["executive_office"],
        assigned_workers: ["Venture Operator"],
        source: "EXTERNAL_IMPLEMENTATION_AGENT",
        started_at: now,
        updated_at: now,
        completed_at: null,
        blocked_reason: null,
        authorization_state: null,
        progress: "ACTIVE",
        latest_output: "written outside HQ",
        artifact_refs: [],
        evidence_refs: [],
        parent_work_id: null,
        traceability_links: [],
        requires_infinity_worker_execution: false,
        next_expected_transition: "Show in HQ without refresh",
      }],
    }, null, 2)}\n`);
    expect(reloadCanonicalWorkIfDiskChanged()).toBe(true);
    const idle = idleFavc1HarnessSnapshot();
    expect(idle.commandActivity).toBeUndefined();
    const overlay = applyHqCanonicalLiveState(idle, {
      generatedAt: now,
      commandActivity: projectCommandActivity({ includeSynthetic: false }),
    });
    expect(overlay.commandActivity?.counts.activeMissions).toBeGreaterThanOrEqual(1);
    expect(overlay.currentActivity.active).toBe(true);
  });
});
