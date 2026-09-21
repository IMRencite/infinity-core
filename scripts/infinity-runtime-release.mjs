/**
 * Thin production release. No new gates.
 * clean checkout → isolated stage → smoke → promote → wait real cron → rollback if silent
 *
 * Vercel semantics enforced here (learned by outage):
 * 1. Cron targets the production deployment. Alias is not a cron host.
 * 2. Instant promote works only for staged production (--prod --skip-domain), not previews.
 * 3. Redeploy inherits current production env.
 * 4. CLI uploads have no git SHA; identity must be baked into the artifact.
 * 5. Rollback must be followed by a real production target, or cron stays on the dead host.
 */
import { existsSync, readFileSync } from "node:fs";
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

const PROJECT_ID = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const root = process.cwd();
const TICK_URL = "https://infinity-runtime.vercel.app/api/runtime/communication-tick";

if (!token || !team) {
  console.log(JSON.stringify({ ok: false, reason: "VERCEL_TOKEN_OR_TEAM_MISSING" }));
  process.exit(1);
}

const dirty = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
const dirtyEntries = (dirty.stdout || "").split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
if (dirtyEntries.length) {
  console.log(JSON.stringify({
    ok: false,
    reason: "DIRTY_CHECKOUT_REFUSED",
    check: "clean_checkout",
    dirtyCount: dirtyEntries.length,
  }, null, 2));
  process.exit(1);
}

if (process.env.INFINITY_RUNTIME_PLAIN_PROD === "1") {
  console.log(JSON.stringify({
    ok: false,
    reason: "PLAIN_PROD_REFUSED",
    check: "production_stage_skip_domain",
  }));
  process.exit(1);
}

const api = (path, init = {}) => fetch(`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`, {
  ...init,
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
  },
});

const listed = await api(`/v6/deployments?projectId=${encodeURIComponent(PROJECT_ID)}&target=production&limit=5`);
const current = listed.ok ? (await listed.json()).deployments?.[0] : null;
const previousId = current?.uid ?? current?.id ?? null;

const stage = spawnSync("node", ["scripts/infinity-runtime-isolated-deploy.mjs"], {
  cwd: root,
  encoding: "utf8",
  env: {
    ...process.env,
    INFINITY_RUNTIME_PRODUCTION_STAGE: "1",
    INFINITY_RUNTIME_PROMOTE: process.env.INFINITY_RUNTIME_PROMOTE === "1" ? "1" : "0",
    INFINITY_RUNTIME_PLAIN_PROD: "",
  },
});
const stageOut = `${stage.stdout || ""}\n${stage.stderr || ""}`;
let stageReport = null;
try {
  const start = stageOut.lastIndexOf("{");
  stageReport = start >= 0 ? JSON.parse(stageOut.slice(start)) : null;
} catch {
  stageReport = null;
}
if (stage.status !== 0 || !stageReport?.ok) {
  console.log(JSON.stringify({
    ok: false,
    reason: "STAGE_OR_SMOKE_FAILED",
    check: "staged_smoke",
    previousId,
    stageReport,
    logTail: stageOut.split(/\r?\n/).filter(Boolean).slice(-20),
  }, null, 2));
  process.exit(1);
}

const promotedId = stageReport.deploymentId ?? stageReport.candidateId ?? null;
const waitMinutes = Number(process.env.INFINITY_RUNTIME_CRON_WAIT_MINUTES || 16);
const deadline = Date.now() + waitMinutes * 60 * 1000;
const ticks = [];
let lastStatus = 0;
while (Date.now() < deadline && ticks.length < 3) {
  const tick = await fetch(TICK_URL, { method: "GET", redirect: "manual" }).catch(() => null);
  lastStatus = tick?.status ?? 0;
  if (lastStatus === 404 || lastStatus === 0) break;
  ticks.push({ at: new Date().toISOString(), status: lastStatus });
  if (ticks.length >= 3) break;
  await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
}

const cronAlive = lastStatus !== 404 && lastStatus !== 0 && ticks.length >= 3;
if (cronAlive) {
  console.log(JSON.stringify({
    ok: true,
    previousId,
    promotedId,
    ticks,
    checks: ["clean_checkout", "identity_baked_into_artifact", "production_stage_skip_domain", "staged_smoke", "wait_real_cron_route"],
  }, null, 2));
  process.exit(0);
}

let rollback = null;
if (previousId && previousId !== promotedId) {
  const rolled = await api(`/v1/projects/${encodeURIComponent(PROJECT_ID)}/rollback/${encodeURIComponent(previousId)}`, {
    method: "POST",
  });
  rollback = { status: rolled.status, ok: rolled.ok || rolled.status === 409 };
}

console.log(JSON.stringify({
  ok: false,
  reason: "CRON_ROUTE_SILENT_AFTER_PROMOTE",
  check: "rollback_if_cron_absent",
  previousId,
  promotedId,
  lastStatus,
  ticks,
  rollback,
}, null, 2));
process.exit(2);
