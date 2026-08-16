import type { FailureSemantics } from "./types";
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

export type StatusTimelineEntry = {
  status: string;
  timestamp: string | null;
};

export type DepartmentOperationalState = {
  state: DepartmentUiState;
  failureSemantics: FailureSemantics;
  latestRawStatus: string | null;
};

function sortTimeline(entries: StatusTimelineEntry[]): StatusTimelineEntry[] {
  return [...entries].sort((a, b) => {
    const ta = a.timestamp ?? "";
    const tb = b.timestamp ?? "";
    if (ta && tb) return tb.localeCompare(ta);
    if (ta && !tb) return -1;
    if (!ta && tb) return 1;
    return 0;
  });
}

function resolveLatestEntry(
  sorted: StatusTimelineEntry[],
  original: StatusTimelineEntry[],
): StatusTimelineEntry | null {
  const timestamped = sorted.filter((e) => e.timestamp);
  if (timestamped.length > 0) return timestamped[0] ?? null;
  return original[original.length - 1] ?? null;
}

export function deriveDepartmentOperationalState(input: {
  timeline: StatusTimelineEntry[];
  hasRecords: boolean;
  explicitPaused?: boolean;
  explicitShutdown?: boolean;
  departmentLifecycleOrder?: number;
  furthestVentureLifecycleIndex?: number;
}): DepartmentOperationalState {
  if (input.explicitShutdown) {
    return { state: "SHUTDOWN", failureSemantics: "UNKNOWN", latestRawStatus: null };
  }
  if (input.explicitPaused) {
    return { state: "PAUSED", failureSemantics: "UNKNOWN", latestRawStatus: null };
  }
  if (!input.hasRecords || input.timeline.length === 0) {
    return { state: "NOT_STARTED", failureSemantics: "UNKNOWN", latestRawStatus: null };
  }

  const sorted = sortTimeline(input.timeline);
  const latestEntry = resolveLatestEntry(sorted, input.timeline);
  const latestRawStatus = latestEntry?.status ?? null;
  const uiStates = input.timeline.map((e) => deriveUiStateFromEngineStatus(e.status));
  const hadFailure = uiStates.some((s) => s === "FAILED");
  const latestState = deriveUiStateFromEngineStatus(latestRawStatus);

  if (uiStates.some((s) => s === "RUNNING")) {
    return { state: "RUNNING", failureSemantics: "UNKNOWN", latestRawStatus };
  }
  if (uiStates.some((s) => s === "BLOCKED")) {
    return { state: "BLOCKED", failureSemantics: "UNKNOWN", latestRawStatus };
  }
  if (uiStates.some((s) => s === "WAITING")) {
    return { state: "WAITING", failureSemantics: "UNKNOWN", latestRawStatus };
  }

  const lifecycleOrder = input.departmentLifecycleOrder ?? 0;
  const furthestIndex = input.furthestVentureLifecycleIndex ?? lifecycleOrder;
  const ventureMovedBeyond =
    furthestIndex > lifecycleOrder &&
    (latestState === "FAILED" || (hadFailure && latestState !== "RUNNING"));

  if (latestState === "FAILED") {
    if (ventureMovedBeyond) {
      const fallback = uiStates.some((s) => s === "COMPLETE") ? "COMPLETE" : "WAITING";
      return { state: fallback, failureSemantics: "HISTORICAL_FAILURE", latestRawStatus };
    }
    return { state: "FAILED", failureSemantics: "CURRENT_BLOCKING_FAILURE", latestRawStatus };
  }

  if (latestState === "COMPLETE" && hadFailure) {
    return { state: "COMPLETE", failureSemantics: "RECOVERED", latestRawStatus };
  }

  if (hadFailure) {
    return { state: latestState, failureSemantics: "HISTORICAL_FAILURE", latestRawStatus };
  }

  if (uiStates.every((s) => s === "SKIPPED")) {
    return { state: "SKIPPED", failureSemantics: "UNKNOWN", latestRawStatus };
  }
  if (uiStates.every((s) => s === "NOT_STARTED")) {
    return { state: "NOT_STARTED", failureSemantics: "UNKNOWN", latestRawStatus };
  }
  if (uiStates.every((s) => s === "COMPLETE" || s === "SKIPPED")) {
    return { state: "COMPLETE", failureSemantics: "UNKNOWN", latestRawStatus };
  }
  if (uiStates.some((s) => s === "UNKNOWN")) {
    return { state: "UNKNOWN", failureSemantics: "UNKNOWN", latestRawStatus };
  }

  return { state: latestState, failureSemantics: "UNKNOWN", latestRawStatus };
}

export function computeFurthestLifecycleIndex(
  departments: Array<{ lifecycleOrder: number; state: DepartmentUiState; recordCount: number }>,
): number {
  let max = 0;
  for (const dept of departments) {
    if (
      dept.state === "RUNNING" ||
      dept.state === "COMPLETE" ||
      dept.state === "WAITING" ||
      dept.state === "BLOCKED" ||
      (dept.recordCount > 0 && dept.state !== "NOT_STARTED")
    ) {
      max = Math.max(max, dept.lifecycleOrder);
    }
  }
  return max;
}

export function deriveDepartmentState(input: {
  runStatuses: string[];
  hasRecords: boolean;
  explicitPaused?: boolean;
  explicitShutdown?: boolean;
  timeline?: StatusTimelineEntry[];
  departmentLifecycleOrder?: number;
  furthestVentureLifecycleIndex?: number;
}): DepartmentUiState {
  const timeline =
    input.timeline ??
    input.runStatuses.map((status) => ({ status, timestamp: null as string | null }));
  return deriveDepartmentOperationalState({
    timeline,
    hasRecords: input.hasRecords,
    explicitPaused: input.explicitPaused,
    explicitShutdown: input.explicitShutdown,
    departmentLifecycleOrder: input.departmentLifecycleOrder,
    furthestVentureLifecycleIndex: input.furthestVentureLifecycleIndex,
  }).state;
}

export function deriveDepartmentStateWithSemantics(input: {
  runStatuses: string[];
  hasRecords: boolean;
  explicitPaused?: boolean;
  explicitShutdown?: boolean;
  timeline?: StatusTimelineEntry[];
  departmentLifecycleOrder?: number;
  furthestVentureLifecycleIndex?: number;
}): { state: DepartmentUiState; failureSemantics: FailureSemantics; latestRawStatus: string | null } {
  const timeline =
    input.timeline ??
    input.runStatuses.map((status) => ({ status, timestamp: null as string | null }));
  return deriveDepartmentOperationalState({
    timeline,
    hasRecords: input.hasRecords,
    explicitPaused: input.explicitPaused,
    explicitShutdown: input.explicitShutdown,
    departmentLifecycleOrder: input.departmentLifecycleOrder,
    furthestVentureLifecycleIndex: input.furthestVentureLifecycleIndex,
  });
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
  const labels: Record<DepartmentUiState, string> = {
    RUNNING: "In progress",
    COMPLETE: "Complete",
    WAITING: "Waiting",
    BLOCKED: "Blocked",
    FAILED: "Failed",
    SKIPPED: "Skipped",
    NOT_STARTED: "Not started",
    UNKNOWN: "Unknown",
    PAUSED: "Paused",
    SHUTDOWN: "Shutdown",
  };
  return labels[state] ?? state.replace(/_/g, " ");
}

export function departmentVisualState(
  state: DepartmentUiState,
  failureSemantics?: FailureSemantics,
): DepartmentUiState {
  if (failureSemantics === "HISTORICAL_FAILURE" && state !== "RUNNING") {
    return state === "FAILED" ? "COMPLETE" : state;
  }
  return state;
}

export function departmentStateClasses(state: DepartmentUiState, failureSemantics?: FailureSemantics): string {
  if (failureSemantics === "HISTORICAL_FAILURE") {
    return "border-amber-500/20 bg-zinc-900/40";
  }
  if (failureSemantics === "RECOVERED") {
    return "border-emerald-500/25 bg-emerald-500/5";
  }
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
