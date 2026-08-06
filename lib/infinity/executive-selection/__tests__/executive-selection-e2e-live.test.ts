import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runExecutiveSelectionE2EValidation } from "@/lib/infinity/executive-selection/validate-e2e";

const runLive =
  process.env.RUN_EXECUTIVE_SELECTION_E2E_LIVE === "true" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

describe("Executive selection live E2E (development)", () => {
  it.runIf(runLive)(
    "autonomous executive context and selection pipeline",
    async () => {
      const admin = createAdminClient();
      const report = await runExecutiveSelectionE2EValidation(admin);
      console.log(JSON.stringify(report, null, 2));
      expect(report.pass, report.errors.join("; ")).toBe(true);
      expect(report.executiveContextId).toBeTruthy();
      expect(report.selectedOpportunityId).toBeTruthy();
    },
    900_000,
  );
});
