/**
 * Live Creative Media verification — RUN_CREATIVE_MEDIA_V1_LIVE=true
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAiProviderEnvConfig, mayExecuteProvider } from "@/lib/infinity/ai-providers/config";
import { runCreativeMediaEngineCycle } from "../run";
import { googleMediaAdapter } from "../providers/google-media-adapter";
import { openaiMediaAdapter } from "../providers/openai-image-adapter";
import { detectFfmpegAvailable } from "../deterministic/ffmpeg-adapter";
import { TEST_MEDIA_VENTURE_HIGH_VALUE } from "../fixtures/test-media-fixtures";

const runPersistence = process.env.RUN_CREATIVE_MEDIA_V1_TEST === "true";
const runImageLive = process.env.RUN_CREATIVE_MEDIA_V1_LIVE === "true";

describe.runIf(runPersistence)("Creative Media live verification", () => {
  it("persists mock/simulation run and reports provider availability", async () => {
    const admin = createAdminClient();
    const orgId =
      process.env.CREATIVE_MEDIA_TEST_ORG_ID ??
      process.env.ORGANIC_GROWTH_TEST_ORG_ID ??
      "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
    const suffix = process.env.CREATIVE_MEDIA_TEST_IDEMPOTENCY_SUFFIX ?? `live-${Date.now()}`;

    const output = await runCreativeMediaEngineCycle(admin, {
      organizationId: orgId,
      idempotencyKey: `creative-media-v1-${suffix}`,
      simulationOnly: true,
      capabilityTest: true,
      ventureContexts: [TEST_MEDIA_VENTURE_HIGH_VALUE],
      maxAssetsPerRun: 1,
    });

    expect(output.ok).toBe(true);
    expect(output.buildPackages.length).toBeGreaterThan(0);
    expect(output.report.assetsGenerated).toBeGreaterThan(0);

    const { data: assets } = await admin
      .from("creative_media_assets")
      .select("id, asset_id, provider, model, checksum")
      .eq("creative_media_run_id", output.creativeMediaRunId);
    expect(assets?.length ?? 0).toBeGreaterThan(0);

    console.log(
      JSON.stringify(
        {
          classification: "MOCK/LIVE_PERSISTENCE",
          creativeMediaRunId: output.creativeMediaRunId,
          assetsGenerated: output.report.assetsGenerated,
          productionReady: output.report.productionReady,
          providers: {
            googleConfigured: googleMediaAdapter.isConfigured(),
            openaiConfigured: openaiMediaAdapter.isConfigured(),
            ffmpegAvailable: await detectFfmpegAvailable(),
          },
        },
        null,
        2,
      ),
    );
  }, 120_000);

  it.runIf(runImageLive)(
    "generates one real image when a live image provider is configured",
    async () => {
    const config = loadAiProviderEnvConfig();
    const canGoogle = googleMediaAdapter.isConfigured();
    const canOpenai = openaiMediaAdapter.isConfigured();
    if (!canGoogle && !canOpenai) {
      console.log("SKIPPED_MISSING_CREDENTIALS: no live image provider configured");
      return;
    }

    const admin = createAdminClient();
    const orgId =
      process.env.CREATIVE_MEDIA_TEST_ORG_ID ??
      process.env.ORGANIC_GROWTH_TEST_ORG_ID ??
      "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
    const suffix = process.env.CREATIVE_MEDIA_IMAGE_SUFFIX ?? `img-${Date.now()}`;

    const output = await runCreativeMediaEngineCycle(admin, {
      organizationId: orgId,
      idempotencyKey: `creative-media-image-live-${suffix}`,
      simulationOnly: false,
      enableLiveProviders: true,
      ventureContexts: [
        {
          ...TEST_MEDIA_VENTURE_HIGH_VALUE,
          mediaRequirements: [{ purpose: "hero_image", assetType: "image", priority: 1 }],
        },
      ],
      maxAssetsPerRun: 1,
    });

    expect(output.ok).toBe(true);
    const pkg = output.buildPackages[0]!;
    expect(pkg.generatedAssets.length).toBeGreaterThan(0);
    const asset = pkg.generatedAssets[0]!;
    expect(["google_media", "openai_media", "mock_media"]).toContain(asset.provider);
    if (mayExecuteProvider("openai", config) || mayExecuteProvider("google_gemini", config)) {
      expect(asset.provider).not.toBe("mock_media");
    }

    console.log(
      JSON.stringify(
        {
          classification: "LIVE_IMAGE",
          provider: asset.provider,
          model: asset.model,
          assetId: asset.assetId,
          fileSizeBytes: asset.fileSizeBytes,
          checksum: asset.checksum,
          qualityOutcome: pkg.qualityReviews[0]?.outcome,
          productionStatus: asset.productionStatus,
        },
        null,
        2,
      ),
    );
    },
    180_000,
  );
});
