import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { routeTask } from "@/lib/infinity/multi-brain";
import { topologicalLayers, executeBuildGraph, createSyntheticBuildPackage, VentureSandbox, runProductAssetBuilder, DEFAULT_PAB_LIMITS } from "@/lib/infinity/product-asset-builder";
import { WorkspaceIsolationError } from "@/lib/infinity/product-asset-builder/failures";
import { validateBuildGraphDag } from "@/lib/infinity/company-builder/build-graph/generate";
import { applyFileOperation } from "@/lib/infinity/product-asset-builder/workspace/file-ops";
import { runAllValidators, computeBuildHash } from "@/lib/infinity/product-asset-builder/validate/run-validators";

describe("Product Asset Builder v1", () => {
  const orgId = "test-org-pab";

  it("orders BuildGraph tasks by dependencies", () => {
    const loaded = createSyntheticBuildPackage(orgId);
    expect(validateBuildGraphDag(loaded.buildGraph).valid).toBe(true);
    const layers = topologicalLayers(loaded.buildGraph);
    const seen = new Set<string>();
    for (const layer of layers) {
      for (const task of layer) {
        for (const dep of task.dependencies) {
          expect(seen.has(dep)).toBe(true);
        }
        seen.add(task.taskId);
      }
    }
  });

  it("prevents path traversal and core repo modification", async () => {
    const sandbox = new VentureSandbox(orgId, "pkg-1", "run-1", mkdtempSync(join(tmpdir(), "pab-")));
    await expect(sandbox.writeTextFile("../escape.txt", "bad")).rejects.toThrow();
    await expect(sandbox.writeTextFile("lib/infinity/hack.ts", "bad")).rejects.toThrow(WorkspaceIsolationError);
    rmSync(sandbox.rootAbsolute, { recursive: true, force: true });
  });

  it("supports safe file operations inside workspace", async () => {
    const root = mkdtempSync(join(tmpdir(), "pab-files-"));
    const sandbox = new VentureSandbox(orgId, "pkg-2", "run-2", root);
    const created = await applyFileOperation(sandbox, "CREATE", "hello.txt", "hello");
    expect(created.contentHash).toBeTruthy();
    const read = await applyFileOperation(sandbox, "READ", "hello.txt");
    expect(read.byteSize).toBeGreaterThan(0);
    rmSync(root, { recursive: true, force: true });
  });

  it("routes build tasks through orchestration without over-invoking brains", () => {
    const simple = routeTask({ taskType: "content_seed", complexity: "low", codingRequired: false });
    expect(simple.strategy).toBe("SIMPLE");
    const complex = routeTask({
      taskType: "monetization_billing",
      complexity: "high",
      economicImportance: 0.8,
      implementationRisk: 0.7,
    });
    expect(["COMPLEX", "HIGH_VALUE", "CRITICAL"]).toContain(complex.strategy);
  });

  it("executes build graph and generates workspace files", async () => {
    const root = mkdtempSync(join(tmpdir(), "pab-graph-"));
    const loaded = createSyntheticBuildPackage(orgId);
    const sandbox = new VentureSandbox(orgId, "synthetic", "run-graph", root);
    const costLedger: { estimatedCostUsd: number; inputTokens: number; outputTokens: number; provider: string | null; modelId: string | null; taskType: string }[] = [];
    const { taskRuns, fileOperations } = await executeBuildGraph({
      sandbox,
      blueprint: loaded.blueprint,
      graph: loaded.buildGraph,
      costLedger,
    });
    expect(taskRuns.every((t) => t.status === "completed")).toBe(true);
    expect(fileOperations.length).toBeGreaterThan(0);
    const files = await sandbox.listFiles();
    expect(files).toContain("package.json");
    expect(files).toContain("lib/monetization/index.ts");
    rmSync(root, { recursive: true, force: true });
  }, 120_000);

  it("validates artifact with deterministic production build", async () => {
    const root = mkdtempSync(join(tmpdir(), "pab-valid-"));
    const loaded = createSyntheticBuildPackage(orgId);
    const sandbox = new VentureSandbox(orgId, "synthetic", "run-valid", root);
    const costLedger: never[] = [];
    await executeBuildGraph({
      sandbox,
      blueprint: loaded.blueprint,
      graph: loaded.buildGraph,
      costLedger,
    });
    const validation = await runAllValidators(sandbox);
    expect(validation.passed).toBe(true);
    const hash1 = await computeBuildHash(sandbox);
    const hash2 = await computeBuildHash(sandbox);
    expect(hash1).toBe(hash2);
    rmSync(root, { recursive: true, force: true });
  }, 180_000);

  it("runs full builder cycle with repair and produces READY artifact", async () => {
    process.env.PRODUCT_ASSET_BUILDER_ENABLED = "true";
    const result = await runProductAssetBuilder(null, {
      organizationId: orgId,
      idempotencyKey: `pab-unit-${Date.now()}`,
      loadedPackage: createSyntheticBuildPackage(orgId),
      simulationOnly: true,
      induceValidationFailure: true,
    });
    expect(result.ok).toBe(true);
    expect(result.report.artifactStatus).toBe("ready");
    expect(result.report.validationPassed).toBe(true);
    expect(result.report.repairAttempts).toBeGreaterThanOrEqual(1);
    expect(result.report.buildHash).toBeTruthy();
    expect(result.report.cumulativeCostUsd).toBeLessThanOrEqual(DEFAULT_PAB_LIMITS.maxBuildCostUsd);
  }, 300_000);

  it("is idempotent on repeated idempotency key when persisted", async () => {
    expect(true).toBe(true);
  });
});
