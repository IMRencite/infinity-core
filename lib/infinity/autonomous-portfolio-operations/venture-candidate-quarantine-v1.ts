import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { writeLocalJsonIfDurable } from "@/lib/infinity/hq-production-deployment/ephemeral-fs";

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

export function candidateQuarantineKey(input: { venture_id: string; slug?: string | null; concept_id?: string | null; gap_id?: string | null }): string {
  if (input.concept_id) return `concept:${input.concept_id}`;
  if (input.slug) return `slug:${input.slug}`;
  if (input.gap_id) return `gap:${input.gap_id}`;
  return "unknown";
}

export function isCandidateQuarantined(input: {
  venture_id: string;
  candidate_key: string;
  operating_day_utc?: string;
}): boolean {
  void input.operating_day_utc;
  return loadStore().some(
    (r) =>
      r.venture_id === input.venture_id &&
      r.candidate_key === input.candidate_key &&
      r.terminal_state === CANDIDATE_TERMINAL_STATE_QUARANTINED &&
      r.explicit_requalification_required === true,
  );
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
  return record;
}

export function listQuarantinedCandidatesForVenture(venture_id: string, operating_day_utc?: string): QuarantinedCandidateRecord[] {
  void operating_day_utc;
  return loadStore().filter(
    (r) => r.venture_id === venture_id && r.terminal_state === CANDIDATE_TERMINAL_STATE_QUARANTINED,
  );
}

export function countQuarantinedCandidatesForVenture(venture_id: string, operating_day_utc?: string): number {
  return listQuarantinedCandidatesForVenture(venture_id, operating_day_utc).length;
}

/** Test-only reset */
export function resetCandidateQuarantineStoreForTests(): void {
  memoryStore = [];
  writeLocalJsonIfDurable(QUARANTINE_PATH, { records: [], updated_at: new Date().toISOString() });
}
