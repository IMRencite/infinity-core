import type { DepartmentId, DepartmentUiState, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";
import { deriveRoomPresence } from "@/lib/infinity/operator-console/room-presence";
import type { ExecutableTask } from "./types";

function taskToDepartmentState(task: ExecutableTask): DepartmentUiState {
  if (task.status === "RUNNING" || task.status === "VALIDATING") return "RUNNING";
  if (task.status === "COMPLETED") return "COMPLETE";
  if (task.status === "FAILED") return "FAILED";
  if (task.status === "BLOCKED" || task.status === "REPAIR_REQUIRED") return "BLOCKED";
  if (task.status === "READY") return "WAITING";
  return "NOT_STARTED";
}

export function workerNodesFromTasks(tasks: ExecutableTask[]): OperatorWorkerNode[] {
  return tasks.map((task) => {
    const running = task.status === "RUNNING" || task.status === "VALIDATING";
    return {
      nodeId: `task:${task.taskId}`,
      departmentId: task.capabilityRoute.roomId,
      role: task.requiredCapability,
      displayRole: task.requiredCapability,
      status: taskToDepartmentState(task),
      task: task.purpose,
      displayTask: task.purpose,
      provider: null,
      model: null,
      isActive: running,
      isDormant: task.status === "COMPLETED" || task.status === "PENDING",
      motionActive: running,
    };
  });
}

export function roomPresenceFromTasks(tasks: ExecutableTask[]): Array<{
  roomId: DepartmentId;
  state: string;
  drivenByTaskId: string;
}> {
  const rooms = new Map<DepartmentId, ExecutableTask[]>();
  for (const task of tasks) {
    const list = rooms.get(task.capabilityRoute.roomId) ?? [];
    list.push(task);
    rooms.set(task.capabilityRoute.roomId, list);
  }
  const presence: Array<{ roomId: DepartmentId; state: string; drivenByTaskId: string }> = [];
  for (const [roomId, roomTasks] of rooms) {
    const nodes = workerNodesFromTasks(roomTasks);
    const departmentState = roomTasks.some((task) => task.status === "FAILED")
      ? "FAILED"
      : roomTasks.some((task) => task.status === "RUNNING" || task.status === "VALIDATING")
        ? "RUNNING"
        : roomTasks.some((task) => task.status === "BLOCKED" || task.status === "REPAIR_REQUIRED")
          ? "BLOCKED"
          : roomTasks.every((task) => task.status === "COMPLETED")
            ? "COMPLETE"
            : "WAITING";
    const model = deriveRoomPresence(nodes, departmentState);
    const driver = roomTasks.find((task) => task.status === "RUNNING" || task.status === "VALIDATING") ?? roomTasks[0]!;
    presence.push({
      roomId,
      state: model.state,
      drivenByTaskId: driver.taskId,
    });
  }
  return presence;
}
