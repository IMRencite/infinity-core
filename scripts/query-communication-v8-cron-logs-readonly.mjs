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

async function vercel(path) {
  const token = process.env.VERCEL_TOKEN;
  const team = process.env.VERCEL_TEAM_ID;
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
}

loadEnv();
const ids = [
  "dpl_wwjX883fGKaDmQduWnNSuPtkU7so",
  "dpl_5iC51KgrdBghubsk5pzajV5pvm1B",
  "dpl_6saLKJDLFKFhPoscmEhTW9QdhHeo",
];
const since = Date.parse("2026-09-20T23:30:00.000Z");
const until = Date.now();
const out = {};
for (const id of ids) {
  const events = await vercel(`/v2/deployments/${id}/events?builds=1&direction=backward&limit=50`);
  const runtime = await vercel(`/v1/deployments/${id}/runtime-logs?limit=50`);
  const runtime2 = await vercel(`/v3/deployments/${id}/events?limit=50`);
  out[id] = {
    events_status: events.status,
    events_keys: events.json ? Object.keys(events.json) : [],
    events_sample: Array.isArray(events.json) ? events.json.slice(0, 8) : (events.json?.events ?? events.json?.logs ?? null),
    runtime_status: runtime.status,
    runtime2_status: runtime2.status,
    runtime2_keys: runtime2.json ? Object.keys(runtime2.json) : [],
  };
}
const prod = await vercel("/v9/projects/prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox");
const latest = await vercel("/v6/deployments?projectId=prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox&limit=8&target=production");
out.project = {
  status: prod.status,
  productionDeployment: prod.json?.targets?.production ?? prod.json?.latestDeployments?.[0] ?? null,
  link: prod.json?.link ?? null,
};
out.production_deployments = (latest.json?.deployments ?? []).map((row) => ({
  uid: row.uid,
  target: row.target,
  created: row.created ? new Date(row.created).toISOString() : null,
  url: row.url,
  state: row.state,
}));
out.window = { since: new Date(since).toISOString(), until: new Date(until).toISOString() };
writeFileSync(join(process.cwd(), "tmp-v8-cron-logs.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
