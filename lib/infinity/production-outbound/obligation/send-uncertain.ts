import type { NamedOutboundLoopGate } from "../closed-loop";
import { casOwnership, getOwnershipClaim, type OwnershipState } from "./ownership-claim";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function expireSendingToUncertain(input: {
  mailbox_id: string;
  thread_id: string;
  answered_inbound_provider_message_id: string;
  now: string;
}): { ok: boolean; state: OwnershipState | null } {
  const current = getOwnershipClaim(input);
  if (!current || current.state !== "SENDING") return { ok: false, state: current?.state ?? null };
  const next = casOwnership({
    ...input,
    from: ["SENDING"],
    to: "SEND_UNCERTAIN",
    owner_path: current.owner_path ?? "OBLIGATION",
    owner_id: current.owner_id ?? "unknown",
    expected_version: current.version,
    now: input.now,
    fenced: true,
  });
  return { ok: next.ok, state: next.row?.state ?? current.state };
}

export function resolveUncertainSend(input: {
  provider_found: boolean | null;
}): "SENT" | "RELEASED" | "SEND_UNCERTAIN" {
  if (input.provider_found === true) return "SENT";
  if (input.provider_found === false) return "RELEASED";
  return "SEND_UNCERTAIN";
}

export function evaluateSendUncertaintyGate(results: {
  expired: string;
  found: string;
  absent: string;
  unknown: string;
}): NamedOutboundLoopGate {
  const pass = results.expired === "SEND_UNCERTAIN"
    && results.found === "SENT"
    && results.absent === "RELEASED"
    && results.unknown === "SEND_UNCERTAIN";
  return named("SendUncertaintyGate", pass ? "PASS" : "FAIL", pass ? ["NO_BLIND_RESEND"] : Object.values(results));
}
