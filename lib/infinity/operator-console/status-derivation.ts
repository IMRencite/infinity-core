import type { DepartmentUiState } from "./types";

const RUNNING = new Set([
  "running",
  "ingesting",
  "analyzing",
  "generating",
  "requested",
  "processing",
  "executing",
  "in_progress",
  "active",
  "building",
  "deploying",
  "pending_execution",
]);

const COMPLETE = new Set([
  "completed",
  "complete",
  "ready",
  "succeeded",
  "success",
  "passed",
  "approved",
  "deployed",
]);

const FAILED = new Set(["failed", "error", "rejected", "cancelled"]);
const BLOCKED = new Set(["blocked", "policy_blocked", "blocked_by_policy"]);
const WAITING = new Set(["waiting", "pending", "queued", "scheduled", "draft", "proposed"]);
const PAUSED = new Set(["paused", "suspended"]);
const SHUTDOWN = new Set(["shutdown", "terminated", "archived"]);
const SKIPPED = new Set(["skipped", "not_applicable"]);

export function deriveUiStateFromEngineStatus(status: string | null | undefined): DepartmentUiState {
  if (!status) return "UNKNOWN";
  const normalized = status.toLowerCase().trim();
  if (RUNNING.has(normalized)) return "RUNNING";
  if (COMPLETE.has(normalized)) return "COMPLETE";
  if (FAILED.has(normalized)) return "FAILED";
  if (BLOCKED.has(normalized)) return "BLOCKED";
  if (WAITING.has(normalized)) return "WAITING";
  if (PAUSED.has(normalized)) return "PAUSED";
  if (SHUTDOWN.has(normalized)) return "SHUTDOWN";
  if (SKIPPED.has(normalized)) return "SKIPPED";
  return "UNKNOWN";
}

export function deriveDepartmentState(input: {
  runStatuses: string[];
  hasRecords: boolean;
  explicitPaused?: boolean;
  explicitShutdown?: boolean;
}): DepartmentUiState {
  if (input.explicitShutdown) return "SHUTDOWN";
  if (input.explicitPaused) return "PAUSED";
  if (!input.hasRecords) return "NOT_STARTED";

  const states = input.runStatuses.map((s) => deriveUiStateFromEngineStatus(s));
  if (states.some((s) => s === "RUNNING")) return "RUNNING";
  if (states.some((s) => s === "FAILED")) return "FAILED";
  if (states.some((s) => s === "BLOCKED")) return "BLOCKED";
  if (states.some((s) => s === "WAITING")) return "WAITING";
  if (states.every((s) => s === "SKIPPED")) return "SKIPPED";
  if (states.every((s) => s === "NOT_STARTED")) return "NOT_STARTED";
  if (states.every((s) => s === "COMPLETE" || s === "SKIPPED")) return "COMPLETE";
  if (states.some((s) => s === "UNKNOWN")) return "UNKNOWN";
  return "COMPLETE";
}

export function deriveOverallVentureStatus(departments: Array<{ state: DepartmentUiState }>): DepartmentUiState {
  const states = departments.map((d) => d.state);
  if (states.some((s) => s === "SHUTDOWN")) return "SHUTDOWN";
  if (states.some((s) => s === "PAUSED")) return "PAUSED";
  if (states.some((s) => s === "RUNNING")) return "RUNNING";
  if (states.some((s) => s === "FAILED")) return "FAILED";
  if (states.some((s) => s === "BLOCKED")) return "BLOCKED";
  if (states.every((s) => s === "NOT_STARTED")) return "NOT_STARTED";
  if (states.every((s) => s === "COMPLETE" || s === "NOT_STARTED" || s === "SKIPPED")) return "COMPLETE";
  return "UNKNOWN";
}

export function deriveActiveDepartments(
  departments: Array<{ id: string; state: DepartmentUiState }>,
): string[] {
  return departments.filter((d) => d.state === "RUNNING").map((d) => d.id);
}

export function countCompletedStages(states: DepartmentUiState[]): { completed: number; total: number } {
  const total = states.length;
  const completed = states.filter((s) => s === "COMPLETE" || s === "SKIPPED").length;
  return { completed, total };
}

export function departmentStateLabel(state: DepartmentUiState): string {
  return state.replace(/_/g, " ");
}

export function departmentStateClasses(state: DepartmentUiState): string {
  switch (state) {
    case "RUNNING":
      return "border-sky-500/40 bg-sky-500/10 ring-1 ring-sky-400/30";
    case "COMPLETE":
      return "border-emerald-500/30 bg-emerald-500/5";
    case "WAITING":
      return "border-zinc-600/40 bg-zinc-800/20";
    case "BLOCKED":
      return "border-amber-500/40 bg-amber-500/10";
    case "FAILED":
      return "border-red-500/50 bg-red-500/10";
    case "PAUSED":
      return "border-violet-500/30 bg-violet-500/10";
    case "SHUTDOWN":
      return "border-zinc-700/50 bg-zinc-900/40 opacity-60";
    case "SKIPPED":
      return "border-zinc-700/30 bg-zinc-900/20 opacity-70";
    case "NOT_STARTED":
      return "border-zinc-800/60 bg-zinc-950/30 opacity-80";
    default:
      return "border-zinc-700/40 bg-zinc-900/30";
  }
}
