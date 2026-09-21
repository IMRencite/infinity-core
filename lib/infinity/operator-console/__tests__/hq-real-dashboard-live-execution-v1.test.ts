import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import {
  commitHqClientPollPayload,
  resetHqClientSnapshotStore,
  restoreHqClientSnapshot,
  shouldFollowFavc1AssemblyNavigation,
} from "@/lib/infinity/operator-console/hq-client-snapshot-commit";
import { shouldApplyInitialHqSnapshot } from "@/lib/infinity/operator-console/hq-poll-generation";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

const ROOT = process.cwd();
const CYCLE_ID = "favc1-cycle:cycle-1786949554348";
const ASSEMBLY_ID = "assembled-venture-aaaaaaaa";

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function rooms(active?: "systems_architect"): CommandActivityView["rooms"] {
  return {
    opportunity_lab: { room: "opportunity_lab", roomLabel: "Venture Radar", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    research_department: { room: "research_department", roomLabel: "Research Grid", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    strategy_finance: { room: "strategy_finance", roomLabel: "Profit Lab", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    company_operations: { room: "company_operations", roomLabel: "Blueprint Lab", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    systems_architect: { room: "systems_architect", roomLabel: "Systems Architect", status: active === "systems_architect" ? "ACTIVE_WORK" : "EMPTY", summary: null, allowAmbientMotion: active === "systems_architect", latestEventId: null },
    growth_department: { room: "growth_department", roomLabel: "Growth Nexus", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    creative_studio: { room: "creative_studio", roomLabel: "Design Core", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    product_lab: { room: "product_lab", roomLabel: "Creation Lab", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    quality_control: { room: "quality_control", roomLabel: "Validation Station", status: "PRESENT_IDLE", summary: null, allowAmbientMotion: false, latestEventId: null },
    launch_operations: { room: "launch_operations", roomLabel: "Deployment Depot", status: "PRESENT_IDLE", summary: null, allowAmbientMotion: false, latestEventId: null },
    intelligence_center: { room: "intelligence_center", roomLabel: "Signal Intelligence", status: "EMPTY", summary: null, allowAmbientMotion: false, latestEventId: null },
    executive_office: { room: "executive_office", roomLabel: "Command", status: active ? "ACTIVE_WORK" : "PRESENT_IDLE", summary: null, allowAmbientMotion: Boolean(active), latestEventId: null },
  } as CommandActivityView["rooms"];
}

function activity(live: boolean): CommandActivityView {
  return {
    generatedAt: live ? "2026-09-01T04:10:10.000Z" : "2026-08-30T18:00:00.000Z",
    counts: { activeMissions: live ? 1 : 0, blockedMissions: 0, waitingMissions: 0, authorizationRequired: 0 },
    rooms: rooms(live ? "systems_architect" : undefined),
    nowInspecting: {
      currentMission: live ? "HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF" : null,
      currentPhase: live ? "SYSTEMS_ARCHITECT_WORK" : null,
      currentStep: live ? "SITE_ARCHITECTURE" : null,
      currentRoom: live ? "systems_architect" : null,
      currentWorker: live ? "Site Architect" : null,
      currentTask: live ? "Planning architecture on the founder /dashboard surface." : null,
      status: live ? "ACTIVE_WORK" : "PRESENT_IDLE",
      why: null,
      startedAt: live ? "2026-09-01T04:10:00.000Z" : null,
      lastActivity: live ? "Planning architecture on the founder /dashboard surface." : "Historical QC completed",
      lastActivityAt: live ? "2026-09-01T04:10:08.000Z" : "2026-08-30T18:33:12.828Z",
      nextExpectedStep: null,
      blocker: null,
      authorizationRequired: null,
    },
    systemView: {
      missionId: live ? "msn_hq_real_dashboard_live_execution_proof_v1" : "msn_qkg_answer_authority_qc_v1",
      engine: live ? "venture_systems_architecture" : "quality_control",
      step: live ? "SITE_ARCHITECTURE" : "AUTHORITY_REPAIR_PLAN",
      workerOrProvider: live ? "Site Architect" : null,
      artifactId: null,
      deploymentId: null,
      experimentId: null,
      traceId: null,
      startedAt: live ? "2026-09-01T04:10:00.000Z" : null,
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
    activeWorkers: [],
    executionClass: "VENTURE_EXECUTION",
  };
}

function snapshot(ventureAssemblyId: string, live: boolean): OperatorVentureSnapshot {
  const commandActivity = activity(live);
  return {
    generatedAt: commandActivity.generatedAt,
    venture: {
      ventureAssemblyId,
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
      active: live,
      departmentId: "quality_control",
      departmentLabel: "Validation Station",
      engine: null,
      task: "Recording a targeted authority repair plan",
      provider: null,
      model: null,
      status: live ? "ACTIVE_WORK" : "PRESENT_IDLE",
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
    inspectionContext: {
      kind: "FAVC1_CYCLE",
      cycleKey: "cycle-1786949554348",
      ventureAssemblyId,
      terminalHeadline: "Mission Completed — Candidate Still Requires Validation",
      terminalDecision: "BUSINESS_NO_GO",
    },
    commandActivity,
  };
}

describe("HQ real /dashboard live execution v1", () => {
  beforeEach(() => {
    resetHqClientSnapshotStore();
  });

  it("does not navigate away from /dashboard while a live mission is active", () => {
    expect(
      shouldFollowFavc1AssemblyNavigation({
        followFavc1Cycle: true,
        liveActiveCount: 1,
        followVentureAssemblyId: ASSEMBLY_ID,
        currentVentureId: CYCLE_ID,
      }),
    ).toBe(false);
    expect(
      shouldFollowFavc1AssemblyNavigation({
        followFavc1Cycle: false,
        liveActiveCount: 0,
        followVentureAssemblyId: ASSEMBLY_ID,
        currentVentureId: CYCLE_ID,
      }),
    ).toBe(false);
  });

  it("does not let idle SSR for a different venture overwrite org-live state", () => {
    expect(
      shouldApplyInitialHqSnapshot(
        {
          generatedAt: "2026-09-01T04:10:08.000Z",
          lastActivityAt: "2026-09-01T04:10:08.000Z",
          activeCount: 1,
          ventureAssemblyId: CYCLE_ID,
        },
        {
          generatedAt: "2026-09-01T04:10:40.000Z",
          lastActivityAt: "2026-08-30T18:33:12.828Z",
          activeCount: 0,
          ventureAssemblyId: ASSEMBLY_ID,
        },
      ),
    ).toBe(false);
  });

  it("restores live execution for the same venture id and does not leak it into another venture slot", () => {
    restoreHqClientSnapshot(CYCLE_ID, snapshot(CYCLE_ID, false));
    commitHqClientPollPayload({
      ventureId: CYCLE_ID,
      payload: { snapshot: snapshot(CYCLE_ID, true), followVentureAssemblyId: ASSEMBLY_ID },
      requestSequence: 1,
    });
    const remountedSame = restoreHqClientSnapshot(CYCLE_ID, snapshot(CYCLE_ID, false), "dashboard-remount");
    expect(remountedSame.commandActivity?.counts.activeMissions).toBe(1);
    expect(remountedSame.commandActivity?.nowInspecting.currentMission).toBe("HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF");
    const remountedOther = restoreHqClientSnapshot(ASSEMBLY_ID, snapshot(ASSEMBLY_ID, false), "dashboard-remount");
    expect(remountedOther.commandActivity?.counts.activeMissions ?? 0).toBe(0);
    expect(remountedOther.commandActivity?.nowInspecting.currentMission ?? "").not.toBe(
      "HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF",
    );
  });

  it("wires the real /dashboard page to the repaired console, not the harness", () => {
    const page = read("app/dashboard/page.tsx");
    const experience = read("components/dashboard/operator-console/infinity-hq-experience.tsx");
    const consoleUi = read("components/dashboard/operator-console/venture-operator-console.tsx");
    const layout = read("app/dashboard/layout.tsx");
    const ventureRoute = read("app/api/operator-console/ventures/[ventureId]/route.ts");
    expect(page).toContain('data-hq-founder-route="/dashboard"');
    expect(page).toContain("InfinityHqExperience");
    expect(page).not.toContain("hq-live-projection");
    expect(experience).toContain("VentureOperatorConsole");
    expect(experience).toContain("followFavc1Cycle={false}");
    expect(experience).toContain("Suspense");
    expect(consoleUi).toContain("shouldFollowFavc1AssemblyNavigation");
    expect(consoleUi).toContain("useHqLiveProjection(refresh)");
    expect(consoleUi).toContain("data-hq-client-build");
    expect(consoleUi).toContain("data-hq-last-poll-at");
    expect(consoleUi).toContain("data-hq-last-poll-seq");
    expect(consoleUi).toContain("data-hq-current-mission-id");
    expect(consoleUi).toContain("data-hq-active-count");
    expect(read("lib/infinity/operator-console/local-hq-proof.ts")).toContain("HQ_DEV_CLIENT_BUILD");
    expect(layout).toContain("isLocalHqObservabilityProofSession");
    expect(ventureRoute).toContain("isLocalHqObservabilityProofRequest");
  });
});
