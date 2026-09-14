import {
  readPersistedMissionActivity,
  setMissionActivityPersistFile,
  writePersistedMissionActivity,
} from "./persist-disk";
import type { ActivityExecutionClass } from "./constants";
import type { MissionActivityEvent } from "./types";

const MAX_EVENTS = 400;

let events: MissionActivityEvent[] = [];
let hydrated = false;

function persistEnabled(): boolean {
  if (process.env.INFINITY_MISSION_ACTIVITY_PERSIST === "0") return false;
  if (process.env.VITEST && process.env.INFINITY_MISSION_ACTIVITY_PERSIST !== "1") return false;
  return true;
}

function cloneEvent(item: MissionActivityEvent): MissionActivityEvent {
  return { ...item, traceability: { ...item.traceability } };
}

function trimEvents(): void {
  if (events.length > MAX_EVENTS) {
    events = events.slice(-MAX_EVENTS);
  }
}

export function setMissionActivityPersistPath(path: string | null): void {
  setMissionActivityPersistFile(path);
  hydrated = false;
}

export function persistMissionActivityToDisk(): void {
  if (!persistEnabled()) return;
  writePersistedMissionActivity(exportMissionActivitySnapshot());
}

export function ensureMissionActivityHydrated(): void {
  if (hydrated) return;
  hydrated = true;
  if (!persistEnabled()) return;
  events = readPersistedMissionActivity().map(cloneEvent).slice(-MAX_EVENTS);
}

export function mergeMissionActivityEvents(records: MissionActivityEvent[], persist = false): number {
  ensureMissionActivityHydrated();
  const existing = new Set(events.map((event) => event.eventId));
  let added = 0;
  for (const item of records) {
    if (!item?.eventId || !item.missionId || !item.eventType || existing.has(item.eventId)) continue;
    events.push(cloneEvent(item));
    existing.add(item.eventId);
    added += 1;
  }
  events.sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.eventId.localeCompare(b.eventId));
  trimEvents();
  if (persist) persistMissionActivityToDisk();
  return added;
}

export function refreshMissionActivityFromDisk(): number {
  if (!persistEnabled()) return 0;
  const fromDisk = readPersistedMissionActivity();
  hydrated = true;
  return mergeMissionActivityEvents(fromDisk, false);
}

export function resetMissionActivityStore(): void {
  events = [];
  hydrated = true;
}

export function simulateMissionActivityProcessRestart(): void {
  persistMissionActivityToDisk();
  events = [];
  hydrated = false;
  ensureMissionActivityHydrated();
}

export function recordMissionActivityEvent(event: MissionActivityEvent): MissionActivityEvent {
  ensureMissionActivityHydrated();
  const existing = events.find((item) => item.eventId === event.eventId);
  if (existing) return existing;
  events.push(event);
  trimEvents();
  persistMissionActivityToDisk();
  return event;
}

export function listMissionActivityEvents(filter?: {
  organizationId?: string;
  ventureId?: string | null;
  missionId?: string;
  includeSynthetic?: boolean;
  executionClass?: ActivityExecutionClass;
}): MissionActivityEvent[] {
  ensureMissionActivityHydrated();
  return events.filter((event) => {
    if (filter?.organizationId && event.organizationId !== filter.organizationId) return false;
    if (filter?.ventureId !== undefined && event.ventureId !== filter.ventureId) return false;
    if (filter?.missionId && event.missionId !== filter.missionId) return false;
    if (filter?.includeSynthetic === false && event.synthetic) return false;
    if (filter?.executionClass && event.executionClass !== filter.executionClass) return false;
    return true;
  });
}

export function exportMissionActivitySnapshot(): MissionActivityEvent[] {
  return events.map(cloneEvent);
}

export function hydrateMissionActivitySnapshot(records: MissionActivityEvent[]): void {
  events = records
    .filter((item) => item && item.eventId && item.missionId && item.eventType)
    .map(cloneEvent);
  hydrated = true;
  persistMissionActivityToDisk();
}

export function missionActivityStoreSize(): number {
  ensureMissionActivityHydrated();
  return events.length;
}
