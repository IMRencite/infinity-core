import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { INBOUND_DURABLE_STATE_FILE } from "./constants";
import { resetInboundReadCapabilityStates } from "./capabilities";
import { resetAutonomousReplyWriteArtifact } from "./autonomous-reply-write-persist";
import { resetCreInboundObserverState } from "./observer-persist";
import { assertNoSecrets } from "./secrets";
import type {
  CommunicationConversation,
  CommunicationMessage,
  CommunicationSuppressionRecord,
  InboundCommunicationEvent,
  ReferralCandidate,
} from "./types";

export type InboundRuntimeState = {
  conversations: CommunicationConversation[];
  messages: CommunicationMessage[];
  events: InboundCommunicationEvent[];
  suppressions: CommunicationSuppressionRecord[];
  referrals: ReferralCandidate[];
  processedIngestKeys: string[];
  processedReplyKeys: string[];
};

const memory: InboundRuntimeState = emptyState();

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_INBOUND_PERSIST !== "1") return false;
  return true;
}

function emptyState(): InboundRuntimeState {
  return {
    conversations: [],
    messages: [],
    events: [],
    suppressions: [],
    referrals: [],
    processedIngestKeys: [],
    processedReplyKeys: [],
  };
}

export function resetInboundCommunicationRuntime(): void {
  memory.conversations = [];
  memory.messages = [];
  memory.events = [];
  memory.suppressions = [];
  memory.referrals = [];
  memory.processedIngestKeys = [];
  memory.processedReplyKeys = [];
  resetInboundReadCapabilityStates();
  resetAutonomousReplyWriteArtifact();
  resetCreInboundObserverState();
}

export function inspectInboundRuntimeState(): InboundRuntimeState {
  return {
    conversations: [...memory.conversations],
    messages: [...memory.messages],
    events: [...memory.events],
    suppressions: [...memory.suppressions],
    referrals: [...memory.referrals],
    processedIngestKeys: [...memory.processedIngestKeys],
    processedReplyKeys: [...memory.processedReplyKeys],
  };
}

export function mutateInboundRuntimeState(mutator: (state: InboundRuntimeState) => void): InboundRuntimeState {
  mutator(memory);
  persistInboundRuntimeState();
  return inspectInboundRuntimeState();
}

export function hashContent(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

export function buildId(prefix: string, raw: string): string {
  return `${prefix}_${createHash("sha256").update(raw).digest("hex").slice(0, 16)}`;
}

export function persistInboundRuntimeState(file = INBOUND_DURABLE_STATE_FILE): void {
  if (!persistEnabled()) return;
  const serialized = JSON.stringify(memory);
  assertNoSecrets(serialized);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${serialized}\n`, "utf8");
}

export function hydrateInboundRuntimeState(file = INBOUND_DURABLE_STATE_FILE): InboundRuntimeState | null {
  if (!persistEnabled() || !existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as InboundRuntimeState;
    assertNoSecrets(parsed);
    memory.conversations = parsed.conversations ?? [];
    memory.messages = parsed.messages ?? [];
    memory.events = parsed.events ?? [];
    memory.suppressions = parsed.suppressions ?? [];
    memory.referrals = parsed.referrals ?? [];
    memory.processedIngestKeys = parsed.processedIngestKeys ?? [];
    memory.processedReplyKeys = parsed.processedReplyKeys ?? [];
    return inspectInboundRuntimeState();
  } catch {
    return null;
  }
}
