#!/usr/bin/env node
/**
 * Explicit read-only commercial provider verification.
 * Isolated from `npm run dev`. Optional missing credentials → SKIP, not fake pass.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  try {
    const content = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator);
      let val = trimmed.slice(separator + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();
process.env.RUN_COMMERCIAL_LIVE_PROBE = "true";

const unit = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "lib/infinity/commercialization/__tests__/live-provider-probes.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: { ...process.env, RUN_COMMERCIAL_LIVE_PROBE: "false" } },
);
if ((unit.status ?? 1) !== 0) process.exit(unit.status ?? 1);

const live = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "lib/infinity/commercialization/__tests__/live-provider-verification.live.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env },
);

process.exit(live.status ?? 1);
