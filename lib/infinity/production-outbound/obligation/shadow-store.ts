import type { NamedOutboundLoopGate } from "../closed-loop";

export const COMMUNICATION_SHADOW_TABLE = "communication_shadow_attempts" as const;

export type CommunicationShadowAttempt = {
  shadow_id: string;
  mailbox_id: string;
  provider_message_id: string;
  thread_id: string;
  deployment_id: string;
  release_sha: string | null;
  planner_version: string | null;
  offer_truth_version: string | null;
  draft_hash: string | null;
  authorship: string;
  intent: string | null;
  first_touch: boolean;
  hard_gates: string;
  soft_gates: string;
  fallback: "AVAILABLE" | "NOT_AVAILABLE";
  threading: string;
  send_authority: false;
  terminal: "SHADOW_PASS" | "SHADOW_FAIL";
  created_at: string;
};

const shadows = new Map<string, CommunicationShadowAttempt>();

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function resetCommunicationShadowAttempts(): void {
  shadows.clear();
}

export function insertCommunicationShadowAttempt(row: CommunicationShadowAttempt): CommunicationShadowAttempt {
  shadows.set(row.shadow_id, { ...row, send_authority: false });
  return shadows.get(row.shadow_id)!;
}

export function listCommunicationShadowAttempts(): CommunicationShadowAttempt[] {
  return [...shadows.values()];
}

export function evaluateShadowStorageIsolationGate(input: {
  live_table: string;
  shadow_table: string;
  send_authority: boolean;
  visible_to_claim: boolean;
}): NamedOutboundLoopGate {
  const pass = input.live_table !== input.shadow_table
    && input.shadow_table === COMMUNICATION_SHADOW_TABLE
    && input.send_authority === false
    && input.visible_to_claim === false;
  return named("CommunicationShadowStorageIsolationGate", pass ? "PASS" : "FAIL", [
    input.shadow_table,
    input.send_authority ? "HAS_SEND_AUTHORITY" : "NO_SEND_AUTHORITY",
  ]);
}
