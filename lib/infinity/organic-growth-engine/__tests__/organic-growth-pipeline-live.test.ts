/**
 * Live pipeline: Company Builder BuildPackage → Organic Growth → PAB handoff → post-generation gate.
 * RUN_ORGANIC_GROWTH_PIPELINE_LIVE=true
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runCompanyBuilderV1Test } from "@/lib/infinity/company-builder/run";
import { runOrganicGrowthEngineCycle } from "@/lib/infinity/organic-growth-engine/run";
import {
  executeOrganicPipelineForPackage,
  findLatestReadyBuildPackageId,
} from "@/lib/infinity/organic-growth-engine/pipeline/run-pipeline";

const runLive = process.env.RUN_ORGANIC_GROWTH_PIPELINE_LIVE === "true";

describe.runIf(runLive)("Organic Growth pipeline live E2E", () => {
  it(
    "runs upstream build package → Organic Growth → PAB → post-generation gate with traceability",
    async () => {
      const admin = createAdminClient();
      const orgId =
        process.env.ORGANIC_GROWTH_TEST_ORG_ID ??
        process.env.COMPANY_BUILDER_TEST_ORG_ID ??
        "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
      const suffix = process.env.ORGANIC_GROWTH_PIPELINE_SUFFIX ?? `pipeline-${Date.now()}`;

      let buildPackageId = await findLatestReadyBuildPackageId(admin, orgId);
      let upstreamMode: "EXISTING" | "COMPANY_BUILDER" = "EXISTING";

      if (!buildPackageId) {
        upstreamMode = "COMPANY_BUILDER";
        const cb = await runCompanyBuilderV1Test(admin, orgId);
        expect(cb.ok).toBe(true);
        buildPackageId = await findLatestReadyBuildPackageId(admin, orgId);
      }

      expect(buildPackageId).toBeTruthy();

      const engineOutput = await runOrganicGrowthEngineCycle(admin, {
        organizationId: orgId,
        idempotencyKey: `organic-growth-pipeline-${suffix}`,
        companyBuilderBuildPackageIds: [buildPackageId!],
        simulationOnly: true,
        enableGroundedResearch: false,
      });

      expect(engineOutput.ok).toBe(true);
      expect(engineOutput.buildPackages.length).toBeGreaterThan(0);

      const pkg = engineOutput.buildPackages[0]!;
      expect(pkg.sourceLineage.inputMode).toBe("blueprint");
      expect(pkg.sourceLineage.companyBuilderBuildPackageId ?? buildPackageId).toBeTruthy();
      expect(pkg.organicAuthorityGraph?.nodes.length).toBeGreaterThan(0);

      const { data: persistedPkg } = await admin
        .from("organic_growth_build_packages")
        .select("id, build_package, source_lineage, company_builder_build_package_id")
        .eq("organic_growth_run_id", engineOutput.organicGrowthRunId)
        .limit(1)
        .single();

      expect(persistedPkg?.company_builder_build_package_id ?? buildPackageId).toBeTruthy();

      const pipeline = executeOrganicPipelineForPackage({
        buildPackage: pkg,
        organicGrowthRunId: engineOutput.organicGrowthRunId,
        organicGrowthBuildPackageId: persistedPkg!.id,
        inputMode: upstreamMode === "COMPANY_BUILDER" ? "LIVE" : "LIVE",
        maxPages: 1,
      });

      expect(pipeline.pabHandoff.codingTasks.length).toBeGreaterThan(0);
      expect(pipeline.pabHandoff.featureContracts.length).toBeGreaterThan(0);
      expect(pipeline.pabHandoff.traceabilityLinks.some((l) => l.linkType === "page_opportunity_to_coding_task")).toBe(
        true,
      );
      expect(pipeline.repairResults.length).toBeGreaterThan(0);
      expect(pipeline.postGenerationSummary.pass + pipeline.postGenerationSummary.repair).toBeGreaterThan(0);

      const { data: hitlRows } = await admin
        .from("organic_human_contribution_requests")
        .select("id")
        .eq("organic_growth_run_id", engineOutput.organicGrowthRunId);
      if (pkg.humanContributionRequests.length > 0) {
        expect((hitlRows?.length ?? 0)).toBeGreaterThan(0);
      }

      console.log(
        JSON.stringify(
          {
            upstreamMode,
            buildPackageId,
            organicGrowthRunId: engineOutput.organicGrowthRunId,
            lineage: pkg.sourceLineage,
            postGenerationSummary: pipeline.postGenerationSummary,
            traceabilityLinks: pipeline.pabHandoff.traceabilityLinks.length,
          },
          null,
          2,
        ),
      );
    },
    180_000,
  );
});
