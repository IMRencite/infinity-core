/**
 * Independent Communication observer. SELECT-only against operational views.
 * Fail closed. No Gmail credentials. No mutation.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.COMMUNICATION_OBSERVER_READONLY_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log(JSON.stringify({
    ok: false,
    reason: "OBSERVER_QUERY_FAILED",
    observer: "github-actions-communication-observer",
    first_failure: "CREDENTIALS_MISSING",
  }));
  process.exit(2);
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
const nowMs = Date.parse(now);
const STALE_MS = 11 * 60 * 1000;

async function payload(scope) {
  const { data, error } = await client.from("cloud_runtime_state").select("payload, updated_at").eq("scope", scope).maybeSingle();
  return { payload: data?.payload ?? null, updated_at: data?.updated_at ?? null, error: error?.message ?? null };
}

const heartbeat = await payload("communication-runtime-heartbeats-v1");
const intended = await payload("communication-intended-release-v1");
const outage = await payload("communication-cron-outage-v9");
const probe = await payload("communication-provider-probe-v4");
const epoch = await payload("communication-cutover-epoch-v1");
const jobs = await payload("communication-runtime-scheduler-v1");
const queryFailed = Boolean(heartbeat.error || intended.error);

const scheduler = heartbeat.payload?.runtimes?.scheduler ?? {};
const provider = heartbeat.payload?.runtimes?.provider ?? {};
const age = scheduler.last_success_at ? nowMs - Date.parse(scheduler.last_success_at) : null;
const staleHeartbeat = queryFailed || age == null || age > STALE_MS;
const providerFail = provider.last_error || probe.payload?.users_get_profile === false || (!provider.last_success_at && !probe.payload);
const intendedSha = intended.payload?.intended_git_sha ?? intended.payload?.release_sha ?? null;
const observedSha = scheduler.release_sha ?? scheduler.git_sha ?? null;
const releaseMismatch = Boolean(intendedSha) && Boolean(observedSha) && intendedSha !== observedSha;
const job = jobs.payload?.jobs?.[0] ?? null;
const legacyBlocked = job?.state === "BLOCKED" && !job?.consumer;
const recordedOutage = outage.payload?.status === "ACTIVE" || outage.payload?.code === "COMMUNICATION_CRON_OUTAGE_AFTER_BAD_PROMOTION";
const detectedStale = staleHeartbeat || recordedOutage;

const firstFailure = queryFailed
  ? "OBSERVER_QUERY_FAILED"
  : staleHeartbeat
    ? "STALE_HEARTBEAT"
    : providerFail
      ? "PROVIDER_READ_FAIL"
      : releaseMismatch
        ? "RELEASE_MISMATCH"
        : legacyBlocked
          ? "LEGACY_SINK_UNCONSUMED"
          : null;

const snapshot = {
  observer: "github-actions-communication-observer",
  shares_communication_build: false,
  shares_hq_build: false,
  independent_trigger: process.env.GITHUB_ACTIONS === "true",
  observed_at: now,
  mutation: false,
  heartbeat_age_ms: age,
  stale_heartbeat: staleHeartbeat,
  detected_stale_heartbeat: detectedStale,
  recorded_outage: recordedOutage,
  provider_read_fail: Boolean(providerFail),
  release_mismatch: releaseMismatch,
  legacy_blocked: Boolean(legacyBlocked),
  epoch: epoch.payload?.epoch ?? null,
  first_failure: firstFailure,
  positive_control_expected: "STALE_HEARTBEAT_OR_RECORDED_OUTAGE",
};

const pass = !queryFailed && !staleHeartbeat && !providerFail && !releaseMismatch && !legacyBlocked && !recordedOutage;
console.log(JSON.stringify({ ok: pass, snapshot }, null, 2));
process.exit(pass ? 0 : 2);
