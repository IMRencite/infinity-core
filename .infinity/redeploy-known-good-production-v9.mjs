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
const created = await vercel("/v13/deployments", {
  method: "POST",
  body: JSON.stringify({
    name: "infinity-runtime",
    project,
    deploymentId: knownGood,
    target: "production",
    meta: { purpose: "COMMUNICATION_CRON_OUTAGE_RESTORE_KNOWN_GOOD" },
  }),
});
const newId = created.json?.id ?? created.json?.uid ?? null;
let ready = created.json ?? null;
for (let i = 0; i < 36 && newId && ready?.readyState !== "READY" && ready?.readyState !== "ERROR"; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const inspect = await vercel(`/v13/deployments/${newId}`);
  ready = inspect.json;
}
const after = await vercel(`/v9/projects/${project}`);
const aliases = await vercel(`/v2/aliases?projectId=${project}&limit=10`);
const newUrl = ready?.url ? `https://${ready.url}` : null;
const tickNew = newUrl ? await fetch(`${newUrl}/api/runtime/communication-tick`).then((res) => res.status).catch(() => 0) : 0;
const tickAlias = await fetch("https://infinity-runtime.vercel.app/api/runtime/communication-tick").then((res) => res.status).catch(() => 0);
const attestAlias = await fetch("https://infinity-runtime.vercel.app/api/runtime/communication-attest").then((res) => res.status).catch(() => 0);
const out = {
  ok: created.status < 300 && ready?.readyState === "READY" && tickNew !== 404,
  method: "POST /v13/deployments redeploy dpl_6saL target=production",
  started,
  create_status: created.status,
  create_error: created.json?.error ?? null,
  new_id: newId,
  readyState: ready?.readyState ?? null,
  readySubstate: ready?.readySubstate ?? null,
  target: ready?.target ?? null,
  url: ready?.url ?? null,
  before_production: before.json?.targets?.production?.id ?? null,
  after_production: after.json?.targets?.production?.id ?? null,
  aliases: (aliases.json?.aliases ?? []).map((row) => ({ alias: row.alias, deploymentId: row.deploymentId })),
  tick_new: tickNew,
  tick_alias: tickAlias,
  attest_alias: attestAlias,
};
writeFileSync(join(process.cwd(), "tmp-v9-redeploy-6saL.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
