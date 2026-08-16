import type { DepartmentUiState, OperatorVentureListItem, OperatorVentureSnapshot } from "./types";

const TERMINAL_STATUSES = new Set(["SHUTDOWN", "COMPLETE"]);

export function resolveDefaultVentureId(
  items: OperatorVentureListItem[],
  snapshots: Map<string, OperatorVentureSnapshot>,
): string | null {
  if (items.length === 0) return null;

  for (const item of items) {
    const snapshot = snapshots.get(item.ventureAssemblyId);
    if (snapshot?.overallStatus === "RUNNING") return item.ventureAssemblyId;
  }

  for (const item of items) {
    const snapshot = snapshots.get(item.ventureAssemblyId);
    if (snapshot?.closedLoopRoute.missionStatus === "READY") return item.ventureAssemblyId;
    if (snapshot?.departments.some((d) => d.id === "executive_office" && d.summary?.includes("READY"))) {
      return item.ventureAssemblyId;
    }
  }

  const nonTerminal = items.filter((item) => {
    const snapshot = snapshots.get(item.ventureAssemblyId);
    const status = snapshot?.overallStatus ?? (item.status.toUpperCase() as DepartmentUiState);
    return !TERMINAL_STATUSES.has(status);
  });

  const byActivity = [...(nonTerminal.length ? nonTerminal : items)].sort((a, b) => {
    const ta = a.latestActivityAt ?? "";
    const tb = b.latestActivityAt ?? "";
    return tb.localeCompare(ta);
  });

  return byActivity[0]?.ventureAssemblyId ?? items[0]?.ventureAssemblyId ?? null;
}

export function groupVenturesForSelector(items: OperatorVentureListItem[]): {
  active: OperatorVentureListItem[];
  recent: OperatorVentureListItem[];
  completed: OperatorVentureListItem[];
  paused: OperatorVentureListItem[];
} {
  const active: OperatorVentureListItem[] = [];
  const recent: OperatorVentureListItem[] = [];
  const completed: OperatorVentureListItem[] = [];
  const paused: OperatorVentureListItem[] = [];

  for (const item of items) {
    const status = item.status.toLowerCase();
    if (status.includes("running") || status.includes("active") || item.activeDepartment) {
      active.push(item);
    } else if (status.includes("pause")) {
      paused.push(item);
    } else if (status.includes("complete") || status.includes("shutdown") || status.includes("archived")) {
      completed.push(item);
    } else {
      recent.push(item);
    }
  }

  return { active, recent, completed, paused };
}
