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

process.env.RUN_GEMINI_GROUNDED_RESEARCH_V1_TEST = "true";
process.env.RESEARCH_PROVIDER = process.env.RESEARCH_PROVIDER ?? "gemini";
process.env.RESEARCH_ENABLED = "true";
// Live verification uses a supported model after .env.local load; legacy 2.x models may be
// unavailable for new API keys. Set GEMINI_LIVE_TEST_MODEL to override explicitly.
process.env.GEMINI_RESEARCH_MODEL =
  process.env.GEMINI_LIVE_TEST_MODEL?.trim() || "gemini-3-flash-preview";
process.env.RESEARCH_MAX_OUTPUT_TOKENS =
  process.env.RESEARCH_MAX_OUTPUT_TOKENS ?? "16384";
process.env.RESEARCH_MAX_RETRIES = process.env.RESEARCH_MAX_RETRIES ?? "4";
process.env.RESEARCH_TEST_IDEMPOTENCY_SUFFIX =
  process.env.RESEARCH_TEST_IDEMPOTENCY_SUFFIX ?? `live-${Date.now()}`;

process.env.RESEARCH_LIVE_TEST_OBJECTIVE =
  process.env.RESEARCH_LIVE_TEST_OBJECTIVE ??
  "Identify three growing online business opportunities in the United States in 2026 that could potentially be launched by a small software-driven company. Provide evidence, sources, market signals, risks, and monetization possibilities.";

if (!process.env.RESEARCH_TEST_ORG_ID) {
  process.env.RESEARCH_TEST_ORG_ID =
    process.env.AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ID ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
}

const result = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "lib/infinity/research/__tests__/gemini-live.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env, timeout: 300000 },
);

process.exit(result.status ?? 1);
