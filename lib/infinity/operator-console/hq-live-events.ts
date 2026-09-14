import { EventEmitter } from "node:events";

export const HQ_RUNTIME_EVENT_TYPES = [
  "HEARTBEAT",
  "HQ_SNAPSHOT_INVALIDATED",
  "MISSION_STARTED",
  "MISSION_PROGRESS",
  "MISSION_COMPLETED",
  "MISSION_FAILED",
  "WORKER_STATE_CHANGED",
  "ROOM_STATE_CHANGED",
  "VENTURE_STATE_CHANGED",
  "QC_STARTED",
  "QC_PASSED",
  "QC_FAILED",
  "DEPLOYMENT_STARTED",
  "DEPLOYMENT_COMPLETED",
  "DEPLOYMENT_FAILED",
  "CUSTOMER_FEEDBACK_RECEIVED",
  "GROWTH_STATE_CHANGED",
  "FINANCIAL_BALANCE_UPDATED",
  "FINANCIAL_RECONCILIATION_CHANGED",
] as const;

export type HqRuntimeEventType = (typeof HQ_RUNTIME_EVENT_TYPES)[number];

export type HqRuntimeEvent = {
  type: HqRuntimeEventType;
  at: string;
  ventureId?: string | null;
  missionId?: string | null;
  room?: string | null;
  reason?: string | null;
};

const CHANNEL = "hq-runtime";
const bus = new EventEmitter();
bus.setMaxListeners(50);

export function publishHqRuntimeEvent(event: HqRuntimeEvent): void {
  bus.emit(CHANNEL, event);
}

export function subscribeHqRuntimeEvents(listener: (event: HqRuntimeEvent) => void): () => void {
  bus.on(CHANNEL, listener);
  return () => {
    bus.off(CHANNEL, listener);
  };
}

export function hqRuntimeListenerCount(): number {
  return bus.listenerCount(CHANNEL);
}

export function resetHqRuntimeEventsForTests(): void {
  bus.removeAllListeners(CHANNEL);
}

const QC_ROOMS = new Set(["quality_control"]);
const DEPLOY_ROOMS = new Set(["launch_operations"]);
const GROWTH_ROOMS = new Set(["growth_department"]);

export function hqEventsFromMissionActivity(input: {
  eventType: string;
  ventureId?: string | null;
  missionId?: string | null;
  room?: string | null;
  observedAt?: string | null;
}): HqRuntimeEvent[] {
  const at = input.observedAt ?? new Date().toISOString();
  const base = {
    at,
    ventureId: input.ventureId ?? null,
    missionId: input.missionId ?? null,
    room: input.room ?? null,
  };
  const events: HqRuntimeEvent[] = [];
  const kind = input.eventType;
  const room = input.room ?? "";

  if (kind === "MISSION_STARTED") events.push({ ...base, type: "MISSION_STARTED" });
  else if (kind === "MISSION_COMPLETED") events.push({ ...base, type: "MISSION_COMPLETED" });
  else if (kind === "MISSION_FAILED") events.push({ ...base, type: "MISSION_FAILED" });
  else if (kind === "STEP_PROGRESS" || kind === "MISSION_WAITING" || kind === "MISSION_BLOCKED") {
    events.push({ ...base, type: "MISSION_PROGRESS" });
  }

  if (kind === "STEP_STARTED" || kind === "STEP_COMPLETED" || kind === "STEP_FAILED" || kind === "STEP_PROGRESS") {
    events.push({ ...base, type: "WORKER_STATE_CHANGED" });
    events.push({ ...base, type: "ROOM_STATE_CHANGED" });
  }

  if (QC_ROOMS.has(room)) {
    if (kind === "STEP_STARTED") events.push({ ...base, type: "QC_STARTED" });
    if (kind === "STEP_COMPLETED") events.push({ ...base, type: "QC_PASSED" });
    if (kind === "STEP_FAILED") events.push({ ...base, type: "QC_FAILED" });
  }

  if (DEPLOY_ROOMS.has(room)) {
    if (kind === "STEP_STARTED" || kind === "EXTERNAL_ACTION_STARTED") {
      events.push({ ...base, type: "DEPLOYMENT_STARTED" });
    }
    if (kind === "STEP_COMPLETED" || kind === "EXTERNAL_ACTION_COMPLETED") {
      events.push({ ...base, type: "DEPLOYMENT_COMPLETED" });
    }
    if (kind === "STEP_FAILED" || kind === "EXTERNAL_ACTION_FAILED") {
      events.push({ ...base, type: "DEPLOYMENT_FAILED" });
    }
  }

  if (GROWTH_ROOMS.has(room) && (kind === "STEP_STARTED" || kind === "STEP_COMPLETED" || kind === "STEP_FAILED")) {
    events.push({ ...base, type: "GROWTH_STATE_CHANGED" });
  }

  if (events.length === 0) {
    events.push({ ...base, type: "HQ_SNAPSHOT_INVALIDATED", reason: kind });
  }

  return events;
}

export function publishHqRuntimeEventFromMission(input: {
  eventType: string;
  ventureId?: string | null;
  missionId?: string | null;
  room?: string | null;
  observedAt?: string | null;
}): void {
  if (hqRuntimeListenerCount() === 0) return;
  for (const event of hqEventsFromMissionActivity(input)) {
    publishHqRuntimeEvent(event);
  }
}

export function isMaterialHqRuntimeEvent(event: Pick<HqRuntimeEvent, "type">): boolean {
  return event.type !== "HEARTBEAT";
}
