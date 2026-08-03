import {
  MISSION_RUNTIME_STAGES,
  NON_ADVANCING_RUNTIME_STATUSES,
  type MissionRuntimeStage,
  type MissionRuntimeStatus,
} from "./constants";

export class MissionRuntimeStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissionRuntimeStateError";
  }
}

const STAGE_INDEX = new Map<MissionRuntimeStage, number>(
  MISSION_RUNTIME_STAGES.map((stage, index) => [stage, index]),
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

export function nextStageAfter(current: MissionRuntimeStage): MissionRuntimeStage | null {
  const index = STAGE_INDEX.get(current);
  if (index === undefined || index >= MISSION_RUNTIME_STAGES.length - 1) {
    return null;
  }

  return MISSION_RUNTIME_STAGES[index + 1] ?? null;
}

export function assertStageTransitionAllowed(
  from: MissionRuntimeStage,
  to: MissionRuntimeStage,
): void {
  if (from === to) {
    return;
  }

  if (to === "completed" && from === "review") {
    return;
  }

  const fromIndex = STAGE_INDEX.get(from);
  const toIndex = STAGE_INDEX.get(to);

  if (fromIndex === undefined || toIndex === undefined) {
    throw new MissionRuntimeStateError(`Unknown stage transition ${from} -> ${to}.`);
  }

  if (toIndex !== fromIndex + 1 && !(from === "review" && to === "completed")) {
    throw new MissionRuntimeStateError(
      `Invalid stage transition ${from} -> ${to}. Only sequential advancement is allowed.`,
    );
  }
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
