import { existsSync, readFileSync } from "node:fs";
import { AUTONOMOUS_LOOP_STATE_PATH } from "@/lib/infinity/autonomous-operating-loop/types";
import { CANONICAL_WORK_STORE_PATH } from "@/lib/infinity/canonical-work/store";
import { AUTONOMOUS_DAILY_OPERATING_LOOP_WORK_ID } from "@/lib/infinity/canonical-work/seed";
import { VENTURE_OPERATING_SCALE_STATE_FILE } from "@/lib/infinity/venture-operating-scale/constants";
import {
  isCanonicalOperatingVenture,
  isValidCanonicalVenture,
} from "@/lib/infinity/venture-operating-scale/hq-venture-lifecycle";
import type { VentureOperationalRecord } from "@/lib/infinity/venture-operating-scale/types";
import type {
  InternalLoopObservation,
  InternalPublicObservation,
  InternalVentureObservation,
  InternalWorkObservation,
} from "./types";

function readJsonFile(path: string): unknown | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function isFixtureVenture(id: string, name: string): boolean {
  return /test|fixture|debug|synthetic/i.test(id) || /test|fixture|debug|synthetic/i.test(name);
}

export function observeVentureRecord(record: VentureOperationalRecord): InternalVentureObservation {
  const paused = record.venture_status === "PAUSED" || record.operating_stage === "PAUSED" || record.operating_stage === "SHUTTING_DOWN";
  const started = isValidCanonicalVenture(record) && record.venture_status !== "ARCHIVED" && !isFixtureVenture(record.venture_id, record.venture_name);
  const operating = started && !paused && isCanonicalOperatingVenture(record);
  return {
    private_venture_id: record.venture_id,
    private_name: record.venture_name,
    venture_status: record.venture_status,
    operating_stage: record.operating_stage,
    public_launch_state: record.public_launch_state,
    is_operating: operating,
    is_started: started,
    is_fixture: isFixtureVenture(record.venture_id, record.venture_name),
    has_active_artifact: Boolean(record.active_artifact && record.active_artifact !== "UNCONFIGURED"),
  };
}

export function loadInternalPublicObservation(input?: {
  now?: string;
  observation?: InternalPublicObservation;
}): InternalPublicObservation {
  if (input?.observation) return input.observation;
  const now = input?.now ?? new Date().toISOString();
  return {
    now,
    ventures: readVentureObservations(),
    work: readWorkObservations(),
    loop: readLoopObservation(now),
  };
}

function readVentureObservations(): InternalVentureObservation[] {
  const parsed = readJsonFile(VENTURE_OPERATING_SCALE_STATE_FILE) as { records?: VentureOperationalRecord[] } | null;
  return (parsed?.records ?? []).map(observeVentureRecord);
}

function readWorkObservations(): InternalWorkObservation[] {
  const parsed = readJsonFile(CANONICAL_WORK_STORE_PATH) as {
    executions?: Array<{
      work_id?: string;
      work_type?: string;
      status?: string;
      title?: string;
      classification?: string;
      completed_at?: string | null;
      started_at?: string | null;
    }>;
  } | null;
  return (parsed?.executions ?? [])
    .filter((row) => row.work_id && row.status && row.work_type)
    .map((row) => ({
      work_id: String(row.work_id),
      work_type: String(row.work_type),
      status: String(row.status),
      title: String(row.title ?? ""),
      classification: row.classification,
      completed_at: row.completed_at ?? null,
      started_at: row.started_at ?? null,
    }));
}

function readLoopObservation(now: string): InternalLoopObservation | null {
  const parsed = readJsonFile(AUTONOMOUS_LOOP_STATE_PATH) as {
    contract?: string;
    portfolio_state?: string;
    last_decision?: { outcome?: string; reason?: string } | null;
    last_completed_mission_id?: string | null;
    updated_at?: string | null;
  } | null;
  const work = readWorkObservations();
  const enabled = work.find((row) => row.work_id === AUTONOMOUS_DAILY_OPERATING_LOOP_WORK_ID && row.status === "COMPLETED");
  if (!parsed && !enabled) {
    return {
      portfolio_state: "IDLE_NO_ACTION",
      last_outcome: null,
      last_reason: null,
      last_completed_mission_id: null,
      updated_at: now,
      autonomous_enabled_at: null,
    };
  }
  return {
    portfolio_state: parsed?.portfolio_state ?? "IDLE_NO_ACTION",
    last_outcome: parsed?.last_decision?.outcome ?? null,
    last_reason: parsed?.last_decision?.reason ?? null,
    last_completed_mission_id: parsed?.last_completed_mission_id ?? null,
    updated_at: parsed?.updated_at ?? now,
    autonomous_enabled_at: enabled?.completed_at ?? null,
  };
}

