import { createClient } from "@supabase/supabase-js";
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
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const { data } = client
  ? await client.from("cloud_runtime_state").select("payload, updated_at").eq("scope", "production-outbound-closed-loop-v1").maybeSingle()
  : { data: null };
const payload = data?.payload ?? null;
const conversation = payload?.conversation ?? null;
const events = Array.isArray(payload?.events) ? payload.events : [];
const families = new Set(events.map((row) => row.family));
const required = [
  "INBOUND_REPLY_DETECTED",
  "INBOUND_REPLY_INGESTED",
  "INBOUND_REPLY_CLASSIFIED",
  "POSITIVE_INTEREST",
  "RESPONSE_QUEUED",
  "RESPONSE_SENT",
  "RESPONSE_DELIVERED",
];
const followups = Array.isArray(payload?.followups) ? payload.followups : [];
const reportDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
let report = null;
if (client) {
  const daily = await client.from("founder_daily_reports").select("payload, report_date").eq("report_date", reportDate).maybeSingle();
  report = daily.data?.payload ?? daily.data ?? null;
  if (!report) {
    const listed = await client.from("founder_daily_reports").select("payload, report_date").order("report_date", { ascending: false }).limit(1);
    report = listed.data?.[0]?.payload ?? listed.data?.[0] ?? null;
  }
}
const reportText = JSON.stringify(report ?? {});
const visible = [
  "OccupancyNPV Outbound Delivered",
  "Inbound Reply Detected",
  "Positive Interest Classified",
  "Response Sent",
  "Response Delivered",
].filter((title) => reportText.includes(title));
console.log(JSON.stringify({
  contract: "OccupancyNpvClosedLoopCompletionEvalV1",
  durable_scope: "production-outbound-closed-loop-v1",
  updated_at: data?.updated_at ?? null,
  conversation_found: Boolean(conversation),
  venture: conversation?.venture ?? null,
  thread_id: conversation?.thread_id ?? null,
  classification: conversation?.reply_classification ?? null,
  semantic_classification: conversation?.semantic_classification ?? null,
  last_activity_at: conversation?.last_activity_at ?? null,
  next_action: conversation?.next_action ?? null,
  conversation_state: conversation?.conversation_state ?? null,
  pipeline_state: conversation?.pipeline_state ?? null,
  event_families: [...families],
  required_events: required.every((family) => families.has(family)),
  suppression: payload?.suppression
    ? {
      found: true,
      channel: payload.suppression.channel,
      reason: payload.suppression.reason,
      venture: payload.suppression.venture,
      status: payload.suppression.status,
      source_message_id: payload.suppression.source_message_id,
    }
    : { found: false },
  followups: {
    pending: followups.filter((row) => row.status === "PENDING").length,
    cancelled: followups.filter((row) => row.status === "CANCELLED").length,
    remaining_eligible: followups.filter((row) => row.eligible).length,
  },
  processed_keys: payload?.processed_message_keys ?? [],
  sent_keys: payload?.sent_keys ?? [],
  daily_report_visible: visible,
  daily_report_found: Boolean(report),
}, null, 2));
