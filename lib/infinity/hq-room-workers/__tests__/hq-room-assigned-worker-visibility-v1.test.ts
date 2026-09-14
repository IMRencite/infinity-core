import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HQ_AUTHORIZATION_WORKER_FIXTURE,
  HQ_BLOCKED_WORKER_FIXTURE,
  projectCommandOversight,
  projectWorkerVisualState,
} from "@/lib/infinity/hq-live-activity";
import { ALL_HQ_ROOM_IDS, OPERATIONS_ROOM_ID } from "@/lib/infinity/operator-console/room-naming";
import { HQ_FIRST_CLASS_ROOMS } from "@/lib/infinity/hq-first-class-room/registry";
import {
  HQ_FLOOR_LAYOUT_SECTIONS,
  HQ_OPERATING_FLOOR_COLUMN_BALANCE_GATE,
  HQ_OPERATING_FLOOR_PLACEMENT_CONTRACT,
  HQ_ROOM_POSITION_INTEGRITY_GATE,
  hqFloorSpan,
} from "@/lib/infinity/operator-console/floor-layout";
import {
  evaluateHQOperatingFloorColumnBalanceGate,
  evaluateHQOperatingFloorPlacementContract,
  evaluateHQRoomPositionIntegrityGate,
  hqRoomContentFingerprint,
} from "@/lib/infinity/operator-console/floor-placement-gates";
import { deriveRoomPresence } from "@/lib/infinity/operator-console/room-presence";
import { buildWorkerNodes } from "@/lib/infinity/operator-console/worker-nodes";
import type { DepartmentId, OperatorDepartmentSnapshot, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import {
  HQ_ROOM_ASSIGNED_WORKER_PRESENCE_GATE,
  HQ_ROOM_ASSIGNED_WORKER_VISIBILITY_CONTRACT,
  HQ_ROOM_WORKER_COUNT_CONSISTENCY_GATE,
  HQ_ROOM_WORKER_ORB_RENDERED_QUALITY_GATE,
  HQ_WORKER_COMMAND_ACTIVITY_TRACEABILITY_GATE,
  assignedWorkerCountForRoom,
  assignedWorkerRolesForRoom,
  evaluateHQRoomAssignedWorkerPresenceGate,
  evaluateHQRoomAssignedWorkerVisibilityContract,
  evaluateHQRoomWorkerCountConsistencyGate,
  evaluateHQRoomWorkerOrbRenderedQualityGate,
  evaluateHQWorkerCommandActivityTraceabilityGate,
  firstClassRoomsWithAssignedWorkers,
  projectRoomWorkerVisibilityRow,
} from "../index";

const ROOT = process.cwd();

function idleDept(id: DepartmentId): OperatorDepartmentSnapshot {
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
  };
}

function node(partial: Partial<OperatorWorkerNode> & Pick<OperatorWorkerNode, "nodeId" | "role">): OperatorWorkerNode {
  return {
    departmentId: "product_lab",
    displayRole: partial.role,
    status: "WAITING",
    task: null,
    displayTask: null,
    provider: null,
    model: null,
    isActive: false,
    isDormant: true,
    motionActive: false,
    ...partial,
  };
}

function operationsAssignedNodes(): OperatorWorkerNode[] {
  return assignedWorkerRolesForRoom("operations").map((role) =>
    node({
      nodeId: `operations-${role.toLowerCase().replace(/\s+/g, "-")}`,
      departmentId: "operations",
      role,
      displayRole: role,
      status: "WAITING",
    }),
  );
}

function assignedWaitingFixture(activeCount: number): OperatorWorkerNode[] {
  return ["Alpha", "Bravo", "Charlie", "Delta"].map((role, index) =>
    node({
      nodeId: `fixture-${role.toLowerCase()}`,
      role,
      displayRole: role,
      status: index < activeCount ? "RUNNING" : "WAITING",
      isActive: index < activeCount,
      isDormant: index >= activeCount,
      motionActive: index < activeCount,
      task: index < activeCount ? "Canonical execution" : null,
    }),
  );
}

describe("HQRoomAssignedWorkerVisibilityContract", () => {
  it("keeps assigned first-class workers visible when no work is active", () => {
    const departments = ALL_HQ_ROOM_IDS.filter((id) => id !== OPERATIONS_ROOM_ID).map(idleDept);
    const workers = [...buildWorkerNodes([], departments), ...operationsAssignedNodes()];
    const rows = ALL_HQ_ROOM_IDS.map((id) => {
      const roomWorkers = workers.filter((item) => item.departmentId === id);
      const presence = deriveRoomPresence(roomWorkers, "NOT_STARTED");
      return projectRoomWorkerVisibilityRow({
        roomId: id,
        assignedCount: assignedWorkerCountForRoom(id),
        workers: roomWorkers,
        noAgentsPresentCopy: presence.agentsPresent === 0 && assignedWorkerCountForRoom(id) > 0,
      });
    });
    const contract = evaluateHQRoomAssignedWorkerVisibilityContract({ rows });
    expect(contract.gate).toBe(HQ_ROOM_ASSIGNED_WORKER_VISIBILITY_CONTRACT);
    expect(contract.result).toBe("PASS");
    expect(firstClassRoomsWithAssignedWorkers()).toEqual(ALL_HQ_ROOM_IDS);
    expect(HQ_FIRST_CLASS_ROOMS).toHaveLength(ALL_HQ_ROOM_IDS.length);
    expect(rows.every((row) => row.assigned_count > 0 && row.rendered_count + row.overflow_count === row.assigned_count)).toBe(true);
    expect(rows.reduce((sum, row) => sum + row.active_count, 0)).toBe(0);
    expect(rows.reduce((sum, row) => sum + row.false_active_glows, 0)).toBe(0);
  });

  it("renders four assigned waiting orbs and never says no agents present", () => {
    const workers = assignedWaitingFixture(0);
    const presence = deriveRoomPresence(workers, "WAITING");
    expect(presence.agentsPresent).toBe(4);
    expect(presence.agentsActive).toBe(0);
    expect(presence.state).toBe("PRESENT_IDLE");
    expect(evaluateHQRoomAssignedWorkerPresenceGate({
      assignedCount: 4,
      renderedOrbCount: presence.presenceNodes.length,
    }).result).toBe("PASS");
    expect(evaluateHQRoomWorkerCountConsistencyGate({
      assignedCount: 4,
      renderedCount: presence.presenceNodes.length,
      overflowUi: presence.overflowWorkerCount > 0,
      overflowCount: presence.overflowWorkerCount,
      shownPresentLabel: 4,
    }).result).toBe("PASS");
    expect(workers.every((item) => projectWorkerVisualState(item).glow === false)).toBe(true);
    expect(presence.agentsPresent === 0).toBe(false);
  });

  it("keeps all assigned orbs when one worker is canonically active", () => {
    const workers = assignedWaitingFixture(1);
    const presence = deriveRoomPresence(workers, "RUNNING");
    const command = projectCommandOversight({ workers });
    expect(presence.agentsPresent).toBe(4);
    expect(presence.activeNodes).toHaveLength(1);
    expect(presence.presenceNodes.filter((item) => !item.isActive)).toHaveLength(3);
    expect(command.commandState).toBe("ACTIVE_OVERSIGHT");
    expect(command.infinityState).toBe("ACTIVE");
    expect(evaluateHQWorkerCommandActivityTraceabilityGate({
      workers,
      commandState: command.commandState,
    }).result).toBe("PASS");
  });

  it("shows blocked and authorization orbs without active glow", () => {
    expect(projectWorkerVisualState(HQ_BLOCKED_WORKER_FIXTURE[0]!).visualState).toBe("BLOCKED");
    expect(projectWorkerVisualState(HQ_BLOCKED_WORKER_FIXTURE[0]!).glow).toBe(false);
    expect(projectWorkerVisualState(HQ_AUTHORIZATION_WORKER_FIXTURE[0]!).visualState).toBe("AUTHORIZATION_REQUIRED");
    expect(projectWorkerVisualState(HQ_AUTHORIZATION_WORKER_FIXTURE[0]!).glow).toBe(false);
    expect(evaluateHQRoomAssignedWorkerPresenceGate({
      assignedCount: 1,
      renderedOrbCount: 1,
    }).gate).toBe(HQ_ROOM_ASSIGNED_WORKER_PRESENCE_GATE);
  });
});

describe("HQRoomWorkerOrbRenderedQualityGate + command traceability", () => {
  it("requires orb, labels, reduced motion, and no false glow", () => {
    const worker = readFileSync(join(ROOT, "components/dashboard/operator-console/worker-node.tsx"), "utf8");
    const track = readFileSync(join(ROOT, "components/dashboard/operator-console/infinity-room/room-presence-track.tsx"), "utf8");
    const css = [
      readFileSync(join(ROOT, "app/globals.css"), "utf8"),
      readFileSync(join(ROOT, "app/hq-live-activity.css"), "utf8"),
    ].join("\n");
    const quality = evaluateHQRoomWorkerOrbRenderedQualityGate({
      orbVisible: worker.includes("rounded-full") && track.includes("WorkerNode"),
      labelReadable: worker.includes("displayRole") && worker.includes("VISUAL_BADGE"),
      stateReadable: worker.includes("data-hq-worker-visual-state") && worker.includes("accessibleState"),
      clipping: false,
      overlap: track.includes("flex-wrap") === false,
      offScreen: false,
      activeGlowOnlyWhenActive: worker.includes("visual.glow") && !worker.includes("setInterval"),
      reducedMotionSupport: css.includes("prefers-reduced-motion") && css.includes(".hq-worker-orb--motion"),
      accessibleStateCue: worker.includes("aria-label") && worker.includes("accessibleState"),
    });
    expect(quality.gate).toBe(HQ_ROOM_WORKER_ORB_RENDERED_QUALITY_GATE);
    expect(quality.result).toBe("PASS");
    expect(track).toContain("AGENTS IDLE");
    expect(track).toContain("AGENTS WAITING");
    expect(track).not.toMatch(/agentsPresent === 0[\s\S]*NO AGENTS PRESENT[\s\S]*presence\.state === "EMPTY"/);
  });

  it("fails command traceability when glow and command disagree", () => {
    expect(evaluateHQWorkerCommandActivityTraceabilityGate({
      workers: assignedWaitingFixture(0),
      commandState: "ACTIVE_OVERSIGHT",
    }).result).toBe("FAIL");
    expect(evaluateHQWorkerCommandActivityTraceabilityGate({
      workers: assignedWaitingFixture(1),
      commandState: "ACTIVE_OVERSIGHT",
    }).gate).toBe(HQ_WORKER_COMMAND_ACTIVITY_TRACEABILITY_GATE);
    expect(evaluateHQWorkerCommandActivityTraceabilityGate({
      workers: assignedWaitingFixture(1),
      commandState: "ACTIVE_OVERSIGHT",
    }).result).toBe("PASS");
  });
});

describe("Design Core left placement", () => {
  it("moves only Design Core position metadata", () => {
    expect(hqFloorSpan("creative_studio")).toBe("left");
    expect(HQ_FLOOR_LAYOUT_SECTIONS.above.left).toEqual(["opportunity_lab", "creative_studio"]);
    expect(HQ_FLOOR_LAYOUT_SECTIONS.above.right).toEqual([
      "research_department",
      "company_operations",
      "growth_department",
      "product_lab",
      "strategy_finance",
      "systems_architect",
    ]);
    const before = Object.fromEntries(
      (["strategy_finance", "systems_architect", "creative_studio"] as const).map((id) => [id, hqRoomContentFingerprint(id)]),
    );
    const gate = evaluateHQRoomPositionIntegrityGate({
      requestedRightSequence: ["product_lab", "strategy_finance", "systems_architect"],
      beforeFingerprints: before,
      afterFingerprints: before,
    });
    expect(gate.gate).toBe(HQ_ROOM_POSITION_INTEGRITY_GATE);
    expect(gate.result).toBe("PASS");
    expect(evaluateHQOperatingFloorPlacementContract().gate).toBe(HQ_OPERATING_FLOOR_PLACEMENT_CONTRACT);
    expect(evaluateHQOperatingFloorPlacementContract().result).toBe("PASS");
    expect(evaluateHQOperatingFloorColumnBalanceGate({
      leftAboveCount: HQ_FLOOR_LAYOUT_SECTIONS.above.left.length,
      rightAboveCount: HQ_FLOOR_LAYOUT_SECTIONS.above.right.length,
      movedRoomsStillOnTallerSide: false,
      legalMovesAvailable: true,
    }).gate).toBe(HQ_OPERATING_FLOOR_COLUMN_BALANCE_GATE);
    expect(evaluateHQOperatingFloorColumnBalanceGate({
      leftAboveCount: HQ_FLOOR_LAYOUT_SECTIONS.above.left.length,
      rightAboveCount: HQ_FLOOR_LAYOUT_SECTIONS.above.right.length,
      movedRoomsStillOnTallerSide: false,
      legalMovesAvailable: true,
    }).result).toBe("PASS");
  });
});
