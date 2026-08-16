import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSyntheticBuildPackage, runProductAssetBuilder } from "@/lib/infinity/product-asset-builder";

const RUN_LIVE = process.env.RUN_PRODUCT_ASSET_BUILDER_V1_TEST === "true";

describe.runIf(RUN_LIVE)("Product Asset Builder v1 live integration", () => {
  it("builds synthetic venture to READY ProductionArtifact without deployment", async () => {
    const admin = createAdminClient();
    const orgId =
      process.env.PRODUCT_ASSET_BUILDER_TEST_ORG_ID ??
      process.env.COMPANY_BUILDER_TEST_ORG_ID ??
      "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
    const suffix = process.env.PRODUCT_ASSET_BUILDER_TEST_IDEMPOTENCY_SUFFIX ?? `live-${Date.now()}`;
    const idempotencyKey = `pab-v1-live-${suffix}`;

    const result = await runProductAssetBuilder(admin, {
      organizationId: orgId,
      idempotencyKey,
      loadedPackage: createSyntheticBuildPackage(orgId),
      simulationOnly: true,
      induceValidationFailure: true,
    });

    if (!result.ok) {
      throw new Error(`PAB live build failed: validationPassed=${result.report.validationPassed} artifact=${result.report.artifactStatus}`);
    }
    expect(result.ok).toBe(true);
    expect(result.report.validationPassed).toBe(true);
    expect(result.report.artifactStatus).toBe("ready");
    expect(result.report.simulationOnly).toBe(true);
    expect(result.workspaceReference).toContain(".infinity/vw/");

    const { data: artifact } = await admin
      .from("product_asset_production_artifacts")
      .select("*")
      .eq("product_asset_builder_run_id", result.buildRunId)
      .maybeSingle();

    expect(artifact?.status).toBe("ready");
    expect(artifact?.build_hash).toBeTruthy();

    const { data: ledger } = await admin
      .from("product_asset_cost_ledger")
      .select("*")
      .eq("product_asset_builder_run_id", result.buildRunId);
    expect((ledger ?? []).length).toBeGreaterThan(0);

    const rerun = await runProductAssetBuilder(admin, {
      organizationId: orgId,
      idempotencyKey,
      loadedPackage: createSyntheticBuildPackage(orgId),
      simulationOnly: true,
    });
    expect(rerun.buildRunId).toBe(result.buildRunId);
  }, 600_000);
});
