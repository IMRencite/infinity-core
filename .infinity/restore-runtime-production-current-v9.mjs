import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  const envPath = "c:/Users/Antivist/Desktop/Infinity/infinity-core/.env.local";
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
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const project = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const knownGood = "dpl_6saLKJDLFKFhPoscmEhTW9QdhHeo";

async function vercel(path, init = {}) {
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`;
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const before = await vercel(`/v9/projects/${project}`);
const beforeId = before.json?.targets?.production?.id ?? null;
const beforeAliases = await vercel(`/v2/aliases?projectId=${project}&limit=10`);
const inspect = await vercel(`/v13/deployments/${knownGood}`);
const eligible = inspect.json?.target === "production" && inspect.json?.readyState === "READY";
if (!eligible) {
  const out = { ok: false, reason: "KNOWN_GOOD_NOT_ELIGIBLE", inspect: { target: inspect.json?.target, readyState: inspect.json?.readyState } };
  writeFileSync(join(process.cwd(), "tmp-v9-restore.json"), `${JSON.stringify(out, null, 2)}\n`);
  console.log(JSON.stringify(out, null, 2));
  process.exit(1);
}

const started = new Date().toISOString();
const rollback = await vercel(
  `/v1/projects/${project}/rollback/${knownGood}?description=${encodeURIComponent("COMMUNICATION_CRON_OUTAGE_AFTER_BAD_PROMOTION restore known-good dpl_6saL")}`,
  { method: "POST" },
);
const after = await vercel(`/v9/projects/${project}`);
const afterAliases = await vercel(`/v2/aliases?projectId=${project}&limit=10`);
const afterDpl = await vercel(`/v13/deployments/${knownGood}`);
const out = {
  ok: rollback.status === 201 || rollback.status === 202 || rollback.status === 409,
  method: "POST /v1/projects/{id}/rollback/{dpl_6saL}",
  started,
  rollback_status: rollback.status,
  rollback_error: rollback.json?.error ?? null,
  before_production: beforeId,
  after_production: after.json?.targets?.production?.id ?? null,
  after_readySubstate: after.json?.targets?.production?.readySubstate ?? null,
  known_good_target: afterDpl.json?.target ?? null,
  known_good_readySubstate: afterDpl.json?.readySubstate ?? null,
  aliases_before: (beforeAliases.json?.aliases ?? []).map((row) => ({ alias: row.alias, deploymentId: row.deploymentId })),
  aliases_after: (afterAliases.json?.aliases ?? []).map((row) => ({ alias: row.alias, deploymentId: row.deploymentId })),
};
writeFileSync(join(process.cwd(), "tmp-v9-restore.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
