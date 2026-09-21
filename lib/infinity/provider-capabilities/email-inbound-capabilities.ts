export const EMAIL_READ_CAPABILITY = "communication.email.read" as const;
export const EMAIL_REPLY_INGEST_CAPABILITY = "communication.email.reply_ingest" as const;
export const EMAIL_THREAD_READ_CAPABILITY = "communication.email.thread.read" as const;
export const EMAIL_SEARCH_CAPABILITY = "communication.email.search" as const;
export const EMAIL_MAILBOX_WATCH_CAPABILITY = "communication.email.mailbox_watch" as const;
export const EMAIL_REPLY_SEND_CAPABILITY = "communication.email.reply.send" as const;
export const EMAIL_SUPPRESSION_WRITE_CAPABILITY = "communication.email.suppression.write" as const;
export const EMAIL_DELIVERY_OBSERVE_CAPABILITY = "communication.email.delivery.observe" as const;

export const EMAIL_ATTACHMENT_READ_CAPABILITY = "communication.email.attachment.read" as const;
export const EMAIL_ATTACHMENT_SEND_CAPABILITY = "communication.email.attachment.send" as const;
export const EMAIL_SCHEDULE_CAPABILITY = "communication.email.schedule" as const;
export const EMAIL_LABELS_READ_CAPABILITY = "communication.email.labels.read" as const;
export const EMAIL_LABELS_WRITE_CAPABILITY = "communication.email.labels.write" as const;
export const EMAIL_SENDER_IDENTITY_READ_CAPABILITY = "communication.email.sender_identity.read" as const;
export const EMAIL_SENDER_IDENTITY_WRITE_CAPABILITY = "communication.email.sender_identity.write" as const;

export const EMAIL_INBOUND_CAPABILITIES = [
  EMAIL_READ_CAPABILITY,
  EMAIL_REPLY_INGEST_CAPABILITY,
  EMAIL_THREAD_READ_CAPABILITY,
  EMAIL_SEARCH_CAPABILITY,
  EMAIL_MAILBOX_WATCH_CAPABILITY,
  EMAIL_REPLY_SEND_CAPABILITY,
  EMAIL_SUPPRESSION_WRITE_CAPABILITY,
  EMAIL_DELIVERY_OBSERVE_CAPABILITY,
] as const;

export const EMAIL_INBOUND_FUTURE_CAPABILITIES = [
  EMAIL_ATTACHMENT_READ_CAPABILITY,
  EMAIL_ATTACHMENT_SEND_CAPABILITY,
  EMAIL_SCHEDULE_CAPABILITY,
  EMAIL_LABELS_READ_CAPABILITY,
  EMAIL_LABELS_WRITE_CAPABILITY,
  EMAIL_SENDER_IDENTITY_READ_CAPABILITY,
  EMAIL_SENDER_IDENTITY_WRITE_CAPABILITY,
] as const;

export type EmailInboundCapability = (typeof EMAIL_INBOUND_CAPABILITIES)[number];
export type EmailInboundFutureCapability = (typeof EMAIL_INBOUND_FUTURE_CAPABILITIES)[number];
export type EmailInboundCapabilityState =
  | "ARCHITECTURE_BUILT"
  | "ARCHITECTURE_BUILT_SCOPE_BLOCKED"
  | "ARCHITECTURE_BUILT_POLLING_FALLBACK"
  | "ARCHITECTURE_BUILT_WRITE_UNVERIFIED"
  | "READ_ONLY_VERIFIED"
  | "LIVE_WRITE_VERIFIED"
  | "PARTIAL"
  | "DEFINED";
