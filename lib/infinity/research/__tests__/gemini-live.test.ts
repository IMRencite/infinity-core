/**
 * RUN_GEMINI_GROUNDED_RESEARCH_V1_TEST=true node scripts/run-gemini-grounded-research-v1-test.mjs
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runGeminiGroundedResearchV1Test } from "@/lib/infinity/research/run";

describe.runIf(process.env.RUN_GEMINI_GROUNDED_RESEARCH_V1_TEST === "true")(
  "Gemini Grounded Research v1 live test",
  () => {
    it(
      "executes real Gemini grounded research and persists results",
      async () => {
        const admin = createAdminClient();
        const orgId = process.env.RESEARCH_TEST_ORG_ID?.trim();
        if (!orgId) {
          throw new Error("RESEARCH_TEST_ORG_ID is required for live test.");
        }

        const output = await runGeminiGroundedResearchV1Test(admin, orgId);
        console.log(JSON.stringify(output, null, 2));

        expect(output.ok).toBe(true);
        if (!output.ok) return;

        expect(output.result.providerId).toBe("gemini");
        expect(output.result.groundedStatus).toBe(true);
        expect(output.result.groundingUsage.groundingInvoked).toBe(true);
        expect(output.result.groundingUsage.searchQueryCount).toBeGreaterThan(0);
        expect(output.result.evidence.length).toBeGreaterThanOrEqual(3);
        expect(output.result.sources.length).toBeGreaterThan(0);
        expect(output.result.validationStatus).toBe("validated");
        expect(output.result.provenance.purpose).toBe("provider_verification");

        for (const item of output.result.evidence) {
          if (item.grounded && item.evidenceType === "direct_grounded") {
            expect(item.sourceUrls.length).toBeGreaterThan(0);
          }
        }
      },
      180_000,
    );
  },
);
