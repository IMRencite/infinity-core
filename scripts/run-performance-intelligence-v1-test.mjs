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

process.env.RUN_PERFORMANCE_INTELLIGENCE_V1_TEST = "true";
process.env.RUN_PERFORMANCE_INTELLIGENCE_RLS_TEST = "true";
process.env.PERFORMANCE_INTELLIGENCE_ENGINE_ENABLED = "true";
process.env.PERFORMANCE_INTELLIGENCE_TEST_SUFFIX =
  process.env.PERFORMANCE_INTELLIGENCE_TEST_SUFFIX ?? `test-${Date.now()}`;

if (!process.env.PERFORMANCE_INTELLIGENCE_TEST_ORG_ID) {
  process.env.PERFORMANCE_INTELLIGENCE_TEST_ORG_ID =
    process.env.CREATIVE_MEDIA_TEST_ORG_ID ??
    process.env.ORGANIC_GROWTH_TEST_ORG_ID ??
    "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
}

const unit = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "lib/infinity/performance-intelligence-engine/__tests__/performance-intelligence-engine.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env, timeout: 300000 },
);

if ((unit.status ?? 1) !== 0) {
  process.exit(unit.status ?? 1);
}

const live = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "lib/infinity/performance-intelligence-engine/__tests__/performance-intelligence-engine-live.test.ts",
    "lib/infinity/performance-intelligence-engine/__tests__/performance-intelligence-rls-security.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env, timeout: 300000 },
);

process.exit(live.status ?? 1);
