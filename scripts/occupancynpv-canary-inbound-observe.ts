import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { reloadGmailOAuthFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { observeOccupancynpvCanaryInbound } from "../lib/infinity/production-outbound/canary-inbound";
import {
  evaluateInboundReplyClassificationGate,
  evaluateInboundReplyIngestionGate,
  evaluateNaturalResponsePacingGate,
  evaluateOutboundConversationContinuityGate,
  evaluateProductionOptOutSuppressionGate,
  evaluateProductionOutboundClosedLoopGate,
} from "../lib/infinity/production-outbound/closed-loop";

async function main() {
  reloadGmailOAuthFromLocalFile();
  const observed = await observeOccupancynpvCanaryInbound({ worker_running: false });
  const payload = {
    contract: "OccupancyNpvCanaryInboundObserveV1",
    observed: {
      ...observed,
      text: undefined,
    },
    gates: {
      InboundReplyIngestionGate: evaluateInboundReplyIngestionGate({
        replyFound: observed.reply_found,
        ingested: observed.reply_found ? observed.ingested : null,
        conversationEvent: observed.conversation_event,
        canonicalMessage: observed.canonical_message,
      }),
      OutboundConversationContinuityGate: evaluateOutboundConversationContinuityGate({
        threadMatch: observed.reply_found ? observed.thread_match : null,
        prospectMatch: observed.reply_found ? observed.prospect_match : null,
        campaignMatch: observed.reply_found ? observed.campaign_match : null,
        ventureMatch: observed.reply_found ? observed.venture_match : null,
      }),
      InboundReplyClassificationGate: evaluateInboundReplyClassificationGate({
        executed: observed.reply_found ? observed.classifier_executed : null,
        classification: observed.classification,
      }),
      NaturalResponsePacingGate: evaluateNaturalResponsePacingGate({
        inboundAt: observed.inbound_at,
        eligibleAt: observed.eligible_at,
        workerLastRun: null,
        workerEnabled: observed.worker_running,
      }),
      ProductionOptOutSuppressionGate: evaluateProductionOptOutSuppressionGate({
        classifiedOptOut: false,
        suppressionPersisted: false,
        followUpBlocked: false,
      }),
      ProductionOutboundClosedLoopGate: evaluateProductionOutboundClosedLoopGate({
        providerSend: true,
        inboxDelivery: true,
        inboundReply: observed.reply_found,
        detected: observed.reply_found,
        ingested: observed.ingested,
        matched: observed.thread_match && observed.prospect_match,
        classified: observed.classifier_executed,
        nextAction: Boolean(observed.next_action),
        paced: Boolean(observed.eligible_at),
        workerExecuted: observed.worker_running,
        queued: observed.queue_record,
        providerAcceptedResponse: false,
        sameThread: Boolean(observed.same_thread),
        responseDelivered: false,
        salesUpdated: false,
        performanceUpdated: false,
        dailyReportProven: false,
        optOutTested: false,
        optOutClassified: false,
        suppressionProven: false,
        futureSendBlocked: false,
        followUpsCancelled: false,
        idempotencyProven: observed.duplicate || Boolean(observed.idempotency_key),
        optOutIdempotencyProven: false,
        restartContinuity: false,
      }),
    },
  };
  mkdirSync(join(process.cwd(), ".infinity", "production-outbound"), { recursive: true });
  writeFileSync(join(process.cwd(), ".infinity", "production-outbound", "canary-inbound-observe.json"), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
}

void main();
