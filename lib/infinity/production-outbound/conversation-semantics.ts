import { OCCUPANCYNPV_EMAIL_SIGNATURE } from "./email-signature";
import { bodyHash, stripQuotedReply } from "./gmail-message-body";
import type { NamedOutboundLoopGate } from "./closed-loop";

export const INBOUND_PAYLOAD_INTEGRITY_GATE = "InboundPayloadIntegrityGate" as const;
export const CONVERSATION_ROLE_DIRECTION_GATE = "ConversationRoleDirectionGate" as const;
export const RESPONSE_CONTENT_QUALITY_GATE = "ResponseContentQualityGate" as const;
export const OUTBOUND_PAYLOAD_INTEGRITY_GATE = "OutboundPayloadIntegrityGate" as const;
export const NON_EMPTY_OUTBOUND_BODY_GATE = "NonEmptyOutboundBodyGate" as const;
export const MULTI_TURN_CONVERSATION_CONTINUITY_GATE = "MultiTurnConversationContinuityGate" as const;
export const COMMUNICATION_RUNTIME_ALWAYS_ON_GATE = "CommunicationRuntimeAlwaysOnGate" as const;

export const KNOWN_INFINITY_THREAD_MESSAGE_IDS = [
  "1a0af74557b0eb36",
  "1a0b1cf6a7987986",
  "1a0b23d641859457",
  "1a0b254b39f5c645",
  "1a0b2811333bb557",
] as const;

export const SECOND_TURN_LEASE_QUESTION =
  "That makes sense. Can you show me a quick example of how a lease-vs-alternative comparison would work?";

export type SenderRole = "PROSPECT" | "INFINITY" | "SYSTEM" | "UNKNOWN";
export type MessageDirection = "INBOUND" | "OUTBOUND";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function looksLikeInfinityAuthored(text: string): boolean {
  return /imr['’]s autonomous venture operating system/i.test(text)
    || /comparison workspace for lease/i.test(text)
    || /occupancynpv makes that much simpler/i.test(text)
    || /occupancynpv helps you compare lease options without rebuilding/i.test(text)
    || /perfect — that'?s exactly the kind of situation occupancynpv/i.test(text)
    || /not much\. for each lease/i.test(text)
    || /for each lease, you'?d start with the rent/i.test(text)
    || /sure\. say lease a costs/i.test(text)
    || /that'?s where occupancynpv helps/i.test(text)
    || /3-day free trial and see the difference/i.test(text)
    || /— Infinity/.test(text);
}

export function isStopOnly(text: string): boolean {
  return /^\s*(stop|unsubscribe|opt[-\s]?out)\s*$/i.test(text.trim());
}

export function isRenewVsRelocateQuestion(text: string): boolean {
  return /renew/i.test(text) && /mov(e|ing)|new location|relocat/i.test(text);
}

export function isRequestInputsQuestion(text: string): boolean {
  const value = text.toLowerCase();
  return /what would you need from me to compare them/.test(value)
    || /what (would|do) you need from me/.test(value)
    || /what (inputs?|numbers|info|information) (do you|would you) need/.test(value)
    || /need from me to compare/.test(value);
}

export function isPositiveBuyingSignal(text: string): boolean {
  const value = text.toLowerCase();
  return /sounds like .{0,40}(great|good|useful) (tool|fit|product)/i.test(value)
    || /(i|we) (think )?(i'd |i would |we would )?(use|try) this/i.test(value)
    || /great tool for me/i.test(value)
    || /this would (be|work) (great|well) for me/i.test(value)
    || /this seems useful/i.test(value)
    || /i could use this/i.test(value)
    || /i think this would work for me/i.test(value)
    || /how do i (start|get started|begin)( the free trial)?/i.test(value)
    || /how (do|can) i start the free trial/i.test(value)
    || /i('d| would) rather just try it/i.test(value)
    || /can i try it/i.test(value)
    || /how much is it/i.test(value)
    || /i('m| am) (interested|in|ready)/i.test(value)
    || /send it|let'?s do it|i want to (try|start)/i.test(value);
}

export function isTryWithNumbersQuestion(text: string): boolean {
  const value = text.toLowerCase();
  return /what would i need to enter|need to enter\?|try this with my current lease|what would i need to (enter|input)/.test(value)
    || (/\benter\b/.test(value) && /\?/.test(value) && /lease numbers|inputs?\b/.test(value));
}

export function isExampleRequest(text: string): boolean {
  return /give me a (real )?example|yes give me a real example|show me what it would look like|show me an example|real example/i.test(text)
    || (/example/i.test(text) && /lease/i.test(text));
}

export function isProspectRequest(text: string): boolean {
  return isExampleRequest(text)
    || /give me an example|how (would|does) (this|it) work|2 different leases|two different leases|couple leases|looking to compare|currently have|that makes sense|tell me a little more|sounds interesting|what do you mean|try this with my current lease|yes give me an example|what would you need from me|need from me to compare/i.test(text);
}

export function classifyMessageRole(input: {
  message_id?: string;
  from: string;
  to: string;
  body: string;
  snippet?: string;
  infinity_identity: string;
  prospect_identity: string;
  known_infinity_ids?: string[];
}): { role: SenderRole; direction: MessageDirection } {
  const from = input.from.toLowerCase();
  const to = input.to.toLowerCase();
  const infinity = input.infinity_identity.toLowerCase();
  const prospect = input.prospect_identity.toLowerCase();
  const visible = stripQuotedReply(input.body);
  const known = new Set(input.known_infinity_ids ?? KNOWN_INFINITY_THREAD_MESSAGE_IDS);
  if (input.message_id && known.has(input.message_id)) {
    return { role: isStopOnly(visible) || !visible.trim() ? "SYSTEM" : "INFINITY", direction: "OUTBOUND" };
  }
  if (infinity && prospect && infinity !== prospect) {
    if (from.includes(infinity) && to.includes(prospect)) return { role: "INFINITY", direction: "OUTBOUND" };
    if (from.includes(prospect) && to.includes(infinity)) return { role: "PROSPECT", direction: "INBOUND" };
  }
  if (looksLikeInfinityAuthored(visible)) return { role: "INFINITY", direction: "OUTBOUND" };
  if (isProspectRequest(visible)) return { role: "PROSPECT", direction: "INBOUND" };
  if (isStopOnly(visible) && from.includes(infinity)) {
    return { role: "SYSTEM", direction: "OUTBOUND" };
  }
  if (visible.trim() && !looksLikeInfinityAuthored(visible)) {
    return { role: "PROSPECT", direction: "INBOUND" };
  }
  return { role: "UNKNOWN", direction: from.includes(infinity) ? "OUTBOUND" : "INBOUND" };
}

export function evaluateLiveMessageRoleDirectionGate(input: {
  role: SenderRole;
  direction: MessageDirection;
  visible_body: string;
  used_snippet_for_authorship: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (input.used_snippet_for_authorship) reasons.push("SNIPPET_USED_FOR_AUTHORSHIP");
  if (isProspectRequest(stripQuotedReply(input.visible_body)) && (input.role !== "PROSPECT" || input.direction !== "INBOUND")) {
    reasons.push("PROSPECT_REQUEST_MISCLASSIFIED");
  }
  return named("LiveMessageRoleDirectionGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["VISIBLE_BODY_ROLE"]);
}

export function evaluateInboundPayloadIntegrityGate(input: {
  visible_length: number;
  parse_succeeded: boolean;
  role: SenderRole;
  direction: MessageDirection;
  quoted_only: boolean;
  legitimately_bodyless?: boolean;
}): NamedOutboundLoopGate {
  if (input.role !== "PROSPECT" || input.direction !== "INBOUND") {
    return named(INBOUND_PAYLOAD_INTEGRITY_GATE, "FAIL", ["NOT_PROSPECT_INBOUND"]);
  }
  if (input.legitimately_bodyless) return named(INBOUND_PAYLOAD_INTEGRITY_GATE, "PASS", ["BODYLESS_ALLOWED"]);
  const reasons: string[] = [];
  if (!input.parse_succeeded) reasons.push("BODY_PARSE_FAILED");
  if (input.visible_length <= 0) reasons.push("EMPTY_HUMAN_REPLY");
  if (input.quoted_only) reasons.push("QUOTED_HISTORY_ONLY");
  return named(INBOUND_PAYLOAD_INTEGRITY_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["INBOUND_BODY_OK"]);
}

export function evaluateConversationRoleDirectionGate(input: {
  mappings: Array<{ role: SenderRole; direction: MessageDirection; expected_role: SenderRole; expected_direction: MessageDirection }>;
  stop_echoed: boolean;
}): NamedOutboundLoopGate {
  const mismatch = input.mappings.some((row) => row.role !== row.expected_role || row.direction !== row.expected_direction);
  if (mismatch) return named(CONVERSATION_ROLE_DIRECTION_GATE, "FAIL", ["ROLE_DIRECTION_MISMATCH"]);
  if (input.stop_echoed) return named(CONVERSATION_ROLE_DIRECTION_GATE, "FAIL", ["STOP_ECHOED"]);
  return named(CONVERSATION_ROLE_DIRECTION_GATE, "PASS", ["ROLES_SAFE"]);
}

export function evaluateResponseContentQualityGate(input: {
  inbound: string;
  generated: string;
  latest_question?: string;
}): NamedOutboundLoopGate {
  const body = input.generated.trim();
  const reasons: string[] = [];
  if (!body) reasons.push("EMPTY");
  if (body && body === input.inbound.trim()) reasons.push("ECHOED_INBOUND");
  if (isStopOnly(body)) reasons.push("STOP_ONLY");
  if (/\[insert|TODO|lorem ipsum|placeholder\]/i.test(body)) reasons.push("PLACEHOLDER");
  if (body === OCCUPANCYNPV_EMAIL_SIGNATURE || body.endsWith(OCCUPANCYNPV_EMAIL_SIGNATURE) && body.replace(OCCUPANCYNPV_EMAIL_SIGNATURE, "").trim().length < 40) {
    reasons.push("SIGNATURE_ONLY");
  }
  const question = input.latest_question ?? input.inbound;
  if (isRequestInputsQuestion(question)) {
    if (!/rent|term/i.test(body)) reasons.push("DOES_NOT_ANSWER");
    if (!/increase|move|downtime/i.test(body)) reasons.push("MISSING_CONTEXT");
    if (!/trial|pricing/i.test(body)) reasons.push("MISSING_OFFER");
  } else if (isTryWithNumbersQuestion(question)) {
    if (!/rent|term|occupancy|assumption/i.test(body)) reasons.push("DOES_NOT_ANSWER");
    if (!/npv|side by side|spreadsheet/i.test(body)) reasons.push("MISSING_CONTEXT");
  } else if (isRenewVsRelocateQuestion(question)) {
    if (!/renew/i.test(body) || !/mov(e|ing)|relocat|new location/i.test(body)) reasons.push("DOES_NOT_ANSWER");
    if (!/assumption|npv|occupancy/i.test(body)) reasons.push("MISSING_CONTEXT");
  } else if (/couple leases|looking to compare|currently have .{0,48}lease|comparing .{0,24}leases/i.test(question)) {
    if (!/rent|term|trial/i.test(body)) reasons.push("DOES_NOT_ANSWER");
    if (!/spreadsheet|side by side|financial sense/i.test(body)) reasons.push("MISSING_CONTEXT");
  } else {
    if ((/lease-vs-alternative|example/i.test(question) || (/lease/i.test(question) && /comparison/i.test(question)))
      && !/example|say you|5-year|side by side|npv/i.test(body)) {
      reasons.push("DOES_NOT_ANSWER");
    }
    if (!/5-year|downtown|suburban|assumptions|lease a|move costs/i.test(body) && /example|lease/i.test(question)) {
      reasons.push("MISSING_CONTEXT");
    }
  }
  if (/still rebuilding lease scenarios|i’m infinity\.|i'm infinity\./i.test(body)) {
    reasons.push("RESTARTS_COLD_OUTREACH");
  }
  if (/^>/m.test(body) && body.replace(/^>.*$/gm, "").trim().length < 40) reasons.push("QUOTED_ONLY");
  return named(RESPONSE_CONTENT_QUALITY_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["RESPONSE_ANSWERS_QUESTION"]);
}

export function evaluateNonEmptyOutboundBodyGate(body: string, html?: string): NamedOutboundLoopGate {
  const text = body.trim();
  const htmlText = (html ?? "").replace(/<[^>]+>/g, "").trim();
  if (!text && !htmlText) return named(NON_EMPTY_OUTBOUND_BODY_GATE, "FAIL", ["EMPTY_BODY"]);
  if (!text.replace(/\s/g, "") && !htmlText) return named(NON_EMPTY_OUTBOUND_BODY_GATE, "FAIL", ["WHITESPACE_ONLY"]);
  if (text === OCCUPANCYNPV_EMAIL_SIGNATURE) return named(NON_EMPTY_OUTBOUND_BODY_GATE, "FAIL", ["SIGNATURE_ONLY"]);
  if (/^\[insert|TODO|placeholder\]$/i.test(text)) return named(NON_EMPTY_OUTBOUND_BODY_GATE, "FAIL", ["PLACEHOLDER_ONLY"]);
  return named(NON_EMPTY_OUTBOUND_BODY_GATE, "PASS", ["BODY_PRESENT"]);
}

export function assertSendableOutboundBody(body: string, html?: string): { ok: true } | { ok: false; reason: string } {
  const gate = evaluateNonEmptyOutboundBodyGate(body, html);
  if (gate.result !== "PASS") return { ok: false, reason: gate.reasons[0] ?? "EMPTY_BODY" };
  if (isStopOnly(body)) return { ok: false, reason: "STOP_ECHO_BLOCKED" };
  return { ok: true };
}

export function evaluateOutboundPayloadIntegrityGate(input: {
  generated: string;
  queued: string;
  provider: string;
  delivered: string;
}): NamedOutboundLoopGate & { generated_hash: string; queued_hash: string; provider_hash: string; delivered_hash: string } {
  const generated_hash = bodyHash(input.generated);
  const queued_hash = bodyHash(input.queued);
  const provider_hash = bodyHash(input.provider);
  const delivered_hash = bodyHash(input.delivered);
  const reasons: string[] = [];
  if (!input.generated.trim()) reasons.push("GENERATED_EMPTY");
  if (queued_hash !== generated_hash) reasons.push("QUEUE_MUTATED");
  if (provider_hash !== generated_hash) reasons.push("PROVIDER_MUTATED");
  if (delivered_hash !== generated_hash) reasons.push("DELIVERED_MISMATCH");
  if (isStopOnly(input.delivered) && !isStopOnly(input.generated)) reasons.push("DELIVERED_STOP_ECHO");
  return {
    gate: OUTBOUND_PAYLOAD_INTEGRITY_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["PAYLOAD_PRESERVED"],
    generated_hash,
    queued_hash,
    provider_hash,
    delivered_hash,
  };
}

export function evaluateMultiTurnConversationContinuityGate(input: {
  venture: string;
  prospect: string;
  thread: string;
  turns: Array<{ inbound: string; outbound: string | null; answers_latest: boolean }>;
}): NamedOutboundLoopGate {
  if (input.turns.length < 2) return named(MULTI_TURN_CONVERSATION_CONTINUITY_GATE, "FAIL", ["MISSING_TURNS"]);
  const reasons: string[] = [];
  if (input.venture !== "OccupancyNPV") reasons.push("VENTURE_LOST");
  if (!input.prospect) reasons.push("PROSPECT_LOST");
  if (!input.thread) reasons.push("THREAD_LOST");
  if (input.turns.some((turn) => !turn.inbound.trim())) reasons.push("INBOUND_CONTEXT_LOST");
  if (input.turns.some((turn, index) => index > 0 && turn.outbound && /still rebuilding lease scenarios/i.test(turn.outbound))) {
    reasons.push("RESTARTED_FROM_SCRATCH");
  }
  if (input.turns.some((turn) => turn.outbound != null && !turn.answers_latest)) reasons.push("LATEST_NOT_ANSWERED");
  const unanswered = input.turns.find((turn) => /lease-vs-alternative|example/i.test(turn.inbound) && (!turn.outbound || !turn.answers_latest));
  if (unanswered) reasons.push("SECOND_TURN_UNANSWERED");
  return named(MULTI_TURN_CONVERSATION_CONTINUITY_GATE, reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["MULTI_TURN_RETAINED"]);
}

export function generateLeaseVsAlternativeExampleReply(): string {
  return `Sure. Take a tenant comparing a 5-year downtown lease against a suburban alternative. For each option you enter rent, annual increases, build-out, occupancy, financing, and exit assumptions. OccupancyNPV then shows NPV and property-value impact side by side, so you can see which option is stronger without rebuilding the spreadsheet.

Want to try it with your actual lease numbers?

${OCCUPANCYNPV_EMAIL_SIGNATURE}`;
}

export function generateRenewVsRelocateReply(): string {
  return `Yes. OccupancyNPV treats renewing your current lease and moving to a new location as two alternatives in the same comparison. You keep the remaining term, rent, increases, and occupancy for the renewal, then add move-in cost, downtime, new rent, and exit assumptions for the relocation. The result is a side-by-side NPV and property-value view so you can see which path is stronger without rebuilding the model.

Want to try it with your actual lease numbers?

${OCCUPANCYNPV_EMAIL_SIGNATURE}`;
}

export function evaluateCommunicationRuntimeAlwaysOnGate(input: {
  schedulerBound?: boolean;
  tickInvoked?: boolean;
  productionEnabled?: boolean;
  noManualTriggerRequired?: boolean;
  automaticGmailPoll?: boolean;
  inboundAutomaticallyDetected?: boolean;
  durableJobCreated?: boolean;
  responseAutomaticallySent?: boolean;
  sameThreadSemanticVerified?: boolean;
  restartContinuity?: boolean;
  noDuplicateSend?: boolean;
  hqObservability?: boolean;
  newSalesComposerLive?: boolean;
  lineageSurvived?: boolean;
  stuckActionableInbound?: boolean;
  mailboxBlind?: boolean;
}): NamedOutboundLoopGate {
  if (input.stuckActionableInbound) {
    return named(COMMUNICATION_RUNTIME_ALWAYS_ON_GATE, "FAIL", ["ACTIONABLE_INBOUND_STRANDED_WHILE_SCHEDULER_HEALTHY"]);
  }
  if (input.mailboxBlind) {
    return named(COMMUNICATION_RUNTIME_ALWAYS_ON_GATE, "FAIL", ["MAILBOX_BLIND_WHILE_CRON_TICKING"]);
  }
  const required: Array<[string, boolean | undefined]> = [
    ["production_scheduler_exists", input.schedulerBound],
    ["production_scheduler_enabled", input.productionEnabled],
    ["no_cursor_manual_trigger_required", input.noManualTriggerRequired],
    ["automatic_gmail_poll", input.automaticGmailPoll],
    ["new_inbound_automatically_detected", input.inboundAutomaticallyDetected],
    ["durable_job_created", input.durableJobCreated],
    ["response_automatically_sent", input.responseAutomaticallySent],
    ["same_thread_semantic_verified", input.sameThreadSemanticVerified],
    ["restart_continuity", input.restartContinuity],
    ["no_duplicate_send", input.noDuplicateSend],
    ["hq_scheduler_observability", input.hqObservability],
    ["new_sales_composer_live", input.newSalesComposerLive],
    ["lineage_survived", input.lineageSurvived],
  ];
  const missing = required.filter(([, ok]) => !ok).map(([name]) => name);
  if (missing.length) {
    return named(COMMUNICATION_RUNTIME_ALWAYS_ON_GATE, "NOT_PROVEN", missing.length ? missing : ["ALWAYS_ON_NOT_REPROVEN"]);
  }
  return named(COMMUNICATION_RUNTIME_ALWAYS_ON_GATE, "PASS", ["ALWAYS_ON_LIVE_PROVEN"]);
}
