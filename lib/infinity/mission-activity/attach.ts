import { buildRoomActivityExplanation } from "@/lib/infinity/operator-console/room-activity";
import { OPERATIONS_ROOM_ID } from "@/lib/infinity/operator-console/room-naming";
import type {
  DepartmentId,
  DepartmentUiState,
  OperatorVentureSnapshot,
  OperatorWorkerNode,
} from "@/lib/infinity/operator-console/types";
import type { CanonicalActivityStatus } from "./constants";
import { HQ_ACTIVITY_ROOMS } from "./constants";
import { isLiveExecutionStatus } from "./status";
import { projectCommandActivity } from "./project";
import { asDepartmentId } from "./rooms";
import type { ActiveWorkerProjection, CommandActivityView } from "./types";
import { activateWorkersForActiveRooms } from "./worker-motion";
import { workerVisualEligible } from "./worker-roles";

function departmentStateFromActivity(
  status: CanonicalActivityStatus,
  previous?: DepartmentUiState,
): DepartmentUiState | null {
  if (status === "ACTIVE_WORK") return "RUNNING";
  if (status === "READY_BLOCKED") return "BLOCKED";
  if (status === "WAITING_EXTERNAL" || status === "WAITING_INTERNAL") return "WAITING";
  if (status === "FAILED") return "FAILED";
  if (previous === "RUNNING") return "COMPLETE";
  return previous ?? null;
}

export function workerNodeFromProjection(worker: ActiveWorkerProjection): OperatorWorkerNode {
  const active = workerVisualEligible(worker.status);
  const blocked = worker.status === "READY_BLOCKED" || worker.status === "FAILED";
  const waiting = worker.status === "WAITING_EXTERNAL" || worker.status === "WAITING_INTERNAL";
  const status: DepartmentUiState = active
    ? "RUNNING"
    : blocked
      ? worker.status === "FAILED"
        ? "FAILED"
        : "BLOCKED"
      : waiting
        ? "WAITING"
        : "COMPLETE";
  return {
    nodeId: worker.workerExecutionId,
    departmentId: asDepartmentId(worker.room),
    role: worker.role,
    displayRole: worker.role,
    status,
    task: worker.task,
    displayTask: worker.task,
    provider: null,
    model: null,
    isActive: active,
    isDormant: !active,
    motionActive: active,
  };
}

export function attachCommandActivity(
  snapshot: OperatorVentureSnapshot,
  view?: CommandActivityView,
): OperatorVentureSnapshot {
  const commandActivity =
    view ??
    projectCommandActivity({
      organizationId: snapshot.venture.organizationId,
      selectedVentureId: snapshot.venture.ventureAssemblyId,
      includeSynthetic: false,
    });
  // Command is org-scoped. Inspected ventureId is not used as a hide filter.
  const inspecting = commandActivity.nowInspecting;
  const live = isLiveExecutionStatus(inspecting.status) || commandActivity.counts.activeMissions > 0;
  const missionNodes = (commandActivity.activeWorkers ?? []).map(workerNodeFromProjection);
  const existingNodes = (snapshot.workerNodes ?? []).filter(
    (node) => !missionNodes.some((mission) => mission.nodeId === node.nodeId),
  );
  const workerNodes = activateWorkersForActiveRooms(
    [...missionNodes, ...existingNodes],
    commandActivity.rooms,
    inspecting.currentTask ?? inspecting.currentStep ?? null,
  );
  const missionActiveRooms = HQ_ACTIVITY_ROOMS
    .map((room) => asDepartmentId(room))
    .filter((room) => commandActivity.rooms[room]?.status === "ACTIVE_WORK");
  if (commandActivity.rooms[OPERATIONS_ROOM_ID]?.status === "ACTIVE_WORK") {
    missionActiveRooms.push(OPERATIONS_ROOM_ID);
  }
  const currentDepartments = (missionActiveRooms.length > 0
    ? [...new Set(missionActiveRooms)]
    : []) as DepartmentId[];
  const leadRoom =
    missionActiveRooms.find((room) => room !== "executive_office") ??
    missionActiveRooms[0] ??
    snapshot.currentActivity.departmentId;

  const currentActivity = {
    ...snapshot.currentActivity,
    active: commandActivity.counts.activeMissions > 0,
    departmentId: leadRoom,
    departmentLabel: leadRoom
      ? commandActivity.rooms[leadRoom]?.roomLabel ?? snapshot.currentActivity.departmentLabel
      : snapshot.currentActivity.departmentLabel,
    displayNarration: live
      ? inspecting.lastActivity ?? snapshot.currentActivity.displayNarration
      : snapshot.favc1Cycle
        ? commandActivity.latestCompleted?.summary ?? snapshot.currentActivity.displayNarration
        : snapshot.currentActivity.displayNarration,
    displayTask: live
      ? inspecting.currentTask ?? inspecting.currentStep ?? null
      : snapshot.favc1Cycle
        ? null
        : snapshot.currentActivity.displayTask,
    latestActivitySummary: live
      ? inspecting.lastActivity
      : commandActivity.latestCompleted?.summary ?? snapshot.currentActivity.latestActivitySummary,
    latestActivityAt: live
      ? inspecting.lastActivityAt
      : commandActivity.latestCompleted?.completedAt ?? snapshot.currentActivity.latestActivityAt,
    task: live
      ? inspecting.currentTask ?? inspecting.currentStep ?? null
      : snapshot.favc1Cycle
        ? null
        : snapshot.currentActivity.task,
    status: live ? inspecting.status ?? snapshot.currentActivity.status : snapshot.currentActivity.status,
    startedAt: live ? inspecting.startedAt ?? snapshot.currentActivity.startedAt : snapshot.currentActivity.startedAt,
  };

  const departments = snapshot.departments.map((dept) => {
    const slice = commandActivity.rooms[dept.id];
    if (!slice) return dept;
    if (slice.status === "EMPTY") {
      return { ...dept, isActive: false, state: dept.state === "RUNNING" ? "COMPLETE" : dept.state };
    }
    const nextState = departmentStateFromActivity(slice.status, dept.state);
    const worker = missionNodes.find((node) => node.departmentId === dept.id);
    const roomLive = isLiveExecutionStatus(slice.status) || slice.status === "FAILED";
    const patched = {
      ...dept,
      state: nextState ?? dept.state,
      currentTask: roomLive ? worker?.task ?? slice.summary ?? dept.currentTask : dept.currentTask,
    };
    const explanation =
      !live && slice.status === "PRESENT_IDLE" && dept.activityExplanation
        ? dept.activityExplanation
        : buildRoomActivityExplanation({
            departmentId: dept.id,
            department: patched,
            workerNodes: missionNodes.filter((node) => node.departmentId === dept.id),
            currentActivity,
            closedLoopRoute: snapshot.closedLoopRoute,
            ventureName: snapshot.venture.ventureName,
            ventureId: snapshot.venture.ventureAssemblyId,
            commandRoomStatus: slice.status,
            commandRoomSummary: slice.summary,
            nowInspectingTask: inspecting.currentTask ?? inspecting.currentStep,
          });
    return {
      ...dept,
      activityExplanation: explanation,
      isActive: slice.status === "ACTIVE_WORK",
      state: nextState ?? dept.state,
      currentTask: roomLive ? worker?.task ?? slice.summary ?? dept.currentTask : dept.currentTask,
      displayTask: roomLive ? worker?.displayTask ?? dept.displayTask : dept.displayTask,
      lastActivityAt: live ? inspecting.lastActivityAt ?? dept.lastActivityAt : dept.lastActivityAt,
    };
  });

  const inspectionContext = {
    kind: snapshot.favc1Cycle ? ("FAVC1_CYCLE" as const) : ("VENTURE" as const),
    cycleKey: snapshot.favc1Cycle?.cycleKey ?? null,
    ventureAssemblyId: snapshot.venture.ventureAssemblyId,
    terminalHeadline: snapshot.favc1Cycle?.terminalDisplay?.headline ?? null,
    terminalDecision: snapshot.favc1Cycle?.terminalDisplay?.decision ?? null,
  };
  const roomPresence = HQ_ACTIVITY_ROOMS.map((room) => ({
    room: asDepartmentId(room),
    status: commandActivity.rooms[asDepartmentId(room)]?.status ?? "EMPTY",
  }));

  return {
    ...snapshot,
    currentActivity,
    currentDepartments,
    departments,
    workerNodes,
    commandActivity,
    inspectionContext,
    currentExecution: commandActivity.nowInspecting,
    latestCompletedExecution: commandActivity.latestCompleted,
    roomPresence,
    activeWorkers: commandActivity.activeWorkers,
  };
}
