import { buildId, hashContent, inspectInboundRuntimeState, mutateInboundRuntimeState } from "./persist";
import type { CommunicationMessage } from "./types";
import { ingestInboundMessageFeedback } from "@/lib/infinity/product-improvement-loop/ingest";

export function persistMessage(input: Omit<CommunicationMessage, "id" | "safeContentHash" | "normalizedContentRef"> & {
  id?: string;
}): CommunicationMessage {
  const safeContentHash = hashContent(
    [input.providerMessageId ?? "", input.sender, input.subject, input.normalizedText].join("|"),
  );
  const id = input.id ?? buildId("msg", `${input.conversationId}|${input.providerMessageId ?? safeContentHash}|${input.direction}`);
  const record: CommunicationMessage = {
    ...input,
    id,
    normalizedContentRef: `content:${safeContentHash}`,
    safeContentHash,
  };
  mutateInboundRuntimeState((state) => {
    if (!state.messages.some((row) => row.id === record.id)) state.messages.push(record);
  });
  if (record.direction === "INBOUND" && record.automationClassification === "HUMAN") {
    try {
      ingestInboundMessageFeedback({
        venture_id: record.traceability.ventureId,
        text: record.normalizedText,
        sender: record.sender,
        message_id: record.id,
        thread_id: record.providerThreadId,
        channel: "EMAIL",
        message_type: record.messageType,
        automation: record.automationClassification,
      });
    } catch {
      // Feedback extraction must never block reply handling.
    }
  }
  return record;
}

export function listMessages(conversationId?: string): CommunicationMessage[] {
  const messages = inspectInboundRuntimeState().messages;
  return conversationId ? messages.filter((row) => row.conversationId === conversationId) : messages;
}

export function lookupMessage(id: string): CommunicationMessage | null {
  return inspectInboundRuntimeState().messages.find((row) => row.id === id) ?? null;
}
