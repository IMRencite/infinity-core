import { EMAIL_SEND_CAPABILITY } from "@/lib/infinity/provider-capabilities/email-send-capability";

export { EMAIL_SEND_CAPABILITY };

export const GMAIL_PROVIDER_ID = "gmail.com_v1" as const;
export const GMAIL_ADAPTER_KEY = "gmail.com_v1" as const;

export const COMMUNICATION_CAPABILITY_STATES = [
  "UNVERIFIED",
  "READ_ONLY_VERIFIED",
  "LIVE_WRITE_VERIFIED",
  "FAILED_VERIFICATION",
  "UNAVAILABLE",
] as const;

export const COMMUNICATION_ATTEMPT_STATES = [
  "PREPARED",
  "AUTHORIZED",
  "PROVIDER_ACCEPTED",
  "DELIVERED",
  "BOUNCED",
  "FAILED",
  "OPTED_OUT",
  "UNKNOWN_DELIVERY",
] as const;

export const PROVIDER_FAILURE_CATEGORIES = [
  "authentication_failure",
  "invalid_recipient",
  "rate_limit",
  "provider_rejection",
  "provider_unavailable",
  "quota_exceeded",
  "unknown_failure",
] as const;

export const GMAIL_OAUTH_CLIENT_ID_ENV = "GMAIL_OAUTH_CLIENT_ID" as const;
export const GMAIL_OAUTH_CLIENT_SECRET_ENV = "GMAIL_OAUTH_CLIENT_SECRET" as const;
export const GMAIL_OAUTH_REFRESH_TOKEN_ENV = "GMAIL_OAUTH_REFRESH_TOKEN" as const;
export const GMAIL_SENDER_EMAIL_ENV = "GMAIL_SENDER_EMAIL" as const;
export const GMAIL_WRITE_VERIFICATION_MAILBOX_ENV = "INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX" as const;
export const GMAIL_WRITE_VERIFICATION_AUTHORIZED_ENV = "INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED" as const;

export const GMAIL_REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

export const GMAIL_AUTHENTICATION_MODE = "oauth2_refresh_token" as const;

export const GMAIL_CONNECTION_FAILURES = [
  "GOOGLE_OAUTH_NOT_CONFIGURED",
  "GOOGLE_AUTHENTICATION_FAILED",
  "GOOGLE_SCOPE_MISSING",
  "GOOGLE_SENDER_IDENTITY_MISMATCH",
  "GOOGLE_API_UNAVAILABLE",
  "GOOGLE_CONNECTION_NOT_VERIFIED",
] as const;

export const GMAIL_OAUTH_PLAYGROUND_REDIRECT_URI = "https://developers.google.com/oauthplayground" as const;
export const GMAIL_OAUTH_APPLICATION_TYPE = "Web application" as const;

export const ALLOWED_CRE_INBOUND_REPLY_RECIPIENTS = [
  "caleb.struewing@jll.com",
  "mvizzone@tenantadvisors.com",
] as const;
export const ALLOWED_CRE_INBOUND_REPLY_THREADS = ["1a0631f98c277314", "1a0631f9b3cfd151"] as const;

export const FORBIDDEN_WRITE_VERIFICATION_RECIPIENTS = [
  "caleb.struewing@jll.com",
  "bkuhn@cresa.com",
  "mvizzone@tenantadvisors.com",
  "stephanie.severson@avisonyoung.com",
] as const;

export const INFINITY_IMR_CONTROLLED_DOMAINS = ["imros.io", "infinitemediaresources.com"] as const;

export const EMAIL_SEND_MESSAGE_VERSION = "cre_validation_initial_v1" as const;

export const GMAIL_WRITE_VERIFICATION_VERSION = "gmail_write_verification_v1" as const;
export const GMAIL_WRITE_VERIFICATION_SUBJECT = "Infinity OS Gmail Provider Verification" as const;
export const GMAIL_WRITE_VERIFICATION_BODY =
  "This is a controlled Infinity OS Gmail provider verification message. No action is required." as const;
export const GMAIL_WRITE_VERIFICATION_AUTHORIZATION_ID = "authz_gmail_provider_write_verification_v1" as const;
export const GMAIL_WRITE_VERIFICATION_PERSIST_FILE =
  ".infinity/communication-provider/write-verification.json" as const;
export const GMAIL_WRITE_VERIFICATION_MAX_SENDS = 1 as const;
