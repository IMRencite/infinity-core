import type { NamedOutboundLoopGate } from "../closed-loop";
import {
  COMMUNICATION_TERMINAL_STATES,
  type CommunicationObligation,
  type CommunicationObligationState,
  type CommunicationTransitionLog,
} from "./types";

const LEGAL: Record<CommunicationObligationState | "NONE", CommunicationObligationState[]> = {
  NONE: ["RECEIVED"],
  RECEIVED: ["SCHEDULED", "SUPPRESSED", "NO_REPLY_POLICY", "COVERED", "ESCALATED"],
  SCHEDULED: ["CLAIMED", "SUPPRESSED", "NO_REPLY_POLICY", "COVERED", "ESCALATED"],
  CLAIMED: ["SENT", "SCHEDULED", "ESCALATED", "SUPPRESSED", "NO_REPLY_POLICY"],
  SENT: ["CONFIRMED", "ESCALATED"],
  CONFIRMED: ["COVERED"],
  SUPPRESSED: [],
  NO_REPLY_POLICY: [],
  COVERED: [],
  ESCALATED: ["SCHEDULED", "SUPPRESSED", "NO_REPLY_POLICY"],
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateCommunicationOwnerDeadlineInvariant(
  obligation: CommunicationObligation,
  now: string,
): NamedOutboundLoopGate {
  if (COMMUNICATION_TERMINAL_STATES.includes(obligation.state)) {
    return named("CommunicationOwnerDeadlineInvariant", "PASS", ["TERMINAL"]);
  }
  if (obligation.state === "ESCALATED" && obligation.owner && obligation.due_at && obligation.next_action) {
    return named("CommunicationOwnerDeadlineInvariant", "PASS", ["ESCALATED_OWNED"]);
  }
  if (!obligation.owner || !(obligation.due_at || obligation.next_action_at) || !obligation.next_action) {
    return named("CommunicationOwnerDeadlineInvariant", "FAIL", ["OWNER_OR_DEADLINE_MISSING"]);
  }
  return named("CommunicationOwnerDeadlineInvariant", "PASS", ["LIVE"]);
}

export function evaluateCommunicationAgeSlo(obligation: CommunicationObligation, now: string): NamedOutboundLoopGate {
  if (COMMUNICATION_TERMINAL_STATES.includes(obligation.state)) {
    return named("CommunicationAgeSlo", "PASS", ["TERMINAL"]);
  }
  const age = Date.parse(now) - Date.parse(obligation.received_at);
  if (age > 20 * 60 * 1000) return named("CommunicationAgeSlo", "FAIL", ["OVERDUE_20M"]);
  return named("CommunicationAgeSlo", "PASS", ["WITHIN_SLO"]);
}

export function transitionCommunicationObligation(input: {
  current: CommunicationObligation | null;
  to_state: CommunicationObligationState;
  expected_version: number;
  actor: string;
  reason: string;
  evidence_ref?: string | null;
  now: string;
  mailbox_id?: string;
  provider_message_id?: string;
  thread_id?: string;
  received_at?: string;
  role?: CommunicationObligation["role"];
  role_evidence?: string;
  authorship_resolution?: string;
  owner?: string | null;
  due_at?: string | null;
  next_action_at?: string | null;
  next_action?: string | null;
  planner_intent?: string | null;
  planner_version?: string | null;
  conversation_stage?: string | null;
  covered_by_outbound_id?: string | null;
  terminal_reason?: string | null;
  strategy_id?: string | null;
}): { ok: true; obligation: CommunicationObligation; log: CommunicationTransitionLog } | { ok: false; reason: string } {
  const from = input.current?.state ?? "NONE";
  if (input.current && input.current.version !== input.expected_version) {
    return { ok: false, reason: "VERSION_CONFLICT" };
  }
  if (!LEGAL[from].includes(input.to_state)) {
    return { ok: false, reason: "ILLEGAL_TRANSITION" };
  }
  const mailbox = input.mailbox_id ?? input.current?.mailbox_id ?? "unknown";
  const provider = input.provider_message_id ?? input.current?.provider_message_id ?? "unknown";
  const obligation: CommunicationObligation = {
    obligation_id: input.current?.obligation_id ?? `comm-ob:${mailbox}:${provider}`,
    mailbox_id: mailbox,
    provider_message_id: provider,
    thread_id: input.thread_id ?? input.current?.thread_id ?? "",
    state: input.to_state,
    version: (input.current?.version ?? 0) + 1,
    owner: input.owner ?? input.current?.owner ?? "CommunicationWorker",
    due_at: input.due_at ?? input.current?.due_at ?? null,
    next_action_at: input.next_action_at ?? input.current?.next_action_at ?? null,
    next_action: input.next_action ?? input.current?.next_action ?? "PROCESS_INBOUND",
    received_at: input.received_at ?? input.current?.received_at ?? input.now,
    role: input.role ?? input.current?.role ?? "PROSPECT",
    role_evidence: input.role_evidence ?? input.current?.role_evidence ?? "UNRESOLVED",
    authorship_resolution: input.authorship_resolution ?? input.current?.authorship_resolution ?? "UNRESOLVED",
    planner_intent: input.planner_intent ?? input.current?.planner_intent ?? null,
    planner_version: input.planner_version ?? input.current?.planner_version ?? null,
    conversation_stage: input.conversation_stage ?? input.current?.conversation_stage ?? null,
    covered_by_outbound_id: input.covered_by_outbound_id ?? input.current?.covered_by_outbound_id ?? null,
    terminal_reason: input.terminal_reason ?? input.current?.terminal_reason ?? null,
    strategy_id: input.strategy_id ?? input.current?.strategy_id ?? null,
    recovered: input.current?.recovered === true,
    clean_eligible: input.current?.recovered === true ? false : (input.current?.clean_eligible ?? true),
    recovery_reason_codes: input.current?.recovery_reason_codes ?? [],
    created_at: input.current?.created_at ?? input.now,
    updated_at: input.now,
  };
  if (obligation.state === "ESCALATED") {
    if (!obligation.owner || !obligation.due_at || !obligation.next_action) {
      return { ok: false, reason: "ESCALATED_REQUIRES_OWNER_DEADLINE_NEXT_ACTION" };
    }
  }
  if (!COMMUNICATION_TERMINAL_STATES.includes(obligation.state) && obligation.state !== "ESCALATED") {
    obligation.owner = obligation.owner ?? "CommunicationWorker";
    obligation.next_action_at = obligation.next_action_at ?? input.now;
    obligation.next_action = obligation.next_action ?? "PROCESS_INBOUND";
    obligation.due_at = obligation.due_at ?? new Date(Date.parse(input.now) + 20 * 60 * 1000).toISOString();
  }
  return {
    ok: true,
    obligation,
    log: {
      obligation_id: obligation.obligation_id,
      from_state: from,
      to_state: input.to_state,
      expected_version: input.expected_version,
      new_version: obligation.version,
      actor: input.actor,
      reason: input.reason,
      evidence_ref: input.evidence_ref ?? null,
      timestamp: input.now,
    },
  };
}
