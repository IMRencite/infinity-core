import { loadServerEnvFromLocalFile, reloadGmailOAuthFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { readGmailThread } from "../lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import { classifyMessageRole, isStopOnly } from "../lib/infinity/production-outbound/conversation-semantics";
import { INFINITY_MANAGED_SENDER } from "../lib/infinity/inbound-communication-runtime/constants";
import { resolveApprovedCanaryEmail } from "../lib/infinity/production-outbound/canary-contact";
import { getClosedLoopDurableState, hydrateClosedLoopDurableState } from "../lib/infinity/production-outbound/closed-loop-durable";
import {
  getCommunicationSchedulerState,
  hydrateCommunicationSchedulerState,
  projectCommunicationSchedulerHq,
} from "../lib/infinity/production-outbound/communication-runtime";
import { evaluateProspectAuthoredOptOutGate } from "../lib/infinity/production-outbound/opt-out-closed-loop";
import { CONSULTATIVE_SALES_COMPOSER_VERSION } from "../lib/infinity/always-closing-sales/consultative-sales";

const THREAD = "1a0af74557b0eb36";

async function main() {
  loadServerEnvFromLocalFile();
  reloadGmailOAuthFromLocalFile();
  await hydrateClosedLoopDurableState();
  await hydrateCommunicationSchedulerState();
  const thread = await readGmailThread({ threadId: THREAD });
  const messages = thread.ok ? thread.messages : [];
  const prospect = resolveApprovedCanaryEmail();
  const classified = messages.map((message) => {
    const body = (message.bodyText || message.snippet || "").trim();
    return {
      id: message.id,
      ...classifyMessageRole({
        message_id: message.id,
        from: message.from,
        to: message.to,
        body,
        snippet: message.snippet,
        infinity_identity: INFINITY_MANAGED_SENDER,
        prospect_identity: prospect || INFINITY_MANAGED_SENDER,
      }),
      stop: isStopOnly(body),
      length: body.length,
    };
  });
  const newestProspectStop = [...classified].reverse().find((row) => row.role === "PROSPECT" && row.stop);
  const scheduler = getCommunicationSchedulerState();
  const durable = getClosedLoopDurableState();
  const hq = projectCommunicationSchedulerHq();
  console.log(JSON.stringify({
    contract: "OccupancyNpvOptOutObserveV1",
    observe_only: true,
    manual_trigger: false,
    cursor_trigger: false,
    gmail_ok: thread.ok,
    message_count: messages.length,
    newest_prospect_stop: newestProspectStop ? {
      id: newestProspectStop.id,
      role: newestProspectStop.role,
      direction: newestProspectStop.direction,
      prospect_authored_gate: newestProspectStop ? evaluateProspectAuthoredOptOutGate({
        body: "STOP",
        role: newestProspectStop.role,
        direction: newestProspectStop.direction,
        thread_id: THREAD,
        message_id: newestProspectStop.id,
        from: prospect || "prospect",
        to: INFINITY_MANAGED_SENDER,
        prospect_identity: prospect || "prospect",
      }).result : "NOT_PROVEN",
    } : null,
    conversation_state: durable.conversation?.conversation_state ?? null,
    next_action: durable.conversation?.next_action ?? null,
    intent: durable.conversation?.intent ?? null,
    suppression: durable.suppression ? {
      status: durable.suppression.status,
      reason: durable.suppression.reason,
      source_role: durable.suppression.source_role ?? null,
      source_message_id: durable.suppression.source_message_id,
      valid: durable.suppression.valid ?? null,
    } : null,
    scheduler: {
      last_tick_at: scheduler.last_tick_at,
      last_gmail_check_at: scheduler.last_gmail_check_at,
      last_trigger_source: scheduler.last_trigger_source,
      last_error: scheduler.last_error,
      token_exchange: scheduler.token_exchange,
      gmail_readonly_present: scheduler.gmail_readonly_present,
      gmail_send_present: scheduler.gmail_send_present,
      jobs: scheduler.jobs.map((job) => ({
        inbound_message_id: job.inbound_message_id,
        state: job.state,
        failure_reason: job.failure_reason,
        provider_message_id: job.provider_message_id ?? null,
      })),
    },
    hq: {
      status: hq.status,
      last_error: hq.last_error,
      composer_version: hq.composer_version,
      suppression: hq.suppression,
    },
    source_composer_version: CONSULTATIVE_SALES_COMPOSER_VERSION,
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "OBSERVE_FAILED" }));
  process.exit(1);
});
