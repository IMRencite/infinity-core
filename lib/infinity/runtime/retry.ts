import type { FailureClass } from "./types";

const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EAI_AGAIN",
]);

export function calculateBackoffMs(attemptNumber: number): number {
  switch (attemptNumber) {
    case 1:
      return 60_000;
    case 2:
      return 5 * 60_000;
    case 3:
      return 15 * 60_000;
    default:
      return 60 * 60_000;
  }
}

export function calculateNextAttemptAt(attemptNumber: number, from = new Date()): string {
  return new Date(from.getTime() + calculateBackoffMs(attemptNumber)).toISOString();
}

export function defaultClassifyFailure(error: unknown): FailureClass {
  if (error instanceof Error) {
    if (error.name === "WorkerTimeoutError") {
      return "timeout";
    }

    if (error.name === "WorkerCancellationError") {
      return "cancellation";
    }

    const code = (error as Error & { code?: string }).code;
    if (code && RETRYABLE_CODES.has(code)) {
      return "retryable";
    }

    if (/temporary|retry|timeout|unavailable/i.test(error.message)) {
      return "retryable";
    }

    if (/invalid|not found|permission|forbidden|validation/i.test(error.message)) {
      return "non_retryable";
    }
  }

  return "retryable";
}

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as Error & { code?: string }).code ?? null,
    };
  }

  return {
    message: String(error),
  };
}
