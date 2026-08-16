export class CreativeMediaEngineError extends Error {
  constructor(
    message: string,
    readonly classification:
      | "validation_failed"
      | "policy_blocked"
      | "provider_unavailable"
      | "economics_blocked"
      | "quality_blocked"
      | "budget_exceeded"
      | "persistence_failed"
      | "unknown",
  ) {
    super(message);
    this.name = "CreativeMediaEngineError";
  }
}

export function classifyCreativeMediaFailure(error: unknown): string {
  if (error instanceof CreativeMediaEngineError) return error.classification;
  if (error instanceof Error) {
    if (/provider|credential|api key/i.test(error.message)) return "provider_unavailable";
    if (/budget|cost/i.test(error.message)) return "budget_exceeded";
    if (/quality|blocked/i.test(error.message)) return "quality_blocked";
    if (/econom/i.test(error.message)) return "economics_blocked";
  }
  return "unknown";
}
