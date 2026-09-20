import { EMAIL_SEND_CAPABILITY, GMAIL_OAUTH_REFRESH_TOKEN_ENV, GMAIL_PROVIDER_ID } from "./constants";
import type { CommunicationCapabilityState } from "./types";

export type GmailConnectionRecord = {
  provider: typeof GMAIL_PROVIDER_ID;
  capability: typeof EMAIL_SEND_CAPABILITY;
  state: CommunicationCapabilityState;
  senderIdentity: string | "UNKNOWN";
  verifiedAt: string | null;
  scopes: readonly string[];
  credentialReference: `env:${typeof GMAIL_OAUTH_REFRESH_TOKEN_ENV}`;
  providerAccountId: string | null;
};

let record: GmailConnectionRecord | null = null;

export function persistGmailConnectionRecord(next: GmailConnectionRecord): GmailConnectionRecord {
  const serialized = JSON.stringify(next);
  if (/ya29\.|GOCSPX-|1\/\/|Bearer\s+[A-Za-z0-9._-]{20,}/i.test(serialized)) {
    throw new Error("Secret-like content blocked from Gmail connection persistence");
  }
  record = next;
  return next;
}

export function inspectGmailConnectionRecord(): GmailConnectionRecord | null {
  return record;
}

export function resetGmailConnectionRecord(): void {
  record = null;
}
