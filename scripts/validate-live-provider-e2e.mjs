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
process.env.RUN_LIVE_PROVIDER_E2E = "true";
if (process.env.RUN_LIVE_PROVIDER_E2E_MUTATION !== "true") {
  process.env.EXTERNAL_ACTIONS_LIVE_ENABLED = "false";
  process.env.GITHUB_LIVE_ENABLED = "false";
  process.env.VERCEL_LIVE_ENABLED = "false";
  delete process.env.GITHUB_TOKEN;
  delete process.env.VERCEL_TOKEN;
}

const result = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "lib/infinity/launch-gateway/__tests__/live-provider-e2e-fail-closed.test.ts",
    "lib/infinity/launch-gateway/__tests__/live-provider.test.ts",
    "lib/infinity/launch-gateway/__tests__/provider-boundary.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env },
);

process.exit(result.status ?? 1);
