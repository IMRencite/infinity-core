/**
 * LIVE_PROVIDER canary proof against deployed infinity-runtime.
 * Does not print emails, tokens, or message bodies.
 */
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
    process.env[trimmed.slice(0, sep)] = trimmed.slice(sep + 1).replace(/^['"]|['"]$/g, "");
  }
}

loadEnv();

const RUNTIME = (process.env.INFINITY_RUNTIME_URL || "https://infinity-runtime.vercel.app").replace(/\/$/, "");
const SECRET = process.env.INFINITY_RUNTIME_TICK_SECRET || process.env.CRON_SECRET;
const token = process.env.VERCEL_TOKEN;
const team = (process.env.VERCEL_TEAM_ID || "").trim();
const PROJECT_ID = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";

function redact(value) {
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (typeof item === "string" && (/@/.test(item) || /token|secret|bearer/i.test(key))) return "[redacted]";
    return item;
  }));
}

async function vercelApi(path, init = {}) {
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function upsertEnv(key, value) {
  const listed = await vercelApi(`/v9/projects/${encodeURIComponent(PROJECT_ID)}/env`);
  const existing = (listed.json.envs ?? []).find((row) => row.key === key);
  if (existing?.id) {
    const patched = await vercelApi(`/v9/projects/${encodeURIComponent(PROJECT_ID)}/env/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ value, type: "encrypted", target: ["production", "preview", "development"] }),
    });
    return patched.ok || patched.status === 409;
  }
  const created = await vercelApi(`/v10/projects/${encodeURIComponent(PROJECT_ID)}/env`, {
    method: "POST",
    body: JSON.stringify({ key, value, type: "encrypted", target: ["production", "preview", "development"] }),
  });
  return created.ok || created.status === 409;
}

async function latestDeployment() {
  const inspect = await vercelApi(`/v6/deployments?projectId=${encodeURIComponent(PROJECT_ID)}&limit=1`);
  const latest = inspect.json.deployments?.[0];
  return {
    id: latest?.uid ?? latest?.id ?? null,
    createdAt: latest?.created ?? latest?.createdAt ?? null,
    readyState: latest?.readyState ?? latest?.state ?? null,
    url: latest?.url ? `https://${latest.url}` : RUNTIME,
  };
}

async function tick() {
  if (!SECRET) return { ok: false, error: "RUNTIME_TICK_SECRET_MISSING" };
  const res = await fetch(`${RUNTIME}/api/runtime/tick`, {
    method: "POST",
    headers: { authorization: `Bearer ${SECRET}` },
  });
  const json = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    status: res.status,
    cycleId: json.cycleId ?? null,
    sent: json.sent ?? 0,
    outbound: json.outbound ?? null,
    outcome: json.outcome ?? null,
  };
}

async function health() {
  const res = await fetch(RUNTIME, { method: "GET" });
  return { ok: res.ok, status: res.status };
}

const command = process.argv[2] ?? "status";
const report = { kind: "LIVE_PROVIDER", command, runtime: RUNTIME };

if (command === "status") {
  report.health = await health();
  report.deployment = await latestDeployment();
  report.tick = redact(await tick());
} else if (command === "kill-on") {
  report.env = { GLOBAL_OUTBOUND_KILL_SWITCH: await upsertEnv("GLOBAL_OUTBOUND_KILL_SWITCH", "true") };
  report.tick = redact(await tick());
} else if (command === "kill-off") {
  report.env = { GLOBAL_OUTBOUND_KILL_SWITCH: await upsertEnv("GLOBAL_OUTBOUND_KILL_SWITCH", "false") };
  report.tick = redact(await tick());
} else if (command === "suppress-on") {
  report.env = { OUTBOUND_CANARY_SUPPRESSED: await upsertEnv("OUTBOUND_CANARY_SUPPRESSED", "true") };
  report.tick = redact(await tick());
} else if (command === "suppress-off") {
  report.env = { OUTBOUND_CANARY_SUPPRESSED: await upsertEnv("OUTBOUND_CANARY_SUPPRESSED", "false") };
  report.tick = redact(await tick());
} else if (command === "tick") {
  report.tick = redact(await tick());
} else {
  report.error = "UNKNOWN_COMMAND";
}

console.log(JSON.stringify(report, null, 2));
if (report.tick && report.tick.ok === false) process.exit(1);
