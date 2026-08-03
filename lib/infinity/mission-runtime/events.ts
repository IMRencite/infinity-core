import type { MissionRuntimeEventPayload } from "./types";

export type MissionRuntimeEventType =
  | "mission.runtime_started"
  | "mission.runtime_waiting"
  | "mission.runtime_blocked"
  | "mission.runtime_paused"
  | "mission.runtime_resumed"
  | "mission.runtime_cancelled"
  | "mission.runtime_failed"
  | "mission.runtime_recovered"
  | "mission.runtime_completed"
  | "mission.stage_started"
  | "mission.stage_completed"
  | "mission.stage_waiting"
  | "mission.stage_blocked"
  | "mission.checkpoint_created"
  | "mission.tick_completed";

export type MissionRuntimeEventRecord = {
  id: string;
  eventType: MissionRuntimeEventType;
  message: string;
  payload: MissionRuntimeEventPayload;
  occurredAt: string;
};

const events: MissionRuntimeEventRecord[] = [];

export function recordMissionRuntimeEvent(input: {
  eventType: MissionRuntimeEventType;
  message: string;
  payload: MissionRuntimeEventPayload;
}): MissionRuntimeEventRecord {
  const record: MissionRuntimeEventRecord = {
    id: crypto.randomUUID(),
    eventType: input.eventType,
    message: input.message,
    payload: input.payload,
    occurredAt: new Date().toISOString(),
  };

  events.push(record);
  return record;
}

export function listMissionRuntimeEvents(filter?: {
  runtimeInstanceId?: string;
  missionId?: string;
}): MissionRuntimeEventRecord[] {
  return events.filter((event) => {
    if (filter?.runtimeInstanceId && event.payload.runtimeInstanceId !== filter.runtimeInstanceId) {
      return false;
    }
    if (filter?.missionId && event.payload.missionId !== filter.missionId) {
      return false;
    }
    return true;
  });
}

export function clearMissionRuntimeEvents(): void {
  events.length = 0;
}

export function eventTypeForOutcome(
  outcome: "waiting" | "blocked" | "advanced" | "failed" | "completed",
): MissionRuntimeEventType {
  switch (outcome) {
    case "waiting":
      return "mission.runtime_waiting";
    case "blocked":
      return "mission.runtime_blocked";
    case "failed":
      return "mission.runtime_failed";
    case "completed":
      return "mission.runtime_completed";
    default:
      return "mission.stage_completed";
  }
}
