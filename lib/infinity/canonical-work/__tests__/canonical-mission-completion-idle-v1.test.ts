import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { subscribeHqRuntimeEvents, resetHqRuntimeEventsForTests } from "@/lib/infinity/operator-console/hq-live-events";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { evaluateRoomMissionConsistencyGate } from "@/lib/infinity/room-work/gates";
import { resolveAgentCurrentTask, resolveRoomCurrentWork } from "@/lib/infinity/room-work/resolver";
import {
  CANONICAL_WORK_EXECUTION_CONTRACT,
  IMPLEMENTATION_WORK_IDLE_AFTER_MS,
  HQ_CURRENT_IMPLEMENTATION_WORK_ID,
  completeObservedImplementationWork,
  evaluateActiveRunCountTruthGate,
  evaluateActiveWorkTerminalStateGate,
  evaluateCanonicalMissionCompletionGate,
  evaluateCurrentCanonicalWorkResolverGate,
  evaluateExternalImplementationAgentExecutionGate,
  evaluateHQLiveWorkSurfaceConsistencyGate,
  evaluateHQNoRefreshCompletionPropagationGate,
  evaluateNamedMissionTerminalCondition,
  idleCurrentImplementationWorkIfQuiet,
  closeCanonicalNamedMission,
  listCanonicalWork,
  projectCanonicalLatestVentureWork,
  projectRecentVentureWorkHistory,
  pulseCurrentImplementationWork,
  recordVerifiedMissionMilestone,
  resetCanonicalMissionCompletionState,
  resetCanonicalWorkStore,
  resetImplementationSession,
  resolveCanonicalMissionCompletions,
  resolveCurrentCanonicalWork,
  upsertCanonicalWork,
  workersFromCanonicalWork,
  type CanonicalWorkExecutionContract,
} from "..";
import { liveCodingFromCurrent } from "../mission-completion-gates";

function source(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

function namedMission(
  partial: Partial<CanonicalWorkExecutionContract> & Pick<CanonicalWorkExecutionContract, "work_id" | "title" | "status">,
): CanonicalWorkExecutionContract {
  const now = partial.updated_at ?? "2026-09-14T20:00:00.000Z";
  return upsertCanonicalWork({
    contract: CANONICAL_WORK_EXECUTION_CONTRACT,
    mission_id: `mission:${partial.work_id}`,
    venture_id: CRE_VENTURE_ID,
    work_type: "ECONOMICS",
    description: partial.title,
    stage: "TREASURY / POLICY / QC",
    assigned_rooms: ["operations", "systems_architect", "quality_control"],
    assigned_workers: ["Venture Operator", "Systems Architect", "Validation Station"],
    source: "EXTERNAL_IMPLEMENTATION_AGENT",
    started_at: now,
    updated_at: now,
    completed_at: partial.status === "COMPLETED" || partial.status === "FAILED" || partial.status === "CANCELLED" ? now : null,
    blocked_reason: null,
    authorization_state: null,
    progress: partial.status,
    latest_output: partial.title,
    artifact_refs: [],
    evidence_refs: [],
    parent_work_id: null,
    traceability_links: [partial.work_id],
    requires_infinity_worker_execution: false,
    classification: "VENTURE_FINANCIAL",
    next_expected_transition: "FOUNDER_SPEND_AUTHORITY_RECHECK_REQUIRED",
    ...partial,
  });
}

describe("Canonical mission completion + idle propagation v1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
    resetImplementationSession();
    resetCanonicalMissionCompletionState();
    resetHqRuntimeEventsForTests();
  });

  afterEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
    resetImplementationSession();
    resetCanonicalMissionCompletionState();
    resetHqRuntimeEventsForTests();
  });

  it("1-3: named ACTIVE mission lights Command, assigned rooms, and assigned agent", () => {
    const work = namedMission({
      work_id: "work:occupancynpv:governed-venture-spend-authority-v1",
      title: "OccupancyNPV Governed Venture Spend Authority V1",
      status: "ACTIVE",
    });
    const current = resolveCurrentCanonicalWork();
    const view = projectCommandActivity({ organizationId: "org_hq_live" });
    expect(current.status).toBe("ACTIVE");
    expect(view.nowInspecting.status).toBe("ACTIVE_WORK");
    expect(view.nowInspecting.currentMission).toBe(work.title);
    expect(view.rooms.systems_architect.status).toBe("ACTIVE_WORK");
    expect(view.rooms.quality_control.status).toBe("ACTIVE_WORK");
    expect(view.rooms.opportunity_lab.status).not.toBe("ACTIVE_WORK");
    const agent = resolveAgentCurrentTask({
      work,
      roomId: "systems_architect",
      agentName: "Systems Architect",
      agentId: "agent:systems",
    });
    expect(agent.task_summary).toBeTruthy();
    expect(workersFromCanonicalWork(work).some((row) => row.room === "systems_architect")).toBe(true);
    expect(liveCodingFromCurrent().agent_status).toBe("ACTIVE");
    expect(
      evaluateRoomMissionConsistencyGate({
        missionId: work.mission_id,
        rooms: [resolveRoomCurrentWork(work, "systems_architect"), resolveRoomCurrentWork(work, "quality_control")],
      }).result,
    ).toBe("PASS");
  });

  it("4-9: named mission COMPLETED leaves Current Work and idles Command, rooms, Cursor, and runs", () => {
    const work = namedMission({
      work_id: "work:occupancynpv:governed-venture-spend-authority-v1",
      title: "OccupancyNPV Governed Venture Spend Authority V1",
      status: "ACTIVE",
    });
    recordVerifiedMissionMilestone({
      work_id: work.work_id,
      milestone_id: "occupancynpv-governed-venture-spend-authority-v1",
      qc_status: "QC_PASS",
      at: "2026-09-14T20:01:00.000Z",
    });
    const decision = evaluateNamedMissionTerminalCondition(work);
    const closed = resolveCanonicalMissionCompletions("2026-09-14T20:01:00.000Z");
    const current = resolveCurrentCanonicalWork("2026-09-14T20:01:00.000Z");
    const view = projectCommandActivity({ organizationId: "org_hq_live" });
    const coding = liveCodingFromCurrent("2026-09-14T20:01:00.000Z");
    const latest = projectCanonicalLatestVentureWork(CRE_VENTURE_ID);
    expect(closed[0]?.status).toBe("COMPLETED");
    expect(current.work).toBeNull();
    expect(current.status).toBe("IDLE");
    expect(view.nowInspecting.currentMission).toBeNull();
    expect(view.nowInspecting.status).not.toBe("ACTIVE_WORK");
    expect(view.counts.activeMissions).toBe(0);
    expect(view.rooms.systems_architect.status).not.toBe("ACTIVE_WORK");
    expect(view.rooms.quality_control.status).not.toBe("ACTIVE_WORK");
    expect(view.rooms.executive_office?.status).not.toBe("ACTIVE_WORK");
    expect(view.rooms.operations?.status).not.toBe("ACTIVE_WORK");
    expect(coding.agent_status).toBe("PRESENT_IDLE");
    expect(coding.active_runs).toBe(0);
    expect(coding.connector).toBe("NOT_CONNECTED");
    expect(latest?.work_id).toBe(work.work_id);
    expect(latest?.status).toBe("COMPLETED");
    expect(evaluateCanonicalMissionCompletionGate({ work, decision, after: closed[0] ?? null }).result).toBe("PASS");
    expect(evaluateActiveWorkTerminalStateGate({ work: closed[0] ?? null, current }).result).toBe("PASS");
    expect(evaluateCurrentCanonicalWorkResolverGate({ current, expected_work_id: null }).result).toBe("PASS");
    expect(evaluateExternalImplementationAgentExecutionGate({ current, agent_status: coding.agent_status }).result).toBe("PASS");
    expect(evaluateActiveRunCountTruthGate({ current, active_runs: coding.active_runs }).result).toBe("PASS");
    expect(
      evaluateHQLiveWorkSurfaceConsistencyGate({
        command: { work_id: current.work_id, status: current.status, mission: current.mission_title },
        floor: { work_id: current.work_id, status: current.status, mission: current.mission_title },
      }).result,
    ).toBe("PASS");
  });

  it("10: another simultaneous ACTIVE mission prevents global idle", () => {
    namedMission({
      work_id: "work:occupancynpv:governed-venture-spend-authority-v1",
      title: "OccupancyNPV Governed Venture Spend Authority V1",
      status: "ACTIVE",
      updated_at: "2026-09-14T20:00:00.000Z",
    });
    namedMission({
      work_id: "work:occupancynpv:other-active-mission",
      title: "OccupancyNPV Other Active Mission",
      status: "ACTIVE",
      updated_at: "2026-09-14T20:00:30.000Z",
    });
    recordVerifiedMissionMilestone({
      work_id: "work:occupancynpv:governed-venture-spend-authority-v1",
      milestone_id: "occupancynpv-governed-venture-spend-authority-v1",
      qc_status: "QC_PASS",
      at: "2026-09-14T20:01:00.000Z",
    });
    resolveCanonicalMissionCompletions("2026-09-14T20:01:00.000Z");
    const current = resolveCurrentCanonicalWork("2026-09-14T20:01:00.000Z");
    const view = projectCommandActivity({ organizationId: "org_hq_live" });
    expect(current.work_id).toBe("work:occupancynpv:other-active-mission");
    expect(view.nowInspecting.status).toBe("ACTIVE_WORK");
    expect(view.nowInspecting.currentMission).toBe("OccupancyNPV Other Active Mission");
  });

  it("11-13: generic implementation pulse, stop/sessionEnd, and 15s recovery remain", () => {
    const started = pulseCurrentImplementationWork({
      title: "INFINITY — CANONICAL MISSION COMPLETION + IDLE PROPAGATION V1",
      file: "lib/infinity/canonical-work/mission-completion.ts",
      now: "2026-09-14T20:10:00.000Z",
    });
    expect(started?.work_id).toBe(HQ_CURRENT_IMPLEMENTATION_WORK_ID);
    expect(resolveCurrentCanonicalWork("2026-09-14T20:10:00.000Z").status).toBe("ACTIVE");
    expect(projectCommandActivity({ organizationId: "org_hq_live" }).nowInspecting.status).toBe("ACTIVE_WORK");
    completeObservedImplementationWork("Implementation turn ended · IDLE", "2026-09-14T20:10:05.000Z");
    expect(resolveCurrentCanonicalWork("2026-09-14T20:10:05.000Z").status).toBe("IDLE");

    pulseCurrentImplementationWork({
      title: "INFINITY — CANONICAL MISSION COMPLETION + IDLE PROPAGATION V1",
      file: "lib/infinity/canonical-work/mission-completion.ts",
      now: "2026-09-14T20:11:00.000Z",
    });
    expect(idleCurrentImplementationWorkIfQuiet("2026-09-14T20:11:14.000Z")).toBeNull();
    expect(resolveCurrentCanonicalWork("2026-09-14T20:11:14.000Z").status).toBe("ACTIVE");
    idleCurrentImplementationWorkIfQuiet("2026-09-14T20:11:16.000Z");
    expect(resolveCurrentCanonicalWork("2026-09-14T20:11:16.000Z").status).toBe("IDLE");
    expect(IMPLEMENTATION_WORK_IDLE_AFTER_MS).toBe(15_000);
    expect(source("lib/infinity/operator-console/hq-canonical-live-state.ts")).not.toContain("idleCurrentImplementationWorkIfQuiet");
    expect(source("lib/infinity/operator-console/hq-canonical-watch.ts")).toContain("idleCurrentImplementationWorkIfQuiet");
  });

  it("14: named mission does not complete from the 15-second timer", () => {
    const work = namedMission({
      work_id: "work:occupancynpv:named-no-timer",
      title: "Named mission still executing",
      status: "ACTIVE",
      updated_at: "2026-09-14T20:12:00.000Z",
    });
    expect(idleCurrentImplementationWorkIfQuiet("2026-09-14T20:12:16.000Z")).toBeNull();
    expect(resolveCurrentCanonicalWork("2026-09-14T20:12:16.000Z").work_id).toBe(work.work_id);
    expect(evaluateNamedMissionTerminalCondition(work).should_close).toBe(false);
    expect(source("lib/infinity/canonical-work/mission-completion.ts")).not.toContain("IMPLEMENTATION_WORK_IDLE_AFTER_MS");
  });

  it("15: completion publishes SSE events without requiring a refresh", () => {
    const events: Array<{ type: string }> = [];
    const unsubscribe = subscribeHqRuntimeEvents((event) => events.push({ type: event.type }));
    const work = namedMission({
      work_id: "work:occupancynpv:governed-venture-spend-authority-v1",
      title: "OccupancyNPV Governed Venture Spend Authority V1",
      status: "ACTIVE",
    });
    const before = resolveCurrentCanonicalWork();
    closeCanonicalNamedMission({
      work_id: work.work_id,
      output: "Verified spend authority · COMPLETED",
      now: "2026-09-14T20:13:00.000Z",
    });
    const after = resolveCurrentCanonicalWork("2026-09-14T20:13:00.000Z");
    const view = projectCommandActivity({ organizationId: "org_hq_live" });
    unsubscribe();
    expect(
      evaluateHQNoRefreshCompletionPropagationGate({
        events,
        before_current_id: before.work_id,
        after_current_id: after.work_id,
        after_command_status: view.nowInspecting.status,
      }).result,
    ).toBe("PASS");
    expect(events.some((event) => event.type === "MISSION_COMPLETED")).toBe(true);
    expect(events.some((event) => event.type === "HQ_SNAPSHOT_INVALIDATED")).toBe(true);
    expect(source("lib/infinity/operator-console/hq-canonical-live-state.ts")).toContain("resolveCanonicalMissionCompletions");
    expect(source("lib/infinity/operator-console/hq-canonical-watch.ts")).toContain("resolveCanonicalMissionCompletions");
  });

  it("16: historical completed work cannot relight the floor", () => {
    namedMission({
      work_id: "work:occupancynpv:governed-venture-spend-authority-v1",
      title: "OccupancyNPV Governed Venture Spend Authority V1",
      status: "COMPLETED",
      updated_at: "2026-09-14T20:20:00.000Z",
    });
    const current = resolveCurrentCanonicalWork("2026-09-14T20:20:00.000Z");
    const view = projectCommandActivity({ organizationId: "org_hq_live" });
    expect(current.status).toBe("IDLE");
    expect(view.nowInspecting.status).not.toBe("ACTIVE_WORK");
    expect(
      projectRecentVentureWorkHistory(listCanonicalWork(), CRE_VENTURE_ID).some(
        (row) => row.workId === "work:occupancynpv:governed-venture-spend-authority-v1" && row.status === "COMPLETED",
      ),
    ).toBe(true);
    expect(current.work_id).not.toBe("work:occupancynpv:governed-venture-spend-authority-v1");
  });

  it("17-18: blocked and failed missions do not masquerade as ACTIVE", () => {
    const blocked = namedMission({
      work_id: "work:occupancynpv:blocked-mission",
      title: "Blocked named mission",
      status: "BLOCKED",
    });
    let current = resolveCurrentCanonicalWork();
    let view = projectCommandActivity({ organizationId: "org_hq_live" });
    expect(current.status).not.toBe("ACTIVE");
    expect(view.nowInspecting.status).not.toBe("ACTIVE_WORK");
    expect(evaluateActiveWorkTerminalStateGate({ work: blocked, current }).result).toBe("PASS");

    resetCanonicalWorkStore();
    const failed = namedMission({
      work_id: "work:occupancynpv:failed-mission",
      title: "Failed named mission",
      status: "FAILED",
    });
    current = resolveCurrentCanonicalWork();
    view = projectCommandActivity({ organizationId: "org_hq_live" });
    expect(current.status).not.toBe("ACTIVE");
    expect(view.nowInspecting.status).not.toBe("ACTIVE_WORK");
    expect(liveCodingFromCurrent().agent_status).toBe("PRESENT_IDLE");
    expect(evaluateActiveWorkTerminalStateGate({ work: failed, current }).result).toBe("PASS");
  });
});
