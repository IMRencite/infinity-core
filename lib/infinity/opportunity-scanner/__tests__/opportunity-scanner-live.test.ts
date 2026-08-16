/**
 * RUN_OPPORTUNITY_SCANNER_V1_TEST=true node scripts/run-opportunity-scanner-v1-test.mjs
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runOpportunityScannerV1Test } from "@/lib/infinity/opportunity-scanner/run";

describe.runIf(process.env.RUN_OPPORTUNITY_SCANNER_V1_TEST === "true")(
  "Opportunity Scanner v1 live test",
  () => {
    it(
      "executes a real grounded discovery cycle and persists candidates",
      async () => {
        const admin = createAdminClient();
        const orgId = process.env.OPPORTUNITY_SCANNER_TEST_ORG_ID?.trim();
        if (!orgId) {
          throw new Error("OPPORTUNITY_SCANNER_TEST_ORG_ID is required for live test.");
        }

        const output = await runOpportunityScannerV1Test(admin, orgId);
        console.log(JSON.stringify(output, null, 2));

        expect(output.ok).toBe(true);
        if (!output.ok) return;

        expect(output.report.researchRunIds.length).toBeGreaterThan(0);
        expect(output.report.costSummary.researchCallCount).toBeGreaterThan(0);
        expect(output.candidates.length).toBeGreaterThanOrEqual(1);
        expect(output.candidates.length).toBeLessThanOrEqual(10);

        for (const candidate of output.candidates) {
          expect(candidate.title.trim().length).toBeGreaterThan(0);
          expect(candidate.scores?.opportunityScore).toBeGreaterThan(0);
          expect(candidate.researchRunIds.length).toBeGreaterThan(0);
          expect(candidate.researchSources.length + candidate.demandEvidence.length).toBeGreaterThan(0);
        }
      },
      600_000,
    );
  },
);
