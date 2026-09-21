import { createClient } from "@supabase/supabase-js";
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

const PROJECT_ID = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const CANDIDATE = "dpl_wwjX883fGKaDmQduWnNSuPtkU7so";
const ROLLBACK = "dpl_6saLKJDLFKFhPoscmEhTW9QdhHeo";
const EXPECTED_SHA = "837f7ec12480f6884c4b4eb9c8b6d7394fc29b3e";
const WINDOW_MS = 11 * 60 * 1000;
const POLL_MS = 20_000;
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;

async function vercel(path, init = {}) {
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
}

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function persist(scope, payload) {
  return client.from("cloud_runtime_state").upsert({
    scope,
    version: 1,
    instance_id: scope,
    payload,
    updated_at: new Date().toISOString(),
  });
}

async function readHeartbeat() {
  const beats = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-heartbeats-v1").maybeSingle();
  const scheduler = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-scheduler-v1").maybeSingle();
  const sched = beats.data?.payload?.runtimes?.scheduler ?? {};
  const schedState = scheduler.data?.payload ?? {};
  return {
    updated_at: beats.data?.updated_at ?? null,
    last_success_at: sched.last_success_at ?? schedState.last_success_at ?? null,
    last_started_at: sched.last_started_at ?? schedState.last_started_at ?? null,
    deployment_id: sched.deployment_id ?? schedState.active_deployment_id ?? null,
    release_sha: sched.release_sha ?? sched.git_sha ?? null,
    content_hash: sched.release_content_hash ?? sched.content_hash ?? null,
    build_graph_hash: sched.build_graph_hash ?? null,
    schema: sched.schema ?? sched.schema_version ?? schedState.schema_version_seen ?? null,
    invoked_by: sched.invoked_by ?? null,
    last_error: sched.last_error ?? schedState.last_error ?? null,
  };
}

function classify(beat, sinceIso) {
  if (!beat.last_success_at || Date.parse(beat.last_success_at) < Date.parse(sinceIso)) {
    return { pass: false, stage: beat.deployment_id && beat.deployment_id !== CANDIDATE ? "CRON_NOT_INVOKED" : "CRON_NOT_INVOKED" };
  }
  if (beat.deployment_id !== CANDIDATE) return { pass: false, stage: "RELEASE_IDENTITY_FAILED", field: "deployment_id" };
  if (beat.invoked_by !== "cron" && beat.invoked_by !== "VERCEL_CRON") return { pass: false, stage: "CRON_AUTH_FAILED", field: "invoked_by", observed: beat.invoked_by };
  if (beat.release_sha && beat.release_sha !== EXPECTED_SHA && !String(beat.release_sha).startsWith("837f7ec")) {
    return { pass: false, stage: "RELEASE_IDENTITY_FAILED", field: "release_sha" };
  }
  return { pass: true, stage: null };
}

const promotePath = join(process.cwd(), "tmp-v8-production-promote.json");
const promote = existsSync(promotePath) ? JSON.parse(readFileSync(promotePath, "utf8")) : null;
const since = promote?.promotion_started_at ?? new Date().toISOString();
const deadline = Date.parse(since) + WINDOW_MS;
const samples = [];
let match = null;
let firstFailure = "CRON_NOT_INVOKED";

while (Date.now() < deadline && !match) {
  const beat = await readHeartbeat();
  const verdict = classify(beat, since);
  samples.push({ at: new Date().toISOString(), beat, verdict });
  if (verdict.pass) {
    match = beat;
    firstFailure = null;
    break;
  }
  firstFailure = verdict.stage;
  const remaining = deadline - Date.now();
  await new Promise((resolve) => setTimeout(resolve, Math.min(POLL_MS, Math.max(1000, remaining))));
}

const project = await vercel(`/v9/projects/${PROJECT_ID}`);
const candidate = await vercel(`/v13/deployments/${CANDIDATE}`);
const events = await vercel("/v3/events?limit=20");
const ownership = await client.from("communication_outbound_ownership").select("owner_path,owner_id,state,updated_at").eq("thread_id", "1a0af74557b0eb36");
const obligations = await client.from("communication_obligations").select("id,state,updated_at").gte("updated_at", since);
const epoch = await client.from("cloud_runtime_state").select("payload").eq("scope", "communication-cutover-epoch-v1").maybeSingle();

let rollback = { required: !match, executed: false, status: null };
if (!match) {
  const capture = {
    code: "RELEASE_REJECTED_NO_CRON_HEARTBEAT",
    first_failure: firstFailure,
    promotion_started_at: since,
    window_end: new Date().toISOString(),
    production_target: project.json?.targets?.production?.id ?? null,
    candidate_target: candidate.json?.target ?? null,
    samples,
    events: (events.json ?? []).slice?.(0, 8) ?? events.json,
    ownership: ownership.data ?? [],
    obligations: obligations.data ?? [],
    epoch: epoch.data?.payload?.epoch ?? null,
  };
  await persist("communication-release-attempts-v8", { ...capture, attempt_id: `rel:communication-v8:${CANDIDATE}:${since}` });
  const restored = await vercel(`/v10/projects/${PROJECT_ID}/promote/${ROLLBACK}`, { method: "POST" });
  rollback = { required: true, executed: restored.ok || restored.status === 409, status: restored.status, json_keys: restored.json ? Object.keys(restored.json) : [] };
}

const out = {
  PostPromotionCronHeartbeatGate: match ? "PASS" : "FAIL",
  first_failure: firstFailure,
  promotion_started_at: since,
  match,
  samples_count: samples.length,
  last_sample: samples.at(-1) ?? null,
  production_target: project.json?.targets?.production?.id ?? null,
  candidate_target: candidate.json?.target ?? null,
  rollback,
  epoch: epoch.data?.payload?.epoch ?? null,
  ownership_after: ownership.data ?? [],
  obligations_updated: obligations.data ?? [],
};
writeFileSync(join(process.cwd(), "tmp-v8-post-promotion-cron.json"), `${JSON.stringify({ ...out, samples }, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
process.exit(match ? 0 : 2);
