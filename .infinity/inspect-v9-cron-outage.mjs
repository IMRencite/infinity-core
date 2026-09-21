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
const five = "dpl_5iC51KgrdBghubsk5pzajV5pvm1B";
const six = "dpl_6saLKJDLFKFhPoscmEhTW9QdhHeo";
const since = Date.parse("2026-09-20T23:35:00.000Z");

async function timed(url, init = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...(init.headers ?? {}) },
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 1500) }; }
    return { status: res.status, json, bytes: text.length };
  } catch (error) {
    return { status: 0, json: { error: error instanceof Error ? error.name : "fetch_failed" }, bytes: 0 };
  } finally {
    clearTimeout(timer);
  }
}

async function vercel(path) {
  return timed(`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`);
}

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

const [projectJson, dpl5, dpl6, aliases, prodList, cron1, cron2, cron3] = await Promise.all([
  vercel(`/v9/projects/${project}`),
  vercel(`/v13/deployments/${five}`),
  vercel(`/v13/deployments/${six}`),
  vercel(`/v2/aliases?projectId=${project}&limit=12`),
  vercel(`/v6/deployments?projectId=${project}&limit=8&target=production`),
  vercel(`/v1/projects/${project}/crons`),
  vercel(`/v4/projects/${project}/crons`),
  vercel(`/v1/integrations/cron?projectId=${project}`),
]);

const qs = `teamId=${encodeURIComponent(team)}`;
const logs5 = await timed(`https://api.vercel.com/v1/projects/${project}/deployments/${five}/runtime-logs?${qs}&since=${since}&source=serverless`, { headers: { Accept: "application/stream+json" } }, 8000);
const logs5all = await timed(`https://api.vercel.com/v1/projects/${project}/deployments/${five}/runtime-logs?${qs}`, { headers: { Accept: "application/stream+json" } }, 8000);
const events5 = await vercel(`/v3/deployments/${five}/events?builds=0&direction=backward&limit=40`);
const events6 = await vercel(`/v3/deployments/${six}/events?builds=0&direction=backward&limit=20`);

function eventSample(json) {
  const rows = Array.isArray(json) ? json : json?.events ?? [];
  return rows.slice(0, 12).map((row) => ({
    type: row.type ?? row.payload?.type ?? null,
    created: row.created ? new Date(row.created).toISOString() : (row.payload?.date ? new Date(row.payload.date).toISOString() : null),
    text: String(row.text ?? row.payload?.text ?? "").slice(0, 200),
    info: row.info ?? row.payload?.info ?? null,
  }));
}

const fiveUrl = dpl5.json?.url ? `https://${dpl5.json.url}` : "https://infinity-runtime-af83g148g-infinite-media-resources-imr.vercel.app";
const tick5 = await probe(`${fiveUrl}/api/runtime/communication-tick`);
const attest5 = await probe(`${fiveUrl}/api/runtime/communication-attest`);
const tickAlias = await probe("https://infinity-runtime.vercel.app/api/runtime/communication-tick");
const attestAlias = await probe("https://infinity-runtime.vercel.app/api/runtime/communication-attest");
const prod = projectJson.json?.targets?.production ?? {};
const logText = `${JSON.stringify(logs5.json).slice(0, 4000)}\n${JSON.stringify(logs5all.json).slice(0, 4000)}`;
const cronHits = /communication-tick|vercel-cron|404|401/i.test(logText);

const out = {
  now: new Date().toISOString(),
  production_id: prod.id ?? null,
  production_readySubstate: prod.readySubstate ?? null,
  production_url: prod.url ?? null,
  production_aliasAssigned: prod.aliasAssigned ? new Date(prod.aliasAssigned).toISOString() : null,
  aliases: (aliases.json?.aliases ?? []).map((row) => ({ alias: row.alias, deploymentId: row.deploymentId })),
  dpl_5iC51: {
    id: dpl5.json?.id,
    target: dpl5.json?.target ?? null,
    readyState: dpl5.json?.readyState,
    readySubstate: dpl5.json?.readySubstate,
    createdAt: dpl5.json?.createdAt ? new Date(dpl5.json.createdAt).toISOString() : null,
    ready: dpl5.json?.ready ? new Date(dpl5.json.ready).toISOString() : null,
    tick: tick5,
    attest: attest5,
  },
  dpl_6saL: {
    id: dpl6.json?.id,
    target: dpl6.json?.target ?? null,
    readyState: dpl6.json?.readyState,
    readySubstate: dpl6.json?.readySubstate,
    createdAt: dpl6.json?.createdAt ? new Date(dpl6.json.createdAt).toISOString() : null,
    rollback_eligible: dpl6.json?.target === "production" && dpl6.json?.readyState === "READY",
    tick_alias: tickAlias,
    attest_alias: attestAlias,
  },
  cron_apis: [cron1, cron2, cron3].map((row) => ({
    status: row.status,
    keys: row.json ? Object.keys(row.json) : [],
    error: row.json?.error ?? null,
    crons: row.json?.crons ?? row.json?.jobs ?? null,
  })),
  logs_5iC51: { status: logs5.status, bytes: logs5.bytes, cron_like: cronHits, sample: typeof logs5.json?.raw === "string" ? logs5.json.raw.slice(0, 800) : Object.keys(logs5.json ?? {}) },
  logs_5iC51_all: { status: logs5all.status, bytes: logs5all.bytes },
  events_5iC51: { status: events5.status, sample: eventSample(events5.json) },
  events_6saL: { status: events6.status, sample: eventSample(events6.json) },
  production_deployments: (prodList.json?.deployments ?? []).map((row) => ({
    uid: row.uid,
    created: row.created ? new Date(row.created).toISOString() : null,
    state: row.state,
    readySubstate: row.readySubstate,
  })),
};
writeFileSync(join(process.cwd(), "tmp-v9-cron-outage-inspect.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
