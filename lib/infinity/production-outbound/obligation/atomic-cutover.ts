import type { NamedOutboundLoopGate } from "../closed-loop";
import { COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID, STRANDED_FOUNDER_TRIAL_INBOUND_ID, setCommunicationCutoverEpochValue, getCommunicationCutoverEpochValue } from "./cutover";
import { acquireOutboundOwnership } from "./ownership";
import { flipCommunicationCutoverEpoch } from "./release";

export type LegacyJobRecord = {
  job_id: string;
  state: string;
  failure_reason: string | null;
  superseded_by_obligation_id: string | null;
};

const legacyJobs = new Map<string, LegacyJobRecord>();

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function resetAtomicCutoverState(): void {
  legacyJobs.clear();
}

export function seedLegacyJob(job: LegacyJobRecord): void {
  legacyJobs.set(job.job_id, job);
}

export function getLegacyJob(job_id: string): LegacyJobRecord | null {
  return legacyJobs.get(job_id) ?? null;
}

export function atomicFlipThreadToObligation(input: {
  now: string;
  mailbox_id: string;
  thread_id?: string;
  inbound_id?: string;
  obligation_id: string;
}): {
  epoch: "OBLIGATION";
  job: LegacyJobRecord;
} {
  const thread = input.thread_id ?? COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID;
  const inbound = input.inbound_id ?? STRANDED_FOUNDER_TRIAL_INBOUND_ID;
  const job_id = `job:${thread}:${inbound}`;
  const job = legacyJobs.get(job_id) ?? {
    job_id,
    state: "BLOCKED",
    failure_reason: "ESCALATE_VISIBLE",
    superseded_by_obligation_id: null,
  };
  job.state = "SUPERSEDED_BY_OBLIGATION";
  job.failure_reason = "PRODUCTION_OBLIGATION_CUTOVER";
  job.superseded_by_obligation_id = input.obligation_id;
  legacyJobs.set(job_id, job);
  acquireOutboundOwnership({
    mailbox_id: input.mailbox_id,
    thread_id: thread,
    answered_inbound_provider_message_id: inbound,
    owner_path: "OBLIGATION",
    owner_id: input.obligation_id,
    created_at: input.now,
  });
  flipCommunicationCutoverEpoch("OBLIGATION", input.now);
  setCommunicationCutoverEpochValue("OBLIGATION");
  return { epoch: "OBLIGATION", job };
}

export function evaluateAtomicCommunicationCutoverGate(input: {
  pre_epoch: "LEGACY" | "OBLIGATION";
  post_epoch: "LEGACY" | "OBLIGATION";
  job_state: string;
  ownership_path: "LEGACY" | "OBLIGATION" | null;
  same_transaction: boolean;
}): NamedOutboundLoopGate {
  const pass = input.pre_epoch === "LEGACY"
    && input.post_epoch === "OBLIGATION"
    && input.job_state === "SUPERSEDED_BY_OBLIGATION"
    && input.ownership_path === "OBLIGATION"
    && input.same_transaction;
  return named("AtomicCommunicationCutoverGate", pass ? "PASS" : "FAIL", [
    input.pre_epoch,
    input.post_epoch,
    input.job_state,
    input.ownership_path ?? "NO_OWNERSHIP",
  ]);
}

export function evaluateLegacyJobCannotResurrectGate(input: {
  job: LegacyJobRecord;
  reconciler_claimed: boolean;
  scheduler_claimed: boolean;
  worker_sent: boolean;
}): NamedOutboundLoopGate {
  const pass = input.job.state === "SUPERSEDED_BY_OBLIGATION"
    && !input.reconciler_claimed
    && !input.scheduler_claimed
    && !input.worker_sent;
  return named("LegacyJobCannotResurrectGate", pass ? "PASS" : "FAIL", [
    input.job.state,
    input.reconciler_claimed ? "RECONCILER_CLAIMED" : "RECONCILER_HELD",
  ]);
}

export function currentEpoch(): ReturnType<typeof getCommunicationCutoverEpochValue> {
  return getCommunicationCutoverEpochValue();
}
