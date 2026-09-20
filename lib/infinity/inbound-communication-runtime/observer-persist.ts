import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  CALEB_CONVERSATION_ID,
  CALEB_PROVIDER_THREAD_ID,
  CRE_INBOUND_OBSERVER_CADENCE_MS,
  CRE_INBOUND_OBSERVER_FILE,
  MICHAEL_CONVERSATION_ID,
  MICHAEL_PROVIDER_THREAD_ID,
} from "./constants";
import { secretLike } from "./secrets";

export type CreInboundObserverState = {
  provider: "gmail.com_v1";
  mailboxIdentity: "infinitemediaresources@gmail.com";
  historyCheckpointId: string | null;
  lastSuccessfulObservationAt: string | null;
  status: "RUNNING" | "DEGRADED" | "STOPPED";
  trackedConversationIds: string[];
  trackedThreadIds: string[];
  failureCount: number;
  nextEligibleObservationAt: string | null;
  lastProviderError: string | null;
  lastProcessingResult: string | null;
  cadenceMs: number;
  mode: "GMAIL_HISTORY_BOUNDED_POLL";
  runtimeDurability: "LOCAL_RUNTIME_ONLY";
  lastInboundProcessed: string | null;
  activatedAt: string | null;
};

let memory: CreInboundObserverState | null = null;

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_INBOUND_PERSIST !== "1") return false;
  return true;
}

export function emptyCreInboundObserverState(): CreInboundObserverState {
  return {
    provider: "gmail.com_v1",
    mailboxIdentity: "infinitemediaresources@gmail.com",
    historyCheckpointId: null,
    lastSuccessfulObservationAt: null,
    status: "STOPPED",
    trackedConversationIds: [],
    trackedThreadIds: [CALEB_PROVIDER_THREAD_ID, MICHAEL_PROVIDER_THREAD_ID],
    failureCount: 0,
    nextEligibleObservationAt: null,
    lastProviderError: null,
    lastProcessingResult: null,
    cadenceMs: CRE_INBOUND_OBSERVER_CADENCE_MS,
    mode: "GMAIL_HISTORY_BOUNDED_POLL",
    runtimeDurability: "LOCAL_RUNTIME_ONLY",
    lastInboundProcessed: null,
    activatedAt: null,
  };
}

export function resetCreInboundObserverState(): void {
  memory = null;
}

export function readCreInboundObserverState(): CreInboundObserverState | null {
  if (memory) return memory;
  if (!persistEnabled() || !existsSync(CRE_INBOUND_OBSERVER_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(CRE_INBOUND_OBSERVER_FILE, "utf8")) as CreInboundObserverState;
    if (secretLike(JSON.stringify(parsed))) return null;
    return { ...emptyCreInboundObserverState(), ...parsed };
  } catch {
    return null;
  }
}

export function writeCreInboundObserverState(next: CreInboundObserverState): CreInboundObserverState {
  memory = next;
  if (!persistEnabled()) return next;
  const serialized = JSON.stringify(next);
  if (secretLike(serialized)) throw new Error("Secret-like content blocked from inbound observer persistence");
  mkdirSync(dirname(CRE_INBOUND_OBSERVER_FILE), { recursive: true });
  writeFileSync(CRE_INBOUND_OBSERVER_FILE, `${serialized}\n`, "utf8");
  return next;
}

export function expandCreInboundObserverTracking(input: {
  conversationIds: string[];
  threadIds: string[];
}) {
  const prior = readCreInboundObserverState() ?? emptyCreInboundObserverState();
  return writeCreInboundObserverState({
    ...prior,
    trackedConversationIds: [
      ...new Set([
        CALEB_CONVERSATION_ID,
        MICHAEL_CONVERSATION_ID,
        ...prior.trackedConversationIds,
        ...input.conversationIds,
      ]),
    ],
    trackedThreadIds: [
      ...new Set([CALEB_PROVIDER_THREAD_ID, MICHAEL_PROVIDER_THREAD_ID, ...prior.trackedThreadIds, ...input.threadIds]),
    ],
  });
}

export function inspectMailboxObserverHealth() {
  const state = readCreInboundObserverState() ?? emptyCreInboundObserverState();
  return {
    status: state.status,
    provider: state.provider,
    lastCheckpoint: state.historyCheckpointId,
    lastSuccessfulObservation: state.lastSuccessfulObservationAt,
    trackedConversations: state.trackedConversationIds.length,
    lastInboundProcessed: state.lastInboundProcessed,
    lastProviderError: state.lastProviderError,
    cadenceMs: state.cadenceMs,
    runtimeDurability: state.runtimeDurability,
    mode: state.mode,
  };
}
