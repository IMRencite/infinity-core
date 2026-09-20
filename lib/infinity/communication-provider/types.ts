import type { EMAIL_SEND_CAPABILITY } from "@/lib/infinity/provider-capabilities/email-send-capability";
import type {
  COMMUNICATION_ATTEMPT_STATES,
  COMMUNICATION_CAPABILITY_STATES,
  GMAIL_ADAPTER_KEY,
  GMAIL_PROVIDER_ID,
  PROVIDER_FAILURE_CATEGORIES,
} from "./constants";

export type CommunicationCapabilityState = (typeof COMMUNICATION_CAPABILITY_STATES)[number];
export type CommunicationAttemptState = (typeof COMMUNICATION_ATTEMPT_STATES)[number];
export type ProviderFailureCategory = (typeof PROVIDER_FAILURE_CATEGORIES)[number];
export type EmailSendCapabilityName = typeof EMAIL_SEND_CAPABILITY;

export type CommunicationCostClassification = "KNOWN" | "ESTIMATED" | "UNKNOWN";

export type CommunicationCost = {
  classification: CommunicationCostClassification;
  amountUsd: number | null;
  treatedAsZero: false;
};

export type CommunicationAttribution = {
  experimentId: string | null;
  cohortId: string | null;
  prospectId: string | null;
  candidateId: string | null;
  artifactId: string | null;
  channel: string | null;
  attemptId: string | null;
  landingUrl: string | null;
};

export type CommunicationEmailEnvelope = {
  messageId: string;
  attemptId: string;
  organizationId: string;
  ventureId: string | null;
  experimentId: string | null;
  cohortId: string | null;
  prospectId: string | null;
  provider: string;
  capability: EmailSendCapabilityName;
  fromIdentity: string | null;
  toAddress: string;
  subject: string;
  body: string;
  replyTo: string | null;
  landingUrl: string | null;
  attribution: CommunicationAttribution;
  idempotencyKey: string;
  authorizationId: string | null;
  economicExposureCeiling: CommunicationCost;
  createdAt: string;
  providerThreadId?: string | null;
  inReplyTo?: string | null;
};

export type CommunicationIntent = {
  capability: EmailSendCapabilityName;
  envelope: CommunicationEmailEnvelope;
  purpose:
    | "provider_write_verification"
    | "bounded_outreach"
    | "internal_test"
    | "autonomous_reply_write_verification"
    | "autonomous_inbound_reply";
};

export type CommunicationAuthorizationDecision = {
  allowed: boolean;
  authorizationId: string | null;
  reason: string;
  qualificationGate: "PASS" | "FAIL";
  duplicatePrevention: "PASS" | "FAIL";
  idempotency: "PASS" | "FAIL";
  cooldown: "PASS" | "FAIL";
  optOut: "PASS" | "FAIL";
  suppression: "PASS" | "FAIL";
  experimentStateGate: "PASS" | "FAIL";
  deadlineGate: "PASS" | "FAIL";
  providerVerificationGate: "PASS" | "FAIL";
  prospectSendAuthorization: "PASS" | "FAIL";
  channelAllowed: "PASS" | "FAIL";
  contentPolicy: "PASS" | "FAIL";
  attemptCeiling: "PASS" | "FAIL";
  economicCeiling: "PASS" | "FAIL";
  recipientAllowed: "PASS" | "FAIL";
  writeVerificationRecipient: "PASS" | "FAIL";
};

export type CommunicationProviderResult = {
  accepted: boolean;
  delivered: false | true;
  deliveryProven: boolean;
  attemptState: CommunicationAttemptState;
  providerMessageId: string | null;
  providerThreadId: string | null;
  providerTimestamp: string | null;
  failureCategory: ProviderFailureCategory | null;
  failureMessage: string | null;
  cost: CommunicationCost;
};

export type CommunicationAttempt = CommunicationEmailEnvelope & {
  state: CommunicationAttemptState;
  providerResult: CommunicationProviderResult | null;
  authorized: boolean;
};

export type GmailAdapterId = typeof GMAIL_PROVIDER_ID;
export type GmailAdapterKey = typeof GMAIL_ADAPTER_KEY;

export type SuppressionScope = "global" | "venture" | "experiment" | "prospect";

export type SuppressionRecord = {
  scope: SuppressionScope;
  key: string;
  reason: "opt_out" | "bounce" | "complaint" | "manual";
  createdAt: string;
};
