import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const TEAM = "team_ildi4jRJvHUKWF93cu4XEZ7Z";
const ORGANIC_PRJ = "prj_2eXHzKYh2VSd6qnK80dkV6eZL1Pp";
const DEST = join(tmpdir(), "infinity-organic-isolated-v28");
const persist = readFileSync(join(DEST, "lib/infinity/organic-growth-engine/obligation/persist.ts"), "utf8");
const route = readFileSync(join(DEST, "app/api/runtime/organic-tick/route.ts"), "utf8");
const cron = JSON.parse(readFileSync(join(DEST, "vercel.json"), "utf8"));
if (cron.crons?.[0]?.path !== "/api/runtime/organic-tick" || cron.crons?.[0]?.schedule !== "*/15 * * * *") {
  console.log(JSON.stringify({ ok: false, reason: "CRON_SHAPE_CHANGED" }));
  process.exit(1);
}
if (!/deriveEffectiveOrganicExecutionState/.test(persist) || !/executeOrganicScheduledWorkflow/.test(route)) {
  console.log(JSON.stringify({ ok: false, reason: "DEST_MISSING_SCHEDULED_WORKFLOW" }));
  process.exit(1);
}

function token() {
  return JSON.parse(readFileSync(join(homedir(), "AppData/Roaming/com.vercel.cli/Data/auth.json"), "utf8")).token;
}
async function api(path) {
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${TEAM}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const env = { ...process.env };
delete env.VERCEL_TOKEN;
const deploy = spawnSync("powershell.exe", [
  "-NoProfile",
  "-Command",
  `$ErrorActionPreference='Continue'; Set-Location -LiteralPath '${DEST.replace(/'/g, "''")}'; vercel deploy --prod --yes --scope infinite-media-resources-imr`,
], { encoding: "utf8", env, timeout: 420000 });
const deployText = `${deploy.stdout || ""}\n${deploy.stderr || ""}`;
const ids = deployText.match(/dpl_[A-Za-z0-9]+/g) ?? [];
const staged = ids[ids.length - 1] ?? null;
if (!staged) {
  const out = { ok: false, reason: "NO_DEPLOYMENT_ID", deploy_status: deploy.status, text_tail: deployText.replace(/[A-Za-z0-9._-]{20,}/g, "[redacted]").slice(-400) };
  writeFileSync(join(process.cwd(), ".infinity/blog-os/v54-organic-dest-deploy.json"), `${JSON.stringify(out, null, 2)}\n`);
  console.log(JSON.stringify(out, null, 2));
  process.exit(1);
}

const promote = spawnSync("powershell.exe", [
  "-NoProfile",
  "-Command",
  `$ErrorActionPreference='Continue'; Set-Location -LiteralPath '${DEST.replace(/'/g, "''")}'; vercel promote ${staged} --yes --scope infinite-media-resources-imr`,
], { encoding: "utf8", env, timeout: 180000 });
const after = await api(`/v9/projects/${ORGANIC_PRJ}`);
const crons = after.json?.crons ?? null;
const out = {
  collected_at: new Date().toISOString(),
  dest_only: true,
  cron_untouched: true,
  manual_tick_invocation: false,
  scheduled_workflow_in_dest: true,
  deploy_status: deploy.status,
  staged,
  promote_status: promote.status,
  promote_ok: promote.status === 0,
  after_production: after.json?.targets?.production?.id ?? null,
  after_cron_dpl: crons?.deploymentId ?? null,
  after_cron_path: crons?.definitions?.[0]?.path ?? null,
  after_cron_schedule: crons?.definitions?.[0]?.schedule ?? null,
  organic_cron_registered: crons?.definitions?.[0]?.path === "/api/runtime/organic-tick" && crons?.definitions?.[0]?.schedule === "*/15 * * * *",
  cron_current: crons?.deploymentId === staged,
  text_tail: `${deployText}\n${promote.stdout || ""}\n${promote.stderr || ""}`.replace(/[A-Za-z0-9._-]{20,}/g, "[redacted]").slice(-600),
  token_printed: false,
};
writeFileSync(join(process.cwd(), ".infinity/blog-os/v54-organic-dest-deploy.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
process.exit(out.promote_ok && out.organic_cron_registered && out.cron_current ? 0 : 1);
