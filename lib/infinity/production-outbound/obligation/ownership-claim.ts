import type { NamedOutboundLoopGate } from "../closed-loop";

export const OWNERSHIP_STATES = ["AVAILABLE", "CLAIMED", "SENDING", "SEND_UNCERTAIN", "SENT", "CONFIRMED", "RELEASED", "SUPERSEDED"] as const;
export type OwnershipState = (typeof OWNERSHIP_STATES)[number];

export type OutboundOwnershipClaim = {
  mailbox_id: string;
  thread_id: string;
  answered_inbound_provider_message_id: string;
  state: OwnershipState;
  owner_path: "LEGACY" | "OBLIGATION" | null;
  owner_id: string | null;
  attempt_id: string | null;
  version: number;
  lease_expires_at: string | null;
  updated_at: string;
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

function key(row: Pick<OutboundOwnershipClaim, "mailbox_id" | "thread_id" | "answered_inbound_provider_message_id">): string {
  return `${row.mailbox_id}:${row.thread_id}:${row.answered_inbound_provider_message_id}`;
}

const memory = new Map<string, OutboundOwnershipClaim>();

export function resetOwnershipClaims(): void {
  memory.clear();
}

export function ensureOwnershipRow(input: Omit<OutboundOwnershipClaim, "state" | "owner_path" | "owner_id" | "attempt_id" | "version" | "lease_expires_at"> & { now: string }): OutboundOwnershipClaim {
  const id = key(input);
  const existing = memory.get(id);
  if (existing) return existing;
  const row: OutboundOwnershipClaim = {
    mailbox_id: input.mailbox_id,
    thread_id: input.thread_id,
    answered_inbound_provider_message_id: input.answered_inbound_provider_message_id,
    state: "AVAILABLE",
    owner_path: null,
    owner_id: null,
    attempt_id: null,
    version: 1,
    lease_expires_at: null,
    updated_at: input.now,
  };
  memory.set(id, row);
  return row;
}

export function getOwnershipClaim(input: {
  mailbox_id: string;
  thread_id: string;
  answered_inbound_provider_message_id: string;
}): OutboundOwnershipClaim | null {
  return memory.get(key(input)) ?? null;
}

export function casOwnership(input: {
  mailbox_id: string;
  thread_id: string;
  answered_inbound_provider_message_id: string;
  from: OwnershipState[];
  to: OwnershipState;
  owner_path: "LEGACY" | "OBLIGATION";
  owner_id: string;
  attempt_id?: string | null;
  expected_version: number;
  now: string;
  fenced: boolean;
}): { ok: boolean; reason: string; row: OutboundOwnershipClaim | null } {
  const current = getOwnershipClaim(input);
  if (!current) {
    return { ok: false, reason: input.fenced ? "MISSING_OWNERSHIP_FAIL_CLOSED" : "MISSING_OWNERSHIP", row: null };
  }
  if (current.version !== input.expected_version || !input.from.includes(current.state)) {
    return { ok: false, reason: "CAS_FAILED", row: current };
  }
  const next: OutboundOwnershipClaim = {
    ...current,
    state: input.to,
    owner_path: input.owner_path,
    owner_id: input.owner_id,
    attempt_id: input.attempt_id ?? current.attempt_id,
    version: current.version + 1,
    updated_at: input.now,
  };
  memory.set(key(current), next);
  return { ok: true, reason: "CAS_OK", row: next };
}

export function acquireInboundOwnershipKeysAtomic(input: {
  keys: Array<{ mailbox_id: string; thread_id: string; answered_inbound_provider_message_id: string }>;
  owner_path: "LEGACY" | "OBLIGATION";
  owner_id: string;
  now: string;
}): { ok: boolean; claimed: number; reason: string } {
  const rows = input.keys.map((key) => getOwnershipClaim(key));
  if (rows.some((row) => !row)) return { ok: false, claimed: 0, reason: "MISSING_OWNERSHIP_FAIL_CLOSED" };
  if (rows.some((row) => row && row.state !== "AVAILABLE")) return { ok: false, claimed: 0, reason: "NOT_ALL_AVAILABLE" };
  const applied: OutboundOwnershipClaim[] = [];
  for (const item of input.keys) {
    const current = getOwnershipClaim(item)!;
    const next = casOwnership({
      ...item,
      from: ["AVAILABLE"],
      to: "CLAIMED",
      owner_path: input.owner_path,
      owner_id: input.owner_id,
      expected_version: current.version,
      now: input.now,
      fenced: true,
    });
    if (!next.ok || !next.row) {
      for (const prior of applied) {
        memory.set(key(prior), { ...prior, state: "AVAILABLE", owner_path: null, owner_id: null, version: prior.version + 1, updated_at: input.now });
      }
      return { ok: false, claimed: 0, reason: "ATOMIC_CLAIM_FAILED" };
    }
    applied.push(next.row);
  }
  return { ok: true, claimed: applied.length, reason: "ATOMIC_CLAIM_OK" };
}

export function cutoverMayTakeOwnership(row: OutboundOwnershipClaim | null): boolean {
  return !row || (row.state !== "SENDING" && row.state !== "SEND_UNCERTAIN");
}

export function evaluateCrossPathOwnershipGateV7(input: {
  legacy_uses_cas: boolean;
  obligation_uses_cas: boolean;
  missing_fails_closed: boolean;
  frozen_blocks_send: boolean;
}): NamedOutboundLoopGate {
  const pass = input.legacy_uses_cas && input.obligation_uses_cas && input.missing_fails_closed && input.frozen_blocks_send;
  return named("CrossPathOwnershipGate", pass ? "PASS" : "FAIL", [
    input.legacy_uses_cas ? "LEGACY_CAS" : "LEGACY_CHECK",
    input.obligation_uses_cas ? "OBLIGATION_CAS" : "OBLIGATION_CHECK",
    input.missing_fails_closed ? "FAIL_CLOSED" : "ABSENT_MEANS_FREE",
  ]);
}
