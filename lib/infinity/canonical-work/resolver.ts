import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { sourceLabel } from "./rooms";
import { pickCurrentCanonicalWork, pickLatestCompletedCanonicalWork } from "./rows";
import { listCanonicalWork } from "./store";
import type { CanonicalActiveWorkProjection, CanonicalWorkExecutionContract } from "./types";

export {
  compactCanonicalWorkRows,
  pickCurrentCanonicalWork,
  pickLatestCompletedCanonicalWork,
  TERMINAL_WORK_STATUSES,
} from "./rows";

export function canonicalVersionForWork(
  work: CanonicalWorkExecutionContract | null,
  generatedAt = new Date().toISOString(),
): string {
  return [
    work?.work_id ?? "idle",
    work?.status ?? "IDLE",
    work?.updated_at ?? "",
    work?.latest_output ?? "",
    generatedAt,
  ].join(":");
}

function withLatestCompleted(
  projection: CanonicalActiveWorkProjection,
  latest: CanonicalWorkExecutionContract | null,
): CanonicalActiveWorkProjection {
  return {
    ...projection,
    latest_completed_work_id: latest?.work_id ?? null,
    latest_completed_title: latest?.title ?? null,
    latest_completed_at: latest?.completed_at ?? latest?.updated_at ?? null,
    latest_completed_output: latest?.latest_output ?? null,
  };
}

export function projectCanonicalActiveWork(
  work: CanonicalWorkExecutionContract | null,
  generatedAt = new Date().toISOString(),
  latestCompleted: CanonicalWorkExecutionContract | null = null,
): CanonicalActiveWorkProjection {
  if (!work || work.status !== "ACTIVE") {
    return withLatestCompleted({
      work_id: null,
      venture_id: null,
      venture_name: null,
      mission_title: null,
      mission_type: null,
      stage: null,
      status: "IDLE",
      current_task: null,
      active_rooms: [],
      active_workers: [],
      source: "NONE",
      started_at: null,
      updated_at: null,
      completed_at: null,
      latest_output: null,
      execution_source: "NONE",
      freshness: "IDLE",
      canonical_version: canonicalVersionForWork(null, generatedAt),
      work: null,
      latest_completed_work_id: null,
      latest_completed_title: null,
      latest_completed_at: null,
      latest_completed_output: null,
    }, latestCompleted);
  }
  return withLatestCompleted({
    work_id: work.work_id,
    venture_id: work.venture_id,
    venture_name: work.venture_id === CRE_VENTURE_ID || /occupancy/i.test(work.venture_id ?? "")
      ? "OccupancyNPV"
      : work.venture_id,
    mission_title: work.title,
    mission_type: work.work_type,
    stage: work.stage,
    status: work.status,
    current_task: work.description,
    active_rooms: work.assigned_rooms,
    active_workers: work.assigned_workers,
    source: work.source,
    started_at: work.started_at,
    updated_at: work.updated_at,
    completed_at: work.completed_at,
    latest_output: work.latest_output,
    execution_source: sourceLabel(work.source),
    freshness: "CURRENT",
    canonical_version: canonicalVersionForWork(work, generatedAt),
    work,
    latest_completed_work_id: null,
    latest_completed_title: null,
    latest_completed_at: null,
    latest_completed_output: null,
  }, latestCompleted);
}

export function resolveCurrentCanonicalWork(
  generatedAt = new Date().toISOString(),
): CanonicalActiveWorkProjection {
  const rows = listCanonicalWork();
  return projectCanonicalActiveWork(
    pickCurrentCanonicalWork(rows),
    generatedAt,
    pickLatestCompletedCanonicalWork(rows),
  );
}
