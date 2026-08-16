export class OpportunityScannerError extends Error {
  readonly classification: string;

  constructor(message: string, classification: string) {
    super(message);
    this.name = "OpportunityScannerError";
    this.classification = classification;
  }
}

export function classifyScannerFailure(error: unknown): OpportunityScannerError {
  if (error instanceof OpportunityScannerError) return error;
  const message = error instanceof Error ? error.message : "Unknown scanner failure.";
  if (/budget|cost|limit exceeded/i.test(message)) {
    return new OpportunityScannerError(message, "budget_exceeded");
  }
  if (/grounding unavailable|missing grounding/i.test(message)) {
    return new OpportunityScannerError(message, "grounding_unavailable");
  }
  if (/schema|validation|malformed/i.test(message)) {
    return new OpportunityScannerError(message, "schema_validation_failure");
  }
  return new OpportunityScannerError(message, "scanner_unavailable");
}
