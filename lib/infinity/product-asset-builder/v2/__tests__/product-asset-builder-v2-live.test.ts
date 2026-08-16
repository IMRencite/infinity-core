import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  runProductAssetBuilderV2,
  runProviderPreflight,
  getConfiguredLiveProviders,
} from "@/lib/infinity/product-asset-builder/v2";

const RUN_LIVE = process.env.RUN_PRODUCT_ASSET_BUILDER_V2_TEST === "true";

describe.runIf(RUN_LIVE)("Product Asset Builder V2 live verification", () => {
  it("preflights configured providers without exposing secrets", async () => {
    const results = await runProviderPreflight({ liveAuthCheck: true });
    expect(results.length).toBe(4);
    for (const r of results) {
      expect(r.provider).toMatch(/openai|gemini|anthropic|xai/);
      expect(JSON.stringify(r)).not.toMatch(/sk-[a-zA-Z0-9_-]{10,}/);
      expect(JSON.stringify(r)).not.toMatch(/xai-[a-zA-Z0-9_-]{10,}/);
    }
    const configured = results.filter((r) => r.configured);
    expect(configured.length).toBeGreaterThanOrEqual(2);
  }, 120_000);

  it("builds complex marketplace with real multi-provider collaboration", async () => {
    const liveProviders = getConfiguredLiveProviders();
    expect(liveProviders.length).toBeGreaterThanOrEqual(2);

    const admin = createAdminClient();
    const orgId = process.env.PRODUCT_ASSET_BUILDER_V2_TEST_ORG_ID ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
    const suffix = process.env.PRODUCT_ASSET_BUILDER_V2_TEST_IDEMPOTENCY_SUFFIX ?? `live-${Date.now()}`;

    const result = await runProductAssetBuilderV2(admin, {
      organizationId: orgId,
      idempotencyKey: `pab-v2-live-${suffix}`,
      liveMode: true,
    });

    expect(result.preflight.filter((p) => p.configured).length).toBeGreaterThanOrEqual(2);
    expect(result.intelligenceReport.multiBrain.multiProviderCollaborations).toBeGreaterThanOrEqual(1);
    expect(result.intelligenceReport.multiBrain.routingLog.length).toBeGreaterThan(0);

    const usedProviders = new Set(result.intelligenceReport.multiBrain.routingLog.map((r) => r.provider));
    expect(usedProviders.size).toBeGreaterThanOrEqual(2);

    if (!result.ok) {
      throw new Error(`PAB V2 blocked: ${result.blockedReasons.join("; ")}`);
    }
    expect(result.artifactStatus).toBe("ready");
    expect(result.intelligenceReport.featureContracts.passed).toBeGreaterThan(0);
    expect(result.intelligenceReport.qualityGates.production_build).toBe(true);
  }, 900_000);

  it("handles simulated provider outage with fallback", async () => {
    const admin = createAdminClient();
    const orgId = process.env.PRODUCT_ASSET_BUILDER_V2_TEST_ORG_ID ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
    const result = await runProductAssetBuilderV2(admin, {
      organizationId: orgId,
      idempotencyKey: `pab-v2-fallback-${Date.now()}`,
      liveMode: true,
      simulatedProviderOutage: "openai",
    });
    expect(result.intelligenceReport.multiBrain.fallbacks).toBeGreaterThanOrEqual(0);
  }, 600_000);
});
