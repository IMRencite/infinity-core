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

function runOnce(runIndex) {
  process.env.APE_E2E_RUN_INDEX = String(runIndex);
  const result = spawnSync(
    process.execPath,
    [
      "./node_modules/vitest/vitest.mjs",
      "run",
      "lib/infinity/plan-execution/__tests__/autonomous-plan-execution-e2e-live.test.ts",
    ],
    { cwd: root, stdio: "inherit", env: process.env },
  );
  return result.status ?? 1;
}

loadEnvLocal();
process.env.RUN_AUTONOMOUS_PLAN_EXECUTION_E2E_LIVE = "true";
process.env.NODE_ENV = process.env.NODE_ENV ?? "development";

const first = runOnce(1);
if (first !== 0) {
  process.exit(first);
}
const second = runOnce(2);
process.exit(second);
