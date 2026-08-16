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

process.env.RUN_MONETIZATION_ENGINE_V1_TEST = "true";
process.env.MONETIZATION_ENGINE_ENABLED = "true";
process.env.RESEARCH_PROVIDER = process.env.RESEARCH_PROVIDER ?? "gemini";
process.env.RESEARCH_ENABLED = "true";
process.env.GEMINI_RESEARCH_MODEL =
  process.env.GEMINI_LIVE_TEST_MODEL?.trim() || "gemini-3-flash-preview";
process.env.MONETIZATION_ENGINE_MAX_CANDIDATES =
  process.env.MONETIZATION_ENGINE_MAX_CANDIDATES ?? "3";
process.env.MONETIZATION_ENGINE_MAX_RESEARCH_CALLS =
  process.env.MONETIZATION_ENGINE_MAX_RESEARCH_CALLS ?? "5";
process.env.MONETIZATION_ENGINE_TEST_IDEMPOTENCY_SUFFIX =
  process.env.MONETIZATION_ENGINE_TEST_IDEMPOTENCY_SUFFIX ?? `live-${Date.now()}`;

if (!process.env.MONETIZATION_ENGINE_TEST_ORG_ID) {
  process.env.MONETIZATION_ENGINE_TEST_ORG_ID =
    process.env.OPPORTUNITY_SCANNER_TEST_ORG_ID ??
    process.env.RESEARCH_TEST_ORG_ID ??
    process.env.AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ID ??
    "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
}

const result = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "lib/infinity/monetization-engine/__tests__/monetization-engine-live.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env, timeout: 900000 },
);

process.exit(result.status ?? 1);
