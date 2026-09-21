import type { NamedOutboundLoopGate } from "../closed-loop";
import { COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID, STRANDED_FOUNDER_TRIAL_INBOUND_ID, getCommunicationCutoverEpochValue } from "./cutover";
import { cutoverMayTakeOwnership, getOwnershipClaim } from "./ownership-claim";

export const COMMUNICATION_THREAD_CUTOVER_SCRIPT_V8 = "communication-thread-cutover-v8" as const;

export type CutoverAssertion = { name: string; result: "PASS" | "FAIL"; evidence: string };

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateCommunicationCutoverDryRunGate(assertions: CutoverAssertion[]): NamedOutboundLoopGate {
  const fail = assertions.filter((row) => row.result === "FAIL");
  return named("CommunicationCutoverDryRunGate", fail.length ? "FAIL" : "PASS", fail.length ? fail.map((row) => row.name) : ["ALL_ASSERTIONS"]);
}

export function dryRunCutoverAssertions(input: {
  serving_evidence: boolean;
  attestations: boolean;
  suppression_clear: boolean;
  admission_active: boolean;
  shadow_fresh: boolean;
  epoch: string;
  ownership_state: string | null;
}): CutoverAssertion[] {
  const ownership = getOwnershipClaim({
    mailbox_id: "occupancynpv-canary",
    thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
    answered_inbound_provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
  });
  return [
    { name: "ServingEvidence", result: input.serving_evidence ? "PASS" : "FAIL", evidence: input.serving_evidence ? "BOUND" : "UNBOUND" },
    { name: "Attestations", result: input.attestations ? "PASS" : "FAIL", evidence: input.attestations ? "ATTESTED" : "NOT_ATTESTED" },
    { name: "Suppression", result: input.suppression_clear ? "PASS" : "FAIL", evidence: input.suppression_clear ? "CLEAR" : "BLOCKED" },
    { name: "Admission", result: input.admission_active ? "PASS" : "FAIL", evidence: input.admission_active ? "ACTIVE" : "MISSING" },
    { name: "Shadow", result: input.shadow_fresh ? "PASS" : "FAIL", evidence: input.shadow_fresh ? "FRESH" : "STALE" },
    { name: "EpochLegacy", result: input.epoch === "LEGACY" ? "PASS" : "FAIL", evidence: input.epoch || getCommunicationCutoverEpochValue() },
    { name: "NoSendingConflict", result: cutoverMayTakeOwnership(ownership) && input.ownership_state !== "SENDING" ? "PASS" : "FAIL", evidence: input.ownership_state ?? ownership?.state ?? "ABSENT" },
    { name: "LiveObligationInsert", result: input.serving_evidence && input.admission_active ? "PASS" : "FAIL", evidence: "LOGICAL_ONLY" },
    { name: "OwnershipClaim", result: input.serving_evidence && input.ownership_state !== "SENDING" ? "PASS" : "FAIL", evidence: "LOGICAL_ONLY" },
    { name: "LegacySupersede", result: input.epoch === "LEGACY" ? "PASS" : "FAIL", evidence: "LOGICAL_ONLY" },
    { name: "EpochTransition", result: input.epoch === "LEGACY" && input.serving_evidence && input.attestations ? "PASS" : "FAIL", evidence: "LOGICAL_ONLY" },
    { name: "Rollback", result: "PASS", evidence: "NO_PERSISTENT_MUTATION" },
  ];
}
