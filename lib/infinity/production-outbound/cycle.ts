import { evaluateAutonomousOutboundExecutionPolicy, rememberSalesIdempotency, salesIdempotencyKey } from "@/lib/infinity/autonomous-sales-execution/policy";
import { APPROVED_CANARY_PROSPECT_ID } from "./canary-contact";
import { resolveOutboundSequence } from "@/lib/infinity/autonomous-sales-execution/engines";
import { ingestSalesReply } from "@/lib/infinity/autonomous-sales-execution/cycle";
import type { SalesProspectCandidate } from "@/lib/infinity/autonomous-sales-execution/types";
import { authorizeOutboundSend, recordOutboundUsage } from "./authorize";
import { rolloverUsage } from "./control";
import { claimOutbox, createOutboxRecord, findOutboxByKey, replaceOutbox, transitionOutbox } from "./outbox";
import type { OutboundProviderAdapter } from "./provider";
import { emptyOutboundMetrics } from "./store";
import type {
  OutboundAuthorizationDecision,
  OutboundOutboxRecord,
  OutboundProviderEvent,
  OutboundSendRequest,
  ProductionOutboundState,
} from "./types";

function requestFromCandidate(input: {
  candidate: SalesProspectCandidate;
  now: string;
  isolated_runtime: boolean;
  provider: OutboundProviderAdapter;
  follow_up?: boolean;
}): OutboundSendRequest {
  const touch = (input.candidate.prior_touches ?? 0) + 1;
  return {
    prospect_id: input.candidate.prospect_id,
    venture_id: input.candidate.venture_id,
    campaign_id: input.candidate.campaign_id,
    channel: "email",
    now: input.now,
    isolated_runtime: input.isolated_runtime,
    suppressed: Boolean(input.candidate.suppressed),
    unsubscribed: Boolean(input.candidate.unsubscribed),
    communication_eligible: !input.candidate.suppressed && !input.candidate.unsubscribed && Boolean(input.candidate.published_email) && !input.candidate.published_email?.endsWith(".invalid"),
    contact_valid: Boolean(input.candidate.published_email) && !input.candidate.published_email?.endsWith(".invalid"),
    timezone: input.candidate.timezone,
    timezone_basis: input.candidate.timezone_basis,
    prior_touches: input.candidate.prior_touches ?? 0,
    follow_up: Boolean(input.follow_up) || touch > 1,
    provider: input.provider.readiness,
    idempotency_key: salesIdempotencyKey({
      prospect_id: input.candidate.prospect_id,
      campaign_id: input.candidate.campaign_id,
      touch,
    }),
  };
}

export function executeProductionOutboundTick(input: {
  state: ProductionOutboundState;
  candidates: SalesProspectCandidate[];
  now?: string;
  isolated_runtime?: boolean;
  provider: OutboundProviderAdapter;
  suppressed_at_send?: Set<string>;
  store?: Set<string>;
  execute_provider?: boolean;
}): {
  state: ProductionOutboundState;
  decisions: OutboundAuthorizationDecision[];
  provider_calls: number;
  sent: number;
} {
  const now = input.now ?? new Date().toISOString();
  const state = input.state;
  state.usage = rolloverUsage(state.usage, now);
  state.last_tick_at = now;
  const decisions: OutboundAuthorizationDecision[] = [];
  const providerCalls = 0;
  const sent = 0;
  const sequence = resolveOutboundSequence();

  if (state.control.kill_switch) {
    state.metrics.kill_switch_events += 1;
  }

  for (const candidate of input.candidates) {
    const request = requestFromCandidate({
      candidate,
      now,
      isolated_runtime: Boolean(input.isolated_runtime),
      provider: input.provider,
    });
    const existing = findOutboxByKey(state.outbox, request.idempotency_key);
    const already = Boolean(
      existing?.status === "SENT"
      || existing?.status === "DELIVERED"
      || existing?.status === "BOUNCED"
      || (existing?.completed && existing.provider_message_id),
    );
    if (already) state.metrics.duplicates_prevented += 1;
    const store = input.store ?? new Set(state.outbox.filter((row) => row.status === "SENT" || row.status === "DELIVERED").map((row) => row.idempotency_key));
    const policy = evaluateAutonomousOutboundExecutionPolicy({
      candidate,
      message: `${sequence[0]?.body ?? "OccupancyNPV occupancy comparison."} If this is not useful, reply STOP and I will not write again.`,
      now,
      daily_sent: state.usage.daily,
      domain_sent: 0,
      recipient_sent: candidate.prior_touches ?? 0,
      provider_healthy: request.provider.healthy,
      store,
    });
    const decision = authorizeOutboundSend({
      request,
      control: state.control,
      usage: state.usage,
      already_sent: already,
    });
    const policyReasons = candidate.prospect_id === APPROVED_CANARY_PROSPECT_ID
      ? policy.reasons.filter((reason) => reason !== "CONTACT_UNKNOWN")
      : policy.reasons;
    if (policyReasons.length && decision.allowed) {
      decision.allowed = false;
      decision.reasons = policyReasons;
    } else if (policyReasons.length) {
      decision.reasons = [...new Set([...decision.reasons, ...policyReasons])];
    }
    decisions.push(decision);
    state.decisions = [...state.decisions, decision].slice(-200);
    if (!decision.allowed) {
      state.metrics.blocked += 1;
      continue;
    }
    state.metrics.authorized += 1;
    let record = existing ?? createOutboxRecord({
      id: `outbox:${request.idempotency_key}`,
      idempotency_key: request.idempotency_key,
      prospect_id: request.prospect_id,
      venture_id: request.venture_id,
      campaign_id: request.campaign_id,
      channel: request.channel,
      now,
    });
    record = { ...record, status: "QUEUED", updated_at: now, completed: false, provider_message_id: already ? record.provider_message_id : null };
    state.outbox = replaceOutbox(state.outbox, record);
    const claimed = claimOutbox(record, now);
    if (!claimed) {
      state.metrics.duplicates_prevented += 1;
      continue;
    }
    record = claimed;
    state.outbox = replaceOutbox(state.outbox, record);
    const suppressedNow = Boolean(
      candidate.suppressed
      || candidate.unsubscribed
      || input.suppressed_at_send?.has(candidate.prospect_id),
    );
    if (suppressedNow) {
      record = transitionOutbox(record, "SUPPRESSED", now);
      state.outbox = replaceOutbox(state.outbox, record);
      state.metrics.blocked += 1;
      continue;
    }
    void rememberSalesIdempotency(request.idempotency_key, store);
  }

  return finalizeTick(state, decisions, providerCalls, sent);
}

async function sendClaimed(input: {
  state: ProductionOutboundState;
  record: OutboundOutboxRecord;
  candidate: SalesProspectCandidate;
  provider: OutboundProviderAdapter;
  now: string;
}): Promise<{ record: OutboundOutboxRecord; accepted: boolean }> {
  const sequence = resolveOutboundSequence();
  const result = await input.provider.send({
    to: input.candidate.published_email ?? "",
    subject: sequence[0]?.subject ?? "OccupancyNPV",
    body: sequence[0]?.body ?? "",
    idempotency_key: input.record.idempotency_key,
  });
  if (!result.accepted) {
    applyOutboundProviderEvent(input.state, {
      id: `fail:${input.record.id}:${input.now}`,
      outbox_id: input.record.id,
      kind: "failed",
      at: input.now,
      fabricated: false,
    });
    input.state.metrics.last_failure_category = result.error ?? "SEND_FAILED";
    return { record: transitionOutbox(input.record, "FAILED", input.now), accepted: false };
  }
  input.state.metrics.provider_accepts += 1;
  input.state.metrics.sent += 1;
  input.state.metrics.last_failure_category = null;
  applyOutboundProviderEvent(input.state, {
    id: `accepted:${input.record.id}`,
    outbox_id: input.record.id,
    kind: "accepted",
    at: input.now,
    fabricated: false,
  });
  applyOutboundProviderEvent(input.state, {
    id: `sent:${input.record.id}`,
    outbox_id: input.record.id,
    kind: "sent",
    at: input.now,
    fabricated: false,
  });
  input.state.usage = recordOutboundUsage(input.state.usage, {
    prospect_id: input.candidate.prospect_id,
    venture_id: input.candidate.venture_id,
    campaign_id: input.candidate.campaign_id,
    channel: "email",
    now: input.now,
    isolated_runtime: true,
    suppressed: false,
    unsubscribed: false,
    communication_eligible: true,
    contact_valid: true,
    timezone: input.candidate.timezone,
    timezone_basis: input.candidate.timezone_basis,
    prior_touches: input.candidate.prior_touches ?? 0,
    follow_up: false,
    provider: input.provider.readiness,
    idempotency_key: input.record.idempotency_key,
  });
  return {
    record: transitionOutbox(input.record, "SENT", input.now, result.provider_message_id),
    accepted: true,
  };
}

function finalizeTick(
  state: ProductionOutboundState,
  decisions: OutboundAuthorizationDecision[],
  providerCalls: number,
  sent: number,
) {
  return { state, decisions, provider_calls: providerCalls, sent };
}

export async function executeProductionOutboundTickAsync(input: {
  state: ProductionOutboundState;
  candidates: SalesProspectCandidate[];
  now?: string;
  isolated_runtime?: boolean;
  provider: OutboundProviderAdapter;
  suppressed_at_send?: Set<string>;
  store?: Set<string>;
  execute_provider?: boolean;
}): Promise<{
  state: ProductionOutboundState;
  decisions: OutboundAuthorizationDecision[];
  provider_calls: number;
  sent: number;
}> {
  const now = input.now ?? new Date().toISOString();
  const planned = executeProductionOutboundTick({ ...input, now, execute_provider: false });
  let providerCalls = 0;
  let sent = 0;
  for (const candidate of input.candidates) {
    const key = salesIdempotencyKey({
      prospect_id: candidate.prospect_id,
      campaign_id: candidate.campaign_id,
      touch: (candidate.prior_touches ?? 0) + 1,
    });
    const current = findOutboxByKey(planned.state.outbox, key);
    if (!current || current.status !== "CLAIMED") continue;
    const suppressedNow = Boolean(
      candidate.suppressed
      || candidate.unsubscribed
      || input.suppressed_at_send?.has(candidate.prospect_id),
    );
    if (suppressedNow) {
      planned.state.outbox = replaceOutbox(planned.state.outbox, transitionOutbox(current, "SUPPRESSED", now));
      planned.state.metrics.blocked += 1;
      continue;
    }
    if (input.execute_provider === false) continue;
    providerCalls += 1;
    const result = await sendClaimed({
      state: planned.state,
      record: current,
      candidate,
      provider: input.provider,
      now,
    });
    planned.state.outbox = replaceOutbox(planned.state.outbox, result.record);
    if (result.accepted) sent += 1;
  }
  return { ...planned, provider_calls: providerCalls, sent };
}

export function applyOutboundProviderEvent(state: ProductionOutboundState, event: OutboundProviderEvent): ProductionOutboundState {
  state.events = [...state.events, event].slice(-400);
  const record = state.outbox.find((row) => row.id === event.outbox_id);
  if (!record) return state;
  if (event.kind === "delivered") {
    state.outbox = replaceOutbox(state.outbox, transitionOutbox(record, "DELIVERED", event.at));
    state.metrics.delivered += 1;
  } else if (event.kind === "bounced") {
    state.outbox = replaceOutbox(state.outbox, transitionOutbox(record, "BOUNCED", event.at));
    state.metrics.bounced += 1;
  } else if (event.kind === "failed" || event.kind === "rejected") {
    state.outbox = replaceOutbox(state.outbox, transitionOutbox(record, event.kind === "failed" ? "FAILED" : "REJECTED", event.at));
  } else if (event.kind === "opt_out") {
    state.outbox = replaceOutbox(state.outbox, transitionOutbox(record, "CANCELLED", event.at));
    state.metrics.opt_outs += 1;
  } else if (event.kind === "replied") {
    state.metrics.replies += 1;
  } else if (event.kind === "accepted" || event.kind === "sent") {
    state.outbox = replaceOutbox(state.outbox, transitionOutbox(record, "SENT", event.at));
  }
  return state;
}

export function ingestOutboundReply(input: {
  state: ProductionOutboundState;
  message_id: string;
  thread_id: string;
  prospect_id: string;
  venture_id: string;
  campaign_id: string;
  at: string;
  text: string;
}) {
  const reply = ingestSalesReply({
    message_id: input.message_id,
    thread_id: input.thread_id,
    prospect_id: input.prospect_id,
    venture_id: input.venture_id,
    campaign_id: input.campaign_id,
    at: input.at,
    text: input.text,
  });
  input.state.metrics.replies += 1;
  if (reply.classification === "POSITIVE_INTEREST" || reply.classification === "DEMO_REQUEST") {
    input.state.metrics.positive_replies += 1;
    input.state.metrics.meetings += reply.classification === "DEMO_REQUEST" ? 1 : 0;
  }
  if (reply.classification === "NOT_INTERESTED" || reply.classification === "UNSUBSCRIBE") {
    input.state.metrics.negative_replies += 1;
  }
  if (reply.classification === "UNSUBSCRIBE" || reply.classification === "SPAM_COMPLAINT") {
    input.state.metrics.opt_outs += 1;
    for (const row of input.state.outbox) {
      if (row.prospect_id === input.prospect_id && !row.completed) {
        input.state.outbox = replaceOutbox(input.state.outbox, transitionOutbox(row, "CANCELLED", input.at));
      }
    }
  }
  applyOutboundProviderEvent(input.state, {
    id: `reply:${input.message_id}`,
    outbox_id: input.state.outbox.find((row) => row.prospect_id === input.prospect_id)?.id ?? "",
    kind: reply.classification === "UNSUBSCRIBE" ? "opt_out" : "replied",
    at: input.at,
    fabricated: false,
  });
  return reply;
}

export function resetOutboundMetrics(state: ProductionOutboundState): ProductionOutboundState {
  state.metrics = emptyOutboundMetrics();
  return state;
}
