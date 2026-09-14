import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CommandActivityStrip } from "@/components/dashboard/operator-console/command-activity-strip";
import { CommandChamber } from "@/components/dashboard/operator-console/command-chamber";
import { projectWorkerVisualState } from "@/lib/infinity/hq-live-activity";
import { attachCommandActivity, emitMissionActivity, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { ROOM_ACTIVITY_IDLE } from "@/lib/infinity/operator-console/room-activity";
import type { DepartmentId, OperatorVentureSnapshot, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  CANONICAL_WORK_EXECUTION_CONTRACT,
  commandLooksIdle,
  ensureOccupancyNpvCanonicalWork,
  evaluateActiveWorkerProjectionGate,
  evaluateActiveWorkHQVisibilityGate,
  evaluateHQCommandActiveWorkConsistencyGate,
  evaluateVentureActiveWorkProjectionGate,
  projectVentureCurrentWork,
  resetCanonicalWorkStore,
  screenshotFailureCaught,
  markCanonicalWorkStatus,
  OCCUPANCYNPV_PRICING_HERO_ENHANCEMENT_ID,
  TREASURY_CONTROL_CENTER_WORK_ID,
  TREASURY_CONTROL_CENTER_WORK_TITLE,
  selectTopCanonicalWork,
  upsertCanonicalWork,
  type CanonicalWorkExecutionContract,
} from "..";

function idleWorker(departmentId: DepartmentId, role: string): OperatorWorkerNode {
  return {
    nodeId: `${departmentId}-${role.toLowerCase()}`,
    departmentId,
    role,
    displayRole: role,
    status: "WAITING",
    task: null,
    displayTask: null,
    provider: null,
    model: null,
    isActive: false,
    isDormant: true,
    motionActive: false,
  };
}

function hqSnapshot(workers: OperatorWorkerNode[] = []): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: CRE_VENTURE_ID,
      organizationId: "org_hq_floor",
      missionId: "msn_floor",
      opportunityId: null,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: "OccupancyNPV",
      ventureType: "operating",
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
        ["systems_architect", "Systems Architect"],
        ["quality_control", "Validation Station"],
        ["product_lab", "Creation Lab"],
        ["launch_operations", "Deployment Depot"],
        ["growth_department", "Growth Nexus"],
        ["executive_office", "Command"],
        ["operations", "Operations Room"],
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
    workerNodes: workers,
  } as OperatorVentureSnapshot;
}

function work(partial: Partial<CanonicalWorkExecutionContract> & Pick<CanonicalWorkExecutionContract, "work_id" | "work_type" | "title" | "status" | "assigned_rooms">): CanonicalWorkExecutionContract {
  const now = new Date().toISOString();
  return {
    contract: CANONICAL_WORK_EXECUTION_CONTRACT,
    mission_id: `mission:${partial.work_id}`,
    venture_id: CRE_VENTURE_ID,
    description: partial.description ?? partial.title,
    stage: partial.stage ?? partial.work_type,
    assigned_workers: partial.assigned_workers ?? [],
    source: partial.source ?? "EXTERNAL_IMPLEMENTATION_AGENT",
    started_at: now,
    updated_at: now,
    completed_at: partial.status === "COMPLETED" ? now : null,
    blocked_reason: partial.blocked_reason ?? null,
    authorization_state: partial.authorization_state ?? null,
    progress: partial.progress ?? partial.status,
    latest_output: partial.latest_output ?? partial.title,
    artifact_refs: [],
    evidence_refs: [],
    parent_work_id: null,
    traceability_links: [partial.work_id],
    requires_infinity_worker_execution: false,
    next_expected_transition: null,
    ...partial,
  };
}

function glowingIn(nodes: OperatorWorkerNode[], room: DepartmentId) {
  return nodes.filter((node) => {
    if (node.departmentId !== room) return false;
    const visual = projectWorkerVisualState(node);
    return node.isActive && node.motionActive && node.status === "RUNNING" && visual.glow;
  });
}

describe("HQ live work operating floor projection v1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
  });

  afterEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
  });

  it("does not import the mission-activity barrel into Command client modules", () => {
    const strip = readFileSync("components/dashboard/operator-console/command-activity-strip.tsx", "utf8");
    const chamber = readFileSync("components/dashboard/operator-console/command-chamber.tsx", "utf8");
    expect(strip).not.toMatch(/from ["']@\/lib\/infinity\/mission-activity["']/);
    expect(chamber).not.toMatch(/from ["']@\/lib\/infinity\/mission-activity["']/);
  });

  it("fails the screenshot case: Command and Operations idle while OccupancyNPV work is ACTIVE", () => {
    const active = work({
      work_id: "work:screenshot",
      work_type: "BUILD",
      title: "OccupancyNPV live offer build",
      status: "ACTIVE",
      assigned_rooms: ["product_lab", "quality_control", "operations"],
    });
    expect(
      screenshotFailureCaught({
        work: active,
        command_sentence: ROOM_ACTIVITY_IDLE,
        operations_sentence: "No active task right now.",
      }),
    ).toBe(true);
    expect(
      evaluateActiveWorkHQVisibilityGate({
        work: active,
        command_sentence: ROOM_ACTIVITY_IDLE,
        operations_sentence: "No active task right now.",
        rooms_exposing: [],
      }).result,
    ).toBe("FAIL");
  });

  it("Command lists assigned rooms and those rooms glow only while work is ACTIVE", () => {
    upsertCanonicalWork(
      work({
        work_id: "work:active-rooms",
        work_type: "SYSTEM_ARCHITECTURE",
        title: "OccupancyNPV — HQ Live Work Projection Repair",
        status: "ACTIVE",
        assigned_rooms: ["systems_architect", "quality_control", "operations"],
        assigned_workers: ["Systems Architect", "Validation Station"],
      }),
      false,
    );
    const view = projectCommandActivity({ organizationId: "org_hq_floor" });
    const current = selectTopCanonicalWork();
    expect(current?.status).toBe("ACTIVE");
    expect(view.nowInspecting.status).toBe("ACTIVE_WORK");
    expect(view.nowInspecting.currentRooms).toEqual(
      expect.arrayContaining(["Systems Architect", "Validation Station", "Operations Room"]),
    );
    const idle = [
      idleWorker("systems_architect", "Architect"),
      idleWorker("quality_control", "Inspection"),
      idleWorker("growth_department", "Planning"),
      idleWorker("operations", "VENTURE_OPERATOR"),
    ];
    const attached = attachCommandActivity(hqSnapshot(idle), view);
    expect(glowingIn(attached.workerNodes ?? [], "systems_architect").length).toBeGreaterThan(0);
    expect(glowingIn(attached.workerNodes ?? [], "quality_control").length).toBeGreaterThan(0);
    expect(glowingIn(attached.workerNodes ?? [], "operations").length).toBeGreaterThan(0);
    expect(glowingIn(attached.workerNodes ?? [], "growth_department")).toHaveLength(0);
    expect(
      evaluateActiveWorkerProjectionGate({
        work: current,
        assigned_room_workers: (attached.workerNodes ?? []).map((node) => ({
          room: node.departmentId,
          isActive: node.isActive,
          motionActive: node.motionActive,
          status: node.status,
        })),
      }).result,
    ).toBe("PASS");
    const strip = renderToStaticMarkup(createElement(CommandActivityStrip, { activity: view }));
    expect(strip).toContain("Active rooms");
    expect(strip).toContain("Systems Architect");
    expect(strip).toContain("Validation Station");
    const chamber = renderToStaticMarkup(
      createElement(CommandChamber, {
        workerNodes: attached.workerNodes ?? [],
        currentActivity: attached.currentActivity,
        closedLoopRoute: attached.closedLoopRoute,
        isSelected: false,
        onSelect: () => undefined,
        commandActivity: view,
      }),
    );
    expect(chamber).toMatch(/data-hq-command-active-rooms=/);
    expect(chamber).toContain("Systems Architect");
  });

  it("activates the matching room for BUILD, QC, DEPLOYMENT, and GROWTH work", () => {
    const cases: Array<{ type: CanonicalWorkExecutionContract["work_type"]; room: DepartmentId; label: string }> = [
      { type: "BUILD", room: "product_lab", label: "Creation Lab" },
      { type: "QC", room: "quality_control", label: "Validation Station" },
      { type: "DEPLOYMENT", room: "launch_operations", label: "Deployment Depot" },
      { type: "GROWTH", room: "growth_department", label: "Growth Nexus" },
    ];
    for (const item of cases) {
      resetCanonicalWorkStore();
      upsertCanonicalWork(
        work({
          work_id: `work:${item.type.toLowerCase()}`,
          work_type: item.type,
          title: `${item.type} in progress`,
          status: "ACTIVE",
          assigned_rooms: [item.room],
        }),
        false,
      );
      const view = projectCommandActivity({ organizationId: "org_hq_floor" });
      expect(view.nowInspecting.currentRooms).toContain(item.label);
      expect(view.rooms[item.room].status).toBe("ACTIVE_WORK");
      const attached = attachCommandActivity(hqSnapshot([idleWorker(item.room, "Assigned")]), view);
      expect(glowingIn(attached.workerNodes ?? [], item.room).length).toBeGreaterThan(0);
    }
  });

  it("does not glow workers for waiting, blocked, completed, or stale work", () => {
    for (const status of ["WAITING", "BLOCKED", "COMPLETED", "STALE"] as const) {
      resetCanonicalWorkStore();
      upsertCanonicalWork(
        work({
          work_id: `work:${status.toLowerCase()}`,
          work_type: "QC",
          title: `${status} QC`,
          status,
          assigned_rooms: ["quality_control"],
        }),
        false,
      );
      const view = projectCommandActivity({ organizationId: "org_hq_floor" });
      expect(view.rooms.quality_control.status).not.toBe("ACTIVE_WORK");
      const attached = attachCommandActivity(hqSnapshot([idleWorker("quality_control", "Inspection")]), view);
      expect(glowingIn(attached.workerNodes ?? [], "quality_control")).toHaveLength(0);
    }
  });

  it("lists Command rooms from live mission activity and glows those workers", () => {
    emitMissionActivity({
      organizationId: "org_hq_floor",
      ventureId: CRE_VENTURE_ID,
      missionId: "msn_live_build",
      missionType: "OCCUPANCYNPV_PAGE_BUILD",
      engine: "product_asset_builder",
      stepType: "PAGE_GENERATION",
      eventType: "MISSION_STARTED",
      executionClass: "VENTURE_EXECUTION",
    });
    emitMissionActivity({
      organizationId: "org_hq_floor",
      ventureId: CRE_VENTURE_ID,
      missionId: "msn_live_build",
      missionType: "OCCUPANCYNPV_PAGE_BUILD",
      engine: "product_asset_builder",
      stepType: "PAGE_GENERATION",
      eventType: "STEP_STARTED",
      summary: "Building the live pricing offer page",
      executionClass: "VENTURE_EXECUTION",
    });
    const view = projectCommandActivity({ organizationId: "org_hq_floor" });
    expect(view.nowInspecting.status).toBe("ACTIVE_WORK");
    expect(view.nowInspecting.currentRooms).toEqual(expect.arrayContaining(["Creation Lab", "Command"]));
    const attached = attachCommandActivity(
      hqSnapshot([idleWorker("product_lab", "Implementer"), idleWorker("systems_architect", "Architect")]),
      view,
    );
    expect(glowingIn(attached.workerNodes ?? [], "product_lab").length).toBeGreaterThan(0);
    expect(glowingIn(attached.workerNodes ?? [], "systems_architect")).toHaveLength(0);
  });

  it("keeps HQ idle when there is no active work", () => {
    const view = projectCommandActivity({ organizationId: "org_hq_floor" });
    expect(view.counts.activeMissions).toBe(0);
    expect(view.nowInspecting.currentRooms ?? []).toHaveLength(0);
    expect(commandLooksIdle(view.nowInspecting.currentTask)).toBe(true);
    const attached = attachCommandActivity(hqSnapshot([idleWorker("product_lab", "Implementer")]), view);
    expect(glowingIn(attached.workerNodes ?? [], "product_lab")).toHaveLength(0);
    expect(
      evaluateHQCommandActiveWorkConsistencyGate({
        work: null,
        command_sentence: view.nowInspecting.currentTask,
        infinity_state: "IDLE",
      }).result,
    ).toBe("PASS");
  });

  it("projects Current Work onto the OccupancyNPV venture detail", () => {
    ensureOccupancyNpvCanonicalWork();
    const detail = projectVentureCurrentWork(CRE_VENTURE_ID);
    expect(
      evaluateVentureActiveWorkProjectionGate({
        venture_id: CRE_VENTURE_ID,
        work: selectTopCanonicalWork(),
        venture_detail: detail,
      }).result,
    ).toBe("PASS");
    expect(detail.status).toBeNull();
    expect(detail.current_work).toBeNull();
    expect(detail.parked_authorization).toMatch(/Pricing Hero Enhancement/);
    expect(detail.latest_completed).toBeTruthy();
  });

  it("stops worker motion after ACTIVE work completes", () => {
    upsertCanonicalWork(
      work({
        work_id: "work:then-complete",
        work_type: "BUILD",
        title: "Temporary build",
        status: "ACTIVE",
        assigned_rooms: ["product_lab"],
      }),
      false,
    );
    const live = attachCommandActivity(
      hqSnapshot([idleWorker("product_lab", "Implementer")]),
      projectCommandActivity({ organizationId: "org_hq_floor" }),
    );
    expect(glowingIn(live.workerNodes ?? [], "product_lab").length).toBeGreaterThan(0);
    upsertCanonicalWork(
      work({
        work_id: "work:then-complete",
        work_type: "BUILD",
        title: "Temporary build",
        status: "COMPLETED",
        assigned_rooms: ["product_lab"],
        latest_output: "Build finished",
      }),
      false,
    );
    const done = attachCommandActivity(live, projectCommandActivity({ organizationId: "org_hq_floor" }));
    expect(glowingIn(done.workerNodes ?? [], "product_lab")).toHaveLength(0);
    expect((done.workerNodes ?? []).every((node) => node.motionActive === false)).toBe(true);
    expect(done.departments.find((dept) => dept.id === "product_lab")?.isActive).toBe(false);
    expect(done.departments.find((dept) => dept.id === "product_lab")?.state).not.toBe("RUNNING");
    expect(done.currentDepartments).toEqual([]);
    expect(done.currentActivity.active).toBe(false);
    expect(done.commandActivity?.nowInspecting.status).not.toBe("ACTIVE_WORK");
    const floorSource = readFileSync("components/dashboard/operator-console/hq-spatial-floor.tsx", "utf8");
    expect(floorSource).not.toContain('state === "RUNNING" ? "ACTIVE_WORK"');
  });

  it("projects the OccupancyNPV hero mission as waiting and keeps assigned rooms idle", () => {
    ensureOccupancyNpvCanonicalWork();
    const view = projectCommandActivity({ organizationId: "org_hq_floor" });
    expect(view.nowInspecting.currentMission).toBeNull();
    expect(view.nowInspecting.status).not.toBe("ACTIVE_WORK");
    expect(view.latestCompleted?.missionType).toBeTruthy();
    expect(view.nowInspecting.currentRooms ?? []).toHaveLength(0);
    const assigned = [
      idleWorker("creative_studio", "Designer"),
      idleWorker("product_lab", "Implementer"),
      idleWorker("quality_control", "Inspection"),
      idleWorker("operations", "VENTURE_OPERATOR"),
      idleWorker("launch_operations", "Deploy"),
      idleWorker("growth_department", "Planning"),
    ];
    const attached = attachCommandActivity(hqSnapshot(assigned), view);
    expect(glowingIn(attached.workerNodes ?? [], "creative_studio")).toHaveLength(0);
    expect(glowingIn(attached.workerNodes ?? [], "product_lab")).toHaveLength(0);
    expect(glowingIn(attached.workerNodes ?? [], "quality_control")).toHaveLength(0);
    expect(glowingIn(attached.workerNodes ?? [], "operations")).toHaveLength(0);
    expect(glowingIn(attached.workerNodes ?? [], "launch_operations")).toHaveLength(0);
    expect(glowingIn(attached.workerNodes ?? [], "growth_department")).toHaveLength(0);
    markCanonicalWorkStatus(OCCUPANCYNPV_PRICING_HERO_ENHANCEMENT_ID, "ACTIVE", {
      authorization_state: null,
      progress: "Simulated leftover ACTIVE work",
      latest_output: "Preserving 3-day trial above the fold while enlarging the building hero",
    });
    const leftover = projectCommandActivity({ organizationId: "org_hq_floor" });
    expect(leftover.nowInspecting.status).toBe("ACTIVE_WORK");
    const glowing = attachCommandActivity(hqSnapshot(assigned), leftover);
    expect(glowingIn(glowing.workerNodes ?? [], "creative_studio").length).toBeGreaterThan(0);
    ensureOccupancyNpvCanonicalWork();
    const waiting = projectCommandActivity({ organizationId: "org_hq_floor" });
    expect(waiting.nowInspecting.status).not.toBe("ACTIVE_WORK");
    const idleAfter = attachCommandActivity(hqSnapshot(assigned), waiting);
    expect(glowingIn(idleAfter.workerNodes ?? [], "creative_studio")).toHaveLength(0);
    expect(glowingIn(idleAfter.workerNodes ?? [], "product_lab")).toHaveLength(0);
    expect(glowingIn(idleAfter.workerNodes ?? [], "launch_operations")).toHaveLength(0);
    const floorSource = readFileSync("components/dashboard/operator-console/hq-spatial-floor.tsx", "utf8");
    const consoleSource = readFileSync("components/dashboard/operator-console/venture-operator-console.tsx", "utf8");
    expect(floorSource).toContain("data-hq-floor-current-work");
    expect(floorSource).toContain("currentWorkTitle");
    expect(floorSource).toContain("liveStatus === \"ACTIVE_WORK\"");
    expect(consoleSource).toContain("currentWorkTitle");
    expect(consoleSource).toContain("nowInspecting.currentMission");
  });

  it("shows autonomous live missions alongside ACTIVE canonical work, then idles when both finish", () => {
    emitMissionActivity({
      organizationId: "org_hq_floor",
      ventureId: CRE_VENTURE_ID,
      missionId: "msn_autonomous_deploy",
      missionType: "GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1",
      engine: "launch_gateway",
      stepType: "PROVIDER_BUILD",
      eventType: "MISSION_STARTED",
      executionClass: "VENTURE_EXECUTION",
    });
    emitMissionActivity({
      organizationId: "org_hq_floor",
      ventureId: CRE_VENTURE_ID,
      missionId: "msn_autonomous_deploy",
      missionType: "GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1",
      engine: "launch_gateway",
      stepType: "PROVIDER_BUILD",
      eventType: "STEP_STARTED",
      summary: "Building the isolated next deploy",
      executionClass: "VENTURE_EXECUTION",
    });
    upsertCanonicalWork(
      work({
        work_id: "work:current-hq",
        work_type: "SYSTEM_ARCHITECTURE",
        title: "Infinity — HQ Navigation Cleanup + Current-Work Floor",
        status: "ACTIVE",
        assigned_rooms: ["systems_architect", "quality_control", "operations"],
        assigned_workers: ["Systems Architect", "Validation Station"],
      }),
      false,
    );
    const both = projectCommandActivity({ organizationId: "org_hq_floor" });
    expect(both.nowInspecting.status).toBe("ACTIVE_WORK");
    expect(both.nowInspecting.currentMission).toBe("Infinity — HQ Navigation Cleanup + Current-Work Floor");
    expect(both.rooms.systems_architect.status).toBe("ACTIVE_WORK");
    expect(both.rooms.launch_operations.status).toBe("ACTIVE_WORK");
    expect(both.rooms.launch_operations.summary).toMatch(/isolated next deploy/i);
    expect(both.nowInspecting.currentRooms).toEqual(
      expect.arrayContaining(["Systems Architect", "Validation Station", "Deployment Depot"]),
    );
    const bothAttached = attachCommandActivity(
      hqSnapshot([
        idleWorker("systems_architect", "Architect"),
        idleWorker("launch_operations", "Deploy"),
        idleWorker("product_lab", "Implementer"),
      ]),
      both,
    );
    expect(glowingIn(bothAttached.workerNodes ?? [], "systems_architect").length).toBeGreaterThan(0);
    expect(glowingIn(bothAttached.workerNodes ?? [], "launch_operations").length).toBeGreaterThan(0);
    expect(glowingIn(bothAttached.workerNodes ?? [], "product_lab")).toHaveLength(0);

    upsertCanonicalWork(
      work({
        work_id: "work:current-hq",
        work_type: "SYSTEM_ARCHITECTURE",
        title: "Infinity — HQ Navigation Cleanup + Current-Work Floor",
        status: "COMPLETED",
        assigned_rooms: ["systems_architect", "quality_control", "operations"],
        latest_output: "Standing floor rule complete",
      }),
      false,
    );
    const missionOnly = projectCommandActivity({ organizationId: "org_hq_floor" });
    expect(missionOnly.nowInspecting.currentMission).toBe("GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1");
    expect(missionOnly.nowInspecting.status).toBe("ACTIVE_WORK");
    expect(missionOnly.rooms.launch_operations.status).toBe("ACTIVE_WORK");
    expect(missionOnly.rooms.systems_architect.status).not.toBe("ACTIVE_WORK");

    emitMissionActivity({
      organizationId: "org_hq_floor",
      ventureId: CRE_VENTURE_ID,
      missionId: "msn_autonomous_deploy",
      missionType: "GOVERNED_CRE_FULL_PAGE_AUTOREPAIR_DEPLOYMENT_V1",
      engine: "launch_gateway",
      stepType: "PROVIDER_BUILD",
      eventType: "MISSION_COMPLETED",
      summary: "Autonomous deploy finished",
      executionClass: "VENTURE_EXECUTION",
    });
    const idle = projectCommandActivity({ organizationId: "org_hq_floor" });
    expect(idle.counts.activeMissions).toBe(0);
    expect(idle.nowInspecting.status).not.toBe("ACTIVE_WORK");
    expect(idle.nowInspecting.currentMission).toBeNull();
    expect(idle.nowInspecting.currentRooms ?? []).toHaveLength(0);
    expect(idle.rooms.launch_operations.status).not.toBe("ACTIVE_WORK");
    expect(idle.rooms.systems_architect.status).not.toBe("ACTIVE_WORK");
    expect(idle.rooms.launch_operations.summary).toBeNull();
    const idleAttached = attachCommandActivity(bothAttached, idle);
    expect(glowingIn(idleAttached.workerNodes ?? [], "launch_operations")).toHaveLength(0);
    expect(glowingIn(idleAttached.workerNodes ?? [], "systems_architect")).toHaveLength(0);
    expect(idleAttached.currentDepartments).toEqual([]);
    expect(idleAttached.currentActivity.active).toBe(false);
  });

  it("does not keep a completed OccupancyNPV mission painted as current work", () => {
    upsertCanonicalWork(
      work({
        work_id: "work:old-occupancy",
        work_type: "BUILD",
        title: "OccupancyNPV — Live Offer Activation",
        status: "COMPLETED",
        assigned_rooms: ["product_lab", "quality_control", "launch_operations"],
        latest_output: "Old mission finished",
      }),
      false,
    );
    const view = projectCommandActivity({ organizationId: "org_hq_floor" });
    expect(view.counts.activeMissions).toBe(0);
    expect(view.nowInspecting.currentMission).toBeNull();
    expect(view.nowInspecting.status).not.toBe("ACTIVE_WORK");
    expect(view.rooms.product_lab.status).not.toBe("ACTIVE_WORK");
    expect(view.rooms.launch_operations.status).not.toBe("ACTIVE_WORK");
    expect(view.rooms.product_lab.summary).toBeNull();
    expect(view.rooms.launch_operations.summary).toBeNull();
    const attached = attachCommandActivity(
      hqSnapshot([
        idleWorker("product_lab", "Implementer"),
        idleWorker("launch_operations", "Deploy"),
      ]),
      view,
    );
    expect(glowingIn(attached.workerNodes ?? [], "product_lab")).toHaveLength(0);
    expect(glowingIn(attached.workerNodes ?? [], "launch_operations")).toHaveLength(0);
    expect(attached.currentDepartments).toEqual([]);
  });

  it("projects the Live Treasury Control Center onto Command instead of idle", () => {
    upsertCanonicalWork(
      work({
        work_id: TREASURY_CONTROL_CENTER_WORK_ID,
        work_type: "SYSTEM_ARCHITECTURE",
        title: TREASURY_CONTROL_CENTER_WORK_TITLE,
        description: "Project live Mercury treasury cash onto HQ Command.",
        status: "ACTIVE",
        assigned_rooms: ["operations", "strategy_finance", "systems_architect", "quality_control"],
        assigned_workers: ["Venture Operator", "Profit Lab", "Systems Architect", "Validation Station"],
        classification: "SYSTEM_INFRASTRUCTURE",
      }),
      false,
    );
    const view = projectCommandActivity({ organizationId: "org_hq_floor" });
    expect(view.nowInspecting.status).toBe("ACTIVE_WORK");
    expect(view.nowInspecting.currentMission).toBe(TREASURY_CONTROL_CENTER_WORK_TITLE);
    expect(view.counts.activeMissions).toBe(1);
    const attached = attachCommandActivity(
      hqSnapshot([
        idleWorker("strategy_finance", "Profit Lab"),
        idleWorker("systems_architect", "Architect"),
        idleWorker("quality_control", "Inspection"),
        idleWorker("operations", "VENTURE_OPERATOR"),
      ]),
      view,
    );
    const chamber = renderToStaticMarkup(
      createElement(CommandChamber, {
        workerNodes: attached.workerNodes ?? [],
        currentActivity: attached.currentActivity,
        closedLoopRoute: attached.closedLoopRoute,
        isSelected: false,
        onSelect: () => undefined,
        commandActivity: view,
      }),
    );
    expect(chamber).toContain(TREASURY_CONTROL_CENTER_WORK_TITLE);
    expect(chamber).not.toContain("IDLE — no active canonical work");
    expect(glowingIn(attached.workerNodes ?? [], "strategy_finance").length).toBeGreaterThan(0);
    expect(
      evaluateActiveWorkHQVisibilityGate({
        work: selectTopCanonicalWork(),
        command_sentence: view.nowInspecting.currentMission,
        operations_sentence: view.rooms.operations.summary,
        rooms_exposing: ["strategy_finance", "systems_architect", "quality_control"],
      }).result,
    ).toBe("PASS");
  });
});
