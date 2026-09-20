import type { NamedOutboundLoopGate } from "../closed-loop";
import {
  COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
  HISTORICAL_BUYING_SIGNAL_MESSAGE_ID,
  HISTORICAL_FALSE_STOP_MESSAGE_ID,
  HISTORICAL_STRANDED_QUESTION_MESSAGE_ID,
  STRANDED_FOUNDER_TRIAL_INBOUND_ID,
} from "./cutover";

export type HistoricalClassification =
  | "SYSTEM"
  | "PROSPECT_COVERED"
  | "PROSPECT_SUPPRESSED"
  | "PROSPECT_NO_REPLY"
  | "HISTORICAL_UNKNOWN"
  | "CURRENT_OPEN";

export type HistoricalThreadRow = {
  provider_message_id: string;
  classification: HistoricalClassification;
  evidence: string;
};

export const CUTOVER_WATERMARK_PROVIDER_TIME = "2026-09-20T11:01:41.000Z" as const;

export const HISTORICAL_THREAD_COVERAGE: HistoricalThreadRow[] = [
  { provider_message_id: HISTORICAL_STRANDED_QUESTION_MESSAGE_ID, classification: "PROSPECT_COVERED", evidence: "PRIOR_CONFIRMED_RESPONSE" },
  { provider_message_id: HISTORICAL_BUYING_SIGNAL_MESSAGE_ID, classification: "PROSPECT_COVERED", evidence: "PRIOR_CONFIRMED_RESPONSE" },
  { provider_message_id: HISTORICAL_FALSE_STOP_MESSAGE_ID, classification: "PROSPECT_SUPPRESSED", evidence: "FALSE_STOP_NO_REPLY_POLICY" },
  { provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID, classification: "CURRENT_OPEN", evidence: "STRANDED_RECOVERY_EXCEPTION" },
];

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function classifyThreadMessage(input: {
  provider_message_id: string;
  received_at?: string;
  role_hint?: string;
  in_new_ledger?: boolean;
}): HistoricalClassification {
  const known = HISTORICAL_THREAD_COVERAGE.find((row) => row.provider_message_id === input.provider_message_id);
  if (known) return known.classification;
  if (input.provider_message_id === STRANDED_FOUNDER_TRIAL_INBOUND_ID) return "CURRENT_OPEN";
  if (input.received_at && Date.parse(input.received_at) < Date.parse(CUTOVER_WATERMARK_PROVIDER_TIME)) {
    if (input.role_hint === "INFINITY" || input.role_hint === "SYSTEM") return "SYSTEM";
    if (!input.in_new_ledger) return "HISTORICAL_UNKNOWN";
  }
  return "HISTORICAL_UNKNOWN";
}

export function evaluateHistoricalThreadCoverageGate(rows: HistoricalThreadRow[] = HISTORICAL_THREAD_COVERAGE): NamedOutboundLoopGate {
  const open = rows.filter((row) => row.classification === "CURRENT_OPEN");
  const unknown = rows.filter((row) => row.classification === "HISTORICAL_UNKNOWN");
  const pass = open.length === 1 && open[0]?.provider_message_id === STRANDED_FOUNDER_TRIAL_INBOUND_ID && unknown.length === 0;
  return named("HistoricalThreadCoverageGate", pass ? "PASS" : "FAIL", [
    `open:${open.length}`,
    `unknown:${unknown.length}`,
    COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
  ]);
}

export function evaluateNoResurrectionGate(input: {
  created_obligation_for: string[];
}): NamedOutboundLoopGate {
  const illegal = input.created_obligation_for.filter((id) => id !== STRANDED_FOUNDER_TRIAL_INBOUND_ID && classifyThreadMessage({ provider_message_id: id }) !== "CURRENT_OPEN");
  return named("NoHistoricalResurrectionGate", illegal.length ? "FAIL" : "PASS", illegal.length ? illegal : ["NO_RESURRECTION"]);
}
