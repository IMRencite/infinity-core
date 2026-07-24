import { describe, expect, it } from "vitest";
import {
  calculateBackoffMs,
  calculateNextAttemptAt,
  defaultClassifyFailure,
} from "../retry";
import { WorkerTimeoutError } from "../workers/discovery-scan-worker";

describe("calculateBackoffMs", () => {
  it("uses deterministic v1 backoff schedule", () => {
    expect(calculateBackoffMs(1)).toBe(60_000);
    expect(calculateBackoffMs(2)).toBe(300_000);
    expect(calculateBackoffMs(3)).toBe(900_000);
    expect(calculateBackoffMs(4)).toBe(3_600_000);
  });
});

describe("calculateNextAttemptAt", () => {
  it("schedules the next attempt from a fixed timestamp", () => {
    const from = new Date("2026-07-23T12:00:00.000Z");
    expect(calculateNextAttemptAt(1, from)).toBe("2026-07-23T12:01:00.000Z");
    expect(calculateNextAttemptAt(2, from)).toBe("2026-07-23T12:05:00.000Z");
  });
});

describe("defaultClassifyFailure", () => {
  it("classifies worker timeouts", () => {
    expect(defaultClassifyFailure(new WorkerTimeoutError())).toBe("timeout");
  });

  it("classifies validation failures as non-retryable", () => {
    expect(defaultClassifyFailure(new Error("validation failed"))).toBe(
      "non_retryable",
    );
  });

  it("defaults unknown errors to retryable", () => {
    expect(defaultClassifyFailure(new Error("temporary upstream failure"))).toBe(
      "retryable",
    );
  });
});
