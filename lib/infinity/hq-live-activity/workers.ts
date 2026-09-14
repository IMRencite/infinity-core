import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type {
  HQWorkerVisualStateRecord,
  HqRoomAggregateState,
  HqWorkerVisualState,
  WorkerVisualInput,
} from "./contract";
import { HQ_ROOM_STATE_PRECEDENCE } from "./contract";

const AUTHORIZATION_PATTERN = /AUTHORIZ|FOUNDER_APPROVAL/i;

export function isCanonicalWorkerExecuting(node: WorkerVisualInput): boolean {
  return node.isActive === true && node.motionActive === true && node.status === "RUNNING";
}

export function deriveWorkerVisualState(node: WorkerVisualInput): HqWorkerVisualState {
  const task = `${node.task ?? ""} ${node.displayTask ?? ""}`;
  if (isCanonicalWorkerExecuting(node)) return "ACTIVE";
  if (node.status === "BLOCKED" || node.status === "FAILED") {
    return AUTHORIZATION_PATTERN.test(task) ? "AUTHORIZATION_REQUIRED" : "BLOCKED";
  }
  if (node.status === "WAITING" || node.status === "PAUSED") return "WAITING";
  return "IDLE";
}

export function workerAccessibleState(visual: HqWorkerVisualState): string {
  switch (visual) {
    case "ACTIVE":
      return "Active: executing canonical work";
    case "WAITING":
      return "Waiting: scheduled or observing, not executing";
    case "BLOCKED":
      return "Blocked";
    case "AUTHORIZATION_REQUIRED":
      return "Authorization required";
    case "IDLE":
      return "Idle";
  }
}

export function projectWorkerVisualState(node: WorkerVisualInput): HQWorkerVisualStateRecord {
  const visualState = deriveWorkerVisualState(node);
  return {
    workerId: node.nodeId,
    room: node.departmentId,
    canonicalState: node.status,
    currentTask: node.displayTask ?? node.task,
    visualState,
    accessibleState: workerAccessibleState(visualState),
    glow: visualState === "ACTIVE",
  };
}

export function aggregateRoomVisualState(workers: WorkerVisualInput[]): HqRoomAggregateState {
  const states = new Set(workers.map(deriveWorkerVisualState));
  for (const state of HQ_ROOM_STATE_PRECEDENCE) {
    if (states.has(state)) return state;
  }
  return "IDLE";
}

export function countWorkerVisuals(workers: WorkerVisualInput[]): Record<HqWorkerVisualState, number> {
  const counts: Record<HqWorkerVisualState, number> = {
    ACTIVE: 0,
    WAITING: 0,
    BLOCKED: 0,
    AUTHORIZATION_REQUIRED: 0,
    IDLE: 0,
  };
  for (const node of workers) counts[deriveWorkerVisualState(node)] += 1;
  return counts;
}

export function workersForRoom(workers: WorkerVisualInput[], room: DepartmentId): WorkerVisualInput[] {
  return workers.filter((node) => node.departmentId === room);
}
