import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { attachCommandActivity } from "../attach";
import { emitMissionActivity } from "../emit";
import {
  persistFailedFinalRepairSuccessorMissionHistory,
  FAILED_FINAL_REPAIR_DEPLOYMENT_ID,
  FAILED_FINAL_REPAIR_MISSION_ID,
} from "../persist-failed-cre-final-repair-mission";
import { HQ_CROSS_PROCESS_PROOF_MISSION_ID } from "../hq-cross-process-observability-proof";
import { projectCommandActivity } from "../project";
import {
  listMissionActivityEvents,
  resetMissionActivityStore,
  setMissionActivityPersistPath,
  simulateMissionActivityProcessRestart,
} from "../store";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

const ROOT = join(process.cwd());

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

function favc1Snapshot(organizationId: string): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: "favc1-cycle:cycle-1786949554348",
      organizationId,
      missionId: "favc1-cycle",
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "Autonomous Venture Cycle",
      ventureType: "first_autonomous_venture_v1",
      assemblyStatus: "running",
      readinessStatus: null,
      launchStage: null,
      correlationIds: [],
    },
    overallStatus: "RUNNING",
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
        ["executive_office", "Command"],
        ["launch_operations", "Deployment Depot"],
        ["quality_control", "Validation Station"],
        ["product_lab", "Creation Lab"],
        ["creative_studio", "Design Core"],
        ["research_department", "Research Grid"],
      ] as const
    ).map(([id, label]) => ({
      id,
      label,
      state: "NOT_STARTED" as const,
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
  };
}

describe("HQ CROSS-PROCESS LIVE OBSERVABILITY V1", () => {
  let tempDir: string;
  const previousPersist = process.env.INFINITY_MISSION_ACTIVITY_PERSIST;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "hq-mission-activity-"));
    process.env.INFINITY_MISSION_ACTIVITY_PERSIST = "1";
    setMissionActivityPersistPath(join(tempDir, "events.json"));
    resetMissionActivityStore();
  });

  afterEach(() => {
    setMissionActivityPersistPath(null);
    if (previousPersist == null) delete process.env.INFINITY_MISSION_ACTIVITY_PERSIST;
    else process.env.INFINITY_MISSION_ACTIVITY_PERSIST = previousPersist;
    resetMissionActivityStore();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("lets a second process read an in-flight mission from durable disk before the writer completes", () => {
    emitMissionActivity({
      organizationId: LIVE_ORG,
      ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
      missionId: HQ_CROSS_PROCESS_PROOF_MISSION_ID,
      missionType: "HQ_CROSS_PROCESS_LIVE_OBSERVABILITY_PROOF",
      engine: "launch_gateway",
      stepType: "DEPLOYMENT_RECONCILIATION_SIMULATION_READ_ONLY",
      eventType: "MISSION_STARTED",
      executionClass: "VENTURE_EXECUTION",
    });
    emitMissionActivity({
      organizationId: LIVE_ORG,
      ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
      missionId: HQ_CROSS_PROCESS_PROOF_MISSION_ID,
      missionType: "HQ_CROSS_PROCESS_LIVE_OBSERVABILITY_PROOF",
      engine: "launch_gateway",
      stepType: "DEPLOYMENT_RECONCILIATION_SIMULATION_READ_ONLY",
      eventType: "STEP_STARTED",
      summary: "Reconciling the existing failed Vercel deployment read-only.",
      executionClass: "VENTURE_EXECUTION",
    });

    simulateMissionActivityProcessRestart();
    const view = projectCommandActivity({ organizationId: LIVE_ORG });
    expect(view.counts.activeMissions).toBeGreaterThanOrEqual(1);
    expect(view.rooms.executive_office.status).toBe("ACTIVE_WORK");
    expect(view.rooms.launch_operations.status).toBe("ACTIVE_WORK");
    expect(view.nowInspecting.currentTask).toMatch(/Reconciling/);

    const attached = attachCommandActivity(favc1Snapshot(LIVE_ORG));
    expect(attached.currentActivity.active).toBe(true);
    expect(attached.commandActivity?.counts.activeMissions).toBeGreaterThanOrEqual(1);
    expect(attached.departments.find((dept) => dept.id === "launch_operations")?.isActive).toBe(true);
    expect(attached.workerNodes?.some((node) => node.motionActive && node.displayTask)).toBe(true);
  });

  it("does not hide org-level Command activity behind the inspected FAVC1 cycle identity", () => {
    emitMissionActivity({
      organizationId: LIVE_ORG,
      ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
      missionId: "msn_other_venture_deploy",
      missionType: "CRE_FINAL_REPAIR_SUCCESSOR_DEPLOY",
      engine: "launch_gateway",
      stepType: "CREATE_DEPLOYMENT",
      eventType: "STEP_STARTED",
      executionClass: "VENTURE_EXECUTION",
    });
    const attached = attachCommandActivity(favc1Snapshot(LIVE_ORG));
    expect(attached.venture.ventureAssemblyId).toBe("favc1-cycle:cycle-1786949554348");
    expect(attached.commandActivity?.counts.activeMissions).toBeGreaterThanOrEqual(1);
    expect(attached.commandActivity?.rooms.executive_office.status).toBe("ACTIVE_WORK");
  });

  it("persists the failed CRE deployment mission with retry prohibited", async () => {
    const result = await persistFailedFinalRepairSuccessorMissionHistory();
    expect(result.persisted).toBe(true);
    const events = listMissionActivityEvents({
      organizationId: LIVE_ORG,
      missionId: FAILED_FINAL_REPAIR_MISSION_ID,
    });
    expect(events.some((event) => event.traceability.deploymentId === FAILED_FINAL_REPAIR_DEPLOYMENT_ID)).toBe(true);
    expect(events.some((event) => event.eventType === "MISSION_FAILED")).toBe(true);
    expect(events.some((event) => event.blocker === "RETRY_NOT_AUTHORIZED")).toBe(true);
    expect(events.some((event) => /VALIDATION_CANDIDATE_ID/.test(event.technicalDetail ?? ""))).toBe(true);
    simulateMissionActivityProcessRestart();
    const restored = listMissionActivityEvents({
      organizationId: LIVE_ORG,
      missionId: FAILED_FINAL_REPAIR_MISSION_ID,
    });
    expect(restored.length).toBeGreaterThan(0);
    expect(restored.some((event) => event.eventType === "MISSION_FAILED")).toBe(true);
  });

  it("keeps the founder favc1-cycle HTTP path dynamic and hydrating durable activity", () => {
    const route = read("app/api/operator-console/favc1-cycle/route.ts");
    const snapshot = read("lib/infinity/operator-console/favc1-cycle/build-cycle-snapshot.ts");
    const consoleUi = read("components/dashboard/operator-console/venture-operator-console.tsx");
    const chamber = read("components/dashboard/operator-console/command-chamber.tsx");
    const strip = read("components/dashboard/operator-console/command-activity-strip.tsx");
    expect(route).toContain('export const dynamic = "force-dynamic"');
    expect(route).toContain("Cache-Control");
    expect(route).toContain("no-store");
    expect(route).toContain("isLocalHqObservabilityProofRequest");
    expect(snapshot).toContain("prepareHqMissionActivityProjection");
    expect(route).toContain("attachHqCanonicalLiveState");
    expect(consoleUi).toContain("favc1CyclePollUrl");
    expect(consoleUi).toContain("useHqLiveProjection(refresh)");
    expect(consoleUi).toContain("cache: \"no-store\"");
    expect(consoleUi).toContain("hq-live-state");
    expect(consoleUi).toContain("commitHqClientSnapshot");
    expect(consoleUi).toContain("commandActivity={snapshot.commandActivity ?? null}");
    expect(chamber).toContain("commandActivity?.rooms.executive_office?.status");
    expect(strip).toContain("data-hq-activity-active");
    expect(read("lib/infinity/mission-activity/instrument.ts")).toContain("commitMissionActivityDurably");
    expect(read("lib/infinity/mission-activity/hq-cross-process-observability-proof.ts")).toContain(
      HQ_CROSS_PROCESS_PROOF_MISSION_ID,
    );
  });

});
