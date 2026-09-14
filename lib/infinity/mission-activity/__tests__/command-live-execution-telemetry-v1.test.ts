import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MISSION_ACTIVITY_PERSIST_FILE } from "../persist-disk";
import {
  CURSOR_IS_NOT_AN_INFINITY_WORKER,
  MISSION_ACTIVITY_MODEL,
  attachCommandActivity,
  emitMissionActivity,
  exportMissionActivitySnapshot,
  groundedPercent,
  hydrateMissionActivitySnapshot,
  narrateActivity,
  projectCommandActivity,
  resetMissionActivityStore,
  roomForEngine,
  roomForStep,
  roomLabel,
  runInstrumentedStep,
  setMissionActivityPersistPath,
  simulateMissionActivityProcessRestart,
  simulatePublicArtifactRepairMission,
  statusFromEventType,
} from "../index";
import { recordMissionRuntimeEvent, clearMissionRuntimeEvents } from "@/lib/infinity/mission-runtime/events";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { inspectCollectingHqPresence } from "@/lib/infinity/market-validation-experiment/collecting-hq";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

const ROOT = join(process.cwd());

function emptySnapshot(): OperatorVentureSnapshot {
  return {
    generatedAt: "2026-08-29T21:00:00.000Z",
    venture: {
      ventureAssemblyId: "venture_sim_command_activity",
      organizationId: "org_sim_command_activity",
      missionId: "msn_sim_public_artifact_repair",
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "Simulated repair",
      ventureType: "validation",
      assemblyStatus: "active",
      readinessStatus: null,
      launchStage: null,
      correlationIds: [],
    },
    overallStatus: "NOT_STARTED",
    currentDepartments: [],
    currentActivity: {
      active: false,
      departmentId: null,
      departmentLabel: null,
      engine: null,
      task: null,
      provider: null,
      model: null,
      status: null,
      startedAt: null,
      elapsedSeconds: null,
      attempt: null,
      costUsd: null,
      costKnown: false,
      artifactStatus: null,
      latestActivitySummary: null,
      latestActivityAt: null,
    },
    departments: [],
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
  };
}

describe("COMMAND LIVE EXECUTION TELEMETRY + MISSION ACTIVITY RUNTIME V1", () => {
  beforeEach(() => {
    delete process.env.INFINITY_MISSION_ACTIVITY_PERSIST;
    setMissionActivityPersistPath(null);
    resetMissionActivityStore();
    clearMissionRuntimeEvents();
  });

  afterEach(() => {
    delete process.env.INFINITY_MISSION_ACTIVITY_PERSIST;
    setMissionActivityPersistPath(null);
    resetMissionActivityStore();
  });

  it("defines a persisted canonical activity model with one status vocabulary", () => {
    expect(MISSION_ACTIVITY_MODEL).toBe("MISSION_ACTIVITY_EVENT_V1");
    expect(statusFromEventType("STEP_STARTED")).toBe("ACTIVE_WORK");
    expect(statusFromEventType("MISSION_BLOCKED")).toBe("READY_BLOCKED");
    expect(statusFromEventType("MISSION_WAITING")).toBe("WAITING_EXTERNAL");
    expect(statusFromEventType("MISSION_COMPLETED")).toBe("COMPLETED");
    expect(statusFromEventType("MISSION_FAILED")).toBe("FAILED");
    expect(groundedPercent(2, 5)).toBe(40);
    expect(groundedPercent(1, 0)).toBeNull();
    expect(CURSOR_IS_NOT_AN_INFINITY_WORKER).toMatch(/not Infinity venture execution/);
  });

  it("routes engines and steps to HQ rooms", () => {
    expect(roomLabel(roomForEngine("opportunity_discovery"))).toBe("Venture Radar");
    expect(roomLabel(roomForEngine("grounded_research"))).toBe("Research Grid");
    expect(roomLabel(roomForEngine("monetization_engine"))).toBe("Profit Lab");
    expect(roomLabel(roomForEngine("company_builder"))).toBe("Blueprint Lab");
    expect(roomLabel(roomForEngine("venture_systems_architecture"))).toBe("Systems Architect");
    expect(roomLabel(roomForEngine("organic_growth"))).toBe("Growth Nexus");
    expect(roomLabel(roomForEngine("creative_media"))).toBe("Design Core");
    expect(roomLabel(roomForEngine("venture_build_orchestration"))).toBe("Creation Lab");
    expect(roomLabel(roomForEngine("market_validation"))).toBe("Validation Station");
    expect(roomLabel(roomForEngine("launch_gateway"))).toBe("Deployment Depot");
    expect(roomLabel(roomForEngine("performance_intelligence"))).toBe("Signal Intelligence");
    expect(roomLabel(roomForEngine("mission_runtime"))).toBe("Command");
    expect(roomForStep("GENERATE_VALIDATION_ARTIFACT", "venture_build_orchestration")).toBe("product_lab");
    expect(roomForStep("PUBLIC_ARTIFACT_QUALITY_GATE", "quality_control")).toBe("quality_control");
  });

  it("narrates technical steps without inventing percentages", () => {
    expect(
      narrateActivity({
        eventType: "STEP_STARTED",
        stepType: "generated_nextjs_artifact_isolated_build",
        room: "product_lab",
        missionType: "MARKET_VALIDATION_PUBLIC_ARTIFACT_REPAIR",
      }),
    ).toBe("Building the new validation site");
    const event = emitMissionActivity({
      organizationId: "org_a",
      missionId: "msn_a",
      missionType: "TEST",
      engine: "venture_build_orchestration",
      stepType: "PRODUCTION_BUILD",
      eventType: "STEP_STARTED",
    });
    expect(event.progress).toBeNull();
    expect(event.synthetic).toBe(false);
    expect(event.executionClass).toBe("VENTURE_EXECUTION");
  });

  it("records step start/complete/fail and reconstructs after hydrate", async () => {
    const started = emitMissionActivity({
      organizationId: "org_a",
      ventureId: "ven_a",
      missionId: "msn_persist",
      missionType: "TEST_MISSION",
      engine: "mission_runtime",
      stepType: "MISSION",
      eventType: "MISSION_STARTED",
    });
    await runInstrumentedStep({
      emit: {
        organizationId: "org_a",
        ventureId: "ven_a",
        missionId: "msn_persist",
        missionType: "TEST_MISSION",
        engine: "product_asset_builder",
        stepType: "GENERATE_VALIDATION_ARTIFACT",
      },
      totalKnownSteps: 2,
      completedBefore: 0,
      run: () => "ok",
    });
    emitMissionActivity({
      organizationId: "org_a",
      ventureId: "ven_a",
      missionId: "msn_persist",
      missionType: "TEST_MISSION",
      engine: "mission_runtime",
      stepType: "MISSION",
      eventType: "MISSION_BLOCKED",
      blocker: "FOUNDER_PROSPECT_INPUT_REQUIRED",
      authorizationRequired: "FOUNDER_PROSPECT_INPUT_REQUIRED",
    });
    const before = projectCommandActivity({ organizationId: "org_a", ventureId: "ven_a" });
    expect(before.counts.blockedMissions).toBe(1);
    expect(before.counts.authorizationRequired).toBe(1);
    expect(before.nowInspecting.currentMission).toBe("TEST_MISSION");
    expect(before.nowInspecting.currentPhase).toBeTruthy();
    expect(before.nowInspecting.currentStep).toBe("GENERATE_VALIDATION_ARTIFACT");
    expect(before.nowInspecting.why).toBeTruthy();
    expect(before.nowInspecting.startedAt).toBeTruthy();
    expect(before.nowInspecting.lastActivity).toBeTruthy();
    expect(before.nowInspecting.blocker).toBe("FOUNDER_PROSPECT_INPUT_REQUIRED");
    expect(before.nowInspecting.authorizationRequired).toBe("FOUNDER_PROSPECT_INPUT_REQUIRED");
    expect(before.rooms.product_lab.allowAmbientMotion).toBe(false);
    const snapshot = exportMissionActivitySnapshot();
    resetMissionActivityStore();
    expect(projectCommandActivity({ organizationId: "org_a", ventureId: "ven_a" }).counts.activeMissions).toBe(0);
    hydrateMissionActivitySnapshot(snapshot);
    const after = projectCommandActivity({ organizationId: "org_a", ventureId: "ven_a" });
    expect(after.nowInspecting.currentMission).toBe("TEST_MISSION");
    expect(after.recentEvents.some((event) => event.eventId === started.eventId)).toBe(true);
    expect(after.rooms.product_lab.status).not.toBe("ACTIVE_WORK");
  });

  it("marks waiting missions WAITING_EXTERNAL without ambient motion", () => {
    emitMissionActivity({
      organizationId: "org_wait",
      ventureId: "ven_wait",
      missionId: "msn_wait",
      missionType: "COLLECTING_EVIDENCE",
      engine: "market_validation",
      stepType: "WAIT_FOR_PROSPECT",
      eventType: "MISSION_WAITING",
    });
    const view = projectCommandActivity({ organizationId: "org_wait", ventureId: "ven_wait" });
    expect(view.counts.waitingMissions).toBe(1);
    expect(view.counts.activeMissions).toBe(0);
    expect(view.rooms.quality_control.status).toBe("WAITING_EXTERNAL");
    expect(view.rooms.quality_control.allowAmbientMotion).toBe(false);
  });

  it("reconstructs activity from disk after a process restart", () => {
    process.env.INFINITY_MISSION_ACTIVITY_PERSIST = "1";
    const prior = existsSync(MISSION_ACTIVITY_PERSIST_FILE) ? readFileSync(MISSION_ACTIVITY_PERSIST_FILE, "utf8") : null;
    emitMissionActivity({
      organizationId: "org_restart",
      ventureId: "ven_restart",
      missionId: "msn_restart",
      missionType: "RESTART_MISSION",
      engine: "venture_build_orchestration",
      stepType: "PRODUCTION_BUILD",
      eventType: "STEP_STARTED",
    });
    simulateMissionActivityProcessRestart();
    const view = projectCommandActivity({ organizationId: "org_restart", ventureId: "ven_restart" });
    expect(view.counts.activeMissions).toBe(1);
    expect(view.nowInspecting.currentMission).toBe("RESTART_MISSION");
    expect(view.nowInspecting.currentStep).toBe("PRODUCTION_BUILD");
    if (prior) writeFileSync(MISSION_ACTIVITY_PERSIST_FILE, prior, "utf8");
    else if (existsSync(MISSION_ACTIVITY_PERSIST_FILE)) unlinkSync(MISSION_ACTIVITY_PERSIST_FILE);
  });

  it("fails a step without marking the room ACTIVE_WORK", async () => {
    await expect(
      runInstrumentedStep({
        emit: {
          organizationId: "org_b",
          ventureId: "ven_b",
          missionId: "msn_fail",
          missionType: "FAIL_MISSION",
          engine: "launch_gateway",
          stepType: "CREATE_DEPLOYMENT",
        },
        run: () => {
          throw new Error("provider_error");
        },
      }),
    ).rejects.toThrow("provider_error");
    const view = projectCommandActivity({ organizationId: "org_b", ventureId: "ven_b" });
    expect(view.rooms.launch_operations.status).toBe("FAILED");
    expect(view.rooms.launch_operations.allowAmbientMotion).toBe(false);
    expect(view.systemView.failureCode).toBe("Error");
  });

  it("supports concurrent global and venture missions", () => {
    emitMissionActivity({
      organizationId: "org_c",
      ventureId: "ven_one",
      missionId: "msn_one",
      missionType: "VENTURE_BUILD",
      engine: "venture_build_orchestration",
      stepType: "PRODUCTION_BUILD",
      eventType: "STEP_STARTED",
    });
    emitMissionActivity({
      organizationId: "org_c",
      ventureId: null,
      missionId: "msn_global",
      missionType: "ORG_SCAN",
      engine: "opportunity_scanner",
      stepType: "SCAN",
      eventType: "STEP_STARTED",
    });
    const venture = projectCommandActivity({ organizationId: "org_c", ventureId: "ven_one" });
    const global = projectCommandActivity({ organizationId: "org_c", ventureId: null });
    expect(venture.counts.activeMissions).toBe(1);
    expect(venture.rooms.product_lab.status).toBe("ACTIVE_WORK");
    expect(global.counts.activeMissions).toBe(1);
    expect(global.rooms.opportunity_lab.status).toBe("ACTIVE_WORK");
  });

  it("simulates a multi-step repair mission with truthful HQ transitions", async () => {
    const simulated = await simulatePublicArtifactRepairMission();
    expect(simulated.view.executionClass).toBe("VENTURE_EXECUTION");
    expect(simulated.stateSequence[0]).toBe("EMPTY");
    expect(simulated.stateSequence).toContain("ACTIVE_WORK");
    expect(simulated.stateSequence).toContain("READY_BLOCKED");
    expect(simulated.stateSequence.at(-1)).toBe("PRESENT_IDLE");
    expect(simulated.roomSequence).toContain("Creation Lab");
    expect(simulated.events.length).toBeGreaterThan(8);
    expect(simulated.view.counts.activeMissions).toBe(0);
    expect(simulated.view.rooms.product_lab.status).toBe("PRESENT_IDLE");
    expect(simulated.view.rooms.product_lab.allowAmbientMotion).toBe(false);
    expect(simulated.view.latestCompleted?.missionType).toBe("MARKET_VALIDATION_PUBLIC_ARTIFACT_REPAIR");
    const attached = attachCommandActivity(emptySnapshot(), simulated.view);
    expect(attached.commandActivity?.nowInspecting.currentMission).toBeNull();
    expect(attached.commandActivity?.latestCompleted?.missionType).toBe("MARKET_VALIDATION_PUBLIC_ARTIFACT_REPAIR");
    expect(attached.latestCompletedExecution?.missionType).toBe("MARKET_VALIDATION_PUBLIC_ARTIFACT_REPAIR");
    expect(attached.currentActivity.active).toBe(false);
  });

  it("ingests canonical mission-runtime events without Cursor-as-agent claims", () => {
    recordMissionRuntimeEvent({
      eventType: "mission.runtime_started",
      message: "Runtime started",
      payload: {
        organizationId: "org_rt",
        missionId: "msn_rt",
        runtimeInstanceId: "rt_1",
        stage: "execution",
        status: "running",
        stateVersion: 1,
      },
    });
    const view = projectCommandActivity({ organizationId: "org_rt" });
    expect(view.counts.activeMissions).toBe(1);
    expect(view.rooms.executive_office.status).toBe("ACTIVE_WORK");
    const consoleUi = readFileSync(join(ROOT, "components/dashboard/operator-console/venture-operator-console.tsx"), "utf8");
    expect(consoleUi).not.toMatch(/setInterval\(\s*\(\)\s*=>\s*setFake|Math\.random\(\).*progress/);
    expect(consoleUi).toContain("commandActivity");
    expect(CURSOR_IS_NOT_AN_INFINITY_WORKER).toBeTruthy();
  });

  it("does not treat Cursor or system development as venture ACTIVE_WORK", () => {
    emitMissionActivity({
      organizationId: "org_dev",
      missionId: "msn_sys_build",
      missionType: "INFINITY_CORE_IMPLEMENTATION",
      engine: "mission_runtime",
      stepType: "SYSTEM_BUILD",
      eventType: "STEP_STARTED",
      executionClass: "SYSTEM_DEVELOPMENT",
    });
    const view = projectCommandActivity({ organizationId: "org_dev" });
    expect(view.executionClass).toBe("SYSTEM_DEVELOPMENT");
    expect(view.executionClass).not.toBe("VENTURE_EXECUTION");
    expect(view.counts.activeMissions).toBe(0);
    expect(view.rooms.executive_office.status).not.toBe("ACTIVE_WORK");
    expect(CURSOR_IS_NOT_AN_INFINITY_WORKER).toMatch(/developer implementation/);
  });

  it("does not change CRE collecting truth or invent ACTIVE_WORK", () => {
    const evidence = inspectRealMarketEvidence({ now: new Date("2026-08-29T16:00:00.000Z") });
    const hq = inspectCollectingHqPresence({ experimentState: "COLLECTING" });
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.acquisition.mission.missionState).not.toBe("ACTIVE_WORK");
    expect(hq.creationLab).toBe("PRESENT_IDLE");
    expect(hq.deploymentDepot).toBe("PRESENT_IDLE");
    expect(hq.fakeActiveWork).toBe(false);
  });

  it("preserves HQ Command, Money, and Now Inspecting surfaces", () => {
    const dashboard = readFileSync(join(ROOT, "app/dashboard/page.tsx"), "utf8");
    const money = readFileSync(
      join(ROOT, "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"),
      "utf8",
    );
    const command = readFileSync(join(ROOT, "components/dashboard/operator-console/command-chamber.tsx"), "utf8");
    const inspecting = readFileSync(
      join(ROOT, "components/dashboard/operator-console/inspection-context-bar.tsx"),
      "utf8",
    );
    const prefetch = readFileSync(
      join(ROOT, "lib/infinity/operator-console/load-hq-dashboard.ts"),
      "utf8",
    );
    expect(dashboard).toContain("InfinityHqExperience");
    expect(money).toContain('money: "Money"');
    expect(command).toContain("CommandActivityStrip");
    expect(inspecting).toContain("NOW INSPECTING");
    expect(inspecting).toContain("Current mission");
    expect(prefetch).toContain("one inspected venture");
    expect(prefetch).not.toContain("SNAPSHOT_PREFETCH_LIMIT");
  });
});
