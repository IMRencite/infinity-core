import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runExecutivePlannerHandoffE2EValidation } from "@/lib/infinity/executive-selection/validate-planner-handoff-e2e";

const runLive =
  process.env.RUN_EXECUTIVE_PLANNER_HANDOFF_E2E_LIVE === "true" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

describe("Executive → Planner handoff live E2E (development)", () => {
  it.runIf(runLive)(
    "canonical selection authorizes one durable plan via mission runtime",
    async () => {
      const admin = createAdminClient();
      const report = await runExecutivePlannerHandoffE2EValidation(admin);
      console.log(JSON.stringify(report, null, 2));
      expect(report.pass, report.errors.join("; ")).toBe(true);
      expect(report.canonicalSelectionDecisionId).toBeTruthy();
      expect(report.planId).toBeTruthy();
      expect(report.duplicatePlanCount).toBe(0);
    },
    1_200_000,
  );
});
