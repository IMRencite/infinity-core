import { OpenAiProviderError } from "@/lib/infinity/ai-providers/openai/errors";
import type { AiBrainFailureClassification } from "./constants";

export class AiBrainError extends Error {
  readonly classification: AiBrainFailureClassification;
  readonly retryable: boolean;

  constructor(
    message: string,
    classification: AiBrainFailureClassification,
    options?: { retryable?: boolean },
  ) {
    super(message);
    this.name = "AiBrainError";
    this.classification = classification;
    this.retryable = options?.retryable ?? false;
  }
}

export function classifyProviderFailure(error: unknown): AiBrainError {
  if (error instanceof AiBrainError) {
    return error;
  }

  if (error instanceof OpenAiProviderError) {
    const mapping: Record<string, AiBrainFailureClassification> = {
      provider_disabled: "provider_disabled",
      not_configured: "authentication_failure",
      timeout: "timeout",
      rate_limit: "rate_limit",
      invalid_response: "malformed_response",
      malformed_json: "malformed_response",
      validation_failed: "schema_validation_failure",
      provider_unavailable: "provider_unavailable",
      network_forbidden: "provider_disabled",
    };

    return new AiBrainError(error.message, mapping[error.code] ?? "provider_unavailable", {
      retryable: error.retryable,
    });
  }

  const message = error instanceof Error ? error.message : "Unknown AI Brain failure.";

  if (/budget|cost|policy/i.test(message)) {
    return new AiBrainError(message, "budget_rejection");
  }

  if (/unsupported model/i.test(message)) {
    return new AiBrainError(message, "unsupported_model");
  }

  if (/schema|validation|malformed|unsupported action|unsupported capability|prompt injection|forbidden execution/i.test(message)) {
    return new AiBrainError(message, "schema_validation_failure");
  }

  if (/timeout|timed out/i.test(message)) {
    return new AiBrainError(message, "timeout", { retryable: true });
  }

  if (/401|403|authentication|api key/i.test(message)) {
    return new AiBrainError(message, "authentication_failure");
  }

  if (/429|rate limit/i.test(message)) {
    return new AiBrainError(message, "rate_limit", { retryable: true });
  }

  return new AiBrainError(message, "provider_unavailable", { retryable: true });
}

export function isRetryableAiBrainError(error: unknown): boolean {
  return error instanceof AiBrainError && error.retryable;
}
