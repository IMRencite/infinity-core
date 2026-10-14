export const VENTURE_VALIDATION_STAGNATION_GUARD_V1 = "VENTURE_VALIDATION_STAGNATION_GUARD_V1" as const;

export const VALIDATION_MAX_ATTEMPTS = 3;
export const VALIDATION_MIN_RETRY_MS = 7 * 24 * 60 * 60 * 1000;
export const VALIDATION_STAGNATION_NOVEL_EVIDENCE_ROUNDS = 2;

export type StagnationAssessment = {
  stagnant: boolean;
  reason: string | null;
  next_eligible_at: string | null;
};

export function assessValidationStagnation(input: {
  validation_attempts: number;
  rounds_without_novel_evidence: number;
  last_validated_at: string | null;
}): StagnationAssessment {
  if (input.validation_attempts >= VALIDATION_MAX_ATTEMPTS) {
    return {
      stagnant: true,
      reason: `Max validation attempts (${VALIDATION_MAX_ATTEMPTS}) reached.`,
      next_eligible_at: null,
    };
  }
  if (input.rounds_without_novel_evidence >= VALIDATION_STAGNATION_NOVEL_EVIDENCE_ROUNDS) {
    return {
      stagnant: true,
      reason: "No meaningful novel evidence across consecutive revalidation rounds.",
      next_eligible_at: null,
    };
  }
  const last = input.last_validated_at ? new Date(input.last_validated_at).getTime() : 0;
  const nextEligible = last ? new Date(last + VALIDATION_MIN_RETRY_MS).toISOString() : new Date().toISOString();
  return { stagnant: false, reason: null, next_eligible_at: nextEligible };
}

export function isDueForRevalidation(nextEligibleAt: string | null, now = Date.now()): boolean {
  if (!nextEligibleAt) return false;
  return now >= new Date(nextEligibleAt).getTime();
}
