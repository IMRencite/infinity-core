import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  try {
    const content = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      let val = trimmed.slice(separator + 1);
      const key = trimmed.slice(0, separator);
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

loadEnvLocal();
process.env.EXTERNAL_ACTIONS_LIVE_ENABLED = "true";
process.env.LIVE_PROVIDER_TEST_MODE = "true";
process.env.RUN_AUTONOMOUS_LIVE_LAUNCH_RETRY_2_2 = "true";

const result = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "lib/infinity/launch-gateway/__tests__/execute-autonomous-live-retry-2-2.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env, timeout: 900000 },
);

process.exit(result.status ?? 1);
