import type { CurrentWorkHierarchy, CurrentWorkNarrative } from "./types";
import type { CurrentWorkSourceType } from "./contract";
import { isGenericWorkerOnlyNow, isSpecificCurrentWork } from "./generic";

export function projectCurrentWorkNarrative(input: {
  ventureId?: string | null;
  missionId?: string | null;
  departmentId: string;
  roomId: string;
  state: string;
  action: string;
  object: string;
  purpose: string;
  displayText: string;
  nextExpectedAction: string;
  sourceType: CurrentWorkSourceType;
  sourceId: string;
  startedAt?: string | null;
  lastChangedAt?: string;
  lastVerifiedAt?: string;
  workerLabel?: string | null;
  workerState?: string | null;
  now?: string;
}): CurrentWorkNarrative {
  const now = input.now ?? new Date().toISOString();
  return {
    ventureId: input.ventureId ?? null,
    missionId: input.missionId ?? null,
    departmentId: input.departmentId,
    roomId: input.roomId,
    state: input.state,
    action: input.action,
    object: input.object,
    purpose: input.purpose,
    displayText: input.displayText.trim(),
    nextExpectedAction: input.nextExpectedAction,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    startedAt: input.startedAt ?? now,
    lastChangedAt: input.lastChangedAt ?? now,
    lastVerifiedAt: input.lastVerifiedAt ?? now,
    workerLabel: input.workerLabel ?? null,
    workerState: input.workerState ?? null,
  };
}

export function workHierarchyFromNarrative(narrative: CurrentWorkNarrative, mission: string): CurrentWorkHierarchy {
  return {
    mission,
    floorContribution: narrative.departmentId === "sales_floor" ? narrative.displayText : narrative.purpose,
    roomContribution: narrative.displayText,
    currentActionableWork: narrative.displayText,
    agentTask: narrative.workerLabel,
  };
}

export function narrativeLeavesCompletedWork(previous: CurrentWorkNarrative | null, next: CurrentWorkNarrative): boolean {
  if (!previous) return true;
  if (previous.sourceId === next.sourceId && previous.state === "ACTIVE" && next.state !== "ACTIVE") return true;
  if (previous.sourceId !== next.sourceId) return true;
  return next.displayText !== previous.displayText || next.state !== previous.state;
}

export function historicalWorkCannotRelight(input: {
  completed: boolean;
  historical: boolean;
  nextState: string;
}): boolean {
  if (input.completed || input.historical) return input.nextState !== "ACTIVE";
  return true;
}

export function narrativeIsCanonical(narrative: CurrentWorkNarrative): boolean {
  return Boolean(narrative.sourceId && narrative.sourceType && narrative.displayText)
    && !isGenericWorkerOnlyNow(narrative.displayText)
    && isSpecificCurrentWork(narrative.displayText);
}
