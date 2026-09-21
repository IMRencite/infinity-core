import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] ?? "prerun";

if (mode === "run" || mode === "report") {
  console.log(
    JSON.stringify(
      {
        ok: false,
        error: "LIVE_ATTEMPT_BLOCKED",
        mode,
        message: "Live attempt 9/10 is blocked. Allowed modes: prerun, snapshot, forensic.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

if (mode !== "prerun" && mode !== "snapshot" && mode !== "forensic") {
  console.log(JSON.stringify({ ok: false, error: "unknown_mode", mode }, null, 2));
  process.exit(1);
}

const viteNode = join(root, "node_modules/vite-node/vite-node.mjs");
const entry = join(
  root,
  mode === "forensic" ? "scripts/live-cms-money-intelligence-v9-forensic.ts" : "scripts/live-cms-money-intelligence-v9-prerun.ts",
);
const config = join(root, "vitest.config.ts");
const result = spawnSync(process.execPath, [viteNode, "-c", config, entry, mode, ...process.argv.slice(3)], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
