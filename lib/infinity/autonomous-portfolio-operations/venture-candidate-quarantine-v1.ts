import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { writeLocalJsonIfDurable } from "@/lib/infinity/hq-production-deployment/ephemeral-fs";
import {
  countQuarantinedCandidatesInCacheForVenture,
  durableCandidateStateFailClosedRequired,
  hydratePortfolioCandidateQuarantineCache,
  isPortfolioCandidateQuarantinedInCache,
  resetPortfolioCandidateQuarantineCacheForTests,
  upsertPortfolioCandidateQuarantine,
  type PortfolioCandidateLane,
} from "./durable/durable-portfolio-candidate-state-v1";

export const CANDIDATE_RETRY_BUDGET = 3 as const;
export const CANDIDATE_TERMINAL_STATE_QUARANTINED = "QUARANTINED_QC_EXHAUSTED" as const;

export type QuarantinedCandidateFailureClass = "QC_EXHAUSTED" | "EDITORIAL_QC" | "ART_QC" | "STOREFRONT_QC";

export type QuarantinedCandidateRecord = {
  venture_id: string;
  candidate_key: string;
  terminal_state: typeof CANDIDATE_TERMINAL_STATE_QUARANTINED;
  failure_class: QuarantinedCandidateFailureClass;
  failure_reasons: string[];
  attempt_count: number;
  last_qc_reason: string;
  quarantined_at: string;
  operating_day_utc: string;
  explicit_requalification_required: true;
};

const QUARANTINE_PATH = ".infinity/portfolio-operations/candidate-quarantine-v1.json";

let memoryStore: QuarantinedCandidateRecord[] = [];

function operatingDayUtc(iso = new Date().toISOString()): string {
  return iso.slice(0, 10);
}

function loadStore(): QuarantinedCandidateRecord[] {
  const path = join(process.cwd(), QUARANTINE_PATH);
  if (existsSync(path)) {
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as { records?: QuarantinedCandidateRecord[] };
      if (Array.isArray(raw.records)) return raw.records;
    } catch {
      /* fall through */
    }
  }
  return memoryStore;
}

function persistStore(records: QuarantinedCandidateRecord[]): void {
  memoryStore = records;
  writeLocalJsonIfDurable(QUARANTINE_PATH, { records, updated_at: new Date().toISOString() });
}

export function candidateQuarantineKey(input: {
  venture_id: string;
  slug?: string | null;
  concept_id?: string | null;
  gap_id?: string | null;
}): string {
  if (input.concept_id) return `concept:${input.concept_id}`;
  if (input.slug) return `slug:${input.slug}`;
  if (input.gap_id) return `gap:${input.gap_id}`;
  return "unknown";
}

export function candidateQuarantineLane(input: {
  slug?: string | null;
  concept_id?: string | null;
  gap_id?: string | null;
}): PortfolioCandidateLane {
  if (input.concept_id) return "SHIRT_CONCEPT";
  if (input.gap_id) return "AUTHORITY_GAP";
  return "CONTENT_SLUG";
}

export function isCandidateQuarantined(input: {
  venture_id: string;
  candidate_key: string;
  operating_day_utc?: string;
  lane?: PortfolioCandidateLane;
}): boolean {
  void input.operating_day_utc;
  const lane = input.lane ?? (input.candidate_key.startsWith("concept:") ? "SHIRT_CONCEPT" : "CONTENT_SLUG");
  if (
    isPortfolioCandidateQuarantinedInCache({
      venture_id: input.venture_id,
      lane,
      candidate_key: input.candidate_key,
    })
  ) {
    return true;
  }
  if (durableCandidateStateFailClosedRequired()) {
    return false;
  }
  return loadStore().some(
    (r) =>
      r.venture_id === input.venture_id &&
      r.candidate_key === input.candidate_key &&
      r.terminal_state === CANDIDATE_TERMINAL_STATE_QUARANTINED &&
      r.explicit_requalification_required === true,
  );
}

export async function quarantineCandidateQcExhaustedAsync(input: {
  venture_id: string;
  candidate_key: string;
  failure_reasons: string[];
  attempt_count?: number;
  failure_class?: QuarantinedCandidateFailureClass;
  now?: string;
  last_cycle_id?: string | null;
  last_release_sha?: string | null;
  lane?: PortfolioCandidateLane;
}): Promise<QuarantinedCandidateRecord> {
  const record = quarantineCandidateQcExhausted(input);
  const lane = input.lane ?? (input.candidate_key.startsWith("concept:") ? "SHIRT_CONCEPT" : "CONTENT_SLUG");
  await upsertPortfolioCandidateQuarantine({
    venture_id: input.venture_id,
    lane,
    candidate_key: input.candidate_key,
    failure_class: input.failure_class ?? "QC_EXHAUSTED",
    failure_reasons: input.failure_reasons,
    attempt_count: input.attempt_count ?? CANDIDATE_RETRY_BUDGET,
    last_cycle_id: input.last_cycle_id ?? null,
    last_release_sha: input.last_release_sha ?? null,
    now: input.now,
  });
  return record;
}

export function quarantineCandidateQcExhausted(input: {
  venture_id: string;
  candidate_key: string;
  failure_reasons: string[];
  attempt_count?: number;
  failure_class?: QuarantinedCandidateFailureClass;
  now?: string;
}): QuarantinedCandidateRecord {
  const now = input.now ?? new Date().toISOString();
  const lastReason = input.failure_reasons[input.failure_reasons.length - 1] ?? "QC_EXHAUSTED";
  const record: QuarantinedCandidateRecord = {
    venture_id: input.venture_id,
    candidate_key: input.candidate_key,
    terminal_state: CANDIDATE_TERMINAL_STATE_QUARANTINED,
    failure_class: input.failure_class ?? "QC_EXHAUSTED",
    failure_reasons: input.failure_reasons,
    attempt_count: input.attempt_count ?? CANDIDATE_RETRY_BUDGET,
    last_qc_reason: lastReason,
    quarantined_at: now,
    operating_day_utc: operatingDayUtc(now),
    explicit_requalification_required: true,
  };
  const records = loadStore().filter(
    (r) => !(r.venture_id === record.venture_id && r.candidate_key === record.candidate_key),
  );
  records.push(record);
  persistStore(records);
  const lane = input.candidate_key.startsWith("concept:") ? "SHIRT_CONCEPT" : "CONTENT_SLUG";
  hydratePortfolioCandidateQuarantineCache([
    {
      venture_id: record.venture_id,
      lane,
      candidate_key: record.candidate_key,
      revision_identity: null,
      terminal_state: "QUARANTINED_QC_EXHAUSTED",
      failure_class: record.failure_class,
      attempt_count: record.attempt_count,
      failure_reasons: record.failure_reasons,
      quarantine_reason: lastReason,
      quarantined_at: now,
      last_cycle_id: null,
      last_release_sha: null,
      payload: {},
      updated_at: now,
    },
  ]);
  return record;
}

export function listQuarantinedCandidatesForVenture(venture_id: string, operating_day_utc?: string): QuarantinedCandidateRecord[] {
  void operating_day_utc;
  return loadStore().filter(
    (r) => r.venture_id === venture_id && r.terminal_state === CANDIDATE_TERMINAL_STATE_QUARANTINED,
  );
}

export function countQuarantinedCandidatesForVenture(venture_id: string, operating_day_utc?: string): number {
  const memoryCount = listQuarantinedCandidatesForVenture(venture_id, operating_day_utc).length;
  if (memoryCount > 0) return memoryCount;
  return countQuarantinedCandidatesInCacheForVenture(venture_id);
}

/** Test-only reset of process-local JSON/memory (simulates new invocation without durable cache). */
export function resetCandidateQuarantineMemoryStoreForTests(): void {
  memoryStore = [];
  writeLocalJsonIfDurable(QUARANTINE_PATH, { records: [], updated_at: new Date().toISOString() });
}

/** Test-only full reset */
export function resetCandidateQuarantineStoreForTests(): void {
  resetCandidateQuarantineMemoryStoreForTests();
  resetPortfolioCandidateQuarantineCacheForTests();
}
