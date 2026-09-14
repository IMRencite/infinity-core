import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommandChamber } from "@/components/dashboard/operator-console/command-chamber";
import { ROOM_ACTIVITY_EMPTY } from "@/lib/infinity/operator-console/room-activity";
import { applyHqLiveExecutionOverlay } from "@/lib/infinity/operator-console/hq-poll-generation";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { instrumentedRuntimeRegistry } from "../runtime-contract";
import { evaluateHqFrontLiveWorkVisibility } from "../hq-live-work-visibility";
import { emitMissionActivity } from "../emit";
import { projectCommandActivity } from "../project";
import { resetMissionActivityStore } from "../store";
import type { CommandActivityView } from "../types";

function rooms(overrides: Partial<CommandActivityView["rooms"]> = {}): CommandActivityView["rooms"] {
  const empty = (room: CommandActivityView["rooms"][keyof CommandActivityView["rooms"]]["room"], label: string) => ({
    room,
    roomLabel: label,
    status: "EMPTY" as const,
    summary: null,
    allowAmbientMotion: false,
    latestEventId: null,
  });
  return {
    opportunity_lab: empty("opportunity_lab", "Venture Radar"),
    research_department: empty("research_department", "Research Grid"),
    strategy_finance: empty("strategy_finance", "Profit Lab"),
    company_operations: empty("company_operations", "Blueprint Lab"),
    systems_architect: empty("systems_architect", "Systems Architect"),
    growth_department: empty("growth_department", "Growth Nexus"),
    creative_studio: empty("creative_studio", "Design Core"),
    product_lab: empty("product_lab", "Creation Lab"),
    quality_control: {
      room: "quality_control",
      roomLabel: "Validation Station",
      status: "ACTIVE_WORK",
      summary: "Reconfirming artifact identity, digest lock, and 93-route page-level admission",
      allowAmbientMotion: true,
      latestEventId: "mae_qc",
    },
    launch_operations: {
      room: "launch_operations",
      roomLabel: "Deployment Depot",
      status: "ACTIVE_WORK",
      summary: "Preparing the immutable source bundle for a single staging deploy",
      allowAmbientMotion: true,
      latestEventId: "mae_dep",
    },
    intelligence_center: empty("intelligence_center", "Signal Intelligence"),
    executive_office: {
      room: "executive_office",
      roomLabel: "Command",
      status: "ACTIVE_WORK",
      summary: "Coordinating Validation Station and Deployment Depot for the frozen successor",
      allowAmbientMotion: true,
      latestEventId: "mae_cmd",
    },
    ...overrides,
  } as CommandActivityView["rooms"];
}

function liveView(): CommandActivityView {
  return {
    generatedAt: "2026-09-04T06:40:00.000Z",
    counts: { activeMissions: 1, blockedMissions: 0, waitingMissions: 0, authorizationRequired: 0 },
    rooms: rooms(),
    nowInspecting: {
      currentMission: "GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1",
      currentPhase: "PREPARE_SOURCE_BUNDLE",
      currentStep: "PREPARE_SOURCE_BUNDLE",
      currentRoom: "Deployment Depot",
      currentWorker: "Launch Operator",
      currentTask: "Preparing the immutable source bundle for a single staging deploy",
      status: "ACTIVE_WORK",
      why: "Deploying the frozen full-page successor",
      startedAt: "2026-09-04T06:39:00.000Z",
      lastActivity: "Preparing the immutable source bundle for a single staging deploy",
      lastActivityAt: "2026-09-04T06:40:00.000Z",
      nextExpectedStep: "CREATE_DEPLOYMENT",
      blocker: null,
      authorizationRequired: null,
    },
    systemView: {
      missionId: "msn_cre_full_page_autorepair_deploy_v1",
      engine: "launch_gateway",
      step: "PREPARE_SOURCE_BUNDLE",
      workerOrProvider: null,
      artifactId: "art_e6d2a3a1f46d117d61c9",
      deploymentId: null,
      experimentId: "exp_e72beb7b6d35e7b20acf",
      traceId: null,
      startedAt: "2026-09-04T06:39:00.000Z",
      durationMs: 60_000,
      latestEvent: "STEP_STARTED",
      failureCode: null,
      costState: null,
    },
    latestCompleted: {
      summary: "Finished the current mission",
      completedAt: "2026-09-04T06:38:00.000Z",
      missionType: "CRE_FULL_PAGE_RENDER_VALIDATE_REPAIR_V1",
      missionId: "msn_cre_full_page_autorepair_v1",
    },
    recentEvents: [],
    activeWorkers: [],
    executionClass: "VENTURE_EXECUTION",
  };
}

function idleFavc1Snapshot(commandActivity: CommandActivityView): OperatorVentureSnapshot {
  return {
    generatedAt: "2026-09-04T06:40:00.000Z",
    venture: {
      ventureAssemblyId: "favc1-cycle:cycle-202609041300",
      organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
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
    currentDepartments: [],
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
      latestActivityAt: "2026-09-04T06:00:00.000Z",
      displayTask: "Recording a targeted authority repair plan",
      displayNarration: "Mission Completed — Candidate Still Requires Validation",
    },
    departments: (
      [
        ["executive_office", "Command"],
        ["quality_control", "Validation Station"],
        ["launch_operations", "Deployment Depot"],
      ] as const
    ).map(([id, label]) => ({
      id,
      label,
      state: "COMPLETE",
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
    commandActivity,
    currentExecution: commandActivity.nowInspecting,
    favc1Cycle: {
      cycleKey: "cycle-202609041300",
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

describe("HQ live work visibility v1", () => {
  it("registers the deploy runtime on the canonical mission wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.CreFullPageAutorepairDeployRuntime.adoption).toBe("USES_CANONICAL_MISSION_WRAPPER");
    expect(registry.contracts.CreFullPageAutorepairDeployRuntime.stepToRoom.CREATE_DEPLOYMENT).toBe("launch_operations");
    expect(registry.contracts.CreFullPageAutorepairDeployRuntime.stepToRoom.QUALITY_REVIEW).toBe("quality_control");
  });

  it("fails closed if Command NOW says empty while a mission is ACTIVE_WORK", () => {
    const view = liveView();
    expect(evaluateHqFrontLiveWorkVisibility({ view, commandNowSentence: ROOM_ACTIVITY_EMPTY })).toBe("FAIL");
    expect(evaluateHqFrontLiveWorkVisibility({ view, commandNowSentence: "Preparing the immutable source bundle for a single staging deploy." })).toBe("PASS");
  });

  it("keeps live rooms and current mission on the FAVC1 inspection overlay", () => {
    const overlay = applyHqLiveExecutionOverlay(idleFavc1Snapshot(liveView()));
    expect(overlay.currentExecution?.currentMission).toBe("GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1");
    expect(overlay.currentActivity.task).toMatch(/source bundle/i);
    expect(overlay.departments.find((dept) => dept.id === "launch_operations")?.isActive).toBe(true);
    expect(overlay.departments.find((dept) => dept.id === "quality_control")?.state).toBe("RUNNING");
    expect(overlay.currentDepartments).toEqual(expect.arrayContaining(["quality_control", "launch_operations", "executive_office"]));
  });

  it("projects the blocked hold reason instead of the last pre-block STEP_STARTED task", () => {
    resetMissionActivityStore();
    const org = "org_blocked_hold_reason_v1";
    const base = {
      organizationId: org,
      ventureId: "ven_blocked_hold",
      missionId: "msn_cre_full_page_autorepair_deploy_v1",
      missionType: "GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1",
      source: "test",
      executionClass: "VENTURE_EXECUTION" as const,
      synthetic: false,
    };
    emitMissionActivity({
      ...base,
      engine: "mission_runtime",
      stepType: "ORCHESTRATE_FULL_PAGE_AUTOREPAIR_DEPLOY",
      eventType: "MISSION_STARTED",
      summary: "Resuming the governed full-page autorepair deployment",
    });
    emitMissionActivity({
      ...base,
      engine: "market_validation",
      stepType: "QUALITY_REVIEW",
      eventType: "STEP_STARTED",
      summary: "Reconfirming artifact identity, digest lock, and 93-route page-level admission",
    });
    emitMissionActivity({
      ...base,
      engine: "launch_gateway",
      stepType: "PROVIDER_BUILD",
      eventType: "MISSION_BLOCKED",
      status: "READY_BLOCKED",
      blocker: "PROVIDER_EQUIVALENT_BUILD_GATE_FAILED",
      authorizationRequired: "CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_REPAIR_REQUIRED",
      summary:
        "Isolated next build failed prerendering /pricing (useOptimistic). Frozen art_e6d2a3a1f46d117d61c9 was not written to Vercel.",
    });
    const view = projectCommandActivity({ organizationId: org });
    expect(view.nowInspecting.currentMission).toBe("GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1");
    expect(view.nowInspecting.status).toBe("READY_BLOCKED");
    expect(view.nowInspecting.currentTask).toMatch(/useOptimistic/);
    expect(view.nowInspecting.currentTask).not.toMatch(/Reconfirming artifact identity/);
    expect(view.rooms.executive_office.status).toBe("READY_BLOCKED");
    expect(view.rooms.quality_control.status).toBe("READY_BLOCKED");
    expect(view.rooms.launch_operations.status).toBe("READY_BLOCKED");
    expect(evaluateHqFrontLiveWorkVisibility({ view, commandNowSentence: ROOM_ACTIVITY_EMPTY })).toBe("FAIL");
    expect(
      evaluateHqFrontLiveWorkVisibility({
        view,
        commandNowSentence: view.nowInspecting.currentTask,
      }),
    ).toBe("PASS");
  });

  it("shows the blocked hold reason instead of the last pre-block STEP_STARTED task", () => {
    const view = {
      ...liveView(),
      counts: { activeMissions: 0, blockedMissions: 1, waitingMissions: 0, authorizationRequired: 1 },
      nowInspecting: {
        ...liveView().nowInspecting,
        status: "READY_BLOCKED" as const,
        currentTask:
          "Isolated next build failed prerendering /pricing (useOptimistic). Frozen art_e6d2a3a1f46d117d61c9 was not written to Vercel.",
        blocker: "PROVIDER_EQUIVALENT_BUILD_GATE_FAILED",
        authorizationRequired: "CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_REPAIR_REQUIRED",
      },
      rooms: rooms({
        executive_office: {
          room: "executive_office",
          roomLabel: "Command",
          status: "READY_BLOCKED",
          summary:
            "Isolated next build failed prerendering /pricing (useOptimistic). Frozen art_e6d2a3a1f46d117d61c9 was not written to Vercel.",
          allowAmbientMotion: false,
          latestEventId: "mae_cmd_block",
        },
        quality_control: {
          room: "quality_control",
          roomLabel: "Validation Station",
          status: "READY_BLOCKED",
          summary:
            "Isolated next build failed prerendering /pricing (useOptimistic). Frozen art_e6d2a3a1f46d117d61c9 was not written to Vercel.",
          allowAmbientMotion: false,
          latestEventId: "mae_qc_block",
        },
        launch_operations: {
          room: "launch_operations",
          roomLabel: "Deployment Depot",
          status: "READY_BLOCKED",
          summary:
            "Isolated next build failed prerendering /pricing (useOptimistic). Frozen art_e6d2a3a1f46d117d61c9 was not written to Vercel.",
          allowAmbientMotion: false,
          latestEventId: "mae_dep_block",
        },
      }),
    };
    expect(evaluateHqFrontLiveWorkVisibility({ view, commandNowSentence: ROOM_ACTIVITY_EMPTY })).toBe("FAIL");
    expect(
      evaluateHqFrontLiveWorkVisibility({
        view,
        commandNowSentence:
          "Isolated next build failed prerendering /pricing (useOptimistic). Frozen art_e6d2a3a1f46d117d61c9 was not written to Vercel.",
      }),
    ).toBe("PASS");
    expect(view.nowInspecting.currentTask).toMatch(/useOptimistic/);
    expect(view.nowInspecting.currentTask).not.toMatch(/Reconfirming artifact identity/);
  });

  it("renders Command NOW from the live mission instead of empty FAVC1 copy", () => {
    const snapshot = idleFavc1Snapshot(liveView());
    const command = snapshot.departments.find((dept) => dept.id === "executive_office");
    const html = renderToStaticMarkup(
      createElement(CommandChamber, {
        snapshot: command,
        workerNodes: [],
        currentActivity: snapshot.currentActivity,
        closedLoopRoute: snapshot.closedLoopRoute,
        isSelected: true,
        onSelect: () => undefined,
        commandActivity: snapshot.commandActivity,
      }),
    );
    expect(html).toContain("GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1");
    expect(html).toMatch(/Validation Station|source bundle/i);
    expect(html).not.toContain("No active work is assigned to this room.");
  });
});
