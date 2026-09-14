import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  completeCurrentImplementationWork,
  keepStandingImplementationTitle,
  startCurrentImplementationWork,
} from "./current-implementation";
import type { CanonicalWorkExecutionContract } from "./types";

export const IMPLEMENTATION_SESSION_PATH = ".infinity/canonical-work/current-session.json" as const;

export type ImplementationSession = {
  objective: string | null;
  mission_title: string | null;
  last_file: string | null;
  last_event: "prompt" | "pulse" | "complete" | null;
  updated_at: string;
};

const IGNORE_PATH_PARTS = [
  "/.next/",
  "/.next-verify/",
  "/node_modules/",
  "/.git/",
  "/terminals/",
  "/agent-transcripts/",
  "/playwright-report/",
  "/test-results/",
  "executions.json",
  "current-session.json",
  "hq-live-tick.json",
  "last-hq-notify.json",
];

export function shouldObserveImplementationFile(filePath: string | null | undefined): boolean {
  if (!filePath) return true;
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return !IGNORE_PATH_PARTS.some((part) => normalized.includes(part.toLowerCase()));
}

export function headlineFromObjective(objective: string | null | undefined): string | null {
  if (!objective) return null;
  const line = objective
    .split(/\r?\n/)
    .map((row) => row.replace(/^#+\s*/, "").trim())
    .find((row) => row.length > 0 && !/^priority:|^do not |^stop\.$/i.test(row));
  if (!line) return null;
  const infinity = line.match(/^(INFINITY\s+[—-]\s+[^.\n]{8,96})/i);
  const raw = (infinity?.[1] ?? line).replace(/\s+/g, " ").trim();
  return raw.length > 96 ? `${raw.slice(0, 93).trim()}...` : raw;
}

export function isInfinityMissionHeadline(title: string | null | undefined): boolean {
  return Boolean(title && /^INFINITY\s+[—-]\s+\S/i.test(title));
}

export function inferImplementationTitle(input: {
  objective?: string | null;
  file?: string | null;
  existingTitle?: string | null;
  sessionMissionTitle?: string | null;
}): string {
  const fromObjective = headlineFromObjective(input.objective);
  if (fromObjective && isInfinityMissionHeadline(fromObjective)) return fromObjective;
  const standing =
    keepStandingImplementationTitle(input.sessionMissionTitle) ??
    keepStandingImplementationTitle(input.existingTitle);
  if (standing && isInfinityMissionHeadline(standing)) return standing;
  if (fromObjective) return fromObjective;
  if (standing) return standing;
  const path = (input.file ?? "").replace(/\\/g, "/").toLowerCase();
  if (/financial-truth|treasury/.test(path)) return "Treasury / capital allocation";
  if (/canonical-work|current-implementation|implementation-observe|hq-live-implementation/.test(path)) {
    return "HQ live current-work wiring";
  }
  if (/occupancynpv/.test(path)) return "OccupancyNPV";
  if (/operator-console|hq-/.test(path)) return "HQ operator console";
  return "Infinity implementation work";
}

function walkHookStrings(value: unknown, found: string[], depth = 0): void {
  if (depth > 6 || found.length > 40 || value == null) return;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length >= 12) found.push(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkHookStrings(item, found, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (/prompt|text|content|message|input|objective|composer/i.test(key)) {
        walkHookStrings(item, found, depth + 1);
      }
    }
  }
}

export function extractHookObjective(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const found: string[] = [];
  walkHookStrings(payload, found);
  const mission = found.find((row) => isInfinityMissionHeadline(headlineFromObjective(row)));
  if (mission) return mission;
  return found.sort((left, right) => right.length - left.length)[0] ?? null;
}

function persistSessionEnabled(): boolean {
  if (process.env.INFINITY_CANONICAL_WORK_PERSIST === "0") return false;
  if (process.env.VITEST && process.env.INFINITY_CANONICAL_WORK_PERSIST !== "1") return false;
  return true;
}

let memorySession: ImplementationSession | null = null;

export function loadImplementationSession(): ImplementationSession {
  if (memorySession) return { ...memorySession };
  if (!persistSessionEnabled() || !existsSync(IMPLEMENTATION_SESSION_PATH)) {
    return { objective: null, mission_title: null, last_file: null, last_event: null, updated_at: new Date().toISOString() };
  }
  try {
    const parsed = JSON.parse(readFileSync(IMPLEMENTATION_SESSION_PATH, "utf8")) as ImplementationSession;
    return {
      objective: parsed.objective ?? null,
      mission_title: parsed.mission_title ?? headlineFromObjective(parsed.objective),
      last_file: parsed.last_file ?? null,
      last_event: parsed.last_event ?? null,
      updated_at: parsed.updated_at ?? new Date().toISOString(),
    };
  } catch {
    return { objective: null, mission_title: null, last_file: null, last_event: null, updated_at: new Date().toISOString() };
  }
}

export function saveImplementationSession(session: ImplementationSession): ImplementationSession {
  memorySession = { ...session };
  if (persistSessionEnabled()) {
    mkdirSync(dirname(IMPLEMENTATION_SESSION_PATH), { recursive: true });
    writeFileSync(IMPLEMENTATION_SESSION_PATH, `${JSON.stringify(session, null, 2)}\n`);
  }
  return session;
}

export function resetImplementationSession(): void {
  memorySession = null;
}

export function rememberImplementationObjective(objective: string, now = new Date().toISOString()): ImplementationSession {
  const current = loadImplementationSession();
  const nextObjective = objective.trim() || current.objective;
  const headline = headlineFromObjective(nextObjective);
  return saveImplementationSession({
    ...current,
    objective: nextObjective,
    mission_title:
      headline && isInfinityMissionHeadline(headline)
        ? headline
        : current.mission_title ?? headline,
    last_event: "prompt",
    updated_at: now,
  });
}

export function pulseCurrentImplementationWork(input: {
  title?: string;
  description?: string;
  file?: string | null;
  objective?: string | null;
  now?: string;
}): CanonicalWorkExecutionContract | null {
  if (input.file != null && !shouldObserveImplementationFile(input.file)) return null;
  const session = loadImplementationSession();
  const objective = input.objective ?? session.objective;
  const title =
    input.title ??
    inferImplementationTitle({
      objective,
      file: input.file,
      sessionMissionTitle: session.mission_title,
    });
  const inferredTitle = inferImplementationTitle({
    objective,
    file: input.file,
    sessionMissionTitle: session.mission_title,
  });
  const description =
    input.description ??
    (input.file
      ? `Editing ${input.file.replace(/\\/g, "/")}`
      : objective
        ? `Continue ${inferredTitle}`
        : inferredTitle && inferredTitle !== "Infinity implementation work"
          ? inferredTitle
          : "TASK DETAIL UNAVAILABLE");
  const now = input.now ?? new Date().toISOString();
  saveImplementationSession({
    objective,
    mission_title: isInfinityMissionHeadline(title) ? title : session.mission_title ?? title,
    last_file: input.file ?? session.last_file,
    last_event: "pulse",
    updated_at: now,
  });
  return startCurrentImplementationWork({
    title,
    description,
    output: description,
    now,
  });
}

export function completeObservedImplementationWork(
  output = "Implementation complete · IDLE",
  now = new Date().toISOString(),
): CanonicalWorkExecutionContract | null {
  const session = loadImplementationSession();
  saveImplementationSession({
    ...session,
    last_event: "complete",
    updated_at: now,
  });
  return completeCurrentImplementationWork(output, now);
}
