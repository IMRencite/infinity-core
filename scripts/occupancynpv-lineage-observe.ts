import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { hydrateClosedLoopDurableState, getClosedLoopDurableState } from "../lib/infinity/production-outbound/closed-loop-durable";
import { hydrateCommunicationSchedulerState, getCommunicationSchedulerState } from "../lib/infinity/production-outbound/communication-runtime";
import {
  hydrateAutonomousSendLineage,
  getAutonomousSendLineage,
  evaluateAutonomousSendLineageGate,
  backfillT4AutonomousSendLineage,
} from "../lib/infinity/production-outbound/autonomous-send-lineage";

async function main() {
  loadServerEnvFromLocalFile();
  await hydrateClosedLoopDurableState();
  await hydrateCommunicationSchedulerState();
  await hydrateAutonomousSendLineage();
  const sched = getCommunicationSchedulerState();
  const t4 = sched.jobs.find((job) => job.job_id === "job:1a0af74557b0eb36:1a0b3b2bd5ab75a7") ?? null;
  const row = await backfillT4AutonomousSendLineage({
    job_id: t4?.job_id,
    inbound_message_id: t4?.inbound_message_id,
    provider_message_id: t4?.provider_message_id,
    job_state: t4?.state,
  });
  const durable = getClosedLoopDurableState();
  console.log(JSON.stringify({
    t4_state: t4?.state ?? null,
    t4_provider: t4?.provider_message_id ?? null,
    t4_sent_key: durable.sent_keys.includes("communication-job-send:1a0af74557b0eb36:1a0b3b2bd5ab75a7"),
    next_action: durable.conversation?.next_action ?? null,
    intent: durable.conversation?.intent ?? null,
    conversation_state: durable.conversation?.conversation_state ?? null,
    last_inbound: durable.conversation?.last_inbound_message_id ?? null,
    last_outbound: durable.conversation?.last_outbound_response_id ?? null,
    lineage_count: getAutonomousSendLineage().length,
    lineage_gate: evaluateAutonomousSendLineageGate(row),
    t4_lineage: row,
    jobs: sched.jobs.map((job) => ({
      id: job.job_id,
      state: job.state,
      provider: job.provider_message_id ?? null,
      eligible_at: job.eligible_at,
    })),
  }, null, 2));
}

void main();
