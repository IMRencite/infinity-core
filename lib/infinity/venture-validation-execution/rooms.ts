import type { DepartmentId, DepartmentUiState, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import { deriveRoomPresence } from "@/lib/infinity/operator-console/room-presence";
import type { ValidationTask } from "./types";

function toState(task: ValidationTask): DepartmentUiState {
  if (task.status === "RUNNING") return "RUNNING";
  if (task.status === "COMPLETED") return "COMPLETE";
  if (task.status === "BLOCKED") return "BLOCKED";
  if (task.status === "READY") return "WAITING";
  return "NOT_STARTED";
}

export function roomPresenceFromValidationTasks(tasks: ValidationTask[]): Array<{
  roomId: DepartmentId;
  state: string;
  drivenByTaskId: string;
}> {
  const rooms = new Map<DepartmentId, ValidationTask[]>();
  for (const task of tasks) {
    const list = rooms.get(task.capabilityRoute.roomId) ?? [];
    list.push(task);
    rooms.set(task.capabilityRoute.roomId, list);
  }
  const out: Array<{ roomId: DepartmentId; state: string; drivenByTaskId: string }> = [];
  for (const [roomId, roomTasks] of rooms) {
    const nodes: OperatorWorkerNode[] = roomTasks.map((task) => ({
      nodeId: `vtask:${task.taskId}`,
      departmentId: roomId,
      role: task.requiredCapability,
      displayRole: task.requiredCapability,
      status: toState(task),
      task: task.question,
      displayTask: task.question,
      provider: null,
      model: null,
      isActive: task.status === "RUNNING",
      isDormant: task.status === "COMPLETED" || task.status === "PENDING",
      motionActive: task.status === "RUNNING",
    }));
    const dept: DepartmentUiState = roomTasks.some((task) => task.status === "RUNNING")
      ? "RUNNING"
      : roomTasks.every((task) => task.status === "COMPLETED")
        ? "COMPLETE"
        : "WAITING";
    const model = deriveRoomPresence(nodes, dept);
    out.push({
      roomId,
      state: model.state,
      drivenByTaskId: roomTasks[0]!.taskId,
    });
  }
  return out;
}
