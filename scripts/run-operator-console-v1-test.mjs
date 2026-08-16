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

const unit = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "lib/infinity/operator-console/__tests__/operator-console.test.ts",
    "lib/infinity/operator-console/__tests__/operator-console-security.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env, timeout: 120000 },
);

if ((unit.status ?? 1) !== 0) process.exit(unit.status ?? 1);

if (process.env.RUN_OPERATOR_CONSOLE_V1_LIVE === "true") {
  const live = spawnSync(
    process.execPath,
    ["./node_modules/vitest/vitest.mjs", "run", "lib/infinity/operator-console/__tests__/operator-console-live.test.ts"],
    { cwd: root, stdio: "inherit", env: process.env, timeout: 120000 },
  );
  if ((live.status ?? 1) !== 0) process.exit(live.status ?? 1);
}

const typecheck = spawnSync(
  process.execPath,
  ["./node_modules/typescript/lib/tsc.js", "--noEmit", "-p", "tsconfig.operator-console.json"],
  { cwd: root, stdio: "inherit", env: process.env, timeout: 120000 },
);

process.exit(typecheck.status ?? 1);
