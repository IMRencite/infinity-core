import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { EMAIL_SEND_CAPABILITY, GMAIL_PROVIDER_ID, GMAIL_WRITE_VERIFICATION_PERSIST_FILE } from "./constants";
import { inspectEmailSendCapabilityState, persistEmailSendCapabilityState } from "./capability-state";
import type { CommunicationAttempt, CommunicationCapabilityState } from "./types";

export type GmailWriteVerificationRecord = {
  provider: typeof GMAIL_PROVIDER_ID;
  capability: typeof EMAIL_SEND_CAPABILITY;
  state: CommunicationCapabilityState;
  sender: string;
  controlledTarget: string;
  verifiedAt: string | null;
  attemptId: string | null;
  providerMessageId: string | null;
  authorizationReference: string | null;
  idempotencyKey: string | null;
  purpose: "PROVIDER_WRITE_VERIFICATION";
  authorizationConsumed: boolean;
  providerAccepted: boolean;
  delivered: false;
  telemetryKind: "PROVIDER_VERIFICATION";
};

export type DurableWriteVerificationArtifact = {
  record: GmailWriteVerificationRecord;
  attempt: CommunicationAttempt | null;
  capabilityState: CommunicationCapabilityState;
};

let record: GmailWriteVerificationRecord | null = null;
let persistFileOverride: string | null | undefined = undefined;

function secretLike(serialized: string): boolean {
  return /ya29\.|GOCSPX-|1\/\/|Bearer\s+[A-Za-z0-9._-]{20,}/i.test(serialized);
}

export function setWriteVerificationPersistFile(path: string | null): void {
  persistFileOverride = path;
}

export function writeVerificationPersistFile(): string | null {
  if (persistFileOverride !== undefined) return persistFileOverride;
  if (process.env.VITEST) return null;
  return GMAIL_WRITE_VERIFICATION_PERSIST_FILE;
}

export function persistGmailWriteVerificationRecord(
  next: GmailWriteVerificationRecord,
): GmailWriteVerificationRecord {
  const serialized = JSON.stringify(next);
  if (secretLike(serialized)) {
    throw new Error("Secret-like content blocked from Gmail write-verification persistence");
  }
  record = next;
  return next;
}

export function inspectGmailWriteVerificationRecord(): GmailWriteVerificationRecord | null {
  return record;
}

export function resetGmailWriteVerificationRecord(): void {
  record = null;
}

export function hydrateEmailSendCapabilityFromDurableWriteVerification(): CommunicationCapabilityState {
  const artifact = readDurableWriteVerificationArtifact();
  if (!artifact?.capabilityState) return inspectEmailSendCapabilityState().state;
  persistEmailSendCapabilityState(artifact.capabilityState);
  return artifact.capabilityState;
}

export function readDurableWriteVerificationArtifact(): DurableWriteVerificationArtifact | null {
  const file = writeVerificationPersistFile();
  if (!file || !existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as DurableWriteVerificationArtifact;
    if (!parsed || typeof parsed !== "object" || !parsed.record) return null;
    if (secretLike(JSON.stringify(parsed))) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDurableWriteVerificationArtifact(artifact: DurableWriteVerificationArtifact): void {
  const file = writeVerificationPersistFile();
  if (!file) return;
  const serialized = JSON.stringify(artifact);
  if (secretLike(serialized)) {
    throw new Error("Secret-like content blocked from Gmail write-verification persistence");
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${serialized}\n`, "utf8");
}
