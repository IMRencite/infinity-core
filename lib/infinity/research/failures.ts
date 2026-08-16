export class ResearchError extends Error {
  readonly classification: import("./constants").ResearchFailureClassification;
  readonly retryable: boolean;

  constructor(
    message: string,
    classification: import("./constants").ResearchFailureClassification,
    options?: { retryable?: boolean },
  ) {
    super(message);
    this.name = "ResearchError";
    this.classification = classification;
    this.retryable = options?.retryable ?? false;
  }
}

export function classifyResearchFailure(error: unknown): ResearchError {
  if (error instanceof ResearchError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "Unknown research failure.";

  if (/401|403|authentication|api key|invalid api key/i.test(message)) {
    return new ResearchError(message, "authentication_failure");
  }
  if (/404|not found|no longer available|unsupported model/i.test(message)) {
    return new ResearchError(message, "unsupported_model");
  }
  if (/429|rate limit|quota|resource exhausted|credits/i.test(message)) {
    return new ResearchError(message, /quota|credits/i.test(message) ? "quota_exhausted" : "rate_limit", {
      retryable: true,
    });
  }
  if (/timeout|timed out/i.test(message)) {
    return new ResearchError(message, "timeout", { retryable: true });
  }
  if (/grounding unavailable|no grounding|missing grounding/i.test(message)) {
    return new ResearchError(message, "grounding_unavailable");
  }
  if (/schema|validation|malformed|invalid source url|grounded requires/i.test(message)) {
    return new ResearchError(message, "schema_validation_failure");
  }
  if (/budget|cost|policy/i.test(message)) {
    return new ResearchError(message, "budget_exceeded");
  }

  if (/GEMINI_API_KEY|GOOGLE_API_KEY|required when RESEARCH_PROVIDER/i.test(message)) {
    return new ResearchError(message, "authentication_failure");
  }

  return new ResearchError(message, "unknown_provider_failure", { retryable: true });
}

export function isRetryableResearchError(error: unknown): boolean {
  return error instanceof ResearchError && error.retryable;
}
