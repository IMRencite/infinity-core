import { extractThrownCode, extractThrownMessage } from "@/lib/infinity/shared/extract-thrown-message";

export class OpportunityScannerError extends Error {
  readonly classification: string;
  readonly errorCode: string | null;

  constructor(message: string, classification: string, errorCode: string | null = null) {
    super(message);
    this.name = "OpportunityScannerError";
    this.classification = classification;
    this.errorCode = errorCode;
  }
}

export function classifyScannerFailure(error: unknown): OpportunityScannerError {
  if (error instanceof OpportunityScannerError) return error;

  const message = extractThrownMessage(error);
  const errorCode = extractThrownCode(error);

  if (errorCode === "PGRST002" || /schema cache|PGRST002/i.test(message)) {
    return new OpportunityScannerError(message, "infrastructure_blocked", errorCode ?? "PGRST002");
  }
  if (
    errorCode === "57014" ||
    /statement timeout|canceling statement due to statement timeout/i.test(message)
  ) {
    return new OpportunityScannerError(message, "infrastructure_blocked", errorCode ?? "57014");
  }
  if (/budget|cost|limit exceeded/i.test(message)) {
    return new OpportunityScannerError(message, "budget_exceeded", errorCode);
  }
  if (/grounding unavailable|missing grounding|ungrounded research/i.test(message)) {
    return new OpportunityScannerError(message, "grounding_unavailable", errorCode);
  }
  if (/validated source URLs|references URL not present in grounding metadata|evidence validation/i.test(message)) {
    return new OpportunityScannerError(message, "evidence_validation_failure", errorCode);
  }
  if (/schema|validation|malformed|PGRST/i.test(message)) {
    return new OpportunityScannerError(message, "schema_validation_failure", errorCode);
  }
  if (/timeout|timed out|abort/i.test(message)) {
    return new OpportunityScannerError(message, "timeout", errorCode);
  }
  if (/persist|duplicate key|violates|constraint|23505|23503|42501/i.test(message)) {
    return new OpportunityScannerError(message, "persistence_failure", errorCode);
  }
  return new OpportunityScannerError(message, "scanner_unavailable", errorCode);
}
