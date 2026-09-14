import type { CanonicalActivityStatus, CommandActivityView, CommandNowInspecting } from "@/lib/infinity/mission-activity";
import { activeRoomLabelsFromRooms } from "@/lib/infinity/mission-activity/active-rooms";
import { ACTIVITY_ROOM_LABELS, HQ_ACTIVITY_ROOMS } from "@/lib/infinity/mission-activity/constants";
import type { ActiveWorkerProjection } from "@/lib/infinity/mission-activity";
import { isLiveExecutionStatus } from "@/lib/infinity/mission-activity/status";
import { asDepartmentId } from "@/lib/infinity/mission-activity/rooms";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { OPERATIONS_ROOM_ID } from "@/lib/infinity/operator-console/room-naming";
import { ROOM_ACTIVITY_IDLE } from "@/lib/infinity/operator-console/room-activity";
import { sourceLabel } from "./rooms";
import {
  projectCanonicalLatestVentureWork,
  projectLatestSystemActivity,
  projectLatestVentureWork,
  projectRecentSystemActivityHistory,
  projectRecentVentureWorkHistory,
  resolveLatestVentureWorkContext,
} from "./classification";
import { resolveCurrentCanonicalWork } from "./resolver";
import { listCanonicalWork, listOpenCanonicalWork } from "./store";
import type { CanonicalWorkExecutionContract, CanonicalWorkHqProjection, CanonicalWorkStatus } from "./types";
import {
  commandMissionSummary,
  resolveAgentCurrentTask,
  resolveRoomCurrentWork,
} from "@/lib/infinity/room-work/resolver";

function newerLatestCompleted(
  left: CommandActivityView["latestCompleted"],
  right: CommandActivityView["latestCompleted"],
): CommandActivityView["latestCompleted"] {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(right.completedAt ?? "") >= Date.parse(left.completedAt ?? "") ? right : left;
}

function hasOpenMissionActivity(view: CommandActivityView): boolean {
  return (
    isLiveExecutionStatus(view.nowInspecting.status) ||
    view.counts.activeMissions > 0 ||
    view.counts.blockedMissions > 0 ||
    view.counts.waitingMissions > 0
  );
}

function roomHasOpenActivity(slice: CommandActivityView["rooms"][DepartmentId] | undefined): boolean {
  if (!slice) return false;
  return isLiveExecutionStatus(slice.status) || slice.status === "FAILED";
}

function idleActivityRooms(view: CommandActivityView): CommandActivityView["rooms"] {
  const rooms = { ...view.rooms };
  for (const room of HQ_ACTIVITY_ROOMS) {
    const id = asDepartmentId(room);
    rooms[id] = {
      room,
      roomLabel: ACTIVITY_ROOM_LABELS[room],
      status: "PRESENT_IDLE",
      summary: null,
      allowAmbientMotion: false,
      latestEventId: null,
    };
  }
  return rooms;
}

export function workStatusToActivityStatus(status: CanonicalWorkStatus): CanonicalActivityStatus {
  if (status === "ACTIVE") return "ACTIVE_WORK";
  if (status === "WAITING" || status === "QUEUED") return "WAITING_INTERNAL";
  if (status === "AUTHORIZATION_REQUIRED") return "WAITING_EXTERNAL";
  if (status === "BLOCKED") return "READY_BLOCKED";
  if (status === "FAILED" || status === "STALE") return "FAILED";
  if (status === "COMPLETED" || status === "CANCELLED" || status === "SUPERSEDED") return "COMPLETED";
  return "PRESENT_IDLE";
}

export function projectCanonicalWorkHq(now = new Date().toISOString()): CanonicalWorkHqProjection {
  const projection = resolveCurrentCanonicalWork(now);
  const work = projection.work;
  const open = listOpenCanonicalWork();
  const history = listCanonicalWork()
    .filter((row) => !open.some((item) => item.work_id === row.work_id))
    .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at));
  return {
    work,
    all_open: open,
    history,
    command_visible: Boolean(work),
    operations_visible: Boolean(work),
    assigned_rooms_visible: work?.status === "ACTIVE" ? work.assigned_rooms : [],
    infinity_active: work?.status === "ACTIVE",
    source_label: work ? sourceLabel(work.source) : "NONE",
  };
}

export function roomLabelForWork(room: string): string {
  if (room === OPERATIONS_ROOM_ID) return "Operations Room";
  return ACTIVITY_ROOM_LABELS[room as keyof typeof ACTIVITY_ROOM_LABELS] ?? room;
}

export function activeRoomLabelsFromWork(work: CanonicalWorkExecutionContract): string[] {
  if (work.status !== "ACTIVE") return [];
  return work.assigned_rooms.map(roomLabelForWork);
}

export function workersFromCanonicalWork(work: CanonicalWorkExecutionContract): ActiveWorkerProjection[] {
  if (work.status !== "ACTIVE") return [];
  const pairs = work.assigned_rooms.map((room, index) => ({
    room,
    role: work.assigned_workers[index] ?? roomLabelForWork(room),
  }));
  const workers = pairs
    .filter((pair) => (HQ_ACTIVITY_ROOMS as readonly string[]).includes(pair.room))
    .map((pair) => {
      const roomId = pair.room;
      const task = resolveAgentCurrentTask({
        work,
        roomId,
        agentName: pair.role,
        agentId: `canonical-work:${work.work_id}:${roomId}`,
      });
      return {
        workerExecutionId: `canonical-work:${work.work_id}:${roomId}`,
        missionId: work.mission_id,
        stepId: work.work_id,
        stepType: work.work_type,
        ventureId: work.venture_id,
        role: pair.role,
        room: pair.room as ActiveWorkerProjection["room"],
        task: task.task_summary,
        status: "ACTIVE_WORK" as const,
        startedAt: work.started_at,
        lastActivityAt: work.updated_at,
        provider: work.source === "INFINITY_RUNTIME" ? "infinity-runtime" : work.source,
        blocker: work.blocked_reason,
        next: work.next_expected_transition,
      };
    });
  if (!workers.some((worker) => worker.room === "executive_office" && worker.role === "Command")) {
    workers.push({
      workerExecutionId: `canonical-work:${work.work_id}:command`,
      missionId: work.mission_id,
      stepId: work.work_id,
      stepType: work.work_type,
      ventureId: work.venture_id,
      role: "Command",
      room: "executive_office",
      task: work.title,
      status: "ACTIVE_WORK",
      startedAt: work.started_at,
      lastActivityAt: work.updated_at,
      provider: work.source === "INFINITY_RUNTIME" ? "infinity-runtime" : work.source,
      blocker: work.blocked_reason,
      next: work.next_expected_transition,
    });
  }
  return workers;
}

export function nowInspectingFromCanonicalWork(work: CanonicalWorkExecutionContract): CommandNowInspecting {
  const rooms = work.assigned_rooms.map(roomLabelForWork);
  const primaryRoom = work.assigned_rooms[0] ?? "executive_office";
  const agent = resolveAgentCurrentTask({
    work,
    roomId: primaryRoom,
    agentName: work.assigned_workers[0] ?? sourceLabel(work.source),
    agentId: `canonical-work:${work.work_id}:${primaryRoom}`,
  });
  return {
    currentWorkId: work.work_id,
    currentMission: work.title,
    currentPhase: work.stage,
    currentStep: agent.task_summary,
    currentRoom: rooms[0] ?? null,
    currentRooms: work.status === "ACTIVE" ? rooms : [],
    currentWorker: work.assigned_workers[0] ?? sourceLabel(work.source),
    currentTask: agent.task_summary,
    status: workStatusToActivityStatus(work.status),
    why: `${sourceLabel(work.source)}. Assigned rooms are ACTIVE while this work is executing.`,
    startedAt: work.started_at,
    lastActivity: work.latest_output,
    lastActivityAt: work.updated_at,
    nextExpectedStep: work.next_expected_transition,
    blocker: work.blocked_reason,
    authorizationRequired: work.authorization_state,
  };
}

function latestCompletedFromWork(work: CanonicalWorkExecutionContract | null): CommandActivityView["latestCompleted"] {
  if (!work) return null;
  return {
    summary: work.latest_output,
    completedAt: work.completed_at ?? work.updated_at,
    missionType: work.title,
    missionId: work.mission_id,
    outcome: work.status,
  };
}

function workItemFromCanonical(projection: ReturnType<typeof projectCanonicalLatestVentureWork>) {
  if (!projection) return null;
  return {
    workId: projection.work_id,
    work_id: projection.work_id,
    missionId: projection.work_id,
    ventureId: projection.venture_id,
    title: projection.mission_title,
    mission_title: projection.mission_title,
    classification: projection.classification,
    status: projection.status,
    completedAt: projection.completed_at,
    completed_at: projection.completed_at,
    updatedAt: projection.updated_at,
    latestOutput: projection.latest_output,
    startedAt: projection.started_at,
    started_at: projection.started_at,
    ventureName: projection.venture_name,
    venture_id: projection.venture_id,
    venture_name: projection.venture_name,
    scope: projection.scope,
    label: projection.label,
    trace: projection.work_id,
    substantiveVentureWork: true,
    systemOnly: false,
    diagnostic: false,
  };
}

function workHistoryOverlay(selectedVentureId?: string | null) {
  const rows = listCanonicalWork();
  const context = resolveLatestVentureWorkContext(selectedVentureId);
  const latestSystemActivity = projectLatestSystemActivity(rows);
  const canonicalVenture = projectCanonicalLatestVentureWork(selectedVentureId, rows);
  const latestPortfolioVentureWork = projectLatestVentureWork(rows, null);
  const scopedHistoryId = context.explicit ? context.venture_id : null;
  return {
    latestSystemActivity,
    latestVentureWork: workItemFromCanonical(canonicalVenture),
    latestPortfolioVentureWork: workItemFromCanonical(latestPortfolioVentureWork),
    recentVentureWork: projectRecentVentureWorkHistory(rows, scopedHistoryId),
    recentSystemActivity: projectRecentSystemActivityHistory(rows),
    selectedVentureId: context.venture_id,
    latestVentureWorkScope: context.scope,
    latestVentureWorkLabel: context.label,
  };
}

export function mergeCanonicalWorkIntoCommandActivity(
  view: CommandActivityView,
  selectedVentureId?: string | null,
): CommandActivityView {
  const projection = resolveCurrentCanonicalWork();
  const work = projection.work?.status === "ACTIVE" ? projection.work : null;
  const latestCanonical = projection.latest_completed_work_id
    ? listCanonicalWork().find((row) => row.work_id === projection.latest_completed_work_id) ?? null
    : null;
  const latestCompleted = newerLatestCompleted(view.latestCompleted, latestCompletedFromWork(latestCanonical));
  const history = workHistoryOverlay(selectedVentureId);
  if (!work) {
    if (hasOpenMissionActivity(view)) {
      return { ...view, latestCompleted, ...history };
    }
    return {
      ...view,
      rooms: idleActivityRooms(view),
      nowInspecting: {
        currentWorkId: null,
        currentMission: null,
        currentPhase: null,
        currentStep: null,
        currentRoom: null,
        currentRooms: [],
        currentWorker: null,
        currentTask: null,
        status: latestCompleted ? "PRESENT_IDLE" : "EMPTY",
        why: latestCompleted
          ? "No active canonical work. Latest completed is shown separately."
          : null,
        startedAt: null,
        lastActivity: latestCompleted?.summary ?? null,
        lastActivityAt: latestCompleted?.completedAt ?? null,
        nextExpectedStep: null,
        blocker: null,
        authorizationRequired: null,
      },
      latestCompleted,
      activeWorkers: [],
      counts: {
        ...view.counts,
        activeMissions: 0,
      },
      ...history,
    };
  }
  const rooms = { ...view.rooms };
  for (const room of HQ_ACTIVITY_ROOMS) {
    const id = asDepartmentId(room);
    const assigned = work.assigned_rooms.includes(room) || room === "executive_office";
    if (assigned || roomHasOpenActivity(rooms[id])) continue;
    rooms[id] = {
      room,
      roomLabel: ACTIVITY_ROOM_LABELS[room],
      status: "PRESENT_IDLE",
      summary: null,
      allowAmbientMotion: false,
      latestEventId: null,
    };
  }
  for (const room of work.assigned_rooms) {
    if (room === OPERATIONS_ROOM_ID) continue;
    if (!(HQ_ACTIVITY_ROOMS as readonly string[]).includes(room)) continue;
    const hqRoom = room as typeof HQ_ACTIVITY_ROOMS[number];
    const id = asDepartmentId(hqRoom);
    rooms[id] = {
      room: hqRoom,
      roomLabel: ACTIVITY_ROOM_LABELS[hqRoom],
      status: workStatusToActivityStatus(work.status),
      summary: resolveRoomCurrentWork(work, hqRoom).contribution_summary,
      allowAmbientMotion: work.status === "ACTIVE",
      latestEventId: work.work_id,
    };
  }
  rooms.operations = {
    room: "executive_office",
    roomLabel: "Operations Room",
    status: workStatusToActivityStatus(work.status),
    summary: resolveRoomCurrentWork(work, OPERATIONS_ROOM_ID).contribution_summary,
    allowAmbientMotion: work.status === "ACTIVE",
    latestEventId: work.work_id,
  };
  const commandDept = asDepartmentId("executive_office");
  rooms[commandDept] = {
    ...rooms[commandDept],
    status: workStatusToActivityStatus(work.status),
    summary: commandMissionSummary(work),
    allowAmbientMotion: work.status === "ACTIVE",
    latestEventId: work.work_id,
  };
  const currentRooms = activeRoomLabelsFromRooms(rooms);
  const nowInspecting = { ...nowInspectingFromCanonicalWork(work), currentRooms };
  const canonicalWorkers = workersFromCanonicalWork(work);
  const canonicalRooms = new Set(canonicalWorkers.map((worker) => worker.room));
  return {
    ...view,
    rooms,
    nowInspecting,
    activeWorkers: [
      ...canonicalWorkers,
      ...(view.activeWorkers ?? []).filter((worker) => !canonicalRooms.has(worker.room)),
    ],
    counts: {
      activeMissions: (work.status === "ACTIVE" ? 1 : 0) + view.counts.activeMissions,
      blockedMissions: (work.status === "BLOCKED" ? 1 : 0) + view.counts.blockedMissions,
      waitingMissions:
        (work.status === "WAITING" || work.status === "QUEUED" ? 1 : 0) + view.counts.waitingMissions,
      authorizationRequired:
        (work.status === "AUTHORIZATION_REQUIRED" ? 1 : 0) + view.counts.authorizationRequired,
    },
    latestCompleted: newerLatestCompleted(latestCompleted, latestCompletedFromWork(latestCanonical)),
    ...history,
    systemView: {
      ...view.systemView,
      missionId: work.mission_id,
      engine: work.work_type,
      step: work.stage,
      workerOrProvider: sourceLabel(work.source),
      artifactId: work.artifact_refs[0] ?? work.work_id,
      startedAt: work.started_at,
      latestEvent: work.latest_output,
    },
  };
}

export function commandLooksIdle(sentence: string | null | undefined): boolean {
  return !sentence
    || sentence === ROOM_ACTIVITY_IDLE
    || /no active task right now/i.test(sentence)
    || /no active canonical work/i.test(sentence)
    || /^IDLE\b/i.test(sentence);
}

export function operationsCopyForWork(work: CanonicalWorkExecutionContract): string {
  return [
    work.venture_id ? "OccupancyNPV" : "Infinity",
    work.title,
    work.status,
    work.stage,
    work.assigned_rooms.join(", "),
    `Source: ${sourceLabel(work.source)}`,
    work.next_expected_transition ? `Next: ${work.next_expected_transition}` : null,
  ].filter(Boolean).join(" · ");
}

export function roomsWithCanonicalWork(work: CanonicalWorkExecutionContract | null): DepartmentId[] {
  if (!work) return [];
  if (work.status === "COMPLETED" || work.status === "CANCELLED" || work.status === "SUPERSEDED" || work.status === "STALE") return [];
  return work.assigned_rooms;
}
