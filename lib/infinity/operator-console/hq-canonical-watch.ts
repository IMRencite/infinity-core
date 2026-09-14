import { existsSync, statSync, watch, type FSWatcher } from "node:fs";
import { resolve } from "node:path";
import { idleCurrentImplementationWorkIfQuiet, HQ_LIVE_TICK_PATH } from "@/lib/infinity/canonical-work/current-implementation";
import { resolveCanonicalMissionCompletions } from "@/lib/infinity/canonical-work/mission-completion";
import { IMPLEMENTATION_SESSION_PATH } from "@/lib/infinity/canonical-work/implementation-observe";
import { CANONICAL_WORK_STORE_PATH, reloadCanonicalWorkIfDiskChanged } from "@/lib/infinity/canonical-work/store";
import { missionActivityPersistFile } from "@/lib/infinity/mission-activity/persist-disk";
import { refreshMissionActivityFromDisk } from "@/lib/infinity/mission-activity/store";
import { publishHqRuntimeEvent } from "./hq-live-events";

export const HQ_CANONICAL_WATCH_INTERVAL_MS = 500;

type DiskStamp = { mtimeMs: number; size: number };

let started = false;
let watchers: FSWatcher[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
const stamps = new Map<string, DiskStamp>();

function stampOf(path: string): DiskStamp | null {
  if (!existsSync(path)) return null;
  const stat = statSync(path);
  return { mtimeMs: stat.mtimeMs, size: stat.size };
}

function changed(path: string): boolean {
  const next = stampOf(path);
  if (!next) return false;
  const prev = stamps.get(path);
  stamps.set(path, next);
  return !prev || prev.mtimeMs !== next.mtimeMs || prev.size !== next.size;
}

function watchedPaths(): string[] {
  return [
    resolve(CANONICAL_WORK_STORE_PATH),
    resolve(IMPLEMENTATION_SESSION_PATH),
    resolve(HQ_LIVE_TICK_PATH),
    resolve(missionActivityPersistFile()),
  ];
}

export function reconcileHqCanonicalDisk(): { changed: boolean; paths: string[] } {
  const paths = watchedPaths().filter((path) => changed(path));
  if (paths.length === 0) {
    resolveCanonicalMissionCompletions();
    idleCurrentImplementationWorkIfQuiet();
    return { changed: false, paths: [] };
  }
  reloadCanonicalWorkIfDiskChanged();
  refreshMissionActivityFromDisk();
  resolveCanonicalMissionCompletions();
  idleCurrentImplementationWorkIfQuiet();
  publishHqRuntimeEvent({
    type: "HQ_SNAPSHOT_INVALIDATED",
    at: new Date().toISOString(),
    reason: "CANONICAL_DISK_CHANGED",
  });
  return { changed: true, paths };
}

export function startHqCanonicalDiskWatch(): void {
  if (started || process.env.VITEST) return;
  started = true;
  for (const path of watchedPaths()) {
    const current = stampOf(path);
    if (current) stamps.set(path, current);
    if (!existsSync(path)) continue;
    try {
      const watcher = watch(path, () => {
        reconcileHqCanonicalDisk();
      });
      if (typeof watcher.unref === "function") watcher.unref();
      watchers.push(watcher);
    } catch {
      // Windows can fail watch on a file that is being rewritten; mtime poll remains.
    }
  }
  timer = setInterval(() => {
    reconcileHqCanonicalDisk();
  }, HQ_CANONICAL_WATCH_INTERVAL_MS);
  if (typeof timer.unref === "function") timer.unref();
}

export function stopHqCanonicalDiskWatch(): void {
  started = false;
  for (const watcher of watchers) {
    try {
      watcher.close();
    } catch {
      // ignore
    }
  }
  watchers = [];
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  stamps.clear();
}
