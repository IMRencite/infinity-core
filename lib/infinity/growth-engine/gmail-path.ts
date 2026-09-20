import { existsSync, readFileSync } from "node:fs";

export const GMAIL_PROVIDER_ID = "gmail.com_v1" as const;
export const GMAIL_OAUTH_CLIENT_ID_ENV = "GMAIL_OAUTH_CLIENT_ID" as const;
export const GMAIL_OAUTH_CLIENT_SECRET_ENV = "GMAIL_OAUTH_CLIENT_SECRET" as const;
export const GMAIL_OAUTH_REFRESH_TOKEN_ENV = "GMAIL_OAUTH_REFRESH_TOKEN" as const;
export const GMAIL_SENDER_EMAIL_ENV = "GMAIL_SENDER_EMAIL" as const;
export const GMAIL_WRITE_VERIFICATION_PERSIST_FILE =
  ".infinity/communication-provider/write-verification.json" as const;

export type DurableWriteRecord = {
  state?: string;
  providerAccepted?: boolean;
  purpose?: string;
  sender?: string;
};

function envPresent(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export function readDurableWriteVerificationRecord(): DurableWriteRecord | null {
  if (process.env.VITEST) return null;
  if (!existsSync(GMAIL_WRITE_VERIFICATION_PERSIST_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(GMAIL_WRITE_VERIFICATION_PERSIST_FILE, "utf8")) as {
      record?: DurableWriteRecord;
    };
    return parsed.record ?? null;
  } catch {
    return null;
  }
}

export function gmailCredentialsPresent(): boolean {
  return (
    envPresent(GMAIL_OAUTH_CLIENT_ID_ENV)
    && envPresent(GMAIL_OAUTH_CLIENT_SECRET_ENV)
    && envPresent(GMAIL_OAUTH_REFRESH_TOKEN_ENV)
    && envPresent(GMAIL_SENDER_EMAIL_ENV)
  );
}

export function inspectGmailWritePath(): {
  credentials: boolean;
  durableWriteVerified: boolean;
  sender: string | null;
  purposeValid: boolean;
} {
  const record = readDurableWriteVerificationRecord();
  return {
    credentials: gmailCredentialsPresent(),
    durableWriteVerified: record?.state === "LIVE_WRITE_VERIFIED" && record.providerAccepted === true,
    sender: record?.sender ?? process.env[GMAIL_SENDER_EMAIL_ENV] ?? null,
    purposeValid: !record || record.purpose === "PROVIDER_WRITE_VERIFICATION",
  };
}
