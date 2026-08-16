/**
 * Live Organic Growth → PAB V2.1 AI handoff verification.
 * RUN_ORGANIC_GROWTH_PAB_V21_LIVE=true
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConfiguredLiveProviders } from "@/lib/infinity/product-asset-builder/v2.1";
import { runOrganicGrowthEngineCycle } from "@/lib/infinity/organic-growth-engine/run";
import { findLatestReadyBuildPackageId } from "@/lib/infinity/organic-growth-engine/pipeline/run-pipeline";
import { runOrganicPabV21LiveHandoff } from "@/lib/infinity/organic-growth-engine/integration/pab-v21-live-handoff";
import { enrichContextWithGroundedResearch } from "@/lib/infinity/organic-growth-engine/research/grounded-evidence";
import { loadOrganicGrowthEngineConfig } from "@/lib/infinity/organic-growth-engine/config";
import { TEST_VENTURE_E_LOCAL_SERVICE } from "@/lib/infinity/organic-growth-engine/fixtures/test-ventures";

const runLive = process.env.RUN_ORGANIC_GROWTH_PAB_V21_LIVE === "true";

describe.runIf(runLive)("Organic Growth → PAB V2.1 live AI handoff", () => {
  it(
    "generates one organic page via real PAB V2.1 provider call and post-generation gate",
    async () => {
      const providers = getConfiguredLiveProviders();
      expect(providers.length).toBeGreaterThan(0);

      const admin = createAdminClient();
      const orgId =
        process.env.ORGANIC_GROWTH_TEST_ORG_ID ??
        process.env.PRODUCT_ASSET_BUILDER_V21_TEST_ORG_ID ??
        "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
      const suffix = process.env.ORGANIC_GROWTH_PAB_V21_SUFFIX ?? `pab-v21-${Date.now()}`;

      const buildPackageId = await findLatestReadyBuildPackageId(admin, orgId);
      expect(buildPackageId).toBeTruthy();

      const engineOutput = await runOrganicGrowthEngineCycle(admin, {
        organizationId: orgId,
        idempotencyKey: `organic-growth-pab-v21-${suffix}`,
        companyBuilderBuildPackageIds: [buildPackageId!],
        simulationOnly: true,
        enableGroundedResearch: false,
      });

      expect(engineOutput.ok).toBe(true);
      expect(engineOutput.buildPackages.length).toBeGreaterThan(0);

      const pkg = engineOutput.buildPackages[0]!;
      expect(pkg.approvedPageOpportunities.length).toBeGreaterThan(0);

      const { data: persistedPkg } = await admin
        .from("organic_growth_build_packages")
        .select("id")
        .eq("organic_growth_run_id", engineOutput.organicGrowthRunId)
        .limit(1)
        .single();

      const pageId = pkg.approvedPageOpportunities[0]!.pageOpportunityId;

      const handoff = await runOrganicPabV21LiveHandoff({
        admin,
        organizationId: orgId,
        idempotencyKey: `organic-pab-v21-handoff-${suffix}`,
        buildPackage: pkg,
        organicGrowthRunId: engineOutput.organicGrowthRunId,
        organicGrowthBuildPackageId: persistedPkg!.id,
        pageOpportunityId: pageId,
        maxCostUsd: 0.75,
      });

      expect(handoff.ok).toBe(true);
      expect(handoff.codingTaskId).toBeTruthy();
      expect(handoff.implementerProvider).toBeTruthy();
      expect(handoff.implementerModel).toBeTruthy();
      expect(handoff.providerCallIds.length).toBeGreaterThan(0);
      expect(handoff.codeChangeSetId).toBeTruthy();
      expect(handoff.workspaceMutationIds.length).toBeGreaterThan(0);
      expect(handoff.generatedArtifact.bodyText.length).toBeGreaterThan(50);
      expect(["PASS", "REPAIR"].includes(handoff.postGenerationGate.outcome)).toBe(true);

      const { data: codingTask } = await admin
        .from("product_asset_coding_tasks")
        .select("id, status")
        .eq("id", handoff.codingTaskId)
        .single();
      expect(codingTask?.status).toBe("completed");

      const { data: providerCalls } = await admin
        .from("product_asset_provider_calls")
        .select("id, provider, model_id, input_tokens, output_tokens, estimated_cost_usd, success")
        .eq("product_asset_builder_run_id", handoff.pabBuildRunId);
      expect(providerCalls?.length ?? 0).toBeGreaterThan(0);
      expect(providerCalls?.some((c) => c.success)).toBe(true);

      console.log(
        JSON.stringify(
          {
            classification: "LIVE",
            lineage: {
              opportunityCandidateId: pkg.sourceLineage.opportunityCandidateId,
              monetizationRunId: pkg.sourceLineage.monetizationRunId,
              ventureBlueprintId: pkg.sourceLineage.ventureBlueprintId,
              companyBuilderBuildPackageId: pkg.sourceLineage.companyBuilderBuildPackageId,
              organicGrowthRunId: engineOutput.organicGrowthRunId,
              organicGrowthBuildPackageId: persistedPkg!.id,
              organicContentContractId: handoff.organicContentContractId,
              pageOpportunityId: handoff.pageOpportunityId,
              pabBuildRunId: handoff.pabBuildRunId,
              codingTaskId: handoff.codingTaskId,
              providerCallIds: handoff.providerCallIds,
              codeChangeSetId: handoff.codeChangeSetId,
              workspaceMutationIds: handoff.workspaceMutationIds,
              productionArtifactId: handoff.productionArtifactId,
            },
            pab: {
              provider: handoff.implementerProvider,
              model: handoff.implementerModel,
              reviewerProvider: handoff.reviewerProvider,
              inputTokens: handoff.inputTokens,
              outputTokens: handoff.outputTokens,
              totalCostUsd: handoff.totalCostUsd,
              costReported: handoff.costReported,
              usageSource: handoff.usageSource,
            },
            postGenerationGate: handoff.postGenerationGate,
            repairResult: handoff.repairResult,
            workspaceReference: handoff.workspaceReference,
          },
          null,
          2,
        ),
      );
    },
    600_000,
  );

  it("reports grounded research credential status without counting skip as pass", async () => {
    const prevGemini = process.env.GEMINI_API_KEY;
    const prevGoogle = process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const config = loadOrganicGrowthEngineConfig();
    const result = await enrichContextWithGroundedResearch(
      null as never,
      "org",
      TEST_VENTURE_E_LOCAL_SERVICE,
      { ...config, enableGroundedResearch: true },
      "pab-v21-credential-check",
    );

    if (prevGemini) process.env.GEMINI_API_KEY = prevGemini;
    if (prevGoogle) process.env.GOOGLE_API_KEY = prevGoogle;

    expect(result.status).toBe("SKIPPED_MISSING_CREDENTIALS");
  });
});
