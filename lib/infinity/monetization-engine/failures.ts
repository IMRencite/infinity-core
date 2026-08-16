export class MonetizationEngineError extends Error {
  classification: string;

  constructor(message: string, classification: string) {
    super(message);
    this.name = "MonetizationEngineError";
    this.classification = classification;
  }
}

export function classifyMonetizationFailure(error: unknown): MonetizationEngineError {
  if (error instanceof MonetizationEngineError) return error;
  const message = error instanceof Error ? error.message : "Unknown monetization engine failure.";
  if (/budget|cost limit/i.test(message)) {
    return new MonetizationEngineError(message, "budget_exceeded");
  }
  if (/disabled/i.test(message)) {
    return new MonetizationEngineError(message, "policy_blocked");
  }
  if (/schema|json|validation/i.test(message)) {
    return new MonetizationEngineError(message, "schema_validation_failure");
  }
  if (/candidate/i.test(message)) {
    return new MonetizationEngineError(message, "candidate_load_failure");
  }
  return new MonetizationEngineError(message, "analysis_failure");
}
