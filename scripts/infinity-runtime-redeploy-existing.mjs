/**
 * Redeploy the already-built isolated runtime worktree.
 * Does not copy the founder dirty tree.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep);
    let val = trimmed.slice(sep + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();
const dest = join(tmpdir(), "infinity-runtime-isolated-v1");
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const PROJECT_ID = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
if (!existsSync(join(dest, "app/api/runtime/tick/route.ts"))) {
  console.log(JSON.stringify({ ok: false, reason: "ISOLATED_DEST_MISSING" }));
  process.exit(1);
}
const deploy = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vercel@latest", "deploy", "--prod", "--yes", `--token=${token}`, `--scope=${team}`],
  {
    cwd: dest,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: PROJECT_ID },
  },
);
const combined = `${deploy.stdout || ""}\n${deploy.stderr || ""}`.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]");
const urls = combined.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/gi) ?? [];
console.log(JSON.stringify({
  ok: deploy.status === 0,
  dest,
  exit: deploy.status,
  url: urls.find((row) => row.includes("infinity-runtime")) ?? urls[urls.length - 1] ?? null,
  logTail: combined.split(/\r?\n/).filter(Boolean).slice(-25),
}, null, 2));
if (deploy.status !== 0) process.exit(1);
