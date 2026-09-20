import type { ConversationStage } from "@/lib/infinity/market-validation-acquisition-runtime/consultative-discovery";
import type { EmailInboundCapability, EmailInboundCapabilityState } from "@/lib/infinity/provider-capabilities/email-inbound-capabilities";

export type ConversationOwnershipState = "INFINITY_MANAGED" | "PAUSED_EXCEPTION" | "CLOSED";
export type ConversationLifecycleState =
  | "AWAITING_INBOUND"
  | "INBOUND_RECEIVED"
  | "REPLY_PLANNED"
  | "REPLY_SENT"
  | "SUPPRESSED"
  | "PAUSED"
  | "CLOSED";

export type ConversationType =
  | "MARKET_VALIDATION_OUTREACH"
  | "PROVIDER_VERIFICATION"
  | "AUTONOMOUS_REPLY_WRITE_VERIFICATION"
  | "UNKNOWN";

export type MessageDirection = "OUTBOUND" | "INBOUND";
export type MessageType = "INITIAL_OUTREACH" | "HUMAN_REPLY" | "AUTONOMOUS_REPLY" | "SYSTEM" | "UNKNOWN";
export type AutomationClassification = "HUMAN" | "AUTOMATED" | "UNKNOWN";

export type InboundEventClass =
  | "HUMAN_REPLY"
  | "AUTOMATED_REPLY"
  | "OUT_OF_OFFICE"
  | "BOUNCE"
  | "DELIVERY_FAILURE"
  | "OPT_OUT"
  | "COMPLAINT"
  | "UNKNOWN";

export type ReplyIntent =
  | "POSITIVE_INTEREST"
  | "REQUEST_MORE_INFORMATION"
  | "PRICING_QUESTION"
  | "MEETING_REQUEST"
  | "OBJECTION"
  | "NOT_INTERESTED"
  | "OPT_OUT"
  | "WRONG_PERSON"
  | "REFERRAL_TO_OTHER_PERSON"
  | "OUT_OF_OFFICE"
  | "BOUNCE"
  | "AUTOMATED_REPLY"
  | "OTHER";

export type PolicyOutcome = "AUTO_EXECUTE" | "ROUTE_TO_GOVERNED_SYSTEM" | "PAUSE_EXCEPTION";

export type DeliveryNormalization =
  | "PROVIDER_ACCEPTED"
  | "DELIVERED"
  | "SOFT_BOUNCE"
  | "HARD_BOUNCE"
  | "REJECTED"
  | "COMPLAINT"
  | "UNKNOWN";

export type SuppressionReason =
  | "OPT_OUT"
  | "HARD_BOUNCE"
  | "COMPLAINT"
  | "INVALID_ADDRESS"
  | "IDENTITY_UNCERTAINTY"
  | "POLICY_BLOCK"
  | "MANUAL_SUPPRESSION";

export type SuppressionScope = "CONTACT_GLOBAL" | "VENTURE" | "EXPERIMENT" | "CHANNEL";

export type AttachmentSecurityState = "UNTRUSTED" | "METADATA_ONLY" | "BLOCKED";

export type CommunicationConversation = {
  id: string;
  organizationId: string;
  ventureId: string;
  experimentId: string | null;
  cohortId: string | null;
  prospectId: string | null;
  customerId: string | null;
  channel: string;
  provider: "gmail.com_v1";
  providerThreadId: string | null;
  subject: string;
  conversationType: ConversationType;
  ownershipState: ConversationOwnershipState;
  conversationState: ConversationLifecycleState;
  strategyProfile: "CONSULTATIVE_DISCOVERY" | "CONTEXT_RICH_CONSULTATIVE";
  currentConversationStage: ConversationStage;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  sourceAttemptId: string | null;
  sourceProviderMessageId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunicationAttachmentMetadata = {
  attachmentId: string;
  providerReference: string | null;
  filename: string;
  mimeType: string;
  size: number;
  messageId: string;
  conversationId: string;
  securityState: AttachmentSecurityState;
};

export type CommunicationMessage = {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  provider: "gmail.com_v1";
  providerMessageId: string | null;
  providerThreadId: string | null;
  sender: string;
  recipients: string[];
  subject: string;
  normalizedContentRef: string;
  normalizedText: string;
  receivedAt: string | null;
  sentAt: string | null;
  messageType: MessageType;
  automationClassification: AutomationClassification;
  providerMetadata: Record<string, string | null>;
  traceability: {
    organizationId: string;
    ventureId: string;
    experimentId: string | null;
    prospectId: string | null;
    sourceAttemptId: string | null;
  };
  attachmentMetadata: CommunicationAttachmentMetadata[];
  safeContentHash: string;
};

export type InboundCommunicationEvent = {
  id: string;
  messageId: string;
  conversationId: string | null;
  provider: "gmail.com_v1";
  ventureId: string | null;
  prospectId: string | null;
  experimentId: string | null;
  sourceOutboundAttemptId: string | null;
  classification: InboundEventClass;
  ingestIdempotencyKey: string;
  createdAt: string;
};

export type IntentClassification = {
  intent: ReplyIntent;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  supportingEvidence: string[];
  sourceMessageId: string;
  uncertainty: boolean;
  recommendedGovernedAction: PolicyOutcome;
};

export type AutonomousCommunicationDecision = {
  outcome: PolicyOutcome;
  reason: string;
  routedSystem: string | null;
  founderApprovalRequired: false;
  liveReplyAuthorized: false | true;
  pauseCode: string | null;
};

export type CommunicationSuppressionRecord = {
  id: string;
  organizationId: string;
  identity: string;
  channel: string;
  reason: SuppressionReason;
  scope: SuppressionScope;
  sourceMessageId: string | null;
  sourceAttemptId: string | null;
  sourceConversationId: string | null;
  createdAt: string;
  status: "ACTIVE" | "RELEASED";
};

export type ReferralCandidate = {
  id: string;
  sourceConversationId: string;
  referrer: string;
  referredIdentity: string;
  sourceEvidence: string;
  qualificationState: "UNQUALIFIED";
  contactAuthorizationState: "NOT_AUTHORIZED";
  createdAt: string;
};

export type GroundedReplyDraft = {
  conversationId: string;
  inboundEventId: string;
  subject: string;
  body: string;
  conversationStage: ConversationStage;
  questionLed: boolean;
  fabricatedClaims: 0;
  liveSend: false;
  replyIdempotencyKey: string;
};

export type CapabilityReadModel = Record<EmailInboundCapability, EmailInboundCapabilityState>;

export type GmailInboundScopeInspection = {
  existingSendCapability: "LIVE_WRITE_VERIFIED" | "READ_ONLY_VERIFIED" | "UNVERIFIED" | "FAILED_VERIFICATION" | "UNAVAILABLE";
  inboundAdapter: "BUILT" | "PARTIAL" | "NOT_BUILT";
  requiredOAuthScopes: string[];
  currentObservedScopes: string[];
  currentTokenSufficient: "YES" | "NO";
  scopeUpgradeRequired: "YES" | "NO";
  missingScopes: string[];
  forbiddenScopesRequested: 0;
};

export type CommunicationHealth = {
  sent: number;
  providerAccepted: number;
  deliveredIfKnown: number;
  hardBounce: number;
  softBounce: number;
  humanReply: number;
  positiveReply: number;
  negativeReply: number;
  optOut: number;
  complaint: number;
  autonomousReply: number;
  providerFailure: number;
  replyLatencyMs: number | null;
  unknownCostTreatedAsZero: false;
};

export type CommunicationIntelligenceProjection = {
  newInboundReplies: number;
  positiveInterest: number;
  pricingQuestions: number;
  meetingRequests: number;
  objections: number;
  negativeReplies: number;
  optOuts: number;
  bounces: number;
  autonomousReplies: number;
  pausedExceptions: number;
  activeConversations: number;
  recentActivity: Array<{
    conversationId: string;
    prospectId: string | null;
    stage: ConversationStage;
    lastIntent: ReplyIntent | null;
    lastOutcome: PolicyOutcome | null;
    updatedAt: string;
  }>;
  conversations: CommunicationConversation[];
  mailboxObserver: {
    status: "RUNNING" | "DEGRADED" | "STOPPED";
    provider: "gmail.com_v1";
    lastCheckpoint: string | null;
    lastSuccessfulObservation: string | null;
    trackedConversations: number;
    lastInboundProcessed: string | null;
    lastProviderError: string | null;
  };
};
