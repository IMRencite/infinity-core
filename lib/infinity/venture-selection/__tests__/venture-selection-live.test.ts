/**
 * RUN_VENTURE_SELECTION_V1_TEST=true node scripts/run-venture-selection-v1-test.mjs
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runVentureSelectionV1Test } from "@/lib/infinity/venture-selection/run";

describe.runIf(process.env.RUN_VENTURE_SELECTION_V1_TEST === "true")(
  "Venture Selection v1 live test",
  () => {
    it(
      "evaluates persisted candidates and persists venture queue decisions",
      async () => {
        const admin = createAdminClient();
        const orgId = process.env.VENTURE_SELECTION_TEST_ORG_ID?.trim();
        if (!orgId) {
          throw new Error("VENTURE_SELECTION_TEST_ORG_ID is required for live test.");
        }

        const output = await runVentureSelectionV1Test(admin, orgId);
        console.log(JSON.stringify(output, null, 2));

        expect(output.ok).toBe(true);
        if (!output.ok) return;

        expect(output.report.candidatesEvaluated).toBeGreaterThanOrEqual(1);
        expect(output.evaluations.length).toBeGreaterThanOrEqual(1);
        expect(output.report.queue.length).toBe(output.evaluations.length);

        for (const evaluation of output.evaluations) {
          expect(["BUILD", "VALIDATE", "HOLD", "REJECT"]).toContain(evaluation.decision);
          expect(evaluation.selectionScore).toBeGreaterThan(0);
          expect(evaluation.validationScore).toBeGreaterThan(0);
          expect(evaluation.assumptions.length).toBeGreaterThan(0);
          expect(evaluation.explanation.whyThisOpportunity.length).toBeGreaterThan(0);
          if (evaluation.decision === "BUILD") {
            expect(evaluation.handoff).not.toBeNull();
          } else {
            expect(evaluation.handoff).toBeNull();
          }
        }

        const decisions = output.evaluations.map((item) => item.decision);
        expect(decisions.length).toBeGreaterThan(0);
      },
      900_000,
    );
  },
);
