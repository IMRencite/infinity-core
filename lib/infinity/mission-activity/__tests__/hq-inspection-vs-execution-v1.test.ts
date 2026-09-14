import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import {
  acceptHqPollGeneration,
  acceptHqPollSnapshot,
  shouldApplyInitialHqSnapshot,
} from "@/lib/infinity/operator-console/hq-poll-generation";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import {
  attachCommandActivity,
  emitMissionActivity,
  persistFailedFinalRepairSuccessorMissionHistory,
  projectCommandActivity,
  resetMissionActivityStore,
  FAILED_FINAL_REPAIR_DEPLOYMENT_ID,
  FAILED_FINAL_REPAIR_MISSION_ID,
  HQ_CURRENT_EXECUTION_PROOF_MISSION,
  HQ_CURRENT_EXECUTION_PROOF_MISSION_ID,
  listMissionActivityEvents,
} from "../index";

const ROOT = join(process.cwd());
const HISTORICAL_MISSION = "MISSION_KNOWLEDGE_GRAPH_ANSWER_AUTHORITY_QC";
const HISTORICAL_MISSION_ID = "msn_qkg_answer_authority_qc_v1";
const CYCLE_KEY = "cycle-1786949554348";

function favc1InspectionSnapshot(organizationId = LIVE_ORG): OperatorVentureSnapshot {
  return {
    generatedAt: "2026-08-30T18:00:00.000Z",
    venture: {
      ventureAssemblyId: `favc1-cycle:${CYCLE_KEY}`,
      organizationId,
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

function emitHistoricalQc(at: string): void {
  emitMissionActivity({
    organizationId: LIVE_ORG,
    ventureId: `favc1-cycle:${CYCLE_KEY}`,
    missionId: HISTORICAL_MISSION_ID,
    missionType: HISTORICAL_MISSION,
    engine: "quality_control",
    stepType: "AUTHORITY_REPAIR_PLAN",
    eventType: "MISSION_STARTED",
    observedAt: at,
    startedAt: at,
    executionClass: "VENTURE_EXECUTION",
    summary: "Recording a targeted authority repair plan",
  });
  emitMissionActivity({
    organizationId: LIVE_ORG,
    ventureId: `favc1-cycle:${CYCLE_KEY}`,
    missionId: HISTORICAL_MISSION_ID,
    missionType: HISTORICAL_MISSION,
    engine: "quality_control",
    stepType: "AUTHORITY_REPAIR_PLAN",
    eventType: "STEP_STARTED",
    observedAt: at,
    startedAt: at,
    executionClass: "VENTURE_EXECUTION",
    summary: "Recording a targeted authority repair plan",
  });
  emitMissionActivity({
    organizationId: LIVE_ORG,
    ventureId: `favc1-cycle:${CYCLE_KEY}`,
    missionId: HISTORICAL_MISSION_ID,
    missionType: HISTORICAL_MISSION,
    engine: "quality_control",
    stepType: "AUTHORITY_REPAIR_PLAN",
    eventType: "STEP_COMPLETED",
    observedAt: at,
    completedAt: at,
    executionClass: "VENTURE_EXECUTION",
    summary: "Recording a targeted authority repair plan",
  });
  emitMissionActivity({
    organizationId: LIVE_ORG,
    ventureId: `favc1-cycle:${CYCLE_KEY}`,
    missionId: HISTORICAL_MISSION_ID,
    missionType: HISTORICAL_MISSION,
    engine: "quality_control",
    stepType: "AUTHORITY_REPAIR_PLAN",
    eventType: "MISSION_COMPLETED",
    observedAt: at,
    completedAt: at,
    executionClass: "VENTURE_EXECUTION",
    summary: "Question knowledge graph answer authority QC completed",
  });
}

function emitActiveProof(): void {
  emitMissionActivity({
    organizationId: LIVE_ORG,
    ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    missionId: HQ_CURRENT_EXECUTION_PROOF_MISSION_ID,
    missionType: HQ_CURRENT_EXECUTION_PROOF_MISSION,
    engine: "venture_systems_architecture",
    stepType: "SITE_ARCHITECTURE",
    eventType: "MISSION_STARTED",
    observedAt: "2026-08-30T19:00:00.000Z",
    startedAt: "2026-08-30T19:00:00.000Z",
    executionClass: "VENTURE_EXECUTION",
    summary: "Zero-write HQ current-execution proof",
  });
  emitMissionActivity({
    organizationId: LIVE_ORG,
    ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    missionId: HQ_CURRENT_EXECUTION_PROOF_MISSION_ID,
    missionType: HQ_CURRENT_EXECUTION_PROOF_MISSION,
    engine: "venture_systems_architecture",
    stepType: "SITE_ARCHITECTURE",
    eventType: "STEP_STARTED",
    observedAt: "2026-08-30T19:00:01.000Z",
    startedAt: "2026-08-30T19:00:01.000Z",
    executionClass: "VENTURE_EXECUTION",
    summary: "Planning the successor architecture for the current execution proof.",
  });
}

describe("HQ inspection vs live execution v1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
  });

  it("keeps FAVC1 inspection historical while Command selects the newer active proof", () => {
    emitHistoricalQc("2026-08-30T18:33:12.828Z");
    emitActiveProof();
    const view = projectCommandActivity({ organizationId: LIVE_ORG });
    expect(view.counts.activeMissions).toBeGreaterThanOrEqual(1);
    expect(view.nowInspecting.currentMission).toBe(HQ_CURRENT_EXECUTION_PROOF_MISSION);
    expect(view.nowInspecting.currentMission).not.toBe(HISTORICAL_MISSION);
    expect(view.systemView.missionId).toBe(HQ_CURRENT_EXECUTION_PROOF_MISSION_ID);
    expect(view.rooms.executive_office.status).toBe("ACTIVE_WORK");
    expect(view.rooms.systems_architect.status).toBe("ACTIVE_WORK");
    expect(view.rooms.launch_operations.status).not.toBe("ACTIVE_WORK");
    expect(view.activeWorkers.some((worker) => worker.missionId === HQ_CURRENT_EXECUTION_PROOF_MISSION_ID)).toBe(true);

    const attached = attachCommandActivity(favc1InspectionSnapshot(), view);
    expect(attached.inspectionContext?.kind).toBe("FAVC1_CYCLE");
    expect(attached.inspectionContext?.cycleKey).toBe(CYCLE_KEY);
    expect(attached.inspectionContext?.terminalHeadline).toBe(
      "Mission Completed — Candidate Still Requires Validation",
    );
    expect(attached.currentExecution?.currentMission).toBe(HQ_CURRENT_EXECUTION_PROOF_MISSION);
    expect(attached.currentActivity.active).toBe(true);
    expect(attached.currentActivity.task).not.toBe("Recording a targeted authority repair plan");
    expect(attached.latestCompletedExecution?.missionId).toBe(HISTORICAL_MISSION_ID);
    expect(attached.roomPresence?.find((room) => room.room === "systems_architect")?.status).toBe("ACTIVE_WORK");
    expect(attached.favc1Cycle?.cycleKey).toBe(CYCLE_KEY);
  });

  it("selects latest completed by chronology, not the inspected cycle", () => {
    emitHistoricalQc("2026-08-30T18:33:12.828Z");
    emitMissionActivity({
      organizationId: LIVE_ORG,
      ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
      missionId: HQ_CURRENT_EXECUTION_PROOF_MISSION_ID,
      missionType: HQ_CURRENT_EXECUTION_PROOF_MISSION,
      engine: "market_validation",
      stepType: "VALIDATION_REVIEW",
      eventType: "MISSION_STARTED",
      observedAt: "2026-08-30T19:10:00.000Z",
      startedAt: "2026-08-30T19:10:00.000Z",
      executionClass: "VENTURE_EXECUTION",
    });
    emitMissionActivity({
      organizationId: LIVE_ORG,
      ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
      missionId: HQ_CURRENT_EXECUTION_PROOF_MISSION_ID,
      missionType: HQ_CURRENT_EXECUTION_PROOF_MISSION,
      engine: "market_validation",
      stepType: "VALIDATION_REVIEW",
      eventType: "MISSION_COMPLETED",
      observedAt: "2026-08-30T19:10:20.000Z",
      completedAt: "2026-08-30T19:10:20.000Z",
      executionClass: "VENTURE_EXECUTION",
      summary: "Zero-write HQ current-execution proof completed",
    });
    const view = projectCommandActivity({ organizationId: LIVE_ORG });
    expect(view.counts.activeMissions).toBe(0);
    expect(view.nowInspecting.currentMission).toBeNull();
    expect(view.latestCompleted?.missionId).toBe(HQ_CURRENT_EXECUTION_PROOF_MISSION_ID);
    expect(view.latestCompleted?.missionType).toBe(HQ_CURRENT_EXECUTION_PROOF_MISSION);
    expect(view.rooms.executive_office.status).not.toBe("ACTIVE_WORK");
    const attached = attachCommandActivity(favc1InspectionSnapshot(), view);
    expect(attached.currentActivity.active).toBe(false);
    expect(attached.latestCompletedExecution?.missionId).toBe(HQ_CURRENT_EXECUTION_PROOF_MISSION_ID);
    expect(attached.inspectionContext?.terminalHeadline).toContain("Candidate Still Requires Validation");
  });

  it("projects rooms and workers from live execution, not the inspected FAVC1 snapshot", () => {
    emitHistoricalQc("2026-08-30T18:33:12.828Z");
    emitActiveProof();
    emitMissionActivity({
      organizationId: LIVE_ORG,
      ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
      missionId: HQ_CURRENT_EXECUTION_PROOF_MISSION_ID,
      missionType: HQ_CURRENT_EXECUTION_PROOF_MISSION,
      engine: "product_asset_builder",
      stepType: "PAGE_GENERATION",
      eventType: "STEP_STARTED",
      observedAt: "2026-08-30T19:00:08.000Z",
      startedAt: "2026-08-30T19:00:08.000Z",
      executionClass: "VENTURE_EXECUTION",
      summary: "Generating the successor page locally. No provider write.",
    });
    const attached = attachCommandActivity(favc1InspectionSnapshot());
    expect(attached.commandActivity?.rooms.product_lab.status).toBe("ACTIVE_WORK");
    expect(attached.commandActivity?.rooms.systems_architect.status).toBe("ACTIVE_WORK");
    expect(attached.departments.find((dept) => dept.id === "product_lab")?.isActive).toBe(true);
    expect(attached.departments.find((dept) => dept.id === "launch_operations")?.isActive).toBe(false);
    expect(attached.workerNodes?.some((node) => node.departmentId === "product_lab" && node.motionActive)).toBe(true);
    expect(attached.activeWorkers?.some((worker) => worker.stepType === "PAGE_GENERATION")).toBe(true);
  });

  it("preserves the failed CRE deployment as terminal history, not current work", async () => {
    const result = await persistFailedFinalRepairSuccessorMissionHistory();
    expect(result.persisted).toBe(true);
    emitHistoricalQc("2026-08-30T18:33:12.828Z");
    emitActiveProof();
    const events = listMissionActivityEvents({
      organizationId: LIVE_ORG,
      missionId: FAILED_FINAL_REPAIR_MISSION_ID,
    });
    expect(events.some((event) => event.traceability.deploymentId === FAILED_FINAL_REPAIR_DEPLOYMENT_ID)).toBe(true);
    expect(events.some((event) => event.eventType === "MISSION_FAILED")).toBe(true);
    const view = projectCommandActivity({ organizationId: LIVE_ORG });
    expect(view.nowInspecting.currentMission).toBe(HQ_CURRENT_EXECUTION_PROOF_MISSION);
    expect(view.systemView.missionId).not.toBe(FAILED_FINAL_REPAIR_MISSION_ID);
    expect(view.counts.activeMissions).toBeGreaterThanOrEqual(1);
  });

  it("accepts fresher poll snapshots and refuses stale SSR overwrites", () => {
    expect(acceptHqPollGeneration(3, 3)).toBe(true);
    expect(acceptHqPollGeneration(3, 2)).toBe(false);
    expect(
      acceptHqPollSnapshot(
        {
          generatedAt: "2026-08-30T19:00:10.000Z",
          lastActivityAt: "2026-08-30T19:00:10.000Z",
          activeCount: 1,
          currentMission: HQ_CURRENT_EXECUTION_PROOF_MISSION,
          ventureAssemblyId: `favc1-cycle:${CYCLE_KEY}`,
        },
        {
          generatedAt: "2026-08-30T19:00:12.000Z",
          lastActivityAt: "2026-08-30T18:33:12.828Z",
          activeCount: 0,
          currentMission: null,
          ventureAssemblyId: `favc1-cycle:${CYCLE_KEY}`,
        },
      ),
    ).toBe(false);
    expect(
      shouldApplyInitialHqSnapshot(
        { generatedAt: "2026-08-30T19:00:10.000Z", ventureAssemblyId: `favc1-cycle:${CYCLE_KEY}` },
        { generatedAt: "2026-08-30T18:00:00.000Z", ventureAssemblyId: `favc1-cycle:${CYCLE_KEY}` },
      ),
    ).toBe(false);
    expect(
      shouldApplyInitialHqSnapshot(
        { generatedAt: "2026-08-30T18:00:00.000Z", ventureAssemblyId: `favc1-cycle:${CYCLE_KEY}` },
        { generatedAt: "2026-08-30T18:00:00.000Z", ventureAssemblyId: "favc1-cycle:other" },
      ),
    ).toBe(true);
  });

  it("wires the founder HQ poll path to generation-safe replacement", () => {
    const consoleUi = readFileSync(join(ROOT, "components/dashboard/operator-console/venture-operator-console.tsx"), "utf8");
    const chamber = readFileSync(join(ROOT, "components/dashboard/operator-console/command-chamber.tsx"), "utf8");
    const strip = readFileSync(join(ROOT, "components/dashboard/operator-console/command-activity-strip.tsx"), "utf8");
    expect(consoleUi).toContain("commitHqClientSnapshot");
    expect(consoleUi).toContain("restoreHqClientSnapshot");
    expect(consoleUi).toContain("appliedFreshness");
    expect(chamber).toContain("data-hq-inspection-context");
    expect(chamber).toContain("data-hq-current-execution");
    expect(chamber).toContain("IDLE — no active canonical work");
    expect(strip).toContain("live &&");
  });
});
