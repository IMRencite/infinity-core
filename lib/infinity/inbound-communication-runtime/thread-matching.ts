import { listCommunicationAttempts } from "@/lib/infinity/communication-provider";
import { listConversations, lookupConversationByThread } from "./conversation-store";
import type { CommunicationConversation } from "./types";

export type ThreadMatch =
  | { matched: true; conversation: CommunicationConversation; method: "providerThreadId" | "providerMessageId" | "attempt" | "identity" | "subject_fallback" }
  | { matched: false; conversation: null; method: "NONE"; identityUncertainty: boolean };

export function matchInboundThread(input: {
  providerThreadId?: string | null;
  providerMessageId?: string | null;
  inReplyTo?: string | null;
  sender?: string | null;
  recipients?: string[];
  subject?: string | null;
}): ThreadMatch {
  const thread = input.providerThreadId?.trim() || null;
  if (thread) {
    const byThread = lookupConversationByThread(thread);
    if (byThread) return { matched: true, conversation: byThread, method: "providerThreadId" };
  }
  const headerIds = [input.inReplyTo, input.providerMessageId].filter(Boolean) as string[];
  for (const conversation of listConversations()) {
    if (conversation.sourceProviderMessageId && headerIds.includes(conversation.sourceProviderMessageId)) {
      return { matched: true, conversation, method: "providerMessageId" };
    }
  }
  const attempts = listCommunicationAttempts();
  for (const attempt of attempts) {
    const threadId = attempt.providerResult?.providerThreadId;
    const messageId = attempt.providerResult?.providerMessageId;
    if (thread && threadId === thread) {
      const conversation = listConversations().find((row) => row.sourceAttemptId === attempt.attemptId);
      if (conversation) return { matched: true, conversation, method: "attempt" };
    }
    if (messageId && headerIds.includes(messageId)) {
      const conversation = listConversations().find((row) => row.sourceAttemptId === attempt.attemptId);
      if (conversation) return { matched: true, conversation, method: "attempt" };
    }
  }
  const sender = input.sender?.trim().toLowerCase() ?? "";
  if (sender) {
    const byIdentity = listConversations().filter((row) => {
      const attempt = attempts.find((item) => item.attemptId === row.sourceAttemptId);
      return attempt?.toAddress === sender;
    });
    if (byIdentity.length === 1) return { matched: true, conversation: byIdentity[0], method: "identity" };
    if (byIdentity.length > 1) return { matched: false, conversation: null, method: "NONE", identityUncertainty: true };
  }
  const subject = normalizeSubject(input.subject ?? "");
  if (subject) {
    const bySubject = listConversations().filter((row) => normalizeSubject(row.subject) === subject);
    if (bySubject.length === 1) return { matched: true, conversation: bySubject[0], method: "subject_fallback" };
  }
  return { matched: false, conversation: null, method: "NONE", identityUncertainty: Boolean(sender) && !thread };
}

export function unknownThreadFailClosed(): true {
  return true;
}

function normalizeSubject(subject: string): string {
  return subject.replace(/^(re|fwd):\s*/i, "").trim().toLowerCase();
}
