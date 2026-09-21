/**
 * Read-only proof of which Production deployment owns /api/runtime/organic-tick.
 * Does not invoke the scheduler. Manual HTTP is not scheduler proof.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
if (!token || !team) {
  console.log(JSON.stringify({ ok: false, reason: "VERCEL_TOKEN_OR_TEAM_MISSING" }));
  process.exit(1);
}

async function vercel(path) {
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIContent(team)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
}

function encodeURIContent(value) {
  return encodeURIComponent(value);
}

const HQ = { name: "infinity-hq", id: "prj_AVa1EK79vagoOB8PEtzWAQZTX0xI" };
const RUNTIME = { name: "infinity-runtime", id: "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox" };
const SITE = { name: "occupancynpv", id: "prj_vSCXLOYDoExYUAR8ypnYz2W1Lu7d" };
const ROUTE = "/api/runtime/organic-tick";

const vercelJson = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8"));
const sourceCrons = (vercelJson.crons || []).filter((row) => /organic|blog/i.test(row.path) || row.path === ROUTE);

async function inspectProject(project) {
  const details = await vercel(`/v9/projects/${project.id}`);
  const prod = await vercel(`/v6/deployments?projectId=${project.id}&limit=5&target=production`);
  const latest = (prod.json?.deployments || [])[0] || null;
  const files = latest?.uid
    ? await vercel(`/v6/deployments/${latest.uid}/files`)
    : { ok: false, status: 0, json: null };
  const fileList = Array.isArray(files.json) ? files.json : (files.json?.files || []);
  const routePresent = JSON.stringify(fileList).includes("organic-tick");
  const runtimeLogs = latest?.uid
    ? await vercel(`/v1/deployments/${latest.uid}/runtime-logs?limit=100`)
    : { ok: false, status: 0, json: null };
  const events = latest?.uid
    ? await vercel(`/v3/deployments/${latest.uid}/events?limit=100`)
    : { ok: false, status: 0, json: null };
  const logBlob = JSON.stringify({ runtime: runtimeLogs.json, events: events.json });
  const cronHits = (logBlob.match(/organic-tick|vercel-cron/gi) || []).length;
  return {
    project: project.name,
    project_id: project.id,
    details_ok: details.ok,
    production_target: details.json?.targets?.production?.id || details.json?.targets?.production?.uid || null,
    domains: (details.json?.targets?.production?.alias || details.json?.alias || []).slice?.(0, 12) || details.json?.targets?.production || null,
    latest_production: latest
      ? {
        id: latest.uid,
        url: latest.url,
        created: latest.created ? new Date(latest.created).toISOString() : null,
        state: latest.readyState || latest.state,
        target: latest.target,
      }
      : null,
    files_status: files.status,
    route_in_production_artifact: routePresent ? "YES" : (files.ok ? "NO" : "NOT_PROVEN"),
    runtime_logs_status: runtimeLogs.status,
    events_status: events.status,
    organic_tick_log_mentions: cronHits,
  };
}

const hq = await inspectProject(HQ);
const runtime = await inspectProject(RUNTIME);
const site = await inspectProject(SITE);
const out = {
  collected_at: new Date().toISOString(),
  route: ROUTE,
  source_vercel_json_crons: sourceCrons,
  hq,
  runtime,
  occupancynpv_site: site,
  note: "infinity-runtime isolated deploy strips Blog-OS and only crons communication-tick. occupancynpv.com is the public site, not the Blog cron host.",
};
writeFileSync(join(process.cwd(), ".infinity/blog-os/cron-host-inspect-v4.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
