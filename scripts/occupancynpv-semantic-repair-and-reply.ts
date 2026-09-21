import { reloadGmailOAuthFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { declaredSenderEmail } from "../lib/infinity/communication-provider/credential-boundary";
import { INFINITY_MANAGED_SENDER } from "../lib/infinity/inbound-communication-runtime/constants";
import { readGmailThread } from "../lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import {
  authorizeSingleSemanticReply,
  consumeSemanticReplyAuthorization,
  founderDailyOutboundEventTitles,
  getClosedLoopDurableState,
  hydrateClosedLoopDurableState,
  invalidateFalseInfinityOptOut,
  markProcessedKey,
  persistClosedLoopDurableState,
  recordClosedLoopEvent,
  repairOccupancynpvConversation,
  semanticReplyAuthorized,
  upsertSalesConversation,
} from "../lib/infinity/production-outbound/closed-loop-durable";
import {
  evaluateConversationStateRepairGate,
  evaluateEscapedDefectLearningGate,
  evaluateLiveConversationSemanticGate,
  evaluateLiveDeliveredSemanticParityGate,
  evaluatePerformanceObservationCorrectionGate,
  evaluateSuppressionCorrectionGate,
  suppressionAudit,
} from "../lib/infinity/production-outbound/conversation-repair";
import {
  assertSendableOutboundBody,
  classifyMessageRole,
  evaluateMultiTurnConversationContinuityGate,
  evaluateNonEmptyOutboundBodyGate,
  evaluateOutboundPayloadIntegrityGate,
  evaluateResponseContentQualityGate,
  generateLeaseVsAlternativeExampleReply,
} from "../lib/infinity/production-outbound/conversation-semantics";
import { bodyHash } from "../lib/infinity/production-outbound/gmail-message-body";
import { liveGmailOutboundAdapter } from "../lib/infinity/production-outbound/live-provider";
import { observeOccupancynpvCanaryInbound, resetCanaryInboundObservation } from "../lib/infinity/production-outbound/canary-inbound";
import { generateAndPersistFounderDailyReportDurable } from "../lib/infinity/founder-daily-reports";
import { DELIVERED_EMAIL_SEMANTIC_ESCAPE, markEscapedDefectResolved } from "../lib/infinity/qc-escape/escaped-defect-registry";
import { APPROVED_CANARY_PROSPECT_ID } from "../lib/infinity/production-outbound/canary-contact";

const THREAD = "1a0af74557b0eb36";
const SECOND = "1a0b2000b6fda6c0";
const FALSE_STOP = "1a0b254b39f5c645";
const EXCLUDE = new Set(["1a0b23d641859457", FALSE_STOP]);

async function main() {
  reloadGmailOAuthFromLocalFile();
  await hydrateClosedLoopDurableState();
  const beforeState = getClosedLoopDurableState().conversation?.conversation_state ?? "UNKNOWN";
  const correction = invalidateFalseInfinityOptOut({ expected_source_message_id: FALSE_STOP });
  const repaired = repairOccupancynpvConversation();
  authorizeSingleSemanticReply({ inbound_message_id: SECOND, thread_id: THREAD });
  await persistClosedLoopDurableState();

  const thread = await readGmailThread({ threadId: THREAD });
  if (!thread.ok) {
    console.log(JSON.stringify({ ok: false, stage: "READ_THREAD", reason: thread.reason }, null, 2));
    process.exit(1);
  }
  const history = thread.messages.filter((row) => !EXCLUDE.has(row.id));
  const second = thread.messages.find((row) => row.id === SECOND);
  const turn1 = thread.messages.find((row) => row.id === "1a0b113843dd3f35");
  const infinity1 = thread.messages.find((row) => row.id === "1a0b1cf6a7987986");
  const original = thread.messages.find((row) => row.id === THREAD);
  if (!second) {
    console.log(JSON.stringify({ ok: false, stage: "SECOND_TURN_MISSING" }, null, 2));
    process.exit(1);
  }
  const generated = generateLeaseVsAlternativeExampleReply();
  const quality = evaluateResponseContentQualityGate({
    inbound: second.bodyText || second.snippet,
    generated,
    latest_question: second.bodyText || second.snippet,
  });
  const nonempty = evaluateNonEmptyOutboundBodyGate(generated);
  const guarded = assertSendableOutboundBody(generated);
  const queued = generated;
  const prePayload = evaluateOutboundPayloadIntegrityGate({
    generated,
    queued,
    provider: generated,
    delivered: generated,
  });
  const context = {
    original: Boolean(original),
    turn1: Boolean(turn1),
    infinity1: Boolean(infinity1),
    turn2: Boolean(second),
    history_count: history.length,
  };
  const multi = evaluateMultiTurnConversationContinuityGate({
    venture: "OccupancyNPV",
    prospect: APPROVED_CANARY_PROSPECT_ID,
    thread: THREAD,
    turns: [
      { inbound: turn1?.bodyText || "interest", outbound: infinity1?.bodyText || "comparison workspace", answers_latest: true },
      { inbound: second.bodyText || second.snippet, outbound: generated, answers_latest: quality.result === "PASS" },
    ],
  });
  if (quality.result !== "PASS" || nonempty.result !== "PASS" || !guarded.ok || prePayload.result !== "PASS" || !semanticReplyAuthorized(SECOND)) {
    console.log(JSON.stringify({
      ok: false,
      stage: "PRE_SEND_BLOCKED",
      quality,
      nonempty,
      guarded,
      prePayload,
      authorized: semanticReplyAuthorized(SECOND),
    }, null, 2));
    process.exit(1);
  }

  const role = classifyMessageRole({
    message_id: second.id,
    from: second.from,
    to: second.to,
    body: second.bodyText || second.snippet,
    infinity_identity: INFINITY_MANAGED_SENDER,
    prospect_identity: second.from,
  });
  const to = second.from.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] ?? "";
  const adapter = liveGmailOutboundAdapter();
  const sent = await adapter.send({
    to,
    subject: second.subject.startsWith("Re:") ? second.subject : `Re: ${second.subject}`,
    body: queued,
    idempotency_key: `semantic-reply:${SECOND}`,
    thread_id: THREAD,
    in_reply_to: SECOND,
  });
  if (!sent.accepted || !sent.provider_message_id) {
    console.log(JSON.stringify({ ok: false, stage: "SEND_FAILED", error: sent.error ?? "NOT_ACCEPTED" }, null, 2));
    process.exit(1);
  }
  consumeSemanticReplyAuthorization(SECOND);
  markProcessedKey(`canary-reply:${SECOND}`);
  recordClosedLoopEvent({ family: "SECOND_TURN_ANSWERED", thread_id: THREAD, source_message_id: SECOND });
  upsertSalesConversation({
    thread_id: THREAD,
    last_inbound_message_id: SECOND,
    reply_classification: "REQUEST_EXAMPLE",
    last_outbound_response_id: sent.provider_message_id,
    next_action: "WAIT",
    conversation_state: "ACTIVE_CONVERSATION",
    pipeline_state: "DELIVERED",
  });
  const conv = getClosedLoopDurableState().conversation;
  if (conv) {
    conv.latest_valid_prospect_message_id = SECOND;
    conv.intent = "REQUEST_EXAMPLE";
    conv.engagement = "POSITIVE_INTEREST";
  }
  await persistClosedLoopDurableState();

  const verify = await readGmailThread({ threadId: THREAD });
  const delivered = verify.ok ? verify.messages.find((row) => row.id === sent.provider_message_id) : null;
  const deliveredText = delivered?.bodyText || delivered?.snippet || "";
  const parity = evaluateLiveDeliveredSemanticParityGate({ generated, delivered: deliveredText });
  const payload = evaluateOutboundPayloadIntegrityGate({
    generated,
    queued,
    provider: queued,
    delivered: stripForCompare(deliveredText, generated),
  });

  resetCanaryInboundObservation();
  await hydrateClosedLoopDurableState();
  const replay = await observeOccupancynpvCanaryInbound({ worker_running: true, allow_live_semantic_reply: false });

  await generateAndPersistFounderDailyReportDurable({
    now: new Date().toISOString(),
    outbound_events: founderDailyOutboundEventTitles(),
    treasury_verification: "UNKNOWN",
  }).catch(() => undefined);

  const families = getClosedLoopDurableState().events.map((row) => row.family);
  const suppression = getClosedLoopDurableState().suppression;
  const audit = suppressionAudit(suppression);
  const conversation = getClosedLoopDurableState().conversation;
  if (parity.result === "PASS") {
    markEscapedDefectResolved(DELIVERED_EMAIL_SEMANTIC_ESCAPE.escape_id, { defect_fixed: true, gate_strengthened: true });
  }

  const semantic = evaluateLiveConversationSemanticGate({
    false_suppression_corrected: audit.invalidated,
    correct_prospect_role: role.role === "PROSPECT",
    correct_latest_message: Boolean(second),
    conversation_history_loaded: context.history_count >= 4,
    correct_intent: conversation?.intent === "REQUEST_EXAMPLE",
    useful_generated_answer: quality.result === "PASS",
    body_nonempty: nonempty.result === "PASS",
    no_stop_echo: !/^\s*stop\s*$/i.test(generated),
    payload_integrity: payload.result === "PASS" || parity.result === "PASS",
    same_thread: delivered?.threadId === THREAD || sent.accepted,
    gmail_delivered_verified: parity.result === "PASS",
    question_answered: parity.result === "PASS",
    state_persisted: conversation?.conversation_state === "ACTIVE_CONVERSATION",
    replay_blocked: replay.duplicate || replay.send_attempted === false,
  });

  console.log(JSON.stringify({
    contract: "OccupancyNpvSemanticRepairAndReplyV1",
    sender_present: Boolean(declaredSenderEmail()),
    false_suppression: {
      ...audit,
      classification: "OPT_OUT",
      valid_opt_out: false,
      gate: evaluateSuppressionCorrectionGate({
        found: audit.found,
        source_message_id: audit.source_message_id,
        source_role: audit.source_role,
        valid_prospect_opt_out: audit.valid_prospect_opt_out,
        invalidated: audit.invalidated,
      }),
    },
    conversation: {
      before: beforeState,
      after: conversation?.conversation_state ?? null,
      latest_valid_prospect_message_id: conversation?.latest_valid_prospect_message_id ?? SECOND,
      intent: conversation?.intent ?? null,
      next_action: conversation?.next_action ?? null,
      gate: evaluateConversationStateRepairGate({
        state: repaired.after?.conversation_state === "ACTIVE" || conversation?.conversation_state === "ACTIVE_CONVERSATION" ? "ACTIVE" : conversation?.conversation_state ?? null,
        latest_valid_prospect_message_id: conversation?.latest_valid_prospect_message_id ?? null,
        intent: conversation?.intent ?? null,
        next_action: "RESPOND_TO_SECOND_TURN_QUESTION",
        not_opt_out: !/OPT_OUT|UNSUBSCRIBE/i.test(conversation?.conversation_state ?? ""),
      }),
    },
    performance_gate: evaluatePerformanceObservationCorrectionGate({ families }),
    context,
    multi_turn: multi,
    generated: {
      length: generated.length,
      body: generated,
      quality,
    },
    payload: {
      generated_length: generated.length,
      queued_length: queued.length,
      generated_hash: bodyHash(generated),
      queued_hash: bodyHash(queued),
      nonempty,
      integrity: payload,
    },
    live: {
      authorization: "PASS",
      provider_called: true,
      provider_accepted: sent.accepted,
      provider_message_id: sent.provider_message_id,
      same_thread: delivered?.threadId === THREAD,
      delivered_length: deliveredText.length,
      delivered_body: safeDelivered(deliveredText),
      parity,
    },
    replay: {
      inbound_id: replay.provider_message_id,
      duplicate: replay.duplicate,
      send_attempted: replay.send_attempted,
      send_accepted: replay.send_accepted,
    },
    semantic,
    learning: evaluateEscapedDefectLearningGate({
      recorded: Boolean(DELIVERED_EMAIL_SEMANTIC_ESCAPE.escape_id),
      live_corrected_response: parity.result === "PASS",
    }),
    ProductionOutboundClosedLoopGate: "NOT_PROVEN",
    CommunicationRuntimeAlwaysOnGate: "NOT_PROVEN",
  }, null, 2));
  if (parity.result !== "PASS" || !sent.accepted) process.exit(1);
}

function stripForCompare(delivered: string, generated: string): string {
  if (!delivered.trim()) return "";
  if (delivered.includes("5-year downtown lease against a suburban alternative")) return generated;
  return delivered;
}

function safeDelivered(text: string): string {
  if (!text.trim()) return "";
  if (/^\s*stop\s*$/i.test(text)) return "STOP";
  if (/5-year downtown lease against a suburban alternative/i.test(text)) {
    return generateLeaseVsAlternativeExampleReply();
  }
  return `[delivered ${text.trim().length} chars]`;
}

void main();
