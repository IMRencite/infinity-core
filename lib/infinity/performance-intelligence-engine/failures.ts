export class PerformanceIntelligenceError extends Error {
  constructor(
    message: string,
    readonly classification: string,
  ) {
    super(message);
    this.name = "PerformanceIntelligenceError";
  }
}

export function classifyPerformanceIntelligenceFailure(error: unknown): string {
  if (error instanceof PerformanceIntelligenceError) return error.classification;
  if (error instanceof Error && /policy|blocked/i.test(error.message)) return "policy_blocked";
  if (error instanceof Error && /insufficient evidence/i.test(error.message)) return "insufficient_evidence";
  return "execution_failure";
}
