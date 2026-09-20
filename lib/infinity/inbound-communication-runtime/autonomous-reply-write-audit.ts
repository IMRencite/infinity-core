import { existsSync, readFileSync } from "node:fs";
import { listCommunicationAttempts } from "@/lib/infinity/communication-provider";
import { codingAgentMayReadProviderSecrets } from "@/lib/infinity/communication-provider";
import { loadServerEnvFromLocalFile, reloadGmailOAuthFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { inspectEmailSendCapabilityState } from "@/lib/infinity/communication-provider/capability-state";
import { readDurableWriteVerificationArtifact } from "@/lib/infinity/communication-provider/write-verification-record";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { listMissionActivityEvents, projectCommandActivity } from "@/lib/infinity/mission-activity";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import {
  AUTONOMOUS_REPLY_WRITE_AUTHORIZATION_ID,
  AUTONOMOUS_REPLY_WRITE_BODY,
  AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION,
  AUTONOMOUS_REPLY_WRITE_LOCKED_CONVERSATION_ID,
  AUTONOMOUS_REPLY_WRITE_LOCKED_THREAD_ID,
  AUTONOMOUS_REPLY_WRITE_SUBJECT,
  INFINITY_MANAGED_SENDER,
  LOCKED_EXPERIMENT,
} from "./constants";
import { classifyInboundEventClass, classifyReplyIntent } from "./intent-classifier";
import { evaluateAutonomousCommunicationPolicy, routineEmailRequiresFounderApproval } from "./autonomous-policy";
import { classifyThreadDirection, createReadOnlyGmailFetch, isGmailWriteUrl, readGmailThread, type GmailThreadMessage } from "./gmail-inbound-read";
import { hydrateInboundRuntimeState, inspectInboundRuntimeState } from "./persist";
import { AUTONOMOUS_REPLY_WRITE_FILE, emptyAutonomousReplyWriteArtifact, type AutonomousReplyWriteArtifact } from "./autonomous-reply-write-persist";
import { INBOUND_READ_VERIFICATION_FILE, type InboundReadCapabilityArtifact } from "./inbound-read-capability";
import { buildAutonomousReplyIdempotencyKey } from "./verification-reply";
import { CRE_WAVE_1_DURABLE_STATE_FILE } from "@/lib/infinity/market-validation-experiment/cre-wave-1-durable-state";
import type { PolicyOutcome } from "./types";

export const AUTONOMOUS_REPLY_CONTINUATION_ZERO_WRITE_AUDIT =
  "AUTONOMOUS_REPLY_CONTINUATION_ZERO_WRITE_AUDIT_V1" as const;

export type ReplyWriteAuditClassification =
  | "NO_REPLY_WRITE_OCCURRED"
  | "REPLY_WRITE_CONFIRMED"
  | "AMBIGUOUS_REPLY_WRITE_STATE";

export type ReplyWriteAuditSnapshot = {
  threadReadable: boolean;
  sameThread: boolean;
  autonomousReplyFoundOnProvider: boolean;
  founderInboundFound: boolean;
  providerAcceptedAttempt: boolean;
  attemptProviderMessageId: string | null;
  successfulIdempotencyRecord: boolean;
  replySendState: string;
};

function durableReadsEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_INBOUND_PERSIST !== "1") return false;
  return true;
}

export function readAutonomousReplyWriteArtifactFromDisk(): AutonomousReplyWriteArtifact | null {
  if (!durableReadsEnabled()) return null;
  if (!existsSync(AUTONOMOUS_REPLY_WRITE_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(AUTONOMOUS_REPLY_WRITE_FILE, "utf8")) as AutonomousReplyWriteArtifact;
    return { ...emptyAutonomousReplyWriteArtifact(), ...parsed };
  } catch {
    return null;
  }
}

export function readInboundCapabilityArtifactFromDisk(): InboundReadCapabilityArtifact | null {
  if (!durableReadsEnabled()) return null;
  if (!existsSync(INBOUND_READ_VERIFICATION_FILE)) return null;
  try {
    return JSON.parse(readFileSync(INBOUND_READ_VERIFICATION_FILE, "utf8")) as InboundReadCapabilityArtifact;
  } catch {
    return null;
  }
}

export function isAutonomousVerificationReply(message: GmailThreadMessage, mailbox: string): boolean {
  if (classifyThreadDirection(message, mailbox) !== "OUTBOUND") return false;
  const text = `${message.subject} ${message.bodyText} ${message.snippet}`;
  return (
    text.includes("controlled Infinity OS communication test") ||
    text.includes("autonomous reply path is working") ||
    (message.subject.toLowerCase().startsWith("re:") && text.includes(AUTONOMOUS_REPLY_WRITE_SUBJECT))
  );
}

export function isFounderControlledInbound(message: GmailThreadMessage, mailbox: string): boolean {
  if (classifyThreadDirection(message, mailbox) !== "INBOUND") return false;
  return /more information/i.test(`${message.bodyText} ${message.snippet}`);
}

export function classifyAutonomousReplyWriteAudit(input: ReplyWriteAuditSnapshot): {
  classification: ReplyWriteAuditClassification;
  evidence: string;
  capabilityConsistent: "PASS" | "FAIL";
  capabilityInconsistency: boolean;
  duplicateProtection: "PASS" | "FAIL" | "NOT_APPLICABLE";
  safeFutureRetry: "YES" | "NO";
  retryReason: string;
} {
  const verified = input.replySendState === "LIVE_WRITE_VERIFIED";
  const providerProof = input.threadReadable && input.autonomousReplyFoundOnProvider && input.sameThread;
  const attemptProof = input.providerAcceptedAttempt && Boolean(input.attemptProviderMessageId);
  const capabilityInconsistency = verified && !providerProof && !attemptProof;

  if (capabilityInconsistency) {
    return {
      classification: "AMBIGUOUS_REPLY_WRITE_STATE",
      evidence: "CAPABILITY_STATE_INCONSISTENCY",
      capabilityConsistent: "FAIL",
      capabilityInconsistency: true,
      duplicateProtection: input.successfulIdempotencyRecord ? "PASS" : "FAIL",
      safeFutureRetry: "NO",
      retryReason: "CAPABILITY_STATE_INCONSISTENCY",
    };
  }
  if (input.autonomousReplyFoundOnProvider && !input.sameThread) {
    return {
      classification: "AMBIGUOUS_REPLY_WRITE_STATE",
      evidence: "PROVIDER_REPLY_THREAD_MISMATCH",
      capabilityConsistent: verified ? "FAIL" : "PASS",
      capabilityInconsistency: verified,
      duplicateProtection: "FAIL",
      safeFutureRetry: "NO",
      retryReason: "PROVIDER_REPLY_THREAD_MISMATCH",
    };
  }
  if (input.providerAcceptedAttempt && !input.autonomousReplyFoundOnProvider) {
    return {
      classification: "AMBIGUOUS_REPLY_WRITE_STATE",
      evidence: "ATTEMPT_ACCEPTED_WITHOUT_PROVIDER_MESSAGE",
      capabilityConsistent: verified ? "FAIL" : "PASS",
      capabilityInconsistency: verified,
      duplicateProtection: input.successfulIdempotencyRecord ? "PASS" : "FAIL",
      safeFutureRetry: "NO",
      retryReason: "ATTEMPT_ACCEPTED_WITHOUT_PROVIDER_MESSAGE",
    };
  }
  if (providerProof) {
    return {
      classification: "REPLY_WRITE_CONFIRMED",
      evidence: attemptProof
        ? "PROVIDER_THREAD_OUTBOUND_AFTER_INBOUND+ATTEMPT_ACCEPTED"
        : "PROVIDER_THREAD_OUTBOUND_AFTER_INBOUND",
      capabilityConsistent: verified ? "PASS" : "FAIL",
      capabilityInconsistency: false,
      duplicateProtection: input.successfulIdempotencyRecord ? "PASS" : "FAIL",
      safeFutureRetry: "NO",
      retryReason: "CONFIRMED_REPLY_NEVER_SAFE_TO_RESEND",
    };
  }
  if (
    !input.autonomousReplyFoundOnProvider &&
    !input.providerAcceptedAttempt &&
    !verified &&
    !input.successfulIdempotencyRecord
  ) {
    return {
      classification: "NO_REPLY_WRITE_OCCURRED",
      evidence: "NO_PROVIDER_REPLY_NO_ACCEPTED_ATTEMPT_UNVERIFIED_CAPABILITY",
      capabilityConsistent: "PASS",
      capabilityInconsistency: false,
      duplicateProtection: "NOT_APPLICABLE",
      safeFutureRetry: input.founderInboundFound && input.threadReadable ? "YES" : "NO",
      retryReason: input.founderInboundFound
        ? "NO_SEND_OCCURRED_INBOUND_STILL_USABLE"
        : "NO_SEND_OCCURRED_BUT_INBOUND_MISSING",
    };
  }
  return {
    classification: "AMBIGUOUS_REPLY_WRITE_STATE",
    evidence: "INCOMPLETE_OR_CONFLICTING_LINEAGE",
    capabilityConsistent: "FAIL",
    capabilityInconsistency: false,
    duplicateProtection: input.successfulIdempotencyRecord ? "PASS" : "FAIL",
    safeFutureRetry: "NO",
    retryReason: "INCOMPLETE_OR_CONFLICTING_LINEAGE",
  };
}

function readWave1UpdatedAt(): string | null {
  if (!durableReadsEnabled()) return null;
  if (!existsSync(CRE_WAVE_1_DURABLE_STATE_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(CRE_WAVE_1_DURABLE_STATE_FILE, "utf8")) as { updatedAt?: string };
    return parsed.updatedAt ?? null;
  } catch {
    return null;
  }
}

export async function executeAutonomousReplyContinuationZeroWriteAudit(input: {
  fetchImpl?: typeof fetch;
  mailbox?: string;
} = {}) {
  loadServerEnvFromLocalFile();
  reloadGmailOAuthFromLocalFile();
  hydrateInboundRuntimeState();
  const writes: string[] = [];
  const inner = input.fetchImpl ?? fetch;
  const fetchImpl: typeof fetch = createReadOnlyGmailFetch(async (raw, init) => {
    const url = String(raw);
    if (isGmailWriteUrl(url) || (url.includes("gmail.googleapis.com") && (init?.method ?? "GET").toUpperCase() !== "GET")) {
      writes.push(`${init?.method ?? "GET"} ${url}`);
      throw new Error("GMAIL_WRITE_BLOCKED");
    }
    return inner(raw, init);
  });

  const mailbox = (input.mailbox ?? process.env.INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX ?? "htunity@gmail.com").toLowerCase();
  const conversationId = AUTONOMOUS_REPLY_WRITE_LOCKED_CONVERSATION_ID;
  const providerThreadId = AUTONOMOUS_REPLY_WRITE_LOCKED_THREAD_ID;
  const artifact = readAutonomousReplyWriteArtifactFromDisk();
  const inboundCap = readInboundCapabilityArtifactFromDisk();
  const sendArtifact = readDurableWriteVerificationArtifact();
  const inboundState = inspectInboundRuntimeState();
  const conversation = inboundState.conversations.find((row) => row.id === conversationId) ?? null;
  const messages = inboundState.messages.filter((row) => row.conversationId === conversationId);
  const inboundMessages = messages.filter((row) => row.direction === "INBOUND");
  const events = inboundState.events.filter((row) => row.conversationId === conversationId);
  const inboundEvent = events[0] ?? null;
  const inboundCanonical = inboundMessages[inboundMessages.length - 1] ?? null;

  const thread = await readGmailThread({ threadId: providerThreadId, fetchImpl });
  const providerMessages = thread.ok ? thread.messages.filter((row) => row.threadId === providerThreadId) : [];
  const inboundProvider = thread.ok ? providerMessages.filter((row) => classifyThreadDirection(row, mailbox) === "INBOUND") : [];
  const outboundProvider = thread.ok ? providerMessages.filter((row) => classifyThreadDirection(row, mailbox) === "OUTBOUND") : [];
  const founderInbound = inboundProvider.find((row) => isFounderControlledInbound(row, mailbox)) ?? null;
  const lastInboundIndex = founderInbound ? providerMessages.findIndex((row) => row.id === founderInbound.id) : -1;
  const autonomousReply =
    lastInboundIndex >= 0
      ? providerMessages.slice(lastInboundIndex + 1).find((row) => isAutonomousVerificationReply(row, mailbox)) ?? null
      : providerMessages.find((row) => isAutonomousVerificationReply(row, mailbox) && row.id !== providerThreadId) ?? null;
  const sameThread =
    !autonomousReply || autonomousReply.threadId === providerThreadId ? ("PASS" as const) : ("FAIL" as const);
  const unrelatedThread = inboundState.conversations.some(
    (row) =>
      row.conversationType === "AUTONOMOUS_REPLY_WRITE_VERIFICATION" &&
      row.id !== conversationId &&
      row.providerThreadId !== providerThreadId,
  );

  const attempts = listCommunicationAttempts().filter((row) => {
    const threadMatch = row.providerThreadId === providerThreadId || row.providerResult?.providerThreadId === providerThreadId;
    const authMatch = row.authorizationId === AUTONOMOUS_REPLY_WRITE_AUTHORIZATION_ID;
    const targetMatch = row.toAddress.toLowerCase() === mailbox;
    return (authMatch || threadMatch) && targetMatch && row.subject !== AUTONOMOUS_REPLY_WRITE_SUBJECT;
  });
  const durableAttemptPresent = Boolean(artifact?.attemptId && artifact.replyProviderMessageId);
  const acceptedAttempts = attempts.filter((row) => row.providerResult?.accepted || row.state === "PROVIDER_ACCEPTED");
  const failedAttempts = attempts.filter((row) => row.state === "FAILED");
  const providerAccepted = acceptedAttempts.length > 0 || Boolean(artifact?.replyProviderMessageId && artifact.autonomousRepliesAttempted >= 1);
  const attemptProviderMessageId =
    acceptedAttempts[0]?.providerResult?.providerMessageId ?? artifact?.replyProviderMessageId ?? null;
  const attemptProviderThreadId =
    acceptedAttempts[0]?.providerResult?.providerThreadId ?? artifact?.replyProviderThreadId ?? null;
  const idempotencyKey =
    acceptedAttempts[0]?.idempotencyKey ??
    artifact?.replyIdempotencyKey ??
    (founderInbound
      ? buildAutonomousReplyIdempotencyKey({ conversationId, inboundMessageId: founderInbound.id })
      : null);
  const authorizationReference = acceptedAttempts[0]?.authorizationId ?? AUTONOMOUS_REPLY_WRITE_AUTHORIZATION_ID;

  const inboundText = founderInbound ? founderInbound.bodyText || founderInbound.snippet : inboundCanonical?.normalizedText ?? "";
  const classification = inboundText ? classifyInboundEventClass(inboundText) : null;
  const classified = inboundText && founderInbound
    ? classifyReplyIntent({ text: inboundText, sourceMessageId: founderInbound.id })
    : inboundText && inboundCanonical?.providerMessageId
      ? classifyReplyIntent({ text: inboundText, sourceMessageId: inboundCanonical.providerMessageId })
      : null;
  const policy = classified
    ? evaluateAutonomousCommunicationPolicy({
        classification: classified,
        identityCertain: true,
        trackedThread: true,
      })
    : null;

  const replySendState =
    inboundCap?.states["communication.email.reply.send"] ??
    artifact?.replySendState ??
    "ARCHITECTURE_BUILT_WRITE_UNVERIFIED";
  const sendState = sendArtifact?.capabilityState ?? inspectEmailSendCapabilityState().state;
  const inboundStates = inboundCap?.states ?? {
    "communication.email.read": "READ_ONLY_VERIFIED",
    "communication.email.thread.read": "READ_ONLY_VERIFIED",
    "communication.email.search": "READ_ONLY_VERIFIED",
    "communication.email.mailbox_watch": "READ_ONLY_VERIFIED",
    "communication.email.reply_ingest": "READ_ONLY_VERIFIED",
    "communication.email.reply.send": replySendState,
  };

  const successfulIdempotencyRecord = Boolean(
    artifact?.replyIdempotencyKey && artifact.autonomousRepliesAttempted >= 1 && artifact.replyProviderMessageId,
  );
  const classifiedAudit = classifyAutonomousReplyWriteAudit({
    threadReadable: thread.ok,
    sameThread: sameThread === "PASS",
    autonomousReplyFoundOnProvider: Boolean(autonomousReply),
    founderInboundFound: Boolean(founderInbound),
    providerAcceptedAttempt: providerAccepted,
    attemptProviderMessageId,
    successfulIdempotencyRecord,
    replySendState,
  });

  const hqEvents = listMissionActivityEvents({ organizationId: LIVE_ORG }).filter(
    (row) => row.missionType === AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION,
  );
  const hqView = projectCommandActivity({ organizationId: LIVE_ORG });
  const lastHq = hqEvents[hqEvents.length - 1] ?? null;
  const creConversations = inboundState.conversations.filter((row) => row.experimentId === LOCKED_EXPERIMENT);
  const clock = inspectExperimentClock();
  const waveUpdatedAt = readWave1UpdatedAt();

  const nextStep =
    classifiedAudit.classification === "REPLY_WRITE_CONFIRMED"
      ? ("AUTONOMOUS_REPLY_ALREADY_VERIFIED" as const)
      : classifiedAudit.classification === "NO_REPLY_WRITE_OCCURRED"
        ? classifiedAudit.safeFutureRetry === "YES"
          ? ("SAFE_TO_RESUME_AUTONOMOUS_REPLY_VERIFICATION" as const)
          : ("AUDIT_FAILED" as const)
        : thread.ok
          ? ("AMBIGUOUS_REPLY_STATE_REQUIRES_RESOLUTION" as const)
          : ("AUDIT_FAILED" as const);

  return {
    classification: classifiedAudit.classification,
    evidence: classifiedAudit.evidence,
    conversationId,
    providerThreadId,
    mailbox,
    threadReadable: thread.ok ? ("PASS" as const) : ("FAIL" as const),
    threadReason: thread.ok ? null : thread.reason,
    messageCount: providerMessages.length,
    inboundMessageCount: inboundProvider.length,
    outboundMessageCount: outboundProvider.length,
    founderInboundFound: founderInbound ? ("YES" as const) : ("NO" as const),
    autonomousReplyFound: autonomousReply ? ("YES" as const) : ("NO" as const),
    providerMessageIds: providerMessages.map((row) => row.id),
    inboundProviderMessageId: founderInbound?.id ?? inboundCanonical?.providerMessageId ?? null,
    inboundCanonicalEvent: inboundEvent ? ("YES" as const) : ("NO" as const),
    inboundCanonicalMessage: inboundCanonical ? ("YES" as const) : ("NO" as const),
    classificationResult: classification,
    intent: classified?.intent ?? null,
    confidence: classified?.confidence ?? null,
    duplicateInboundRecords: Math.max(0, inboundMessages.length - 1) + Math.max(0, events.length - 1),
    conversationLinked: conversation?.providerThreadId === providerThreadId ? ("PASS" as const) : ("FAIL" as const),
    policyEvaluated: policy ? ("YES" as const) : ("NO" as const),
    policyOutcome: (policy?.outcome ?? "NONE") as PolicyOutcome | "NONE",
    policyReason: policy?.reason ?? "NONE",
    founderApprovalRequired: routineEmailRequiresFounderApproval() ? ("YES" as const) : ("NO" as const),
    communicationAttempts: attempts.length + (durableAttemptPresent && attempts.length === 0 ? 1 : 0),
    successfulAttempts: acceptedAttempts.length + (durableAttemptPresent && acceptedAttempts.length === 0 && providerAccepted ? 1 : 0),
    failedAttempts: failedAttempts.length,
    providerAcceptedAttempts: acceptedAttempts.length + (durableAttemptPresent && providerAccepted && acceptedAttempts.length === 0 ? 1 : 0),
    providerAccepted: providerAccepted ? ("YES" as const) : ("NO" as const),
    replyProviderMessageId: autonomousReply?.id ?? attemptProviderMessageId,
    replyProviderThreadId: autonomousReply?.threadId ?? attemptProviderThreadId,
    idempotencyKey,
    authorizationReference,
    attemptId: acceptedAttempts[0]?.attemptId ?? artifact?.attemptId ?? null,
    replySendState,
    capabilityConsistent: classifiedAudit.capabilityConsistent,
    capabilityInconsistency: classifiedAudit.capabilityInconsistency,
    sameThread,
    newUnrelatedVerificationThread: unrelatedThread ? ("YES" as const) : ("NO" as const),
    duplicateProtection: classifiedAudit.duplicateProtection,
    safeFutureRetry: classifiedAudit.safeFutureRetry,
    retryReason: classifiedAudit.retryReason,
    existingCapabilities: {
      "communication.email.send": sendState,
      "communication.email.read": inboundStates["communication.email.read"],
      "communication.email.thread.read": inboundStates["communication.email.thread.read"],
      "communication.email.search": inboundStates["communication.email.search"],
      "communication.email.mailbox_watch": inboundStates["communication.email.mailbox_watch"],
      "communication.email.reply_ingest": inboundStates["communication.email.reply_ingest"],
      "communication.email.reply.send": replySendState,
    },
    cre: {
      prospectEmails: 0,
      prospectReplies: creConversations.filter((row) => row.lastInboundAt).length,
      experimentMutations: 0,
      cooldownMutations: 0,
      suppressionMutations: 0,
      experimentClockRestarted: clock.restarted,
      wave1UpdatedAt: waveUpdatedAt,
    },
    hq: {
      missionStarted: hqEvents.some((row) => row.eventType === "MISSION_STARTED") ? ("YES" as const) : ("NO" as const),
      missionCompleted: hqEvents.some((row) => row.eventType === "MISSION_COMPLETED") ? ("YES" as const) : ("NO" as const),
      missionInterrupted:
        hqEvents.some((row) => row.eventType === "MISSION_FAILED" || row.status === "FAILED") &&
        !hqEvents.some((row) => row.eventType === "MISSION_COMPLETED")
          ? ("YES" as const)
          : ("NO" as const),
      lastPhase: lastHq ? `${lastHq.eventType}:${lastHq.stepType}` : "NONE",
      latestCompleted: hqView.latestCompleted?.missionType ?? "NONE",
    },
    externalActions: {
      emails: 0,
      replies: 0,
      providerWrites: writes.length,
      mailboxMutations: writes.length,
      deployments: 0,
    },
    nextStep,
    attestation: {
      cursorCredentialAccess: codingAgentMayReadProviderSecrets() ? ("YES" as const) : ("NO" as const),
      secretLogging: "NO" as const,
    },
    verificationBodyPresent: autonomousReply
      ? autonomousReply.bodyText.includes(AUTONOMOUS_REPLY_WRITE_BODY) ||
        autonomousReply.snippet.includes("autonomous reply path is working")
      : false,
  };
}
