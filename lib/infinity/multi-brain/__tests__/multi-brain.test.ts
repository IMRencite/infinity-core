import { describe, it, expect } from "vitest";
import { classifyTask, computeTaskValueScore, routeTask, executeOrchestration, synthesizeMultiBrainOutputs } from "@/lib/infinity/multi-brain";
import { createFailingMockProvider, createMockBrainProvider } from "@/lib/infinity/multi-brain/providers/mock";
import { getAvailableModels, selectBestModel } from "@/lib/infinity/multi-brain/registry";

describe("Multi-Brain Orchestration v1", () => {
  it("registers models and selects by capability", () => {
    const models = getAvailableModels();
    expect(models.some((m) => m.provider === "mock")).toBe(true);
    const coding = selectBestModel({ coding: 1, structuredOutput: 0.5 });
    expect(coding.provider).toBe("mock");
  });

  it("routes simple tasks to SIMPLE strategy", () => {
    const decision = routeTask({
      taskType: "copy_generation",
      complexity: "low",
      economicImportance: 0.2,
      codingRequired: false,
    });
    expect(decision.strategy).toBe("SIMPLE");
    expect(decision.roles).toEqual(["primary"]);
  });

  it("escalates complex high-value tasks", () => {
    const decision = routeTask({
      taskType: "architecture_design",
      complexity: "high",
      economicImportance: 0.85,
      architectureRequired: true,
      implementationRisk: 0.8,
    });
    expect(["COMPLEX", "HIGH_VALUE", "CRITICAL"]).toContain(decision.strategy);
    expect(decision.roles.length).toBeGreaterThan(1);
  });

  it("executes multi-brain collaboration with synthesizer for complex tasks", async () => {
    const result = await executeOrchestration({
      organizationId: "org-test",
      idempotencyKey: "mb-complex-1",
      brainInput: {
        taskType: "creator_marketplace_architecture",
        prompt: "Design architecture for creator marketplace",
        context: {
          complexity: "high",
          architectureRequired: true,
          economicImportance: 0.75,
          implementationRisk: 0.7,
          codingRequired: true,
        },
      },
      providers: [createMockBrainProvider()],
    });
    expect(result.executions.length).toBeGreaterThan(1);
    expect(result.synthesis).not.toBeNull();
    expect(result.synthesis!.confidence).toBeGreaterThan(0);
  });

  it("does not invoke multiple brains for simple tasks", async () => {
    const result = await executeOrchestration({
      organizationId: "org-test",
      idempotencyKey: "mb-simple-1",
      brainInput: {
        taskType: "seo_metadata",
        prompt: "Generate SEO metadata",
        context: { complexity: "low", codingRequired: false, economicImportance: 0.2 },
      },
      providers: [createMockBrainProvider()],
    });
    expect(result.strategy).toBe("SIMPLE");
    expect(result.executions.filter((e) => e.role !== "primary")).toHaveLength(0);
  });

  it("persists disagreements via synthesizer output", () => {
    const primary = {
      provider: "mock",
      modelId: "mock-economical-v1",
      role: "primary" as const,
      content: "Use monolith",
      structured: {},
      confidence: 0.85,
      inputTokens: 100,
      outputTokens: 200,
      estimatedCostUsd: 0.001,
      latencyMs: 50,
      success: true,
    };
    const critic = {
      ...primary,
      role: "critic" as const,
      content: "Risk: scaling limits",
      structured: { risks: ["scaling"], contradictsPrimary: false },
      confidence: 0.78,
    };
    const synthesis = synthesizeMultiBrainOutputs({
      taskType: "architecture",
      primary,
      specialists: [],
      critics: [critic],
      reviewers: [],
      constraints: ["sandbox billing only"],
      taskCharacteristics: classifyTask({ taskType: "architecture", complexity: "high" }),
    });
    expect(synthesis.disagreements.length).toBeGreaterThan(0);
    expect(synthesis.provenance.length).toBeGreaterThan(0);
  });

  it("enforces cost limits", async () => {
    const result = await executeOrchestration({
      organizationId: "org-test",
      idempotencyKey: "mb-cost-1",
      costLimitUsd: 0.000001,
      brainInput: {
        taskType: "large_task",
        prompt: "x".repeat(5000),
        context: { complexity: "critical", economicImportance: 1, implementationRisk: 1 },
      },
      providers: [createMockBrainProvider()],
    });
    expect(result.status).toBe("cost_blocked");
  });

  it("handles provider failure with fallback path", async () => {
    const failing = createFailingMockProvider("primary");
    const result = await executeOrchestration({
      organizationId: "org-test",
      idempotencyKey: "mb-fail-1",
      brainInput: {
        taskType: "coding",
        prompt: "implement feature",
        context: { complexity: "medium", codingRequired: true },
      },
      providers: [failing],
    });
    expect(result.executions.some((e) => !e.success)).toBe(true);
  });

  it("computes task value score deterministically", () => {
    const low = classifyTask({ taskType: "a", complexity: "low" });
    const high = classifyTask({ taskType: "b", complexity: "critical", economicImportance: 0.9 });
    expect(computeTaskValueScore(high)).toBeGreaterThan(computeTaskValueScore(low));
  });
});
