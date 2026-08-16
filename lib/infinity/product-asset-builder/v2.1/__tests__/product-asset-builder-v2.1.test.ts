import { describe, it, expect } from "vitest";
import { validateCodeChangeSet } from "@/lib/infinity/product-asset-builder/v2.1/coding/code-change-schema";
import { WorkspaceMutationEngine } from "@/lib/infinity/product-asset-builder/v2.1/mutation/workspace-mutation-engine";
import { VentureSandbox } from "@/lib/infinity/product-asset-builder/workspace/sandbox";
import { writeMarketplaceApplication } from "@/lib/infinity/product-asset-builder/v2/scaffold/marketplace-app";
import { runProductAssetBuilderV21 } from "@/lib/infinity/product-asset-builder/v2.1/run-v2.1";
import { decomposeCollectionsFeature, createCreatorCollectionsContract } from "@/lib/infinity/product-asset-builder/v2.1/coding/task-decomposer";
import { routeCodingTask } from "@/lib/infinity/product-asset-builder/v2.1/routing/coding-router";
import { randomUUID } from "node:crypto";

describe("Product Asset Builder V2.1", () => {
  it("validates code change sets and rejects forbidden paths", () => {
    const result = validateCodeChangeSet(
      {
        reasoningSummary: "test",
        changes: [{ operation: "create", path: ".env.local", content: "SECRET=1", justification: "bad" }],
        dependencyChanges: [],
        migrationChanges: [],
        testsAdded: [],
        expectedBehavior: [],
        assumptions: [],
      },
      { allowedPaths: ["*"], forbiddenPaths: [".env.local"], allowDelete: false, maxChanges: 5, maxContentBytes: 1000 },
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("applies workspace mutations with isolation", async () => {
    const sandbox = new VentureSandbox("org-test", "pab-v21-unit", randomUUID());
    await sandbox.writeTextFile("lib/example.ts", "export const x = 1;\n");
    const engine = new WorkspaceMutationEngine(sandbox, randomUUID());
    const result = await engine.applyChangeSet(
      {
        taskId: "t1",
        provider: "mock",
        model: "mock",
        reasoningSummary: "add file",
        changes: [{ operation: "create", path: "lib/new-feature.ts", content: "export const y = 2;\n", justification: "new" }],
        dependencyChanges: [],
        migrationChanges: [],
        testsAdded: [],
        expectedBehavior: [],
        assumptions: [],
      },
      { codingTaskId: "t1", featureContractIds: ["fc1"], allowedPaths: ["lib"], maxChanges: 5 },
    );
    expect(result.applied.length).toBe(1);
    expect(await sandbox.readTextFile("lib/new-feature.ts")).toContain("export const y");
  });

  it("decomposes creator collections into coding tasks", () => {
    const contract = createCreatorCollectionsContract();
    const tasks = decomposeCollectionsFeature({ ventureId: "v1", contract });
    expect(tasks.length).toBe(4);
    expect(tasks.map((t) => t.taskType)).toContain("IMPLEMENT_API");
  });

  it("enforces independent reviewer routing when multiple providers available", () => {
    const routing = routeCodingTask({
      taskType: "IMPLEMENT_FEATURE",
      complexity: "high",
      availableProviders: ["openai", "anthropic", "gemini"],
    });
    expect(routing.implementer.provider).not.toBe(routing.reviewer?.provider);
    expect(routing.independenceEnforced).toBe(true);
  });

  it("runs mock AI coding pipeline and applies mutations to marketplace workspace", async () => {
    const result = await runProductAssetBuilderV21(null, {
      organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
      idempotencyKey: `pab-v21-mock-${Date.now()}`,
      liveMode: false,
    });

    expect(result.aiCodingReport.codingTasksCreated).toBeGreaterThan(0);
    expect(result.aiCodingReport.mutationsApplied).toBeGreaterThan(0);
    expect(result.aiCodingReport.codeChangeSets).toBeGreaterThan(0);
    expect(result.aiCodingReport.appliedDiffSummary.length).toBeGreaterThan(0);
    expect(result.aiCodingReport.totalTokens).toBeGreaterThan(0);
  }, 300_000);
});
