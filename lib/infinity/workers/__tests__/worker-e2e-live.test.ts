import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runWorkerCapabilityE2EValidation } from "@/lib/infinity/workers/validate-e2e";

const runLive = process.env.RUN_WORKER_E2E_LIVE === "true";

describe("worker capability live E2E (development)", () => {
  it.runIf(runLive)(
    "runs full governed worker flow against live database",
    async () => {
      const admin = createAdminClient();
      const report = await runWorkerCapabilityE2EValidation(admin);
      console.log(JSON.stringify(report, null, 2));
      expect(report.pass, report.errors.join("; ")).toBe(true);
    },
    180_000,
  );
});
