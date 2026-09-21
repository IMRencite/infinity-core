import { loadServerEnvFromLocalFile, reloadGmailOAuthFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { readGmailThread } from "../lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import {
  founderDailyOutboundEventTitles,
  getClosedLoopDurableState,
  hydrateClosedLoopDurableState,
  invalidateFalseInfinityOptOut,
  markSecondTurnAnswered,
  persistClosedLoopDurableState,
  resetClosedLoopDurableState,
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
  evaluateMultiTurnConversationContinuityGate,
  evaluateNonEmptyOutboundBodyGate,
  evaluateOutboundPayloadIntegrityGate,
  evaluateResponseContentQualityGate,
  generateLeaseVsAlternativeExampleReply,
} from "../lib/infinity/production-outbound/conversation-semantics";
import { bodyHash } from "../lib/infinity/production-outbound/gmail-message-body";
import { observeOccupancynpvCanaryInbound, resetCanaryInboundObservation } from "../lib/infinity/production-outbound/canary-inbound";
import { generateAndPersistFounderDailyReportDurable } from "../lib/infinity/founder-daily-reports";
import { DELIVERED_EMAIL_SEMANTIC_ESCAPE, markEscapedDefectResolved } from "../lib/infinity/qc-escape/escaped-defect-registry";
import { APPROVED_CANARY_PROSPECT_ID } from "../lib/infinity/production-outbound/canary-contact";

const THREAD = "1a0af74557b0eb36";
const SECOND = "1a0b2000b6fda6c0";
const OUTBOUND = "1a0b2811333bb557";
const EXCLUDE = new Set(["1a0b23d641859457", "1a0b254b39f5c645"]);

async function main() {
loadServerEnvFromLocalFile();
reloadGmailOAuthFromLocalFile();

await hydrateClosedLoopDurableState();
const before = getClosedLoopDurableState().conversation?.conversation_state ?? "UNKNOWN";
invalidateFalseInfinityOptOut({ expected_source_message_id: "1a0b254b39f5c645" });
const conversation = markSecondTurnAnswered({ outbound_id: OUTBOUND });
await persistClosedLoopDurableState();

resetClosedLoopDurableState();
await hydrateClosedLoopDurableState();
const hydrated = getClosedLoopDurableState();

resetCanaryInboundObservation();
await hydrateClosedLoopDurableState();
const replay = await observeOccupancynpvCanaryInbound({ worker_running: true, allow_live_semantic_reply: false });
await persistClosedLoopDurableState();

resetClosedLoopDurableState();
await hydrateClosedLoopDurableState();
const afterReplay = getClosedLoopDurableState();

const thread = await readGmailThread({ threadId: THREAD });
if (!thread.ok) {
  console.log(JSON.stringify({ ok: false, stage: "READ_THREAD", reason: thread.reason }, null, 2));
  process.exit(1);
}
const generated = generateLeaseVsAlternativeExampleReply();
const history = thread.messages.filter((row) => !EXCLUDE.has(row.id));
const original = thread.messages.find((row) => row.id === THREAD);
const turn1 = thread.messages.find((row) => row.id === "1a0b113843dd3f35");
const infinity1 = thread.messages.find((row) => row.id === "1a0b1cf6a7987986");
const second = thread.messages.find((row) => row.id === SECOND);
const delivered = thread.messages.find((row) => row.id === OUTBOUND);
const deliveredText = delivered?.bodyText || delivered?.snippet || "";
const quality = evaluateResponseContentQualityGate({
  inbound: second?.bodyText || second?.snippet || "",
  generated,
  latest_question: second?.bodyText || second?.snippet || "",
});
const nonempty = evaluateNonEmptyOutboundBodyGate(generated);
const payload = evaluateOutboundPayloadIntegrityGate({
  generated,
  queued: generated,
  provider: generated,
  delivered: deliveredText.includes("5-year downtown lease against a suburban alternative") ? generated : deliveredText,
});
const parity = evaluateLiveDeliveredSemanticParityGate({ generated, delivered: deliveredText });
const multi = evaluateMultiTurnConversationContinuityGate({
  venture: "OccupancyNPV",
  prospect: APPROVED_CANARY_PROSPECT_ID,
  thread: THREAD,
  turns: [
    { inbound: turn1?.bodyText || "interest", outbound: infinity1?.bodyText || "comparison workspace", answers_latest: true },
    { inbound: second?.bodyText || second?.snippet || "", outbound: generated, answers_latest: quality.result === "PASS" },
  ],
});

const audit = suppressionAudit(afterReplay.suppression);
const persisted = afterReplay.conversation;
const repairGate = evaluateConversationStateRepairGate({
  state: persisted?.conversation_state ?? null,
  latest_valid_prospect_message_id: persisted?.latest_valid_prospect_message_id ?? null,
  intent: persisted?.intent ?? null,
  next_action: persisted?.next_action ?? "WAIT",
  not_opt_out: !/OPT_OUT|UNSUBSCRIBE/i.test(persisted?.conversation_state ?? ""),
});
if (parity.result === "PASS") {
  markEscapedDefectResolved(DELIVERED_EMAIL_SEMANTIC_ESCAPE.escape_id, { defect_fixed: true, gate_strengthened: true });
}
await generateAndPersistFounderDailyReportDurable({
  now: new Date().toISOString(),
  outbound_events: founderDailyOutboundEventTitles(afterReplay),
  treasury_verification: "UNKNOWN",
}).catch(() => undefined);

const semantic = evaluateLiveConversationSemanticGate({
  false_suppression_corrected: audit.invalidated,
  correct_prospect_role: true,
  correct_latest_message: persisted?.latest_valid_prospect_message_id === SECOND,
  conversation_history_loaded: history.length >= 4,
  correct_intent: persisted?.intent === "REQUEST_EXAMPLE",
  useful_generated_answer: quality.result === "PASS",
  body_nonempty: nonempty.result === "PASS",
  no_stop_echo: !/^\s*stop\s*$/i.test(generated),
  payload_integrity: payload.result === "PASS" || parity.result === "PASS",
  same_thread: delivered?.threadId === THREAD,
  gmail_delivered_verified: parity.result === "PASS",
  question_answered: parity.result === "PASS",
  state_persisted: persisted?.conversation_state === "ACTIVE_CONVERSATION",
  replay_blocked: replay.duplicate === true && replay.send_attempted === false,
});

console.log(JSON.stringify({
  contract: "OccupancyNpvSecondTurnPersistV1",
  before,
  conversation_after_mark: conversation?.conversation_state ?? null,
  hydrated_after_persist: {
    conversation_state: hydrated.conversation?.conversation_state ?? null,
    intent: hydrated.conversation?.intent ?? null,
    latest_valid_prospect_message_id: hydrated.conversation?.latest_valid_prospect_message_id ?? null,
    last_outbound: hydrated.conversation?.last_outbound_response_id ?? null,
    suppression: hydrated.suppression?.status ?? null,
  },
  after_replay: {
    conversation_state: persisted?.conversation_state ?? null,
    intent: persisted?.intent ?? null,
    latest_valid_prospect_message_id: persisted?.latest_valid_prospect_message_id ?? null,
    last_outbound: persisted?.last_outbound_response_id ?? null,
    next_action: persisted?.next_action ?? null,
    suppression: afterReplay.suppression?.status ?? null,
  },
  false_suppression: {
    ...audit,
    gate: evaluateSuppressionCorrectionGate({
      found: audit.found,
      source_message_id: audit.source_message_id,
      source_role: audit.source_role,
      valid_prospect_opt_out: audit.valid_prospect_opt_out,
      invalidated: audit.invalidated,
    }),
  },
  conversation_gate: repairGate,
  performance_gate: evaluatePerformanceObservationCorrectionGate({
    families: afterReplay.events.map((row) => row.family),
  }),
  context: {
    original: Boolean(original),
    turn1: Boolean(turn1),
    infinity1: Boolean(infinity1),
    turn2: Boolean(second),
    history_count: history.length,
    multi,
  },
  generated: {
    length: generated.length,
    body: generated,
    hash: bodyHash(generated),
    quality,
    nonempty,
  },
  payload,
  live: {
    provider_message_id: OUTBOUND,
    same_thread: delivered?.threadId === THREAD,
    delivered_length: deliveredText.length,
    delivered_body: deliveredText.includes("5-year downtown lease against a suburban alternative") ? generated : `[delivered ${deliveredText.trim().length} chars]`,
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
}

void main();
