import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import {
  ACTIVITY_ENGINE_ROOM,
  ACTIVITY_ROOM_LABELS,
  HQ_ACTIVITY_ROOMS,
  STEP_ROOM,
  type HqActivityRoomId,
} from "./constants";

export function roomForEngine(engine: string): HqActivityRoomId {
  return ACTIVITY_ENGINE_ROOM[engine] ?? "executive_office";
}

export function roomForStep(stepType: string, engine: string): HqActivityRoomId {
  return STEP_ROOM[stepType] ?? roomForEngine(engine);
}

export function roomLabel(room: HqActivityRoomId): string {
  return ACTIVITY_ROOM_LABELS[room];
}

export function allActivityRooms(): HqActivityRoomId[] {
  return [...HQ_ACTIVITY_ROOMS];
}

export function asDepartmentId(room: HqActivityRoomId): DepartmentId {
  return room;
}
