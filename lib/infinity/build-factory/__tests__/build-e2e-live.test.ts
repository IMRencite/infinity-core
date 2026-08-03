import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runBuildFactoryE2EValidation } from "@/lib/infinity/build-factory/validate-e2e";

const runLive = process.env.RUN_BUILD_FACTORY_E2E_LIVE === "true";

describe("build factory live E2E (development)", () => {
  it.runIf(runLive)(
    "runs full internal build flow against live database",
    async () => {
      const admin = createAdminClient();
      const report = await runBuildFactoryE2EValidation(admin);
      console.log(JSON.stringify(report, null, 2));
      expect(report.pass, report.errors.join("; ")).toBe(true);
    },
    300_000,
  );
});
