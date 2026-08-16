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
process.env.RUN_VERCEL_CLEAN_ROOM = process.env.RUN_VERCEL_CLEAN_ROOM ?? "true";
process.env.NODE_ENV = process.env.NODE_ENV ?? "development";

const unit = spawnSync(
  process.execPath,
  ["./node_modules/vitest/vitest.mjs", "run", "lib/infinity/production-artifact/__tests__/vercel-deployment-readiness.test.ts"],
  { cwd: root, stdio: "inherit", env: process.env },
);

if (unit.status !== 0) {
  process.exit(unit.status ?? 1);
}

console.log("\nvalidate:vercel-deployment-readiness — PASS (no live Vercel/GitHub mutations)\n");
process.exit(0);
