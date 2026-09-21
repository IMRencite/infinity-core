import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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

function cleanLiveText(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\s+/g, " ").trim();
}

export function headlineFromObjective(objective: string | null | undefined): string | null {
  if (!objective) return null;
  const line = cleanLiveText(objective)
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
  if (standing && isInfinityMissionHeadline(standing) && isShortFollowUp(fromObjective)) return standing;
  if (fromObjective) return fromObjective;
  if (standing) return standing;
  const path = (input.file ?? "").replace(/\\/g, "/").toLowerCase();
  if (/financial-truth|treasury/.test(path)) return "Treasury / capital allocation";
  if (/canonical-work|current-implementation|implementation-observe|hq-live-implementation/.test(path)) {
    return "HQ live current-work wiring";
  }
  if (/occupancynpv/.test(path)) return "OccupancyNPV";
  if (/imr-brand|imr-mark|\/brand\/imr|imros-public/.test(path)) return "Adding the IMR logo to imros.io";
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseToolInput(payload: Record<string, unknown>): Record<string, unknown> | null {
  const raw = payload.tool_input ?? payload.toolInput ?? payload.input ?? payload.arguments;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return asRecord(parsed);
    } catch {
      return null;
    }
  }
  return asRecord(raw);
}

function looksLikeSourcePath(value: string): boolean {
  const normalized = value.replace(/\\/g, "/");
  return /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|svg)(\b|$)/i.test(normalized) && !normalized.includes("\n");
}

export function extractHookFile(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const input = parseToolInput(root);
  const candidates = [
    root.file_path,
    root.filePath,
    root.path,
    input?.file_path,
    input?.filePath,
    input?.path,
    input?.target_notebook,
    (root.edits as Array<Record<string, unknown>> | undefined)?.[0]?.file_path,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const found: string[] = [];
  walkHookStrings(payload, found);
  return found.find((row) => looksLikeSourcePath(row)) ?? null;
}

export function extractHookTool(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const candidates = [root.tool_name, root.toolName, root.tool, root.hook_event_name, root.event];
  return candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
}

export function extractHookCommand(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const input = parseToolInput(root);
  const candidates = [root.command, input?.command, input?.search_term, input?.pattern];
  return candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
}

export function firstLiveSentence(text: string | null | undefined, max = 110): string | null {
  if (!text) return null;
  const line = cleanLiveText(text)
    .replace(/^[#>*\-\d.]+\s*/, "")
    .trim();
  if (line.length < 8) return null;
  const sentence = line.split(/(?<=[.!?])\s+/)[0] ?? line;
  return sentence.length > max ? `${sentence.slice(0, max - 3).trim()}...` : sentence;
}

export function liveImplementationSentence(input: {
  file?: string | null;
  tool?: string | null;
  command?: string | null;
  prompt?: string | null;
  thought?: string | null;
  previous?: string | null;
}): string | null {
  const file = (input.file ?? "").replace(/\\/g, "/");
  const name = file.split("/").filter(Boolean).pop() ?? "";
  const tool = input.tool ?? "";
  if (input.thought) return firstLiveSentence(input.thought);
  if (name) {
    if (/Read|Grep|Glob|beforeReadFile/i.test(tool)) return `Reading ${name}`;
    if (/Shell|beforeShellExecution|afterShellExecution/i.test(tool)) {
      return input.command ? `Running ${firstLiveSentence(input.command, 72)}` : `Running a command in ${name}`;
    }
    if (/Delete/i.test(tool)) return `Removing ${name}`;
    return `Editing ${name}`;
  }
  if (input.command) {
    const command = firstLiveSentence(input.command, 80);
    return command ? (/Shell|beforeShellExecution/i.test(tool) ? `Running ${command}` : command) : null;
  }
  if (tool && !/pulse|prompt|complete|stop|afterAgentThought|AgentThought/i.test(tool)) return `Using ${tool}`;
  const previous = input.previous?.trim() ?? "";
  if (/^(Editing|Reading|Running|Removing|Using) /.test(previous)) return previous;
  if (input.prompt) return firstLiveSentence(input.prompt);
  if (previous && previous !== "TASK DETAIL UNAVAILABLE") return previous;
  return null;
}

export function isShortFollowUp(text: string | null | undefined): boolean {
  if (!text) return true;
  const line = headlineFromObjective(text) ?? text.replace(/\s+/g, " ").trim();
  if (isInfinityMissionHeadline(line)) return false;
  return line.length < 96 && !/\b(ensure|deploy|push live|qc gate|pill hover)\b/i.test(line);
}

export function extractLatestUserQuery(contents: string): string | null {
  const tagged = [...contents.matchAll(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/g)];
  const last = tagged.at(-1)?.[1]?.trim();
  if (last) return cleanLiveText(last);
  const lines = contents.split(/\r?\n/).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const row = JSON.parse(lines[index]!) as { role?: string; message?: { content?: unknown } };
      if (row.role !== "user") continue;
      const content = row.message?.content;
      const text = Array.isArray(content)
        ? content.map((item) => (item && typeof item === "object" && "text" in item ? String((item as { text?: unknown }).text ?? "") : "")).join("\n")
        : typeof content === "string"
          ? content
          : "";
      const query = text.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/)?.[1]?.trim();
      if (query) return query;
      if (text.trim().length >= 16) return text.trim();
    } catch {
      /* next line */
    }
  }
  return null;
}

function listTranscriptFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listTranscriptFiles(full));
    else if (entry.name.endsWith(".jsonl")) found.push(full);
  }
  return found;
}

export function defaultImplementationTranscriptRoots(): string[] {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  return [
    process.env.CURSOR_TRANSCRIPT_DIR,
    join(home, ".cursor", "projects", "c-Users-Antivist-Desktop-Infinity", "agent-transcripts"),
  ].filter((row): row is string => Boolean(row));
}

export function latestUserObjectiveFromTranscripts(roots: string[] = defaultImplementationTranscriptRoots()): {
  text: string;
  mtime: number;
} | null {
  const files = roots.flatMap((root) => listTranscriptFiles(root));
  const newest = files
    .map((path) => ({ path, mtime: existsSync(path) ? statSync(path).mtimeMs : 0 }))
    .sort((left, right) => right.mtime - left.mtime)[0];
  if (!newest) return null;
  try {
    const text = extractLatestUserQuery(readFileSync(newest.path, "utf8"));
    return text ? { text, mtime: newest.mtime } : null;
  } catch {
    return null;
  }
}

export function extractHookObjective(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const direct = [
    root.prompt,
    root.user_query,
    root.userQuery,
    root.composer,
    asRecord(root.prompt)?.text,
    asRecord(root.message)?.text,
  ];
  for (const value of direct) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const found: string[] = [];
  walkHookStrings(payload, found);
  const mission = found.find((row) => isInfinityMissionHeadline(headlineFromObjective(row)));
  if (mission) return mission;
  const useful = found.filter((row) => !looksLikeSourcePath(row) && row.length >= 16 && row.length <= 4000);
  return useful.sort((left, right) => right.length - left.length)[0] ?? null;
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
  tool?: string | null;
  command?: string | null;
  thought?: string | null;
  transcriptRoots?: string[];
  now?: string;
}): CanonicalWorkExecutionContract | null {
  if (input.file != null && !shouldObserveImplementationFile(input.file)) return null;
  const session = loadImplementationSession();
  const transcript = input.objective || !persistSessionEnabled()
    ? null
    : latestUserObjectiveFromTranscripts(input.transcriptRoots);
  const sessionUpdated = Date.parse(session.updated_at);
  const sessionIsNewer = Number.isFinite(sessionUpdated) && transcript != null && sessionUpdated > transcript.mtime;
  const objective = input.objective ?? (sessionIsNewer ? session.objective : transcript?.text) ?? session.objective;
  const title =
    input.title ??
    inferImplementationTitle({
      objective,
      file: input.file,
      sessionMissionTitle: session.mission_title,
    });
  const description =
    liveImplementationSentence({
      file: input.file,
      tool: input.tool,
      command: input.command,
      prompt: objective,
      thought: input.thought,
      previous: input.description,
    })
    ?? input.description
    ?? (input.file ? `Editing ${input.file.replace(/\\/g, "/")}` : null)
    ?? "TASK DETAIL UNAVAILABLE";
  const now = input.now ?? new Date().toISOString();
  const assignedHay = `${title} ${description} ${input.file ?? ""}`.toLowerCase();
  const assigned_rooms = /imr|imros\.io|brand.mark|brand\/imr/.test(assignedHay)
    ? ([
        "creative_studio",
        "product_lab",
        "quality_control",
        "launch_operations",
        "systems_architect",
        "operations",
      ] as const)
    : undefined;
  saveImplementationSession({
    objective,
    mission_title: title,
    last_file: input.file ?? session.last_file,
    last_event: "pulse",
    updated_at: now,
  });
  return startCurrentImplementationWork({
    title,
    description,
    output: description,
    assigned_rooms: assigned_rooms ? [...assigned_rooms] : undefined,
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
