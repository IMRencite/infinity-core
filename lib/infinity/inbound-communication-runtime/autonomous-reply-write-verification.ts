import {
  executeEmailSend,
  hydrateEmailSendCapabilityFromDurableWriteVerification,
  inspectCommunicationCredentialAttestation,
  inspectEmailSendCapabilityState,
  isForbiddenWriteVerificationRecipient,
} from "@/lib/infinity/communication-provider";
import { declaredWriteVerificationMailbox } from "@/lib/infinity/communication-provider/credential-boundary";
import { inspectControlledWriteTarget } from "@/lib/infinity/communication-provider/verification";
import { buildEmailEnvelope, buildEmailIntent } from "@/lib/infinity/communication-provider/envelope";
import { loadServerEnvFromLocalFile, reloadGmailOAuthFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import {
  AUTONOMOUS_REPLY_WRITE_AUTHORIZATION_ID,
  AUTONOMOUS_REPLY_WRITE_SETUP_BODY,
  AUTONOMOUS_REPLY_WRITE_SUBJECT,
  AUTONOMOUS_REPLY_WRITE_VENTURE,
  GMAIL_PROVIDER_ID,
  INFINITY_MANAGED_SENDER,
  LOCKED_ORG,
} from "./constants";
import { classifyInboundEventClass, classifyReplyIntent } from "./intent-classifier";
import { evaluateAutonomousCommunicationPolicy, routineEmailRequiresFounderApproval } from "./autonomous-policy";
import { inferConversationStage } from "./conversation-stage";
import { ingestInboundEvent } from "./inbound-event";
import { persistConversation, lookupConversation, lookupConversationByThread, updateConversationState, listConversations } from "./conversation-store";
import { persistMessage } from "./message-store";
import { classifyThreadDirection, readGmailThread } from "./gmail-inbound-read";
import { hydrateInboundRuntimeState } from "./persist";
import {
  hydrateInboundReadCapabilityFromDurable,
  readInboundReadVerificationArtifact,
  writeInboundReadVerificationArtifact,
} from "./inbound-read-capability";
import { inspectInboundCapabilityStates, markReplySendLiveWriteVerified } from "./capabilities";
import { evidenceContracts } from "./evidence-bridge";
import {
  emptyAutonomousReplyWriteArtifact,
  readAutonomousReplyWriteArtifact,
  writeAutonomousReplyWriteArtifact,
} from "./autonomous-reply-write-persist";
import {
  autonomousReplyWriteVerificationGroundingPass,
  buildAutonomousReplyIdempotencyKey,
  buildAutonomousReplySetupIdempotencyKey,
  generateAutonomousReplyWriteVerificationBody,
  generateAutonomousReplyWriteVerificationSubject,
} from "./verification-reply";
import type { PolicyOutcome, ReplyIntent } from "./types";

export type AutonomousReplyWriteVerificationResult = {
  stopped: boolean;
  waiting: boolean;
  nextBlocker:
    | "CONTROLLED_INBOUND_REPLY_REQUIRED"
    | "CONTROLLED_INBOUND_REPLY_NOT_FOUND"
    | "AUTONOMOUS_REPLY_WRITE_VERIFICATION_FAILED"
    | "AUTONOMOUS_EMAIL_RUNTIME_LIVE";
  confidence: string | null;
  uncertainty: boolean | null;
  supportingEvidence: string[];
  inboundDuplicated: "YES" | "NO";
  attemptId: string | null;
  countedAsAcquisition: false;
  countedAsExperimentEvidence: false;
  threadReadable: "PASS" | "FAIL";
  targetConfigured: "PASS" | "FAIL";
  founderAuthorized: "PASS" | "FAIL";
  targetIsCreProspect: "YES" | "NO";
  mailbox: string | "NONE";
  conversationId: string | null;
  providerThreadId: string | null;
  existingThreadReused: "YES" | "NO";
  setupEmailSent: "YES" | "NO";
  setupProviderMessageId: string | null;
  inboundPresent: "YES" | "NO";
  inboundMessageId: string | null;
  humanReply: "YES" | "NO";
  classification: string | null;
  intent: ReplyIntent | null;
  conversationLinked: "PASS" | "FAIL";
  stageBefore: string | null;
  stageAfter: string | null;
  groundedStageAdvancement: "PASS" | "FAIL";
  policyOutcome: PolicyOutcome | null;
  policyReason: string | null;
  routineFounderApprovalRequired: boolean;
  groundingPass: "PASS" | "FAIL";
  autonomousRepliesAttempted: number;
  providerAccepted: "YES" | "NO";
  replyProviderMessageId: string | null;
  replyProviderThreadId: string | null;
  sameThread: "PASS" | "FAIL";
  delivered: "YES" | "NO" | "UNKNOWN";
  replyIdempotencyKey: string | null;
  duplicateProviderReplies: number;
  replySendBefore: string;
  replySendAfter: string;
  sendCapability: string;
  inboundStates: ReturnType<typeof inspectInboundCapabilityStates>;
  allApplicable: boolean;
  liveReplyExecuted: boolean;
  providerWrites: number;
  evidence: ReturnType<typeof evidenceContracts>;
  attestation: { cursorCredentialAccess: "YES" | "NO"; secretLogging: "YES" | "NO" };
};

function failResult(
  partial: Partial<AutonomousReplyWriteVerificationResult>,
): AutonomousReplyWriteVerificationResult {
  return {
    stopped: true,
    waiting: false,
    nextBlocker: "AUTONOMOUS_REPLY_WRITE_VERIFICATION_FAILED",
    confidence: null,
    uncertainty: null,
    supportingEvidence: [],
    inboundDuplicated: "NO",
    attemptId: null,
    countedAsAcquisition: false,
    countedAsExperimentEvidence: false,
    threadReadable: "FAIL",
    targetConfigured: "FAIL",
    founderAuthorized: "FAIL",
    targetIsCreProspect: "NO",
    mailbox: "NONE",
    conversationId: null,
    providerThreadId: null,
    existingThreadReused: "NO",
    setupEmailSent: "NO",
    setupProviderMessageId: null,
    inboundPresent: "NO",
    inboundMessageId: null,
    humanReply: "NO",
    classification: null,
    intent: null,
    conversationLinked: "FAIL",
    stageBefore: null,
    stageAfter: null,
    groundedStageAdvancement: "FAIL",
    policyOutcome: null,
    policyReason: null,
    routineFounderApprovalRequired: false,
    groundingPass: "FAIL",
    autonomousRepliesAttempted: 0,
    providerAccepted: "NO",
    replyProviderMessageId: null,
    replyProviderThreadId: null,
    sameThread: "FAIL",
    delivered: "UNKNOWN",
    replyIdempotencyKey: null,
    duplicateProviderReplies: 0,
    replySendBefore: inspectInboundCapabilityStates()["communication.email.reply.send"],
    replySendAfter: inspectInboundCapabilityStates()["communication.email.reply.send"],
    sendCapability: inspectEmailSendCapabilityState().state,
    inboundStates: inspectInboundCapabilityStates(),
    allApplicable: false,
    liveReplyExecuted: false,
    providerWrites: 0,
    evidence: evidenceContracts(),
    attestation: { cursorCredentialAccess: "NO", secretLogging: "NO" },
    ...partial,
  };
}

function lookupVerificationConversation() {
  return (
    listConversations().find((row) => row.conversationType === "AUTONOMOUS_REPLY_WRITE_VERIFICATION") ??
    null
  );
}

export async function executeAutonomousReplyWriteVerification(input: {
  fetchImpl?: typeof fetch;
  now?: Date;
  allowSetup?: boolean;
  requiredConversationId?: string;
  requiredThreadId?: string;
} = {}): Promise<AutonomousReplyWriteVerificationResult> {
  loadServerEnvFromLocalFile();
  reloadGmailOAuthFromLocalFile();
  hydrateInboundRuntimeState();
  hydrateInboundReadCapabilityFromDurable();
  const priorReplyWrite = readAutonomousReplyWriteArtifact();
  if (priorReplyWrite?.replySendState === "LIVE_WRITE_VERIFIED") {
    markReplySendLiveWriteVerified();
  }
  hydrateEmailSendCapabilityFromDurableWriteVerification();
  const fetchImpl = input.fetchImpl ?? fetch;
  const now = input.now ?? new Date();
  const sendCapability = inspectEmailSendCapabilityState().state;
  const replySendBefore = inspectInboundCapabilityStates()["communication.email.reply.send"];
  const attestation = inspectCommunicationCredentialAttestation();
  const target = inspectControlledWriteTarget();
  const mailbox = declaredWriteVerificationMailbox();
  const targetConfigured = mailbox ? ("PASS" as const) : ("FAIL" as const);
  const founderAuthorized = attestation.writeVerificationAuthorized ? ("PASS" as const) : ("FAIL" as const);
  const targetIsCreProspect = mailbox && isForbiddenWriteVerificationRecipient(mailbox) ? ("YES" as const) : ("NO" as const);
  if (targetConfigured === "FAIL" || founderAuthorized === "FAIL" || targetIsCreProspect === "YES" || target.safeForProviderVerification !== "YES") {
    return failResult({
      targetConfigured,
      founderAuthorized,
      targetIsCreProspect,
      mailbox: mailbox ?? "NONE",
      sendCapability,
      replySendBefore,
      replySendAfter: replySendBefore,
    });
  }

  let artifact = readAutonomousReplyWriteArtifact() ?? emptyAutonomousReplyWriteArtifact();
  let conversation = lookupVerificationConversation();
  if (!conversation && artifact.conversationId) {
    conversation = lookupConversation(artifact.conversationId);
  }
  if (!conversation && artifact.providerThreadId) {
    conversation = lookupConversationByThread(artifact.providerThreadId);
  }
  if (!conversation && input.requiredConversationId) {
    conversation = lookupConversation(input.requiredConversationId);
  }
  if (!conversation && input.requiredThreadId) {
    conversation = lookupConversationByThread(input.requiredThreadId);
  }

  let setupEmailSent: "YES" | "NO" = "NO";
  let existingThreadReused: "YES" | "NO" = conversation?.providerThreadId || artifact.providerThreadId ? "YES" : "NO";
  let setupProviderMessageId = artifact.setupProviderMessageId;
  let providerThreadId = conversation?.providerThreadId ?? artifact.providerThreadId ?? input.requiredThreadId ?? null;
  let providerWrites = 0;

  if (input.requiredThreadId && providerThreadId && providerThreadId !== input.requiredThreadId) {
    return failResult({
      targetConfigured,
      founderAuthorized,
      targetIsCreProspect,
      mailbox: mailbox!,
      conversationId: conversation?.id ?? null,
      providerThreadId,
      sendCapability,
      replySendBefore,
      replySendAfter: replySendBefore,
      policyReason: "VERIFICATION_THREAD_MISMATCH",
    });
  }
  if (input.requiredConversationId && conversation && conversation.id !== input.requiredConversationId) {
    return failResult({
      targetConfigured,
      founderAuthorized,
      targetIsCreProspect,
      mailbox: mailbox!,
      conversationId: conversation.id,
      providerThreadId,
      sendCapability,
      replySendBefore,
      replySendAfter: replySendBefore,
      policyReason: "VERIFICATION_CONVERSATION_MISMATCH",
    });
  }
  if (input.requiredThreadId) {
    providerThreadId = input.requiredThreadId;
    existingThreadReused = "YES";
  }
  if (input.allowSetup === false) {
    if (!providerThreadId) {
      return failResult({
        targetConfigured,
        founderAuthorized,
        targetIsCreProspect,
        mailbox: mailbox!,
        conversationId: conversation?.id ?? input.requiredConversationId ?? null,
        sendCapability,
        replySendBefore,
        replySendAfter: replySendBefore,
        policyReason: "SECOND_SETUP_EMAIL_BLOCKED",
      });
    }
  }

  if (!providerThreadId && artifact.setupEmailsSent < 1 && input.allowSetup !== false) {
    const setupKey = buildAutonomousReplySetupIdempotencyKey(mailbox!);
    const envelope = buildEmailEnvelope({
      organizationId: LOCKED_ORG,
      ventureId: AUTONOMOUS_REPLY_WRITE_VENTURE,
      experimentId: null,
      cohortId: null,
      prospectId: null,
      fromIdentity: INFINITY_MANAGED_SENDER,
      toAddress: mailbox!,
      subject: AUTONOMOUS_REPLY_WRITE_SUBJECT,
      body: AUTONOMOUS_REPLY_WRITE_SETUP_BODY,
      authorizationId: AUTONOMOUS_REPLY_WRITE_AUTHORIZATION_ID,
      idempotencyKey: setupKey,
    });
    const sent = await executeEmailSend({
      intent: buildEmailIntent(envelope, "autonomous_reply_write_verification"),
      prospectSendAuthorized: true,
      contentApproved: true,
      channelAllowed: true,
      now,
      fetchImpl,
    });
    if (sent.blocked || !sent.attempt.providerResult?.accepted) {
      return failResult({
        targetConfigured,
        founderAuthorized,
        targetIsCreProspect,
        mailbox: mailbox!,
        sendCapability,
        replySendBefore,
        replySendAfter: replySendBefore,
        policyReason: sent.authorization.reason,
        providerWrites: sent.blocked ? 0 : 1,
      });
    }
    setupEmailSent = "YES";
    existingThreadReused = "NO";
    providerWrites += 1;
    setupProviderMessageId = sent.attempt.providerResult.providerMessageId;
    providerThreadId = sent.attempt.providerResult.providerThreadId;
    artifact = {
      ...artifact,
      setupProviderMessageId,
      providerThreadId,
      setupEmailsSent: 1,
    };
    writeAutonomousReplyWriteArtifact(artifact);
  }

  if (!providerThreadId) {
    return failResult({
      targetConfigured,
      founderAuthorized,
      targetIsCreProspect,
      mailbox: mailbox!,
      setupEmailSent,
      setupProviderMessageId,
      sendCapability,
      replySendBefore,
      replySendAfter: replySendBefore,
      providerWrites,
      policyReason: "VERIFICATION_THREAD_MISSING",
    });
  }

  conversation =
    lookupConversationByThread(providerThreadId) ??
    (input.requiredConversationId ? lookupConversation(input.requiredConversationId) : conversation) ??
    persistConversation({
      id: input.requiredConversationId ?? artifact.conversationId ?? conversation?.id,
      organizationId: LOCKED_ORG,
      ventureId: AUTONOMOUS_REPLY_WRITE_VENTURE,
      experimentId: null,
      cohortId: null,
      prospectId: null,
      customerId: null,
      channel: "email",
      provider: GMAIL_PROVIDER_ID,
      providerThreadId,
      subject: AUTONOMOUS_REPLY_WRITE_SUBJECT,
      conversationType: "AUTONOMOUS_REPLY_WRITE_VERIFICATION",
      ownershipState: "INFINITY_MANAGED",
      conversationState: "AWAITING_INBOUND",
      strategyProfile: "CONSULTATIVE_DISCOVERY",
      currentConversationStage: conversation?.currentConversationStage ?? "OPEN_CONTEXT+CURRENT_PROCESS",
      lastInboundAt: conversation?.lastInboundAt ?? null,
      lastOutboundAt: conversation?.lastOutboundAt ?? now.toISOString(),
      sourceAttemptId: conversation?.sourceAttemptId ?? null,
      sourceProviderMessageId: setupProviderMessageId,
      now,
    });
  if (conversation.providerThreadId !== providerThreadId) {
    persistConversation({
      ...conversation,
      providerThreadId,
      now,
    });
    conversation = lookupConversation(conversation.id) ?? conversation;
  }
  artifact = { ...artifact, conversationId: conversation.id, providerThreadId };
  writeAutonomousReplyWriteArtifact(artifact);

  const thread = await readGmailThread({ threadId: providerThreadId, fetchImpl });
  if (!thread.ok) {
    return failResult({
      targetConfigured,
      founderAuthorized,
      targetIsCreProspect,
      mailbox: mailbox!,
      conversationId: conversation.id,
      providerThreadId,
      existingThreadReused,
      setupEmailSent,
      setupProviderMessageId,
      conversationLinked: "PASS",
      sendCapability,
      replySendBefore,
      replySendAfter: replySendBefore,
      providerWrites,
      policyReason: thread.reason,
      threadReadable: "FAIL",
    });
  }

  const inbound = thread.messages.filter((row) => classifyThreadDirection(row, mailbox!) === "INBOUND");
  const inboundMessage = inbound[inbound.length - 1] ?? null;
  if (!inboundMessage) {
    return {
      stopped: true,
      waiting: true,
      nextBlocker: input.allowSetup === false ? "CONTROLLED_INBOUND_REPLY_NOT_FOUND" : "CONTROLLED_INBOUND_REPLY_REQUIRED",
      targetConfigured,
      founderAuthorized,
      targetIsCreProspect,
      mailbox: mailbox!,
      conversationId: conversation.id,
      providerThreadId,
      existingThreadReused,
      setupEmailSent,
      setupProviderMessageId,
      inboundPresent: "NO",
      inboundMessageId: null,
      humanReply: "NO",
      classification: null,
      intent: null,
      conversationLinked: "PASS",
      stageBefore: conversation.currentConversationStage,
      stageAfter: conversation.currentConversationStage,
      groundedStageAdvancement: "PASS",
      policyOutcome: null,
      policyReason: input.allowSetup === false ? "CONTROLLED_INBOUND_REPLY_NOT_FOUND" : "CONTROLLED_INBOUND_REPLY_REQUIRED",
      threadReadable: "PASS",
      routineFounderApprovalRequired: false,
      groundingPass: "FAIL",
      autonomousRepliesAttempted: artifact.autonomousRepliesAttempted,
      providerAccepted: "NO",
      replyProviderMessageId: null,
      replyProviderThreadId: null,
      sameThread: "PASS",
      delivered: "UNKNOWN",
      replyIdempotencyKey: null,
      duplicateProviderReplies: 0,
      replySendBefore,
      replySendAfter: replySendBefore,
      sendCapability,
      inboundStates: inspectInboundCapabilityStates(),
      allApplicable: false,
      liveReplyExecuted: false,
      providerWrites,
      confidence: null,
      uncertainty: null,
      supportingEvidence: [],
      inboundDuplicated: "NO",
      attemptId: null,
      countedAsAcquisition: false,
      countedAsExperimentEvidence: false,
      evidence: evidenceContracts(),
      attestation: {
        cursorCredentialAccess: attestation.codingAgentCredentialAccess ? "YES" : "NO",
        secretLogging: attestation.secretLogging ? "YES" : "NO",
      },
    };
  }

  const ingested = ingestInboundEvent({
    providerMessageId: inboundMessage.id,
    providerThreadId,
    inReplyTo: inboundMessage.inReplyTo,
    sender: mailbox!,
    recipients: [INFINITY_MANAGED_SENDER],
    subject: inboundMessage.subject,
    text: inboundMessage.bodyText || inboundMessage.snippet,
    receivedAt: now.toISOString(),
  });
  const second = ingestInboundEvent({
    providerMessageId: inboundMessage.id,
    providerThreadId,
    sender: mailbox!,
    recipients: [INFINITY_MANAGED_SENDER],
    subject: inboundMessage.subject,
    text: inboundMessage.bodyText || inboundMessage.snippet,
  });
  const eventClass = classifyInboundEventClass(inboundMessage.bodyText || inboundMessage.snippet);
  const classified = classifyReplyIntent({
    text: inboundMessage.bodyText || inboundMessage.snippet,
    sourceMessageId: inboundMessage.id,
  });
  const stageBefore = conversation.currentConversationStage;
  const stageAfter = inferConversationStage({
    current: stageBefore,
    inboundText: inboundMessage.bodyText || inboundMessage.snippet,
    intent: classified.intent,
  });
  const policy = classified.uncertainty
    ? evaluateAutonomousCommunicationPolicy({
        classification: classified,
        identityCertain: false,
        trackedThread: true,
      })
    : evaluateAutonomousCommunicationPolicy({
        classification: classified,
        identityCertain: true,
        trackedThread: true,
      });
  updateConversationState({
    conversationId: conversation.id,
    currentConversationStage: stageAfter,
    conversationState: "INBOUND_RECEIVED",
    lastInboundAt: now.toISOString(),
  });
  const body = generateAutonomousReplyWriteVerificationBody();
  const groundingPass = autonomousReplyWriteVerificationGroundingPass(body) ? ("PASS" as const) : ("FAIL" as const);
  const replyKey = buildAutonomousReplyIdempotencyKey({
    conversationId: conversation.id,
    inboundMessageId: inboundMessage.id,
  });

  const inboundOk = ingested.accepted || ingested.duplicate;
  const inboundDuplicated =
    second.duplicate || ingested.duplicate ? ("NO" as const) : ingested.accepted && second.accepted ? ("YES" as const) : ("NO" as const);
  if (policy.outcome !== "AUTO_EXECUTE" || groundingPass === "FAIL" || !inboundOk) {
    return failResult({
      stopped: true,
      targetConfigured,
      founderAuthorized,
      targetIsCreProspect,
      mailbox: mailbox!,
      conversationId: conversation.id,
      providerThreadId,
      existingThreadReused,
      setupEmailSent,
      setupProviderMessageId,
      inboundPresent: "YES",
      inboundMessageId: inboundMessage.id,
      humanReply: eventClass === "HUMAN_REPLY" ? "YES" : "NO",
      classification: eventClass,
      intent: classified.intent,
      conversationLinked: inboundOk ? "PASS" : "FAIL",
      stageBefore,
      stageAfter,
      groundedStageAdvancement: stageAfter !== stageBefore || classified.intent === "REQUEST_MORE_INFORMATION" ? "PASS" : "FAIL",
      policyOutcome: policy.outcome,
      policyReason: policy.reason,
      routineFounderApprovalRequired: routineEmailRequiresFounderApproval(),
      groundingPass,
      replyIdempotencyKey: replyKey,
      sendCapability,
      replySendBefore,
      replySendAfter: replySendBefore,
      providerWrites,
      threadReadable: "PASS",
      confidence: classified.confidence,
      uncertainty: classified.uncertainty,
      supportingEvidence: classified.supportingEvidence,
      inboundDuplicated,
      attemptId: null,
    });
  }

  if (artifact.autonomousRepliesAttempted >= 1) {
    return failResult({
      stopped: artifact.replySendState !== "LIVE_WRITE_VERIFIED",
      targetConfigured,
      founderAuthorized,
      targetIsCreProspect,
      mailbox: mailbox!,
      conversationId: conversation.id,
      providerThreadId,
      existingThreadReused,
      setupEmailSent,
      setupProviderMessageId,
      inboundPresent: "YES",
      inboundMessageId: inboundMessage.id,
      humanReply: "YES",
      classification: eventClass,
      intent: classified.intent,
      conversationLinked: "PASS",
      stageBefore,
      stageAfter,
      groundedStageAdvancement: "PASS",
      policyOutcome: policy.outcome,
      policyReason: "AUTONOMOUS_REPLY_ALREADY_ATTEMPTED",
      autonomousRepliesAttempted: artifact.autonomousRepliesAttempted,
      providerAccepted: artifact.replyProviderMessageId ? "YES" : "NO",
      replyProviderMessageId: artifact.replyProviderMessageId,
      replyProviderThreadId: artifact.replyProviderThreadId,
      sameThread: !artifact.replyProviderThreadId || artifact.replyProviderThreadId === providerThreadId ? "PASS" : "FAIL",
      delivered: "UNKNOWN",
      replyIdempotencyKey: artifact.replyIdempotencyKey,
      duplicateProviderReplies: 0,
      replySendBefore,
      replySendAfter: artifact.replySendState,
      sendCapability,
      allApplicable: artifact.replySendState === "LIVE_WRITE_VERIFIED",
      nextBlocker: artifact.replySendState === "LIVE_WRITE_VERIFIED" ? "AUTONOMOUS_EMAIL_RUNTIME_LIVE" : "AUTONOMOUS_REPLY_WRITE_VERIFICATION_FAILED",
      threadReadable: "PASS",
      confidence: classified.confidence,
      uncertainty: classified.uncertainty,
      supportingEvidence: classified.supportingEvidence,
      inboundDuplicated,
      attemptId: artifact.attemptId,
    });
  }

  const replyEnvelope = buildEmailEnvelope({
    organizationId: LOCKED_ORG,
    ventureId: AUTONOMOUS_REPLY_WRITE_VENTURE,
    experimentId: null,
    cohortId: null,
    prospectId: null,
    fromIdentity: INFINITY_MANAGED_SENDER,
    toAddress: mailbox!,
    subject: generateAutonomousReplyWriteVerificationSubject(),
    body,
    authorizationId: AUTONOMOUS_REPLY_WRITE_AUTHORIZATION_ID,
    idempotencyKey: replyKey,
    providerThreadId,
    inReplyTo: inboundMessage.id,
  });
  const replied = await executeEmailSend({
    intent: buildEmailIntent(replyEnvelope, "autonomous_reply_write_verification"),
    prospectSendAuthorized: true,
    contentApproved: true,
    channelAllowed: true,
    now,
    fetchImpl,
  });
  providerWrites += replied.blocked ? 0 : 1;
  const accepted = Boolean(replied.attempt.providerResult?.accepted);
  const replyThread = replied.attempt.providerResult?.providerThreadId ?? null;
  const sameThread = replyThread === providerThreadId ? ("PASS" as const) : ("FAIL" as const);
  persistMessage({
    conversationId: conversation.id,
    direction: "OUTBOUND",
    provider: GMAIL_PROVIDER_ID,
    providerMessageId: replied.attempt.providerResult?.providerMessageId ?? null,
    providerThreadId: replyThread ?? providerThreadId,
    sender: INFINITY_MANAGED_SENDER,
    recipients: [mailbox!],
    subject: generateAutonomousReplyWriteVerificationSubject(),
    normalizedText: body,
    receivedAt: null,
    sentAt: now.toISOString(),
    messageType: "AUTONOMOUS_REPLY",
    automationClassification: "UNKNOWN",
    providerMetadata: { purpose: "AUTONOMOUS_REPLY_WRITE_VERIFICATION" },
    traceability: {
      organizationId: LOCKED_ORG,
      ventureId: AUTONOMOUS_REPLY_WRITE_VENTURE,
      experimentId: null,
      prospectId: null,
      sourceAttemptId: replied.attempt.attemptId,
    },
    attachmentMetadata: [],
  });
  updateConversationState({
    conversationId: conversation.id,
    conversationState: accepted ? "REPLY_SENT" : conversation.conversationState,
    lastOutboundAt: now.toISOString(),
    currentConversationStage: stageAfter,
  });

  const allApplicable =
    accepted &&
    sameThread === "PASS" &&
    inboundOk &&
    eventClass === "HUMAN_REPLY" &&
    classified.intent === "REQUEST_MORE_INFORMATION" &&
    policy.outcome === "AUTO_EXECUTE" &&
    groundingPass === "PASS" &&
    sendCapability === "LIVE_WRITE_VERIFIED" &&
    !replied.attempt.providerResult?.delivered;
  const inboundStates = allApplicable ? markReplySendLiveWriteVerified() : inspectInboundCapabilityStates();
  if (allApplicable) {
    const inboundReadArtifact = readInboundReadVerificationArtifact();
    if (inboundReadArtifact) {
      writeInboundReadVerificationArtifact({
        ...inboundReadArtifact,
        states: inboundStates,
      });
    }
  }
  artifact = {
    ...artifact,
    inboundProviderMessageId: inboundMessage.id,
    replyProviderMessageId: replied.attempt.providerResult?.providerMessageId ?? null,
    replyProviderThreadId: replyThread,
    replyIdempotencyKey: replyKey,
    attemptId: replied.attempt.attemptId,
    autonomousRepliesAttempted: artifact.autonomousRepliesAttempted + (replied.blocked ? 0 : 1),
    replySendState: inboundStates["communication.email.reply.send"],
    verifiedAt: allApplicable ? now.toISOString() : null,
  };
  writeAutonomousReplyWriteArtifact(artifact);
  return {
    stopped: !allApplicable,
    waiting: false,
    nextBlocker: allApplicable ? "AUTONOMOUS_EMAIL_RUNTIME_LIVE" : "AUTONOMOUS_REPLY_WRITE_VERIFICATION_FAILED",
    targetConfigured,
    founderAuthorized,
    targetIsCreProspect,
    mailbox: mailbox!,
    conversationId: conversation.id,
    providerThreadId,
    existingThreadReused,
    setupEmailSent,
    setupProviderMessageId,
    inboundPresent: "YES",
    inboundMessageId: inboundMessage.id,
    humanReply: eventClass === "HUMAN_REPLY" ? "YES" : "NO",
    classification: eventClass,
    intent: classified.intent,
    conversationLinked: inboundOk ? "PASS" : "FAIL",
    stageBefore,
    stageAfter,
    groundedStageAdvancement: "PASS",
    policyOutcome: policy.outcome,
    policyReason: policy.reason,
    routineFounderApprovalRequired: routineEmailRequiresFounderApproval(),
    groundingPass,
    autonomousRepliesAttempted: artifact.autonomousRepliesAttempted,
    providerAccepted: accepted ? "YES" : "NO",
    replyProviderMessageId: artifact.replyProviderMessageId,
    replyProviderThreadId: replyThread,
    sameThread,
    delivered: replied.attempt.providerResult?.delivered ? "YES" : "UNKNOWN",
    replyIdempotencyKey: replyKey,
    duplicateProviderReplies: 0,
    replySendBefore,
    replySendAfter: inboundStates["communication.email.reply.send"],
    sendCapability,
    inboundStates,
    allApplicable,
    liveReplyExecuted: accepted,
    providerWrites,
    threadReadable: "PASS",
    confidence: classified.confidence,
    uncertainty: classified.uncertainty,
    supportingEvidence: classified.supportingEvidence,
    inboundDuplicated,
    attemptId: replied.attempt.attemptId,
    countedAsAcquisition: false,
    countedAsExperimentEvidence: false,
    evidence: evidenceContracts(),
    attestation: {
      cursorCredentialAccess: attestation.codingAgentCredentialAccess ? "YES" : "NO",
      secretLogging: attestation.secretLogging ? "YES" : "NO",
    },
  };
}
