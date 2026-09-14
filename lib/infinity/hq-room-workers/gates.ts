import { projectCommandOversight } from "@/lib/infinity/hq-live-activity/command";
import {
  countWorkerVisuals,
  deriveWorkerVisualState,
  projectWorkerVisualState,
} from "@/lib/infinity/hq-live-activity/workers";
import { HQ_WORKER_PRESENCE_LIMIT } from "@/lib/infinity/operator-console/room-presence";
import type { OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import { ALL_HQ_ROOM_IDS } from "@/lib/infinity/operator-console/room-naming";
import {
  HQ_NO_ACTIVE_WORK_IS_NOT_NO_AGENTS_PRINCIPLE,
  HQ_ROOM_ASSIGNED_WORKER_PRESENCE_GATE,
  HQ_ROOM_ASSIGNED_WORKER_VISIBILITY_CONTRACT,
  HQ_ROOM_WORKER_COUNT_CONSISTENCY_GATE,
  HQ_ROOM_WORKER_ORB_RENDERED_QUALITY_GATE,
  HQ_WORKER_COMMAND_ACTIVITY_TRACEABILITY_GATE,
  HQ_WORKER_ORBS_ARE_OPERATING_STATE_PRINCIPLE,
  type HqRoomWorkerVisibilityRow,
  type NamedWorkerGate,
} from "./contract";
import { assignedWorkerCountForRoom, assignedWorkerRolesForRoom } from "./assigned-roles";

export function evaluateHQRoomAssignedWorkerVisibilityContract(input: {
  rows: HqRoomWorkerVisibilityRow[];
  registeredRoomIds?: string[];
}): NamedWorkerGate {
  const reasons: string[] = [];
  const registered = input.registeredRoomIds ?? ALL_HQ_ROOM_IDS;
  const seen = new Set(input.rows.map((row) => row.room_id));
  for (const id of registered) {
    if (!seen.has(id)) reasons.push(`REGISTERED_ROOM_OMITTED:${id}`);
  }
  if (!HQ_NO_ACTIVE_WORK_IS_NOT_NO_AGENTS_PRINCIPLE.includes("NO AGENTS PRESENT")) {
    reasons.push("NO_AGENTS_PRINCIPLE_MISSING");
  }
  if (!HQ_WORKER_ORBS_ARE_OPERATING_STATE_PRINCIPLE.includes("OPERATIONAL STATE")) {
    reasons.push("OPERATING_STATE_PRINCIPLE_MISSING");
  }
  for (const row of input.rows) {
    if (row.assigned_count > 0 && row.rendered_count === 0) {
      reasons.push(`ASSIGNED_HIDDEN:${row.room_id}`);
    }
    if (row.assigned_count > 0 && row.no_agents_present_copy) {
      reasons.push(`FALSE_NO_AGENTS_COPY:${row.room_id}`);
    }
    if (row.false_active_glows > 0) reasons.push(`FALSE_ACTIVE_GLOW:${row.room_id}`);
  }
  return {
    gate: HQ_ROOM_ASSIGNED_WORKER_VISIBILITY_CONTRACT,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQRoomAssignedWorkerPresenceGate(input: {
  assignedCount: number;
  renderedOrbCount: number;
  roomId?: string;
}): NamedWorkerGate {
  const reasons: string[] = [];
  if (input.assignedCount > 0 && input.renderedOrbCount === 0) {
    reasons.push(`PRESENCE_MISSING:${input.roomId ?? "room"}`);
  }
  return {
    gate: HQ_ROOM_ASSIGNED_WORKER_PRESENCE_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQRoomWorkerCountConsistencyGate(input: {
  assignedCount: number;
  renderedCount: number;
  overflowUi: boolean;
  overflowCount?: number;
  shownPresentLabel?: number;
}): NamedWorkerGate {
  const reasons: string[] = [];
  if (input.overflowUi) {
    if ((input.overflowCount ?? 0) + input.renderedCount < input.assignedCount) {
      reasons.push("OVERFLOW_UNDERCOUNTS_ASSIGNED");
    }
  } else if (input.renderedCount !== input.assignedCount) {
    reasons.push(`COUNT_MISMATCH:${input.renderedCount}:${input.assignedCount}`);
  }
  if (
    typeof input.shownPresentLabel === "number"
    && input.shownPresentLabel !== input.assignedCount
  ) {
    reasons.push(`PRESENT_LABEL_MISMATCH:${input.shownPresentLabel}:${input.assignedCount}`);
  }
  return {
    gate: HQ_ROOM_WORKER_COUNT_CONSISTENCY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQRoomWorkerOrbRenderedQualityGate(input: {
  orbVisible: boolean;
  labelReadable: boolean;
  stateReadable: boolean;
  clipping: boolean;
  overlap: boolean;
  offScreen: boolean;
  activeGlowOnlyWhenActive: boolean;
  reducedMotionSupport: boolean;
  accessibleStateCue: boolean;
}): NamedWorkerGate {
  const reasons: string[] = [];
  if (!input.orbVisible) reasons.push("ORB_NOT_VISIBLE");
  if (!input.labelReadable) reasons.push("LABEL_UNREADABLE");
  if (!input.stateReadable) reasons.push("STATE_UNREADABLE");
  if (input.clipping) reasons.push("CLIPPING");
  if (input.overlap) reasons.push("OVERLAP");
  if (input.offScreen) reasons.push("OFF_SCREEN");
  if (!input.activeGlowOnlyWhenActive) reasons.push("FALSE_OR_MISSING_GLOW");
  if (!input.reducedMotionSupport) reasons.push("REDUCED_MOTION_MISSING");
  if (!input.accessibleStateCue) reasons.push("ACCESSIBLE_STATE_MISSING");
  return {
    gate: HQ_ROOM_WORKER_ORB_RENDERED_QUALITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQWorkerCommandActivityTraceabilityGate(input: {
  workers: OperatorWorkerNode[];
  commandState: string;
}): NamedWorkerGate {
  const reasons: string[] = [];
  const visuals = input.workers.map(projectWorkerVisualState);
  const command = projectCommandOversight({ workers: input.workers });
  const glowing = visuals.filter((row) => row.glow || row.visualState === "ACTIVE");
  if (glowing.length > 0 && command.activeWorkerCount === 0) {
    reasons.push("ORB_ACTIVE_COMMAND_UNAWARE");
  }
  if (glowing.length > 0 && command.commandState !== "ACTIVE_OVERSIGHT") {
    reasons.push("ORB_ACTIVE_COMMAND_NOT_OVERSIGHT");
  }
  if (input.commandState === "ACTIVE_OVERSIGHT" && command.activeWorkerCount === 0) {
    reasons.push("COMMAND_ACTIVE_WITHOUT_WORKER");
  }
  if (command.commandState === "ACTIVE_OVERSIGHT" && glowing.length === 0) {
    reasons.push("COMMAND_ACTIVE_NO_GLOWING_ORB");
  }
  if (input.commandState !== command.commandState) {
    reasons.push(`COMMAND_STATE_DISAGREE:${input.commandState}:${command.commandState}`);
  }
  return {
    gate: HQ_WORKER_COMMAND_ACTIVITY_TRACEABILITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function projectRoomWorkerVisibilityRow(input: {
  roomId: string;
  assignedCount: number;
  workers: OperatorWorkerNode[];
  noAgentsPresentCopy: boolean;
}): HqRoomWorkerVisibilityRow {
  const counts = countWorkerVisuals(input.workers);
  const overflowCount = Math.max(0, input.workers.length - HQ_WORKER_PRESENCE_LIMIT);
  const renderedCount = input.workers.length - overflowCount;
  const falseActive = input.workers.filter((node) => {
    const visual = projectWorkerVisualState(node);
    return visual.glow && visual.visualState !== "ACTIVE";
  }).length;
  return {
    room_id: input.roomId,
    assigned_count: input.assignedCount,
    rendered_count: renderedCount,
    overflow_count: overflowCount,
    overflow_ui: overflowCount > 0,
    active_count: counts.ACTIVE,
    waiting_count: counts.WAITING,
    blocked_count: counts.BLOCKED,
    authorization_count: counts.AUTHORIZATION_REQUIRED,
    idle_count: counts.IDLE,
    false_active_glows: falseActive,
    no_agents_present_copy: input.noAgentsPresentCopy,
  };
}

export function firstClassRoomAssignedRoleCount(roomId: Parameters<typeof assignedWorkerCountForRoom>[0]): number {
  return assignedWorkerCountForRoom(roomId);
}

export function firstClassRoomsWithAssignedWorkers(): string[] {
  return ALL_HQ_ROOM_IDS.filter((id) => assignedWorkerRolesForRoom(id).length > 0);
}

export function workerVisualIsFalselyActive(node: OperatorWorkerNode): boolean {
  const visual = projectWorkerVisualState(node);
  return visual.glow && deriveWorkerVisualState(node) !== "ACTIVE";
}
