import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const preflight = spawnSync(process.execPath, [join(root, "scripts/preflight-vercel-live-verification.mjs")], {
  cwd: root,
  encoding: "utf8",
  env: process.env,
});

if (preflight.stdout) process.stdout.write(preflight.stdout);
if (preflight.stderr) process.stderr.write(preflight.stderr);

if (preflight.status !== 0) {
  console.error("Vercel live verification refused: preflight blockers remain. No Vercel write was performed.");
  process.exit(preflight.status ?? 1);
}

console.error(
  "Vercel live verification refused: preflight passed config but this script will not synthesize venture/handoff/readiness lineage or call Vercel.",
);
process.exit(1);
