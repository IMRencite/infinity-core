export class OpenAiProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, options?: { retryable?: boolean }) {
    super(message);
    this.name = "OpenAiProviderError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
  }
}

export function classifyOpenAiError(error: unknown): OpenAiProviderError {
  if (error instanceof OpenAiProviderError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "OpenAI request failed.";

  if (/timeout|timed out/i.test(message)) {
    return new OpenAiProviderError(message, "timeout", { retryable: true });
  }

  if (/rate limit|429/i.test(message)) {
    return new OpenAiProviderError(message, "rate_limit", { retryable: true });
  }

  if (/invalid|schema|validation|malformed/i.test(message)) {
    return new OpenAiProviderError(message, "invalid_response", { retryable: false });
  }

  return new OpenAiProviderError(message, "provider_unavailable", { retryable: true });
}
