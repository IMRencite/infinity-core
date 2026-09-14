import type { CanonicalWorkExecutionContract, CanonicalWorkStatus } from "./types";

export const TERMINAL_WORK_STATUSES: CanonicalWorkStatus[] = [
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "SUPERSEDED",
  "STALE",
];

export const CURRENT_OPEN_WORK_STATUSES: CanonicalWorkStatus[] = [
  "ACTIVE",
  "BLOCKED",
  "AUTHORIZATION_REQUIRED",
  "WAITING",
  "QUEUED",
];

function timeMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function selectTruthCanonicalRow(
  left: CanonicalWorkExecutionContract,
  right: CanonicalWorkExecutionContract,
): CanonicalWorkExecutionContract {
  const leftTerminal = TERMINAL_WORK_STATUSES.includes(left.status);
  const rightTerminal = TERMINAL_WORK_STATUSES.includes(right.status);
  const leftMs = Math.max(timeMs(left.updated_at), timeMs(left.completed_at));
  const rightMs = Math.max(timeMs(right.updated_at), timeMs(right.completed_at));
  if (rightMs !== leftMs) return rightMs > leftMs ? right : left;
  if (rightTerminal && !leftTerminal) return right;
  if (leftTerminal && !rightTerminal) return left;
  return right;
}

export function compactCanonicalWorkRows(
  rows: CanonicalWorkExecutionContract[],
): CanonicalWorkExecutionContract[] {
  const seen = new Map<string, CanonicalWorkExecutionContract>();
  const order: string[] = [];
  for (const row of rows) {
    const current = seen.get(row.work_id);
    if (!current) {
      seen.set(row.work_id, row);
      order.push(row.work_id);
      continue;
    }
    seen.set(row.work_id, selectTruthCanonicalRow(current, row));
  }
  return order.map((id) => seen.get(id)!);
}

export function activityTimeMs(row: CanonicalWorkExecutionContract): number {
  return Math.max(timeMs(row.updated_at), timeMs(row.completed_at));
}

export function pickLatestCompletedCanonicalWork(
  rows: CanonicalWorkExecutionContract[],
): CanonicalWorkExecutionContract | null {
  const completed = compactCanonicalWorkRows(rows).filter((row) =>
    row.status === "COMPLETED" || row.status === "SUPERSEDED" || row.status === "FAILED" || row.status === "CANCELLED",
  );
  return [...completed].sort((left, right) => activityTimeMs(right) - activityTimeMs(left))[0] ?? null;
}

export function pickCurrentCanonicalWork(
  rows: CanonicalWorkExecutionContract[],
): CanonicalWorkExecutionContract | null {
  const unique = compactCanonicalWorkRows(rows);
  const actives = unique
    .filter((row) => row.status === "ACTIVE")
    .sort((left, right) => activityTimeMs(right) - activityTimeMs(left));
  return actives[0] ?? null;
}
