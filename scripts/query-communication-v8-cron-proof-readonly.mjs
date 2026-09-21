import { createClient } from "@supabase/supabase-js";
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

function iso(ms) {
  return typeof ms === "number" && Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

async function vercel(path) {
  const token = process.env.VERCEL_TOKEN;
  const team = process.env.VERCEL_TEAM_ID;
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
}

loadEnv();
const wwjX = "dpl_wwjX883fGKaDmQduWnNSuPtkU7so";
const sixL = "dpl_6saLKJDLFKFhPoscmEhTW9QdhHeo";
const fiveI = "dpl_5iC51KgrdBghubsk5pzajV5pvm1B";
const promotionAt = "2026-09-21T01:24:50.777Z";
const rollbackAt = "2026-09-21T01:38:48.640Z";
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const [dplW, dpl6, dpl5, crons, events, aliases] = await Promise.all([
  vercel(`/v13/deployments/${wwjX}`),
  vercel(`/v13/deployments/${sixL}`),
  vercel(`/v13/deployments/${fiveI}`),
  vercel("/v1/integrations/cron?projectId=prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox"),
  vercel("/v3/events?limit=80"),
  vercel("/v2/aliases?projectId=prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox&limit=20"),
]);
const cronAlt = await vercel("/v1/projects/prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox");
const beats = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-heartbeats-v1").maybeSingle();
const scheduler = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-scheduler-v1").maybeSingle();
const ownership = await client.from("communication_outbound_ownership").select("mailbox_id,thread_id,answered_inbound_provider_message_id,owner_path,owner_id,state,version,lease_expires_at,updated_at").eq("thread_id", "1a0af74557b0eb36");
const obligations = await client.from("communication_obligations").select("id,state,provider_message_id,updated_at,created_at");
const epoch = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-cutover-epoch-v1").maybeSingle();
const intended = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-intended-release-v1").maybeSingle();
const shadow = await client.from("communication_shadow_attempts").select("shadow_id,deployment_id,created_at,authorship,terminal").eq("provider_message_id", "1a0be7a9feee5375");
const schedBeat = beats.data?.payload?.runtimes?.scheduler ?? {};
const sched = scheduler.data?.payload ?? {};

const accessRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: process.env.GMAIL_OAUTH_CLIENT_ID ?? "",
    client_secret: process.env.GMAIL_OAUTH_CLIENT_SECRET ?? "",
    refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN ?? "",
    grant_type: "refresh_token",
  }),
});
const access = (await accessRes.json().catch(() => ({}))).access_token ?? "";
const after = Math.floor(Date.parse("2026-09-20T23:30:00.000Z") / 1000);
const before = Math.floor(Date.now() / 1000);
const listed = access
  ? await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(`after:${after} before:${before}`)}&maxResults=30`, {
    headers: { Authorization: `Bearer ${access}` },
  }).then((res) => res.json()).catch(() => ({}))
  : { error: "NO_TOKEN" };
const gapMessages = [];
for (const row of listed.messages ?? []) {
  const msg = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${row.id}?format=metadata&metadataHeaders=From`, {
    headers: { Authorization: `Bearer ${access}` },
  }).then((res) => res.json()).catch(() => ({}));
  gapMessages.push({
    id: msg.id ?? row.id,
    internalDate: Number(msg.internalDate ?? 0),
    from: msg.payload?.headers?.find((header) => header.name?.toLowerCase() === "from")?.value ?? "",
    threadId: msg.threadId ?? "",
  });
}
const target = access
  ? await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/1a0be7a9feee5375?format=metadata", {
    headers: { Authorization: `Bearer ${access}` },
  }).then((res) => res.json()).catch(() => ({}))
  : {};
const sender = (process.env.GMAIL_SENDER_EMAIL ?? "infinitemediaresources@gmail.com").toLowerCase();
const wwjXWindow = gapMessages.filter((row) => row.internalDate >= Date.parse(promotionAt) && row.internalDate <= Date.parse(rollbackAt));
const badPromoWindow = gapMessages.filter((row) => row.internalDate >= Date.parse("2026-09-20T23:35:31.322Z") && row.internalDate <= Date.parse(rollbackAt));
const eligible = (rows) => rows.filter((row) => row.from && !row.from.toLowerCase().includes(sender));

const dplWj = dplW.json ?? {};
const report = {
  promotion_started_at: promotionAt,
  rollback_at: rollbackAt,
  wwjX_alias_hold_ms: Date.parse(rollbackAt) - Date.parse(promotionAt),
  wwjX: {
    id: dplWj.id ?? wwjX,
    target: dplWj.target ?? null,
    readyState: dplWj.readyState ?? null,
    createdAt: iso(dplWj.createdAt),
    ready: iso(dplWj.ready),
    url: dplWj.url ?? null,
    meta: dplWj.meta ?? null,
    error: dplW.ok ? null : dplW.status,
  },
  dpl_6saL: {
    id: dpl6.json?.id ?? sixL,
    target: dpl6.json?.target ?? null,
    readyState: dpl6.json?.readyState ?? null,
  },
  dpl_5iC51: {
    id: dpl5.json?.id ?? fiveI,
    target: dpl5.json?.target ?? null,
    readyState: dpl5.json?.readyState ?? null,
  },
  crons_status: crons.status,
  crons_keys: crons.json ? Object.keys(crons.json) : [],
  crons: crons.json,
  project_framework: cronAlt.json?.framework ?? null,
  project_cron: cronAlt.json?.crons ?? cronAlt.json?.cron ?? null,
  aliases: ((aliases.json?.aliases) ?? []).filter((row) => String(row.alias || "").includes("infinity-runtime")).map((row) => ({
    alias: row.alias,
    deploymentId: row.deploymentId,
    created: iso(typeof row.created === "number" ? row.created : Date.parse(String(row.created || ""))),
  })),
  events: ((events.json?.events ?? events.json?.items) ?? []).slice(0, 30).map((row) => ({
    type: row.type,
    created: iso(row.createdAt ?? row.created),
    text: row.text ?? null,
  })),
  heartbeat: {
    updated_at: beats.data?.updated_at ?? null,
    last_success_at: schedBeat.last_success_at ?? sched.last_success_at ?? null,
    deployment_id: schedBeat.deployment_id ?? sched.active_deployment_id ?? null,
    release_sha: schedBeat.release_sha ?? schedBeat.git_sha ?? null,
    invoked_by: schedBeat.invoked_by ?? sched.invoked_by ?? null,
    schema: schedBeat.schema_version_seen ?? null,
  },
  epoch: epoch.data?.payload ?? null,
  intended: intended.data?.payload ?? null,
  ownership: ownership.data ?? [],
  obligation_count: obligations.data?.length ?? null,
  obligations_updated_in_wwjX_window: (obligations.data ?? []).filter((row) => {
    const at = Date.parse(row.updated_at ?? row.created_at ?? "");
    return at >= Date.parse(promotionAt) && at <= Date.parse(rollbackAt);
  }).map((row) => ({ id: row.id, state: row.state, updated_at: row.updated_at })),
  ownership_updated_in_wwjX_window: (ownership.data ?? []).filter((row) => {
    const at = Date.parse(row.updated_at ?? "");
    return at >= Date.parse(promotionAt) && at <= Date.parse(rollbackAt);
  }),
  shadow: shadow.data ?? [],
  gmail_token: Boolean(access),
  target_internal_date_ms: target.internalDate ? Number(target.internalDate) : null,
  messages_since_2330: gapMessages.length,
  wwjX_window_messages: wwjXWindow.length,
  wwjX_window_eligible: eligible(wwjXWindow).length,
  bad_promo_to_now_messages: badPromoWindow.length,
  bad_promo_to_now_eligible: eligible(badPromoWindow).length,
  gap_ids: gapMessages.map((row) => ({ id: row.id, internalDate: row.internalDate, threadId: row.threadId })),
  serving_tick: await fetch("https://infinity-runtime.vercel.app/api/runtime/communication-tick").then((res) => res.status).catch(() => 0),
  serving_attest: await fetch("https://infinity-runtime.vercel.app/api/runtime/communication-attest").then((res) => res.status).catch(() => 0),
};
writeFileSync(join(process.cwd(), "tmp-v8-cron-proof.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
