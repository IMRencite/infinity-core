/**
 * RUN_MONETIZATION_ENGINE_V1_TEST=true node scripts/run-monetization-engine-v1-test.mjs
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runMonetizationEngineV1Test } from "@/lib/infinity/monetization-engine/run";

describe.runIf(process.env.RUN_MONETIZATION_ENGINE_V1_TEST === "true")(
  "Monetization Engine v1 live test",
  () => {
    it(
      "analyzes persisted opportunity candidates and persists monetization plans",
      async () => {
        const admin = createAdminClient();
        const orgId = process.env.MONETIZATION_ENGINE_TEST_ORG_ID?.trim();
        if (!orgId) {
          throw new Error("MONETIZATION_ENGINE_TEST_ORG_ID is required for live test.");
        }

        const output = await runMonetizationEngineV1Test(admin, orgId);
        console.log(JSON.stringify(output, null, 2));

        expect(output.ok).toBe(true);
        if (!output.ok) return;

        expect(output.report.researchRunIds.length).toBeGreaterThan(0);
        expect(output.report.costSummary.researchCallCount).toBeGreaterThan(0);
        expect(output.analyses.length).toBeGreaterThanOrEqual(1);
        expect(output.analyses.length).toBeLessThanOrEqual(3);
        expect(output.report.plansGenerated).toBeGreaterThan(0);

        for (const analysis of output.analyses) {
          expect(analysis.plans.length).toBeGreaterThan(0);
          expect(analysis.monetizationScore).toBeGreaterThan(0);
          expect(analysis.economicViability).toBeTruthy();
          expect(analysis.recommendation.recommendedPrimaryModel.length).toBeGreaterThan(0);
          expect(analysis.recommendation.validationExperiments.length).toBeGreaterThan(0);
          expect(analysis.researchRunIds.length).toBeGreaterThan(0);

          for (const plan of analysis.plans) {
            expect(plan.economicsDerived.estimatedGrossRevenueYear1).toBeGreaterThanOrEqual(0);
            expect(plan.scenarios.length).toBe(12);
            expect(plan.monetizationScore).toBeGreaterThan(0);
            if (plan.revenueStreams.length > 0) {
              expect(plan.revenueStreams.length).toBeGreaterThanOrEqual(1);
            }
          }
        }
      },
      900_000,
    );
  },
);
