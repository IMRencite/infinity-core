import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutonomousExternalAuthorizationE2EValidation } from "../validate-autonomous-external-authorization-e2e";

const runLive =
  process.env.RUN_AUTONOMOUS_EXTERNAL_AUTHORIZATION_E2E === "true" &&
  process.env.NODE_ENV !== "production";

describe("Autonomous external authorization E2E (development)", () => {
  it.runIf(runLive)(
    "auto-authorizes live-scope actions and completes launch simulation via gateway",
    async () => {
      const admin = createAdminClient();
      const report = await runAutonomousExternalAuthorizationE2EValidation(admin);
      console.log(JSON.stringify(report, null, 2));
      expect(report.pass).toBe(true);
      expect(report.launchSimulationComplete).toBe(true);
      expect(report.authorizationSources.every((s) => s === "autonomous_policy")).toBe(true);
    },
    600_000,
  );
});
