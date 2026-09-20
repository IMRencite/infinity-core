import type { NamedOutboundLoopGate } from "../closed-loop";
import { STRANDED_FOUNDER_TRIAL_INBOUND_ID } from "./cutover";
import { COMMUNICATION_OBLIGATION_AGE_SLO_MS } from "./cutover";

export type RecoveredTurnRecord = {
  provider_message_id: string;
  recovered: true;
  clean: false;
  reason: string;
  marked_at: string;
  marked_before_send: boolean;
};

const memory = new Map<string, RecoveredTurnRecord>();

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function resetRecoveredTurns(): void {
  memory.clear();
}

export function markRecoveredTurn(input: {
  provider_message_id: string;
  now: string;
  reason: string;
  marked_before_send?: boolean;
}): RecoveredTurnRecord {
  const existing = memory.get(input.provider_message_id);
  if (existing) return existing;
  const row: RecoveredTurnRecord = {
    provider_message_id: input.provider_message_id,
    recovered: true,
    clean: false,
    reason: input.reason,
    marked_at: input.now,
    marked_before_send: input.marked_before_send ?? true,
  };
  memory.set(input.provider_message_id, row);
  return row;
}

export function getRecoveredTurn(provider_message_id: string): RecoveredTurnRecord | null {
  return memory.get(provider_message_id) ?? null;
}

export function shouldMarkRecovered(input: {
  provider_message_id: string;
  provider_received_at: string;
  now: string;
  missing_obligation?: boolean;
  release_parity_fail?: boolean;
  repair_required?: boolean;
}): boolean {
  if (input.provider_message_id === STRANDED_FOUNDER_TRIAL_INBOUND_ID) return true;
  if (input.missing_obligation) return true;
  if (input.release_parity_fail) return true;
  if (input.repair_required) return true;
  return Date.parse(input.now) - Date.parse(input.provider_received_at) > COMMUNICATION_OBLIGATION_AGE_SLO_MS;
}

export function evaluateRecoveredTurnMonotonicityGate(input: {
  first: RecoveredTurnRecord;
  later: { recovered?: boolean; clean?: boolean };
}): NamedOutboundLoopGate {
  const pass = input.first.recovered === true
    && input.first.clean === false
    && input.later.recovered !== false
    && input.later.clean !== true;
  return named("RecoveredTurnMonotonicityGate", pass ? "PASS" : "FAIL", [
    input.first.reason,
    input.later.clean === true ? "CLEAN_RECLASSIFIED" : "CLEAN_FALSE",
  ]);
}
