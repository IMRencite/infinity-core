import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runLaunchGatewayE2EValidation } from "@/lib/infinity/launch-gateway/validate-e2e";
import { isExternalActionsLiveEnabled } from "@/lib/infinity/launch-gateway/kill-switch";

const runLive =
  process.env.RUN_LAUNCH_GATEWAY_E2E_LIVE === "true" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

describe("Launch Gateway live E2E (development)", () => {
  it.runIf(runLive)(
    "simulated launch through gateway with zero live side effects",
    async () => {
      expect(isExternalActionsLiveEnabled()).toBe(false);
      const admin = createAdminClient();
      const report = await runLaunchGatewayE2EValidation(admin);
      console.log(JSON.stringify(report, null, 2));
      expect(report.pass, report.errors.join("; ")).toBe(true);
      expect(report.launchSimulationComplete).toBe(true);
      expect(report.actionCount).toBeGreaterThanOrEqual(5);
      expect(report.replayLaunchPlanReused).toBe(true);
      expect(report.externalSideEffects.deployments).toBe(0);
      expect(report.killSwitchLiveEnabled).toBe(false);
    },
    2_400_000,
  );
});
