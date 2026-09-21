import type { NamedOutboundLoopGate } from "../closed-loop";
import { FALSE_INFINITY_STOP_MESSAGE_ID, persistSuppressionRecord, type ClosedLoopSuppressionRecord } from "../closed-loop-durable";
import { isStopOnly } from "../conversation-semantics";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function resolveStopSuppression(input: {
  role: "SYSTEM" | "INFINITY" | "PROSPECT" | "UNKNOWN";
  body: string;
  source_message_id: string;
  recipient: string;
  now: string;
}): { action: "NONE" | "ACTIVE" | "PROVISIONAL" | "INVALIDATED_SYSTEM"; record: ClosedLoopSuppressionRecord | null } {
  if (input.source_message_id === FALSE_INFINITY_STOP_MESSAGE_ID || input.role === "SYSTEM" || input.role === "INFINITY") {
    const record = persistSuppressionRecord({
      recipient: input.recipient,
      source_message_id: input.source_message_id,
      at: input.now,
      source_role: "SYSTEM",
    });
    return { action: "INVALIDATED_SYSTEM", record };
  }
  if (!isStopOnly(input.body)) return { action: "NONE", record: null };
  if (input.role === "PROSPECT") {
    return {
      action: "ACTIVE",
      record: persistSuppressionRecord({
        recipient: input.recipient,
        source_message_id: input.source_message_id,
        at: input.now,
        source_role: "PROSPECT",
      }),
    };
  }
  const record = persistSuppressionRecord({
    recipient: input.recipient,
    source_message_id: input.source_message_id,
    at: input.now,
    source_role: "UNKNOWN",
  });
  return { action: "PROVISIONAL", record };
}

export function evaluateProvisionalSuppressionGate(results: {
  system: string;
  prospect: string;
  unknown: string;
  false_stop: string;
}): NamedOutboundLoopGate {
  const pass = results.system === "INVALIDATED_SYSTEM"
    && results.prospect === "ACTIVE"
    && results.unknown === "PROVISIONAL"
    && results.false_stop === "INVALIDATED_SYSTEM";
  return named("ProvisionalSuppressionGate", pass ? "PASS" : "FAIL", pass ? ["ASYMMETRIC_STOP"] : Object.entries(results).map(([key, value]) => `${key}:${value}`));
}
