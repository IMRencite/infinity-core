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

process.env.RUN_CREATIVE_MEDIA_V1_TEST = "true";
process.env.CREATIVE_MEDIA_ENGINE_ENABLED = "true";
process.env.CREATIVE_MEDIA_TEST_IDEMPOTENCY_SUFFIX =
  process.env.CREATIVE_MEDIA_TEST_IDEMPOTENCY_SUFFIX ?? `test-${Date.now()}`;

if (!process.env.CREATIVE_MEDIA_TEST_ORG_ID) {
  process.env.CREATIVE_MEDIA_TEST_ORG_ID =
    process.env.ORGANIC_GROWTH_TEST_ORG_ID ??
    process.env.COMPANY_BUILDER_TEST_ORG_ID ??
    "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
}

const unit = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "lib/infinity/creative-media-engine/__tests__/creative-media-engine.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env, timeout: 300000 },
);

if ((unit.status ?? 1) !== 0) {
  process.exit(unit.status ?? 1);
}

if (process.env.RUN_CREATIVE_MEDIA_V1_LIVE === "true") {
  process.env.AI_PROVIDER_ALLOW_LIVE_EXECUTION = "true";
  process.env.CREATIVE_MEDIA_ENGINE_LIVE = "true";
  process.env.CREATIVE_MEDIA_ALLOW_MOCK = "false";
  const imageLive = spawnSync(
    process.execPath,
    [
      "./node_modules/vitest/vitest.mjs",
      "run",
      "lib/infinity/creative-media-engine/__tests__/creative-media-engine-live.test.ts",
    ],
    { cwd: root, stdio: "inherit", env: process.env, timeout: 600000 },
  );
  process.exit(imageLive.status ?? 1);
}

const persistence = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "lib/infinity/creative-media-engine/__tests__/creative-media-engine-live.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env, timeout: 300000 },
);

process.exit(persistence.status ?? 1);
