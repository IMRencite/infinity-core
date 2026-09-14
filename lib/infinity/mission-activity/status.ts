import type { CanonicalActivityStatus, MissionActivityEventType } from "./constants";

const BLOCKED_STATUSES: CanonicalActivityStatus[] = ["READY_BLOCKED", "FAILED"];
const WAITING_STATUSES: CanonicalActivityStatus[] = ["WAITING_EXTERNAL", "WAITING_INTERNAL"];

export function statusFromEventType(eventType: MissionActivityEventType): CanonicalActivityStatus {
  switch (eventType) {
    case "MISSION_CREATED":
    case "STEP_QUEUED":
      return "QUEUED";
    case "MISSION_STARTED":
    case "STEP_STARTED":
    case "STEP_PROGRESS":
    case "EXTERNAL_ACTION_STARTED":
      return "ACTIVE_WORK";
    case "MISSION_WAITING":
    case "EXTERNAL_ACTION_WAITING":
      return "WAITING_EXTERNAL";
    case "MISSION_BLOCKED":
      return "READY_BLOCKED";
    case "MISSION_COMPLETED":
    case "STEP_COMPLETED":
    case "EXTERNAL_ACTION_COMPLETED":
    case "EVIDENCE_RECEIVED":
      return "COMPLETED";
    case "MISSION_FAILED":
    case "STEP_FAILED":
    case "EXTERNAL_ACTION_FAILED":
      return "FAILED";
    default:
      return "EMPTY";
  }
}

export function isActiveWorkStatus(status: CanonicalActivityStatus): boolean {
  return status === "ACTIVE_WORK";
}

export function isBlockedStatus(status: CanonicalActivityStatus): boolean {
  return BLOCKED_STATUSES.includes(status);
}

export function isWaitingStatus(status: CanonicalActivityStatus): boolean {
  return WAITING_STATUSES.includes(status);
}

export function isLiveExecutionStatus(status: CanonicalActivityStatus | null | undefined): boolean {
  return (
    status === "ACTIVE_WORK" ||
    status === "WAITING_EXTERNAL" ||
    status === "WAITING_INTERNAL" ||
    status === "READY_BLOCKED"
  );
}

export function roomVisualState(status: CanonicalActivityStatus): {
  presence: "ACTIVE_WORK" | "PRESENT_IDLE" | "BLOCKED" | "EMPTY" | "WAITING" | "FAILED";
  allowAmbientMotion: boolean;
} {
  if (status === "ACTIVE_WORK") return { presence: "ACTIVE_WORK", allowAmbientMotion: true };
  if (status === "QUEUED") return { presence: "PRESENT_IDLE", allowAmbientMotion: false };
  if (status === "WAITING_EXTERNAL" || status === "WAITING_INTERNAL") {
    return { presence: "WAITING", allowAmbientMotion: false };
  }
  if (status === "READY_BLOCKED") return { presence: "BLOCKED", allowAmbientMotion: false };
  if (status === "FAILED") return { presence: "FAILED", allowAmbientMotion: false };
  if (status === "EMPTY") return { presence: "EMPTY", allowAmbientMotion: false };
  return { presence: "PRESENT_IDLE", allowAmbientMotion: false };
}

export function groundedPercent(completed: number, total: number): number | null {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) return null;
  return Math.round((Math.max(0, completed) / total) * 100);
}
