import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { publishCanonicalWorkTransitions, statusRequiresCompletedAt } from "./events";
import { compactCanonicalWorkRows, pickCurrentCanonicalWork } from "./rows";
import type { CanonicalWorkExecutionContract, CanonicalWorkStatus } from "./types";
import { CANONICAL_WORK_EXECUTION_CONTRACT } from "./types";

export const CANONICAL_WORK_STORE_PATH = ".infinity/canonical-work/executions.json" as const;

let rows: CanonicalWorkExecutionContract[] = [];
let hydrated = false;
let diskMtimeMs = 0;
let diskSize = -1;

function persistEnabled(): boolean {
  if (process.env.INFINITY_CANONICAL_WORK_PERSIST === "0") return false;
  if (process.env.VITEST && process.env.INFINITY_CANONICAL_WORK_PERSIST !== "1") return false;
  return true;
}

export function resetCanonicalWorkStore(): void {
  rows = [];
  hydrated = true;
  diskMtimeMs = Number.POSITIVE_INFINITY;
  diskSize = -1;
}

function rememberDiskStat(): void {
  if (!persistEnabled() || !existsSync(CANONICAL_WORK_STORE_PATH)) {
    diskMtimeMs = 0;
    diskSize = -1;
    return;
  }
  const stat = statSync(CANONICAL_WORK_STORE_PATH);
  diskMtimeMs = stat.mtimeMs;
  diskSize = stat.size;
}

export function reloadCanonicalWorkIfDiskChanged(): boolean {
  if (!persistEnabled()) return false;
  if (!existsSync(CANONICAL_WORK_STORE_PATH)) return false;
  const stat = statSync(CANONICAL_WORK_STORE_PATH);
  if (hydrated && stat.mtimeMs === diskMtimeMs && stat.size === diskSize) return false;
  hydrated = false;
  hydrateCanonicalWorkStore();
  diskMtimeMs = stat.mtimeMs;
  diskSize = stat.size;
  return true;
}

export function reloadCanonicalWorkStoreFromDisk(): void {
  if (!persistEnabled()) return;
  hydrated = false;
  hydrateCanonicalWorkStore();
  rememberDiskStat();
}

export function hydrateCanonicalWorkStore(records?: CanonicalWorkExecutionContract[]): void {
  if (records) {
    rows = records.map((row) => ({ ...row }));
    hydrated = true;
    return;
  }
  if (hydrated) return;
  hydrated = true;
  if (!persistEnabled() || !existsSync(CANONICAL_WORK_STORE_PATH)) return;
  try {
    const parsed = JSON.parse(readFileSync(CANONICAL_WORK_STORE_PATH, "utf8")) as {
      executions?: CanonicalWorkExecutionContract[];
    };
    const loaded = (parsed.executions ?? []).map((row) => ({ ...row }));
    const compacted = compactCanonicalWorkRows(loaded);
    rows = compacted;
    rememberDiskStat();
    if (compacted.length !== loaded.length) {
      persistCanonicalWorkStore();
    }
  } catch {
    rows = [];
  }
}

export function persistCanonicalWorkStore(): void {
  if (!persistEnabled()) return;
  const payload = `${JSON.stringify({ contract: CANONICAL_WORK_EXECUTION_CONTRACT, executions: rows }, null, 2)}\n`;
  if (existsSync(CANONICAL_WORK_STORE_PATH) && readFileSync(CANONICAL_WORK_STORE_PATH, "utf8") === payload) {
    return;
  }
  mkdirSync(dirname(CANONICAL_WORK_STORE_PATH), { recursive: true });
  writeFileSync(CANONICAL_WORK_STORE_PATH, payload);
  rememberDiskStat();
}

export function listCanonicalWork(): CanonicalWorkExecutionContract[] {
  reloadCanonicalWorkIfDiskChanged();
  hydrateCanonicalWorkStore();
  return rows.map((row) => ({ ...row }));
}

export function upsertCanonicalWork(work: CanonicalWorkExecutionContract, persist = true): CanonicalWorkExecutionContract {
  hydrateCanonicalWorkStore();
  const next = { ...work, contract: CANONICAL_WORK_EXECUTION_CONTRACT };
  const previous = rows.find((row) => row.work_id === next.work_id) ?? null;
  rows = compactCanonicalWorkRows([...rows.filter((row) => row.work_id !== next.work_id), next]);
  if (persist) persistCanonicalWorkStore();
  publishCanonicalWorkTransitions(previous, next);
  return next;
}

export function completeCanonicalWork(workId: string, output: string, at = new Date().toISOString()): CanonicalWorkExecutionContract | null {
  hydrateCanonicalWorkStore();
  const current = rows.find((row) => row.work_id === workId);
  if (!current) return null;
  return upsertCanonicalWork({
    ...current,
    status: "COMPLETED",
    latest_output: output,
    updated_at: at,
    completed_at: at,
  });
}

export function markCanonicalWorkStatus(
  workId: string,
  status: CanonicalWorkStatus,
  extra: Partial<CanonicalWorkExecutionContract> = {},
): CanonicalWorkExecutionContract | null {
  hydrateCanonicalWorkStore();
  const current = rows.find((row) => row.work_id === workId);
  if (!current) return null;
  return upsertCanonicalWork({
    ...current,
    ...extra,
    status,
    updated_at: extra.updated_at ?? new Date().toISOString(),
    completed_at: statusRequiresCompletedAt(status)
      ? extra.completed_at ?? new Date().toISOString()
      : extra.completed_at ?? current.completed_at,
  });
}

export const OPEN_WORK_STATUSES: CanonicalWorkStatus[] = [
  "QUEUED",
  "ACTIVE",
  "WAITING",
  "BLOCKED",
  "AUTHORIZATION_REQUIRED",
];

export function listOpenCanonicalWork(): CanonicalWorkExecutionContract[] {
  return listCanonicalWork().filter((row) => OPEN_WORK_STATUSES.includes(row.status));
}

export function listActiveCanonicalWork(): CanonicalWorkExecutionContract[] {
  return listCanonicalWork().filter((row) => row.status === "ACTIVE");
}

export function selectTopCanonicalWork(): CanonicalWorkExecutionContract | null {
  return pickCurrentCanonicalWork(listCanonicalWork());
}
