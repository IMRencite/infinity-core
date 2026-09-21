/**
 * Read-only T4 inbound diagnostic. Does not tick, enqueue, send, or persist.
 */
import { createHash } from "node:crypto";
import { loadServerEnvFromLocalFile, reloadGmailOAuthFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { INFINITY_MANAGED_SENDER } from "../lib/infinity/inbound-communication-runtime/constants";
import { readGmailThread, searchTrackedGmailMessages } from "../lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import { CANARY_INBOUND_SUBJECTS } from "../lib/infinity/production-outbound/canary-inbound";
import { resolveApprovedCanaryEmail } from "../lib/infinity/production-outbound/canary-contact";
import {
  CANONICAL_OCCUPANCYNPV_THREAD_ID,
  getClosedLoopDurableState,
  hydrateClosedLoopDurableState,
  lookupSuppression,
} from "../lib/infinity/production-outbound/closed-loop-durable";
import {
  getCommunicationSchedulerState,
  hydrateCommunicationSchedulerState,
  projectCommunicationSchedulerHq,
} from "../lib/infinity/production-outbound/communication-runtime";
import {
  classifyMessageRole,
  isTryWithNumbersQuestion,
} from "../lib/infinity/production-outbound/conversation-semantics";

const T4 = "That makes sense. If I wanted to actually try this with my current lease numbers, what would I need to enter?";
const ANSWERED = new Set(["1a0b113843dd3f35", "1a0b2000b6fda6c0"]);
const KNOWN = new Set([
  "1a0af74557b0eb36",
  "1a0b113843dd3f35",
  "1a0b1cf6a7987986",
  "1a0b2000b6fda6c0",
  "1a0b23d641859457",
  "1a0b254b39f5c645",
  "1a0b2811333bb557",
  "1a0b2c9c7407859a",
  "1a0b2d5878bc6c17",
]);

function fp(value: string): string {
  return createHash("sha256").update(value.toLowerCase()).digest("hex").slice(0, 12);
}

function safeSender(from: string): string {
  if (/infinitemediaresources@gmail\.com/i.test(from)) return "INFINITY_MANAGED_SENDER";
  const email = from.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] ?? "unknown";
  return `fingerprint:${fp(email)}`;
}

async function main() {
  loadServerEnvFromLocalFile();
  reloadGmailOAuthFromLocalFile();
  await hydrateClosedLoopDurableState();
  await hydrateCommunicationSchedulerState();
  const now = new Date().toISOString();
  const scheduler = getCommunicationSchedulerState();
  const hq = projectCommunicationSchedulerHq(scheduler, now);
  const durable = getClosedLoopDurableState();
  const query = CANARY_INBOUND_SUBJECTS.map((subject) => `subject:"${subject}"`).join(" OR ");
  const search = await searchTrackedGmailMessages({ query });
  const thread = await readGmailThread({ threadId: CANONICAL_OCCUPANCYNPV_THREAD_ID });
  const messages = thread.ok ? thread.messages : [];
  const infinity = INFINITY_MANAGED_SENDER;
  const prospect = resolveApprovedCanaryEmail() || infinity;
  const classified = messages.map((message) => {
    const body = (message.bodyText || message.snippet || "").trim();
    const role = classifyMessageRole({
      message_id: message.id,
      from: message.from,
      to: message.to,
      body,
      snippet: message.snippet,
      infinity_identity: infinity,
      prospect_identity: prospect,
    });
    return {
      id: message.id,
      date: message.date,
      role: role.role,
      direction: role.direction,
      sender: safeSender(message.from),
      body: body.slice(0, 240),
      known: KNOWN.has(message.id),
      t4_match: /try this with my current lease numbers|what would i need to enter/i.test(body),
    };
  });
  const latest = classified.at(-1) ?? null;
  const latestProspect = [...classified].reverse().find((row) => row.role === "PROSPECT" && row.direction === "INBOUND") ?? null;
  const t4 = [...classified].reverse().find((row) => row.t4_match) ?? null;
  const t4Id = t4?.id ?? null;
  const job = t4Id ? scheduler.jobs.find((row) => row.inbound_message_id === t4Id) ?? null : null;
  const sentKey = t4Id ? `communication-job-send:${CANONICAL_OCCUPANCYNPV_THREAD_ID}:${t4Id}` : null;
  const processed = t4Id ? durable.processed_message_keys.includes(`canary-reply:${t4Id}`) : false;
  const ticksSince = scheduler.detections_24h.filter((row) => Date.parse(row.at) >= Date.parse(t4?.date ? new Date(t4.date).toISOString() : "1970-01-01"));
  const lastTick = scheduler.last_tick_at ? Date.parse(scheduler.last_tick_at) : 0;
  const t4Ms = t4?.date ? Date.parse(new Date(t4.date).toISOString()) : NaN;
  const cronAfterT4 = Number.isFinite(t4Ms) && lastTick ? lastTick >= t4Ms : false;
  const identitySame = infinity.toLowerCase() === prospect.toLowerCase();
  const suppression = lookupSuppression(prospect);
  const whyNoJob = !t4Id
    ? "T4_NOT_IN_THREAD"
    : job
      ? null
      : [
        !scheduler.last_trigger_source || scheduler.last_trigger_source !== "VERCEL_CRON" ? "LAST_TRIGGER_NOT_CRON" : null,
        latestProspect?.id !== t4Id ? "NEWEST_PROSPECT_IS_NOT_T4" : null,
        ANSWERED.has(t4Id) ? "ANSWERED_INBOUND_HARDCODE" : null,
        processed ? "PROCESSED_KEY_PRESENT" : null,
        sentKey && durable.sent_keys.includes(sentKey) ? "SENT_KEY_PRESENT" : null,
        durable.conversation?.last_inbound_message_id && durable.conversation.last_inbound_message_id !== t4Id
          ? `CONVERSATION_WATERMARK_STILL:${durable.conversation.last_inbound_message_id}`
          : null,
        search.ok && !search.threadIds.includes(CANONICAL_OCCUPANCYNPV_THREAD_ID) ? "SEARCH_MISSED_CANONICAL_THREAD" : null,
        !search.ok ? `SEARCH_FAILED:${search.ok === false ? search.reason : ""}` : null,
      ].filter(Boolean);
  console.log(JSON.stringify({
    contract: "T4AutonomousInboundDiagnosticV1",
    mutate: false,
    now,
    cron: {
      last_tick_at: scheduler.last_tick_at,
      last_gmail_check_at: scheduler.last_gmail_check_at,
      last_trigger_source: scheduler.last_trigger_source,
      last_error: hq.last_error,
      raw_last_error: scheduler.last_error,
      status: hq.status,
      token_exchange: hq.token_exchange,
      gmail_send_present: hq.gmail_send_present,
      gmail_readonly_present: hq.gmail_readonly_present,
      observe_error_kind: hq.observe_error_kind,
      last_inbound_message_id: scheduler.last_inbound_message_id,
      last_detected_at: scheduler.last_detected_at,
      detections_24h: scheduler.detections_24h,
      jobs: scheduler.jobs.map((row) => ({
        job_id: row.job_id,
        inbound_message_id: row.inbound_message_id,
        state: row.state,
        eligible_at: row.eligible_at,
        sent_at: row.sent_at ?? null,
        failure_reason: row.failure_reason,
        intent: row.intent ?? null,
      })),
      cron_after_t4: cronAfterT4,
      ticks_since_t4_estimate: Number.isFinite(t4Ms)
        ? scheduler.detections_24h.filter((row) => Date.parse(row.at) >= t4Ms).length
        : null,
      minutes_since_last_tick: lastTick ? (Date.parse(now) - lastTick) / 60000 : null,
    },
    search: {
      query,
      ok: search.ok,
      reason: search.ok ? null : search.reason,
      thread_ids: search.ok ? search.threadIds : [],
      canonical_in_results: search.ok ? search.threadIds.includes(CANONICAL_OCCUPANCYNPV_THREAD_ID) : false,
      max_results: 10,
      filters: {
        subjects: CANARY_INBOUND_SUBJECTS,
        after_before: "NONE",
        historyId: "NONE",
        unread_only: false,
        label: "NONE",
      },
    },
    thread: {
      ok: thread.ok,
      reason: thread.ok ? null : thread.reason,
      thread_id: CANONICAL_OCCUPANCYNPV_THREAD_ID,
      message_count: messages.length,
      identity_same: identitySame,
      latest,
      latest_prospect: latestProspect,
      t4,
    },
    durable: {
      conversation_state: durable.conversation?.conversation_state ?? null,
      last_inbound: durable.conversation?.last_inbound_message_id ?? null,
      last_outbound: durable.conversation?.last_outbound_response_id ?? null,
      next_action: durable.conversation?.next_action ?? null,
      intent: durable.conversation?.intent ?? null,
      processed_keys: durable.processed_message_keys,
      sent_keys: durable.sent_keys,
      t4_processed: processed,
      t4_sent_key: sentKey ? durable.sent_keys.includes(sentKey) : false,
      suppression: suppression ? "ACTIVE" : "CLEAR",
    },
    job,
    why_no_job: whyNoJob,
    detections_mention_t4: t4Id ? scheduler.detections_24h.some((row) => row.inbound_message_id === t4Id) : false,
  }, null, 2));
}

void main();
