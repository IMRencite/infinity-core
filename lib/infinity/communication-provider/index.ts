import { resetCommunicationAttempts } from "./attempts";
import { resetEmailSendCapabilityState } from "./capability-state";
import { resetGmailConnectionRecord } from "./connection-record";
import { resetCommunicationSuppression } from "./governance";
import { resetControlledWriteVerificationRuntime } from "./write-verification";
import { resetGmailWriteVerificationRecord } from "./write-verification-record";

export { EMAIL_SEND_CAPABILITY } from "@/lib/infinity/provider-capabilities/email-send-capability";
export {
  EMAIL_SEND_MESSAGE_VERSION,
  FORBIDDEN_WRITE_VERIFICATION_RECIPIENTS,
  GMAIL_WRITE_VERIFICATION_AUTHORIZATION_ID,
  GMAIL_WRITE_VERIFICATION_BODY,
  GMAIL_WRITE_VERIFICATION_SUBJECT,
  GMAIL_WRITE_VERIFICATION_VERSION,
  GMAIL_ADAPTER_KEY,
  GMAIL_AUTHENTICATION_MODE,
  GMAIL_CONNECTION_FAILURES,
  GMAIL_OAUTH_APPLICATION_TYPE,
  GMAIL_OAUTH_PLAYGROUND_REDIRECT_URI,
  GMAIL_PROVIDER_ID,
  GMAIL_REQUIRED_SCOPES,
  COMMUNICATION_ATTEMPT_STATES,
  COMMUNICATION_CAPABILITY_STATES,
  PROVIDER_FAILURE_CATEGORIES,
} from "./constants";
export { inspectGmailConnectionRecord, persistGmailConnectionRecord } from "./connection-record";
export { FOUNDER_GOOGLE_OAUTH_CONFIGURATION_REQUIRED, gmailFounderSetupContract } from "./founder-setup";
export {
  codingAgentMayReadProviderSecrets,
  inspectCommunicationCredentialAttestation,
} from "./credential-boundary";
export {
  GMAIL_RUNTIME_CONFIG_READER_VERSION,
  attestGmailCredentialSource,
  readGmailRuntimeConfig,
} from "./gmail-runtime-config";
export {
  buildAttemptId,
  buildEmailSendIdempotencyKey,
  buildWriteVerificationIdempotencyKey,
  listCommunicationAttempts,
  lookupAttemptByIdempotency,
  persistPreparedAttempt,
  providerAcceptedIsDelivered,
  resetCommunicationAttempts,
  restoreCommunicationAttempt,
} from "./attempts";
export { buildEmailEnvelope, buildEmailIntent } from "./envelope";
export {
  evaluateEmailSendAuthorization,
  isForbiddenWriteVerificationRecipient,
  isSuppressed,
  recordSuppression,
  resetCommunicationSuppression,
} from "./governance";
export {
  classifyGmailFailure,
  exchangeGmailAccessToken,
  gmailAdapterContract,
  gmailReadOnlyProfile,
  inspectGmailAccessTokenScopes,
  normalizeGmailSendResponse,
  translateEnvelopeToGmailRequest,
} from "./gmail-adapter";
export { routeEmailSend } from "./router";
export { executeEmailSend } from "./send";
export {
  communicationTelemetryFromAttempt,
  emailSentIsQualifiedEvidence,
  unknownCostIsZero,
} from "./telemetry";
export {
  deriveEmailSendCapabilityState,
  inspectControlledWriteTarget,
  inspectGmailConnection,
  prepareControlledWriteVerification,
  verifyEmailSendReadOnly,
} from "./verification";
export {
  inspectEmailSendCapabilityState,
  persistEmailSendCapabilityState,
  setEmailSendCapabilityStateForTest,
  resetEmailSendCapabilityState,
} from "./capability-state";
export {
  executeControlledGmailWriteVerification,
  inspectWriteVerificationAuthorizationConsumed,
  inspectWriteVerificationProviderSendAttempts,
  resetControlledWriteVerificationRuntime,
  WRITE_VERIFICATION_PURPOSE,
} from "./write-verification";
export {
  hydrateEmailSendCapabilityFromDurableWriteVerification,
  inspectGmailWriteVerificationRecord,
  persistGmailWriteVerificationRecord,
  readDurableWriteVerificationArtifact,
  setWriteVerificationPersistFile,
} from "./write-verification-record";

export function resetCommunicationProviderRuntime(): void {
  resetCommunicationAttempts();
  resetCommunicationSuppression();
  resetEmailSendCapabilityState();
  resetGmailConnectionRecord();
  resetControlledWriteVerificationRuntime();
  resetGmailWriteVerificationRecord();
}
