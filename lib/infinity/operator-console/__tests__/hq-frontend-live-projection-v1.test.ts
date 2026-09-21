import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommandActivityStrip } from "@/components/dashboard/operator-console/command-activity-strip";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import {
  acceptHqPollSnapshot,
  applyHqLiveExecutionOverlay,
  hqPollFreshnessFromSnapshot,
  parseHqPollPayload,
  shouldApplyInitialHqSnapshot,
} from "@/lib/infinity/operator-console/hq-poll-generation";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

const CYCLE_KEY = "cycle-1786949554348";
const HISTORICAL_MISSION = "MISSION_KNOWLEDGE_GRAPH_ANSWER_AUTHORITY_QC";
const LIVE_MISSION = "HQ_FOUNDER_FRONTEND_PROJECTION_PROOF";

function emptyRooms(): CommandActivityView["rooms"] {
  return {
    opportunity_lab: { room: "opportunity_lab", roomLabel: "Venture Radar", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    research_department: { room: "research_department", roomLabel: "Research Grid", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    strategy_finance: { room: "strategy_finance", roomLabel: "Profit Lab", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    company_operations: { room: "company_operations", roomLabel: "Blueprint Lab", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    systems_architect: { room: "systems_architect", roomLabel: "Systems Architect", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    growth_department: { room: "growth_department", roomLabel: "Growth Nexus", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    creative_studio: { room: "creative_studio", roomLabel: "Design Core", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    product_lab: { room: "product_lab", roomLabel: "Creation Lab", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    quality_control: { room: "quality_control", roomLabel: "Validation Station", status: "PRESENT_IDLE", summary: "Recording a targeted authority repair plan", allowAmbientMotion: false, latestEventId: null },
    launch_operations: { room: "launch_operations", roomLabel: "Deployment Depot", status: "PRESENT_IDLE", summary: null, allowAmbientMotion: false, latestEventId: null },
    intelligence_center: { room: "intelligence_center", roomLabel: "Signal Intelligence", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    executive_office: { room: "executive_office", roomLabel: "Command", status: "PRESENT_IDLE", summary: null, allowAmbientMotion: false, latestEventId: null },
  } as CommandActivityView["rooms"];
}

function idleCommandActivity(): CommandActivityView {
  return {
    generatedAt: "2026-08-30T18:00:00.000Z",
    counts: { activeMissions: 0, blockedMissions: 0, waitingMissions: 0, authorizationRequired: 0 },
    rooms: emptyRooms(),
    nowInspecting: {
      currentMission: null,
      currentPhase: null,
      currentStep: null,
      currentRoom: null,
      currentWorker: null,
      currentTask: null,
      status: "PRESENT_IDLE",
      why: null,
      startedAt: null,
      lastActivity: "Question knowledge graph answer authority QC completed",
      lastActivityAt: "2026-08-30T18:33:12.828Z",
      nextExpectedStep: null,
      blocker: null,
      authorizationRequired: null,
    },
    systemView: {
      missionId: "msn_qkg_answer_authority_qc_v1",
      engine: "quality_control",
      step: "AUTHORITY_REPAIR_PLAN",
      workerOrProvider: null,
      artifactId: null,
      deploymentId: null,
      experimentId: null,
      traceId: null,
      startedAt: null,
      durationMs: null,
      latestEvent: "MISSION_COMPLETED",
      failureCode: null,
      costState: null,
    },
    latestCompleted: {
      summary: "Question knowledge graph answer authority QC completed",
      completedAt: "2026-08-30T18:33:12.828Z",
      missionType: HISTORICAL_MISSION,
      missionId: "msn_qkg_answer_authority_qc_v1",
    },
    recentEvents: [],
    activeWorkers: [],
    executionClass: "VENTURE_EXECUTION",
  };
}

function liveCommandActivity(): CommandActivityView {
  const rooms = emptyRooms();
  rooms.executive_office = { ...rooms.executive_office, status: "ACTIVE_WORK", summary: "Zero-write founder frontend projection proof" };
  rooms.systems_architect = { ...rooms.systems_architect, status: "ACTIVE_WORK", summary: "Planning architecture", allowAmbientMotion: true };
  rooms.launch_operations = { ...rooms.launch_operations, status: "PRESENT_IDLE" };
  return {
    generatedAt: "2026-08-30T21:00:10.000Z",
    counts: { activeMissions: 1, blockedMissions: 0, waitingMissions: 0, authorizationRequired: 0 },
    rooms,
    nowInspecting: {
      currentMission: LIVE_MISSION,
      currentPhase: "SYSTEMS_ARCHITECT_WORK",
      currentStep: "SITE_ARCHITECTURE",
      currentRoom: "systems_architect",
      currentWorker: "Site Architect",
      currentTask: "Planning the successor architecture for the frontend projection proof.",
      status: "ACTIVE_WORK",
      why: "Live HQ proving mission",
      startedAt: "2026-08-30T21:00:00.000Z",
      lastActivity: "Planning the successor architecture for the frontend projection proof.",
      lastActivityAt: "2026-08-30T21:00:08.000Z",
      nextExpectedStep: "PAGE_GENERATION",
      blocker: null,
      authorizationRequired: null,
    },
    systemView: {
      missionId: "msn_hq_founder_frontend_projection_proof_v1",
      engine: "venture_systems_architecture",
      step: "SITE_ARCHITECTURE",
      workerOrProvider: "Site Architect",
      artifactId: null,
      deploymentId: null,
      experimentId: null,
      traceId: null,
      startedAt: "2026-08-30T21:00:00.000Z",
      durationMs: null,
      latestEvent: "STEP_STARTED",
      failureCode: null,
      costState: null,
    },
    latestCompleted: idleCommandActivity().latestCompleted,
    recentEvents: [],
    activeWorkers: [
      {
        workerExecutionId: "wrk_frontend_projection_architect",
        missionId: "msn_hq_founder_frontend_projection_proof_v1",
        stepId: "SITE_ARCHITECTURE",
        stepType: "SITE_ARCHITECTURE",
        ventureId: `candidate:7e7e924e-0741-4155-a729-8d529da77ea9`,
        role: "Site Architect",
        room: "systems_architect",
        task: "Planning the successor architecture for the frontend projection proof.",
        status: "ACTIVE_WORK",
        startedAt: "2026-08-30T21:00:01.000Z",
        lastActivityAt: "2026-08-30T21:00:08.000Z",
        provider: null,
        blocker: null,
        next: "PAGE_GENERATION",
      },
    ],
    executionClass: "VENTURE_EXECUTION",
  };
}

function completedCommandActivity(): CommandActivityView {
  const rooms = emptyRooms();
  return {
    ...idleCommandActivity(),
    generatedAt: "2026-08-30T21:00:40.000Z",
    nowInspecting: {
      ...idleCommandActivity().nowInspecting,
      lastActivity: "Zero-write founder frontend projection proof completed",
      lastActivityAt: "2026-08-30T21:00:32.000Z",
    },
    latestCompleted: {
      summary: "Zero-write founder frontend projection proof completed",
      completedAt: "2026-08-30T21:00:32.000Z",
      missionType: LIVE_MISSION,
      missionId: "msn_hq_founder_frontend_projection_proof_v1",
    },
  };
}

function historicalSnapshot(commandActivity: CommandActivityView): OperatorVentureSnapshot {
  return {
    generatedAt: commandActivity.generatedAt,
    venture: {
      ventureAssemblyId: `favc1-cycle:${CYCLE_KEY}`,
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
    ).map(([id, label]) => ({
      id,
      label,
      state: "COMPLETE" as const,
      engines: [],
      summary: null,
      currentTask: id === "quality_control" ? "Recording a targeted authority repair plan" : null,
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
      cycleKey: CYCLE_KEY,
      ventureAssemblyId: `favc1-cycle:${CYCLE_KEY}`,
      terminalHeadline: "Mission Completed — Candidate Still Requires Validation",
      terminalDecision: "BUSINESS_NO_GO",
    },
    commandActivity,
    favc1Cycle: {
      cycleKey: CYCLE_KEY,
      mode: "pre_venture",
      terminalOutcome: "BUSINESS_NO_GO",
      discoveryRunId: null,
      monetizationRunId: null,
      selectionRunId: null,
      ventureAssemblyId: null,
      candidateCount: 0,
      monetizedCandidateCount: 0,
      researchSessionCount: 0,
      activeResearchSessionCount: 0,
      knownCycleCostUsd: null,
      knownCycleCostComplete: true,
      currentStageLabel: "Command",
      failureStage: null,
      failureMessage: null,
      validationOutcome: "validation_required",
      terminalDisplay: {
        headline: "Mission Completed — Candidate Still Requires Validation",
        decision: "BUSINESS_NO_GO",
        systemDetail: "validation_required",
      },
    },
  };
}

describe("HQ frontend live projection v1", () => {
  it("parses wrapped favc1 poll payloads", () => {
    const snapshot = historicalSnapshot(liveCommandActivity());
    expect(parseHqPollPayload({ snapshot, followVentureAssemblyId: null }).commandActivity?.counts.activeMissions).toBe(1);
    expect(parseHqPollPayload(snapshot).commandActivity?.counts.activeMissions).toBe(1);
  });

  it("keeps historical inspection while Command and rooms follow currentExecution", () => {
    const overlay = applyHqLiveExecutionOverlay(historicalSnapshot(liveCommandActivity()));
    expect(overlay.inspectionContext?.cycleKey).toBe(CYCLE_KEY);
    expect(overlay.inspectionContext?.terminalHeadline).toContain("Candidate Still Requires Validation");
    expect(overlay.favc1Cycle?.cycleKey).toBe(CYCLE_KEY);
    expect(overlay.currentExecution?.currentMission).toBe(LIVE_MISSION);
    expect(overlay.currentActivity.active).toBe(true);
    expect(overlay.currentActivity.task).not.toBe("Recording a targeted authority repair plan");
    expect(overlay.currentDepartments).toContain("systems_architect");
    expect(overlay.departments.find((dept) => dept.id === "systems_architect")?.isActive).toBe(true);
    expect(overlay.workerNodes?.some((node) => node.displayRole === "Site Architect" && node.motionActive)).toBe(true);
    expect(overlay.commandActivity?.latestCompleted?.missionType).toBe(HISTORICAL_MISSION);

    const html = renderToStaticMarkup(createElement(CommandActivityStrip, { activity: overlay.commandActivity }));
    expect(html).toContain('data-hq-activity-active="1"');
    expect(html).toContain(LIVE_MISSION);
    expect(html).toContain(HISTORICAL_MISSION);
    expect(html).toContain("msn_qkg_answer_authority_qc_v1");
  });

  it("ignores an older idle response that arrives after a newer active response", () => {
    const applied = hqPollFreshnessFromSnapshot(applyHqLiveExecutionOverlay(historicalSnapshot(liveCommandActivity())));
    const stale = hqPollFreshnessFromSnapshot(applyHqLiveExecutionOverlay(historicalSnapshot(idleCommandActivity())));
    expect(applied.activeCount).toBe(1);
    expect(stale.activeCount).toBe(0);
    expect(acceptHqPollSnapshot(applied, stale)).toBe(false);
    expect(acceptHqPollSnapshot(stale, applied)).toBe(true);
  });

  it("does not let stale SSR idle overwrite live poll state", () => {
    const live = hqPollFreshnessFromSnapshot(applyHqLiveExecutionOverlay(historicalSnapshot(liveCommandActivity())));
    const ssr = hqPollFreshnessFromSnapshot(applyHqLiveExecutionOverlay(historicalSnapshot(idleCommandActivity())));
    expect(shouldApplyInitialHqSnapshot(live, ssr)).toBe(false);
  });

  it("updates Latest Completed to the newest terminal mission", () => {
    const overlay = applyHqLiveExecutionOverlay(historicalSnapshot(completedCommandActivity()));
    expect(overlay.currentActivity.active).toBe(false);
    expect(overlay.latestCompletedExecution?.missionType).toBe(LIVE_MISSION);
    expect(overlay.latestCompletedExecution?.missionId).toBe("msn_hq_founder_frontend_projection_proof_v1");
    expect(overlay.inspectionContext?.terminalHeadline).toContain("Candidate Still Requires Validation");
    const html = renderToStaticMarkup(createElement(CommandActivityStrip, { activity: overlay.commandActivity }));
    expect(html).toContain('data-hq-activity-active="0"');
    expect(html).toContain(LIVE_MISSION);
  });
});
