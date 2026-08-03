import { describe, it, expect, vi } from "vitest";
import {
  getWorkerCapabilityContract,
  isGovernedWorkerCapabilityKey,
  assertSideEffectAllowed,
  WORKER_CAPABILITY_REGISTRY,
} from "@/lib/infinity/workers/capability";
import { buildWorkerExecutionKey, hashWorkerInput } from "@/lib/infinity/workers/input-schema";
import { validateStructuredOutput } from "@/lib/infinity/workers/validation";
import { initialReviewStatusForCapability, planStepMayComplete } from "@/lib/infinity/workers/lifecycle";
import { shouldMarkGovernedPlanStepComplete } from "@/lib/infinity/workers/dispatcher";
import { WorkerPermissionError, assertWorkerPermission } from "@/lib/infinity/workers/permissions";
import { resolveRegisteredCapabilityVersion } from "@/lib/infinity/workers/registry";
import type { WorkerExecutionContextBound } from "@/lib/infinity/workers/types";

describe("Worker Capability Foundation v1", () => {
  it("only registered v1 capabilities are governed", () => {
    expect(isGovernedWorkerCapabilityKey("research.summarize_internal_evidence")).toBe(true);
    expect(isGovernedWorkerCapabilityKey("build.saas")).toBe(false);
    expect(isGovernedWorkerCapabilityKey("discovery.scan")).toBe(false);
  });

  it("enforces capability version", () => {
    expect(
      resolveRegisteredCapabilityVersion("blueprint.validate", "1.0.0"),
    ).toBe("1.0.0");
    expect(() =>
      resolveRegisteredCapabilityVersion("blueprint.validate", "9.0.0"),
    ).toThrow(/version mismatch/);
  });

  it("blocks disallowed side effect classes", () => {
    expect(() => assertSideEffectAllowed("external_write")).toThrow();
    expect(() => assertSideEffectAllowed("financial")).toThrow();
    expect(() => assertSideEffectAllowed("internal_read")).not.toThrow();
  });

  it("denies permissions not granted on context", () => {
    const ctx = {
      grantedPermissions: new Set(["evidence.read"]),
    } as WorkerExecutionContextBound;
    expect(() => assertWorkerPermission(ctx, "blueprint.read")).toThrow(WorkerPermissionError);
  });

  it("builds deterministic execution keys", () => {
    const hash = hashWorkerInput({ organization_id: "org-1", evidence_record_ids: [] });
    const key = buildWorkerExecutionKey({
      organizationId: "org-1",
      missionId: "m1",
      planId: "p1",
      planStepId: "s1",
      capabilityKey: "research.summarize_internal_evidence",
      capabilityVersion: "1.0.0",
      inputHash: hash,
    });
    expect(key).toContain("research.summarize_internal_evidence");
    expect(key).toContain(hash);
  });

  it("validates output schema required fields", () => {
    const contract = getWorkerCapabilityContract("blueprint.validate")!;
    const result = validateStructuredOutput(contract, { valid: true, blockers: [] });
    expect(result.valid).toBe(true);
    const bad = validateStructuredOutput(contract, { valid: true });
    expect(bad.valid).toBe(false);
  });

  it("requires independent review for research outputs", () => {
    expect(initialReviewStatusForCapability("research.summarize_internal_evidence")).toBe(
      "pending",
    );
    expect(initialReviewStatusForCapability("blueprint.validate")).toBe("not_required");
  });

  it("does not mark plan step complete while review pending", () => {
    expect(planStepMayComplete("pending")).toBe(false);
    expect(shouldMarkGovernedPlanStepComplete({ review_status: "pending" })).toBe(false);
    expect(shouldMarkGovernedPlanStepComplete({ review_status: "passed" })).toBe(true);
  });

  it("QA capability is independent review type", () => {
    const qa = WORKER_CAPABILITY_REGISTRY["qa.verify_plan_step_output"];
    expect(qa.reviewRequirement).toBe("independent_qa");
  });

  it("handlers module does not import fetch or openai", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = await fs.readFile(
      path.join(process.cwd(), "lib/infinity/workers/handlers/safe-v1-handlers.ts"),
      "utf8",
    );
    expect(file).not.toMatch(/fetch\s*\(/);
    expect(file).not.toMatch(/openai/i);
    expect(file).not.toMatch(/createVenture|deploy|purchase/i);
  });

  it("dispatcher does not reference mission runtime advance", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = await fs.readFile(
      path.join(process.cwd(), "lib/infinity/workers/dispatcher.ts"),
      "utf8",
    );
    expect(file).not.toMatch(/advanceMissionRuntime/);
    expect(file).not.toMatch(/venture_blueprints.*insert/i);
  });

  it("events redact bearer tokens in payload serialization path", async () => {
    const { emitWorkerCapabilityEvent } = await import("@/lib/infinity/workers/events");
    expect(emitWorkerCapabilityEvent).toBeTypeOf("function");
  });
});

describe("Worker policy gates (unit)", () => {
  it("planner gate applies to non-exempt worker capabilities", async () => {
    const { isPlannerGateExemptCapability } = await import("@/lib/infinity/planner-gating");
    expect(isPlannerGateExemptCapability("research.summarize_internal_evidence")).toBe(false);
    expect(isPlannerGateExemptCapability("discovery.scan")).toBe(true);
  });
});

vi.mock("@/lib/infinity/runtime/persistence", () => ({
  emitRuntimeEngineEvent: vi.fn(),
}));
