import { CANONICAL_OCCUPANCYNPV_THREAD_ID } from "../closed-loop-durable";

export const COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID = CANONICAL_OCCUPANCYNPV_THREAD_ID;
export const COMMUNICATION_OBLIGATION_CUTOVER_RUNTIME_VERSION = "communication-release-parity-v2" as const;
export const STRANDED_FOUNDER_TRIAL_INBOUND_ID = "1a0be7a9feee5375" as const;
export const FOUNDER_LIVE_TEST_READINESS_FALSE_POSITIVE = "FOUNDER_LIVE_TEST_READINESS_FALSE_POSITIVE" as const;
export const LIVE_FIRST_PATH_STRANDED_AFTER_OBLIGATION_CUTOVER = "LIVE_FIRST_PATH_STRANDED_AFTER_OBLIGATION_CUTOVER" as const;
export const PRODUCTION_RUNS_PRE_CUTOVER_RELEASE = "PRODUCTION_RUNS_PRE_CUTOVER_RELEASE" as const;
export const COMMUNICATION_OBLIGATION_PERSISTENCE_KIND = "POSTGRES" as const;
export const COMMUNICATION_OBLIGATION_AGE_SLO_MS = 20 * 60 * 1000;
export const COMMUNICATION_CLEAN_LIVE_TURNS_RESET = { clean: 0, required: 3 } as const;
export const EXPECTED_COMMUNICATION_GMAIL_FINGERPRINT = "2c60da8a2c79";
export const EXPECTED_COMMUNICATION_MAILBOX = "hello@imros.io";
export const HISTORICAL_STRANDED_QUESTION_MESSAGE_ID = "1a0badea7b22a70f";
export const HISTORICAL_BUYING_SIGNAL_MESSAGE_ID = "1a0bd44df7eb4ce5";
export const HISTORICAL_FALSE_STOP_MESSAGE_ID = "1a0b254b39f5c645";
export const COMMUNICATION_CUTOVER_EPOCHS = ["LEGACY", "OBLIGATION"] as const;
export type CommunicationCutoverEpoch = (typeof COMMUNICATION_CUTOVER_EPOCHS)[number];

export type HistoricalInboundClassification =
  | "CONFIRMED_RESPONSE"
  | "COVERED"
  | "NO_REPLY_POLICY"
  | "SUPPRESSED"
  | "SUPERSEDED"
  | "OPEN_OBLIGATION";

export const HISTORICAL_INBOUND_COVERAGE: Record<string, HistoricalInboundClassification> = {
  [HISTORICAL_STRANDED_QUESTION_MESSAGE_ID]: "COVERED",
  [HISTORICAL_BUYING_SIGNAL_MESSAGE_ID]: "COVERED",
  [HISTORICAL_FALSE_STOP_MESSAGE_ID]: "SUPPRESSED",
  [STRANDED_FOUNDER_TRIAL_INBOUND_ID]: "OPEN_OBLIGATION",
};

let cutoverForced: boolean | null = null;
let epochMemory: CommunicationCutoverEpoch = "LEGACY";

export function forceCommunicationObligationCutoverForTests(on: boolean | null): void {
  cutoverForced = on;
}

export function getCommunicationCutoverEpochValue(): CommunicationCutoverEpoch {
  return epochMemory;
}

export function setCommunicationCutoverEpochValue(epoch: CommunicationCutoverEpoch): CommunicationCutoverEpoch {
  epochMemory = epoch;
  return epochMemory;
}

export function classifyHistoricalInbound(providerMessageId: string): HistoricalInboundClassification | null {
  return HISTORICAL_INBOUND_COVERAGE[providerMessageId] ?? null;
}

export function isCommunicationObligationCutoverLive(): boolean {
  if (cutoverForced !== null) return cutoverForced;
  if (process.env.VITEST) return process.env.COMMUNICATION_CUTOVER_TEST === "1";
  return epochMemory === "OBLIGATION";
}
export function isCommunicationObligationCutoverThread(threadId: string | null | undefined): boolean {
  if (!threadId) return false;
  if (threadId !== COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID) return false;
  return isCommunicationObligationCutoverLive();
}

export function testThreadCutoverFlags() {
  const on = isCommunicationObligationCutoverLive();
  return {
    thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
    new_obligation_worker: on ? "ON" : "OFF",
    legacy_worker: on ? "OFF" : "ON",
    legacy_job_ownership: on ? "OFF" : "ON",
    legacy_blocked: on ? "OFF" : "ON",
    legacy_classifier_authority: on ? "OFF" : "ON",
    legacy_reconciler_compose: on ? "OFF" : "ON",
    legacy_reconciler_send: on ? "OFF" : "ON",
    watchdog: on ? "ON" : "OFF",
    outbound_write_ahead_ledger: on ? "ON" : "OFF",
    provider_confirmation: on ? "ON" : "OFF",
    communication_obligation: on ? "LIVE" : "SHADOW",
    persistence: COMMUNICATION_OBLIGATION_PERSISTENCE_KIND,
  } as const;
}
