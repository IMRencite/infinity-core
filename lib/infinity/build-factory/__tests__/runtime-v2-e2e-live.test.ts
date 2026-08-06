import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runBuildFactoryRuntimeV2E2EValidation } from "@/lib/infinity/build-factory/validate-runtime-v2-e2e";

const runLive =
  process.env.RUN_BUILD_FACTORY_RUNTIME_V2_E2E_LIVE === "true" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

describe("Build Factory Runtime v2 live E2E (development)", () => {
  it.runIf(runLive)(
    "generic BuildJob through website builder adapter",
    async () => {
      const admin = createAdminClient();
      const report = await runBuildFactoryRuntimeV2E2EValidation(admin);
      console.log(JSON.stringify(report, null, 2));
      expect(report.pass, report.errors.join("; ")).toBe(true);
      expect(report.buildJobId).toBeTruthy();
      expect(report.builderKey).toMatch(/^website\.internal/);
    },
    1_200_000,
  );
});
