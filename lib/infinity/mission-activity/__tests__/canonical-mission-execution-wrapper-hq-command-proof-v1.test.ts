import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LIVE_ORG, PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { activatePremiumAuthoritySuccessorPublicArtifact } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { resetCurrentCreValidationArtifactIdCache } from "@/lib/infinity/market-validation-experiment/current-cre-artifact";
import { resetExperimentRuntime } from "@/lib/infinity/market-validation-experiment/execute";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { CANONICAL_EVIDENCE_START } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { resetExecutableBuildRuntime } from "@/lib/infinity/venture-build-orchestration";
import {
  QUESTION_AUTHORITY_QC_MISSION,
  QUESTION_AUTHORITY_QC_MISSION_ID,
  runQuestionAuthorityQcMission,
} from "@/lib/infinity/venture-website-architecture";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import {
  attachCommandActivity,
  emitMissionActivity,
  instrumentedRuntimeRegistry,
  listMissionActivityEvents,
  projectCommandActivity,
  resetMissionActivityStore,
  runInstrumentedMission,
  simulateMissionActivityProcessRestart,
} from "../index";

const ROOT = join(process.cwd());

function hqSnapshot(organizationId: string): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: "favc1-unrelated-inspected-venture",
      organizationId,
      missionId: "msn_other",
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "Inspected HQ venture",
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
    departments: (
      [
        ["research_department", "Research Grid"],
        ["systems_architect", "Systems Architect"],
        ["quality_control", "Validation Station"],
        ["executive_office", "Command"],
        ["product_lab", "Creation Lab"],
        ["creative_studio", "Design Core"],
      ] as const
    ).map(([id, label]) => ({
      id,
      label,
      state: "NOT_STARTED",
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
  } as OperatorVentureSnapshot;
}

describe("CANONICAL MISSION EXECUTION WRAPPER + LIVE HQ COMMAND PROOF V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetExecutableBuildRuntime();
    resetExperimentRuntime();
    resetCurrentCreValidationArtifactIdCache();
    activatePremiumAuthoritySuccessorPublicArtifact();
  });

  afterEach(() => {
    delete process.env.INFINITY_MISSION_ACTIVITY_PERSIST;
    resetMissionActivityStore();
  });

  it("registers one reusable mission boundary and runtime adoption states", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.wrapper).toBe("runInstrumentedMission");
    expect(registry.stepWrapper).toBe("runInstrumentedStep");
    expect(registry.schema).toBe("MISSION_ACTIVITY_EVENT_V1");
    expect(registry.anotherTelemetryModel).toBe(false);
    expect(registry.runtimes.QuestionKnowledgeGraphQcRuntime.adoption).toBe("USES_CANONICAL_MISSION_WRAPPER");
    expect(registry.runtimes.MarketValidationAcquisitionRuntime.adoption).toBe("PARTIAL");
    expect(registry.runtimes.CreBoundedOutreachRuntime.adoption).toBe("USES_CANONICAL_MISSION_WRAPPER");
    expect(registry.contracts.CreBoundedOutreachRuntime.usesCanonicalMissionWrapper).toBe(true);
    expect(registry.contracts.CreBoundedOutreachRuntime.missionType).toBe("CRE_WAVE_1_FRESH_CONTACT_REVERIFICATION_AND_SEND_V3");
    expect(registry.runtimes.PublicWebResearchRuntime.adoption).toBe("PARTIAL");
    expect(registry.runtimes.AutonomousVentureWebsiteBuildRuntime.adoption).toBe("NOT_INTEGRATED");
    expect(registry.runtimes.deploymentRuntime.adoption).toBe("NOT_INTEGRATED");
    expect(registry.runtimes.PerformanceIntelligence.adoption).toBe("NOT_INTEGRATED");
    expect(registry.contracts.QuestionKnowledgeGraphQcRuntime.usesCanonicalMissionWrapper).toBe(true);
  });

  it("persists start/step/complete/fail/blocked/waiting/authorization without fake progress", async () => {
    const failed = runInstrumentedMission({
      emit: {
        organizationId: "org_wrap",
        ventureId: "ven_wrap",
        missionId: "msn_fail_wrap",
        missionType: "WRAPPER_FAIL",
        executionClass: "VENTURE_EXECUTION",
      },
      knownSteps: ["STEP_A"],
      run: async (handle) => {
        await handle.step({
          stepType: "STEP_A",
          engine: "market_validation",
          run: () => {
            throw new Error("grounded_failure");
          },
        });
      },
    });
    await expect(failed).rejects.toThrow("grounded_failure");
    expect(listMissionActivityEvents({ missionId: "msn_fail_wrap" }).some((event) => event.eventType === "MISSION_FAILED")).toBe(true);

    const blocked = await runInstrumentedMission({
      emit: {
        organizationId: "org_wrap",
        ventureId: "ven_wrap",
        missionId: "msn_block_wrap",
        missionType: "WRAPPER_BLOCK",
        executionClass: "VENTURE_EXECUTION",
      },
      knownSteps: ["STEP_A"],
      run: async (handle) => {
        handle.blocked({
          blocker: "PROVIDER_CAPABILITY_UNVERIFIED",
          authorizationRequired: "FOUNDER_AUTHORIZATION_REQUIRED",
          summary: "Provider capability missing",
        });
        return "blocked";
      },
    });
    expect(blocked.view.counts.blockedMissions).toBe(1);
    expect(blocked.view.counts.authorizationRequired).toBe(1);
    expect(blocked.view.counts.activeMissions).toBe(0);
    expect(blocked.view.nowInspecting.authorizationRequired).toBe("FOUNDER_AUTHORIZATION_REQUIRED");

    emitMissionActivity({
      organizationId: "org_wrap",
      ventureId: "ven_wait",
      missionId: "msn_wait_wrap",
      missionType: "WRAPPER_WAIT",
      engine: "grounded_research",
      stepType: "WEB_SEARCH",
      eventType: "MISSION_WAITING",
    });
    const waiting = projectCommandActivity({ organizationId: "org_wrap", ventureId: "ven_wait" });
    expect(waiting.counts.waitingMissions).toBe(1);
    expect(waiting.counts.activeMissions).toBe(0);
    expect(waiting.rooms.research_department.status).toBe("WAITING_EXTERNAL");
  });

  it("protects retries from duplicate active missions and supports concurrency", async () => {
    const first = await runInstrumentedMission({
      emit: {
        organizationId: "org_idemp",
        ventureId: "ven_idemp",
        missionId: "msn_idemp",
        missionType: "IDEMPOTENT_MISSION",
        executionClass: "VENTURE_EXECUTION",
      },
      knownSteps: ["STEP_A"],
      run: async (handle) => {
        await handle.step({ stepType: "STEP_A", engine: "mission_runtime", run: () => "ok" });
        return "done";
      },
    });
    const replay = await runInstrumentedMission({
      emit: {
        organizationId: "org_idemp",
        ventureId: "ven_idemp",
        missionId: "msn_idemp",
        missionType: "IDEMPOTENT_MISSION",
        executionClass: "VENTURE_EXECUTION",
      },
      knownSteps: ["STEP_A"],
      run: async (handle) => {
        await handle.step({ stepType: "STEP_A", engine: "mission_runtime", run: () => "ok" });
        return "done";
      },
    });
    const completed = listMissionActivityEvents({ missionId: "msn_idemp" }).filter((event) => event.eventType === "MISSION_COMPLETED");
    expect(first.result).toBe("done");
    expect(replay.result).toBe("done");
    expect(projectCommandActivity({ organizationId: "org_idemp", ventureId: "ven_idemp" }).counts.activeMissions).toBe(0);
    expect(new Set(completed.map((event) => event.eventId)).size).toBe(completed.length);

    emitMissionActivity({
      organizationId: "org_idemp",
      ventureId: "ven_a",
      missionId: "msn_conc_a",
      missionType: "CONCURRENT_A",
      engine: "grounded_research",
      stepType: "WEB_SEARCH",
      eventType: "STEP_STARTED",
    });
    emitMissionActivity({
      organizationId: "org_idemp",
      ventureId: "ven_b",
      missionId: "msn_conc_b",
      missionType: "CONCURRENT_B",
      engine: "market_validation",
      stepType: "VALIDATE_CONTENT_DEPTH",
      eventType: "STEP_STARTED",
    });
    const org = projectCommandActivity({ organizationId: "org_idemp" });
    expect(org.counts.activeMissions).toBe(2);
  });

  it("executes the real CRE authority QC through the wrapper and proves the HQ dashboard read model", async () => {
    process.env.INFINITY_MISSION_ACTIVITY_PERSIST = "1";
    const captured: { hq: OperatorVentureSnapshot | null } = { hq: null };
    const mission = await runQuestionAuthorityQcMission({
      organizationId: LIVE_ORG,
      onSnapshot: (view, phase) => {
        if (!captured.hq && view.counts.activeMissions >= 1 && phase.endsWith(":STARTED")) {
          captured.hq = attachCommandActivity(hqSnapshot(LIVE_ORG), view);
        }
      },
    });
    const midRunHq = captured.hq;
    expect(mission.finalResult).toBe("PASS");
    expect(mission.commandLiveProof.commandDuringOrchestration).toBe("ACTIVE_WORK");
    expect(mission.commandLiveProof.researchGridDuringResearch).toBe("ACTIVE_WORK");
    expect(mission.commandLiveProof.systemsArchitectDuringMapping).toBe("ACTIVE_WORK");
    expect(mission.commandLiveProof.validationStationDuringQc).toBe("ACTIVE_WORK");
    expect(mission.commandLiveProof.creationLabDuringAudit).toBe("PRESENT_IDLE");
    expect(midRunHq?.currentActivity.active).toBe(true);
    expect(midRunHq?.commandActivity?.counts.activeMissions).toBeGreaterThanOrEqual(1);
    expect(midRunHq?.commandActivity?.nowInspecting.currentMission).toBe(QUESTION_AUTHORITY_QC_MISSION);
    expect(midRunHq?.commandActivity?.nowInspecting.currentStep).toBeTruthy();
    expect(midRunHq?.commandActivity?.nowInspecting.why).toBeTruthy();
    expect(midRunHq?.commandActivity?.nowInspecting.startedAt).toBeTruthy();
    expect(midRunHq?.commandActivity?.nowInspecting.lastActivityAt).toBeTruthy();
    expect(midRunHq?.departments.find((dept: { id: string }) => dept.id === "product_lab")?.isActive).toBe(false);

    simulateMissionActivityProcessRestart();
    const refreshed = attachCommandActivity(hqSnapshot(LIVE_ORG));
    expect(refreshed.commandActivity?.counts.activeMissions).toBe(0);
    expect(refreshed.commandActivity?.latestCompleted?.missionId).toBe(QUESTION_AUTHORITY_QC_MISSION_ID);
    expect(refreshed.commandActivity?.latestCompleted?.missionType).toBe(QUESTION_AUTHORITY_QC_MISSION);
    expect(refreshed.commandActivity?.systemView.artifactId).toBe(PREMIUM_AUTHORITY_SITE_SUCCESSOR_ARTIFACT_ID);
    expect(refreshed.commandActivity?.rooms.research_department.status).toBe("PRESENT_IDLE");
    expect(refreshed.commandActivity?.rooms.systems_architect.status).toBe("PRESENT_IDLE");
    expect(refreshed.commandActivity?.rooms.quality_control.status).toBe("PRESENT_IDLE");
    expect(refreshed.commandActivity?.rooms.product_lab.status).toBe("EMPTY");
    expect(refreshed.currentActivity.active).toBe(false);

    const again = attachCommandActivity(hqSnapshot(LIVE_ORG));
    expect(again.commandActivity?.latestCompleted?.missionId).toBe(QUESTION_AUTHORITY_QC_MISSION_ID);

    const evidence = inspectRealMarketEvidence({ now: new Date("2026-08-30T04:48:00.000Z") });
    expect(evidence.experiment.state).toBe("COLLECTING");
    expect(evidence.clock.evidenceStart).toBe(CANONICAL_EVIDENCE_START);
    expect(evidence.clock.restarted).toBe(false);
    expect(evidence.counts.qualifiedVisitors).toBe(0);
    expect(mission.deployed).toBe(false);
    expect(mission.liveArtifactMutated).toBe(false);
    expect(readFileSync(join(ROOT, "components/dashboard/operator-console/venture-operator-console.tsx"), "utf8")).not.toMatch(
      /setInterval\(\s*\(\)\s*=>\s*setFake|Math\.random\(\).*progress/,
    );
    expect(readFileSync(join(ROOT, "lib/infinity/operator-console/operator-read-model.ts"), "utf8")).toContain(
      "prepareHqMissionActivityProjection",
    );
    expect(existsSync(join(ROOT, ".infinity/mission-activity/events.json"))).toBe(true);
  }, 180_000);
});
