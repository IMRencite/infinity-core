import { AiProviderError } from "./errors";

export type RetryPolicy = {
  maxRetries: number;
  baseDelayMs: number;
};

export function defaultRetryPolicy(maxRetries = 2): RetryPolicy {
  return { maxRetries, baseDelayMs: 100 };
}

export function isRetryableProviderError(error: unknown): boolean {
  return error instanceof AiProviderError && error.retryable;
}

export async function withProviderRetry<T>(
  policy: RetryPolicy,
  operation: (attempt: number) => Promise<T>,
): Promise<{ result: T; retries: number }> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= policy.maxRetries; attempt += 1) {
    try {
      const result = await operation(attempt);
      return { result, retries: attempt };
    } catch (error) {
      lastError = error;
      if (!isRetryableProviderError(error) || attempt >= policy.maxRetries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, policy.baseDelayMs * (attempt + 1)));
    }
  }

  throw lastError;
}
