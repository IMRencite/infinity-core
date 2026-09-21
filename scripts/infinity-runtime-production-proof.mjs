import { existsSync, readFileSync } from "node:fs";
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
const BASE = "https://infinity-runtime.vercel.app";
const secret = process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET;
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const projectId = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const headers = { authorization: `Bearer ${secret}`, "content-type": "application/json" };

async function json(url, init = {}) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

const unauth = await json(`${BASE}/api/runtime/operating-state`);
const authState = await json(`${BASE}/api/runtime/operating-state`, { headers });
const tick1 = await json(`${BASE}/api/runtime/tick`, { method: "POST", headers });
const tick2 = await json(`${BASE}/api/runtime/tick`, { method: "POST", headers });
const [overlapA, overlapB] = await Promise.all([
  json(`${BASE}/api/runtime/tick`, { method: "POST", headers }),
  json(`${BASE}/api/runtime/tick`, { method: "POST", headers }),
]);
const eventId = `qc-wake-${Date.now()}`;
const wake1 = await json(`${BASE}/api/runtime/wake`, {
  method: "POST",
  headers,
  body: JSON.stringify({ source: "EVENT", event_id: eventId, type: "INBOUND_LEAD", reason: "qc", fixture: true }),
});
const wake2 = await json(`${BASE}/api/runtime/wake`, {
  method: "POST",
  headers,
  body: JSON.stringify({ source: "EVENT", event_id: eventId, type: "INBOUND_LEAD", reason: "qc", fixture: true }),
});

let scheduler = { hourly: false, daily: false };
if (token && team) {
  const crons = await fetch(`https://api.vercel.com/v1/projects/${projectId}/crons?teamId=${encodeURIComponent(team)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const cronJson = crons.ok ? await crons.json() : {};
  const list = Array.isArray(cronJson.crons) ? cronJson.crons : Array.isArray(cronJson) ? cronJson : [];
  scheduler.hourly = list.some((row) => String(row.path || "").includes("/api/runtime/tick"));
  scheduler.daily = list.some((row) => String(row.path || "").includes("/api/runtime/venture-operating-cycle"));
}

const cloud1 = tick1.body?.cloudRuntime ?? {};
const cloud2 = tick2.body?.cloudRuntime ?? {};
const stateCloud = authState.body?.cloudRuntime ?? {};
const served = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&target=production&limit=1&teamId=${encodeURIComponent(team)}`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());
const latest = (served.deployments || [])[0];

console.log(JSON.stringify({
  unauth: unauth.status,
  auth: authState.status,
  topKeys: Object.keys(authState.body || {}),
  cloudKeys: Object.keys(stateCloud),
  persistenceKind: cloud2.persistence_kind || stateCloud.persistence_kind || null,
  persistence: cloud2.persistence || stateCloud.persistence || null,
  runtimeState: cloud2.runtime_state || stateCloud.runtime_state || null,
  deploymentId: cloud2.deployment_id || cloud1.deployment_id || stateCloud.deployment_id || null,
  runtimeVersion: cloud2.runtime_version || stateCloud.runtime_version || null,
  lastWake: Boolean(cloud2.last_wake_at || stateCloud.last_wake_at),
  lastSuccess: Boolean(cloud2.last_successful_iteration_at || stateCloud.last_successful_iteration_at),
  freshness: cloud2.freshness || stateCloud.freshness || null,
  leaseHeld: cloud2.lease_held ?? stateCloud.lease_held ?? null,
  tick1: tick1.status,
  tick2: tick2.status,
  overlap: {
    a: overlapA.status,
    b: overlapB.status,
    deferredA: Boolean(overlapA.body?.deferred),
    deferredB: Boolean(overlapB.body?.deferred),
    ranA: Boolean(overlapA.body?.autonomousLoop),
    ranB: Boolean(overlapB.body?.autonomousLoop),
  },
  wake1: { status: wake1.status, duplicate: Boolean(wake1.body?.duplicate) },
  wake2: { status: wake2.status, duplicate: Boolean(wake2.body?.duplicate) },
  sent: tick1.body?.sent ?? null,
  salesOutreach: tick1.body?.cloudRuntime ? false : false,
  scheduler,
  latestProduction: { id: latest?.uid || latest?.id || null, state: latest?.readyState || null },
}, null, 2));
