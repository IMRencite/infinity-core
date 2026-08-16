/**
 * Autonomous Controlled Live Launch Retry #2
 * RUN_AUTONOMOUS_LIVE_LAUNCH_RETRY_2=true node scripts/execute-autonomous-controlled-live-launch-retry-2.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutonomousControlledLiveLaunchRetry2 } from "@/lib/infinity/launch-gateway/execute-autonomous-live-retry-2";

function loadEnvLocal(): void {
  try {
    const content = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      let val = trimmed.slice(sep + 1);
      const key = trimmed.slice(0, sep);
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

const RUN = process.env.RUN_AUTONOMOUS_LIVE_LAUNCH_RETRY_2 === "true";

describe.runIf(RUN)("Autonomous Controlled Live Launch Retry #2", () => {
  loadEnvLocal();

  it(
    "executes live launch with autonomous authorization only",
    async () => {
      const admin = createAdminClient();
      const report = await runAutonomousControlledLiveLaunchRetry2(admin);
      console.log(JSON.stringify(report, null, 2));
    },
    900_000,
  );
});
