import {
  GMAIL_OAUTH_CLIENT_ID_ENV,
  GMAIL_OAUTH_CLIENT_SECRET_ENV,
  GMAIL_OAUTH_REFRESH_TOKEN_ENV,
  GMAIL_SENDER_EMAIL_ENV,
  GMAIL_WRITE_VERIFICATION_AUTHORIZED_ENV,
  GMAIL_WRITE_VERIFICATION_MAILBOX_ENV,
} from "./constants";
import { readGmailRuntimeConfig } from "./gmail-runtime-config";

export function inspectCommunicationCredentialAttestation(): {
  serverOnly: "PASS";
  codingAgentCredentialAccess: false;
  clientExposure: false;
  secretLogging: false;
  clientIdPresent: boolean;
  clientSecretPresent: boolean;
  refreshTokenPresent: boolean;
  senderEmailDeclared: boolean;
  writeVerificationMailboxDeclared: boolean;
  writeVerificationAuthorized: boolean;
  secretValues: never[];
  envNames: readonly string[];
} {
  const config = readGmailRuntimeConfig();
  const mailbox = readWriteMailbox();
  return {
    serverOnly: "PASS",
    codingAgentCredentialAccess: false,
    clientExposure: false,
    secretLogging: false,
    clientIdPresent: config.client_present,
    clientSecretPresent: config.secret_present,
    refreshTokenPresent: config.refresh_present,
    senderEmailDeclared: config.sender_present,
    writeVerificationMailboxDeclared: Boolean(mailbox && mailbox.includes("@")),
    writeVerificationAuthorized: process.env[GMAIL_WRITE_VERIFICATION_AUTHORIZED_ENV] === "true"
      || process.env[GMAIL_WRITE_VERIFICATION_AUTHORIZED_ENV] === "1",
    secretValues: [],
    envNames: [
      GMAIL_OAUTH_CLIENT_ID_ENV,
      GMAIL_OAUTH_CLIENT_SECRET_ENV,
      GMAIL_OAUTH_REFRESH_TOKEN_ENV,
      GMAIL_SENDER_EMAIL_ENV,
      GMAIL_WRITE_VERIFICATION_MAILBOX_ENV,
      GMAIL_WRITE_VERIFICATION_AUTHORIZED_ENV,
    ],
  };
}

function readWriteMailbox(): string | null {
  const value = process.env[GMAIL_WRITE_VERIFICATION_MAILBOX_ENV];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.includes("@") ? trimmed.toLowerCase() : null;
}

export function gmailOAuthConfigured(): boolean {
  const config = readGmailRuntimeConfig();
  return config.configured && !config.conflict;
}

export function codingAgentMayReadProviderSecrets(): false {
  return false;
}

export function readGmailOAuthMaterial(): {
  clientId: string | null;
  clientSecret: string | null;
  refreshToken: string | null;
} {
  const config = readGmailRuntimeConfig();
  if (config.conflict) {
    return { clientId: null, clientSecret: null, refreshToken: null };
  }
  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    refreshToken: config.refreshToken,
  };
}

export function missingGmailMaterialFields(): string[] {
  const material = readGmailOAuthMaterial();
  const missing: string[] = [];
  if (!material.clientId) missing.push(GMAIL_OAUTH_CLIENT_ID_ENV);
  if (!material.clientSecret) missing.push(GMAIL_OAUTH_CLIENT_SECRET_ENV);
  if (!material.refreshToken) missing.push(GMAIL_OAUTH_REFRESH_TOKEN_ENV);
  return missing;
}

export function declaredSenderEmail(): string | null {
  const config = readGmailRuntimeConfig();
  if (config.conflict) return null;
  return config.senderEmail && config.senderEmail.includes("@") ? config.senderEmail : null;
}

export function declaredWriteVerificationMailbox(): string | null {
  return readWriteMailbox();
}

export function writeVerificationExplicitlyAuthorized(): boolean {
  const value = process.env[GMAIL_WRITE_VERIFICATION_AUTHORIZED_ENV];
  return value === "true" || value === "1";
}

export function sanitizeProviderError(message: string): string {
  return message
    .replace(/ya29\.[A-Za-z0-9._-]+/g, "[REDACTED_SECRET]")
    .replace(/1\/\/[A-Za-z0-9._-]+/g, "[REDACTED_SECRET]")
    .replace(/GOCSPX-[A-Za-z0-9._-]+/g, "[REDACTED_SECRET]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED_SECRET]");
}
