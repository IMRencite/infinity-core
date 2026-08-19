import type { DepartmentUiState, OperatorWorkerNode } from "./types";

export type RoomPresenceState = "ACTIVE_WORK" | "PRESENT_IDLE" | "BLOCKED" | "EMPTY";

export const HQ_WORKER_PRESENCE_LIMIT = 5;

export type RoomPresenceModel = {
  state: RoomPresenceState;
  activeNodes: OperatorWorkerNode[];
  presenceNodes: OperatorWorkerNode[];
  overflowWorkerCount: number;
  allowAmbientMotion: boolean;
  agentsPresent: number;
  agentsActive: number;
  agentsIdle: number;
  agentsBlocked: number;
};

function capPresence(nodes: OperatorWorkerNode[]): {
  visible: OperatorWorkerNode[];
  overflowWorkerCount: number;
} {
  if (nodes.length <= HQ_WORKER_PRESENCE_LIMIT) {
    return { visible: nodes, overflowWorkerCount: 0 };
  }
  return {
    visible: nodes.slice(0, HQ_WORKER_PRESENCE_LIMIT),
    overflowWorkerCount: nodes.length - HQ_WORKER_PRESENCE_LIMIT,
  };
}

export function deriveRoomPresence(
  nodes: OperatorWorkerNode[],
  departmentState: DepartmentUiState,
  _isTerminal = false,
): RoomPresenceModel {
  const blockedDept = departmentState === "BLOCKED" || departmentState === "FAILED";
  const activeNodes = blockedDept
    ? []
    : nodes.filter((node) => node.motionActive && node.isActive);
  const idleNodes = blockedDept ? nodes : nodes.filter((node) => !node.motionActive);

  const agentsActive = activeNodes.length;
  const agentsBlocked = blockedDept
    ? nodes.length
    : nodes.filter((node) => node.status === "BLOCKED" || node.status === "FAILED").length;
  const agentsPresent = nodes.length;
  const agentsIdle = Math.max(0, agentsPresent - agentsActive - (blockedDept ? 0 : agentsBlocked));
  const counts = { agentsPresent, agentsActive, agentsIdle, agentsBlocked };

  if (activeNodes.length > 0) {
    const idleCap = capPresence(idleNodes);
    return {
      state: "ACTIVE_WORK",
      activeNodes: activeNodes.slice(0, HQ_WORKER_PRESENCE_LIMIT),
      presenceNodes: idleCap.visible,
      overflowWorkerCount: idleCap.overflowWorkerCount,
      allowAmbientMotion: !blockedDept,
      ...counts,
    };
  }

  if (idleNodes.length === 0) {
    return {
      state: "EMPTY",
      activeNodes: [],
      presenceNodes: [],
      overflowWorkerCount: 0,
      allowAmbientMotion: false,
      ...counts,
    };
  }

  const idleCap = capPresence(idleNodes);
  if (blockedDept) {
    return {
      state: "BLOCKED",
      activeNodes: [],
      presenceNodes: idleCap.visible,
      overflowWorkerCount: idleCap.overflowWorkerCount,
      allowAmbientMotion: false,
      ...counts,
    };
  }

  return {
    state: "PRESENT_IDLE",
    activeNodes: [],
    presenceNodes: idleCap.visible,
    overflowWorkerCount: idleCap.overflowWorkerCount,
    allowAmbientMotion: false,
    ...counts,
  };
}
