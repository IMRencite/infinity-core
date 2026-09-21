/**
 * Isolated imros-public deploy from imros-public-deploy, not the founder dirty tree.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

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

const PROJECT = "imros-public";
const PROJECT_ID = "prj_vFJv26Vt5w08ShcrqqBQmcHTVxcX";
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const dest = join(process.cwd(), "..", "imros-public-deploy");
if (!token || !team) {
  console.log(JSON.stringify({ ok: false, reason: "VERCEL_TOKEN_OR_TEAM_MISSING" }));
  process.exit(1);
}
if (!existsSync(dest)) {
  console.log(JSON.stringify({ ok: false, reason: "IMROS_PUBLIC_DEPLOY_MISSING" }));
  process.exit(1);
}

mkdirSync(join(dest, ".vercel"), { recursive: true });
writeFileSync(
  join(dest, ".vercel/project.json"),
  JSON.stringify({ projectId: PROJECT_ID, orgId: team, projectName: PROJECT }, null, 2),
);

const deploy = spawnSync(
  "npx",
  ["vercel@latest", "deploy", "--prod", "--yes", `--token=${token}`, `--scope=${team}`],
  {
    cwd: dest,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: PROJECT_ID },
  },
);

const urls = `${deploy.stdout || ""}\n${deploy.stderr || ""}`.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/gi) ?? [];
console.log(JSON.stringify({
  ok: deploy.status === 0,
  isolated: true,
  dirtyTreeDeployed: false,
  project: PROJECT,
  projectId: PROJECT_ID,
  url: urls.find((row) => row.includes("imros-public")) ?? urls[urls.length - 1] ?? "https://imros-public.vercel.app",
  exit: deploy.status,
  tail: (deploy.stderr || deploy.stdout || "").split("\n").slice(-20),
}, null, 2));
if (deploy.status !== 0) process.exit(1);
