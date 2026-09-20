import type { NamedOutboundLoopGate } from "../closed-loop";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateThreadingPreparationGate(input: {
  thread_id: string;
  intended_thread_id: string;
  subject: string | null;
  target_rfc_message_id: string | null;
  in_reply_to: string | null;
  references: string | null;
  created_gmail_draft: boolean;
}): NamedOutboundLoopGate {
  const pass = input.thread_id === input.intended_thread_id
    && Boolean(input.subject)
    && Boolean(input.target_rfc_message_id)
    && input.in_reply_to === input.target_rfc_message_id
    && Boolean(input.references?.includes(input.target_rfc_message_id ?? ""))
    && !input.created_gmail_draft;
  return named("ThreadingPreparationGate", pass ? "PASS" : "FAIL", [
    input.thread_id === input.intended_thread_id ? "SAME_THREAD" : "THREAD_MISMATCH",
    input.in_reply_to === input.target_rfc_message_id ? "IN_REPLY_TO" : "IN_REPLY_TO_MISSING",
    input.created_gmail_draft ? "DRAFT_CREATED" : "NO_DRAFT",
  ]);
}

export function buildReferencesChain(prior: string | null, targetRfc: string): string {
  const parts = (prior ?? "").split(/\s+/).map((row) => row.trim()).filter(Boolean);
  if (!parts.includes(targetRfc)) parts.push(targetRfc);
  return parts.join(" ");
}
