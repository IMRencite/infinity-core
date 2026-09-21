import { LOCKED_CRE_EXPERIMENT_ID, LOCKED_SUCCESS_CRITERIA } from "./constants";
import { getEvidenceCollectionStart } from "./runtime-state";

export const CANONICAL_EVIDENCE_START = "2026-08-29T15:18:52.131Z" as const;
export const MS_PER_DAY = 86_400_000;

export type ExperimentClock = {
  evidenceStart: typeof CANONICAL_EVIDENCE_START;
  deadline: string;
  maxDurationDays: typeof LOCKED_SUCCESS_CRITERIA.maxDurationDays;
  daysElapsed: number;
  daysRemaining: number;
  windowExpired: boolean;
  restarted: false;
};

export function canonicalEvidenceStart(): typeof CANONICAL_EVIDENCE_START {
  const stored = getEvidenceCollectionStart(LOCKED_CRE_EXPERIMENT_ID);
  if (stored && stored !== CANONICAL_EVIDENCE_START) {
    return CANONICAL_EVIDENCE_START;
  }
  return CANONICAL_EVIDENCE_START;
}

export function experimentDeadline(start = canonicalEvidenceStart()): string {
  return new Date(Date.parse(start) + LOCKED_SUCCESS_CRITERIA.maxDurationDays * MS_PER_DAY).toISOString();
}

export function inspectExperimentClock(now = new Date()): ExperimentClock {
  const evidenceStart = canonicalEvidenceStart();
  const deadline = experimentDeadline(evidenceStart);
  const elapsedMs = Math.max(0, now.getTime() - Date.parse(evidenceStart));
  const daysElapsed = Math.floor(elapsedMs / MS_PER_DAY);
  const daysRemaining = Math.max(0, LOCKED_SUCCESS_CRITERIA.maxDurationDays - daysElapsed);
  return {
    evidenceStart,
    deadline,
    maxDurationDays: LOCKED_SUCCESS_CRITERIA.maxDurationDays,
    daysElapsed,
    daysRemaining,
    windowExpired: now.getTime() >= Date.parse(deadline),
    restarted: false,
  };
}
