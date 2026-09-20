import type { NamedOutboundLoopGate } from "../closed-loop";
import { findCommunicationObligationByIdentity, listCommunicationObligations } from "./store";
import { ingestProviderMessage } from "./worker";
import { COMMUNICATION_TERMINAL_STATES } from "./types";
import { classifyHistoricalInbound, HISTORICAL_INBOUND_COVERAGE } from "./cutover";
import { applyCommunicationObligationTransition } from "./store";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export type ProviderInboundCoverageSnapshot = {
  recent_eligible: number;
  matching_obligations: number;
  missing: number;
  missing_ids: string[];
  ProviderInboundCoverageGate: NamedOutboundLoopGate;
};

export function evaluateProviderInboundCoverage(input: {
  mailbox_id: string;
  messages: Array<{ id: string; role: "PROSPECT" | "SYSTEM" | "INFINITY" | "UNKNOWN"; later_reply: boolean }>;
}): ProviderInboundCoverageSnapshot {
  const eligible = input.messages.filter((row) => row.role === "PROSPECT" && !row.later_reply);
  const missing_ids = eligible
    .filter((row) => !findCommunicationObligationByIdentity(input.mailbox_id, row.id))
    .map((row) => row.id);
  const matching = eligible.length - missing_ids.length;
  return {
    recent_eligible: eligible.length,
    matching_obligations: matching,
    missing: missing_ids.length,
    missing_ids,
    ProviderInboundCoverageGate: named(
      "ProviderInboundCoverageGate",
      missing_ids.length === 0 ? "PASS" : "FAIL",
      missing_ids.length ? missing_ids : ["COVERED"],
    ),
  };
}

export function evaluateCommunicationDiscoveryLatencyGate(input: {
  provider_received_at: string;
  discovered_at: string | null;
  max_ms?: number;
}): NamedOutboundLoopGate {
  if (!input.discovered_at) return named("CommunicationDiscoveryLatencyGate", "FAIL", ["NEVER_DISCOVERED"]);
  const latency = Date.parse(input.discovered_at) - Date.parse(input.provider_received_at);
  const max = input.max_ms ?? 10 * 60 * 1000;
  return named("CommunicationDiscoveryLatencyGate", latency >= 0 && latency <= max ? "PASS" : "FAIL", [`${latency}ms`]);
}

export function coverMissingProspectObligations(input: {
  mailbox_id: string;
  thread_id: string;
  now: string;
  messages: Array<{ id: string; visible: string; received_at: string; role: "PROSPECT" | "SYSTEM" | "INFINITY" | "UNKNOWN" }>;
}): { inserted: number; ids: string[] } {
  const ids: string[] = [];
  for (const message of input.messages) {
    if (message.role !== "PROSPECT") continue;
    const existing = findCommunicationObligationByIdentity(input.mailbox_id, message.id);
    if (existing) continue;
    const historical = classifyHistoricalInbound(message.id);
    if (historical && historical !== "OPEN_OBLIGATION") {
      const ingested = ingestProviderMessage({
        mailbox_id: input.mailbox_id,
        thread_id: input.thread_id,
        provider_message_id: message.id,
        visible_body: message.visible,
        received_at: message.received_at,
        now: input.now,
        same_mailbox_test_mode: true,
        from_self: historical === "SUPPRESSED",
      });
      if (ingested.obligation && ingested.obligation.state === "RECEIVED") {
        const terminal = historical === "SUPPRESSED" ? "SUPPRESSED" : historical === "NO_REPLY_POLICY" ? "NO_REPLY_POLICY" : "COVERED";
        applyCommunicationObligationTransition({
          current: ingested.obligation,
          to_state: terminal,
          expected_version: ingested.obligation.version,
          actor: "HistoricalInboundCoverage",
          reason: `HISTORICAL_${historical}`,
          now: input.now,
          terminal_reason: historical,
          next_action: "DONE",
        });
      }
      continue;
    }
    const ingested = ingestProviderMessage({
      mailbox_id: input.mailbox_id,
      thread_id: input.thread_id,
      provider_message_id: message.id,
      visible_body: message.visible,
      now: input.now,
      received_at: message.received_at,
      same_mailbox_test_mode: true,
    });
    if (ingested.inserted && ingested.obligation) ids.push(ingested.obligation.obligation_id);
  }
  return { inserted: ids.length, ids };
}

export function evaluateHistoricalInboundCoverageGate(input: {
  messages: Array<{ id: string; later_reply?: boolean }>;
}): NamedOutboundLoopGate {
  const missing = input.messages.filter((row) => {
    const classified = classifyHistoricalInbound(row.id);
    return !classified && !row.later_reply;
  });
  const known = Object.keys(HISTORICAL_INBOUND_COVERAGE).length;
  return named(
    "HistoricalInboundCoverageGate",
    missing.length === 0 ? "PASS" : "FAIL",
    missing.length ? missing.map((row) => row.id) : [`COVERED:${known}`],
  );
}

export function evaluateCommunicationCrossPathSendIdempotencyGate(input: {
  first: "OK" | "EXISTING";
  second: "OK" | "EXISTING";
}): NamedOutboundLoopGate {
  return named(
    "CommunicationCrossPathSendIdempotencyGate",
    input.first === "OK" && input.second === "EXISTING" ? "PASS" : "FAIL",
    [input.first, input.second],
  );
}

export function listOpenOverdueObligations(now: string, slo_ms = 20 * 60 * 1000) {
  return listCommunicationObligations().filter((row) => {
    if (COMMUNICATION_TERMINAL_STATES.includes(row.state)) return false;
    return Date.parse(now) - Date.parse(row.received_at) > slo_ms;
  });
}
