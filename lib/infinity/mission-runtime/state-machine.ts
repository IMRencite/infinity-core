import {
  NON_ADVANCING_RUNTIME_STATUSES,
  MISSION_RUNTIME_STAGES_V2,
  type MissionRuntimeStage,
  type MissionRuntimeStatus,
} from "./constants";
import { MissionRuntimeStateError } from "./errors";
import {
  assertStageTransitionAllowed as assertGraphStageTransition,
  nextStageAfter as graphNextStageAfter,
} from "./transition-graph";

export { MissionRuntimeStateError } from "./errors";

const STAGE_INDEX = new Map<MissionRuntimeStage, number>(
  MISSION_RUNTIME_STAGES_V2.map((stage, index) => [stage, index]),
);

export function isValidMissionRuntimeStatus(status: string): status is MissionRuntimeStatus {
  return (
    status === "draft" ||
    status === "ready" ||
    status === "running" ||
    status === "waiting" ||
    status === "blocked" ||
    status === "paused" ||
    status === "completed" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "archived"
  );
}

export function isValidMissionRuntimeStage(stage: string): stage is MissionRuntimeStage {
  return STAGE_INDEX.has(stage as MissionRuntimeStage);
}

export function nextStageAfter(
  current: MissionRuntimeStage,
  runtimeVersion?: string,
): MissionRuntimeStage | null {
  return graphNextStageAfter(current, runtimeVersion);
}

export function assertStageTransitionAllowed(
  from: MissionRuntimeStage,
  to: MissionRuntimeStage,
  runtimeVersion?: string,
): void {
  assertGraphStageTransition(from, to, runtimeVersion);
}

export function assertStatusTransitionAllowed(
  from: MissionRuntimeStatus,
  to: MissionRuntimeStatus,
): void {
  if (from === to) {
    return;
  }

  const allowed: Record<MissionRuntimeStatus, MissionRuntimeStatus[]> = {
    draft: ["ready", "cancelled", "archived"],
    ready: ["running", "cancelled", "archived"],
    running: ["waiting", "blocked", "paused", "completed", "failed", "cancelled"],
    waiting: ["running", "blocked", "paused", "failed", "cancelled", "completed"],
    blocked: ["running", "waiting", "paused", "failed", "cancelled"],
    paused: ["running", "waiting", "cancelled"],
    completed: ["archived"],
    failed: ["archived", "ready"],
    cancelled: ["archived"],
    archived: [],
  };

  if (!allowed[from]?.includes(to)) {
    throw new MissionRuntimeStateError(`Invalid status transition ${from} -> ${to}.`);
  }
}

export function canAdvanceRuntime(status: MissionRuntimeStatus): boolean {
  return !NON_ADVANCING_RUNTIME_STATUSES.includes(status);
}

export function statusForStageOutcome(
  outcomeKind: "advance" | "wait" | "block" | "fail" | "complete",
): MissionRuntimeStatus {
  switch (outcomeKind) {
    case "wait":
      return "waiting";
    case "block":
      return "blocked";
    case "fail":
      return "failed";
    case "complete":
      return "completed";
    default:
      return "running";
  }
}
