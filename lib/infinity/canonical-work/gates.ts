import { ROOM_ACTIVITY_IDLE } from "@/lib/infinity/operator-console/room-activity";
import type { CanonicalWorkExecutionContract } from "./types";
import {
  ACTIVE_WORK_HQ_VISIBILITY_GATE,
  ACTIVE_WORKER_PROJECTION_GATE,
  HQ_COMMAND_ACTIVE_WORK_CONSISTENCY_GATE,
  HQ_LIVE_WORK_SURFACE_CONSISTENCY_GATE,
  OPERATING_FLOOR_CURRENT_MISSION_GATE,
  SELECTED_VENTURE_LATEST_WORK_GATE,
  VENTURE_ACTIVE_WORK_PROJECTION_GATE,
} from "./types";
import { commandLooksIdle } from "./project";

export type NamedWorkGate = { gate: string; result: "PASS" | "FAIL"; reasons: string[] };

export function evaluateActiveWorkHQVisibilityGate(input: {
  work: CanonicalWorkExecutionContract | null;
  command_sentence: string | null;
  operations_sentence: string | null;
  rooms_exposing: string[];
}): NamedWorkGate {
  if (!input.work || input.work.status !== "ACTIVE") {
    return { gate: ACTIVE_WORK_HQ_VISIBILITY_GATE, result: "PASS", reasons: ["NO_ACTIVE_CANONICAL_WORK"] };
  }
  const reasons: string[] = [];
  if (commandLooksIdle(input.command_sentence)) reasons.push("COMMAND_HIDES_ACTIVE_WORK");
  if (commandLooksIdle(input.operations_sentence) || !input.operations_sentence) reasons.push("OPERATIONS_HIDES_ACTIVE_WORK");
  const assigned = input.work.assigned_rooms.filter((room) => room !== "executive_office");
  if (assigned.length > 0 && !assigned.some((room) => input.rooms_exposing.includes(room))) {
    reasons.push("NO_ASSIGNED_ROOM_EXPOSES_ACTIVE_WORK");
  }
  return {
    gate: ACTIVE_WORK_HQ_VISIBILITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateActiveWorkerProjectionGate(input: {
  work: CanonicalWorkExecutionContract | null;
  assigned_room_workers: Array<{ room: string; isActive: boolean; motionActive: boolean; status: string }>;
}): NamedWorkGate {
  if (!input.work || input.work.status !== "ACTIVE") {
    return { gate: ACTIVE_WORKER_PROJECTION_GATE, result: "PASS", reasons: ["NO_ACTIVE_CANONICAL_WORK"] };
  }
  const assigned = input.work.assigned_rooms.filter((room) => room !== "executive_office");
  if (assigned.length === 0) {
    return { gate: ACTIVE_WORKER_PROJECTION_GATE, result: "PASS", reasons: ["NO_ASSIGNED_FLOOR_ROOMS"] };
  }
  const missing = assigned.filter(
    (room) =>
      !input.assigned_room_workers.some(
        (row) => row.room === room && row.isActive && row.motionActive && row.status === "RUNNING",
      ),
  );
  if (missing.length > 0) {
    return {
      gate: ACTIVE_WORKER_PROJECTION_GATE,
      result: "FAIL",
      reasons: [`ACTIVE_WORK_ROOMS_WITHOUT_GLOWING_WORKERS:${missing.join(",")}`],
    };
  }
  return { gate: ACTIVE_WORKER_PROJECTION_GATE, result: "PASS", reasons: [] };
}

export function evaluateVentureActiveWorkProjectionGate(input: {
  venture_id: string;
  work: CanonicalWorkExecutionContract | null;
  venture_detail: {
    current_work: string | null;
    current_mission: string | null;
    current_stage: string | null;
    assigned_rooms: string | null;
    latest_output: string | null;
    traceability: string | null;
  };
}): NamedWorkGate {
  if (!input.work || input.work.venture_id !== input.venture_id) {
    return { gate: VENTURE_ACTIVE_WORK_PROJECTION_GATE, result: "PASS", reasons: ["NO_VENTURE_ACTIVE_WORK"] };
  }
  if (input.work.status !== "ACTIVE") {
    return { gate: VENTURE_ACTIVE_WORK_PROJECTION_GATE, result: "PASS", reasons: ["VENTURE_WORK_NOT_ACTIVE"] };
  }
  const reasons: string[] = [];
  if (!input.venture_detail.current_work) reasons.push("CURRENT_WORK_MISSING");
  if (!input.venture_detail.current_mission) reasons.push("CURRENT_MISSION_MISSING");
  if (!input.venture_detail.current_stage) reasons.push("CURRENT_STAGE_MISSING");
  if (!input.venture_detail.assigned_rooms) reasons.push("ASSIGNED_ROOMS_MISSING");
  if (!input.venture_detail.latest_output) reasons.push("LATEST_OUTPUT_MISSING");
  if (!input.venture_detail.traceability) reasons.push("TRACEABILITY_MISSING");
  return {
    gate: VENTURE_ACTIVE_WORK_PROJECTION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQCommandActiveWorkConsistencyGate(input: {
  work: CanonicalWorkExecutionContract | null;
  command_sentence: string | null;
  infinity_state: string;
}): NamedWorkGate {
  const reasons: string[] = [];
  if (input.work?.status === "ACTIVE" && commandLooksIdle(input.command_sentence)) {
    reasons.push("ACTIVE_WORK_BUT_COMMAND_IDLE_COPY");
  }
  if (!input.work || input.work.status !== "ACTIVE") {
    if (input.infinity_state === "ACTIVE") reasons.push("NO_ACTIVE_WORK_BUT_INFINITY_ACTIVE");
  }
  if (
    (input.work?.status === "COMPLETED" || input.work?.status === "SUPERSEDED")
    && input.command_sentence
    && !commandLooksIdle(input.command_sentence)
    && /ACTIVE/i.test(input.command_sentence)
    && input.infinity_state === "ACTIVE"
  ) {
    reasons.push("COMPLETED_WORK_SHOWN_ACTIVE");
  }
  if (input.work?.status === "ACTIVE" && input.command_sentence && /Global Page Depth QC/i.test(input.command_sentence) && input.work.title && !/Global Page Depth QC/i.test(input.work.title)) {
    reasons.push("COMMAND_SHOWS_STALE_PAGE_DEPTH_MISSION");
  }
  if (
    (!input.work || input.work.status !== "ACTIVE")
    && input.command_sentence
    && /Pricing Hero Enhancement/i.test(input.command_sentence)
    && !commandLooksIdle(input.command_sentence)
  ) {
    reasons.push("OLDER_PARKED_MISSION_SHOWN_AS_CURRENT");
  }
  if (input.work?.status === "BLOCKED" && input.infinity_state === "ACTIVE") {
    reasons.push("BLOCKED_WORK_SHOWN_ACTIVE");
  }
  return {
    gate: HQ_COMMAND_ACTIVE_WORK_CONSISTENCY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function screenshotFailureCaught(input: {
  work: CanonicalWorkExecutionContract;
  command_sentence: string;
  operations_sentence: string;
}): boolean {
  return (
    input.work.status === "ACTIVE"
    && (input.command_sentence === ROOM_ACTIVITY_IDLE || commandLooksIdle(input.command_sentence))
    && commandLooksIdle(input.operations_sentence)
    && evaluateActiveWorkHQVisibilityGate({
      work: input.work,
      command_sentence: input.command_sentence,
      operations_sentence: input.operations_sentence,
      rooms_exposing: [],
    }).result === "FAIL"
    && evaluateHQCommandActiveWorkConsistencyGate({
      work: input.work,
      command_sentence: input.command_sentence,
      infinity_state: "IDLE",
    }).result === "FAIL"
  );
}

export function evaluateOperatingFloorCurrentMissionGate(input: {
  command_work_id?: string | null;
  floor_work_id?: string | null;
  venture_work_id?: string | null;
  command_mission?: string | null;
  floor_mission?: string | null;
}): NamedWorkGate {
  const reasons: string[] = [];
  if ((input.command_work_id ?? null) !== (input.floor_work_id ?? null)) {
    reasons.push("COMMAND_FLOOR_WORK_ID_MISMATCH");
  }
  if (input.venture_work_id && input.command_work_id && input.venture_work_id !== input.command_work_id) {
    reasons.push("VENTURE_COMMAND_WORK_ID_MISMATCH");
  }
  if ((input.command_mission ?? null) !== (input.floor_mission ?? null)) {
    reasons.push("COMMAND_FLOOR_MISSION_MISMATCH");
  }
  return {
    gate: OPERATING_FLOOR_CURRENT_MISSION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateSelectedVentureLatestWorkGate(input: {
  command_work_id?: string | null;
  floor_work_id?: string | null;
  detail_work_id?: string | null;
  command_title?: string | null;
  floor_title?: string | null;
}): NamedWorkGate {
  const reasons: string[] = [];
  const ids = [input.command_work_id ?? null, input.floor_work_id ?? null, input.detail_work_id ?? null];
  const present = ids.filter((id) => id != null);
  if (present.length > 0 && present.length < ids.filter((id) => id !== undefined).length) {
    if (ids.some((id) => id == null) && ids.some((id) => id != null)) {
      reasons.push("SURFACE_LATEST_VENTURE_WORK_NONE_MISMATCH");
    }
  }
  if ((input.command_work_id ?? null) !== (input.floor_work_id ?? null)) {
    reasons.push("COMMAND_FLOOR_LATEST_VENTURE_WORK_ID_MISMATCH");
  }
  if (input.detail_work_id != null && input.command_work_id != null && input.detail_work_id !== input.command_work_id) {
    reasons.push("DETAIL_COMMAND_LATEST_VENTURE_WORK_ID_MISMATCH");
  }
  if ((input.command_title ?? null) !== (input.floor_title ?? null)) {
    reasons.push("COMMAND_FLOOR_LATEST_VENTURE_WORK_TITLE_MISMATCH");
  }
  return {
    gate: SELECTED_VENTURE_LATEST_WORK_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQLiveWorkSurfaceConsistencyGate(input: {
  command: { work_id?: string | null; venture_id?: string | null; status?: string | null; mission?: string | null; stage?: string | null; latest_venture_work_id?: string | null };
  floor: { work_id?: string | null; venture_id?: string | null; status?: string | null; mission?: string | null; stage?: string | null; latest_venture_work_id?: string | null };
  venture?: { work_id?: string | null; venture_id?: string | null; status?: string | null; mission?: string | null; stage?: string | null; latest_venture_work_id?: string | null };
  worker?: { work_id?: string | null; status?: string | null };
  room?: { work_id?: string | null; status?: string | null };
}): NamedWorkGate {
  const reasons: string[] = [];
  const surfaces = [input.command, input.floor, input.venture].filter(Boolean);
  const workIds = new Set(surfaces.map((row) => row?.work_id ?? null));
  if (workIds.size > 1) reasons.push("SURFACE_WORK_ID_MISMATCH");
  const statuses = new Set(surfaces.map((row) => row?.status ?? null));
  if (statuses.size > 1) reasons.push("SURFACE_STATUS_MISMATCH");
  const missions = new Set(surfaces.map((row) => row?.mission ?? null));
  if (missions.size > 1) reasons.push("SURFACE_MISSION_MISMATCH");
  const stages = new Set(surfaces.map((row) => row?.stage ?? null));
  if (stages.size > 1) reasons.push("SURFACE_STAGE_MISMATCH");
  if (input.worker?.work_id && input.command.work_id && input.worker.work_id !== input.command.work_id) {
    reasons.push("WORKER_WORK_ID_MISMATCH");
  }
  if (input.room?.work_id && input.command.work_id && input.room.work_id !== input.command.work_id) {
    reasons.push("ROOM_WORK_ID_MISMATCH");
  }
  const latestIds = [input.command.latest_venture_work_id ?? null, input.floor.latest_venture_work_id ?? null];
  if (input.venture) latestIds.push(input.venture.latest_venture_work_id ?? null);
  if (new Set(latestIds).size > 1) reasons.push("SURFACE_LATEST_VENTURE_WORK_ID_MISMATCH");
  return {
    gate: HQ_LIVE_WORK_SURFACE_CONSISTENCY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
