import { INFINITY_MANAGED_SENDER } from "./constants";
import { listConversations } from "./conversation-store";

export type PrivacyDecision = {
  process: boolean;
  reason: "TRACKED_THREAD" | "BOUND_SENDER_ACTIVITY" | "UNRELATED_INBOX";
};

export function evaluateMailboxPrivacy(input: {
  providerThreadId?: string | null;
  sender?: string | null;
  recipients?: string[];
  boundSender?: string;
}): PrivacyDecision {
  const sender = (input.boundSender ?? INFINITY_MANAGED_SENDER).toLowerCase();
  const thread = input.providerThreadId?.trim() || null;
  const tracked = thread ? listConversations().some((row) => row.providerThreadId === thread) : false;
  if (tracked) return { process: true, reason: "TRACKED_THREAD" };
  const participants = [input.sender, ...(input.recipients ?? [])].filter(Boolean).map((item) => item!.toLowerCase());
  if (participants.includes(sender) && tracked) return { process: true, reason: "BOUND_SENDER_ACTIVITY" };
  return { process: false, reason: "UNRELATED_INBOX" };
}

export function excludeUnrelatedInbox(): true {
  return true;
}
