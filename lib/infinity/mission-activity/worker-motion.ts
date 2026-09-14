import { getRoomDisplayNames, OPERATIONS_ROOM_ID } from "@/lib/infinity/operator-console/room-naming";
import type { DepartmentId, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import type { CommandActivityView } from "./types";

export function activeWorkRoomIds(rooms: CommandActivityView["rooms"] | undefined): Set<string> {
  return new Set(
    Object.entries(rooms ?? {})
      .filter(([, slice]) => slice.status === "ACTIVE_WORK")
      .map(([id]) => id),
  );
}

export function settleWorkerMotion(
  nodes: OperatorWorkerNode[],
  rooms: CommandActivityView["rooms"] | undefined,
): OperatorWorkerNode[] {
  const active = activeWorkRoomIds(rooms);
  return nodes.map((node) => {
    if (active.has(node.departmentId)) {
      if (node.status === "BLOCKED" || node.status === "FAILED") {
        return { ...node, isActive: false, motionActive: false, isDormant: true };
      }
      return {
        ...node,
        status: "RUNNING",
        isActive: true,
        isDormant: false,
        motionActive: true,
      };
    }
    if (node.status === "BLOCKED" || node.status === "FAILED") {
      return { ...node, isActive: false, motionActive: false, isDormant: true };
    }
    if (!node.motionActive && !node.isActive && node.status !== "RUNNING") return node;
    return {
      ...node,
      isActive: false,
      motionActive: false,
      isDormant: true,
      status: node.status === "RUNNING" ? "WAITING" : node.status,
    };
  });
}

export function activateWorkersForActiveRooms(
  nodes: OperatorWorkerNode[],
  rooms: CommandActivityView["rooms"] | undefined,
  task: string | null,
): OperatorWorkerNode[] {
  const activeFloor = new Set(
    Object.entries(rooms ?? {})
      .filter(([id, slice]) => slice.status === "ACTIVE_WORK" && id !== OPERATIONS_ROOM_ID)
      .map(([id]) => id),
  );
  const next = nodes.map((node) => {
    if (!activeFloor.has(node.departmentId)) return node;
    if (node.status === "BLOCKED" || node.status === "FAILED") return node;
    return {
      ...node,
      status: "RUNNING" as const,
      isActive: true,
      isDormant: false,
      motionActive: true,
      task: task ?? node.task,
      displayTask: task ?? node.displayTask,
    };
  });
  for (const roomId of activeFloor) {
    if (next.some((node) => node.departmentId === roomId)) continue;
    const departmentId = roomId as DepartmentId;
    const names = getRoomDisplayNames(departmentId);
    next.push({
      nodeId: `active-room:${departmentId}`,
      departmentId,
      role: "ASSIGNED_WORK",
      displayRole: names?.displayName ?? departmentId,
      status: "RUNNING",
      task,
      displayTask: task,
      provider: null,
      model: null,
      isActive: true,
      isDormant: false,
      motionActive: true,
    });
  }
  if (rooms?.[OPERATIONS_ROOM_ID]?.status === "ACTIVE_WORK") {
    const executing = next.some(
      (node) => node.departmentId === OPERATIONS_ROOM_ID && node.isActive && node.motionActive,
    );
    if (!executing) {
      const leadIndex = next.findIndex(
        (node) => node.departmentId === OPERATIONS_ROOM_ID && (node.role === "VENTURE_OPERATOR" || node.displayRole === "Venture Operator"),
      );
      const fallback = leadIndex >= 0 ? leadIndex : next.findIndex((node) => node.departmentId === OPERATIONS_ROOM_ID);
      if (fallback >= 0) {
        const lead = next[fallback];
        next[fallback] = {
          ...lead,
          status: "RUNNING",
          isActive: true,
          isDormant: false,
          motionActive: true,
          task: task ?? lead.task,
          displayTask: task ?? lead.displayTask,
        };
      } else {
        next.push({
          nodeId: `active-room:${OPERATIONS_ROOM_ID}`,
          departmentId: OPERATIONS_ROOM_ID,
          role: "VENTURE_OPERATOR",
          displayRole: "Venture Operator",
          status: "RUNNING",
          task,
          displayTask: task,
          provider: null,
          model: null,
          isActive: true,
          isDormant: false,
          motionActive: true,
        });
      }
    }
  }
  return settleWorkerMotion(next, rooms);
}

