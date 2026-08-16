/**
 * RUN_AUTONOMOUS_LIVE_LAUNCH_RETRY_2_1=true node scripts/execute-autonomous-live-retry-2-1.mjs
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutonomousControlledLiveLaunchRetry21 } from "@/lib/infinity/launch-gateway/execute-autonomous-live-retry-2-1";

describe.runIf(process.env.RUN_AUTONOMOUS_LIVE_LAUNCH_RETRY_2_1 === "true")(
  "Autonomous Live Launch Retry #2.1",
  () => {
    it(
      "executes prepared launch through gateway to externally_live",
      async () => {
        const admin = createAdminClient();
        const report = await runAutonomousControlledLiveLaunchRetry21(admin);
        console.log(JSON.stringify(report, null, 2));
        expect(report.preparedState).toBe("PASS");
        expect(report.humanApprovalsUsed).toBe(0);
        expect(report.externallyLive).toBe("YES");
        expect(report.finalStatus).toBe("AUTONOMOUS LIVE LAUNCH SUCCESS");
      },
      900_000,
    );
  },
);
