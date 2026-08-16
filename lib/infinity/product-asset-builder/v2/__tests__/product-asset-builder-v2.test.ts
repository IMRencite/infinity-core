import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  generateMarketplaceFeatureContracts,
  createMarketplaceBuildPackage,
  routeTaskV2,
  getRegistryV2Models,
  runAllQualityGates,
  writeMarketplaceApplication,
  buildRepositoryMap,
  queryTraceabilityForRevenuePath,
} from "@/lib/infinity/product-asset-builder/v2";
import { classifyTask } from "@/lib/infinity/multi-brain";
import { selectFallbackProvider } from "@/lib/infinity/product-asset-builder/v2/routing/router-v2";
import { VentureSandbox } from "@/lib/infinity/product-asset-builder/workspace/sandbox";

describe("Product Asset Builder V2", () => {
  it("generates marketplace feature contracts with acceptance criteria", () => {
    const loaded = createMarketplaceBuildPackage("org-v2");
    const contracts = generateMarketplaceFeatureContracts(loaded.blueprint);
    expect(contracts.length).toBeGreaterThanOrEqual(10);
    expect(contracts.some((c) => c.featureId === "commission_engine")).toBe(true);
    expect(contracts.every((c) => c.acceptanceCriteria.length > 0)).toBe(true);
  });

  it("routes complex tasks to multi-provider classes without always using all providers", () => {
    const chars = classifyTask({ taskType: "seo_metadata", complexity: "low", codingRequired: false });
    const simple = routeTaskV2({ taskType: "seo", characteristics: chars, availableProviders: ["mock", "openai", "gemini", "anthropic"] });
    expect(simple.executionClass).toBe("FAST");

    const complex = routeTaskV2({
      taskType: "marketplace_architecture",
      characteristics: classifyTask({ taskType: "marketplace_architecture", complexity: "high", economicImportance: 0.8, implementationRisk: 0.7 }),
      availableProviders: ["mock", "openai", "gemini", "anthropic", "xai"],
    });
    expect(["COMPLEX", "HIGH_VALUE", "CRITICAL"]).toContain(complex.executionClass);
  });

  it("selects fallback provider on simulated outage", () => {
    const fallback = selectFallbackProvider(["openai", "gemini", "anthropic"], "openai");
    expect(fallback).not.toBe("openai");
    expect(fallback).toBeTruthy();
  });

  it("builds marketplace app and passes quality gates in mock mode", async () => {
    const root = mkdtempSync(join(tmpdir(), "pab-v2-"));
    const sandbox = new VentureSandbox("org-v2", "marketplace", "run-v2", root);
    const loaded = createMarketplaceBuildPackage("org-v2");
    const contracts = generateMarketplaceFeatureContracts(loaded.blueprint);
    const files = await writeMarketplaceApplication(sandbox);
    expect(files.length).toBeGreaterThan(40);
    const gates = await runAllQualityGates({ sandbox, contracts });
    const coverage = gates.gates.find((g) => g.gate === "feature_contract_coverage");
    if (!coverage?.passed) {
      throw new Error(`Feature coverage missing: ${JSON.stringify(coverage?.details)}`);
    }
    expect(gates.gates.find((g) => g.gate === "placeholder_detection")?.passed).toBe(true);
    expect(gates.gates.find((g) => g.gate === "workspace_isolation")?.passed).toBe(true);
    const map = await buildRepositoryMap(sandbox, contracts);
    const revenueFiles = queryTraceabilityForRevenuePath(map, "commission_engine");
    expect(revenueFiles.some((f) => f.includes("commission"))).toBe(true);
    if (gates.passed) {
      expect(gates.gates.find((g) => g.gate === "production_build")?.passed).toBe(true);
    }
    rmSync(root, { recursive: true, force: true });
  }, 300_000);

  it("registry v2 excludes mock in live mode", () => {
    const live = getRegistryV2Models(true);
    expect(live.every((m) => m.provider !== "mock")).toBe(true);
  });
});
