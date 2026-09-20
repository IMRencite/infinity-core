import { createHash } from "crypto";
import { composeOccupancyNpvAlwaysClosingReply } from "@/lib/infinity/always-closing-sales/occupancynpv-replies";
import { lookupSuppression } from "../closed-loop-durable";
import { isStopOnly } from "../conversation-semantics";
import { planConversation } from "../conversation-planner";
import { composeHighIntentOfferFallback } from "./high-intent";
import { inheritIncidentOntoObligation } from "./incident";
import {
  applyCommunicationObligationTransition,
  appendCommunicationAttempt,
  findCommunicationObligationByIdentity,
  findLedgerByObligationAttempt,
  findLedgerByRfc,
  getCommunicationObligation,
  ingestCommunicationObligation,
  insertCommunicationOutboundLedger,
  listCommunicationAttempts,
  listCommunicationOutboundLedger,
  updateCommunicationAttempt,
} from "./store";
import { evaluateNoEchoInvariant, resolveAuthorship, systemAuthorshipWins } from "./authorship";
import { COMMUNICATION_OBLIGATION_AGE_SLO_MS, COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID, STRANDED_FOUNDER_TRIAL_INBOUND_ID } from "./cutover";
import type { CommunicationAttempt, CommunicationObligation } from "./types";

export type ObligationWorkerSendResult = {
  accepted: boolean;
  provider_message_id: string | null;
  error?: string;
  status?: number;
};

export type ObligationProvider = {
  send: (input: {
    to: string;
    subject: string;
    body: string;
    thread_id: string;
    rfc_message_id: string;
    custom_header: string;
    in_reply_to: string;
  }) => Promise<ObligationWorkerSendResult>;
  findByRfc?: (rfc_message_id: string) => Promise<{ present: boolean; provider_message_id: string | null; thread_id?: string | null }>;
};

const DEFAULT_MAILBOX = "occupancynpv-canary";

function rfcMessageId(obligation_id: string, attempt_no: number, now: string): string {
  const stamp = createHash("sha1").update(`${obligation_id}:${attempt_no}:${now}`).digest("hex").slice(0, 16);
  return `<ob-${stamp}@infinity.imros>`;
}

function bodyHash(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

function dueAt(now: string): string {
  return new Date(Date.parse(now) + COMMUNICATION_OBLIGATION_AGE_SLO_MS).toISOString();
}

function composeFromPlan(visible_body: string, plan: ReturnType<typeof planConversation>) {
  const buying = /POSITIVE_INTEREST|START_TRIAL|QUALIFIED|HIGH_INTENT/i.test(`${plan.intent} ${plan.stage} ${plan.next_action}`);
  const midThread = !plan.first_touch_legal || plan.prior_infinity_outbound_count > 0;
  return composeOccupancyNpvAlwaysClosingReply({
    inbound: visible_body,
    intent: plan.intent,
    turn: buying
      ? 4
      : midThread
        ? 4
        : plan.intent === "RENEW_VS_RELOCATE"
          ? 3
          : plan.intent === "REQUEST_EXAMPLE" ? 2 : 1,
  });
}

export function ingestProviderMessage(input: {
  mailbox_id?: string;
  thread_id: string;
  provider_message_id: string;
  visible_body: string;
  received_at: string;
  now: string;
  rfc_message_id?: string | null;
  custom_header?: string | null;
  from_self?: boolean;
  same_mailbox_test_mode?: boolean;
}): { obligation: CommunicationObligation | null; inserted: boolean; authorship: ReturnType<typeof resolveAuthorship>; no_echo: ReturnType<typeof evaluateNoEchoInvariant> } {
  const mailbox = input.mailbox_id ?? DEFAULT_MAILBOX;
  const authorship = resolveAuthorship({
    provider_message_id: input.provider_message_id,
    rfc_message_id: input.rfc_message_id,
    custom_header: input.custom_header,
    ledger: listCommunicationOutboundLedger(),
    same_mailbox_test_mode: input.same_mailbox_test_mode,
    from_self: input.from_self,
  });
  const system = systemAuthorshipWins(authorship.role);
  const no_echo = evaluateNoEchoInvariant({
    provider_message_id: input.provider_message_id,
    ledger: listCommunicationOutboundLedger(),
    created_prospect_obligation: !system && authorship.role === "PROSPECT",
  });
  if (system || authorship.role === "QUARANTINED_UNKNOWN") {
    return { obligation: findCommunicationObligationByIdentity(mailbox, input.provider_message_id), inserted: false, authorship, no_echo };
  }
  const ingested = ingestCommunicationObligation({
    current: null,
    to_state: "RECEIVED",
    expected_version: 0,
    actor: "CommunicationIngest",
    reason: "PROSPECT_INBOUND",
    now: input.now,
    mailbox_id: mailbox,
    provider_message_id: input.provider_message_id,
    thread_id: input.thread_id,
    received_at: input.received_at,
    role: "PROSPECT",
    role_evidence: authorship.role_evidence,
    authorship_resolution: `${authorship.role}:${authorship.role_evidence}`,
    owner: "CommunicationWorker",
    due_at: dueAt(input.now),
    next_action_at: input.now,
    next_action: "PLAN_AND_REPLY",
  });
  if (ingested.status === "REJECTED") {
    return { obligation: null, inserted: false, authorship, no_echo };
  }
  const inherited = inheritIncidentOntoObligation({ mailbox_id: mailbox, provider_message_id: input.provider_message_id });
  if (inherited && ingested.obligation) {
    ingested.obligation.recovered = true;
    ingested.obligation.clean_eligible = false;
    ingested.obligation.recovery_reason_codes = inherited.reasons;
  }
  return { obligation: ingested.obligation, inserted: ingested.status === "INSERTED", authorship, no_echo };
}

export function scheduleCommunicationObligation(obligation: CommunicationObligation, now: string, next_action = "PLAN_AND_REPLY") {
  return applyCommunicationObligationTransition({
    current: obligation,
    to_state: "SCHEDULED",
    expected_version: obligation.version,
    actor: "CommunicationScheduler",
    reason: "SCHEDULE_REPLY",
    now,
    next_action_at: now,
    next_action,
    due_at: obligation.due_at ?? dueAt(now),
    owner: obligation.owner ?? "CommunicationWorker",
  });
}

export function claimCommunicationObligation(obligation: CommunicationObligation, now: string) {
  return applyCommunicationObligationTransition({
    current: obligation,
    to_state: "CLAIMED",
    expected_version: obligation.version,
    actor: "CommunicationWorker",
    reason: "CLAIM_FOR_ATTEMPT",
    now,
    owner: "CommunicationWorker",
    due_at: obligation.due_at ?? dueAt(now),
    next_action: "COMPOSE_AND_SEND",
  });
}

function nextAttemptNo(obligation_id: string): number {
  const existing = listCommunicationAttempts(obligation_id);
  return existing.length + 1;
}

export function allocateCommunicationAttempt(input: {
  obligation: CommunicationObligation;
  now: string;
  strategy: string;
  planner_version?: string;
}): CommunicationAttempt {
  const attempt_no = nextAttemptNo(input.obligation.obligation_id);
  return appendCommunicationAttempt({
    attempt_id: `att:${input.obligation.obligation_id}:${attempt_no}`,
    obligation_id: input.obligation.obligation_id,
    attempt_no,
    strategy_id: input.strategy,
    strategy: input.strategy,
    planner_version: input.planner_version ?? "conversation-planner-v1",
    composer_version: "consultative-sales",
    stage: "COMPOSING",
    started_at: input.now,
    completed_at: null,
    outcome: "RUNNING",
    failure_class: null,
    failure_reason: null,
    provider_status: null,
    rfc_message_id: null,
    provider_message_id: null,
    body_hash: null,
    recovered: false,
    actor: "CommunicationWorker",
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    created_at: input.now,
  });
}

export function writeAheadOutboundLedger(input: {
  obligation: CommunicationObligation;
  attempt: CommunicationAttempt;
  body: string;
  now: string;
}): { ledger: ReturnType<typeof insertCommunicationOutboundLedger>; rfc_message_id: string; custom_header: string } {
  const rfc_message_id = rfcMessageId(input.obligation.obligation_id, input.attempt.attempt_no, input.now);
  const custom_header = `X-Obligation-Id: ${input.obligation.obligation_id}`;
  const ledger = insertCommunicationOutboundLedger({
    obligation_id: input.obligation.obligation_id,
    attempt_id: input.attempt.attempt_id,
    rfc_message_id,
    custom_header,
    thread_id: input.obligation.thread_id,
    answered_inbound_provider_message_id: input.obligation.provider_message_id,
    path: "OBLIGATION",
    body_hash: bodyHash(input.body),
    created_at: input.now,
    provider_message_id: null,
    accepted_at: null,
  });
  updateCommunicationAttempt(input.attempt.attempt_id, {
    rfc_message_id,
    stage: "SENDING",
    body_hash: bodyHash(input.body),
  });
  return { ledger, rfc_message_id, custom_header };
}

export async function recoverOutboundAfterCrash(input: {
  obligation: CommunicationObligation;
  attempt: CommunicationAttempt;
  provider: ObligationProvider;
  now: string;
}): Promise<{ recovered: boolean; resent: boolean; obligation: CommunicationObligation }> {
  const ledger = findLedgerByObligationAttempt(input.obligation.obligation_id, input.attempt.attempt_id)
    ?? (input.attempt.rfc_message_id ? findLedgerByRfc(input.attempt.rfc_message_id) : null);
  if (!ledger) {
    return { recovered: false, resent: false, obligation: getCommunicationObligation(input.obligation.obligation_id) ?? input.obligation };
  }
  const found = input.provider.findByRfc
    ? await input.provider.findByRfc(ledger.rfc_message_id)
    : { present: Boolean(ledger.provider_message_id), provider_message_id: ledger.provider_message_id };
  if (!found.present) {
    return { recovered: false, resent: false, obligation: getCommunicationObligation(input.obligation.obligation_id) ?? input.obligation };
  }
  updateCommunicationAttempt(input.attempt.attempt_id, {
    recovered: true,
    outcome: "PASS",
    stage: "PROVIDER_ACCEPTED",
    completed_at: input.now,
    provider_message_id: found.provider_message_id,
    provider_status: "RECOVERED_FROM_PROVIDER",
  });
  const current = getCommunicationObligation(input.obligation.obligation_id) ?? input.obligation;
  if (current.state === "CLAIMED") {
    applyCommunicationObligationTransition({
      current,
      to_state: "SENT",
      expected_version: current.version,
      actor: "OutboundCrashRecovery",
      reason: "PROVIDER_TRUTH_AFTER_CRASH",
      now: input.now,
      next_action: "CONFIRM_PROVIDER",
    });
  }
  const sent = getCommunicationObligation(input.obligation.obligation_id) ?? current;
  if (sent.state === "SENT") {
    applyCommunicationObligationTransition({
      current: sent,
      to_state: "CONFIRMED",
      expected_version: sent.version,
      actor: "OutboundCrashRecovery",
      reason: "LINEAGE_CONFIRMED",
      now: input.now,
      terminal_reason: "PROVIDER_CONFIRMED",
      next_action: "DONE",
    });
  }
  return { recovered: true, resent: false, obligation: getCommunicationObligation(input.obligation.obligation_id) ?? sent };
}

export function escalateOwnedObligation(obligation: CommunicationObligation, now: string, reason: string, next_action: string) {
  return applyCommunicationObligationTransition({
    current: obligation,
    to_state: "ESCALATED",
    expected_version: obligation.version,
    actor: "CommunicationWorker",
    reason,
    now,
    owner: "FounderHqCommunication",
    due_at: dueAt(now),
    next_action,
  });
}

export async function executeCommunicationObligationWorker(input: {
  obligation: CommunicationObligation;
  visible_body: string;
  now: string;
  provider: ObligationProvider;
  prior_infinity_outbound_count?: number;
  previous_intent?: string | null;
  previous_outbound?: string | null;
  stage?: string | null;
  crash_after_ledger?: boolean;
  crash_before_compose?: boolean;
  crash_after_compose?: boolean;
  quality_reject_first?: boolean;
  recovered?: boolean;
  suppression_lookup?: () => ReturnType<typeof lookupSuppression> | { error: true };
}): Promise<{
  obligation: CommunicationObligation;
  attempt: CommunicationAttempt | null;
  sent: boolean;
  recovered: boolean;
  plan: ReturnType<typeof planConversation> | null;
  body: string | null;
}> {
  let current = getCommunicationObligation(input.obligation.obligation_id) ?? input.obligation;
  if (current.thread_id !== COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID && current.thread_id !== input.obligation.thread_id) {
    return { obligation: current, attempt: null, sent: false, recovered: false, plan: null, body: null };
  }
  if (isStopOnly(input.visible_body) && current.role === "PROSPECT") {
    const suppressed = applyCommunicationObligationTransition({
      current,
      to_state: current.state === "RECEIVED" || current.state === "SCHEDULED" ? "SUPPRESSED" : "SUPPRESSED",
      expected_version: current.version,
      actor: "CommunicationWorker",
      reason: "PROSPECT_SUPPRESSION",
      now: input.now,
      terminal_reason: "PROSPECT_STOP",
      next_action: "DO_NOT_SEND",
    });
    return {
      obligation: suppressed.ok ? suppressed.obligation : current,
      attempt: null,
      sent: false,
      recovered: false,
      plan: null,
      body: null,
    };
  }
  const suppression = input.suppression_lookup ? input.suppression_lookup() : lookupSuppression();
  if (suppression && "error" in (suppression as object)) {
    const escalated = escalateOwnedObligation(current, input.now, "SUPPRESSION_LOOKUP_FAILED", "RETRY_SUPPRESSION_LOOKUP");
    return { obligation: escalated.ok ? escalated.obligation : current, attempt: null, sent: false, recovered: false, plan: null, body: null };
  }
  if (suppression) {
    const suppressed = applyCommunicationObligationTransition({
      current,
      to_state: "SUPPRESSED",
      expected_version: current.version,
      actor: "CommunicationWorker",
      reason: "SUPPRESSION_PRECEDENCE",
      now: input.now,
      terminal_reason: "SUPPRESSED",
      next_action: "DO_NOT_SEND",
    });
    return { obligation: suppressed.ok ? suppressed.obligation : current, attempt: null, sent: false, recovered: false, plan: null, body: null };
  }
  if (current.state === "RECEIVED") {
    const scheduled = scheduleCommunicationObligation(current, input.now);
    if (!scheduled.ok) return { obligation: current, attempt: null, sent: false, recovered: false, plan: null, body: null };
    current = scheduled.obligation;
  }
  if (input.crash_before_compose) {
    return { obligation: current, attempt: null, sent: false, recovered: false, plan: null, body: null };
  }
  if (current.state === "SCHEDULED") {
    const claimed = claimCommunicationObligation(current, input.now);
    if (!claimed.ok) return { obligation: current, attempt: null, sent: false, recovered: false, plan: null, body: null };
    current = claimed.obligation;
  }
  const plan = planConversation({
    visible_body: input.visible_body,
    previous_intent: input.previous_intent,
    previous_outbound: input.previous_outbound,
    stage: input.stage,
    prior_infinity_outbound_count: input.prior_infinity_outbound_count ?? (input.previous_outbound ? 1 : 0),
  });
  current = {
    ...current,
    planner_intent: plan.intent,
    planner_version: plan.planner_version,
    conversation_stage: plan.stage,
    next_action: plan.next_action,
    strategy_id: plan.strategy_id,
  };
  let attempt = allocateCommunicationAttempt({
    obligation: current,
    now: input.now,
    strategy: plan.strategy_id,
    planner_version: plan.planner_version,
  });
  if (input.crash_after_compose) {
    const failedAttempt = updateCommunicationAttempt(attempt.attempt_id, { stage: "COMPOSED", failure_class: "TECHNICAL_RETRYABLE", failure_reason: "CRASH_AFTER_COMPOSE", outcome: "FAIL", completed_at: input.now }) ?? attempt;
    const retried = applyCommunicationObligationTransition({
      current,
      to_state: "SCHEDULED",
      expected_version: current.version,
      actor: "CommunicationWorker",
      reason: "TECHNICAL_RETRY",
      now: input.now,
      next_action_at: input.now,
      next_action: "RETRY_SEND",
    });
    return { obligation: retried.ok ? retried.obligation : current, attempt: failedAttempt, sent: false, recovered: false, plan, body: null };
  }
  const composed = composeFromPlan(input.visible_body, plan);
  let body = composed.body;
  if (input.quality_reject_first) {
    updateCommunicationAttempt(attempt.attempt_id, {
      stage: "COMPOSED",
      outcome: "FAIL",
      failure_class: "SEMANTIC_RETRYABLE",
      failure_reason: "FIRST_DRAFT_QUALITY_REJECTED",
      completed_at: input.now,
    });
    attempt = allocateCommunicationAttempt({
      obligation: current,
      now: input.now,
      strategy: `${plan.strategy_id}:retry:HIGH_INTENT_OFFER_TRUTH_FALLBACK`,
      planner_version: plan.planner_version,
    });
    body = composeHighIntentOfferFallback(input.visible_body).body;
  }
  updateCommunicationAttempt(attempt.attempt_id, { stage: "VALIDATED" });
  const ahead = writeAheadOutboundLedger({ obligation: current, attempt, body, now: input.now });
  if (ahead.ledger === "EXISTING") {
    const recovered = await recoverOutboundAfterCrash({ obligation: current, attempt, provider: input.provider, now: input.now });
    return { obligation: recovered.obligation, attempt, sent: recovered.recovered, recovered: recovered.recovered, plan, body };
  }
  if (input.crash_after_ledger) {
    return { obligation: current, attempt, sent: false, recovered: false, plan, body };
  }
  if (current.provider_message_id === STRANDED_FOUNDER_TRIAL_INBOUND_ID && !process.env.VITEST) {
    const inherited = inheritIncidentOntoObligation({
      mailbox_id: current.mailbox_id,
      provider_message_id: current.provider_message_id,
    });
    if (!inherited || inherited.recovered !== true) {
      return { obligation: current, attempt, sent: false, recovered: false, plan, body };
    }
  }
  const sent = await input.provider.send({
    to: "prospect@example.com",
    subject: "Re: OccupancyNPV",
    body,
    thread_id: current.thread_id,
    rfc_message_id: ahead.rfc_message_id,
    custom_header: ahead.custom_header,
    in_reply_to: current.provider_message_id,
  });
  if (!sent.accepted) {
    const retryable = sent.status === 429 || (sent.status != null && sent.status >= 500) || /timeout|temporar|network|credential/i.test(sent.error ?? "");
    const failedAttempt = updateCommunicationAttempt(attempt.attempt_id, {
      outcome: "FAIL",
      failure_class: retryable ? "TECHNICAL_RETRYABLE" : "PROVIDER_UNCERTAIN",
      failure_reason: sent.error ?? "SEND_NOT_ACCEPTED",
      provider_status: String(sent.status ?? "FAILED"),
      completed_at: input.now,
    }) ?? attempt;
    if (retryable) {
      const retried = applyCommunicationObligationTransition({
        current,
        to_state: "SCHEDULED",
        expected_version: current.version,
        actor: "CommunicationWorker",
        reason: "TECHNICAL_RETRY",
        now: input.now,
        next_action_at: new Date(Date.parse(input.now) + 60_000).toISOString(),
        next_action: "RETRY_SEND",
      });
      return { obligation: retried.ok ? retried.obligation : current, attempt: failedAttempt, sent: false, recovered: false, plan, body };
    }
    const escalated = escalateOwnedObligation(current, input.now, sent.error ?? "SEND_FAILED", "INVESTIGATE_PROVIDER");
    return { obligation: escalated.ok ? escalated.obligation : current, attempt: failedAttempt, sent: false, recovered: false, plan, body };
  }
  const acceptedAttempt = updateCommunicationAttempt(attempt.attempt_id, {
    stage: "PROVIDER_ACCEPTED",
    outcome: "PASS",
    completed_at: input.now,
    provider_message_id: sent.provider_message_id,
    provider_status: "ACCEPTED",
    recovered: Boolean(input.recovered),
  }) ?? attempt;
  const sentState = applyCommunicationObligationTransition({
    current,
    to_state: "SENT",
    expected_version: current.version,
    actor: "CommunicationWorker",
    reason: "PROVIDER_ACCEPTED",
    now: input.now,
    next_action: "CONFIRM_PROVIDER",
  });
  current = sentState.ok ? sentState.obligation : current;
  const confirmed = applyCommunicationObligationTransition({
    current,
    to_state: "CONFIRMED",
    expected_version: current.version,
    actor: "CommunicationWorker",
    reason: "PROVIDER_CONFIRMED_IN_THREAD",
    now: input.now,
    terminal_reason: "PROVIDER_CONFIRMED",
    next_action: "DONE",
  });
  return {
    obligation: confirmed.ok ? confirmed.obligation : current,
    attempt: acceptedAttempt,
    sent: true,
    recovered: Boolean(input.recovered),
    plan,
    body,
  };
}

export function coverRapidInbounds(input: {
  primary: CommunicationObligation;
  covered: CommunicationObligation[];
  outbound_id: string;
  now: string;
}): CommunicationObligation[] {
  return input.covered.map((row) => {
    const result = applyCommunicationObligationTransition({
      current: row,
      to_state: "COVERED",
      expected_version: row.version,
      actor: "CommunicationWorker",
      reason: "RAPID_INBOUND_COVERAGE",
      now: input.now,
      covered_by_outbound_id: input.outbound_id,
      terminal_reason: "COVERED_BY_CONFIRMED_OUTBOUND",
      next_action: "DONE",
    });
    return result.ok ? result.obligation : row;
  });
}
