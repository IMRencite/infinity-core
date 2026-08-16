/**
 * RUN_PREPARE_AUTONOMOUS_LIVE_RETRY_2_1=true node scripts/prepare-autonomous-live-retry-2-1.mjs
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { prepareAutonomousLiveLaunchRetry21 } from "@/lib/infinity/launch-gateway/prepare-autonomous-live-retry-2-1";

describe("Prepare Autonomous Live Launch Retry #2.1", () => {
  it.skipIf(process.env.RUN_PREPARE_AUTONOMOUS_LIVE_RETRY_2_1 !== "true")(
    "builds nextjs artifact and prepares launch without live mutations",
    async () => {
      const admin = createAdminClient();
      const report = await prepareAutonomousLiveLaunchRetry21(admin);
      console.log(JSON.stringify(report, null, 2));
      expect(report.externalMutationsPerformed).toBe(0);
      expect(report.historicalPreserved).toBe(true);
      expect(report.finalStatus).toBe("READY FOR AUTONOMOUS LIVE EXECUTION #2.1");
      expect(report.productionArtifact.framework).toBe("nextjs");
      expect(report.autonomousAuthorizations).toBeGreaterThan(0);
      expect(report.humanApprovalsRequired).toBe(0);
    },
    900_000,
  );
});
