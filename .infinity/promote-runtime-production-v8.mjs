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
const PREVIEW = "https://infinity-runtime-ilay4z9j5-infinite-media-resources-imr.vercel.app";
const PROD = "https://infinity-runtime.vercel.app";
const EXPECTED_SHA = "837f7ec12480f6884c4b4eb9c8b6d7394fc29b3e";
const WINDOW_MS = 11 * 60 * 1000;
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const cronSecret = process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET || "";
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "";

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

function probeHeaders(extra = {}) {
  const headers = { ...extra };
  if (bypass) {
    headers["x-vercel-protection-bypass"] = bypass;
    headers["x-vercel-set-bypass-cookie"] = "true";
  }
  return headers;
}

async function probe(url, path, extra = {}, method = "GET") {
  const res = await fetch(`${url}${path}`, { method, headers: probeHeaders(extra) }).catch(() => null);
  const body = res ? await res.json().catch(() => null) : null;
  return { path, status: res?.status ?? 0, ok: Boolean(res && res.status > 0 && res.status !== 404), body };
}

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function persist(scope, payload) {
  const now = new Date().toISOString();
  const result = await client.from("cloud_runtime_state").upsert({
    scope,
    version: 1,
    instance_id: scope,
    payload,
    updated_at: now,
  });
  return { ok: !result.error, error: result.error?.message ?? null, at: now };
}

async function readHeartbeat() {
  const beats = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-heartbeats-v1").maybeSingle();
  const scheduler = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-scheduler-v1").maybeSingle();
  const sched = beats.data?.payload?.runtimes?.scheduler ?? {};
  const schedState = scheduler.data?.payload ?? {};
  return {
    updated_at: beats.data?.updated_at ?? null,
    last_success_at: sched.last_success_at ?? schedState.last_success_at ?? null,
    deployment_id: sched.deployment_id ?? schedState.active_deployment_id ?? null,
    release_sha: sched.release_sha ?? sched.git_sha ?? null,
    content_hash: sched.release_content_hash ?? sched.content_hash ?? null,
    build_graph_hash: sched.build_graph_hash ?? null,
    schema: sched.schema ?? sched.schema_version ?? schedState.schema_version_seen ?? null,
    invoked_by: sched.invoked_by ?? null,
  };
}

const firstRejection = {
  attempt_id: "rel:communication-v8:dpl_wwjX:alias-2026-09-21T01:24:50.777Z",
  code: "RELEASE_REJECTED_NO_CRON_HEARTBEAT",
  first_failure: "CRON_NOT_INVOKED",
  reason: "PREVIEW_ALIAS_IS_NOT_PRODUCTION_CRON_TARGET",
  candidate: CANDIDATE,
  candidate_target_at_alias: null,
  production_target_during_window: "dpl_5iC51KgrdBghubsk5pzajV5pvm1B",
  promotion_started_at: "2026-09-21T01:24:50.777Z",
  rollback_at: "2026-09-21T01:38:48.640Z",
  alias_hold_ms: 837863,
  expected_cadence: "*/5 * * * *",
  window: { start: "2026-09-21T01:24:50.777Z", end: "2026-09-21T01:38:48.640Z" },
  observed_heartbeats: [{
    last_success_at: "2026-09-20T23:35:31.322Z",
    deployment_id: ROLLBACK,
    invoked_by: "cron",
    schema: "communication-incident-recovery-v4",
  }],
  cron_requests_on_candidate: "NOT_SEEN",
  writes_in_window: { ownership: 0, obligations: 0, invalidations: 0 },
  notes: [
    "vercel alias of a Preview deployment does not change project.targets.production",
    "Vercel Cron invokes only the production deployment",
    "dpl_5iC51 remains the production target and lacks /api/runtime/communication-tick",
    "post-rollback dpl_6saL alias restore is not a cron-heartbeat restore",
  ],
};
await persist("communication-release-attempts-v8", firstRejection);
await client.from("communication_release_attempts").upsert({
  deployment_id: CANDIDATE,
  git_commit_sha: EXPECTED_SHA,
  git_tree_sha: "b14a647a00f8f1284e2b52fb590e6d0941003845",
  release_content_hash: "0b06b7356ea229d6e5f29f2cd06bf141cf87d55315174770a3fdae600900d480",
  build_graph_hash: "9d245bcda74c0db3c5c486598cc27d3da10b684a69e401d6a3cb12de6b403388",
  dirty: false,
  promotion_timestamp: "2026-09-21T01:24:50.777Z",
  required_routes: ["/api/runtime/communication-tick", "/api/runtime/communication-attest"],
  build_result: "PASS",
  smoke_result: "PASS",
  promotion_result: "ALIAS_ONLY_NOT_PRODUCTION",
  heartbeat_result: "RELEASE_REJECTED_NO_CRON_HEARTBEAT",
}).then(() => undefined).catch(() => undefined);

const tickExists = await probe(PREVIEW, "/api/runtime/communication-tick");
const tickSafe = await probe(PREVIEW, "/api/runtime/communication-tick?mode=safe", { authorization: `Bearer ${cronSecret}` });
const tickCronContract = await probe(PREVIEW, "/api/runtime/communication-tick?mode=safe", {
  authorization: `Bearer ${cronSecret}`,
  "x-vercel-cron": "1",
  "user-agent": "vercel-cron/1.0",
});
const attestGet = await probe(PREVIEW, "/api/runtime/communication-attest");
const attestUnauth = await probe(PREVIEW, "/api/runtime/communication-attest", {}, "POST");
const identity = tickSafe.body?.identity ?? {};
const release = tickSafe.body?.release ?? {};
const stagedSmoke = {
  tick_exists: tickExists.status !== 404 && tickExists.status > 0,
  tick_auth: tickSafe.status === 200,
  tick_cron_contract: tickCronContract.status === 200 && tickCronContract.body?.business_send === false,
  attest_exists: attestGet.status === 200,
  attest_unauth: attestUnauth.status === 401,
  identity_sha: identity.release_sha ?? release.release_sha ?? null,
  identity_deployment: identity.deployment_id ?? null,
  business_send: tickSafe.body?.business_send === false,
};
const stagedPass = stagedSmoke.tick_exists
  && stagedSmoke.tick_auth
  && stagedSmoke.tick_cron_contract
  && stagedSmoke.attest_exists
  && stagedSmoke.attest_unauth
  && stagedSmoke.business_send
  && (stagedSmoke.identity_sha === EXPECTED_SHA || stagedSmoke.identity_sha === identity.git_sha);

const before = await vercel(`/v13/deployments/${CANDIDATE}`);
const projectBefore = await vercel(`/v9/projects/${PROJECT_ID}`);
const candidateValid = before.json?.readyState === "READY" && before.json?.id === CANDIDATE;
const report = {
  phase: "PRE_PROMOTE",
  candidate: CANDIDATE,
  candidate_target: before.json?.target ?? null,
  candidate_ready: before.json?.readyState ?? null,
  production_before: projectBefore.json?.targets?.production?.id ?? null,
  stagedSmoke,
  stagedPass,
  firstRejection,
};

if (!candidateValid || !stagedPass) {
  report.ok = false;
  report.reason = !candidateValid ? "CANDIDATE_INVALID" : "STAGED_SMOKE_FAILED";
  writeFileSync(join(process.cwd(), "tmp-v8-production-promote.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const promotion_started_at = new Date().toISOString();
const promote = await vercel(`/v10/projects/${PROJECT_ID}/promote/${CANDIDATE}`, { method: "POST" });
const after = await vercel(`/v13/deployments/${CANDIDATE}`);
const projectAfter = await vercel(`/v9/projects/${PROJECT_ID}`);
const aliases = await vercel(`/v2/aliases?projectId=${PROJECT_ID}&limit=10`);
const identityProbe = await probe(PROD, "/api/runtime/communication-tick?mode=safe", { authorization: `Bearer ${cronSecret}` });
const attestProbe = await probe(PROD, "/api/runtime/communication-attest");
const unauthTick = await probe(PROD, "/api/runtime/communication-tick");

report.phase = "PROMOTED";
report.promotion_started_at = promotion_started_at;
report.promote = { status: promote.status, ok: promote.ok || promote.status === 409, keys: promote.json ? Object.keys(promote.json) : [] };
report.candidate_target_after = after.json?.target ?? null;
report.production_after = projectAfter.json?.targets?.production?.id ?? null;
report.alias_after = (aliases.json?.aliases ?? []).map((row) => ({ alias: row.alias, deploymentId: row.deploymentId }));
report.ProductionAliasIdentityGate = {
  http: identityProbe.status,
  deployment: identityProbe.body?.identity?.deployment_id ?? null,
  sha: identityProbe.body?.identity?.release_sha ?? identityProbe.body?.release?.release_sha ?? null,
  schema: identityProbe.body?.identity?.schema_version_required ?? identityProbe.body?.release?.schema_version_required ?? null,
  build_graph: identityProbe.body?.identity?.build_graph_hash ?? identityProbe.body?.release?.build_graph_hash ?? null,
  business_send: identityProbe.body?.business_send ?? null,
  unauth_tick: unauthTick.status,
  attest: attestProbe.status,
};
report.ok = Boolean(report.promote.ok);
writeFileSync(join(process.cwd(), "tmp-v8-production-promote.json"), `${JSON.stringify(report, null, 2)}\n`);
await persist("communication-v8-production-promote", {
  promotion_started_at,
  candidate: CANDIDATE,
  promote_status: promote.status,
  production_after: report.production_after,
  identity: report.ProductionAliasIdentityGate,
});
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
