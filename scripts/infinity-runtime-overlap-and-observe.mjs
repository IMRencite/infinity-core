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
const secret = process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET;
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const headers = { authorization: `Bearer ${secret}`, "content-type": "application/json" };
const BASE = "https://infinity-runtime.vercel.app";

const first = fetch(`${BASE}/api/runtime/tick`, { method: "POST", headers, cache: "no-store" }).then(async (r) => ({
  status: r.status,
  body: await r.json().catch(() => ({})),
}));
await new Promise((resolve) => setTimeout(resolve, 250));
const second = await fetch(`${BASE}/api/runtime/tick`, { method: "POST", headers, cache: "no-store" }).then(async (r) => ({
  status: r.status,
  body: await r.json().catch(() => ({})),
}));
const a = await first;
const state = await fetch(`${BASE}/api/runtime/operating-state`, { headers, cache: "no-store" }).then((r) => r.json());
const project = await fetch(`https://api.vercel.com/v9/projects/prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox?teamId=${encodeURIComponent(team)}`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());
const cronAlt = await fetch(`https://api.vercel.com/v1/projects/prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox/crons?teamId=${encodeURIComponent(team)}`, {
  headers: { Authorization: `Bearer ${token}` },
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

function cronSummary(value) {
  if (!value) return { type: typeof value, keys: [] };
  if (Array.isArray(value)) return { type: "array", count: value.length, paths: value.map((row) => row.path || row.href || row) };
  if (typeof value === "object") {
    return {
      type: "object",
      keys: Object.keys(value),
      enabled: value.enabled ?? value.cronEnabled ?? null,
      definitions: value.definitions || value.jobs || value.items || null,
    };
  }
  return { type: typeof value };
}

console.log(JSON.stringify({
  staggered: {
    a: { status: a.status, deferred: Boolean(a.body?.deferred), decision: a.body?.autonomousLoop?.decision ?? null },
    b: { status: second.status, deferred: Boolean(second.body?.deferred), decision: second.body?.autonomousLoop?.decision ?? null },
  },
  observation: {
    persistenceKind: state.cloudRuntime?.persistence_kind ?? null,
    deploymentId: state.cloudRuntime?.deployment_id ?? null,
    version: state.cloudRuntime?.runtime_version ?? null,
    lastWake: Boolean(state.cloudRuntime?.last_wake_at),
    lastSuccess: Boolean(state.cloudRuntime?.last_successful_iteration_at),
    nextReview: Boolean(state.cloudRuntime?.next_review_at),
    action: Boolean(state.cloudRuntime?.last_meaningful_action),
    freshness: state.cloudRuntime?.freshness ?? null,
    leaseHeld: state.cloudRuntime?.lease_held ?? null,
  },
  liveStateKeys: Object.keys(state.state || {}),
  occupancy: {
    venture: Boolean(state.state?.venture || state.state?.occupancy || state.state?.venture_id),
    campaign: typeof state.state === "object" ? JSON.stringify(state.state).includes("7e7e924e-0741-4155-a729-8d529da77ea9") : false,
  },
  projectCron: cronSummary(project.crons),
  cronApi: { status: cronAlt.status, summary: cronSummary(cronAlt.body?.crons || cronAlt.body) },
}, null, 2));
