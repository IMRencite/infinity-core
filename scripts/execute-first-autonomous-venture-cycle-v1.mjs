import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  try {
    for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      let val = trimmed.slice(sep + 1);
      const key = trimmed.slice(0, sep);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

process.env.RUN_FIRST_AUTONOMOUS_VENTURE_CYCLE_V1 = "true";
process.env.OPPORTUNITY_SCANNER_ENABLED = "true";
process.env.RESEARCH_ENABLED = "true";
process.env.MONETIZATION_ENGINE_ENABLED = "true";
process.env.VENTURE_SELECTION_ENABLED = "true";
process.env.VENTURE_SELECTION_RUN_ADVERSARIAL = "true";
process.env.COMPANY_BUILDER_ENABLED = "true";
process.env.ORGANIC_GROWTH_ENGINE_ENABLED = "true";
process.env.AI_PROVIDER_ALLOW_LIVE_EXECUTION = "true";
process.env.PAB_V21_LIVE_MODE = "true";
process.env.FAVC1_CYCLE_KEY = process.env.FAVC1_CYCLE_KEY ?? `cycle-${Date.now()}`;

if (!process.env.FIRST_AUTONOMOUS_VENTURE_ORG_ID) {
  process.env.FIRST_AUTONOMOUS_VENTURE_ORG_ID =
    process.env.AUTONOMOUS_EXTERNAL_CONTROLLED_ORG_ID ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
}

const result = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "lib/infinity/first-autonomous-venture-cycle/__tests__/execute-v1-live.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env, timeout: 2_500_000 },
);

process.exit(result.status ?? 1);
