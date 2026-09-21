export type PoolAdequacyLevel = "ADEQUATE" | "LIMITED" | "THIN";

export function assessCandidatePoolAdequacy(candidateCount: number): PoolAdequacyLevel {
  if (candidateCount >= 8) return "ADEQUATE";
  if (candidateCount >= 5) return "LIMITED";
  return "THIN";
}

export function isTechnicalStrategyFailure(message: string): boolean {
  return (
    /validated source URLs|references URL not present in grounding metadata|evidence validation|grounding metadata missing|grounding unavailable|schema validation|malformed response/i.test(
      message,
    )
  );
}

export function isEvidenceValidationFailure(message: string, classification?: string | null): boolean {
  return (
    classification === "evidence_validation_failure" ||
    /validated source URLs|references URL not present in grounding metadata/i.test(message)
  );
}

export function shouldAttemptPoolRecovery(input: {
  candidateCount: number;
  technicalStrategyFailures: string[];
  researchCallsRemaining: number;
  poolRecoveryAttempted: boolean;
}): boolean {
  return (
    !input.poolRecoveryAttempted &&
    assessCandidatePoolAdequacy(input.candidateCount) === "THIN" &&
    input.technicalStrategyFailures.length > 0 &&
    input.researchCallsRemaining > 0
  );
}
