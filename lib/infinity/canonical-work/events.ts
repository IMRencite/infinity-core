import { publishHqRuntimeEvent, type HqRuntimeEventType } from "@/lib/infinity/operator-console/hq-live-events";
import type { CanonicalWorkExecutionContract, CanonicalWorkStatus } from "./types";

export const CANONICAL_WORK_TRANSITION_EVENTS = [
  "WORK_STARTED",
  "WORK_UPDATED",
  "PHASE_CHANGED",
  "TASK_CHANGED",
  "ROOM_ASSIGNMENT_CHANGED",
  "WORKER_STATE_CHANGED",
  "OUTPUT_RECORDED",
  "WORK_COMPLETED",
  "WORK_FAILED",
  "WORK_BLOCKED",
  "WORK_SUPERSEDED",
] as const;

export type CanonicalWorkTransitionEvent = (typeof CANONICAL_WORK_TRANSITION_EVENTS)[number];

const TO_HQ: Record<CanonicalWorkTransitionEvent, HqRuntimeEventType> = {
  WORK_STARTED: "MISSION_STARTED",
  WORK_UPDATED: "MISSION_PROGRESS",
  PHASE_CHANGED: "MISSION_PROGRESS",
  TASK_CHANGED: "MISSION_PROGRESS",
  ROOM_ASSIGNMENT_CHANGED: "ROOM_STATE_CHANGED",
  WORKER_STATE_CHANGED: "WORKER_STATE_CHANGED",
  OUTPUT_RECORDED: "MISSION_PROGRESS",
  WORK_COMPLETED: "MISSION_COMPLETED",
  WORK_FAILED: "MISSION_FAILED",
  WORK_BLOCKED: "MISSION_PROGRESS",
  WORK_SUPERSEDED: "HQ_SNAPSHOT_INVALIDATED",
};

function transitionsBetween(
  previous: CanonicalWorkExecutionContract | null | undefined,
  next: CanonicalWorkExecutionContract,
): CanonicalWorkTransitionEvent[] {
  if (!previous) return next.status === "ACTIVE" ? ["WORK_STARTED"] : ["WORK_UPDATED"];
  const events: CanonicalWorkTransitionEvent[] = [];
  if (previous.status !== next.status) {
    if (next.status === "ACTIVE" && previous.status !== "ACTIVE") events.push("WORK_STARTED");
    if (next.status === "COMPLETED") events.push("WORK_COMPLETED");
    if (next.status === "FAILED") events.push("WORK_FAILED");
    if (next.status === "BLOCKED") events.push("WORK_BLOCKED");
    if (next.status === "SUPERSEDED" || next.status === "STALE") events.push("WORK_SUPERSEDED");
  }
  if (previous.stage !== next.stage) events.push("PHASE_CHANGED");
  if (previous.description !== next.description || previous.progress !== next.progress) {
    events.push("TASK_CHANGED");
  }
  if (previous.assigned_rooms.join("|") !== next.assigned_rooms.join("|")) {
    events.push("ROOM_ASSIGNMENT_CHANGED");
  }
  if (previous.assigned_workers.join("|") !== next.assigned_workers.join("|")) {
    events.push("WORKER_STATE_CHANGED");
  }
  if (previous.latest_output !== next.latest_output) events.push("OUTPUT_RECORDED");
  if (events.length === 0) events.push("WORK_UPDATED");
  return events;
}

export function publishCanonicalWorkTransitions(
  previous: CanonicalWorkExecutionContract | null | undefined,
  next: CanonicalWorkExecutionContract,
): CanonicalWorkTransitionEvent[] {
  const events = transitionsBetween(previous, next);
  const at = next.updated_at;
  for (const event of events) {
    publishHqRuntimeEvent({
      type: TO_HQ[event],
      at,
      ventureId: next.venture_id,
      missionId: next.mission_id,
      reason: event,
    });
  }
  publishHqRuntimeEvent({
    type: "HQ_SNAPSHOT_INVALIDATED",
    at,
    ventureId: next.venture_id,
    missionId: next.mission_id,
    reason: events[0] ?? "WORK_UPDATED",
  });
  return events;
}

export function statusRequiresCompletedAt(status: CanonicalWorkStatus): boolean {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELLED" || status === "SUPERSEDED";
}
