import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { APPROVED_CANARY_PROSPECT_ID } from "./canary-contact";
import {
  DEFAULT_CANARY_VENTURE_ID,
  PRODUCTION_OUTBOUND_SCOPE,
} from "./contract";
import { OCCUPANCYNPV_GROWTH_CAMPAIGN_ID } from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import type { CanonicalOutboundPipelineState } from "./closed-loop";
import { evaluateConversationStateOwnershipGate } from "@/lib/infinity/always-closing-sales/doctrine";

export type ClosedLoopObservationInput = {
  thread_id: string | null;
  provider_message_id: string | null;
  last_successful_check: string | null;
  idempotency_key: string | null;
  reply_found: boolean;
  ingested: boolean;
  classifier_executed: boolean;
  classification: string | null;
  queue_record: boolean;
  send_accepted: boolean;
  sent_at: string | null;
  reply_provider_message_id: string | null;
  next_action: string | null;
  pipeline_state: CanonicalOutboundPipelineState | string;
};

export const CLOSED_LOOP_DURABLE_SCOPE = "production-outbound-closed-loop-v1" as const;
export const CLOSED_LOOP_CONVERSATION_ID = "sales-conversation:occupancynpv:canary:1a0af74557b0eb36" as const;
export const CANONICAL_OCCUPANCYNPV_THREAD_ID = "1a0af74557b0eb36" as const;
export const CANONICAL_INTERESTED_REPLY_ID = "1a0b113843dd3f35" as const;
export const CANONICAL_INTERESTED_IDEMPOTENCY_KEY = "canary-reply:1a0b113843dd3f35" as const;

export const CLOSED_LOOP_EVENT_FAMILIES = [
  "INBOUND_REPLY_DETECTED",
  "INBOUND_REPLY_INGESTED",
  "INBOUND_REPLY_CLASSIFIED",
  "POSITIVE_INTEREST",
  "RESPONSE_QUEUED",
  "RESPONSE_SENT",
  "RESPONSE_DELIVERED",
  "OPT_OUT_DETECTED",
  "OPT_OUT_CLASSIFIED",
  "SUPPRESSION_PERSISTED",
] as const;
export type ClosedLoopEventFamily = (typeof CLOSED_LOOP_EVENT_FAMILIES)[number];

export type SalesConversationRecord = {
  id: string;
  venture: "OccupancyNPV";
  venture_id: string;
  prospect_id: string;
  campaign_id: string;
  thread_id: string;
  last_inbound_message_id: string | null;
  last_inbound_classification: string | null;
  reply_classification: string | null;
  semantic_classification: string | null;
  last_outbound_response_id: string | null;
  last_activity_at: string;
  next_action: string | null;
  conversation_state: string;
  pipeline_state: CanonicalOutboundPipelineState | string;
  latest_valid_prospect_message_id?: string | null;
  intent?: string | null;
  engagement?: string | null;
};

export type ClosedLoopEvent = {
  id: string;
  family: ClosedLoopEventFamily | string;
  at: string;
  conversation_id: string;
  venture_id: string;
  venture: "OccupancyNPV";
  thread_id: string;
  source_message_id: string | null;
};

export type ClosedLoopSuppressionRecord = {
  id: string;
  recipient_fingerprint: string;
  venture: "OccupancyNPV";
  venture_id: string;
  channel: "EMAIL";
  reason: "OPT_OUT";
  source_message_id: string;
  timestamp: string;
  status: "ACTIVE" | "INVALIDATED" | "PROVISIONAL";
  source_role?: "PROSPECT" | "INFINITY" | "SYSTEM" | "UNKNOWN";
  valid?: boolean;
  valid_prospect_opt_out?: boolean;
  prospect_id?: string;
  thread_id?: string;
  contact_identifier?: string;
  correction?: {
    reason: string;
    source_role: string;
    corrected_at: string;
    corrected_state: "INVALIDATED";
    original_status: "ACTIVE";
  };
};

export type ClosedLoopFollowUp = {
  id: string;
  status: "PENDING" | "CANCELLED" | "COMPLETED";
  eligible: boolean;
};

export type ClosedLoopDurableState = {
  version: 1;
  conversation: SalesConversationRecord | null;
  events: ClosedLoopEvent[];
  suppression: ClosedLoopSuppressionRecord | null;
  processed_message_keys: string[];
  sent_keys: string[];
  followups: ClosedLoopFollowUp[];
  reply_jobs: Array<{ key: string; status: "COMPLETED" | "CANCELLED" }>;
  last_persisted_at: string | null;
  semantic_reply_authorization?: {
    thread_id: string;
    inbound_message_id: string;
    used: boolean;
    consumed_at: string | null;
  } | null;
};

function emptyState(): ClosedLoopDurableState {
  return {
    version: 1,
    conversation: null,
    events: [],
    suppression: null,
    processed_message_keys: [],
    sent_keys: [],
    followups: [],
    reply_jobs: [],
    last_persisted_at: null,
    semantic_reply_authorization: null,
  };
}

let memory = emptyState();

export function recipientFingerprint(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 16);
}

export function semanticClassification(classification: string | null): string | null {
  if (!classification) return null;
  if (/UNSUBSCRIBE|OPT_OUT/i.test(classification)) return "OPT_OUT";
  return classification;
}

export function resetClosedLoopDurableState(): ClosedLoopDurableState {
  memory = emptyState();
  return memory;
}

export function getClosedLoopDurableState(): ClosedLoopDurableState {
  return memory;
}

export function replaceClosedLoopDurableState(next: ClosedLoopDurableState): ClosedLoopDurableState {
  memory = {
    ...emptyState(),
    ...next,
    version: 1,
    events: [...(next.events ?? [])],
    processed_message_keys: [...(next.processed_message_keys ?? [])],
    sent_keys: [...(next.sent_keys ?? [])],
    followups: [...(next.followups ?? [])],
    reply_jobs: [...(next.reply_jobs ?? [])],
  };
  return memory;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function hydrateClosedLoopDurableState(): Promise<ClosedLoopDurableState> {
  if (process.env.VITEST) return memory;
  const client = adminClient();
  if (!client) return memory;
  const { data } = await client
    .from("cloud_runtime_state")
    .select("payload")
    .eq("scope", CLOSED_LOOP_DURABLE_SCOPE)
    .maybeSingle();
  const payload = data?.payload as ClosedLoopDurableState | undefined;
  if (payload && payload.version === 1) {
    replaceClosedLoopDurableState(payload);
  }
  return memory;
}

export async function persistClosedLoopDurableState(state: ClosedLoopDurableState = memory): Promise<void> {
  memory = { ...state, last_persisted_at: new Date().toISOString() };
  if (process.env.VITEST) return;
  const client = adminClient();
  if (!client) return;
  await client.from("cloud_runtime_state").upsert({
    scope: CLOSED_LOOP_DURABLE_SCOPE,
    version: 1,
    instance_id: "production-outbound-closed-loop",
    payload: memory,
    updated_at: memory.last_persisted_at,
  });
}

export function recordClosedLoopEvent(input: {
  family: ClosedLoopEventFamily | string;
  at?: string;
  thread_id: string;
  source_message_id?: string | null;
}): ClosedLoopEvent {
  const id = `${input.family}:${input.source_message_id ?? input.thread_id}`;
  const existing = memory.events.find((row) => row.id === id);
  if (existing) return existing;
  const event: ClosedLoopEvent = {
    id,
    family: input.family,
    at: input.at ?? new Date().toISOString(),
    conversation_id: CLOSED_LOOP_CONVERSATION_ID,
    venture_id: DEFAULT_CANARY_VENTURE_ID,
    venture: "OccupancyNPV",
    thread_id: input.thread_id,
    source_message_id: input.source_message_id ?? null,
  };
  memory.events = [...memory.events, event];
  return event;
}

export function upsertSalesConversation(input: {
  thread_id: string;
  last_inbound_message_id?: string | null;
  reply_classification?: string | null;
  last_outbound_response_id?: string | null;
  next_action?: string | null;
  conversation_state?: string;
  pipeline_state?: string;
  latest_valid_prospect_message_id?: string | null;
  intent?: string | null;
  engagement?: string | null;
  at?: string;
}): SalesConversationRecord {
  const at = input.at ?? new Date().toISOString();
  const classification = input.reply_classification ?? memory.conversation?.reply_classification ?? null;
  const inboundId = input.last_inbound_message_id ?? memory.conversation?.last_inbound_message_id ?? null;
  const intent = input.intent
    ?? (/REQUEST_EXAMPLE/i.test(classification ?? "") ? "REQUEST_EXAMPLE" : memory.conversation?.intent)
    ?? null;
  memory.conversation = {
    id: CLOSED_LOOP_CONVERSATION_ID,
    venture: "OccupancyNPV",
    venture_id: DEFAULT_CANARY_VENTURE_ID,
    prospect_id: APPROVED_CANARY_PROSPECT_ID,
    campaign_id: OCCUPANCYNPV_GROWTH_CAMPAIGN_ID,
    thread_id: input.thread_id,
    last_inbound_message_id: inboundId,
    last_inbound_classification: classification,
    reply_classification: classification,
    semantic_classification: semanticClassification(classification),
    last_outbound_response_id: input.last_outbound_response_id ?? memory.conversation?.last_outbound_response_id ?? null,
    last_activity_at: at,
    next_action: input.next_action ?? memory.conversation?.next_action ?? null,
    conversation_state: input.conversation_state ?? memory.conversation?.conversation_state ?? "OPEN",
    pipeline_state: input.pipeline_state ?? memory.conversation?.pipeline_state ?? "NOT_DETECTED",
    latest_valid_prospect_message_id: input.latest_valid_prospect_message_id
      ?? memory.conversation?.latest_valid_prospect_message_id
      ?? (inboundId === "1a0b2000b6fda6c0" ? inboundId : null),
    intent,
    engagement: input.engagement
      ?? memory.conversation?.engagement
      ?? (/REQUEST_EXAMPLE|POSITIVE_INTEREST/i.test(classification ?? "") ? "POSITIVE_INTEREST" : null),
  };
  return memory.conversation;
}

export function markProcessedKey(key: string): boolean {
  const duplicate = memory.processed_message_keys.includes(key);
  if (!duplicate) memory.processed_message_keys = [...memory.processed_message_keys, key];
  return duplicate;
}

export function markSentKey(key: string): boolean {
  const duplicate = memory.sent_keys.includes(key);
  if (!duplicate) memory.sent_keys = [...memory.sent_keys, key];
  return duplicate;
}

export function markReplyJobCompleted(key: string): void {
  if (memory.reply_jobs.some((row) => row.key === key)) return;
  memory.reply_jobs = [...memory.reply_jobs, { key, status: "COMPLETED" }];
}

export function ensurePendingFollowUp(threadId: string): ClosedLoopFollowUp {
  const existing = memory.followups.find((row) => row.id === `followup:${threadId}:next`);
  if (existing) return existing;
  const followup: ClosedLoopFollowUp = { id: `followup:${threadId}:next`, status: "PENDING", eligible: true };
  memory.followups = [...memory.followups, followup];
  return followup;
}

export function cancelEligibleFollowups(): { before: number; cancelled: number; remaining_eligible: number } {
  const before = memory.followups.filter((row) => row.status === "PENDING" && row.eligible).length;
  memory.followups = memory.followups.map((row) =>
    row.status === "PENDING" && row.eligible ? { ...row, status: "CANCELLED", eligible: false } : row,
  );
  const remaining = memory.followups.filter((row) => row.eligible).length;
  return { before, cancelled: before, remaining_eligible: remaining };
}

export const FALSE_INFINITY_STOP_MESSAGE_ID = "1a0b254b39f5c645" as const;

export function persistSuppressionRecord(input: {
  recipient: string;
  source_message_id: string;
  at?: string;
  source_role?: ClosedLoopSuppressionRecord["source_role"];
  thread_id?: string;
  prospect_id?: string;
}): ClosedLoopSuppressionRecord {
  const timestamp = input.at ?? new Date().toISOString();
  const role = input.source_role ?? (input.source_message_id === FALSE_INFINITY_STOP_MESSAGE_ID ? "SYSTEM" : "PROSPECT");
  if (input.source_message_id === FALSE_INFINITY_STOP_MESSAGE_ID || role === "SYSTEM" || role === "INFINITY") {
    if (memory.suppression?.status === "INVALIDATED" && memory.suppression.correction?.reason === "SYSTEM_AUTHORED_FALSE_STOP") {
      return memory.suppression;
    }
    memory.suppression = {
      id: `suppression:email:${recipientFingerprint(input.recipient)}:occupancynpv`,
      recipient_fingerprint: recipientFingerprint(input.recipient),
      venture: "OccupancyNPV",
      venture_id: DEFAULT_CANARY_VENTURE_ID,
      channel: "EMAIL",
      reason: "OPT_OUT",
      source_message_id: input.source_message_id,
      timestamp,
      status: "INVALIDATED",
      source_role: "SYSTEM",
      valid: false,
      valid_prospect_opt_out: false,
      prospect_id: input.prospect_id ?? APPROVED_CANARY_PROSPECT_ID,
      thread_id: input.thread_id ?? CANONICAL_OCCUPANCYNPV_THREAD_ID,
      contact_identifier: recipientFingerprint(input.recipient),
      correction: {
        reason: "SYSTEM_AUTHORED_FALSE_STOP",
        source_role: "SYSTEM",
        corrected_at: timestamp,
        corrected_state: "INVALIDATED",
        original_status: "ACTIVE",
      },
    };
    return memory.suppression;
  }
  if (role === "UNKNOWN") {
    memory.suppression = {
      id: `suppression:email:${recipientFingerprint(input.recipient)}:occupancynpv`,
      recipient_fingerprint: recipientFingerprint(input.recipient),
      venture: "OccupancyNPV",
      venture_id: DEFAULT_CANARY_VENTURE_ID,
      channel: "EMAIL",
      reason: "OPT_OUT",
      source_message_id: input.source_message_id,
      timestamp,
      status: "PROVISIONAL",
      source_role: "UNKNOWN",
      valid: false,
      valid_prospect_opt_out: false,
      prospect_id: input.prospect_id ?? APPROVED_CANARY_PROSPECT_ID,
      thread_id: input.thread_id ?? CANONICAL_OCCUPANCYNPV_THREAD_ID,
      contact_identifier: recipientFingerprint(input.recipient),
    };
    return memory.suppression;
  }
  if (memory.suppression?.status === "ACTIVE" && memory.suppression.reason === "OPT_OUT" && memory.suppression.valid !== false) {
    return memory.suppression;
  }
  const fingerprint = recipientFingerprint(input.recipient);
  memory.suppression = {
    id: `suppression:email:${fingerprint}:occupancynpv`,
    recipient_fingerprint: fingerprint,
    venture: "OccupancyNPV",
    venture_id: DEFAULT_CANARY_VENTURE_ID,
    channel: "EMAIL",
    reason: "OPT_OUT",
    source_message_id: input.source_message_id,
    timestamp,
    status: "ACTIVE",
    source_role: role,
    valid: true,
    valid_prospect_opt_out: true,
    prospect_id: input.prospect_id ?? APPROVED_CANARY_PROSPECT_ID,
    thread_id: input.thread_id ?? CANONICAL_OCCUPANCYNPV_THREAD_ID,
    contact_identifier: fingerprint,
  };
  return memory.suppression;
}

export function isValidProspectSuppression(record: ClosedLoopSuppressionRecord | null): boolean {
  if (!record || record.status !== "ACTIVE" || record.reason !== "OPT_OUT") return false;
  if (record.source_message_id === FALSE_INFINITY_STOP_MESSAGE_ID) return false;
  if (record.source_role === "SYSTEM" || record.source_role === "INFINITY") return false;
  if (record.valid === false || record.valid_prospect_opt_out === false) return false;
  return true;
}

export function isSendBlockingSuppression(record: ClosedLoopSuppressionRecord | null): boolean {
  if (!record) return false;
  if (record.status === "PROVISIONAL") return true;
  return isValidProspectSuppression(record);
}

export function lookupSuppression(recipient?: string | null): ClosedLoopSuppressionRecord | null {
  if (memory.suppression?.status === "PROVISIONAL") {
    if (recipient && memory.suppression.recipient_fingerprint !== recipientFingerprint(recipient)) return null;
    return memory.suppression;
  }
  if (!isValidProspectSuppression(memory.suppression)) return null;
  if (recipient && memory.suppression && memory.suppression.recipient_fingerprint !== recipientFingerprint(recipient)) return null;
  return memory.suppression;
}

export function applyCanaryObservationToDurableStore(input: {
  observation: ClosedLoopObservationInput;
  recipient?: string | null;
  opt_out?: boolean;
}): ClosedLoopDurableState {
  const observation = input.observation;
  const threadId = observation.thread_id ?? CANONICAL_OCCUPANCYNPV_THREAD_ID;
  const inboundId = observation.provider_message_id;
  const at = observation.last_successful_check ?? new Date().toISOString();
  if (observation.idempotency_key) markProcessedKey(observation.idempotency_key);
  if (observation.reply_found) {
    recordClosedLoopEvent({ family: "INBOUND_REPLY_DETECTED", at, thread_id: threadId, source_message_id: inboundId });
  }
  if (observation.ingested) {
    recordClosedLoopEvent({ family: "INBOUND_REPLY_INGESTED", at, thread_id: threadId, source_message_id: inboundId });
  }
  if (observation.classifier_executed && observation.classification) {
    recordClosedLoopEvent({ family: "INBOUND_REPLY_CLASSIFIED", at, thread_id: threadId, source_message_id: inboundId });
    if (/POSITIVE_INTEREST/i.test(observation.classification)) {
      recordClosedLoopEvent({ family: "POSITIVE_INTEREST", at, thread_id: threadId, source_message_id: inboundId });
    }
  }
  if (observation.queue_record || observation.send_accepted) {
    recordClosedLoopEvent({ family: "RESPONSE_QUEUED", at, thread_id: threadId, source_message_id: inboundId });
  }
  if (observation.send_accepted) {
    recordClosedLoopEvent({
      family: "RESPONSE_SENT",
      at: observation.sent_at ?? at,
      thread_id: threadId,
      source_message_id: observation.reply_provider_message_id,
    });
    recordClosedLoopEvent({
      family: "RESPONSE_DELIVERED",
      at: observation.sent_at ?? at,
      thread_id: threadId,
      source_message_id: observation.reply_provider_message_id,
    });
    markSentKey(`canary-reply-send:${threadId}`);
    markReplyJobCompleted(`canary-reply-send:${threadId}`);
    ensurePendingFollowUp(threadId);
  }
  if (input.opt_out || (/UNSUBSCRIBE|OPT_OUT/i.test(observation.classification ?? "") && observation.next_action === "SUPPRESS")) {
    recordClosedLoopEvent({ family: "OPT_OUT_DETECTED", at, thread_id: threadId, source_message_id: inboundId });
    recordClosedLoopEvent({ family: "OPT_OUT_CLASSIFIED", at, thread_id: threadId, source_message_id: inboundId });
    if (input.recipient && inboundId) {
      persistSuppressionRecord({
        recipient: input.recipient,
        source_message_id: inboundId,
        at,
        source_role: "PROSPECT",
        thread_id: threadId,
        prospect_id: APPROVED_CANARY_PROSPECT_ID,
      });
      recordClosedLoopEvent({ family: "SUPPRESSION_PERSISTED", at, thread_id: threadId, source_message_id: inboundId });
    }
    cancelEligibleFollowups();
  }
  const validOptOut = Boolean(
    input.opt_out || (/UNSUBSCRIBE|OPT_OUT/i.test(observation.classification ?? "") && observation.next_action === "SUPPRESS"),
  );
  const currentState = memory.conversation?.conversation_state;
  const informedSalesState = /ACTIVE|QUALIFIED|HIGH_INTENT|ENGAGED/i.test(currentState ?? "")
    || /REQUEST_EXAMPLE|RENEW_VS|TRY_WITH_NUMBERS|REQUEST_INPUTS|POSITIVE_INTEREST|REQUEST_NUMBERS/i.test(memory.conversation?.intent ?? "")
    || /REQUEST_NUMBERS|INVITE_TRIAL|INVITE_DEMO|BUILD_SCENARIO/i.test(memory.conversation?.next_action ?? "");
  const preservedActive = informedSalesState ? (currentState && currentState !== "OPEN" && currentState !== "RESPONDED" ? currentState : "ACTIVE_CONVERSATION") : (/ACTIVE|ENGAGED|QUALIFIED|HIGH_INTENT/i.test(currentState ?? "") ? currentState! : null);
  const proposedState = validOptOut
    ? "OPT_OUT"
    : preservedActive
      ?? (observation.send_accepted || observation.reply_provider_message_id ? "RESPONDED" : currentState && currentState !== "OPT_OUT" ? currentState : "OPEN");
  const incomingSpecialized = /REQUEST_NUMBERS|INVITE_TRIAL|INVITE_FREE_TRIAL|INVITE_DEMO|BUILD_SCENARIO|SHOW_PROOF|HANDLE_OBJECTION|RESPOND_TO_RENEW|SHOW_REAL_EXAMPLE|START_TRIAL|ACTIVE_EVALUATION|REQUEST_INPUTS/i.test(observation.next_action ?? "");
  const specializedNext = /REQUEST_NUMBERS|INVITE_TRIAL|INVITE_FREE_TRIAL|INVITE_DEMO|BUILD_SCENARIO|SHOW_PROOF|HANDLE_OBJECTION/i.test(memory.conversation?.next_action ?? "");
  const specializedIntent = /TRY_WITH_NUMBERS|REQUEST_INPUTS|RENEW_VS|REQUEST_EXAMPLE|POSITIVE_INTEREST|ACTIVE_EVALUATION/i.test(memory.conversation?.intent ?? "");
  const ownershipSource = validOptOut
    ? "OPT_OUT" as const
    : incomingSpecialized || /TRY_WITH_NUMBERS/i.test(observation.classification ?? "")
      ? "COMMUNICATION_RUNTIME" as const
      : "GENERIC_TICK" as const;
  const ownership = evaluateConversationStateOwnershipGate({
    incoming_source: ownershipSource,
    incoming_state: proposedState,
    current_state: currentState ?? null,
    incoming_next_action: validOptOut ? "SUPPRESS" : observation.next_action,
    current_next_action: memory.conversation?.next_action ?? null,
    incoming_intent: observation.classification,
    current_intent: memory.conversation?.intent ?? null,
  });
  upsertSalesConversation({
    thread_id: threadId,
    last_inbound_message_id: inboundId,
    reply_classification: observation.classification,
    last_outbound_response_id: observation.reply_provider_message_id,
    next_action: validOptOut
      ? "SUPPRESS"
      : incomingSpecialized
        ? observation.next_action
        : specializedNext
          ? memory.conversation?.next_action
          : observation.next_action,
    conversation_state: ownership.result === "FAIL" && !validOptOut
      ? (currentState ?? proposedState)
      : proposedState,
    pipeline_state: observation.pipeline_state,
    latest_valid_prospect_message_id: inboundId === "1a0b2000b6fda6c0"
      ? inboundId
      : memory.conversation?.latest_valid_prospect_message_id,
    intent: /TRY_WITH_NUMBERS/i.test(observation.classification ?? "")
      ? "TRY_WITH_NUMBERS"
      : /RENEW_VS/i.test(observation.classification ?? "")
        ? "RENEW_VS_RELOCATE"
      : /REQUEST_EXAMPLE/i.test(observation.classification ?? "")
      ? "REQUEST_EXAMPLE"
      : specializedIntent
        ? memory.conversation?.intent
        : memory.conversation?.intent,
    engagement: memory.conversation?.engagement ?? (/REQUEST_EXAMPLE|TRY_WITH_NUMBERS|POSITIVE_INTEREST/i.test(observation.classification ?? "") ? "POSITIVE_INTEREST" : null),
    at,
  });
  return memory;
}

export function founderDailyOutboundEventTitles(state: ClosedLoopDurableState = memory): string[] {
  const titles: string[] = [];
  const families = new Set(state.events.map((row) => row.family));
  if (families.has("RESPONSE_DELIVERED") || families.has("RESPONSE_SENT")) titles.push("OccupancyNPV Outbound Delivered");
  if (families.has("INBOUND_REPLY_DETECTED")) titles.push("Inbound Reply Detected");
  if (families.has("POSITIVE_INTEREST")) titles.push("Positive Interest Classified");
  if (families.has("RESPONSE_SENT")) titles.push("Response Sent");
  if (families.has("RESPONSE_DELIVERED")) titles.push("Response Delivered");
  if (families.has("OPT_OUT_CLASSIFIED") && !families.has("FALSE_OPT_OUT_INVALIDATED")) {
    titles.push("OccupancyNPV Opt-Out Classified");
  }
  if (families.has("EMPTY_OUTBOUND_DEFECT") || families.has("FALSE_OPT_OUT_INVALIDATED")) {
    titles.push("Outbound Semantic Defect Detected");
  }
  if (families.has("FALSE_OPT_OUT_INVALIDATED")) titles.push("False Opt-Out Invalidated");
  if (families.has("CONVERSATION_STATE_REPAIRED")) titles.push("Conversation State Repaired");
  if (families.has("SECOND_TURN_MISSED") && !families.has("SECOND_TURN_ANSWERED")) titles.push("Semantic Canary Pending");
  if (families.has("POSITIVE_INTEREST") || families.has("SECOND_TURN_ANSWERED")) titles.push("Positive Reply");
  if (families.has("CONVERSATION_STATE_REPAIRED")) titles.push("Follow-Up Due");
  return titles;
}

export function invalidateFalseInfinityOptOut(input: {
  expected_source_message_id?: string;
  at?: string;
}): { found: boolean; invalidated: boolean; record: ClosedLoopSuppressionRecord | null } {
  const at = input.at ?? new Date().toISOString();
  const current = memory.suppression;
  if (!current) return { found: false, invalidated: false, record: null };
  const source = current.source_message_id;
  const expected = input.expected_source_message_id ?? "1a0b254b39f5c645";
  if (current.status === "INVALIDATED" && (current.correction?.reason === "SYSTEM_AUTHORED_FALSE_STOP" || source === expected)) {
    if (!memory.events.some((row) => row.family === "FALSE_OPT_OUT_INVALIDATED")) {
      recordClosedLoopEvent({ family: "FALSE_OPT_OUT_INVALIDATED", at, thread_id: CANONICAL_OCCUPANCYNPV_THREAD_ID, source_message_id: source });
      recordClosedLoopEvent({ family: "MESSAGE_ROLE_CORRECTED", at, thread_id: CANONICAL_OCCUPANCYNPV_THREAD_ID, source_message_id: source });
      recordClosedLoopEvent({ family: "EMPTY_OUTBOUND_DEFECT", at, thread_id: CANONICAL_OCCUPANCYNPV_THREAD_ID, source_message_id: "1a0b23d641859457" });
      recordClosedLoopEvent({ family: "SECOND_TURN_MISSED", at, thread_id: CANONICAL_OCCUPANCYNPV_THREAD_ID, source_message_id: "1a0b2000b6fda6c0" });
    }
    return { found: true, invalidated: true, record: current };
  }
  if (source !== expected && current.status === "ACTIVE") {
    return { found: true, invalidated: false, record: current };
  }
  memory.suppression = {
    ...current,
    status: "INVALIDATED",
    source_role: "SYSTEM",
    valid: false,
    valid_prospect_opt_out: false,
    correction: {
      reason: "SYSTEM_AUTHORED_FALSE_STOP",
      source_role: "SYSTEM",
      corrected_at: at,
      corrected_state: "INVALIDATED",
      original_status: "ACTIVE",
    },
  };
  recordClosedLoopEvent({ family: "FALSE_OPT_OUT_INVALIDATED", at, thread_id: CANONICAL_OCCUPANCYNPV_THREAD_ID, source_message_id: source });
  recordClosedLoopEvent({ family: "MESSAGE_ROLE_CORRECTED", at, thread_id: CANONICAL_OCCUPANCYNPV_THREAD_ID, source_message_id: source });
  recordClosedLoopEvent({ family: "EMPTY_OUTBOUND_DEFECT", at, thread_id: CANONICAL_OCCUPANCYNPV_THREAD_ID, source_message_id: "1a0b23d641859457" });
  recordClosedLoopEvent({ family: "SECOND_TURN_MISSED", at, thread_id: CANONICAL_OCCUPANCYNPV_THREAD_ID, source_message_id: "1a0b2000b6fda6c0" });
  return { found: true, invalidated: true, record: memory.suppression };
}

export function repairOccupancynpvConversation(input: { at?: string } = {}) {
  const at = input.at ?? new Date().toISOString();
  const before = memory.conversation?.conversation_state ?? "UNKNOWN";
  upsertSalesConversation({
    thread_id: CANONICAL_OCCUPANCYNPV_THREAD_ID,
    last_inbound_message_id: "1a0b2000b6fda6c0",
    reply_classification: "REQUEST_EXAMPLE",
    next_action: "RESPOND_TO_SECOND_TURN_QUESTION",
    conversation_state: "ACTIVE",
    pipeline_state: "DELIVERED",
    latest_valid_prospect_message_id: "1a0b2000b6fda6c0",
    intent: "REQUEST_EXAMPLE",
    engagement: "POSITIVE_INTEREST",
    at,
  });
  recordClosedLoopEvent({ family: "CONVERSATION_STATE_REPAIRED", at, thread_id: CANONICAL_OCCUPANCYNPV_THREAD_ID, source_message_id: "1a0b2000b6fda6c0" });
  return { before, after: memory.conversation };
}

export function authorizeSingleSemanticReply(input: { inbound_message_id: string; thread_id?: string }) {
  memory.semantic_reply_authorization = {
    thread_id: input.thread_id ?? CANONICAL_OCCUPANCYNPV_THREAD_ID,
    inbound_message_id: input.inbound_message_id,
    used: false,
    consumed_at: null,
  };
  return memory.semantic_reply_authorization;
}

export function consumeSemanticReplyAuthorization(inbound_message_id: string, at = new Date().toISOString()): boolean {
  const auth = memory.semantic_reply_authorization;
  if (!auth || auth.used || auth.inbound_message_id !== inbound_message_id) return false;
  memory.semantic_reply_authorization = { ...auth, used: true, consumed_at: at };
  return true;
}

export function semanticReplyAuthorized(inbound_message_id: string): boolean {
  const auth = memory.semantic_reply_authorization;
  return Boolean(auth && !auth.used && auth.inbound_message_id === inbound_message_id);
}

export function markSecondTurnAnswered(input: { outbound_id: string; at?: string }) {
  const at = input.at ?? new Date().toISOString();
  upsertSalesConversation({
    thread_id: CANONICAL_OCCUPANCYNPV_THREAD_ID,
    last_inbound_message_id: "1a0b2000b6fda6c0",
    reply_classification: "REQUEST_EXAMPLE",
    last_outbound_response_id: input.outbound_id,
    next_action: "WAIT",
    conversation_state: "ACTIVE_CONVERSATION",
    pipeline_state: "DELIVERED",
    latest_valid_prospect_message_id: "1a0b2000b6fda6c0",
    intent: "REQUEST_EXAMPLE",
    engagement: "POSITIVE_INTEREST",
    at,
  });
  markProcessedKey("canary-reply:1a0b2000b6fda6c0");
  markSentKey(`canary-reply-send:${CANONICAL_OCCUPANCYNPV_THREAD_ID}:1a0b2000b6fda6c0`);
  markSentKey("semantic-reply:1a0b2000b6fda6c0");
  return memory.conversation;
}

export function requiredInterestedEventFamiliesPresent(state: ClosedLoopDurableState = memory): boolean {
  const families = new Set(state.events.map((row) => row.family));
  return [
    "INBOUND_REPLY_DETECTED",
    "INBOUND_REPLY_INGESTED",
    "INBOUND_REPLY_CLASSIFIED",
    "POSITIVE_INTEREST",
    "RESPONSE_QUEUED",
    "RESPONSE_SENT",
    "RESPONSE_DELIVERED",
  ].every((family) => families.has(family));
}

void PRODUCTION_OUTBOUND_SCOPE;
