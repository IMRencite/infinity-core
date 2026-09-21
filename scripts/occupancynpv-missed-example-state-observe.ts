import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { getClosedLoopDurableState, hydrateClosedLoopDurableState, isValidProspectSuppression, lookupSuppression } from "../lib/infinity/production-outbound/closed-loop-durable";
import { getCommunicationSchedulerState, hydrateCommunicationSchedulerState } from "../lib/infinity/production-outbound/communication-runtime";

const TARGET = process.env.TURN_A_MESSAGE_ID || "1a0b8fe61045cbdb";

async function main() {
  loadServerEnvFromLocalFile();
  await hydrateClosedLoopDurableState();
  await hydrateCommunicationSchedulerState();
  const durable = getClosedLoopDurableState();
  const scheduler = getCommunicationSchedulerState();
  const jobs = scheduler.jobs.filter((job) =>
    job.inbound_message_id === TARGET
    || /1a0b8f|1a0b9f|1a0ba|1a0bb|compare them/i.test(`${job.job_id} ${job.inbound_message_id} ${job.intent ?? ""}`),
  );
  console.log(JSON.stringify({
    observe_only: true,
    last_inbound_message_id: scheduler.last_inbound_message_id,
    last_detected_at: scheduler.last_detected_at,
    last_gmail_check_at: scheduler.last_gmail_check_at,
    job_count: scheduler.jobs.length,
    job_states: scheduler.jobs.map((job) => ({
      id: job.job_id,
      inbound: job.inbound_message_id,
      state: job.state,
      eligible_at: job.eligible_at,
      sent_at: job.sent_at,
      provider_message_id: job.provider_message_id ?? null,
      failure_reason: job.failure_reason,
      intent: job.intent ?? null,
    })).slice(-12),
    target_jobs: jobs,
    detections: scheduler.detections_24h.slice(-8),
    conversation: durable.conversation,
    suppression_raw: durable.suppression,
    suppression_valid: isValidProspectSuppression(durable.suppression),
    lookup: lookupSuppression(),
    processed_has_target: durable.processed_message_keys.includes(`canary-reply:${TARGET}`),
    sent_keys_tail: durable.sent_keys.slice(-8),
    processed_tail: durable.processed_message_keys.slice(-8),
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "OBSERVE_FAILED" }));
  process.exit(1);
});
