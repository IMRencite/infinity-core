import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { CommandActivityStrip } from "@/components/dashboard/operator-console/command-activity-strip";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import {
  commitHqClientPollPayload,
  commitHqClientSnapshot,
  isHqWrappedPollPayload,
  nextHqPollRequestSequence,
  readHqClientSnapshotSlot,
  resetHqClientSnapshotStore,
  restoreHqClientSnapshot,
  unwrapHqPollSnapshot,
} from "@/lib/infinity/operator-console/hq-client-snapshot-commit";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

const VENTURE_ID = "favc1-cycle:cycle-1786949554348";
const COMMIT_MISSION = "HQ_STATE_COMMIT_PROOF";

function rooms(active?: "systems_architect"): CommandActivityView["rooms"] {
  const empty = {
    opportunity_lab: { room: "opportunity_lab" as const, roomLabel: "Venture Radar", status: "EMPTY" as const, summary: null, allowAmbientMotion: false, latestEventId: null },
    research_department: { room: "research_department" as const, roomLabel: "Research Grid", status: "EMPTY" as const, summary: null, allowAmbientMotion: false, latestEventId: null },
    strategy_finance: { room: "strategy_finance" as const, roomLabel: "Profit Lab", status: "EMPTY" as const, summary: null, allowAmbientMotion: false, latestEventId: null },
    company_operations: { room: "company_operations" as const, roomLabel: "Blueprint Lab", status: "EMPTY" as const, summary: null, allowAmbientMotion: false, latestEventId: null },
    systems_architect: { room: "systems_architect" as const, roomLabel: "Systems Architect", status: active === "systems_architect" ? "ACTIVE_WORK" as const : "EMPTY" as const, summary: null, allowAmbientMotion: active === "systems_architect", latestEventId: null },
    growth_department: { room: "growth_department" as const, roomLabel: "Growth Nexus", status: "EMPTY" as const, summary: null, allowAmbientMotion: false, latestEventId: null },
    creative_studio: { room: "creative_studio" as const, roomLabel: "Design Core", status: "EMPTY" as const, summary: null, allowAmbientMotion: false, latestEventId: null },
    product_lab: { room: "product_lab" as const, roomLabel: "Creation Lab", status: "EMPTY" as const, summary: null, allowAmbientMotion: false, latestEventId: null },
    quality_control: { room: "quality_control" as const, roomLabel: "Validation Station", status: "PRESENT_IDLE" as const, summary: null, allowAmbientMotion: false, latestEventId: null },
    launch_operations: { room: "launch_operations" as const, roomLabel: "Deployment Depot", status: "PRESENT_IDLE" as const, summary: null, allowAmbientMotion: false, latestEventId: null },
    intelligence_center: { room: "intelligence_center" as const, roomLabel: "Signal Intelligence", status: "EMPTY" as const, summary: null, allowAmbientMotion: false, latestEventId: null },
    executive_office: { room: "executive_office" as const, roomLabel: "Command", status: active ? "ACTIVE_WORK" as const : "PRESENT_IDLE" as const, summary: null, allowAmbientMotion: Boolean(active), latestEventId: null },
  };
  return empty as CommandActivityView["rooms"];
}

function activity(live: boolean): CommandActivityView {
  return {
    generatedAt: live ? "2026-08-31T22:10:10.000Z" : "2026-08-30T18:00:00.000Z",
    counts: { activeMissions: live ? 1 : 0, blockedMissions: 0, waitingMissions: 0, authorizationRequired: 0 },
    rooms: rooms(live ? "systems_architect" : undefined),
    nowInspecting: {
      currentMission: live ? COMMIT_MISSION : null,
      currentPhase: live ? "SYSTEMS_ARCHITECT_WORK" : null,
      currentStep: live ? "SITE_ARCHITECTURE" : null,
      currentRoom: live ? "systems_architect" : null,
      currentWorker: live ? "Site Architect" : null,
      currentTask: live ? "Planning client state commit proof." : null,
      status: live ? "ACTIVE_WORK" : "PRESENT_IDLE",
      why: null,
      startedAt: live ? "2026-08-31T22:10:00.000Z" : null,
      lastActivity: live ? "Planning client state commit proof." : "Historical QC completed",
      lastActivityAt: live ? "2026-08-31T22:10:08.000Z" : "2026-08-30T18:33:12.828Z",
      nextExpectedStep: null,
      blocker: null,
      authorizationRequired: null,
    },
    systemView: {
      missionId: live ? "msn_hq_state_commit_proof_v1" : "msn_qkg_answer_authority_qc_v1",
      engine: live ? "venture_systems_architecture" : "quality_control",
      step: live ? "SITE_ARCHITECTURE" : "AUTHORITY_REPAIR_PLAN",
      workerOrProvider: live ? "Site Architect" : null,
      artifactId: null,
      deploymentId: null,
      experimentId: null,
      traceId: null,
      startedAt: live ? "2026-08-31T22:10:00.000Z" : null,
      durationMs: null,
      latestEvent: live ? "STEP_STARTED" : "MISSION_COMPLETED",
      failureCode: null,
      costState: null,
    },
    latestCompleted: {
      summary: "Question knowledge graph answer authority QC completed",
      completedAt: "2026-08-30T18:33:12.828Z",
      missionType: "MISSION_KNOWLEDGE_GRAPH_ANSWER_AUTHORITY_QC",
      missionId: "msn_qkg_answer_authority_qc_v1",
    },
    recentEvents: [],
    activeWorkers: live
      ? [
          {
            workerExecutionId: "wrk_state_commit",
            missionId: "msn_hq_state_commit_proof_v1",
            stepId: "SITE_ARCHITECTURE",
            stepType: "SITE_ARCHITECTURE",
            ventureId: VENTURE_ID,
            role: "Site Architect",
            room: "systems_architect",
            task: "Planning client state commit proof.",
            status: "ACTIVE_WORK",
            startedAt: "2026-08-31T22:10:01.000Z",
            lastActivityAt: "2026-08-31T22:10:08.000Z",
            provider: null,
            blocker: null,
            next: null,
          },
        ]
      : [],
    executionClass: "VENTURE_EXECUTION",
  };
}

function snapshot(commandActivity: CommandActivityView): OperatorVentureSnapshot {
  return {
    generatedAt: commandActivity.generatedAt,
    venture: {
      ventureAssemblyId: VENTURE_ID,
      organizationId: LIVE_ORG,
      missionId: "favc1-cycle",
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "Autonomous Venture Cycle",
      ventureType: "first_autonomous_venture_v1",
      assemblyStatus: "business_no_go",
      readinessStatus: null,
      launchStage: null,
      correlationIds: [],
    },
    overallStatus: "COMPLETE",
    currentDepartments: ["quality_control"],
    currentActivity: {
      active: false,
      departmentId: "quality_control",
      departmentLabel: "Validation Station",
      engine: null,
      task: "Recording a targeted authority repair plan",
      provider: null,
      model: null,
      status: "PRESENT_IDLE",
      startedAt: null,
      elapsedSeconds: null,
      attempt: null,
      costUsd: null,
      costKnown: false,
      artifactStatus: null,
      latestActivitySummary: "Recording a targeted authority repair plan",
      latestActivityAt: "2026-08-30T18:33:12.828Z",
      displayTask: "Recording a targeted authority repair plan",
      displayNarration: "Mission Completed — Candidate Still Requires Validation",
    },
    departments: (
      [
        ["executive_office", "Command"],
        ["systems_architect", "Systems Architect"],
        ["product_lab", "Creation Lab"],
        ["quality_control", "Validation Station"],
        ["launch_operations", "Deployment Depot"],
      ] as const
    ).map(([id]) => ({
      id,
      label: id,
      state: "COMPLETE" as const,
      engines: [],
      summary: null,
      currentTask: null,
      provider: null,
      model: null,
      costUsd: null,
      costKnown: false,
      startedAt: null,
      lastActivityAt: null,
      recordCount: 0,
      detail: {},
      isActive: false,
      isNextMissionTarget: false,
    })),
    pipeline: { stagesCompleted: 0, stagesTotal: 0, stageLabels: [] },
    activityFeed: [],
    providers: [],
    costs: { knownSpendUsd: 0, unpricedProviderCalls: 0, breakdown: [] },
    lineage: [],
    closedLoopRoute: {
      active: false,
      fromDepartmentId: null,
      viaDepartmentId: null,
      toDepartmentId: null,
      decisionType: null,
      missionId: null,
      missionStatus: null,
    },
    system: { engineRuns: {}, artifacts: {}, performance: {}, learning: {} },
    workerNodes: [],
    inspectionContext: {
      kind: "FAVC1_CYCLE",
      cycleKey: "cycle-1786949554348",
      ventureAssemblyId: VENTURE_ID,
      terminalHeadline: "Mission Completed — Candidate Still Requires Validation",
      terminalDecision: "BUSINESS_NO_GO",
    },
    commandActivity,
  };
}

describe("HQ client snapshot commit v1", () => {
  beforeEach(() => {
    resetHqClientSnapshotStore();
  });

  it("unwraps the wrapped favc1 payload before commit", () => {
    const inner = snapshot(activity(true));
    const wrapped = { snapshot: inner, meta: { cycleKey: "cycle-1786949554348" }, followVentureAssemblyId: null };
    expect(isHqWrappedPollPayload(wrapped)).toBe(true);
    expect(isHqWrappedPollPayload(inner)).toBe(false);
    const unwrapped = unwrapHqPollSnapshot(wrapped);
    expect(unwrapped.commandActivity?.counts.activeMissions).toBe(1);
    expect(unwrapped.commandActivity?.nowInspecting.currentMission).toBe(COMMIT_MISSION);
    expect("meta" in unwrapped).toBe(false);
  });

  it("commits an accepted live poll and renders Active 1", () => {
    restoreHqClientSnapshot(VENTURE_ID, snapshot(activity(false)));
    const wrapped = { snapshot: snapshot(activity(true)), followVentureAssemblyId: null };
    const decision = commitHqClientPollPayload({
      ventureId: VENTURE_ID,
      payload: wrapped,
      requestSequence: nextHqPollRequestSequence(),
    });
    expect(decision.accepted).toBe(true);
    expect(decision.snapshot.commandActivity?.counts.activeMissions).toBe(1);
    expect(readHqClientSnapshotSlot(VENTURE_ID)?.freshness.activeCount).toBe(1);
    const html = renderToStaticMarkup(
      createElement(CommandActivityStrip, { activity: decision.snapshot.commandActivity }),
    );
    expect(html).toContain('data-hq-activity-active="1"');
    expect(html).toContain(COMMIT_MISSION);
  });

  it("does not let a newer idle SSR snapshot overwrite committed live state", () => {
    restoreHqClientSnapshot(VENTURE_ID, snapshot(activity(false)));
    commitHqClientPollPayload({
      ventureId: VENTURE_ID,
      payload: { snapshot: snapshot(activity(true)), followVentureAssemblyId: null },
      requestSequence: 1,
    });
    const staleSsr = snapshot(activity(false));
    staleSsr.generatedAt = "2026-08-31T22:10:40.000Z";
    const sync = commitHqClientSnapshot({
      ventureId: VENTURE_ID,
      source: "SSR_PROP_SYNC",
      incoming: staleSsr,
    });
    expect(sync.snapshot.commandActivity?.counts.activeMissions).toBe(1);
    expect(sync.snapshot.commandActivity?.nowInspecting.currentMission).toBe(COMMIT_MISSION);
    expect(sync.snapshot.inspectionContext?.cycleKey).toBe("cycle-1786949554348");
  });

  it("restores the live cache after a remount onto idle SSR", () => {
    restoreHqClientSnapshot(VENTURE_ID, snapshot(activity(false)));
    commitHqClientPollPayload({
      ventureId: VENTURE_ID,
      payload: { snapshot: snapshot(activity(true)), followVentureAssemblyId: null },
      requestSequence: 2,
    });
    const remounted = restoreHqClientSnapshot(VENTURE_ID, snapshot(activity(false)), "remount");
    expect(remounted.commandActivity?.counts.activeMissions).toBe(1);
    expect(remounted.commandActivity?.nowInspecting.currentMission).toBe(COMMIT_MISSION);
  });

  it("rejects an older request sequence after a newer poll committed", () => {
    restoreHqClientSnapshot(VENTURE_ID, snapshot(activity(false)));
    const live = commitHqClientPollPayload({
      ventureId: VENTURE_ID,
      payload: { snapshot: snapshot(activity(true)), followVentureAssemblyId: null },
      requestSequence: 4,
    });
    expect(live.accepted).toBe(true);
    const stale = commitHqClientPollPayload({
      ventureId: VENTURE_ID,
      payload: { snapshot: snapshot(activity(false)), followVentureAssemblyId: null },
      requestSequence: 3,
    });
    expect(stale.accepted).toBe(false);
    expect(readHqClientSnapshotSlot(VENTURE_ID)?.freshness.activeCount).toBe(1);
  });
});
