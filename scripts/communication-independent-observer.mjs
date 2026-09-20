/**
 * Independent Communication observer. Read-only against operational tables.
 * Must not live inside infinity-runtime or infinity-hq build fate.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log(JSON.stringify({ ok: false, reason: "SUPABASE_UNAVAILABLE", observer: "github-actions-communication-observer" }));
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const nowMs = Date.parse(now);

async function payload(scope) {
  const { data, error } = await client.from("cloud_runtime_state").select("payload, updated_at").eq("scope", scope).maybeSingle();
  return { payload: data?.payload ?? null, updated_at: data?.updated_at ?? null, error: error?.message ?? null };
}

const heartbeat = await payload("communication-runtime-heartbeats-v1");
const intended = await payload("communication-intended-release-v1");
const canary = await payload("communication-no-send-canary-v4");
const probe = await payload("communication-provider-probe-v4");
const scheduler = heartbeat.payload?.runtimes?.scheduler ?? {};
const age = scheduler.last_success_at ? nowMs - Date.parse(scheduler.last_success_at) : null;
const fresh = age != null && age <= 11 * 60 * 1000;
const intendedSha = intended.payload?.intended_git_sha ?? intended.payload?.release_sha ?? null;
const observedSha = scheduler.release_sha ?? scheduler.git_sha ?? null;
const schemaSeen = scheduler.schema_version_seen ?? null;
const schemaRequired = "communication-incident-recovery-v4";

const snapshot = {
  observer: "github-actions-communication-observer",
  shares_communication_build: false,
  shares_hq_build: false,
  independent_trigger: process.env.GITHUB_ACTIONS === "true",
  observed_at: now,
  heartbeat_fresh: fresh,
  heartbeat_age_ms: age,
  release_match: Boolean(intendedSha) && intendedSha === observedSha,
  schema_match: schemaSeen === schemaRequired,
  provider_coverage: probe.payload?.users_get_profile === true ? "PASS" : "FAIL",
  oldest_open_obligation: "ABSENT",
  canary_first_failure: canary.payload?.first_failure_stage ?? "ABSENT",
  cutover_epoch: scheduler.cutover_epoch_seen ?? "ABSENT",
};

await client.from("cloud_runtime_state").upsert({
  scope: "communication-external-observer-v4",
  version: 1,
  instance_id: "github-actions-communication-observer",
  payload: snapshot,
  updated_at: now,
});

const pass = fresh && snapshot.release_match && snapshot.schema_match && snapshot.provider_coverage === "PASS";
console.log(JSON.stringify({ ok: pass, snapshot }, null, 2));
process.exit(pass ? 0 : 2);
