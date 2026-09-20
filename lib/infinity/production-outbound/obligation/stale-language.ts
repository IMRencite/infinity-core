import type { NamedOutboundLoopGate } from "../closed-loop";

const MISLEADING = /\bjust saw this\b|\bjust now\b|\bquick reply\b|\bright away\b|\bjust got this\b|\bjust catching this\b/i;

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateStaleConversationLanguageGate(input: {
  generated: string;
  inbound_age_ms: number;
  stale_after_ms?: number;
}): NamedOutboundLoopGate {
  const staleAfter = input.stale_after_ms ?? 20 * 60 * 1000;
  if (input.inbound_age_ms <= staleAfter) {
    return named("StaleConversationLanguageGate", "PASS", ["NOT_STALE"]);
  }
  if (MISLEADING.test(input.generated)) {
    return named("StaleConversationLanguageGate", "FAIL", ["MISLEADING_FRESHNESS"]);
  }
  return named("StaleConversationLanguageGate", "PASS", ["NO_FALSE_IMMEDIACY"]);
}

export const DELAY_ACKNOWLEDGMENT_DECISION = "NOT_REQUIRED" as const;
