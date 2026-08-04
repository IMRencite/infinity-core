import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAiWebsiteGenerationE2EValidation } from "@/lib/infinity/ai-website-generation/validate-e2e";

const runLive = process.env.RUN_AI_WEBSITE_GENERATION_E2E_LIVE === "true";

describe("AI website generation live E2E (development)", () => {
  it.runIf(runLive)(
    "runs mock advisory AI website flow through worker runtime",
    async () => {
      const admin = createAdminClient();
      const report = await runAiWebsiteGenerationE2EValidation(admin);
      console.log(JSON.stringify(report, null, 2));
      expect(report.pass, report.errors.join("; ")).toBe(true);
      expect(report.aiPlanId).toBeTruthy();
      expect(report.pagePlanCount).toBeGreaterThan(0);
    },
    900_000,
  );
});
