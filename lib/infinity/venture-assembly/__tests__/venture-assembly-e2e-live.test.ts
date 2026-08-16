import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runVentureAssemblyE2EValidation } from "@/lib/infinity/venture-assembly/validate-e2e";

const runLive =
  process.env.RUN_VENTURE_ASSEMBLY_E2E_LIVE === "true" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

describe("Venture Assembly live E2E (development)", () => {
  it.runIf(runLive)(
    "completed plan execution becomes internally_ready venture assembly",
    async () => {
      const admin = createAdminClient();
      const report = await runVentureAssemblyE2EValidation(admin);
      console.log(JSON.stringify(report, null, 2));
      expect(report.pass, report.errors.join("; ")).toBe(true);
      expect(report.ventureAssemblyId).toBeTruthy();
      expect(report.assemblyStatus).toBe("internally_ready");
      expect(report.readinessStatus).toBe("internally_ready");
      expect(report.qaVerdict).toBe("pass");
      expect(report.assemblyCountForIdempotency).toBe(1);
      expect(report.externalSideEffects.deployments).toBe(0);
    },
    1_800_000,
  );
});
