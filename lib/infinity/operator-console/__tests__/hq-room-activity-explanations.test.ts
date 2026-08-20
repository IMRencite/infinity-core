import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALL_HQ_ROOM_IDS,
  COMMAND_ROOM_ID,
  LIFECYCLE_ROOM_SEQUENCE,
  getRoomDisplayNames,
} from "../room-naming";
import {
  ROOM_ACTIVITY_BLOCKED_UNKNOWN,
  ROOM_ACTIVITY_EMPTY,
  ROOM_ACTIVITY_IDLE,
  ROOM_ACTIVITY_LABEL,
  buildRoomActivityExplanation,
  stripInternalTokens,
} from "../room-activity";
import { enrichOperatorSnapshot } from "../enrich-snapshot";
import type {
  DepartmentId,
  OperatorCurrentActivity,
  OperatorDepartmentSnapshot,
  OperatorVentureSnapshot,
  OperatorWorkerNode,
} from "../types";
import type { HqWorkArtifact } from "../artifacts/types";

const VENTURE = "Mobile-First Change Order Authorization Tool";
const UUID = "7f89aaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const COMPONENTS = join(process.cwd(), "components/dashboard/operator-console");
const CSS = join(process.cwd(), "app/globals.css");
const ACTIVITY_SRC = readFileSync(join(process.cwd(), "lib/infinity/operator-console/room-activity.ts"), "utf8");

function readComponent(relativePath: string): string {
  return readFileSync(join(COMPONENTS, relativePath), "utf8");
}

function worker(
  departmentId: DepartmentId,
  overrides: Partial<OperatorWorkerNode> = {},
): OperatorWorkerNode {
  return {
    nodeId: `${departmentId}-worker`,
    departmentId,
    role: "WORK",
    displayRole: "Worker",
    status: "RUNNING",
    task: null,
    displayTask: null,
    provider: null,
    model: null,
    isActive: true,
    isDormant: false,
    motionActive: true,
    ...overrides,
  };
}

function idleWorker(departmentId: DepartmentId): OperatorWorkerNode {
  return worker(departmentId, {
    nodeId: `${departmentId}-idle`,
    status: "COMPLETE",
    isActive: false,
    isDormant: true,
    motionActive: false,
  });
}

function department(
  id: DepartmentId,
  overrides: Partial<OperatorDepartmentSnapshot> = {},
): OperatorDepartmentSnapshot {
  return {
    id,
    label: id,
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
    ...overrides,
  };
}

function inactiveActivity(): OperatorCurrentActivity {
  return {
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
  };
}

function explain(
  id: DepartmentId,
  overrides: {
    department?: Partial<OperatorDepartmentSnapshot>;
    workerNodes?: OperatorWorkerNode[];
    currentActivity?: OperatorCurrentActivity;
    closedLoopRoute?: OperatorVentureSnapshot["closedLoopRoute"];
    ventureName?: string | null;
  } = {},
) {
  return buildRoomActivityExplanation({
    departmentId: id,
    department: department(id, overrides.department),
    workerNodes: overrides.workerNodes ?? [],
    currentActivity: overrides.currentActivity ?? inactiveActivity(),
    closedLoopRoute: overrides.closedLoopRoute,
    ventureName: overrides.ventureName ?? VENTURE,
  });
}

function readyArtifact(roomId: DepartmentId, title = "Completed research packet"): HqWorkArtifact {
  return {
    id: "art-ready",
    roomId,
    artifactType: "research_packet",
    title,
    subtitle: null,
    state: "READY",
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceRecordType: "research_packet",
    sourceRecordId: UUID,
    metadata: {},
  };
}

function creatingArtifact(roomId: DepartmentId, title = "Draft research packet"): HqWorkArtifact {
  return {
    ...readyArtifact(roomId, title),
    id: "art-creating",
    state: "CREATING",
  };
}

describe("HQ room activity explanations v1", () => {
  it("uses one shared deterministic translator and no LLM", () => {
    expect(ACTIVITY_SRC).toContain("export function buildRoomActivityExplanation");
    expect(ACTIVITY_SRC).not.toMatch(/openai|generateContent|chat\.completions|anthropic/);
    expect(ACTIVITY_SRC).not.toMatch(/from ["']openai["']/);
    expect(readComponent("department-room.tsx")).toContain("buildRoomActivityExplanation");
    expect(readComponent("command-chamber.tsx")).toContain("buildRoomActivityExplanation");
    expect(readComponent("department-detail-panel.tsx")).toContain("buildRoomActivityExplanation");
  });

  it("ACTIVE_WORK is grounded and uses a human venture name", () => {
    const activity = explain("research_department", {
      department: { state: "RUNNING", isActive: true, currentTask: "Grounded research" },
      workerNodes: [worker("research_department")],
    });
    expect(activity.presence).toBe("ACTIVE_WORK");
    expect(activity.grounded).toBe(true);
    expect(activity.label).toBe(ROOM_ACTIVITY_LABEL);
    expect(activity.sentence).toContain(VENTURE);
    expect(activity.sentence).toMatch(/^Comparing market demand/);
    expect(activity.sentence).not.toContain(UUID);
    expect(activity.sentence).not.toMatch(/RUNNING|RESEARCH_DEPARTMENT|Grounded research/i);
  });

  it("PRESENT_IDLE copy does not claim active work", () => {
    const activity = explain("research_department", {
      department: { state: "COMPLETE" },
      workerNodes: [idleWorker("research_department")],
    });
    expect(activity.presence).toBe("PRESENT_IDLE");
    expect(activity.sentence).toBe(ROOM_ACTIVITY_IDLE);
    expect(activity.sentence).not.toMatch(/Comparing|Researching|Scanning/i);
  });

  it("BLOCKED uses a grounded blocker reason", () => {
    const activity = explain("launch_operations", {
      department: {
        state: "BLOCKED",
        summary: "Waiting for registrar credentials before domain verification can continue",
      },
      workerNodes: [idleWorker("launch_operations")],
    });
    expect(activity.presence).toBe("BLOCKED");
    expect(activity.sentence).toContain("registrar credentials");
    expect(activity.sentence).not.toMatch(/progress|building|comparing/i);
  });

  it("BLOCKED without a reason stays conservative", () => {
    const activity = explain("launch_operations", {
      department: { state: "BLOCKED", summary: "BLOCKED_BY_POLICY", currentTask: UUID },
      workerNodes: [idleWorker("launch_operations")],
    });
    expect(activity.presence).toBe("BLOCKED");
    expect(activity.sentence).toBe(ROOM_ACTIVITY_BLOCKED_UNKNOWN);
    expect(activity.sentence).not.toContain(UUID);
    expect(activity.sentence).not.toContain("BLOCKED_BY_POLICY");
  });

  it("EMPTY does not claim agents or work", () => {
    const activity = explain("product_lab", {
      department: { state: "NOT_STARTED" },
      workerNodes: [],
    });
    expect(activity.presence).toBe("EMPTY");
    expect(activity.sentence).toBe(ROOM_ACTIVITY_EMPTY);
    expect(activity.sentence).not.toMatch(/agents are available/i);
  });

  it("does not render completed historical artifacts as current work", () => {
    const activity = explain("research_department", {
      department: {
        state: "COMPLETE",
        currentTask: "Grounded research",
        workArtifacts: [readyArtifact("research_department")],
      },
      workerNodes: [idleWorker("research_department")],
    });
    expect(activity.presence).toBe("PRESENT_IDLE");
    expect(activity.sentence).toBe(ROOM_ACTIVITY_IDLE);
    expect(activity.source).toBe("idle");
  });

  it("excludes fixture and test ventures from current activity copy", () => {
    const activity = explain("research_department", {
      department: {
        state: "RUNNING",
        isActive: true,
        currentTask: "Grounded research",
        workArtifacts: [
          creatingArtifact("research_department", "verification fixture research packet"),
        ],
      },
      workerNodes: [worker("research_department")],
      ventureName: "FAVC1 verification fixture",
    });
    expect(activity.presence).toBe("ACTIVE_WORK");
    expect(activity.ventureName).toBeNull();
    expect(activity.sentence).not.toMatch(/verification|fixture|FAVC1/i);
    expect(activity.sentence).toBe("Comparing market demand, competitors, and customer evidence.");
  });

  it("strips UUIDs and raw internal enums from activity copy", () => {
    const activity = explain("research_department", {
      department: {
        state: "RUNNING",
        isActive: true,
        currentTask: `Executing ResearchStep ${UUID} for candidate b541ad42cdef9999`,
      },
      workerNodes: [worker("research_department")],
    });
    expect(activity.sentence).not.toContain(UUID);
    expect(activity.sentence).not.toMatch(/ResearchStep|b541ad42|RUNNING|RESEARCH_/);
    expect(stripInternalTokens(`ResearchStep ${UUID} RESEARCH_STEP`)).not.toMatch(/[0-9a-f]{8}-/);
  });

  it("explains Command coordination from a live closed-loop route", () => {
    const activity = explain("executive_office", {
      department: { state: "RUNNING", isActive: true },
      workerNodes: [worker("executive_office")],
      closedLoopRoute: {
        active: true,
        fromDepartmentId: "intelligence_center",
        viaDepartmentId: "executive_office",
        toDepartmentId: "quality_control",
        decisionType: "CONTINUE",
        missionId: UUID,
        missionStatus: "RUNNING",
      },
    });
    expect(activity.presence).toBe("ACTIVE_WORK");
    expect(activity.sentence).toBe("Sending the current venture to Validation Station.");
    expect(activity.sentence).not.toContain(UUID);
    expect(activity.sentence).not.toContain("CONTINUE");
    expect(activity.sentence).not.toMatch(/chat|assistant|bot/i);
  });

  it("produces a truthful activity state for every canonical HQ room", () => {
    for (const id of ALL_HQ_ROOM_IDS) {
      const empty = explain(id, { workerNodes: [] });
      expect(empty.presence).toBe("EMPTY");
      expect(empty.sentence).toBe(ROOM_ACTIVITY_EMPTY);

      const idle = explain(id, {
        department: { state: "COMPLETE" },
        workerNodes: [idleWorker(id)],
      });
      expect(idle.presence).toBe("PRESENT_IDLE");
      expect(idle.sentence).toBe(ROOM_ACTIVITY_IDLE);

      const blocked = explain(id, {
        department: { state: "BLOCKED" },
        workerNodes: [idleWorker(id)],
      });
      expect(blocked.presence).toBe("BLOCKED");
      expect(blocked.sentence).toBe(ROOM_ACTIVITY_BLOCKED_UNKNOWN);

      const active = explain(id, {
        department: { state: "RUNNING", isActive: true, currentTask: "Active room task" },
        workerNodes: [worker(id)],
      });
      expect(active.presence).toBe("ACTIVE_WORK");
      expect(active.grounded).toBe(true);
      expect(active.sentence).not.toBe(ROOM_ACTIVITY_IDLE);
      expect(active.sentence).not.toBe(ROOM_ACTIVITY_EMPTY);
      expect(getRoomDisplayNames(id).displayName).toBeTruthy();
    }
  });

  it("keeps job descriptions, status, and Agents in room visible", () => {
    const room = readComponent("department-room.tsx");
    expect(room).toContain("hq-room-job");
    expect(room).toContain("{supportingLabel}");
    expect(room).toContain("RoomCurrentActivity");
    expect(room).toContain("RoomStatusChip");
    expect(room).toContain("presence={activity.presence}");
    expect(room).toContain("RoomPresenceTrack");
    expect(readComponent("infinity-room/room-presence-track.tsx")).toContain("Agents in room");
    expect(readComponent("command-chamber.tsx")).toContain("RoomCurrentActivity");
    expect(readComponent("department-detail-panel.tsx")).toContain("Current activity");
    expect(readComponent("department-detail-panel.tsx")).toContain("Room purpose");
  });

  it("does not change room routing", () => {
    expect(LIFECYCLE_ROOM_SEQUENCE).toEqual([
      "opportunity_lab",
      "research_department",
      "strategy_finance",
      "company_operations",
      "growth_department",
      "creative_studio",
      "product_lab",
      "quality_control",
      "launch_operations",
      "intelligence_center",
    ]);
    expect(COMMAND_ROOM_ID).toBe("executive_office");
    expect(LIFECYCLE_ROOM_SEQUENCE.includes(COMMAND_ROOM_ID)).toBe(false);
    expect(ACTIVITY_SRC).not.toMatch(/routeMission|assignAgent|selectVenture|readinessDecision/);
    expect(readComponent("hq-spatial-floor.tsx")).toContain("LIFECYCLE_ROOM_SEQUENCE");
  });

  it("attaches activity explanations from the existing HQ enrich payload", () => {
    const snapshot: OperatorVentureSnapshot = {
      generatedAt: new Date().toISOString(),
      venture: {
        ventureAssemblyId: "v1",
        organizationId: "org",
        missionId: "m1",
        opportunityId: null,
        companyId: null,
        ventureBlueprintId: null,
        buildId: null,
        productionArtifactId: null,
        ventureName: VENTURE,
        ventureType: null,
        assemblyStatus: "active",
        readinessStatus: null,
        launchStage: null,
        correlationIds: ["v1"],
      },
      overallStatus: "RUNNING",
      currentDepartments: ["research_department"],
      currentActivity: { ...inactiveActivity(), active: true, departmentId: "research_department", task: "Grounded research" },
      departments: [
        department("research_department", {
          state: "RUNNING",
          isActive: true,
          currentTask: "Grounded research",
        }),
      ],
      pipeline: { stagesCompleted: 0, stagesTotal: 11, stageLabels: [] },
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
    const enriched = enrichOperatorSnapshot(snapshot);
    const explanation = enriched.departments[0]?.activityExplanation;
    expect(explanation?.presence).toBe("ACTIVE_WORK");
    expect(explanation?.sentence).toContain(VENTURE);
    expect(enriched.workerNodes?.length).toBeGreaterThan(0);
  });

  it("keeps current activity wrapping on desktop, tablet, and mobile", () => {
    const css = readFileSync(CSS, "utf8");
    expect(css).toContain(".hq-room-now");
    expect(css).toContain("overflow-wrap: break-word");
    expect(css).toContain("white-space: normal");
    expect(css).toContain("@media (max-width: 1023px)");
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).not.toMatch(/\.hq-room-now\s*\{[^}]*white-space:\s*nowrap/);
    expect(css).not.toMatch(/\.hq-room-now\s*\{[^}]*line-clamp/);
    const room = readComponent("department-room.tsx");
    expect(room).not.toMatch(/hq-room-now[^>]*(line-clamp|truncate|whitespace-nowrap)/);
    expect(readFileSync(join(process.cwd(), "components/dashboard/operator-console/infinity-room/infinity-room-shell.tsx"), "utf8")).toContain("min-h-[118px]");
    expect(readFileSync(join(process.cwd(), "components/dashboard/operator-console/infinity-room/infinity-room-shell.tsx"), "utf8")).toContain("overflow-x-hidden");
  });
});
