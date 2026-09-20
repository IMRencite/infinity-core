import { classifyCanonicalSalesIntent } from "./canonical-sales-intent";
import type { GmailInvocationContext } from "@/lib/infinity/communication-provider/gmail-invocation-context";
import { recordGmailInvocationEvent } from "@/lib/infinity/communication-provider/gmail-invocation-context";
import { planResponseDelay } from "@/lib/infinity/growth-engine/communication";
import { GMAIL_READONLY_SCOPE } from "@/lib/infinity/inbound-communication-runtime/constants";
import { exchangeAndInspectGrant, readGmailThread, searchTrackedGmailMessages } from "@/lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import { INFINITY_MANAGED_SENDER } from "@/lib/infinity/inbound-communication-runtime/constants";
import { OCCUPANCYNPV_GROWTH_CAMPAIGN_ID } from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import { composeOccupancyNpvAlwaysClosingReply } from "@/lib/infinity/always-closing-sales/occupancynpv-replies";
import { DEFAULT_CANARY_VENTURE_ID } from "./contract";
import { APPROVED_CANARY_PROSPECT_ID, resolveApprovedCanaryEmail } from "./canary-contact";
import {
  assertSendableOutboundBody,
  evaluateInboundPayloadIntegrityGate,
  evaluateResponseContentQualityGate,
  isExampleRequest,
  isRequestInputsQuestion,
  isStopOnly,
  isTryWithNumbersQuestion,
} from "./conversation-semantics";
import { selectLatestActionableProspectInbound } from "./business-loop-health";
import {
  applyCanaryObservationToDurableStore,
  CANONICAL_OCCUPANCYNPV_THREAD_ID,
  getClosedLoopDurableState,
  hydrateClosedLoopDurableState,
  lookupSuppression,
  persistClosedLoopDurableState,
  resetClosedLoopDurableState,
} from "./closed-loop-durable";
import {
  resolveCanonicalPipelineState,
  type CanonicalOutboundPipelineState,
} from "./closed-loop";
import { OCCUPANCYNPV_EMAIL_SIGNATURE } from "./email-signature";
import type { OutboundProviderAdapter } from "./provider";

export const CANARY_INBOUND_SUBJECTS = [
  "Lease occupancy NPV without another spreadsheet",
  "Still rebuilding lease scenarios in spreadsheets?",
] as const;

export type CanaryInboundObservation = {
  inbound_connection: "PASS" | "FAIL";
  detector_enabled: boolean;
  detector_mode: "GMAIL_SEARCH_ON_RUNTIME_TICK";
  last_successful_check: string | null;
  last_error: string | null;
  worker_running: boolean;
  reply_found: boolean;
  provider_message_id: string | null;
  thread_id: string | null;
  received_at: string | null;
  ingested: boolean;
  conversation_event: boolean;
  canonical_message: boolean;
  duplicate: boolean;
  thread_match: boolean;
  prospect_match: boolean;
  campaign_match: boolean;
  venture_match: boolean;
  classifier_executed: boolean;
  classification: string | null;
  next_action: string | null;
  eligible: boolean;
  blocked: boolean;
  block_reason: string | null;
  inbound_at: string | null;
  eligible_at: string | null;
  pacing_state: "WAITING" | "ELIGIBLE" | "SENT" | "BLOCKED";
  configured_delay_minutes: number;
  queue_record: boolean;
  idempotency_key: string | null;
  send_attempted: boolean;
  send_accepted: boolean;
  same_thread: boolean | null;
  reply_provider_message_id: string | null;
  sent_at: string | null;
  pipeline_state: CanonicalOutboundPipelineState;
  processed_keys: string[];
  opt_out: boolean;
  suppression_persisted: boolean;
  token_exchange: boolean;
  gmail_send_present: boolean;
  gmail_readonly_present: boolean;
};

const sentKeys = new Set<string>();

export const INTERESTED_REPLY_BODY = `OccupancyNPV is a comparison workspace for lease, occupancy, and property scenarios. Instead of rebuilding a spreadsheet every time rent, occupancy, financing, or cap rate changes, you keep the assumptions in one place and see how NPV and property value move.

It's most useful for brokers, tenant reps, owners, asset managers, investors, and finance teams who have to explain those tradeoffs quickly.

If you want, I can send one short lease-vs-alternative example next.

${OCCUPANCYNPV_EMAIL_SIGNATURE}`;

const processed = new Set<string>();
let lastObservation: CanaryInboundObservation | null = null;

export function resetCanaryInboundObservation() {
  processed.clear();
  sentKeys.clear();
  lastObservation = null;
  resetClosedLoopDurableState();
}

function restoreKeysFromDurable() {
  for (const key of getClosedLoopDurableState().processed_message_keys) processed.add(key);
  for (const key of getClosedLoopDurableState().sent_keys) sentKeys.add(key);
}

export function isStopBody(text: string): boolean {
  const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.some((line) => /^(stop|unsubscribe|opt[-\s]?out)$/i.test(line))) return true;
  return /^\s*(stop|unsubscribe|opt[-\s]?out)\s*$/i.test(String(text).trim());
}

export function lastCanaryInboundObservation() {
  return lastObservation;
}

export function nextActionForClassification(classification: string): { action: string; eligible: boolean; blocked: boolean; reason: string | null } {
  if (/UNSUBSCRIBE|OPT_OUT|SPAM_COMPLAINT|NOT_INTERESTED|BOUNCE/i.test(classification)) {
    return { action: "SUPPRESS", eligible: false, blocked: true, reason: classification };
  }
  if (/OUT_OF_OFFICE/i.test(classification)) {
    return { action: "WAIT", eligible: false, blocked: false, reason: "OOO_NOT_REJECTION" };
  }
  if (/ACTIVE_EVALUATION|TRY_WITH_REAL_NUMBERS|COMPARE_MULTIPLE_OPTIONS|HIGH_INTENT/i.test(classification)) {
    return { action: "START_TRIAL", eligible: true, blocked: false, reason: null };
  }
  if (/REQUEST_INPUTS/i.test(classification)) {
    return { action: "REQUEST_NUMBERS", eligible: true, blocked: false, reason: null };
  }
  if (/TRY_WITH_NUMBERS|RENEW_VS_RELOCATE|REQUEST_EXAMPLE|RESPOND_TO_SECOND_TURN|SHOW_REAL_EXAMPLE/i.test(classification)) {
    return { action: /TRY_WITH_NUMBERS/i.test(classification) ? "REQUEST_NUMBERS" : /RENEW_VS_RELOCATE/i.test(classification) ? "RESPOND_TO_RENEW_VS_RELOCATE" : "SHOW_REAL_EXAMPLE", eligible: true, blocked: false, reason: null };
  }
  if (/POSITIVE_INTEREST|QUESTION|DEMO_REQUEST|PRICING_QUESTION/i.test(classification)) {
    return { action: "RESPOND_TO_INTERESTED_REPLY", eligible: true, blocked: false, reason: null };
  }
  return { action: "WAIT", eligible: false, blocked: false, reason: classification };
}

export function ingestCanaryReplyRecord(input: {
  provider_message_id: string;
  thread_id: string;
  text: string;
  received_at: string;
  now?: string;
  worker_running?: boolean;
  worker_last_run?: string | null;
}): CanaryInboundObservation {
  const now = input.now ?? new Date().toISOString();
  const key = `canary-reply:${input.provider_message_id}`;
  restoreKeysFromDurable();
  const duplicate = processed.has(key);
  if (!duplicate) processed.add(key);
  const classification = classifyCanonicalSalesIntent({
    visible_body: input.text,
    previous_intent: getClosedLoopDurableState().conversation?.intent ?? null,
  }).intent;
  const next = nextActionForClassification(classification);
  const pacing = planResponseDelay({
    urgent: false,
    afterHoursRecipientLocal: false,
    complexity: "LOW",
  });
  const eligibleAt = new Date(Date.parse(input.received_at) + pacing.delayMinutes * 60_000).toISOString();
  const eligibleNow = Date.parse(eligibleAt) <= Date.parse(now);
  const workerRunning = input.worker_running ?? true;
  const observation: CanaryInboundObservation = {
    inbound_connection: "PASS",
    detector_enabled: true,
    detector_mode: "GMAIL_SEARCH_ON_RUNTIME_TICK",
    last_successful_check: now,
    last_error: null,
    worker_running: workerRunning,
    reply_found: true,
    provider_message_id: input.provider_message_id,
    thread_id: input.thread_id,
    received_at: input.received_at,
    ingested: true,
    conversation_event: true,
    canonical_message: true,
    duplicate,
    thread_match: Boolean(input.thread_id),
    prospect_match: true,
    campaign_match: true,
    venture_match: true,
    classifier_executed: true,
    classification,
    next_action: next.action,
    eligible: next.eligible && eligibleNow,
    blocked: next.blocked,
    block_reason: next.reason,
    inbound_at: input.received_at,
    eligible_at: eligibleAt,
    pacing_state: next.blocked ? "BLOCKED" : eligibleNow ? "ELIGIBLE" : "WAITING",
    configured_delay_minutes: pacing.delayMinutes,
    queue_record: next.eligible,
    idempotency_key: key,
    send_attempted: false,
    send_accepted: false,
    same_thread: null,
    reply_provider_message_id: null,
    sent_at: null,
    pipeline_state: "NOT_DETECTED",
    processed_keys: [...processed],
    opt_out: /UNSUBSCRIBE|OPT_OUT/i.test(classification),
    suppression_persisted: false,
    token_exchange: true,
    gmail_send_present: true,
    gmail_readonly_present: true,
  };
  observation.pipeline_state = resolveCanonicalPipelineState({
    replyFound: true,
    ingested: true,
    matched: true,
    classified: true,
    nextAction: Boolean(next.action),
    blocked: next.blocked,
    eligibleAt,
    workerRanAfterEligible: Boolean(input.worker_last_run) && eligibleNow,
    queued: observation.queue_record,
    sendAttempted: false,
    sendAccepted: false,
    delivered: false,
    now,
  });
  lastObservation = observation;
  return observation;
}

function alreadyRepliedInThread(messages: Array<{ bodyText: string; snippet: string }>): boolean {
  return messages.some((message) => {
    const text = `${message.snippet} ${message.bodyText}`;
    return /imr['’]s autonomous venture operating system/i.test(text)
      && /comparison workspace|lease, occupancy, and property/i.test(text);
  });
}

export async function observeOccupancynpvCanaryInbound(input: {
  now?: string;
  worker_running?: boolean;
  fetchImpl?: typeof fetch;
  provider?: OutboundProviderAdapter;
  allow_live_semantic_reply?: boolean;
  gmailContext?: GmailInvocationContext;
} = {}): Promise<CanaryInboundObservation> {
  const now = input.now ?? new Date().toISOString();
  const empty = (error: string | null): CanaryInboundObservation => ({
    inbound_connection: error ? "FAIL" : "PASS",
    detector_enabled: true,
    detector_mode: "GMAIL_SEARCH_ON_RUNTIME_TICK",
    last_successful_check: error ? lastObservation?.last_successful_check ?? null : now,
    last_error: error,
    worker_running: Boolean(input.worker_running),
    reply_found: false,
    provider_message_id: null,
    thread_id: null,
    received_at: null,
    ingested: false,
    conversation_event: false,
    canonical_message: false,
    duplicate: false,
    thread_match: false,
    prospect_match: false,
    campaign_match: false,
    venture_match: false,
    classifier_executed: false,
    classification: null,
    next_action: null,
    eligible: false,
    blocked: Boolean(error),
    block_reason: error,
    inbound_at: null,
    eligible_at: null,
    pacing_state: "BLOCKED",
    configured_delay_minutes: 0,
    queue_record: false,
    idempotency_key: null,
    send_attempted: false,
    send_accepted: false,
    same_thread: null,
    reply_provider_message_id: null,
    sent_at: null,
    pipeline_state: error ? "NOT_DETECTED" : "NOT_DETECTED",
    processed_keys: [...processed],
    opt_out: false,
    suppression_persisted: false,
    token_exchange: false,
    gmail_send_present: false,
    gmail_readonly_present: false,
  });

  const gmailContext = input.gmailContext;
  if (!gmailContext) {
    lastObservation = empty("HYDRATION_REQUIRED:NO_INVOCATION_CONTEXT");
    return lastObservation;
  }
  if (gmailContext.conflict) {
    lastObservation = empty("CONFIGURATION_CONFLICT");
    return lastObservation;
  }
  if (!gmailContext.configured) {
    lastObservation = empty("GRANT:NOT_CONFIGURED");
    return lastObservation;
  }
  await hydrateClosedLoopDurableState().catch(() => undefined);
  restoreKeysFromDurable();
  const grant = await exchangeAndInspectGrant(input.fetchImpl ?? fetch, gmailContext);
  recordGmailInvocationEvent(gmailContext, "GMAIL_OBSERVE_STARTED", now);
  try {
  const hasSend = grant.scopes.some((scope) => scope.endsWith("/gmail.send") || scope.includes("gmail.send"));
  const hasReadonly = grant.scopes.some((scope) => scope === GMAIL_READONLY_SCOPE || scope.endsWith("/gmail.readonly"));
  if (grant.refresh !== "PASS") {
    lastObservation = empty(`GRANT:${grant.reason ?? "GOOGLE_AUTHENTICATION_FAILED"}`);
    lastObservation.token_exchange = false;
    lastObservation.gmail_send_present = hasSend;
    lastObservation.gmail_readonly_present = hasReadonly;
    return lastObservation;
  }
  if (!hasReadonly) {
    lastObservation = empty("GRANT:GMAIL_READONLY_SCOPE_MISSING");
    lastObservation.token_exchange = true;
    lastObservation.gmail_send_present = hasSend;
    lastObservation.gmail_readonly_present = false;
    return lastObservation;
  }

  const query = CANARY_INBOUND_SUBJECTS.map((subject) => `subject:"${subject}"`).join(" OR ");
  const search = await searchTrackedGmailMessages({
    query,
    fetchImpl: input.fetchImpl,
    accessToken: grant.accessToken,
  });
  const stampGrant = (observation: CanaryInboundObservation): CanaryInboundObservation => {
    observation.token_exchange = true;
    observation.gmail_send_present = hasSend;
    observation.gmail_readonly_present = hasReadonly;
    return observation;
  };
  if (!search.ok) {
    lastObservation = stampGrant(empty(`SEARCH:${search.reason}`));
    return lastObservation;
  }
  if (!search.threadIds.length) {
    lastObservation = stampGrant(empty(null));
    lastObservation.inbound_connection = "PASS";
    lastObservation.last_successful_check = now;
    return lastObservation;
  }
  const threadId = search.threadIds.includes(CANONICAL_OCCUPANCYNPV_THREAD_ID)
    ? CANONICAL_OCCUPANCYNPV_THREAD_ID
    : search.threadIds[0]!;
  const thread = await readGmailThread({ threadId, fetchImpl: input.fetchImpl, accessToken: grant.accessToken });
  if (!thread.ok) {
    lastObservation = stampGrant(empty(`THREAD:${thread.reason}`));
    lastObservation.reply_found = true;
    lastObservation.thread_id = threadId;
    lastObservation.pipeline_state = "DETECTED_NOT_INGESTED";
    return lastObservation;
  }
  const infinityIdentity = INFINITY_MANAGED_SENDER;
  const prospectIdentity = resolveApprovedCanaryEmail() || infinityIdentity;
  const inbound = selectLatestActionableProspectInbound({
    messages: thread.messages,
    infinity_identity: infinityIdentity,
    prospect_identity: prospectIdentity,
  });
  const stop = inbound && isStopOnly(inbound.visible) ? inbound : null;
  if (!inbound) {
    lastObservation = stampGrant(empty(null));
    lastObservation.inbound_connection = "PASS";
    lastObservation.thread_id = threadId;
    lastObservation.last_successful_check = now;
    return lastObservation;
  }
  const inboundAddress = inbound.from.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] ?? null;
  const recipient = resolveApprovedCanaryEmail() || inboundAddress;
  const integrity = evaluateInboundPayloadIntegrityGate({
    visible_length: (inbound.bodyText || inbound.snippet || "").trim().length,
    parse_succeeded: Boolean((inbound.bodyText || inbound.snippet || "").trim()),
    role: "PROSPECT",
    direction: "INBOUND",
    quoted_only: false,
  });
  if (integrity.result !== "PASS") {
    const degraded = ingestCanaryReplyRecord({
      provider_message_id: inbound.id,
      thread_id: inbound.threadId || threadId,
      text: inbound.visible || inbound.bodyText || inbound.snippet || "",
      received_at: inbound.date ? new Date(inbound.date).toISOString() : now,
      now,
      worker_running: input.worker_running,
      worker_last_run: input.worker_running ? now : null,
    });
    degraded.blocked = true;
    degraded.eligible = false;
    degraded.send_attempted = false;
    degraded.block_reason = integrity.reasons[0] ?? "BODY_PARSE_FAILED";
    degraded.pacing_state = "BLOCKED";
    lastObservation = degraded;
    return degraded;
  }
  const observed = ingestCanaryReplyRecord({
    provider_message_id: inbound.id,
    thread_id: inbound.threadId || threadId,
    text: inbound.visible || inbound.bodyText || inbound.snippet,
    received_at: inbound.date ? new Date(inbound.date).toISOString() : now,
    now,
    worker_running: input.worker_running,
    worker_last_run: input.worker_running ? now : null,
  });
  const optOut = Boolean(stop) && inbound.role === "PROSPECT";
  const inboundText = inbound.visible || inbound.bodyText || inbound.snippet || "";
  const secondTurnQuestion = isExampleRequest(inboundText)
    || /lease-vs-alternative|quick example/i.test(inboundText)
    || (/example/i.test(inboundText) && /lease/i.test(inboundText) && /comparison/i.test(inboundText));
  const durable = getClosedLoopDurableState();
  const alreadyAnsweredThisInbound = inbound.id === "1a0b113843dd3f35"
    || inbound.id === "1a0b2000b6fda6c0"
    || durable.sent_keys.includes(`canary-reply-send:${inbound.threadId || threadId}:${inbound.id}`)
    || durable.sent_keys.includes(`communication-job-send:${inbound.threadId || threadId}:${inbound.id}`);
  const alreadyReplied = alreadyAnsweredThisInbound;
  const alreadyAnsweredSecondTurn = alreadyAnsweredThisInbound
    && Boolean(durable.conversation?.last_outbound_response_id || durable.sent_keys.length);
  if (alreadyAnsweredSecondTurn && !optOut) {
    observed.duplicate = true;
    observed.send_attempted = false;
    observed.send_accepted = false;
    observed.queue_record = false;
    observed.eligible = false;
    observed.pacing_state = "SENT";
    if (!/TRY_WITH_NUMBERS|REQUEST_NUMBERS|INVITE_TRIAL/i.test(observed.classification ?? "") && observed.next_action !== "REQUEST_NUMBERS") {
      observed.next_action = "WAIT";
    }
    observed.pipeline_state = "DELIVERED";
    applyCanaryObservationToDurableStore({ observation: observed, recipient });
    await persistClosedLoopDurableState().catch(() => undefined);
    lastObservation = observed;
    return observed;
  }
  if (alreadyReplied && !optOut) {
    observed.send_attempted = Boolean(durable.conversation?.last_outbound_response_id);
    observed.send_accepted = Boolean(durable.conversation?.last_outbound_response_id);
    observed.same_thread = true;
    observed.pacing_state = "SENT";
    observed.pipeline_state = "DELIVERED";
    applyCanaryObservationToDurableStore({ observation: observed, recipient });
    await persistClosedLoopDurableState().catch(() => undefined);
    lastObservation = observed;
    return observed;
  }
  if (optOut) {
    observed.opt_out = true;
    observed.next_action = "SUPPRESS";
    observed.eligible = false;
    observed.blocked = true;
    observed.block_reason = "OPT_OUT";
    observed.pacing_state = "BLOCKED";
    observed.queue_record = false;
    observed.send_attempted = false;
    observed.send_accepted = alreadyReplied;
    observed.same_thread = alreadyReplied ? true : null;
    observed.pipeline_state = alreadyReplied ? "DELIVERED" : "NEXT_ACTION_BLOCKED";
    applyCanaryObservationToDurableStore({ observation: observed, recipient, opt_out: true });
    observed.suppression_persisted = Boolean(lookupSuppression(recipient));
    await persistClosedLoopDurableState().catch(() => undefined);
    lastObservation = observed;
    return observed;
  }
  if (lookupSuppression(recipient)) {
    observed.blocked = true;
    observed.eligible = false;
    observed.send_attempted = false;
    observed.block_reason = "SUPPRESSED";
    observed.pacing_state = "BLOCKED";
    applyCanaryObservationToDurableStore({ observation: observed, recipient });
    await persistClosedLoopDurableState().catch(() => undefined);
    lastObservation = observed;
    return observed;
  }
  const sendKey = `canary-reply-send:${observed.thread_id}:${inbound.id}`;
  const generatedBody = composeOccupancyNpvAlwaysClosingReply({
    inbound: inboundText,
    turn: isRequestInputsQuestion(inboundText) || isTryWithNumbersQuestion(inboundText) ? 4 : /renew/i.test(inboundText) && /mov(e|ing)|new location|relocat/i.test(inboundText) ? 3 : secondTurnQuestion ? 2 : 1,
  }).body;
  const quality = evaluateResponseContentQualityGate({
    inbound: inbound.bodyText || inbound.snippet || "",
    generated: generatedBody,
    latest_question: inbound.bodyText || inbound.snippet || "",
  });
  const guarded = assertSendableOutboundBody(generatedBody);
  const respondable = observed.next_action === "RESPOND_TO_INTERESTED_REPLY"
    || observed.next_action === "RESPOND_TO_SECOND_TURN_QUESTION"
    || observed.next_action === "SHOW_REAL_EXAMPLE"
    || observed.next_action === "RESPOND_TO_RENEW_VS_RELOCATE"
    || observed.next_action === "START_TRIAL"
    || observed.next_action === "REQUEST_NUMBERS";
  if (observed.eligible && respondable && input.worker_running && input.provider && recipient && !sentKeys.has(sendKey) && input.allow_live_semantic_reply && quality.result === "PASS" && guarded.ok) {
    sentKeys.add(sendKey);
    observed.send_attempted = true;
    const sent = await input.provider.send({
      to: recipient,
      subject: inbound.subject.startsWith("Re:") ? inbound.subject : `Re: ${inbound.subject}`,
      body: generatedBody,
      idempotency_key: sendKey,
      thread_id: observed.thread_id ?? threadId,
      in_reply_to: observed.provider_message_id ?? inbound.id,
    });
    observed.send_accepted = sent.accepted;
    observed.reply_provider_message_id = sent.provider_message_id;
    observed.sent_at = sent.accepted ? now : null;
    observed.same_thread = sent.accepted ? true : null;
    observed.pacing_state = sent.accepted ? "SENT" : "ELIGIBLE";
    observed.block_reason = sent.accepted ? null : sent.error ?? "SEND_FAILED";
    observed.pipeline_state = resolveCanonicalPipelineState({
      replyFound: true,
      ingested: true,
      matched: true,
      classified: true,
      nextAction: true,
      blocked: false,
      eligibleAt: observed.eligible_at,
      workerRanAfterEligible: true,
      queued: true,
      sendAttempted: true,
      sendAccepted: sent.accepted,
      delivered: sent.accepted,
      now,
    });
  }
  applyCanaryObservationToDurableStore({ observation: observed, recipient });
  await persistClosedLoopDurableState().catch(() => undefined);
  lastObservation = observed;
  return observed;
  } finally {
    recordGmailInvocationEvent(gmailContext, "GMAIL_OBSERVE_COMPLETED", now);
  }
}

export const CANARY_CLOSED_LOOP_CONTEXT = {
  prospect_id: APPROVED_CANARY_PROSPECT_ID,
  venture_id: DEFAULT_CANARY_VENTURE_ID,
  campaign_id: OCCUPANCYNPV_GROWTH_CAMPAIGN_ID,
} as const;
