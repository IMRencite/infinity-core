import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { MissionActivityEvent } from "./types";

/** Statically scoped runtime file. Do not interpolate process.cwd() here — Next NFT traces that as the whole project. */
export const MISSION_ACTIVITY_PERSIST_FILE = ".infinity/mission-activity/events.json";

let persistFileOverride: string | null = null;

export function missionActivityPersistFile(): string {
  return persistFileOverride ?? MISSION_ACTIVITY_PERSIST_FILE;
}

export function setMissionActivityPersistFile(path: string | null): void {
  persistFileOverride = path;
}

export function readPersistedMissionActivity(): MissionActivityEvent[] {
  const file = missionActivityPersistFile();
  if (!existsSync(file)) return [];
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (item): item is MissionActivityEvent =>
        Boolean(item && typeof item === "object" && "eventId" in item && "missionId" in item && "eventType" in item),
    );
  } catch {
    return [];
  }
}

export function writePersistedMissionActivity(records: MissionActivityEvent[]): void {
  const file = missionActivityPersistFile();
  const payload = `${JSON.stringify(records)}\n`;
  if (existsSync(file) && readFileSync(file, "utf8") === payload) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, payload, "utf8");
}
