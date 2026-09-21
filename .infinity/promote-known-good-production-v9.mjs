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
const started = new Date().toISOString();
const promote = await vercel(`/v10/projects/${project}/promote/${knownGood}`, { method: "POST" });
const after = await vercel(`/v9/projects/${project}`);
const aliases = await vercel(`/v2/aliases?projectId=${project}&limit=10`);
const dpl = await vercel(`/v13/deployments/${knownGood}`);
const tick = await fetch("https://infinity-runtime.vercel.app/api/runtime/communication-tick").then((res) => res.status).catch(() => 0);
const attest = await fetch("https://infinity-runtime.vercel.app/api/runtime/communication-attest").then((res) => res.status).catch(() => 0);
const out = {
  ok: promote.status === 201 || promote.status === 202 || promote.status === 409,
  method: "POST /v10/projects/{id}/promote/{dpl_6saL}",
  started,
  promote_status: promote.status,
  promote_error: promote.json?.error ?? null,
  before_production: before.json?.targets?.production?.id ?? null,
  after_production: after.json?.targets?.production?.id ?? null,
  after_readySubstate: after.json?.targets?.production?.readySubstate ?? null,
  known_good_target: dpl.json?.target ?? null,
  known_good_readySubstate: dpl.json?.readySubstate ?? null,
  aliases: (aliases.json?.aliases ?? []).map((row) => ({ alias: row.alias, deploymentId: row.deploymentId })),
  serving_tick: tick,
  serving_attest: attest,
};
writeFileSync(join(process.cwd(), "tmp-v9-promote-6saL.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
