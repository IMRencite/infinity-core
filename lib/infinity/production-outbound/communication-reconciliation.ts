import type { NamedOutboundLoopGate } from "./closed-loop";
import type { GmailThreadMessage } from "@/lib/infinity/inbound-communication-runtime/gmail-inbound-read";
export type ReconcileScheduledJob = {
  job_id: string;
  conversation_id: string;
  inbound_message_id: string;
  thread_id: string;
  eligible_at: string;
  state: string;
  attempt_count: number;
  idempotency_key: string;
  provider: "GMAIL";
  created_at: string;
  started_at: string | null;
  sent_at: string | null;
  failure_reason: string | null;
  intent?: string | null;
  provider_message_id?: string | null;
};
import { laterInfinityReplyExists, selectLatestActionableProspectInbound } from "./business-loop-health";
import { isValidProspectSuppression, type ClosedLoopSuppressionRecord } from "./closed-loop-durable";
import { isStopOnly, looksLikeInfinityAuthored } from "./conversation-semantics";
import { stripQuotedReply } from "./gmail-message-body";
import { classifyCanonicalSalesIntent, evaluateBlockedConversationRecoveryPolicy } from "./canonical-sales-intent";
import { isCommunicationObligationCutoverThread } from "./obligation/cutover";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export const COMMUNICATION_RECONCILIATION_VERSION = "communication-reconciliation-v1" as const;
export const RECONCILIATION_WINDOW_MESSAGES = 24;

export type CommunicationReconciliationResult = {
  version: typeof COMMUNICATION_RECONCILIATION_VERSION;
  latest_thread_message_id: string | null;
  latest_prospect_message_id: string | null;
  latest_actionable_prospect_message_id: string | null;
  latest_answered_prospect_message_id: string | null;
  unresolved: Array<{ inbound_id: string; received_at: string; job_id: string | null; job_state: string | null }>;
  recoveries: Array<{ inbound_id: string; action: "CREATE_JOB" | "RESUME_JOB" }>;
  LatestActionableProspectMessageGate: NamedOutboundLoopGate;
  InboundWithoutJobGate: NamedOutboundLoopGate;
  InboundCompletionTruthGate: NamedOutboundLoopGate;
  ActionableInboundCompletionGate: NamedOutboundLoopGate;
  ReadyJobDrainGate: NamedOutboundLoopGate;
  EndToEndCommunicationHealthGate: NamedOutboundLoopGate;
};

export function evaluateLatestActionableProspectMessageGate(input: {
  visible_is_prospect: boolean;
  newer_than_last_answered: boolean;
  later_infinity_reply: boolean;
  terminal: boolean;
  opt_out: boolean;
  requires_action: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (!input.visible_is_prospect) reasons.push("NOT_PROSPECT_VISIBLE");
  if (!input.newer_than_last_answered) reasons.push("NOT_NEWER_THAN_ANSWERED");
  if (input.later_infinity_reply) reasons.push("ALREADY_ANSWERED");
  if (input.terminal) reasons.push("TERMINAL");
  if (input.opt_out) reasons.push("OPT_OUT");
  if (!input.requires_action) reasons.push("NO_ACTION_REQUIRED");
  return named("LatestActionableProspectMessageGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["LATEST_UNRESOLVED_PROSPECT"]);
}

export function evaluateInboundWithoutJobGate(input: {
  actionable: boolean;
  terminal_response: boolean;
  durable_job: boolean;
}): NamedOutboundLoopGate {
  if (input.actionable && !input.terminal_response && !input.durable_job) {
    return named("InboundWithoutJobGate", "FAIL", ["ACTIONABLE_INBOUND_HAS_NO_JOB"]);
  }
  return named("InboundWithoutJobGate", "PASS", ["JOB_OR_TERMINAL_PRESENT"]);
}

export function evaluateInboundCompletionTruthGate(input: {
  discovered: boolean;
  provider_reply: boolean;
  valid_suppression: boolean;
}): NamedOutboundLoopGate {
  if (input.discovered && !input.provider_reply && !input.valid_suppression) {
    return named("InboundCompletionTruthGate", "FAIL", ["DISCOVERY_IS_NOT_COMPLETION"]);
  }
  return named("InboundCompletionTruthGate", "PASS", ["COMPLETION_SEPARATE_FROM_DISCOVERY"]);
}

export function evaluateActionableInboundCompletionGate(input: {
  requires_reply: boolean;
  provider_message_id: string | null;
  valid_suppression: boolean;
  explicit_non_response: boolean;
  terminal_block: boolean;
}): NamedOutboundLoopGate {
  if (!input.requires_reply) return named("ActionableInboundCompletionGate", "PASS", ["NO_REPLY_REQUIRED"]);
  if (input.provider_message_id || input.valid_suppression || input.explicit_non_response || input.terminal_block) {
    return named("ActionableInboundCompletionGate", "PASS", ["PROVIDER_OR_TERMINAL"]);
  }
  return named("ActionableInboundCompletionGate", "FAIL", ["NO_PROVIDER_REPLY"]);
}

export function evaluateReadyJobDrainGate(input: {
  ready_jobs: number;
  claimed_or_terminal: number;
}): NamedOutboundLoopGate {
  if (input.ready_jobs > 0 && input.claimed_or_terminal < input.ready_jobs) {
    return named("ReadyJobDrainGate", "FAIL", ["READY_JOBS_NOT_DRAINED"]);
  }
  return named("ReadyJobDrainGate", "PASS", ["READY_DRAINED"]);
}

export function evaluateEndToEndCommunicationHealthGate(input: {
  unresolved_actionable: number;
}): NamedOutboundLoopGate {
  if (input.unresolved_actionable > 0) {
    return named("EndToEndCommunicationHealthGate", "FAIL", ["SILENT_ACTIONABLE_GAP"]);
  }
  return named("EndToEndCommunicationHealthGate", "PASS", ["NO_SILENT_GAPS"]);
}

export function measureCommunicationResponseSlo(input: {
  received_at: string | null;
  observed_at: string | null;
  job_created_at: string | null;
  eligible_at: string | null;
  claimed_at: string | null;
  provider_sent_at: string | null;
}): {
  inbound_detection_ms: number | null;
  queue_ms: number | null;
  pacing_delay_ms: number | null;
  post_eligibility_ms: number | null;
  total_response_ms: number | null;
} {
  const ms = (start: string | null, end: string | null) => {
    if (!start || !end) return null;
    const value = Date.parse(end) - Date.parse(start);
    return Number.isFinite(value) ? value : null;
  };
  return {
    inbound_detection_ms: ms(input.received_at, input.observed_at),
    queue_ms: ms(input.observed_at, input.job_created_at),
    pacing_delay_ms: ms(input.job_created_at, input.eligible_at),
    post_eligibility_ms: ms(input.eligible_at, input.provider_sent_at),
    total_response_ms: ms(input.received_at, input.provider_sent_at),
  };
}

export function evaluateLiveConversationReliabilityGate(input: {
  consecutive_completed_turns: number;
}): NamedOutboundLoopGate {
  if (input.consecutive_completed_turns >= 3) {
    return named("LiveConversationReliabilityGate", "PASS", ["RELIABILITY_3_OF_3"]);
  }
  return named("LiveConversationReliabilityGate", "NOT_PROVEN", [`COMPLETED_TURNS:${input.consecutive_completed_turns}/3`]);
}

export const LIVE_RELIABILITY_TURN_A = {
  label: "TURN A",
  body: "what would you need from me to compare them?",
  message_id: "1a0badea7b22a70f",
  received_at: "Sat, 19 Sep 2026 14:12:27 -0400",
  received_at_iso: "2026-09-19T18:12:27.000Z",
} as const;

function normalizeTurnTarget(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function timestampsMatch(reported: string, target: string): boolean {
  const reportedMs = Date.parse(reported);
  const targetMs = Date.parse(target);
  if (Number.isFinite(reportedMs) && Number.isFinite(targetMs)) return reportedMs === targetMs;
  return normalizeTurnTarget(reported) === normalizeTurnTarget(target);
}

export function evaluateLiveTurnTargetIdentityGate(input: {
  reported_body: string;
  reported_message_id: string;
  reported_received_at: string;
  target_body?: string;
  target_message_id?: string;
  target_received_at?: string;
  provider_reply_id?: string | null;
  provider_in_reply_to?: string | null;
}): NamedOutboundLoopGate {
  const targetBody = input.target_body ?? LIVE_RELIABILITY_TURN_A.body;
  const targetId = input.target_message_id ?? LIVE_RELIABILITY_TURN_A.message_id;
  const targetAt = input.target_received_at ?? LIVE_RELIABILITY_TURN_A.received_at;
  const reasons: string[] = [];
  if (normalizeTurnTarget(input.reported_body) !== normalizeTurnTarget(targetBody)) reasons.push("BODY_MISMATCH");
  if (input.reported_message_id !== targetId) reasons.push("MESSAGE_ID_MISMATCH");
  if (!timestampsMatch(input.reported_received_at, targetAt) && !timestampsMatch(input.reported_received_at, LIVE_RELIABILITY_TURN_A.received_at_iso)) {
    reasons.push("TIMESTAMP_MISMATCH");
  }
  if (input.provider_reply_id && input.provider_in_reply_to && input.provider_in_reply_to !== targetId) {
    reasons.push("PROVIDER_NOT_CAUSALLY_LINKED");
  }
  return named("LiveTurnTargetIdentityGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["TARGET_IDENTITY_MATCH"]);
}

export function evaluateReconciliationSLAGate(input: {
  work_required: boolean;
  resolved: boolean;
  received_at: string | null;
  now: string;
  sla_ms?: number;
  changed_failed_condition: boolean;
}): NamedOutboundLoopGate {
  if (!input.work_required) return named("ReconciliationSLAGate", "PASS", ["NO_WORK_REQUIRED"]);
  if (input.resolved) return named("ReconciliationSLAGate", "PASS", ["RESOLVED"]);
  const sla = input.sla_ms ?? 15 * 60 * 1000;
  const received = input.received_at ? Date.parse(input.received_at) : NaN;
  const overdue = Number.isFinite(received) && Date.parse(input.now) > received + sla;
  if (overdue && !input.changed_failed_condition) {
    return named("ReconciliationSLAGate", "FAIL", ["WORK_REQUIRED_UNCHANGED_PAST_SLA"]);
  }
  return named("ReconciliationSLAGate", overdue ? "FAIL" : "PASS", overdue ? ["WORK_REQUIRED_PAST_SLA"] : ["WITHIN_SLA"]);
}

export function jobIsProviderComplete(job: ReconcileScheduledJob | null | undefined): boolean {
  return Boolean(job?.provider_message_id && /SENT/i.test(job.state));
}

export function jobIsRetryableIncomplete(job: ReconcileScheduledJob | null | undefined): boolean {
  if (!job) return false;
  if (job.provider_message_id) return false;
  return /BLOCKED|FAILED|WAITING|WAITING_PACING|READY|RUNNING|PROCESSING/i.test(job.state);
}

export function reconcileActionableInboundWork(input: {
  messages: GmailThreadMessage[];
  jobs: ReconcileScheduledJob[];
  infinity_identity: string;
  prospect_identity: string;
  suppression: ClosedLoopSuppressionRecord | null;
  now: string;
  thread_id: string;
  conversation_id: string;
}): {
  jobs: ReconcileScheduledJob[];
  result: CommunicationReconciliationResult;
} {
  const windowed = input.messages.slice(-RECONCILIATION_WINDOW_MESSAGES);
  const knownInfinityIds = input.jobs.map((job) => job.provider_message_id).filter((id): id is string => Boolean(id));
  const selected = selectLatestActionableProspectInbound({
    messages: windowed,
    infinity_identity: input.infinity_identity,
    prospect_identity: input.prospect_identity,
    known_infinity_ids: knownInfinityIds,
  });
  const rankedProspects = windowed
    .map((message) => ({
      id: message.id,
      date: message.date,
      selected: selected?.id === message.id,
    }));
  const laterReply = selected
    ? laterInfinityReplyExists({
      messages: windowed,
      inbound_id: selected.id,
      infinity_identity: input.infinity_identity,
      prospect_identity: input.prospect_identity,
      known_infinity_ids: knownInfinityIds,
    })
    : false;
  const validSuppression = isValidProspectSuppression(input.suppression);
  const optOut = Boolean(selected && isStopOnly(selected.visible));
  const existing = selected ? input.jobs.find((job) => job.inbound_message_id === selected.id) ?? null : null;
  const providerComplete = jobIsProviderComplete(existing) || laterReply;
  const requiresAction = Boolean(selected && !laterReply && !optOut && !validSuppression && !providerComplete);
  const latestAnswered = [...windowed].reverse().find((message) => {
    const after = laterInfinityReplyExists({
      messages: windowed,
      inbound_id: message.id,
      infinity_identity: input.infinity_identity,
      prospect_identity: input.prospect_identity,
      known_infinity_ids: knownInfinityIds,
    });
    return after;
  })?.id ?? null;
  const jobs = [...input.jobs].map((job) => {
    if (job.provider_message_id || /SENT|SUPPRESSED|CANCELLED/i.test(job.state)) return job;
    const inbound = windowed.find((message) => message.id === job.inbound_message_id);
    const visible = stripQuotedReply(inbound?.bodyText || inbound?.snippet || "");
    if (knownInfinityIds.includes(job.inbound_message_id) || looksLikeInfinityAuthored(visible)) {
      return { ...job, state: "CANCELLED", failure_reason: "SELF_OUTBOUND_NOT_INBOUND" };
    }
    return job;
  });
  const recoveries: CommunicationReconciliationResult["recoveries"] = [];
  if (requiresAction && selected && isCommunicationObligationCutoverThread(input.thread_id)) {
    // Cutover thread: anti-entropy only. Do not classify, compose, send, or BLOCKED.
  } else if (requiresAction && selected) {
    if (!existing) {
      jobs.push({
        job_id: `job:${input.thread_id}:${selected.id}`,
        conversation_id: input.conversation_id,
        inbound_message_id: selected.id,
        thread_id: input.thread_id,
        eligible_at: input.now,
        state: "READY",
        attempt_count: 0,
        idempotency_key: `communication-job-send:${input.thread_id}:${selected.id}`,
        provider: "GMAIL",
        created_at: input.now,
        started_at: null,
        sent_at: null,
        failure_reason: null,
        intent: classifyCanonicalSalesIntent({ visible_body: selected.visible }).intent,
      });
      recoveries.push({ inbound_id: selected.id, action: "CREATE_JOB" });
    } else if (jobIsRetryableIncomplete(existing)) {
      const index = jobs.findIndex((job) => job.job_id === existing.job_id);
      if (index >= 0) {
        const intent = classifyCanonicalSalesIntent({ visible_body: selected.visible }).intent;
        const blocked = /BLOCKED|FAILED/i.test(existing.state);
        const remapped = Boolean(existing.intent && existing.intent !== intent);
        if (!blocked && /WAITING|READY|RUNNING|PROCESSING/i.test(existing.state)) {
          if (remapped) {
            jobs[index] = { ...existing, intent };
            recoveries.push({ inbound_id: selected.id, action: "RESUME_JOB" });
          }
        } else {
          const policy = evaluateBlockedConversationRecoveryPolicy({
            failure_reason: existing.failure_reason,
            recompose_attempts: existing.intent === "UNKNOWN" ? 0 : existing.attempt_count,
            never_attempted: existing.attempt_count === 0 && !existing.started_at,
            remapped_intent: remapped || existing.intent === "UNKNOWN" || existing.intent === "QUESTION",
            same_failed_composition: !remapped && existing.failure_reason === "ESCALATE_VISIBLE" && existing.attempt_count > 0,
          });
          jobs[index] = {
            ...existing,
            state: policy.action === "ESCALATE_VISIBLE" ? "BLOCKED" : Date.parse(existing.eligible_at) <= Date.parse(input.now) ? "READY" : "WAITING_PACING",
            failure_reason: policy.action === "ESCALATE_VISIBLE" ? "ESCALATE_VISIBLE" : null,
            intent,
            attempt_count: remapped || existing.intent === "UNKNOWN" || existing.intent === "QUESTION" ? 0 : existing.attempt_count,
          };
          recoveries.push({ inbound_id: selected.id, action: "RESUME_JOB" });
        }
      }
    }
  }
  const unresolved = selected && requiresAction
    ? [{
      inbound_id: selected.id,
      received_at: selected.date ? new Date(selected.date).toISOString() : input.now,
      job_id: existing?.job_id ?? jobs.find((job) => job.inbound_message_id === selected.id)?.job_id ?? null,
      job_state: jobs.find((job) => job.inbound_message_id === selected.id)?.state ?? existing?.state ?? null,
    }]
    : [];
  const ready = jobs.filter((job) => job.state === "READY");
  const result: CommunicationReconciliationResult = {
    version: COMMUNICATION_RECONCILIATION_VERSION,
    latest_thread_message_id: windowed.at(-1)?.id ?? null,
    latest_prospect_message_id: selected?.id ?? rankedProspects.at(-1)?.id ?? null,
    latest_actionable_prospect_message_id: selected?.id ?? null,
    latest_answered_prospect_message_id: latestAnswered,
    unresolved,
    recoveries,
    LatestActionableProspectMessageGate: evaluateLatestActionableProspectMessageGate({
      visible_is_prospect: selected?.role === "PROSPECT",
      newer_than_last_answered: Boolean(selected && (!latestAnswered || selected.id !== latestAnswered)),
      later_infinity_reply: laterReply,
      terminal: optOut || validSuppression,
      opt_out: optOut,
      requires_action: requiresAction,
    }),
    InboundWithoutJobGate: evaluateInboundWithoutJobGate({
      actionable: Boolean(selected && !laterReply && !optOut && !validSuppression),
      terminal_response: providerComplete,
      durable_job: Boolean(jobs.find((job) => job.inbound_message_id === selected?.id)),
    }),
    InboundCompletionTruthGate: evaluateInboundCompletionTruthGate({
      discovered: Boolean(selected),
      provider_reply: providerComplete,
      valid_suppression: validSuppression,
    }),
    ActionableInboundCompletionGate: evaluateActionableInboundCompletionGate({
      requires_reply: requiresAction || Boolean(selected && !laterReply && !optOut),
      provider_message_id: existing?.provider_message_id ?? null,
      valid_suppression: validSuppression,
      explicit_non_response: false,
      terminal_block: false,
    }),
    ReadyJobDrainGate: evaluateReadyJobDrainGate({
      ready_jobs: ready.length,
      claimed_or_terminal: ready.filter((job) => /SENT|RUNNING|PROCESSING|SUPPRESSED/.test(job.state)).length,
    }),
    EndToEndCommunicationHealthGate: evaluateEndToEndCommunicationHealthGate({
      unresolved_actionable: unresolved.length,
    }),
  };
  return { jobs, result };
}
