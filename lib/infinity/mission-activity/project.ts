import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { ACTIVITY_ROOM_LABELS, HQ_ACTIVITY_ROOMS, type CanonicalActivityStatus, type HqActivityRoomId } from "./constants";
import { nextExpectedStep, whyForStep } from "./narrate";
import { asDepartmentId } from "./rooms";
import {
  deriveTerminalOutcome,
  rankMissionsFromGroups,
  selectCurrentExecutionMission,
  selectLatestTerminalMission,
  type RankedExecutionMission,
} from "./select-execution";
import { roomForStep } from "./rooms";
import { isActiveWorkStatus, isBlockedStatus, isLiveExecutionStatus, isWaitingStatus, roomVisualState } from "./status";
import { listMissionActivityEvents } from "./store";
import { ensureOccupancyNpvCanonicalWork, mergeCanonicalWorkIntoCommandActivity } from "@/lib/infinity/canonical-work";
import {
  workerNextForStep,
  workerRoleForStep,
  workerRoomForEvent,
  workerTaskForEvent,
} from "./worker-roles";
import type {
  ActiveWorkerProjection,
  CommandActivityView,
  CommandNowInspecting,
  MissionActivityEvent,
  RoomActivitySlice,
} from "./types";
import { activeRoomLabelsFromRooms, withCurrentRooms } from "./active-rooms";

function emptyRoom(room: HqActivityRoomId): RoomActivitySlice {
  return {
    room,
    roomLabel: ACTIVITY_ROOM_LABELS[room],
    status: "EMPTY",
    summary: null,
    allowAmbientMotion: false,
    latestEventId: null,
  };
}

export function missionOpenStatus(events: MissionActivityEvent[]): CanonicalActivityStatus {
  const latest = events[events.length - 1];
  if (!latest) return "EMPTY";
  if (latest.eventType === "MISSION_COMPLETED") return "PRESENT_IDLE";
  if (latest.eventType === "MISSION_FAILED" || latest.eventType.endsWith("_FAILED")) return "FAILED";
  if (latest.eventType === "MISSION_BLOCKED") return "READY_BLOCKED";
  if (latest.eventType === "MISSION_WAITING") {
    return latest.status === "WAITING_INTERNAL" ? "WAITING_INTERNAL" : "WAITING_EXTERNAL";
  }
  const finished = new Set(
    events
      .filter((event) => event.eventType === "STEP_COMPLETED" || event.eventType === "STEP_FAILED")
      .map((event) => event.stepType),
  );
  const started = events.filter((event) => event.eventType === "STEP_STARTED").map((event) => event.stepType);
  const openStep = [...started].reverse().find((step) => !finished.has(step));
  if (openStep) return "ACTIVE_WORK";
  if (latest.status === "ACTIVE_WORK") return latest.status;
  return latest.status;
}

function idleNowInspecting(
  latestCompleted: CommandActivityView["latestCompleted"],
): CommandNowInspecting {
  return {
    currentMission: null,
    currentPhase: null,
    currentStep: null,
    currentRoom: null,
    currentRooms: [],
    currentWorker: null,
    currentTask: null,
    status: latestCompleted ? "PRESENT_IDLE" : "EMPTY",
    why: null,
    startedAt: null,
    lastActivity: latestCompleted?.summary ?? null,
    lastActivityAt: latestCompleted?.completedAt ?? null,
    nextExpectedStep: null,
    blocker: null,
    authorizationRequired: null,
  };
}

function nowInspectingFromMission(
  mission: RankedExecutionMission,
  knownSteps: string[],
): CommandNowInspecting {
  const latest = mission.events[mission.events.length - 1] ?? null;
  const currentStepEvent = [...mission.events].reverse().find((event) =>
    event.eventType === "STEP_STARTED" || event.eventType === "STEP_PROGRESS",
  );
  const currentStep = currentStepEvent?.stepType ?? latest?.stepType ?? null;
  const blockerEvent = [...mission.events].reverse().find((event) => event.blocker);
  const authEvent = [...mission.events].reverse().find((event) => event.authorizationRequired);
  return {
    currentMission: mission.missionType,
    currentPhase: latest ? ACTIVITY_ROOM_LABELS[latest.room] : null,
    currentStep,
    currentRoom: latest ? ACTIVITY_ROOM_LABELS[latest.room] : null,
    currentRooms: [],
    currentWorker: currentStep && latest ? workerRoleForStep(currentStep, latest.engine) : null,
    currentTask:
      mission.status === "READY_BLOCKED"
        ? blockerEvent?.summary ?? latest?.summary ?? (currentStepEvent ? workerTaskForEvent(currentStepEvent) : null)
        : currentStepEvent
          ? workerTaskForEvent(currentStepEvent)
          : latest?.summary ?? null,
    status: mission.status,
    why: currentStep && latest ? whyForStep(currentStep, latest.missionType) : null,
    startedAt: mission.startedAt,
    lastActivity: latest?.summary ?? null,
    lastActivityAt: mission.lastActivityAt,
    nextExpectedStep: nextExpectedStep(currentStep, knownSteps),
    blocker: mission.status === "READY_BLOCKED" ? blockerEvent?.blocker ?? latest?.blocker ?? null : null,
    authorizationRequired:
      mission.status === "READY_BLOCKED" ? authEvent?.authorizationRequired ?? latest?.authorizationRequired ?? null : null,
  };
}

function paintConcurrentOpenSteps(
  rooms: Record<DepartmentId, RoomActivitySlice>,
  liveMissions: RankedExecutionMission[],
): void {
  for (const mission of liveMissions) {
    if (mission.status !== "ACTIVE_WORK") continue;
    const completed = new Set(
      mission.events.filter((event) => event.eventType === "STEP_COMPLETED").map((event) => event.stepType),
    );
    const open = mission.events.filter(
      (event) => event.eventType === "STEP_STARTED" && !completed.has(event.stepType),
    );
    for (const event of open) {
      const room = event.room || roomForStep(event.stepType, event.engine);
      rooms[asDepartmentId(room)] = {
        room,
        roomLabel: ACTIVITY_ROOM_LABELS[room],
        status: "ACTIVE_WORK",
        summary: event.summary,
        allowAmbientMotion: true,
        latestEventId: event.eventId,
      };
    }
    const validationOpen = open.some(
      (event) =>
        event.stepType === "PUBLIC_ARTIFACT_QUALITY_GATE" ||
        event.stepType === "QUALITY_REVIEW" ||
        event.stepType === "PAGE_VALIDATE" ||
        event.stepType === "FULL_ROUTE_FROZEN_ARTIFACT_VALIDATION",
    );
    if (completed.has("CREATE_DEPLOYMENT") && validationOpen) {
      rooms[asDepartmentId("launch_operations")] = {
        ...rooms[asDepartmentId("launch_operations")],
        room: "launch_operations",
        roomLabel: ACTIVITY_ROOM_LABELS.launch_operations,
        status: "ACTIVE_WORK",
        summary: rooms[asDepartmentId("launch_operations")].summary ?? "Provider deployment exists; live validation is running",
        allowAmbientMotion: true,
      };
      rooms[asDepartmentId("quality_control")] = {
        ...rooms[asDepartmentId("quality_control")],
        room: "quality_control",
        roomLabel: ACTIVITY_ROOM_LABELS.quality_control,
        status: "ACTIVE_WORK",
        summary: rooms[asDepartmentId("quality_control")].summary ?? "Validating the public artifact",
        allowAmbientMotion: true,
      };
    }
  }
}

function paintRoomsFromLiveMissions(
  rooms: Record<DepartmentId, RoomActivitySlice>,
  liveMissions: RankedExecutionMission[],
): void {
  const byMission = new Map(liveMissions.map((mission) => [mission.missionId, mission.events]));
  const events = liveMissions.flatMap((mission) => mission.events);
  for (const room of HQ_ACTIVITY_ROOMS) {
    const roomEvents = events.filter((event) => event.room === room);
    const latest = roomEvents[roomEvents.length - 1];
    if (!latest) continue;
    const missionEvents = byMission.get(latest.missionId) ?? [];
    const missionStatus = missionOpenStatus(missionEvents);
    const visual = roomVisualState(
      missionStatus === "PRESENT_IDLE"
        ? "PRESENT_IDLE"
        : latest.status === "ACTIVE_WORK" && missionStatus === "ACTIVE_WORK"
          ? "ACTIVE_WORK"
          : missionStatus,
    );
    const closed = new Set(
      roomEvents
        .filter((event) => event.eventType === "STEP_COMPLETED" || event.eventType === "STEP_FAILED")
        .map((event) => event.stepType),
    );
    const openActive =
      missionStatus === "ACTIVE_WORK" &&
      roomEvents.some((event) => event.eventType === "STEP_STARTED" && !closed.has(event.stepType));
    const status: CanonicalActivityStatus =
      latest.eventType.endsWith("_FAILED") || missionStatus === "FAILED"
        ? "FAILED"
        : openActive
          ? "ACTIVE_WORK"
          : missionStatus === "PRESENT_IDLE"
            ? "PRESENT_IDLE"
            : missionStatus === "READY_BLOCKED" ||
                missionStatus === "WAITING_EXTERNAL" ||
                missionStatus === "WAITING_INTERNAL"
              ? missionStatus
              : latest.eventType.endsWith("_COMPLETED")
                ? "PRESENT_IDLE"
                : latest.status;
    rooms[asDepartmentId(room)] = {
      room,
      roomLabel: ACTIVITY_ROOM_LABELS[room],
      status,
      summary: latest.summary,
      allowAmbientMotion: visual.allowAmbientMotion && status === "ACTIVE_WORK",
      latestEventId: latest.eventId,
    };
  }
}

function paintRoomsFromTerminal(
  rooms: Record<DepartmentId, RoomActivitySlice>,
  terminal: RankedExecutionMission,
): void {
  const used = new Set(terminal.events.map((event) => event.room));
  const status: CanonicalActivityStatus = terminal.status === "FAILED" ? "FAILED" : "PRESENT_IDLE";
  for (const room of used) {
    const latest = [...terminal.events].reverse().find((event) => event.room === room);
    rooms[asDepartmentId(room)] = {
      room,
      roomLabel: ACTIVITY_ROOM_LABELS[room],
      status,
      summary: null,
      allowAmbientMotion: false,
      latestEventId: latest?.eventId ?? null,
    };
  }
}

export function projectCommandActivity(filter?: {
  organizationId?: string;
  ventureId?: string | null;
  selectedVentureId?: string | null;
  includeSynthetic?: boolean;
  knownSteps?: string[];
  executionClass?: import("./constants").ActivityExecutionClass;
}): CommandActivityView {
  if (!(process.env.VITEST && process.env.INFINITY_CANONICAL_WORK_PERSIST !== "1")) {
    ensureOccupancyNpvCanonicalWork();
  }
  const listed = listMissionActivityEvents(filter);
  const events = listed.filter((event) => event.executionClass !== "SYSTEM_DEVELOPMENT");
  const rooms = Object.fromEntries(HQ_ACTIVITY_ROOMS.map((room) => [room, emptyRoom(room)])) as Record<
    DepartmentId,
    RoomActivitySlice
  >;

  const byMission = new Map<string, MissionActivityEvent[]>();
  for (const event of events) {
    const list = byMission.get(event.missionId) ?? [];
    list.push(event);
    byMission.set(event.missionId, list);
  }

  const ranked = rankMissionsFromGroups(byMission, missionOpenStatus);
  const currentExecution = selectCurrentExecutionMission(ranked);
  const latestTerminal = selectLatestTerminalMission(ranked);
  const liveMissions = ranked.filter(
    (item) => item.rank === "ACTIVE" || item.rank === "WAITING" || item.rank === "BLOCKED",
  );

  let activeMissions = 0;
  let blockedMissions = 0;
  let waitingMissions = 0;
  let authorizationRequired = 0;
  for (const mission of ranked) {
    if (isActiveWorkStatus(mission.status)) activeMissions += 1;
    if (isBlockedStatus(mission.status) && mission.status === "READY_BLOCKED") blockedMissions += 1;
    if (isWaitingStatus(mission.status)) waitingMissions += 1;
    if (
      (mission.rank === "BLOCKED" || mission.rank === "WAITING" || mission.rank === "ACTIVE") &&
      mission.events.some((event) => event.authorizationRequired)
    ) {
      authorizationRequired += 1;
    }
  }

  const terminalEvent = latestTerminal
    ? [...latestTerminal.events]
        .reverse()
        .find((event) => event.eventType === "MISSION_COMPLETED" || event.eventType === "MISSION_FAILED") ??
      latestTerminal.events[latestTerminal.events.length - 1]
    : null;
  const latestCompleted: CommandActivityView["latestCompleted"] = latestTerminal
    ? {
        summary: terminalEvent?.summary ?? latestTerminal.missionType,
        completedAt: latestTerminal.completedAt ?? latestTerminal.lastActivityAt,
        missionType: latestTerminal.missionType,
        missionId: latestTerminal.missionId,
        outcome: deriveTerminalOutcome(latestTerminal),
      }
    : null;

  if (liveMissions.length) {
    paintRoomsFromLiveMissions(rooms, liveMissions);
    paintConcurrentOpenSteps(rooms, liveMissions);
  } else if (latestTerminal) {
    paintRoomsFromTerminal(rooms, latestTerminal);
  }

  const commandMissionStatus = currentExecution?.status ?? null;
  if (commandMissionStatus === "ACTIVE_WORK") {
    const commandDept = asDepartmentId("executive_office");
    rooms[commandDept] = {
      ...rooms[commandDept],
      status: "ACTIVE_WORK",
      summary: rooms[commandDept].summary ?? "Orchestrating the current venture mission",
      allowAmbientMotion: true,
    };
  } else if (
    commandMissionStatus === "READY_BLOCKED" ||
    commandMissionStatus === "WAITING_EXTERNAL" ||
    commandMissionStatus === "WAITING_INTERNAL"
  ) {
    const commandDept = asDepartmentId("executive_office");
    if (rooms[commandDept].status === "EMPTY" || rooms[commandDept].status === "PRESENT_IDLE") {
      rooms[commandDept] = {
        ...rooms[commandDept],
        status: commandMissionStatus,
        allowAmbientMotion: false,
      };
    }
  }

  const focus = currentExecution ?? latestTerminal;
  const focusEvents = focus?.events ?? [];
  const latest = focusEvents[focusEvents.length - 1] ?? null;
  const knownSteps =
    filter?.knownSteps ??
    [...new Set(focusEvents.filter((event) => event.stepType && event.eventType.startsWith("STEP_")).map((event) => event.stepType))];
  const startedAt = focus?.startedAt ?? latest?.startedAt ?? null;
  const durationMs =
    latest && startedAt ? Math.max(0, Date.parse(latest.observedAt) - Date.parse(startedAt)) : null;
  const nowInspecting = currentExecution
    ? nowInspectingFromMission(currentExecution, knownSteps)
    : idleNowInspecting(latestCompleted);

  const workerSource = ranked.filter(
    (mission) => mission.rank !== "TERMINAL" || mission.status === "FAILED",
  );
  const activeWorkers = projectActiveWorkers(
    new Map(workerSource.map((mission) => [mission.missionId, mission.events])),
    knownStepsForWorkers(byMission, filter?.knownSteps),
  );

  const view: CommandActivityView = {
    generatedAt: new Date().toISOString(),
    counts: {
      activeMissions,
      blockedMissions,
      waitingMissions,
      authorizationRequired,
    },
    rooms,
    nowInspecting,
    systemView: {
      missionId: currentExecution?.missionId ?? latest?.missionId ?? null,
      engine: latest?.engine ?? null,
      step: nowInspecting.currentStep ?? latest?.stepType ?? null,
      workerOrProvider: latest?.traceability.workerId ?? latest?.traceability.provider ?? null,
      artifactId: latest?.traceability.artifactId ?? null,
      deploymentId: latest?.traceability.deploymentId ?? null,
      experimentId: latest?.experimentId ?? null,
      traceId: latest?.traceability.traceId ?? latest?.traceability.correlationId ?? null,
      startedAt,
      durationMs,
      latestEvent: latest?.eventType ?? null,
      failureCode: latest?.failureCode ?? null,
      costState: latest?.costState ?? null,
    },
    latestCompleted,
    recentEvents: events.slice(-20),
    activeWorkers,
    executionClass: listed[listed.length - 1]?.executionClass ?? latest?.executionClass ?? "VENTURE_EXECUTION",
  };
  return mergeCanonicalWorkIntoCommandActivity(
    withCurrentRooms({
      ...view,
      nowInspecting: {
        ...view.nowInspecting,
        currentRooms: activeRoomLabelsFromRooms(rooms),
      },
    }),
    filter?.selectedVentureId ?? filter?.ventureId,
  );
}

function knownStepsForWorkers(byMission: Map<string, MissionActivityEvent[]>, known?: string[]): string[] {
  if (known?.length) return known;
  const steps = new Set<string>();
  for (const missionEvents of byMission.values()) {
    for (const event of missionEvents) {
      if (event.stepType) steps.add(event.stepType);
    }
  }
  return [...steps];
}

function projectActiveWorkers(
  byMission: Map<string, MissionActivityEvent[]>,
  knownSteps: string[],
): ActiveWorkerProjection[] {
  const workers: ActiveWorkerProjection[] = [];
  for (const missionEvents of byMission.values()) {
    const status = missionOpenStatus(missionEvents);
    const finished = new Set(
      missionEvents.filter((event) => event.eventType === "STEP_COMPLETED").map((event) => event.stepType),
    );
    const failed = new Set(
      missionEvents.filter((event) => event.eventType === "STEP_FAILED").map((event) => event.stepType),
    );
    const started = missionEvents.filter((event) => event.eventType === "STEP_STARTED");
    for (const event of started) {
      if (finished.has(event.stepType)) continue;
      const workerStatus: CanonicalActivityStatus = failed.has(event.stepType)
        ? "FAILED"
        : status === "READY_BLOCKED"
          ? "READY_BLOCKED"
          : status === "WAITING_EXTERNAL" || status === "WAITING_INTERNAL"
            ? status
            : status === "ACTIVE_WORK"
              ? "ACTIVE_WORK"
              : event.status;
      if (status === "PRESENT_IDLE" || status === "COMPLETED") continue;
      if (missionEvents[missionEvents.length - 1]?.eventType === "MISSION_FAILED") continue;
      workers.push({
        workerExecutionId: event.eventId,
        missionId: event.missionId,
        stepId: event.stepId,
        stepType: event.stepType,
        ventureId: event.ventureId,
        role: workerRoleForStep(event.stepType, event.engine),
        room: workerRoomForEvent(event),
        task: workerTaskForEvent(event),
        status: workerStatus,
        startedAt: event.startedAt,
        lastActivityAt: event.observedAt,
        provider: event.traceability.provider ?? null,
        blocker: event.blocker,
        next: workerNextForStep(event.stepType, knownSteps),
      });
    }
    if (status === "ACTIVE_WORK" && !workers.some((worker) => worker.missionId === missionEvents[0]?.missionId && worker.role === "Command")) {
      const latest = missionEvents[missionEvents.length - 1];
      if (latest) {
        workers.push({
          workerExecutionId: `${latest.missionId}:command`,
          missionId: latest.missionId,
          stepId: latest.stepId,
          stepType: latest.stepType,
          ventureId: latest.ventureId,
          role: "Command",
          room: "executive_office",
          task: "Orchestrating the current venture mission",
          status: "ACTIVE_WORK",
          startedAt: missionEvents.find((event) => event.eventType === "MISSION_STARTED")?.startedAt ?? latest.startedAt,
          lastActivityAt: latest.observedAt,
          provider: null,
          blocker: latest.blocker,
          next: workerNextForStep(latest.stepType, knownSteps),
        });
      }
    }
  }
  return workers;
}

export function emptyCommandActivityView(): CommandActivityView {
  return projectCommandActivity({ organizationId: "__none__" });
}

export { isLiveExecutionStatus };
