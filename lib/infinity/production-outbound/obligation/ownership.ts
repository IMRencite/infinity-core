import type { NamedOutboundLoopGate } from "../closed-loop";

export type CommunicationOutboundOwnership = {
  mailbox_id: string;
  thread_id: string;
  answered_inbound_provider_message_id: string;
  owner_path: "LEGACY" | "OBLIGATION";
  owner_id: string;
  created_at: string;
};

const memory = new Map<string, CommunicationOutboundOwnership>();

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

function key(input: { mailbox_id: string; thread_id: string; answered_inbound_provider_message_id: string }): string {
  return `${input.mailbox_id}:${input.thread_id}:${input.answered_inbound_provider_message_id}`;
}

export function resetOutboundOwnership(): void {
  memory.clear();
}

export function acquireOutboundOwnership(input: CommunicationOutboundOwnership): { ok: boolean; existing: CommunicationOutboundOwnership | null } {
  const id = key(input);
  const existing = memory.get(id) ?? null;
  if (existing && (existing.owner_path !== input.owner_path || existing.owner_id !== input.owner_id)) {
    return { ok: false, existing };
  }
  memory.set(id, input);
  return { ok: true, existing };
}

export function getOutboundOwnership(input: {
  mailbox_id: string;
  thread_id: string;
  answered_inbound_provider_message_id: string;
}): CommunicationOutboundOwnership | null {
  return memory.get(key(input)) ?? null;
}

export function evaluateCommunicationCrossPathSendIdempotencyGate(input: {
  first: CommunicationOutboundOwnership;
  second: CommunicationOutboundOwnership;
}): NamedOutboundLoopGate {
  const sameKey = key(input.first) === key(input.second);
  const conflict = sameKey && (input.first.owner_path !== input.second.owner_path || input.first.owner_id !== input.second.owner_id);
  return named("CommunicationCrossPathSendIdempotencyGate", sameKey && !conflict ? "PASS" : conflict ? "FAIL" : "FAIL", [
    input.first.owner_path,
    input.second.owner_path,
    conflict ? "DUAL_OWNER" : "SINGLE_OWNER",
  ]);
}

export function evaluateLegacySendEpochCheckGate(input: {
  database_epoch: "LEGACY" | "FROZEN" | "OBLIGATION";
  cached_startup_flag?: "LEGACY" | "FROZEN" | "OBLIGATION" | null;
  attempted_legacy_send: boolean;
}): NamedOutboundLoopGate {
  if (input.database_epoch === "FROZEN" && input.attempted_legacy_send) {
    return named("LegacySendEpochCheckGate", "FAIL", ["LEGACY_SEND_WHILE_FROZEN"]);
  }
  if (input.database_epoch === "OBLIGATION" && input.attempted_legacy_send) {
    return named("LegacySendEpochCheckGate", "FAIL", ["LEGACY_SEND_AFTER_OBLIGATION_EPOCH"]);
  }
  return named("LegacySendEpochCheckGate", "PASS", [input.database_epoch, input.cached_startup_flag ?? "NO_CACHE"]);
}
