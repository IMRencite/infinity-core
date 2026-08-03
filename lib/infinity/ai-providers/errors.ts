import type { ProviderErrorCode } from "./constants";

export class AiProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly retryable: boolean;
  readonly providerId: string | null;

  constructor(
    message: string,
    code: ProviderErrorCode,
    options?: { retryable?: boolean; providerId?: string | null },
  ) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.providerId = options?.providerId ?? null;
  }
}

export function isAiProviderError(error: unknown): error is AiProviderError {
  return error instanceof AiProviderError;
}
