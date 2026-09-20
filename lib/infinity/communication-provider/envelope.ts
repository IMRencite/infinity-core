import { EMAIL_SEND_CAPABILITY, EMAIL_SEND_MESSAGE_VERSION, GMAIL_PROVIDER_ID } from "./constants";
import { buildAttemptId, buildEmailSendIdempotencyKey } from "./attempts";
import type { CommunicationAttribution, CommunicationEmailEnvelope, CommunicationIntent } from "./types";

export function buildEmailEnvelope(input: {
  organizationId: string;
  ventureId?: string | null;
  experimentId?: string | null;
  cohortId?: string | null;
  prospectId?: string | null;
  fromIdentity?: string | null;
  toAddress: string;
  subject: string;
  body: string;
  replyTo?: string | null;
  landingUrl?: string | null;
  attribution?: Partial<CommunicationAttribution>;
  authorizationId?: string | null;
  idempotencyKey?: string;
  attemptNumber?: number;
  createdAt?: string;
  providerThreadId?: string | null;
  inReplyTo?: string | null;
}): CommunicationEmailEnvelope {
  const idempotencyKey =
    input.idempotencyKey ??
    buildEmailSendIdempotencyKey({
      experimentId: input.experimentId ?? null,
      cohortId: input.cohortId ?? null,
      prospectId: input.prospectId ?? null,
      messageVersion: EMAIL_SEND_MESSAGE_VERSION,
      attemptNumber: input.attemptNumber ?? 1,
    });
  const attemptId = buildAttemptId(idempotencyKey);
  const landingUrl = input.landingUrl ?? null;
  return {
    messageId: `msg_${attemptId.slice(4)}`,
    attemptId,
    organizationId: input.organizationId,
    ventureId: input.ventureId ?? null,
    experimentId: input.experimentId ?? null,
    cohortId: input.cohortId ?? null,
    prospectId: input.prospectId ?? null,
    provider: GMAIL_PROVIDER_ID,
    capability: EMAIL_SEND_CAPABILITY,
    fromIdentity: input.fromIdentity ?? null,
    toAddress: input.toAddress.trim().toLowerCase(),
    subject: input.subject,
    body: input.body,
    replyTo: input.replyTo ?? null,
    landingUrl,
    attribution: {
      experimentId: input.experimentId ?? input.attribution?.experimentId ?? null,
      cohortId: input.cohortId ?? input.attribution?.cohortId ?? null,
      prospectId: input.prospectId ?? input.attribution?.prospectId ?? null,
      candidateId: input.attribution?.candidateId ?? null,
      artifactId: input.attribution?.artifactId ?? null,
      channel: input.attribution?.channel ?? null,
      attemptId,
      landingUrl,
    },
    idempotencyKey,
    authorizationId: input.authorizationId ?? null,
    economicExposureCeiling: { classification: "UNKNOWN", amountUsd: null, treatedAsZero: false },
    createdAt: input.createdAt ?? new Date().toISOString(),
    providerThreadId: input.providerThreadId ?? null,
    inReplyTo: input.inReplyTo ?? null,
  };
}

export function buildEmailIntent(
  envelope: CommunicationEmailEnvelope,
  purpose: CommunicationIntent["purpose"],
): CommunicationIntent {
  return { capability: EMAIL_SEND_CAPABILITY, envelope, purpose };
}
