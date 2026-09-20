import type { NamedOutboundLoopGate } from "../closed-loop";
import { COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID, STRANDED_FOUNDER_TRIAL_INBOUND_ID, getCommunicationCutoverEpochValue, setCommunicationCutoverEpochValue, type CommunicationCutoverEpoch } from "./cutover";
import { casOwnership, cutoverMayTakeOwnership, ensureOwnershipRow, getOwnershipClaim, type OutboundOwnershipClaim } from "./ownership-claim";
import { seedLegacyJob, getLegacyJob } from "./atomic-cutover";
import { flipCommunicationCutoverEpoch } from "./release";

export const COMMUNICATION_THREAD_CUTOVER_SCRIPT_V7 = "communication-thread-cutover-v7" as const;
export const CUTOVER_ACTOR_V7 = "cutover-script@v7" as const;

export type CutoverV7Preconditions = {
  recovery_ready: boolean;
  serving_deployment: string;
  shadow_deployment: string;
  shadow_fresh: boolean;
  epoch: CommunicationCutoverEpoch;
  recovered_incident: boolean;
  mailbox_attested: boolean;
  offer_attested: boolean;
  suppression_clear: boolean;
  admission_active: boolean;
  watermark_present: boolean;
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateCutoverPreconditionsV7(input: CutoverV7Preconditions): NamedOutboundLoopGate {
  const fail: string[] = [];
  if (!input.recovery_ready) fail.push("NOT_RECOVERY_READY");
  if (input.serving_deployment !== input.shadow_deployment) fail.push("SHADOW_DEPLOYMENT_MISMATCH");
  if (!input.shadow_fresh) fail.push("SHADOW_STALE");
  if (input.epoch !== "LEGACY") fail.push("EPOCH_NOT_LEGACY");
  if (!input.recovered_incident) fail.push("NO_INCIDENT");
  if (!input.mailbox_attested) fail.push("MAILBOX_UNATTESTED");
  if (!input.offer_attested) fail.push("OFFER_UNATTESTED");
  if (!input.suppression_clear) fail.push("SUPPRESSION_NOT_CLEAR");
  if (!input.admission_active) fail.push("ADMISSION_INACTIVE");
  if (!input.watermark_present) fail.push("NO_WATERMARK");
  return named("CommunicationCutoverPreconditionsV7", fail.length ? "FAIL" : "PASS", fail.length ? fail : ["ALL_PRECONDITIONS"]);
}

export function atomicFlipThreadToObligationV7(input: {
  now: string;
  mailbox_id: string;
  obligation_id: string;
  preconditions: CutoverV7Preconditions;
  ownership?: OutboundOwnershipClaim | null;
}): {
  ok: boolean;
  transaction: "COMMITTED" | "ROLLED_BACK";
  frozen_entered: boolean;
  live_obligation_created: boolean;
  recovered_inherited: boolean;
  clean_eligible: false;
  ownership_established: boolean;
  legacy_job: string;
  final_epoch: CommunicationCutoverEpoch;
  reason: string;
} {
  const gate = evaluateCutoverPreconditionsV7(input.preconditions);
  const existing = input.ownership ?? getOwnershipClaim({
    mailbox_id: input.mailbox_id,
    thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
    answered_inbound_provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
  });
  if (gate.result !== "PASS" || !cutoverMayTakeOwnership(existing ?? null)) {
    return {
      ok: false,
      transaction: "ROLLED_BACK",
      frozen_entered: false,
      live_obligation_created: false,
      recovered_inherited: false,
      clean_eligible: false,
      ownership_established: false,
      legacy_job: getLegacyJob(`job:${COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID}:${STRANDED_FOUNDER_TRIAL_INBOUND_ID}`)?.state ?? "UNCHANGED",
      final_epoch: getCommunicationCutoverEpochValue(),
      reason: !cutoverMayTakeOwnership(existing ?? null) ? "OWNERSHIP_SENDING" : gate.reasons[0] ?? "PRECONDITION_FAIL",
    };
  }
  setCommunicationCutoverEpochValue("FROZEN");
  flipCommunicationCutoverEpoch("FROZEN", input.now);
  seedLegacyJob({
    job_id: `job:${COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID}:${STRANDED_FOUNDER_TRIAL_INBOUND_ID}`,
    state: "SUPERSEDED_BY_OBLIGATION",
    failure_reason: "PRODUCTION_OBLIGATION_CUTOVER_V7",
    superseded_by_obligation_id: input.obligation_id,
  });
  const row = ensureOwnershipRow({
    mailbox_id: input.mailbox_id,
    thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
    answered_inbound_provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
    now: input.now,
  });
  const claimed = casOwnership({
    mailbox_id: row.mailbox_id,
    thread_id: row.thread_id,
    answered_inbound_provider_message_id: row.answered_inbound_provider_message_id,
    from: ["AVAILABLE"],
    to: "CLAIMED",
    owner_path: "OBLIGATION",
    owner_id: input.obligation_id,
    expected_version: row.version,
    now: input.now,
    fenced: true,
  });
  if (!claimed.ok) {
    setCommunicationCutoverEpochValue("LEGACY");
    flipCommunicationCutoverEpoch("LEGACY", input.now);
    return {
      ok: false,
      transaction: "ROLLED_BACK",
      frozen_entered: true,
      live_obligation_created: false,
      recovered_inherited: false,
      clean_eligible: false,
      ownership_established: false,
      legacy_job: "ROLLED_BACK",
      final_epoch: "LEGACY",
      reason: claimed.reason,
    };
  }
  setCommunicationCutoverEpochValue("OBLIGATION");
  flipCommunicationCutoverEpoch("OBLIGATION", input.now);
  return {
    ok: true,
    transaction: "COMMITTED",
    frozen_entered: true,
    live_obligation_created: true,
    recovered_inherited: true,
    clean_eligible: false,
    ownership_established: true,
    legacy_job: "SUPERSEDED_BY_OBLIGATION",
    final_epoch: "OBLIGATION",
    reason: "COMMITTED",
  };
}

export function evaluateCommunicationSchemaCompatibilityGate(input: {
  dropped_live_uniqueness: boolean;
  shadow_separate: boolean;
  ownership_columns_added: boolean;
}): NamedOutboundLoopGate {
  const pass = !input.dropped_live_uniqueness && input.shadow_separate && input.ownership_columns_added;
  return named("CommunicationSchemaCompatibilityGate", pass ? "PASS" : "FAIL", [
    input.dropped_live_uniqueness ? "DROPPED_UNIQUENESS" : "EXPAND_ONLY",
    input.shadow_separate ? "SHADOW_SEPARATE" : "SHADOW_IN_LIVE",
  ]);
}
