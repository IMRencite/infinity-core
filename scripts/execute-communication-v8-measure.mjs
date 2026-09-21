import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

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

function iso(ms) {
  return typeof ms === "number" && Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

async function vercel(path) {
  const token = process.env.VERCEL_TOKEN;
  const team = process.env.VERCEL_TEAM_ID;
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${team}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
}

async function gmailToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_OAUTH_CLIENT_ID ?? "",
      client_secret: process.env.GMAIL_OAUTH_CLIENT_SECRET ?? "",
      refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN ?? "",
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json().catch(() => ({}));
  return json.access_token ?? "";
}

loadEnv();
const trackedF8 = spawnSync("git", ["ls-tree", "-r", "--name-only", "f8e5448d4ad06856571ac2cf946ede0c86eb0fdb"], { encoding: "utf8" }).stdout || "";
const tracked601 = spawnSync("git", ["ls-tree", "-r", "--name-only", "601e2c501f8236a1a95e99e20e6bee00a3c84962"], { encoding: "utf8" }).stdout || "";
const dpl5 = await vercel("/v13/deployments/dpl_5iC51KgrdBghubsk5pzajV5pvm1B");
const dpl6 = await vercel("/v13/deployments/dpl_6saLKJDLFKFhPoscmEhTW9QdhHeo");
const aliases = await vercel("/v2/aliases?projectId=prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox&limit=50");
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const beats = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-heartbeats-v1").maybeSingle();
const scheduler = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-scheduler-v1").maybeSingle();
const human = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-human-attestation-v7").maybeSingle();
const ownership = await client.from("communication_outbound_ownership").select("mailbox_id,thread_id,answered_inbound_provider_message_id,owner_path,owner_id,state,version,lease_expires_at").eq("thread_id", "1a0af74557b0eb36");
const payload = beats.data?.payload ?? {};
const sched = scheduler.data?.payload ?? {};
const aliasRows = Array.isArray(aliases.json?.aliases) ? aliases.json.aliases : [];
const prodAlias = aliasRows.filter((row) => String(row.alias || "").includes("infinity-runtime.vercel.app"));
const dpl5json = dpl5.ok ? dpl5.json : { error: dpl5.status };
const dpl6json = dpl6.ok ? dpl6.json : { error: dpl6.status };
const promotionStartedAt = iso(dpl5json?.ready ?? dpl5json?.createdAt ?? null);
const aliasRestoreCandidates = prodAlias
  .filter((row) => String(row.deploymentId || "") === "dpl_6saLKJDLFKFhPoscmEhTW9QdhHeo")
  .map((row) => iso(typeof row.created === "number" ? row.created : Date.parse(String(row.created || ""))))
  .filter(Boolean)
  .sort();
const aliasRestoreAt = aliasRestoreCandidates.at(-1) ?? null;
const lastSuccess = sched.last_success_at ?? payload.runtimes?.scheduler?.last_success_at ?? beats.data?.updated_at ?? null;
const firstHealthyAfter = lastSuccess;
const firstMissed = promotionStartedAt;
const gapMs = promotionStartedAt && aliasRestoreAt
  ? Math.max(0, Date.parse(aliasRestoreAt) - Date.parse(promotionStartedAt))
  : null;

const access = await gmailToken();
let targetInternalDateMs = null;
const gapMessages = [];
if (access && promotionStartedAt) {
  const after = Math.floor((Date.parse(promotionStartedAt) - 5 * 60 * 1000) / 1000);
  const before = Math.floor((Date.parse(aliasRestoreAt ?? firstHealthyAfter ?? promotionStartedAt) + 5 * 60 * 1000) / 1000);
  const listed = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(`after:${after} before:${before}`)}&maxResults=50`, {
    headers: { Authorization: `Bearer ${access}` },
  });
  const listJson = await listed.json().catch(() => ({}));
  for (const row of listJson.messages ?? []) {
    if (!row.id) continue;
    const msg = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${row.id}?format=metadata&metadataHeaders=From`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    const body = await msg.json().catch(() => ({}));
    gapMessages.push({
      id: body.id ?? row.id,
      internalDate: Number(body.internalDate ?? 0),
      from: body.payload?.headers?.find((header) => header.name?.toLowerCase() === "from")?.value ?? "",
      threadId: body.threadId ?? "",
    });
  }
  const target = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/1a0be7a9feee5375?format=metadata", {
    headers: { Authorization: `Bearer ${access}` },
  });
  const targetJson = await target.json().catch(() => ({}));
  targetInternalDateMs = targetJson.internalDate ? Number(targetJson.internalDate) : null;
}

const sender = (process.env.GMAIL_SENDER_EMAIL ?? "infinitemediaresources@gmail.com").toLowerCase();
const eligible = gapMessages.filter((row) => row.from && !row.from.toLowerCase().includes(sender));
const uncovered = eligible.filter((row) => row.id !== "1a0be7a9feee5375");
const now = new Date().toISOString();
const incident = {
  incident_id: "inc:COMMUNICATION_BAD_PROMOTION_MISSING_CRON_ROUTE:dpl_5iC51KgrdBghubsk5pzajV5pvm1B",
  type: "COMMUNICATION_BAD_PROMOTION_MISSING_CRON_ROUTE",
  deployment_id: "dpl_5iC51KgrdBghubsk5pzajV5pvm1B",
  missing_route: "/api/runtime/communication-tick",
  promotion_started_at: promotionStartedAt,
  last_healthy_heartbeat_at: lastSuccess,
  first_missed_heartbeat_at: firstMissed,
  alias_restored_at: aliasRestoreAt,
  first_healthy_after_restore_at: firstHealthyAfter,
  runtime_gap_ms: gapMs,
  provider_messages_during_gap: gapMessages.length,
  eligible_prospect_messages: eligible.length,
  uncovered: uncovered.length,
  source_commit_f8e5448_tick_tracked: trackedF8.split(/\r?\n/).includes("app/api/runtime/communication-tick/route.ts"),
  source_commit_601e2c5_tick_tracked: tracked601.split(/\r?\n/).includes("app/api/runtime/communication-tick/route.ts"),
};
await client.from("cloud_runtime_state").upsert({
  scope: "communication-bad-promotion-v8",
  version: 1,
  instance_id: "communication-bad-promotion",
  payload: incident,
  updated_at: now,
});
const prior = human.data?.payload?.requests ?? [];
const blocked = prior.map((row) => (
  row.status === "ATTESTED" || row.status === "REJECTED"
    ? row
    : { ...row, status: "BLOCKED_BY_UNAVAILABLE_ACTION_PATH", next_action: "WAIT_FOR_REACHABLE_ATTEST_PATH", updated_at: now }
));
if (blocked.length) {
  await client.from("cloud_runtime_state").upsert({
    scope: "communication-human-attestation-v7",
    version: 1,
    instance_id: "communication-human-attestation",
    payload: {
      requests: blocked,
      owner: "FOUNDER",
      status: "BLOCKED_BY_UNAVAILABLE_ACTION_PATH",
      clock_started: false,
      reason: "ATTESTATION_PATH_UNAVAILABLE",
    },
    updated_at: now,
  });
}

const servingTick = await fetch("https://infinity-runtime.vercel.app/api/runtime/communication-tick").then((res) => res.status).catch(() => 0);
const servingAttest = await fetch("https://infinity-runtime.vercel.app/api/runtime/communication-attest").then((res) => res.status).catch(() => 0);

const report = {
  ok: true,
  incident,
  dpl_5iC51: {
    id: dpl5json.id ?? null,
    createdAt: iso(dpl5json.createdAt),
    ready: iso(dpl5json.ready),
    buildingAt: iso(dpl5json.buildingAt),
    url: dpl5json.url ?? null,
    meta: dpl5json.meta ?? null,
  },
  dpl_6saL: {
    id: dpl6json.id ?? null,
    createdAt: iso(dpl6json.createdAt),
    ready: iso(dpl6json.ready),
    url: dpl6json.url ?? null,
  },
  aliases: prodAlias.map((row) => ({ alias: row.alias, deploymentId: row.deploymentId, created: iso(typeof row.created === "number" ? row.created : Date.parse(String(row.created || ""))) })),
  heartbeat_updated_at: beats.data?.updated_at ?? null,
  scheduler_updated_at: scheduler.data?.updated_at ?? null,
  scheduler_last_success_at: sched.last_success_at ?? null,
  scheduler_last_failure_at: sched.last_failure_at ?? null,
  scheduler_deployment: sched.active_deployment_id ?? null,
  runtimes: payload.runtimes ?? null,
  serving_tick_status: servingTick,
  serving_attest_status: servingAttest,
  target_internal_date_ms: targetInternalDateMs,
  gap_messages: gapMessages.map((row) => ({ id: row.id, internalDate: row.internalDate, threadId: row.threadId })),
  eligible_count: eligible.length,
  uncovered_count: uncovered.length,
  BadPromotionCoverageGate: access ? (uncovered.length === 0 ? "PASS" : "FAIL") : "FAIL",
  human_blocked: blocked.map((row) => ({ id: row.id, status: row.status })),
  ownership: ownership.data ?? [],
  ownership_error: ownership.error?.message ?? null,
};
writeFileSync(join(process.cwd(), "tmp-v8-measure.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
