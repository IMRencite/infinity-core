import type { NamedOutboundLoopGate } from "./closed-loop";
import type { OutboundScheduledJob } from "./communication-runtime";
import { classifyMessageRole, type SenderRole } from "./conversation-semantics";
import { stripQuotedReply } from "./gmail-message-body";
import type { GmailThreadMessage } from "@/lib/infinity/inbound-communication-runtime/gmail-inbound-read";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export const ACTIONABLE_INBOUND_LIFECYCLE = [
  "UNSEEN",
  "OBSERVED",
  "CLASSIFIED",
  "WAITING_PACING",
  "READY",
  "RUNNING",
  "SENT",
  "BLOCKED",
  "SUPPRESSED",
  "FAILED",
] as const;
export type ActionableInboundLifecycle = (typeof ACTIONABLE_INBOUND_LIFECYCLE)[number];

export const COMMUNICATION_SLA_TOLERANCE_MS = 12 * 60 * 1000;

export function messageTimestamp(message: { date?: string | null; id: string }): number {
  const parsed = message.date ? Date.parse(message.date) : Number.NaN;
  if (!Number.isNaN(parsed)) return parsed;
  return 0;
}

export function selectLatestActionableProspectInbound(input: {
  messages: GmailThreadMessage[];
  infinity_identity: string;
  prospect_identity: string;
  known_infinity_ids?: string[];
}): (GmailThreadMessage & { role: SenderRole; direction: "INBOUND" | "OUTBOUND"; visible: string }) | null {
  const ranked = input.messages
    .map((message) => {
      const visible = stripQuotedReply(message.bodyText || message.snippet || "");
      const role = classifyMessageRole({
        message_id: message.id,
        from: message.from,
        to: message.to,
        body: visible,
        snippet: "",
        infinity_identity: input.infinity_identity,
        prospect_identity: input.prospect_identity,
        known_infinity_ids: input.known_infinity_ids,
      });
      return { ...message, ...role, visible, ts: messageTimestamp(message) };
    })
    .sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
  const prospects = ranked.filter((row) => row.role === "PROSPECT" && row.direction === "INBOUND");
  for (let index = prospects.length - 1; index >= 0; index -= 1) {
    const prospect = prospects[index]!;
    const laterInfinity = ranked.some((row) => row.ts > prospect.ts && row.role === "INFINITY" && row.direction === "OUTBOUND");
    if (!laterInfinity) return prospect;
  }
  return prospects.at(-1) ?? null;
}

export function evaluateGmailLatestMessageSelectionGate(input: {
  selected_id: string | null;
  actual_newest_prospect_id: string | null;
}): NamedOutboundLoopGate {
  if (!input.actual_newest_prospect_id) return named("GmailLatestMessageSelectionGate", "NOT_PROVEN", ["NO_PROSPECT_INBOUND"]);
  return named(
    "GmailLatestMessageSelectionGate",
    input.selected_id === input.actual_newest_prospect_id ? "PASS" : "FAIL",
    input.selected_id === input.actual_newest_prospect_id ? ["NEWEST_PROSPECT_SELECTED"] : ["STALE_OR_MISCLASSIFIED_SELECTION"],
  );
}

export function evaluateInboundMessageIdempotencyGate(input: {
  processed_key: string;
  message_id: string;
  thread_level_key_blocked_new_message: boolean;
}): NamedOutboundLoopGate {
  const messageSpecific = input.processed_key.includes(input.message_id);
  const reasons: string[] = [];
  if (!messageSpecific) reasons.push("KEY_NOT_MESSAGE_SPECIFIC");
  if (input.thread_level_key_blocked_new_message) reasons.push("THREAD_KEY_FALSE_POSITIVE");
  return named("InboundMessageIdempotencyGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["MESSAGE_ID_DEDUPE"]);
}

export function evaluateActionableInboundSLAGate(input: {
  now: string;
  eligible_at: string | null;
  state: string | null;
}): NamedOutboundLoopGate {
  if (!input.eligible_at || !input.state) return named("ActionableInboundSLAGate", "NOT_PROVEN", ["NO_JOB"]);
  if (/SENT|BLOCKED|SUPPRESSED/i.test(input.state)) return named("ActionableInboundSLAGate", "PASS", ["TERMINAL"]);
  const overdue = Date.parse(input.now) > Date.parse(input.eligible_at) + COMMUNICATION_SLA_TOLERANCE_MS;
  return named("ActionableInboundSLAGate", overdue ? "FAIL" : "PASS", overdue ? ["SLA_BREACHED"] : ["WITHIN_SLA"]);
}

export function evaluateBusinessLoopHealthGate(input: {
  scheduler_healthy: boolean;
  actionable_overdue: boolean;
}): NamedOutboundLoopGate {
  if (input.actionable_overdue) {
    return named("BusinessLoopHealthGate", "FAIL", input.scheduler_healthy ? ["SCHEDULER_HEALTHY_BUSINESS_DEGRADED"] : ["BUSINESS_AND_SCHEDULER_DEGRADED"]);
  }
  return named("BusinessLoopHealthGate", "PASS", ["BUSINESS_LOOP_CURRENT"]);
}

export function evaluateStuckActionableInboundGate(input: {
  valid_actionable: boolean;
  terminal: boolean;
  overdue: boolean;
}): NamedOutboundLoopGate {
  if (input.valid_actionable && !input.terminal && input.overdue) {
    return named("StuckActionableInboundGate", "FAIL", ["ACTIONABLE_INBOUND_STRANDED"]);
  }
  return named("StuckActionableInboundGate", "PASS", ["NO_STUCK_ACTIONABLE_INBOUND"]);
}

export function evaluateEligibleJobClaimGate(input: {
  job: OutboundScheduledJob | null;
  now: string;
  claimed: boolean;
  later_infinity_reply: boolean;
}): NamedOutboundLoopGate {
  if (!input.job) return named("EligibleJobClaimGate", "NOT_PROVEN", ["JOB_MISSING"]);
  if (input.later_infinity_reply) return named("EligibleJobClaimGate", "PASS", ["SUPERSEDED_BY_LATER_REPLY"]);
  const due = Date.parse(input.job.eligible_at) <= Date.parse(input.now);
  if (due && /READY|WAITING_PACING|WAITING/i.test(input.job.state) && !input.claimed) {
    return named("EligibleJobClaimGate", "FAIL", ["ELIGIBLE_JOB_NOT_CLAIMED"]);
  }
  return named("EligibleJobClaimGate", "PASS", ["CLAIM_PATH_OK"]);
}

export function laterInfinityReplyExists(input: {
  messages: GmailThreadMessage[];
  inbound_id: string;
  infinity_identity: string;
  prospect_identity: string;
  known_infinity_ids?: string[];
}): boolean {
  const inbound = input.messages.find((row) => row.id === input.inbound_id);
  if (!inbound) return false;
  const inboundTs = messageTimestamp(inbound);
  return input.messages.some((message) => {
    if (messageTimestamp(message) <= inboundTs) return false;
    const role = classifyMessageRole({
      message_id: message.id,
      from: message.from,
      to: message.to,
      body: stripQuotedReply(message.bodyText || message.snippet || ""),
      snippet: "",
      infinity_identity: input.infinity_identity,
      prospect_identity: input.prospect_identity,
      known_infinity_ids: input.known_infinity_ids,
    });
    return role.role === "INFINITY" && role.direction === "OUTBOUND";
  });
}

export function evaluateCommunicationRuntimeAlwaysOnDuringIncident(input: {
  stuck_actionable_inbound: boolean;
  reconciliation_live?: boolean;
  e2e_pass?: boolean;
  clean_turns?: number;
}): NamedOutboundLoopGate {
  if (input.stuck_actionable_inbound) {
    return named("CommunicationRuntimeAlwaysOnGate", "FAIL", ["ACTIONABLE_INBOUND_STRANDED_WHILE_SCHEDULER_HEALTHY"]);
  }
  if ((input.clean_turns ?? 0) < 3) {
    return named("CommunicationRuntimeAlwaysOnGate", "FAIL", ["RELIABILITY_NOT_3_OF_3"]);
  }
  if (input.reconciliation_live && input.e2e_pass) {
    return named("CommunicationRuntimeAlwaysOnGate", "PASS", ["RELIABILITY_3_OF_3"]);
  }
  return named("CommunicationRuntimeAlwaysOnGate", "NOT_PROVEN", ["INCIDENT_NOT_RECOVERED"]);
}
