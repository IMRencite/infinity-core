import type { NamedOutboundLoopGate } from "../closed-loop";
import { KNOWN_INFINITY_THREAD_MESSAGE_IDS } from "../conversation-semantics";
import { HISTORICAL_FALSE_STOP_MESSAGE_ID } from "./cutover";
import type { CommunicationOutboundLedger } from "./types";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export type AuthorshipRole = "SYSTEM" | "INFINITY" | "PROSPECT" | "QUARANTINED_UNKNOWN";

export function resolveAuthorship(input: {
  provider_message_id: string;
  rfc_message_id?: string | null;
  custom_header?: string | null;
  ledger: CommunicationOutboundLedger[];
  same_mailbox_test_mode?: boolean;
  from_self?: boolean;
  known_system_ids?: string[];
}): { role: AuthorshipRole; role_evidence: string } {
  if (input.provider_message_id === HISTORICAL_FALSE_STOP_MESSAGE_ID) {
    return { role: "SYSTEM", role_evidence: "HISTORICAL_INFINITY_FALSE_STOP" };
  }
  const known = new Set([
    ...KNOWN_INFINITY_THREAD_MESSAGE_IDS,
    ...(input.known_system_ids ?? []),
  ]);
  if (known.has(input.provider_message_id)) {
    return { role: "SYSTEM", role_evidence: "KNOWN_INFINITY_OUTBOUND_LINEAGE" };
  }
  const byProvider = input.ledger.find((row) => row.provider_message_id && row.provider_message_id === input.provider_message_id);
  if (byProvider) return { role: "INFINITY", role_evidence: "LEDGER_PROVIDER_MESSAGE_ID" };
  const byRfc = input.rfc_message_id
    ? input.ledger.find((row) => row.rfc_message_id === input.rfc_message_id)
    : null;
  if (byRfc) return { role: "INFINITY", role_evidence: "LEDGER_RFC_MESSAGE_ID" };
  const byHeader = input.custom_header
    ? input.ledger.find((row) => row.custom_header && row.custom_header === input.custom_header)
    : null;
  if (byHeader) return { role: "INFINITY", role_evidence: "LEDGER_CUSTOM_HEADER" };
  if (input.from_self && !input.same_mailbox_test_mode) {
    return { role: "QUARANTINED_UNKNOWN", role_evidence: "FROM_SELF_NO_LINEAGE" };
  }
  return {
    role: "PROSPECT",
    role_evidence: input.same_mailbox_test_mode ? "SAME_MAILBOX_TEST_PROSPECT" : "NO_LEDGER_MATCH",
  };
}

export function evaluateNoEchoInvariant(input: {
  provider_message_id: string;
  ledger: CommunicationOutboundLedger[];
  created_prospect_obligation: boolean;
}): NamedOutboundLoopGate {
  const outbound = input.ledger.some((row) => row.provider_message_id === input.provider_message_id);
  if (outbound && input.created_prospect_obligation) {
    return named("CommunicationNoEchoGate", "FAIL", ["LEDGER_OUTBOUND_CREATED_PROSPECT_OBLIGATION"]);
  }
  return named("CommunicationNoEchoGate", "PASS", ["NO_ECHO"]);
}

export function insertObligationIdentity(existing: Set<string>, mailbox_id: string, provider_message_id: string): "INSERTED" | "EXISTING" {
  const key = `${mailbox_id}:${provider_message_id}`;
  if (existing.has(key)) return "EXISTING";
  existing.add(key);
  return "INSERTED";
}

export function systemAuthorshipWins(role: AuthorshipRole): boolean {
  return role === "SYSTEM" || role === "INFINITY";
}
