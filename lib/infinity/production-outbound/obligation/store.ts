import { transitionCommunicationObligation } from "./transition";
import type {
  CommunicationAttempt,
  CommunicationObligation,
  CommunicationOutboundLedger,
  CommunicationTransitionLog,
} from "./types";

export type CommunicationObligationStore = {
  obligations: Map<string, CommunicationObligation>;
  identity: Map<string, string>;
  attempts: CommunicationAttempt[];
  ledger: CommunicationOutboundLedger[];
  logs: CommunicationTransitionLog[];
  clean_live_turns: 0;
  reconciler_rearm_count: number;
  persistence: "POSTGRES";
  schema_ready: boolean;
};

function identityKey(mailbox_id: string, provider_message_id: string): string {
  return `${mailbox_id}:${provider_message_id}`;
}

function emptyStore(): CommunicationObligationStore {
  return {
    obligations: new Map(),
    identity: new Map(),
    attempts: [],
    ledger: [],
    logs: [],
    clean_live_turns: 0,
    reconciler_rearm_count: 0,
    persistence: "POSTGRES",
    schema_ready: true,
  };
}

let memory = emptyStore();

export function resetCommunicationObligationStore(): CommunicationObligationStore {
  memory = emptyStore();
  return memory;
}

export function getCommunicationObligationStore(): CommunicationObligationStore {
  return memory;
}

export function replaceCommunicationObligationStore(next: CommunicationObligationStore): CommunicationObligationStore {
  memory = next;
  return memory;
}

export function listCommunicationObligations(): CommunicationObligation[] {
  return [...memory.obligations.values()];
}

export function getCommunicationObligation(obligation_id: string): CommunicationObligation | null {
  return memory.obligations.get(obligation_id) ?? null;
}

export function findCommunicationObligationByIdentity(mailbox_id: string, provider_message_id: string): CommunicationObligation | null {
  const id = memory.identity.get(identityKey(mailbox_id, provider_message_id));
  return id ? memory.obligations.get(id) ?? null : null;
}

export function listCommunicationAttempts(obligation_id?: string): CommunicationAttempt[] {
  return obligation_id ? memory.attempts.filter((row) => row.obligation_id === obligation_id) : [...memory.attempts];
}

export function listCommunicationOutboundLedger(): CommunicationOutboundLedger[] {
  return [...memory.ledger];
}

export function listCommunicationTransitionLogs(): CommunicationTransitionLog[] {
  return [...memory.logs];
}

export function ingestCommunicationObligation(input: Parameters<typeof transitionCommunicationObligation>[0] & {
  mailbox_id: string;
  provider_message_id: string;
}): { status: "INSERTED" | "EXISTING"; obligation: CommunicationObligation } | { status: "REJECTED"; reason: string } {
  const existing = findCommunicationObligationByIdentity(input.mailbox_id, input.provider_message_id);
  if (existing) return { status: "EXISTING", obligation: existing };
  const created = transitionCommunicationObligation({
    ...input,
    current: null,
    to_state: "RECEIVED",
    expected_version: 0,
  });
  if (!created.ok) return { status: "REJECTED", reason: created.reason };
  memory.obligations.set(created.obligation.obligation_id, created.obligation);
  memory.identity.set(identityKey(created.obligation.mailbox_id, created.obligation.provider_message_id), created.obligation.obligation_id);
  memory.logs.push(created.log);
  return { status: "INSERTED", obligation: created.obligation };
}

export function applyCommunicationObligationTransition(
  input: Parameters<typeof transitionCommunicationObligation>[0],
): ReturnType<typeof transitionCommunicationObligation> {
  const current = input.current
    ?? (input.mailbox_id && input.provider_message_id
      ? findCommunicationObligationByIdentity(input.mailbox_id, input.provider_message_id)
      : null);
  const stored = current ? memory.obligations.get(current.obligation_id) ?? current : null;
  if (stored && stored.version !== input.expected_version) {
    return { ok: false, reason: "VERSION_CONFLICT" };
  }
  const result = transitionCommunicationObligation({ ...input, current: stored });
  if (!result.ok) return result;
  memory.obligations.set(result.obligation.obligation_id, result.obligation);
  memory.identity.set(identityKey(result.obligation.mailbox_id, result.obligation.provider_message_id), result.obligation.obligation_id);
  memory.logs.push(result.log);
  return result;
}

export function appendCommunicationAttempt(attempt: CommunicationAttempt): CommunicationAttempt {
  if (attempt.attempt_no < 1) {
    throw new Error("IMPOSSIBLE_ATTEMPT_NO");
  }
  if (!attempt.started_at) {
    throw new Error("IMPOSSIBLE_ATTEMPT_STARTED_AT");
  }
  memory.attempts.push(attempt);
  return attempt;
}

export function updateCommunicationAttempt(attempt_id: string, patch: Partial<CommunicationAttempt>): CommunicationAttempt | null {
  const index = memory.attempts.findIndex((row) => row.attempt_id === attempt_id);
  if (index < 0) return null;
  memory.attempts[index] = { ...memory.attempts[index], ...patch };
  return memory.attempts[index];
}

export function claimOutboundOwnership(input: {
  thread_id: string;
  answered_inbound_provider_message_id: string;
  path: "LEGACY" | "OBLIGATION";
}): { ok: true } | { ok: false; owner: "LEGACY" | "OBLIGATION" } {
  const existing = memory.ledger.find((item) =>
    item.thread_id === input.thread_id
    && item.answered_inbound_provider_message_id === input.answered_inbound_provider_message_id
  );
  if (existing) return { ok: false, owner: existing.path ?? "OBLIGATION" };
  return { ok: true };
}

export function insertCommunicationOutboundLedger(row: CommunicationOutboundLedger): CommunicationOutboundLedger | "EXISTING" {
  if (row.answered_inbound_provider_message_id) {
    const owned = memory.ledger.find((item) =>
      item.thread_id === row.thread_id
      && item.answered_inbound_provider_message_id === row.answered_inbound_provider_message_id
    );
    if (owned) return "EXISTING";
  }
  const existing = memory.ledger.find((item) => item.obligation_id === row.obligation_id && item.attempt_id === row.attempt_id);
  if (existing) return "EXISTING";
  const byAttemptNo = memory.ledger.find((item) => {
    const attempt = memory.attempts.find((candidate) => candidate.attempt_id === row.attempt_id);
    const existingAttempt = memory.attempts.find((candidate) => candidate.attempt_id === item.attempt_id);
    return item.obligation_id === row.obligation_id && attempt && existingAttempt && attempt.attempt_no === existingAttempt.attempt_no;
  });
  if (byAttemptNo) return "EXISTING";
  memory.ledger.push(row);
  return row;
}

export function findLedgerByRfc(rfc_message_id: string): CommunicationOutboundLedger | null {
  return memory.ledger.find((row) => row.rfc_message_id === rfc_message_id) ?? null;
}

export function findLedgerByObligationAttempt(obligation_id: string, attempt_id: string): CommunicationOutboundLedger | null {
  return memory.ledger.find((row) => row.obligation_id === obligation_id && row.attempt_id === attempt_id) ?? null;
}

export function incrementReconcilerRearm(): number {
  memory.reconciler_rearm_count += 1;
  return memory.reconciler_rearm_count;
}

export function evaluateImpossibleAttemptState(input: {
  attempt_no?: number;
  failed?: boolean;
  started_at?: string | null;
  claimed_worker_failed?: boolean;
}): { ok: boolean; reason?: string } {
  if ((input.attempt_no ?? 1) < 1 && input.failed) return { ok: false, reason: "ATTEMPT_NO_ZERO_FAILED" };
  if (input.claimed_worker_failed && !input.started_at) return { ok: false, reason: "FAILED_WITHOUT_STARTED_AT" };
  return { ok: true };
}
