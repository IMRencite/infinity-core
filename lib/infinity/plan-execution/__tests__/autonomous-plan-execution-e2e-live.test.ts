import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutonomousPlanExecutionE2EValidation } from "@/lib/infinity/plan-execution/validate-e2e";

const runLive =
  process.env.RUN_AUTONOMOUS_PLAN_EXECUTION_E2E_LIVE === "true" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

describe("Autonomous Plan Execution live E2E (development)", () => {
  it.runIf(runLive)(
    "governed lifecycle through PlanExecution coordination",
    async () => {
      const admin = createAdminClient();
      const report = await runAutonomousPlanExecutionE2EValidation(admin);
      console.log(JSON.stringify(report, null, 2));
      expect(report.pass, report.errors.join("; ")).toBe(true);
      expect(report.planExecutionId).toBeTruthy();
      expect(report.finalPlanExecutionStatus).toBe("internally_complete");
      expect(report.reproducibilityStatus).toMatch(/reproducible|passed/);
    },
    1_350_000,
  );
});
