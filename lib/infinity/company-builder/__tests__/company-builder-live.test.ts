/**
 * RUN_COMPANY_BUILDER_V1_TEST=true node scripts/run-company-builder-v1-test.mjs
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runCompanyBuilderV1Test } from "@/lib/infinity/company-builder/run";

describe.runIf(process.env.RUN_COMPANY_BUILDER_V1_TEST === "true")(
  "Company Builder v1 live test",
  () => {
    it(
      "creates venture blueprints and build packages from simulation inputs",
      async () => {
        const admin = createAdminClient();
        const orgId = process.env.COMPANY_BUILDER_TEST_ORG_ID?.trim();
        if (!orgId) {
          throw new Error("COMPANY_BUILDER_TEST_ORG_ID is required for live test.");
        }

        const output = await runCompanyBuilderV1Test(admin, orgId);
        console.log(JSON.stringify(output, null, 2));

        expect(output.ok).toBe(true);
        if (!output.ok) return;

        expect(output.report.simulationOnly).toBe(true);
        expect(output.report.blueprintsCreated).toBeGreaterThanOrEqual(3);
        expect(output.blueprints.length).toBe(output.report.blueprintsCreated);
        expect(output.buildPackages.length).toBe(output.report.buildPackagesCreated);

        for (const blueprint of output.blueprints) {
          expect(blueprint.simulationOnly).toBe(true);
          expect(blueprint.core.ventureNameWorking.length).toBeGreaterThan(0);
          expect(blueprint.productArchitecture.features.length).toBeGreaterThan(0);
          expect(blueprint.buildGraph.tasks.length).toBeGreaterThan(0);
          expect(blueprint.analyticsArchitecture.eventCatalog.length).toBeGreaterThan(0);
          expect(
            blueprint.sourceLineage.opportunityCandidateId ||
              blueprint.sourceLineage.ventureSelectionHandoffId ||
              blueprint.sourceLineage.capabilityTest,
          ).toBeTruthy();
        }

        const ventureTypes = new Set(output.blueprints.map((b) => b.core.ventureType));
        expect(ventureTypes.size).toBeGreaterThanOrEqual(2);

        const complex = output.blueprints.find((b) => b.core.ventureType === "creator_marketplace");
        expect(complex).toBeDefined();
        expect(complex?.productArchitecture.userRoles).toEqual(
          expect.arrayContaining(["artist", "collector", "moderator", "admin"]),
        );

        expect(output.report.blockedPackages).toBeGreaterThanOrEqual(1);
        expect(output.report.readyPackages).toBeGreaterThanOrEqual(2);
      },
      900_000,
    );
  },
);
