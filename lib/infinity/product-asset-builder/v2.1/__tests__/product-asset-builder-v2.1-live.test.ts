import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runProductAssetBuilderV21, getConfiguredLiveProviders } from "@/lib/infinity/product-asset-builder/v2.1";

const RUN_LIVE = process.env.RUN_PRODUCT_ASSET_BUILDER_V21_TEST === "true";

describe.runIf(RUN_LIVE)("Product Asset Builder V2.1 live coding", () => {
  it("implements creator collections via real AI coding with independent review", async () => {
    const providers = getConfiguredLiveProviders();
    expect(providers.length).toBeGreaterThanOrEqual(2);

    const admin = createAdminClient();
    const orgId = process.env.PRODUCT_ASSET_BUILDER_V21_TEST_ORG_ID ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
    const suffix = process.env.PRODUCT_ASSET_BUILDER_V21_TEST_IDEMPOTENCY_SUFFIX ?? `live-${Date.now()}`;

    const result = await runProductAssetBuilderV21(admin, {
      organizationId: orgId,
      idempotencyKey: `pab-v21-live-${suffix}`,
      liveMode: true,
    });

    expect(result.aiCodingReport.mutationsApplied).toBeGreaterThan(0);
    expect(result.aiCodingReport.codeChangeSets).toBeGreaterThan(0);
    expect(result.aiCodingReport.appliedDiffSummary.length).toBeGreaterThan(0);
    expect(result.aiCodingReport.independentReviews).toBeGreaterThan(0);
    expect(result.aiCodingReport.implementerProvider).toBeTruthy();
    expect(result.aiCodingReport.reviewerProvider).toBeTruthy();
    expect(result.aiCodingReport.implementerProvider).not.toBe(result.aiCodingReport.reviewerProvider);
    expect(result.aiCodingReport.totalCostUsd).toBeGreaterThan(0);

    const aiProviders = new Set(result.aiCodingReport.appliedDiffSummary.map((d) => d.provider));
    expect(aiProviders.size).toBeGreaterThanOrEqual(1);

    if (!result.ok) {
      throw new Error(`PAB V2.1 blocked: ${result.blockedReasons.join("; ")}`);
    }
    expect(result.artifactStatus).toBe("ready");
  }, 1_800_000);

  it("handles coding provider outage with fallback", async () => {
    const admin = createAdminClient();
    const orgId = process.env.PRODUCT_ASSET_BUILDER_V21_TEST_ORG_ID ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
    const result = await runProductAssetBuilderV21(admin, {
      organizationId: orgId,
      idempotencyKey: `pab-v21-fallback-${Date.now()}`,
      liveMode: true,
      simulatedProviderOutage: "openai",
    });
    expect(result.aiCodingReport.mutationsApplied).toBeGreaterThan(0);
  }, 1_800_000);
});
