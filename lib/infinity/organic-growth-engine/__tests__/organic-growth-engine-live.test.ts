import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runOrganicGrowthV1Test } from "@/lib/infinity/organic-growth-engine/run";

const runLive = process.env.RUN_ORGANIC_GROWTH_V1_TEST === "true";

describe.runIf(runLive)("Organic Growth Architecture Engine v1 live", () => {
  it("persists run and build packages to Supabase", async () => {
    const admin = createAdminClient();
    const orgId =
      process.env.ORGANIC_GROWTH_TEST_ORG_ID ??
      process.env.COMPANY_BUILDER_TEST_ORG_ID ??
      "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
    const suffix = process.env.ORGANIC_GROWTH_TEST_IDEMPOTENCY_SUFFIX ?? `live-${Date.now()}`;

    const output = await runOrganicGrowthV1Test(admin, orgId, suffix);
    expect(output.ok).toBe(true);
    expect(output.organicGrowthRunId).toBeTruthy();
    expect(output.report.venturesProcessed).toBeGreaterThan(0);
    expect(output.report.buildPackagesCreated).toBeGreaterThan(0);
    expect(output.report.autonomyBoundary.pagesPublished).toBe(0);
    expect(output.report.autonomyBoundary.publicDeployments).toBe(0);
    expect(output.report.autonomyBoundary.realWebsitesModified).toBe(0);
    expect(output.buildPackages.length).toBeGreaterThan(0);

    const { data: runRow, error: runError } = await admin
      .from("organic_growth_runs")
      .select("*")
      .eq("id", output.organicGrowthRunId)
      .single();
    expect(runError).toBeNull();
    expect(runRow?.status).toBe("completed");

    const { data: packages, error: pkgError } = await admin
      .from("organic_growth_build_packages")
      .select("*")
      .eq("organic_growth_run_id", output.organicGrowthRunId);
    expect(pkgError).toBeNull();
    expect(packages?.length).toBeGreaterThan(0);

    const massive = output.report.digitalRealEstate["test-venture-i-1000-page"];
    expect(massive).toBeTruthy();
    expect(massive!.rawOpportunities).toBeGreaterThan(300);
    expect(massive!.create).toBeLessThan(massive!.rawOpportunities);

    const { data: hitlRows, error: hitlError } = await admin
      .from("organic_human_contribution_requests")
      .select("*")
      .eq("organic_growth_run_id", output.organicGrowthRunId);
    expect(hitlError).toBeNull();
    expect(hitlRows?.length ?? 0).toBeGreaterThan(0);
  }, 120000);
});
