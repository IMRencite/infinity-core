import { EMAIL_SEND_CAPABILITY } from "@/lib/infinity/provider-capabilities/email-send-capability";
import {
  EMAIL_SEND_CAPABILITY as EMAIL_SEND_CAPABILITY_CONST,
  GMAIL_OAUTH_REFRESH_TOKEN_ENV,
  GMAIL_PROVIDER_ID,
  GMAIL_WRITE_VERIFICATION_AUTHORIZATION_ID,
  GMAIL_WRITE_VERIFICATION_BODY,
  GMAIL_WRITE_VERIFICATION_MAX_SENDS,
  GMAIL_WRITE_VERIFICATION_SUBJECT,
  GMAIL_WRITE_VERIFICATION_VERSION,
} from "./constants";
import {
  lookupAttemptByIdempotency,
  restoreCommunicationAttempt,
  buildWriteVerificationIdempotencyKey,
} from "./attempts";
import { persistGmailConnectionRecord } from "./connection-record";
import {
  declaredSenderEmail,
  inspectCommunicationCredentialAttestation,
} from "./credential-boundary";
import { buildEmailEnvelope, buildEmailIntent } from "./envelope";
import { inspectEmailSendCapabilityState, persistEmailSendCapabilityState } from "./capability-state";
import { executeEmailSend } from "./send";
import { inspectGmailConnection, inspectControlledWriteTarget } from "./verification";
import {
  inspectGmailWriteVerificationRecord,
  persistGmailWriteVerificationRecord,
  readDurableWriteVerificationArtifact,
  resetGmailWriteVerificationRecord,
  writeDurableWriteVerificationArtifact,
  type GmailWriteVerificationRecord,
} from "./write-verification-record";
import type { CommunicationAttempt, CommunicationCapabilityState } from "./types";

export const WRITE_VERIFICATION_PURPOSE = "PROVIDER_WRITE_VERIFICATION" as const;

let authorizationConsumed = false;
let providerSendAttempts = 0;

export function resetControlledWriteVerificationRuntime(): void {
  authorizationConsumed = false;
  providerSendAttempts = 0;
  resetGmailWriteVerificationRecord();
}

export function inspectWriteVerificationAuthorizationConsumed(): boolean {
  return authorizationConsumed;
}

export function inspectWriteVerificationProviderSendAttempts(): number {
  return providerSendAttempts;
}

export type ControlledWriteVerificationResult = {
  blocked: boolean;
  authorizationConsumed: boolean;
  purpose: typeof WRITE_VERIFICATION_PURPOSE;
  target: string | "NONE";
  founderAuthorized: "YES" | "NO";
  targetIsProspect: "YES" | "NO";
  authorizationClass: "FOUNDER_CONFIRMED_CONTROLLED_TARGET" | "NONE";
  sender: string | "UNKNOWN";
  capabilityBefore: CommunicationCapabilityState;
  capabilityAfter: CommunicationCapabilityState;
  canonicalReadback: CommunicationCapabilityState;
  liveWriteVerified: boolean;
  sendAttempts: number;
  emailsSubmitted: number;
  emailsAccepted: number;
  providerMessageId: string | null;
  threadId: string | null;
  providerError: string | null;
  providerAccepted: boolean;
  delivered: false | true;
  attempt: CommunicationAttempt | null;
  record: GmailWriteVerificationRecord | null;
  idempotencyKey: string | null;
  reusedExisting: boolean;
  countedAsAcquisition: false;
  countedAsExperimentEvidence: false;
  telemetryKind: "PROVIDER_VERIFICATION";
  blockedReason: string | null;
  canonicalPathUsed: boolean;
  gates: {
    readOnlyVerified: "PASS" | "FAIL";
    targetConfigured: "PASS" | "FAIL";
    targetAuthorized: "PASS" | "FAIL";
    targetNotProspect: "PASS" | "FAIL";
    senderIdentity: "PASS" | "FAIL";
    gmailSendScope: "PASS" | "FAIL";
    credentialBoundary: "PASS" | "FAIL";
    idempotency: "PASS" | "FAIL";
    canonicalCommunicationPath: "PASS" | "FAIL";
  };
};

function emptyGates(): ControlledWriteVerificationResult["gates"] {
  return {
    readOnlyVerified: "FAIL",
    targetConfigured: "FAIL",
    targetAuthorized: "FAIL",
    targetNotProspect: "FAIL",
    senderIdentity: "FAIL",
    gmailSendScope: "FAIL",
    credentialBoundary: "FAIL",
    idempotency: "PASS",
    canonicalCommunicationPath: "PASS",
  };
}

function persistSafeRecord(input: {
  state: CommunicationCapabilityState;
  sender: string;
  target: string;
  attempt: CommunicationAttempt | null;
  consumed: boolean;
  now: string;
}): GmailWriteVerificationRecord {
  return persistGmailWriteVerificationRecord({
    provider: GMAIL_PROVIDER_ID,
    capability: EMAIL_SEND_CAPABILITY,
    state: input.state,
    sender: input.sender,
    controlledTarget: input.target,
    verifiedAt: input.state === "LIVE_WRITE_VERIFIED" ? input.now : input.attempt?.createdAt ?? null,
    attemptId: input.attempt?.attemptId ?? null,
    providerMessageId: input.attempt?.providerResult?.providerMessageId ?? null,
    authorizationReference: GMAIL_WRITE_VERIFICATION_AUTHORIZATION_ID,
    idempotencyKey: input.attempt?.idempotencyKey ?? null,
    purpose: WRITE_VERIFICATION_PURPOSE,
    authorizationConsumed: input.consumed,
    providerAccepted: input.attempt?.providerResult?.accepted === true,
    delivered: false,
    telemetryKind: "PROVIDER_VERIFICATION",
  });
}

function hydrateDurable(): void {
  const artifact = readDurableWriteVerificationArtifact();
  if (!artifact) return;
  persistGmailWriteVerificationRecord(artifact.record);
  persistEmailSendCapabilityState(artifact.capabilityState);
  if (artifact.attempt) restoreCommunicationAttempt(artifact.attempt);
  if (artifact.record.authorizationConsumed) authorizationConsumed = true;
}

function persistDurable(attempt: CommunicationAttempt | null): void {
  const current = inspectGmailWriteVerificationRecord();
  if (!current) return;
  writeDurableWriteVerificationArtifact({
    record: current,
    attempt,
    capabilityState: inspectEmailSendCapabilityState().state,
  });
}

function resultFromExisting(input: {
  attempt: CommunicationAttempt | null;
  record: GmailWriteVerificationRecord | null;
  before: CommunicationCapabilityState;
  gates: ControlledWriteVerificationResult["gates"];
  target: string | "NONE";
  founderAuthorized: "YES" | "NO";
  targetIsProspect: "YES" | "NO";
  authorizationClass: "FOUNDER_CONFIRMED_CONTROLLED_TARGET" | "NONE";
  sender: string | "UNKNOWN";
  blocked: boolean;
  blockedReason: string | null;
}): ControlledWriteVerificationResult {
  const after = inspectEmailSendCapabilityState().state;
  return {
    blocked: input.blocked,
    authorizationConsumed,
    purpose: WRITE_VERIFICATION_PURPOSE,
    target: input.target,
    founderAuthorized: input.founderAuthorized,
    targetIsProspect: input.targetIsProspect,
    authorizationClass: input.authorizationClass,
    sender: input.sender,
    capabilityBefore: input.before,
    capabilityAfter: after,
    canonicalReadback: after,
    liveWriteVerified: after === "LIVE_WRITE_VERIFIED",
    sendAttempts: providerSendAttempts,
    emailsSubmitted: providerSendAttempts,
    emailsAccepted: input.attempt?.providerResult?.accepted ? 1 : 0,
    providerMessageId: input.attempt?.providerResult?.providerMessageId ?? null,
    threadId: input.attempt?.providerResult?.providerThreadId ?? null,
    providerError: input.attempt?.providerResult?.failureMessage ?? input.blockedReason,
    providerAccepted: input.attempt?.providerResult?.accepted === true,
    delivered: false,
    attempt: input.attempt,
    record: input.record,
    idempotencyKey: input.attempt?.idempotencyKey ?? input.record?.idempotencyKey ?? null,
    reusedExisting: true,
    countedAsAcquisition: false,
    countedAsExperimentEvidence: false,
    telemetryKind: "PROVIDER_VERIFICATION",
    blockedReason: input.blockedReason,
    canonicalPathUsed: true,
    gates: input.gates,
  };
}

export async function executeControlledGmailWriteVerification(input: {
  organizationId: string;
  now?: Date;
  fetchImpl?: typeof fetch;
  durable?: boolean;
  skipIdentityProbe?: boolean;
} = { organizationId: "unknown" }): Promise<ControlledWriteVerificationResult> {
  if (input.durable) hydrateDurable();
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const before = inspectEmailSendCapabilityState().state;
  const targetInspection = inspectControlledWriteTarget();
  const credentials = inspectCommunicationCredentialAttestation();
  const sender = declaredSenderEmail() ?? "UNKNOWN";
  const gates = emptyGates();
  gates.credentialBoundary = credentials.serverOnly === "PASS" ? "PASS" : "FAIL";
  gates.targetConfigured = targetInspection.target !== "NONE" ? "PASS" : "FAIL";
  gates.targetAuthorized = credentials.writeVerificationAuthorized ? "PASS" : "FAIL";
  gates.targetNotProspect = targetInspection.prospect === "YES" ? "FAIL" : "PASS";
  gates.canonicalCommunicationPath = "PASS";

  const blockedBase = {
    target: targetInspection.target,
    founderAuthorized: credentials.writeVerificationAuthorized ? ("YES" as const) : ("NO" as const),
    targetIsProspect: targetInspection.prospect,
    authorizationClass: targetInspection.authorizationClass,
    sender,
    before,
    gates,
  };

  if (targetInspection.prospect === "YES") {
    return {
      ...resultFromExisting({
        ...blockedBase,
        attempt: null,
        record: inspectGmailWriteVerificationRecord(),
        blocked: true,
        blockedReason: "PROSPECT_CANNOT_BE_PROVIDER_VERIFICATION_RECIPIENT",
      }),
      reusedExisting: false,
      sendAttempts: 0,
      emailsSubmitted: 0,
    };
  }
  if (targetInspection.target === "NONE") {
    return {
      ...resultFromExisting({
        ...blockedBase,
        attempt: null,
        record: inspectGmailWriteVerificationRecord(),
        blocked: true,
        blockedReason: "CONTROLLED_WRITE_TARGET_MISSING",
      }),
      reusedExisting: false,
      sendAttempts: 0,
      emailsSubmitted: 0,
    };
  }
  if (!credentials.writeVerificationAuthorized || targetInspection.safeForProviderVerification !== "YES") {
    return {
      ...resultFromExisting({
        ...blockedBase,
        attempt: null,
        record: inspectGmailWriteVerificationRecord(),
        blocked: true,
        blockedReason: "WRITE_VERIFICATION_NOT_AUTHORIZED",
      }),
      reusedExisting: false,
      sendAttempts: 0,
      emailsSubmitted: 0,
    };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  if (!input.skipIdentityProbe) {
    const connection = await inspectGmailConnection(fetchImpl);
    gates.senderIdentity =
      connection.senderMatch === "YES" && connection.authenticated === "PASS" ? "PASS" : "FAIL";
    gates.gmailSendScope = connection.scopeVerification.gmailSend === "PASS" ? "PASS" : "FAIL";
    gates.readOnlyVerified =
      connection.connected === "YES" && connection.authenticated === "PASS" ? "PASS" : "FAIL";
    if (gates.senderIdentity === "FAIL" || gates.gmailSendScope === "FAIL" || gates.readOnlyVerified === "FAIL") {
      return {
        ...resultFromExisting({
          ...blockedBase,
          gates,
          attempt: null,
          record: inspectGmailWriteVerificationRecord(),
          blocked: true,
          blockedReason:
            connection.failure === "GOOGLE_SENDER_IDENTITY_MISMATCH"
              ? "GOOGLE_SENDER_IDENTITY_MISMATCH"
              : connection.failure === "GOOGLE_SCOPE_MISSING"
                ? "GOOGLE_SCOPE_MISSING"
                : "GMAIL_READ_ONLY_VERIFICATION_FAILED",
        }),
        reusedExisting: false,
        sendAttempts: 0,
        emailsSubmitted: 0,
      };
    }
    if (inspectEmailSendCapabilityState().state !== "LIVE_WRITE_VERIFIED") {
      persistEmailSendCapabilityState("READ_ONLY_VERIFIED");
    }
  } else {
    gates.senderIdentity = sender !== "UNKNOWN" ? "PASS" : "FAIL";
    gates.gmailSendScope = before === "READ_ONLY_VERIFIED" || before === "LIVE_WRITE_VERIFIED" ? "PASS" : "FAIL";
    gates.readOnlyVerified = before === "READ_ONLY_VERIFIED" || before === "LIVE_WRITE_VERIFIED" ? "PASS" : "FAIL";
    if (gates.readOnlyVerified === "FAIL" || gates.senderIdentity === "FAIL") {
      return {
        ...resultFromExisting({
          ...blockedBase,
          gates,
          attempt: null,
          record: inspectGmailWriteVerificationRecord(),
          blocked: true,
          blockedReason: "PROVIDER_NOT_READ_ONLY_VERIFIED",
        }),
        reusedExisting: false,
        sendAttempts: 0,
        emailsSubmitted: 0,
      };
    }
  }

  const idempotencyKey = buildWriteVerificationIdempotencyKey({
    provider: GMAIL_PROVIDER_ID,
    capability: EMAIL_SEND_CAPABILITY_CONST,
    purpose: WRITE_VERIFICATION_PURPOSE,
    sender,
    target: targetInspection.target,
    version: GMAIL_WRITE_VERIFICATION_VERSION,
  });
  const existing = lookupAttemptByIdempotency(idempotencyKey);
  const existingTerminal =
    existing &&
    (existing.state === "PROVIDER_ACCEPTED" ||
      existing.state === "DELIVERED" ||
      existing.state === "UNKNOWN_DELIVERY" ||
      existing.state === "FAILED" ||
      existing.authorized ||
      authorizationConsumed);
  if (existingTerminal) {
    gates.idempotency = "FAIL";
    const reusedState =
      existing.state === "PROVIDER_ACCEPTED" || existing.state === "DELIVERED"
        ? "LIVE_WRITE_VERIFIED"
        : inspectEmailSendCapabilityState().state;
    if (reusedState === "LIVE_WRITE_VERIFIED") persistEmailSendCapabilityState("LIVE_WRITE_VERIFIED");
    const record = persistSafeRecord({
      state: inspectEmailSendCapabilityState().state,
      sender,
      target: targetInspection.target,
      attempt: existing,
      consumed: true,
      now: nowIso,
    });
    if (input.durable) persistDurable(existing);
    return resultFromExisting({
      ...blockedBase,
      gates,
      attempt: existing,
      record,
      blocked: existing.state === "FAILED",
      blockedReason: existing.providerResult?.failureMessage ?? null,
    });
  }

  const envelope = buildEmailEnvelope({
    organizationId: input.organizationId,
    fromIdentity: sender,
    toAddress: targetInspection.target,
    subject: GMAIL_WRITE_VERIFICATION_SUBJECT,
    body: GMAIL_WRITE_VERIFICATION_BODY,
    authorizationId: GMAIL_WRITE_VERIFICATION_AUTHORIZATION_ID,
    idempotencyKey,
    createdAt: nowIso,
  });
  const intent = buildEmailIntent(envelope, "provider_write_verification");
  let sendCount = 0;
  const countedFetch: typeof fetch = (request, init) => {
    const url = String(request);
    if (/gmail\.googleapis\.com\/gmail\/v1\/users\/me\/messages\/send/i.test(url)) {
      sendCount += 1;
      if (sendCount > GMAIL_WRITE_VERIFICATION_MAX_SENDS) {
        throw new Error("WRITE_VERIFICATION_ONE_SEND_CEILING");
      }
    }
    if (/gmail\.googleapis\.com\/gmail\/v1\/users\/me\/drafts/i.test(url)) {
      throw new Error("GMAIL_DRAFT_BLOCKED");
    }
    return fetchImpl(request, init);
  };

  const executed = await executeEmailSend({
    intent,
    prospectSendAuthorized: false,
    contentApproved: true,
    channelAllowed: true,
    now,
    fetchImpl: countedFetch,
  });
  providerSendAttempts += sendCount;
  const consumed = sendCount > 0 || Boolean(executed.attempt.providerResult);
  if (consumed) authorizationConsumed = true;

  const accepted = executed.attempt.providerResult?.accepted === true;
  if (accepted) {
    persistEmailSendCapabilityState("LIVE_WRITE_VERIFIED");
    persistGmailConnectionRecord({
      provider: GMAIL_PROVIDER_ID,
      capability: EMAIL_SEND_CAPABILITY,
      state: "LIVE_WRITE_VERIFIED",
      senderIdentity: sender,
      verifiedAt: nowIso,
      scopes: [],
      credentialReference: `env:${GMAIL_OAUTH_REFRESH_TOKEN_ENV}`,
      providerAccountId: sender,
    });
  }

  const after = inspectEmailSendCapabilityState().state;
  const record = persistSafeRecord({
    state: after,
    sender,
    target: targetInspection.target,
    attempt: executed.attempt,
    consumed: authorizationConsumed,
    now: nowIso,
  });
  if (input.durable) persistDurable(executed.attempt);
  const readback = inspectEmailSendCapabilityState().state;

  return {
    blocked: executed.blocked || !accepted,
    authorizationConsumed,
    purpose: WRITE_VERIFICATION_PURPOSE,
    target: targetInspection.target,
    founderAuthorized: "YES",
    targetIsProspect: "NO",
    authorizationClass: "FOUNDER_CONFIRMED_CONTROLLED_TARGET",
    sender,
    capabilityBefore: before === "UNVERIFIED" ? "READ_ONLY_VERIFIED" : before,
    capabilityAfter: after,
    canonicalReadback: readback,
    liveWriteVerified: readback === "LIVE_WRITE_VERIFIED",
    sendAttempts: sendCount,
    emailsSubmitted: sendCount,
    emailsAccepted: accepted ? 1 : 0,
    providerMessageId: executed.attempt.providerResult?.providerMessageId ?? null,
    threadId: executed.attempt.providerResult?.providerThreadId ?? null,
    providerError: executed.attempt.providerResult?.failureMessage ?? (executed.blocked ? executed.authorization.reason : null),
    providerAccepted: accepted,
    delivered: false,
    attempt: executed.attempt,
    record,
    idempotencyKey,
    reusedExisting: false,
    countedAsAcquisition: false,
    countedAsExperimentEvidence: false,
    telemetryKind: "PROVIDER_VERIFICATION",
    blockedReason: accepted ? null : executed.authorization.reason !== "ALLOWED" ? executed.authorization.reason : executed.attempt.providerResult?.failureMessage ?? "PROVIDER_WRITE_FAILED",
    canonicalPathUsed: true,
    gates,
  };
}
