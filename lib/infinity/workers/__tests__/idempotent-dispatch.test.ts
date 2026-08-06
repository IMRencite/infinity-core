import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Json } from "@/lib/supabase/database.types";
import {
  buildIdempotentWorkerOutput,
  emitWorkerExecutionReused,
  isWorkerResultReusable,
  isIdempotentWorkerExecutionResult,
  returnIdempotentWorkerResultIfReusable,
} from "@/lib/infinity/workers/idempotent-reuse";
import type { PersistedWorkerResultRef } from "@/lib/infinity/workers/types";

const emitted: { eventType: string; payload: Record<string, unknown> }[] = [];

vi.mock("@/lib/infinity/workers/events", () => ({
  emitWorkerCapabilityEvent: vi.fn(
    async (_admin: unknown, input: { eventType: string; payload: Record<string, unknown> }) => {
      emitted.push({ eventType: input.eventType, payload: input.payload });
    },
  ),
}));

function sampleResult(overrides: Partial<PersistedWorkerResultRef> = {}): PersistedWorkerResultRef {
  return {
    id: "wr-1",
    status: "completed",
    reviewStatus: "passed",
    structuredOutput: { summary: "ok" } as Json,
    executionKey: "exec-key-1",
    completedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("worker idempotent reuse", () => {
  beforeEach(() => {
    emitted.length = 0;
  });

  it("first execution path is not reused (unit helpers)", () => {
    expect(isWorkerResultReusable(sampleResult({ reviewStatus: "pending", status: "needs_review" }))).toBe(
      true,
    );
    expect(isWorkerResultReusable(sampleResult({ reviewStatus: "failed", status: "completed" }))).toBe(
      false,
    );
  });

  it("duplicate reuse emits worker.execution_reused not worker.execution_completed", async () => {
    const existing = sampleResult();
    const admin = {} as never;
    const job = {
      id: "job-2",
      organization_id: "org-1",
      capability_key: "research.summarize_internal_evidence",
      correlation_id: "corr-dup",
      mission_id: "m1",
      plan_id: "p1",
      plan_step_id: "s1",
    } as never;
    const workerRun = { id: "run-2", attempt_number: 1 } as never;

    const result = await returnIdempotentWorkerResultIfReusable(admin, {
      job,
      workerRun,
      existing,
      capabilityVersion: "1.0.0",
      executionKey: existing.executionKey,
    });

    expect(result).not.toBeNull();
    expect(buildIdempotentWorkerOutput(existing).output).toEqual(result!.output);
    expect((result!.output as Record<string, unknown>).worker_result_id).toBe("wr-1");

    const completionEvents = emitted.filter((e) => e.eventType === "worker.execution_completed");
    const reuseEvents = emitted.filter((e) => e.eventType === "worker.execution_reused");
    expect(completionEvents).toHaveLength(0);
    expect(reuseEvents).toHaveLength(1);
    expect(reuseEvents[0]?.payload.worker_result_id).toBe("wr-1");
    expect(reuseEvents[0]?.payload.execution_key).toBe("exec-key-1");
  });

  it("emitWorkerExecutionReused includes capability metadata", async () => {
    await emitWorkerExecutionReused({} as never, {
      organizationId: "org-1",
      correlationId: "corr-1",
      job: {
        id: "j1",
        capability_key: "blueprint.validate",
        correlation_id: "corr-1",
      } as never,
      workerRun: { id: "r1" } as never,
      existing: sampleResult(),
      capabilityVersion: "1.0.0",
      executionKey: "exec-key-1",
    });

    expect(emitted[0]?.eventType).toBe("worker.execution_reused");
    expect(emitted[0]?.payload.capability_key).toBe("blueprint.validate");
    expect(emitted[0]?.payload.capability_version).toBe("1.0.0");
    expect(emitted[0]?.payload.original_completed_at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("detects idempotent worker execution results", () => {
    expect(
      isIdempotentWorkerExecutionResult({
        output: { worker_result_id: "x", idempotent: true },
        metrics: {},
      }),
    ).toBe(true);
    expect(
      isIdempotentWorkerExecutionResult({
        output: { worker_result_id: "x" },
        metrics: { idempotent: true },
      }),
    ).toBe(true);
    expect(
      isIdempotentWorkerExecutionResult({
        output: { worker_result_id: "x" },
      }),
    ).toBe(false);
  });
});

describe("validate-e2e guardrails", () => {
  it(
    "fails closed in production without override",
    async () => {
      const { assertWorkerE2EAllowed } = await import("@/lib/infinity/workers/validate-e2e");
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      delete process.env.ALLOW_WORKER_E2E;
      expect(() => assertWorkerE2EAllowed()).toThrow(/development-only/i);
      process.env.NODE_ENV = prev;
    },
    30_000,
  );
});
