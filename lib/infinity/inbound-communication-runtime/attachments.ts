import { buildId } from "./persist";
import type { CommunicationAttachmentMetadata } from "./types";

export function attachmentContentProcessing(): "PARTIAL" {
  return "PARTIAL";
}

export function recordUntrustedAttachment(input: {
  filename: string;
  mimeType: string;
  size: number;
  messageId: string;
  conversationId: string;
  providerReference?: string | null;
}): CommunicationAttachmentMetadata {
  return {
    attachmentId: buildId("att", `${input.conversationId}|${input.messageId}|${input.filename}`),
    providerReference: input.providerReference ?? null,
    filename: input.filename,
    mimeType: input.mimeType,
    size: input.size,
    messageId: input.messageId,
    conversationId: input.conversationId,
    securityState: "UNTRUSTED",
  };
}

export function mayExecuteAttachmentContents(): false {
  return false;
}
