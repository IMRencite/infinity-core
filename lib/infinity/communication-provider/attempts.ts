import { createHash } from "node:crypto";
import { EMAIL_SEND_MESSAGE_VERSION } from "./constants";
import type {
  CommunicationAttempt,
  CommunicationAttemptState,
  CommunicationEmailEnvelope,
  CommunicationProviderResult,
} from "./types";

const attempts = new Map<string, CommunicationAttempt>();
const idempotencyIndex = new Map<string, string>();

export function resetCommunicationAttempts(): void {
  attempts.clear();
  idempotencyIndex.clear();
}

export function buildEmailSendIdempotencyKey(input: {
  experimentId: string | null;
  cohortId: string | null;
  prospectId: string | null;
  messageVersion?: string;
  attemptNumber: number;
}): string {
  const raw = [
    input.experimentId ?? "",
    input.cohortId ?? "",
    input.prospectId ?? "",
    input.messageVersion ?? EMAIL_SEND_MESSAGE_VERSION,
    String(input.attemptNumber),
  ].join("|");
  return `idem_${createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
}

export function buildWriteVerificationIdempotencyKey(input: {
  provider: string;
  capability: string;
  purpose: "PROVIDER_WRITE_VERIFICATION";
  sender: string;
  target: string;
  version: string;
}): string {
  const raw = [
    input.provider,
    input.capability,
    input.purpose,
    input.sender.trim().toLowerCase(),
    input.target.trim().toLowerCase(),
    input.version,
  ].join("|");
  return `idem_${createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
}

export function buildAttemptId(idempotencyKey: string): string {
  return `att_${createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 16)}`;
}

export function restoreCommunicationAttempt(attempt: CommunicationAttempt): CommunicationAttempt {
  attempts.set(attempt.attemptId, attempt);
  idempotencyIndex.set(attempt.idempotencyKey, attempt.attemptId);
  return attempt;
}

export function persistPreparedAttempt(envelope: CommunicationEmailEnvelope): CommunicationAttempt {
  const existingId = idempotencyIndex.get(envelope.idempotencyKey);
  if (existingId) {
    const existing = attempts.get(existingId);
    if (existing) return existing;
  }
  const record: CommunicationAttempt = {
    ...envelope,
    state: "PREPARED",
    providerResult: null,
    authorized: false,
  };
  attempts.set(record.attemptId, record);
  idempotencyIndex.set(record.idempotencyKey, record.attemptId);
  return record;
}

export function lookupAttemptByIdempotency(idempotencyKey: string): CommunicationAttempt | null {
  const id = idempotencyIndex.get(idempotencyKey);
  return id ? attempts.get(id) ?? null : null;
}

export function transitionAttempt(
  attemptId: string,
  state: CommunicationAttemptState,
  extras: Partial<Pick<CommunicationAttempt, "authorized" | "providerResult">> = {},
): CommunicationAttempt | null {
  const existing = attempts.get(attemptId);
  if (!existing) return null;
  const next: CommunicationAttempt = { ...existing, state, ...extras };
  attempts.set(attemptId, next);
  return next;
}

export function markAttemptAccepted(
  attemptId: string,
  providerResult: CommunicationProviderResult,
): CommunicationAttempt | null {
  const acceptedState: CommunicationAttemptState = providerResult.deliveryProven
    ? "DELIVERED"
    : providerResult.accepted
      ? "PROVIDER_ACCEPTED"
      : providerResult.attemptState;
  return transitionAttempt(attemptId, acceptedState, { providerResult });
}

export function providerAcceptedIsDelivered(): false {
  return false;
}

export function listCommunicationAttempts(): CommunicationAttempt[] {
  return [...attempts.values()];
}
