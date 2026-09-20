import type { ConversationStage } from "@/lib/infinity/market-validation-acquisition-runtime/consultative-discovery";
import { buildId, mutateInboundRuntimeState, inspectInboundRuntimeState } from "./persist";
import type {
  CommunicationConversation,
  ConversationLifecycleState,
  ConversationOwnershipState,
} from "./types";

export function persistConversation(input: Omit<CommunicationConversation, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  now?: Date;
}): CommunicationConversation {
  const now = (input.now ?? new Date()).toISOString();
  const id =
    input.id ??
    buildId(
      "cnv",
      [input.organizationId, input.providerThreadId ?? "", input.prospectId ?? "", input.sourceAttemptId ?? ""].join("|"),
    );
  let stored: CommunicationConversation | null = null;
  mutateInboundRuntimeState((state) => {
    const existing = state.conversations.find((row) => row.id === id);
    const next: CommunicationConversation = {
      ...input,
      id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existing) {
      Object.assign(existing, next);
      stored = existing;
    } else {
      state.conversations.push(next);
      stored = next;
    }
  });
  return stored!;
}

export function lookupConversation(id: string): CommunicationConversation | null {
  return inspectInboundRuntimeState().conversations.find((row) => row.id === id) ?? null;
}

export function lookupConversationByThread(providerThreadId: string): CommunicationConversation | null {
  return inspectInboundRuntimeState().conversations.find((row) => row.providerThreadId === providerThreadId) ?? null;
}

export function listConversations(): CommunicationConversation[] {
  return inspectInboundRuntimeState().conversations;
}

export function updateConversationState(input: {
  conversationId: string;
  ownershipState?: ConversationOwnershipState;
  conversationState?: ConversationLifecycleState;
  currentConversationStage?: ConversationStage;
  lastInboundAt?: string | null;
  lastOutboundAt?: string | null;
  now?: Date;
}): CommunicationConversation | null {
  let updated: CommunicationConversation | null = null;
  mutateInboundRuntimeState((state) => {
    const existing = state.conversations.find((row) => row.id === input.conversationId);
    if (!existing) return;
    if (input.ownershipState) existing.ownershipState = input.ownershipState;
    if (input.conversationState) existing.conversationState = input.conversationState;
    if (input.currentConversationStage) existing.currentConversationStage = input.currentConversationStage;
    if (input.lastInboundAt !== undefined) existing.lastInboundAt = input.lastInboundAt;
    if (input.lastOutboundAt !== undefined) existing.lastOutboundAt = input.lastOutboundAt;
    existing.updatedAt = (input.now ?? new Date()).toISOString();
    updated = existing;
  });
  return updated;
}
