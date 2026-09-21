import { loadServerEnvFromLocalFile, reloadGmailOAuthFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { readGmailThread } from "../lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import { classifyMessageRole, looksLikeInfinityAuthored } from "../lib/infinity/production-outbound/conversation-semantics";
import { stripQuotedReply } from "../lib/infinity/production-outbound/gmail-message-body";
import { INFINITY_MANAGED_SENDER } from "../lib/infinity/inbound-communication-runtime/constants";
import { resolveApprovedCanaryEmail } from "../lib/infinity/production-outbound/canary-contact";
import { getClosedLoopDurableState, hydrateClosedLoopDurableState } from "../lib/infinity/production-outbound/closed-loop-durable";
import {
  getCommunicationSchedulerState,
  hydrateCommunicationSchedulerState,
  projectCommunicationSchedulerHq,
} from "../lib/infinity/production-outbound/communication-runtime";

const THREAD = "1a0af74557b0eb36";
const TARGET = /give me an example of how it would work with 2 different leases/i;

function safeIdentity(value: string): string {
  if (/infinitemediaresources|imros|infinity/i.test(value)) return "INFINITY_MAILBOX";
  if (/@/.test(value)) return "PROSPECT_MAILBOX";
  return "UNKNOWN";
}

async function main() {
  loadServerEnvFromLocalFile();
  reloadGmailOAuthFromLocalFile();
  await hydrateClosedLoopDurableState();
  await hydrateCommunicationSchedulerState();
  const thread = await readGmailThread({ threadId: THREAD });
  const prospect = resolveApprovedCanaryEmail();
  const messages = thread.ok ? thread.messages : [];
  const classified = messages.map((message) => {
    const raw = (message.bodyText || message.snippet || "").trim();
    const visible = stripQuotedReply(raw);
    const current = classifyMessageRole({
      message_id: message.id,
      from: message.from,
      to: message.to,
      body: raw,
      snippet: message.snippet,
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: prospect || INFINITY_MANAGED_SENDER,
    });
    const visibleRole = classifyMessageRole({
      message_id: message.id,
      from: message.from,
      to: message.to,
      body: visible,
      snippet: "",
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: prospect || INFINITY_MANAGED_SENDER,
    });
    return {
      id: message.id,
      date: message.date,
      from: safeIdentity(message.from),
      to: safeIdentity(message.to),
      current_role: current.role,
      current_direction: current.direction,
      visible_role: visibleRole.role,
      visible_direction: visibleRole.direction,
      quoted_residue: looksLikeInfinityAuthored(raw) && !looksLikeInfinityAuthored(visible),
      same_mailbox: Boolean(prospect) && prospect === INFINITY_MANAGED_SENDER.toLowerCase(),
      visible: visible.slice(0, 180),
      target: TARGET.test(visible) || TARGET.test(raw),
    };
  });
  const durable = getClosedLoopDurableState();
  const scheduler = getCommunicationSchedulerState();
  const hq = projectCommunicationSchedulerHq();
  console.log(JSON.stringify({
    contract: "MissedInboundIncidentObserveV1",
    observe_only: true,
    gmail_ok: thread.ok,
    message_count: messages.length,
    latest_8: classified.slice(-8),
    target: classified.find((row) => row.target) ?? null,
    conversation: {
      state: durable.conversation?.conversation_state ?? null,
      next_action: durable.conversation?.next_action ?? null,
      intent: durable.conversation?.intent ?? null,
      last_inbound: durable.conversation?.last_inbound_message_id ?? null,
    },
    suppression: durable.suppression ? {
      status: durable.suppression.status,
      source_message_id: durable.suppression.source_message_id,
      source_role: durable.suppression.source_role ?? null,
      valid: durable.suppression.valid ?? null,
    } : null,
    processed_keys: durable.processed_message_keys.slice(-12),
    sent_keys: durable.sent_keys.slice(-12),
    jobs: scheduler.jobs.map((job) => ({
      inbound_message_id: job.inbound_message_id,
      state: job.state,
      eligible_at: job.eligible_at,
      created_at: job.created_at,
      started_at: job.started_at,
      sent_at: job.sent_at,
      failure_reason: job.failure_reason,
      provider_message_id: job.provider_message_id ?? null,
    })),
    hq: { status: hq.status, last_tick_at: hq.last_tick_at, last_error: hq.last_error, composer_version: hq.composer_version },
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "OBSERVE_FAILED" }));
  process.exit(1);
});
