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

if (process.env.RUN_ORGANIC_GROWTH_PAB_V21_LIVE === "true") {
  process.env.AI_PROVIDER_ALLOW_LIVE_EXECUTION = "true";
  process.env.PAB_V21_LIVE_MODE = "true";
  process.env.PRODUCT_ASSET_BUILDER_V21_ENABLED = "true";
  process.env.ORGANIC_GROWTH_PAB_V21_SUFFIX =
    process.env.ORGANIC_GROWTH_PAB_V21_SUFFIX ?? `pab-v21-${Date.now()}`;
}

process.env.RUN_ORGANIC_GROWTH_V1_TEST = "true";
process.env.ORGANIC_GROWTH_ENGINE_ENABLED = "true";
process.env.ORGANIC_GROWTH_TEST_IDEMPOTENCY_SUFFIX =
  process.env.ORGANIC_GROWTH_TEST_IDEMPOTENCY_SUFFIX ?? `live-${Date.now()}`;

if (!process.env.ORGANIC_GROWTH_TEST_ORG_ID) {
  process.env.ORGANIC_GROWTH_TEST_ORG_ID =
    process.env.COMPANY_BUILDER_TEST_ORG_ID ??
    process.env.RESEARCH_TEST_ORG_ID ??
    "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
}

const unit = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "lib/infinity/organic-growth-engine/__tests__/organic-growth-engine.test.ts",
    "lib/infinity/organic-growth-engine/__tests__/organic-growth-v1.1-integration.test.ts",
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
    "lib/infinity/organic-growth-engine/__tests__/organic-growth-engine-live.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env, timeout: 300000 },
);

if ((live.status ?? 1) !== 0) {
  process.exit(live.status ?? 1);
}

if (process.env.RUN_ORGANIC_GROWTH_PAB_V21_LIVE === "true") {
  const pabLive = spawnSync(
    process.execPath,
    [
      "./node_modules/vitest/vitest.mjs",
      "run",
      "lib/infinity/organic-growth-engine/__tests__/organic-growth-pab-v21-live.test.ts",
    ],
    { cwd: root, stdio: "inherit", env: process.env, timeout: 900000 },
  );
  process.exit(pabLive.status ?? 1);
}

if (process.env.RUN_ORGANIC_GROWTH_PIPELINE_LIVE === "true") {
  const pipeline = spawnSync(
    process.execPath,
    [
      "./node_modules/vitest/vitest.mjs",
      "run",
      "lib/infinity/organic-growth-engine/__tests__/organic-growth-pipeline-live.test.ts",
    ],
    { cwd: root, stdio: "inherit", env: process.env, timeout: 300000 },
  );
  process.exit(pipeline.status ?? 1);
}

process.exit(0);
