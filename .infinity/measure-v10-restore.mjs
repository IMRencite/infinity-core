import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
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

function fp(value) {
  return value ? createHash("sha256").update(value).digest("hex").slice(0, 12) : null;
}

async function timed(url, init = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, Accept: "application/json", ...(init.headers ?? {}) } });
    return { status: res.status, json: await res.json().catch(() => null) };
  } catch (error) {
    return { status: 0, json: { error: error instanceof Error ? error.name : "fetch_failed" } };
  } finally {
    clearTimeout(timer);
  }
}

loadEnv();
const project = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const team = process.env.VERCEL_TEAM_ID;
const eight = "dpl_8sX5jqiu7YUPox4gJoto3td6f5mS";
const six = "dpl_6saLKJDLFKFhPoscmEhTW9QdhHeo";
const cronSecret = process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET || "";
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function vercel(path) {
  return timed(`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`);
}

const [beats, scheduler, intended, probe, epoch, human, projectJson, dpl8, dpl6, aliases, envList] = await Promise.all([
  client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-heartbeats-v1").maybeSingle(),
  client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-scheduler-v1").maybeSingle(),
  client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-intended-release-v1").maybeSingle(),
  client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-provider-probe-v4").maybeSingle(),
  client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-cutover-epoch-v1").maybeSingle(),
  client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-human-attestation-v7").maybeSingle(),
  vercel(`/v9/projects/${project}`),
  vercel(`/v13/deployments/${eight}`),
  vercel(`/v13/deployments/${six}`),
  vercel(`/v2/aliases?projectId=${project}&limit=8`),
  vercel(`/v9/projects/${project}/env`),
]);

const required = [
  "CRON_SECRET", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY",
  "GMAIL_OAUTH_CLIENT_ID", "GMAIL_OAUTH_CLIENT_SECRET", "GMAIL_OAUTH_REFRESH_TOKEN",
  "GMAIL_SENDER_EMAIL", "COMMUNICATION_RELEASE_SHA", "COMMUNICATION_SCHEMA_VERSION_SEEN",
  "COMMUNICATION_BUILD_GRAPH_HASH", "FOUNDER_ATTESTATION_TOKEN", "OUTBOUND_MODE",
];
const envs = Array.isArray(envList.json?.envs) ? envList.json.envs : [];
const envPresence = {};
for (const key of required) {
  const rows = envs.filter((row) => row.key === key);
  envPresence[key] = {
    present: rows.length > 0,
    targets: [...new Set(rows.flatMap((row) => row.target ?? []))],
  };
}

let productionGmail = { fingerprint: null, present: false };
const gmailRow = envs.find((row) => row.key === "GMAIL_OAUTH_REFRESH_TOKEN" && (row.target ?? []).includes("production"));
if (gmailRow?.id) {
  const decrypted = await vercel(`/v9/projects/${project}/env/${gmailRow.id}?decrypt=true`);
  const value = typeof decrypted.json?.value === "string" ? decrypted.json.value : null;
  productionGmail = { fingerprint: fp(value), present: Boolean(value) };
}

const logs = await timed(
  `https://api.vercel.com/v1/projects/${project}/deployments/${eight}/runtime-logs?teamId=${encodeURIComponent(team)}&since=${Date.parse("2026-09-21T02:46:00.000Z")}`,
  { headers: { Accept: "application/stream+json" } },
  8000,
);

const tickSafe = await fetch("https://infinity-runtime.vercel.app/api/runtime/communication-tick?mode=safe", {
  headers: { authorization: `Bearer ${cronSecret}` },
}).then(async (res) => ({ status: res.status, body: await res.json().catch(() => null) })).catch(() => ({ status: 0, body: null }));

const sched = beats.data?.payload?.runtimes?.scheduler ?? {};
const provider = beats.data?.payload?.runtimes?.provider ?? {};
const discovery = beats.data?.payload?.runtimes?.discovery ?? {};
const worker = beats.data?.payload?.runtimes?.worker ?? {};
const watchdog = beats.data?.payload?.runtimes?.watchdog ?? {};

const out = {
  now: new Date().toISOString(),
  production_id: projectJson.json?.targets?.production?.id ?? null,
  aliases: (aliases.json?.aliases ?? []).map((row) => ({ alias: row.alias, deploymentId: row.deploymentId })),
  dpl_8sX5: {
    id: dpl8.json?.id,
    target: dpl8.json?.target,
    readySubstate: dpl8.json?.readySubstate,
    createdAt: dpl8.json?.createdAt ? new Date(dpl8.json.createdAt).toISOString() : null,
  },
  dpl_6saL: {
    id: dpl6.json?.id,
    target: dpl6.json?.target,
    readySubstate: dpl6.json?.readySubstate,
  },
  heartbeat: {
    updated_at: beats.data?.updated_at ?? null,
    scheduler: { last_success_at: sched.last_success_at ?? null, deployment_id: sched.deployment_id ?? null, invoked_by: sched.invoked_by ?? null, release_sha: sched.release_sha ?? sched.git_sha ?? null, schema: sched.schema_version_seen ?? sched.schema ?? null, last_error: sched.last_error ?? null },
    provider: { last_success_at: provider.last_success_at ?? null, last_error: provider.last_error ?? null, work_seen: provider.work_seen ?? null },
    discovery: { last_success_at: discovery.last_success_at ?? null, last_started_at: discovery.last_started_at ?? null },
    worker: { last_success_at: worker.last_success_at ?? null, last_started_at: worker.last_started_at ?? null },
    watchdog: { last_success_at: watchdog.last_success_at ?? null, last_started_at: watchdog.last_started_at ?? null },
  },
  identity_safe: {
    status: tickSafe.status,
    deployment: tickSafe.body?.identity?.deployment_id ?? null,
    release_sha: tickSafe.body?.identity?.release_sha ?? tickSafe.body?.release?.release_sha ?? null,
    tree: tickSafe.body?.identity?.release_tree_hash ?? tickSafe.body?.release?.release_tree_hash ?? null,
    graph: tickSafe.body?.identity?.build_graph_hash ?? tickSafe.body?.release?.build_graph_hash ?? null,
    schema: tickSafe.body?.identity?.schema_version_required ?? tickSafe.body?.release?.schema_version_required ?? null,
    env: tickSafe.body?.identity?.env ?? null,
    business_send: tickSafe.body?.business_send ?? null,
  },
  intended: intended.data?.payload ?? null,
  epoch: epoch.data?.payload ?? null,
  probe: probe.data?.payload ?? null,
  human_requests: ((human.data?.payload?.requests) ?? []).map((row) => ({ id: row.id, status: row.status, requested_at: row.requested_at, due_at: row.due_at })),
  envPresence,
  productionGmail,
  localGmail: { fingerprint: fp(process.env.GMAIL_OAUTH_REFRESH_TOKEN), client: fp(process.env.GMAIL_OAUTH_CLIENT_ID) },
  expected_historical_fingerprint: "2c60da8a2c79",
  logs_status: logs.status,
  logs_keys: logs.json ? Object.keys(logs.json) : [],
  autoAssign: {
    autoAssignCustomProductionDomains: projectJson.json?.autoAssignCustomDomains ?? projectJson.json?.ssoProtection ?? null,
    keys: projectJson.json ? Object.keys(projectJson.json).filter((key) => /auto|assign|domain|cron/i.test(key)) : [],
  },
};
writeFileSync(join(process.cwd(), "tmp-v10-restore-measure.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
