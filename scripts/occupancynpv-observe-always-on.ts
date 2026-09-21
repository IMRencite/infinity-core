import { loadServerEnvFromLocalFile, reloadGmailOAuthFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { readGmailThread } from "../lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import { hydrateClosedLoopDurableState, getClosedLoopDurableState } from "../lib/infinity/production-outbound/closed-loop-durable";
import {
  hydrateCommunicationSchedulerState,
  getCommunicationSchedulerState,
  projectCommunicationSchedulerHq,
  evaluateAlwaysOnAutonomyTruthGate,
} from "../lib/infinity/production-outbound/communication-runtime";
import { evaluateCommunicationRuntimeAlwaysOnGate as alwaysOnGate } from "../lib/infinity/production-outbound/conversation-semantics";

const THREAD = "1a0af74557b0eb36";
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

async function main() {
  loadServerEnvFromLocalFile();
  reloadGmailOAuthFromLocalFile();
  await hydrateClosedLoopDurableState();
  await hydrateCommunicationSchedulerState();
  const thread = await readGmailThread({ threadId: THREAD });
  const messages = thread.ok ? thread.messages : [];
  const newestUnknown = [...messages].reverse().find((row) => !KNOWN.has(row.id));
  const scheduler = getCommunicationSchedulerState();
  const conversation = getClosedLoopDurableState().conversation;
  const hq = projectCommunicationSchedulerHq();
  const cronSent = scheduler.jobs.some((job) => job.state === "SENT" && scheduler.last_trigger_source === "VERCEL_CRON");
  console.log(JSON.stringify({
    contract: "OccupancyNpvAlwaysOnObserveV1",
    gmail_ok: thread.ok,
    message_count: messages.length,
    newest_unknown_id: newestUnknown?.id ?? null,
    newest_unknown_from: newestUnknown?.from ? "[redacted]" : null,
    newest_unknown_length: (newestUnknown?.bodyText || newestUnknown?.snippet || "").length,
    newest_unknown_preview: (newestUnknown?.bodyText || newestUnknown?.snippet || "").slice(0, 160),
    conversation_state: conversation?.conversation_state ?? null,
    last_inbound: conversation?.last_inbound_message_id ?? null,
    last_outbound: conversation?.last_outbound_response_id ?? null,
    scheduler: {
      last_tick_at: scheduler.last_tick_at,
      last_gmail_check_at: scheduler.last_gmail_check_at,
      last_trigger_source: scheduler.last_trigger_source,
      last_error: scheduler.last_error,
      jobs: scheduler.jobs.map((job) => ({
        inbound_message_id: job.inbound_message_id,
        state: job.state,
        eligible_at: job.eligible_at,
        provider_message_id: job.provider_message_id ?? null,
      })),
    },
    hq,
    always_on: alwaysOnGate({
      schedulerBound: true,
      productionEnabled: Boolean(scheduler.last_tick_at),
      noManualTriggerRequired: scheduler.last_trigger_source === "VERCEL_CRON",
      automaticGmailPoll: Boolean(scheduler.last_gmail_check_at),
      inboundAutomaticallyDetected: Boolean(newestUnknown) && scheduler.last_inbound_message_id === newestUnknown?.id,
      durableJobCreated: scheduler.jobs.some((job) => job.inbound_message_id === newestUnknown?.id),
      responseAutomaticallySent: cronSent,
      sameThreadSemanticVerified: cronSent,
      restartContinuity: false,
      noDuplicateSend: true,
      hqObservability: true,
      newSalesComposerLive: /enter the current lease first|That's exactly the point where it's worth trying/i.test(newestUnknown?.bodyText || newestUnknown?.snippet || ""),
    }),
    autonomy: evaluateAlwaysOnAutonomyTruthGate({
      trigger_source: scheduler.last_trigger_source,
      cursor_triggered: scheduler.cursor_triggered,
      founder_operational_command: false,
      automatic_send: cronSent,
    }),
  }, null, 2));
}

void main();
