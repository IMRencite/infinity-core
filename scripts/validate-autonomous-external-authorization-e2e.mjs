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
      process.env[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();
process.env.RUN_AUTONOMOUS_EXTERNAL_AUTHORIZATION_E2E = "true";
process.env.EXTERNAL_ACTIONS_LIVE_ENABLED = "false";
process.env.NODE_ENV = process.env.NODE_ENV ?? "development";

const result = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "lib/infinity/launch-gateway/__tests__/autonomous-external-authorization-e2e-live.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env },
);

process.exit(result.status ?? 1);
