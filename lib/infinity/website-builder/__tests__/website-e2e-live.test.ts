import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runWebsiteBuilderE2EValidation } from "@/lib/infinity/website-builder/validate-e2e";

const runLive = process.env.RUN_WEBSITE_BUILDER_E2E_LIVE === "true";

describe("website builder live E2E (development)", () => {
  it.runIf(runLive)(
    "runs full internal website build flow against live database",
    async () => {
      const admin = createAdminClient();
      const report = await runWebsiteBuilderE2EValidation(admin);
      console.log(JSON.stringify(report, null, 2));
      expect(report.pass, report.errors.join("; ")).toBe(true);
      expect(report.websiteMetadataLoaded).toBe(true);
    },
    600_000,
  );
});
