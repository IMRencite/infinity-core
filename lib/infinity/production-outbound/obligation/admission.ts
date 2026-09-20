import type { NamedOutboundLoopGate } from "../closed-loop";
import {
  COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
  HISTORICAL_FALSE_STOP_MESSAGE_ID,
  STRANDED_FOUNDER_TRIAL_INBOUND_ID,
} from "./cutover";

export const ADMISSION_BASES = ["EXPLICIT_RECOVERY", "POST_WATERMARK", "NORMAL_POST_CUTOVER"] as const;
export type AdmissionBasis = (typeof ADMISSION_BASES)[number];

export type SnapshotDenyRow = {
  provider_message_id: string;
  classification: "PRE_CUTOVER_SNAPSHOT";
};

export type RecoveryAdmission = {
  mailbox_id: string;
  provider_message_id: string;
  thread_id: string;
  admission_reason: "EXPLICIT_RECOVERY";
  incident_id: string;
  active: boolean;
  approved_at: string;
  expires_at: string | null;
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function admitProviderMessage(input: {
  provider_message_id: string;
  provider_internal_date_ms: number;
  watermark_ms: number;
  snapshot_deny: Set<string>;
  admission: RecoveryAdmission | null;
  role: "SYSTEM" | "PROSPECT" | "HISTORICAL_UNKNOWN" | "CURRENT_OPEN_PROSPECT";
  mutated_history_id?: boolean;
}): "ADMITTED" | "REJECTED_BY_ADMISSION_BOUNDARY" | "REJECTED_SYSTEM" | "REJECTED_SNAPSHOT" {
  if (input.role === "SYSTEM" || input.provider_message_id === HISTORICAL_FALSE_STOP_MESSAGE_ID) return "REJECTED_SYSTEM";
  if (input.admission?.active && input.admission.provider_message_id === input.provider_message_id) return "ADMITTED";
  if (input.snapshot_deny.has(input.provider_message_id)) return "REJECTED_SNAPSHOT";
  if (input.mutated_history_id) return "REJECTED_BY_ADMISSION_BOUNDARY";
  if (input.provider_internal_date_ms > input.watermark_ms) return "ADMITTED";
  return "REJECTED_BY_ADMISSION_BOUNDARY";
}

export function evaluateImmutableAdmissionBoundaryGate(results: Record<string, string>): NamedOutboundLoopGate {
  const expected = {
    old_new_history: "REJECTED_BY_ADMISSION_BOUNDARY",
    echo: "REJECTED_SYSTEM",
    system_stop: "REJECTED_SYSTEM",
    label_change: "REJECTED_SNAPSHOT",
    new_post_watermark: "ADMITTED",
    dry_run_live: "1",
  };
  const fail = Object.entries(expected).filter(([key, value]) => results[key] !== value);
  return named("ImmutableAdmissionBoundaryGate", fail.length ? "FAIL" : "PASS", fail.length ? fail.map(([key]) => key) : ["ALL_FIXTURES"]);
}

export function recoveryAdmissionForTarget(now: string): RecoveryAdmission {
  return {
    mailbox_id: "occupancynpv-canary",
    provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
    thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
    admission_reason: "EXPLICIT_RECOVERY",
    incident_id: `inc:${COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID}:${STRANDED_FOUNDER_TRIAL_INBOUND_ID}`,
    active: true,
    approved_at: now,
    expires_at: null,
  };
}
