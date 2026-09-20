import { EMAIL_SEND_CAPABILITY } from "@/lib/infinity/provider-capabilities/email-send-capability";
import {
  GMAIL_ADAPTER_KEY,
  GMAIL_AUTHENTICATION_MODE,
  GMAIL_CONNECTION_FAILURES,
  GMAIL_OAUTH_REFRESH_TOKEN_ENV,
  GMAIL_PROVIDER_ID,
  GMAIL_REQUIRED_SCOPES,
  INFINITY_IMR_CONTROLLED_DOMAINS,
} from "./constants";
import { persistGmailConnectionRecord } from "./connection-record";
import {
  declaredSenderEmail,
  declaredWriteVerificationMailbox,
  gmailOAuthConfigured,
  inspectCommunicationCredentialAttestation,
  writeVerificationExplicitlyAuthorized,
} from "./credential-boundary";
import { resolveGmailInvocationContext } from "./gmail-invocation-context";
import { gmailAdapterContract, gmailReadOnlyProfile } from "./gmail-adapter";
import { isForbiddenWriteVerificationRecipient } from "./governance";
import { inspectEmailSendCapabilityState, persistEmailSendCapabilityState } from "./capability-state";
import type { CommunicationCapabilityState } from "./types";

export type GmailConnectionFailure = (typeof GMAIL_CONNECTION_FAILURES)[number];

export type SenderIdentityInspection = {
  senderEmail: string | "UNKNOWN";
  displayName: "unset";
  organizationDomain: string | "UNKNOWN";
  verifiedByProvider: "YES" | "NO" | "UNKNOWN";
};

export type ScopeVerification = {
  userinfoEmail: "PASS" | "FAIL" | "NOT_RUN";
  gmailSend: "PASS" | "FAIL" | "NOT_RUN" | "CANNOT_CONFIRM_WITHOUT_WRITE";
  observedScopes: readonly string[];
};

export type GmailConnectionInspection = {
  connected: "YES" | "NO";
  providerReachable: "PASS" | "FAIL" | "NOT_CONFIGURED";
  authenticated: "PASS" | "FAIL" | "NOT_CONFIGURED";
  sender: SenderIdentityInspection;
  configuredSender: string | "UNKNOWN";
  authenticatedIdentity: string | "UNKNOWN";
  senderMatch: "YES" | "NO" | "NOT_VERIFIED";
  ownership: "FOUNDER_CONFIRMED" | "UNCONFIRMED";
  organizationControlled: "YES" | "NO" | "UNCONFIRMED";
  oauthReachable: "PASS" | "FAIL" | "NOT_CONFIGURED";
  identityEndpoint: "PASS" | "FAIL" | "NOT_CONFIGURED";
  gmailApi: "PASS" | "FAIL" | "NOT_NEEDED";
  authenticationMode: typeof GMAIL_AUTHENTICATION_MODE;
  scopes: readonly string[];
  scopeVerification: ScopeVerification;
  scopeEvidenceSource: "tokeninfo" | "token" | "none" | "not_run";
  capabilityScopeAvailable: "PASS" | "FAIL" | "NOT_CONFIGURED";
  serverOnlyConnection: "PASS";
  failure: GmailConnectionFailure | null;
};

export type ControlledWriteTargetInspection = {
  target: string | "NONE";
  infinityImrControlled: "YES" | "NO" | "UNKNOWN";
  organizationControlled: "YES" | "NO" | "UNKNOWN";
  ownership: "FOUNDER_CONFIRMED" | "UNCONFIRMED";
  authorizationClass: "FOUNDER_CONFIRMED_CONTROLLED_TARGET" | "NONE";
  safeForProviderVerification: "YES" | "NO";
  prospect: "YES" | "NO";
  writePerformed: false;
};

function domainOf(email: string): string {
  return email.split("@")[1] ?? "UNKNOWN";
}

function isInfinityImrDomain(email: string): boolean {
  const domain = domainOf(email).toLowerCase();
  return (INFINITY_IMR_CONTROLLED_DOMAINS as readonly string[]).includes(domain);
}

function hasScope(scopes: readonly string[], required: string): boolean {
  if (scopes.includes(required)) return true;
  if (required.endsWith("/userinfo.email") && scopes.includes("email")) return true;
  return scopes.some((scope) => scope.includes("gmail.send") && required.endsWith("/gmail.send"));
}

export function inspectControlledWriteTarget(): ControlledWriteTargetInspection {
  const declared = declaredWriteVerificationMailbox();
  if (!declared) {
    return {
      target: "NONE",
      infinityImrControlled: "UNKNOWN",
      organizationControlled: "UNKNOWN",
      ownership: "UNCONFIRMED",
      authorizationClass: "NONE",
      safeForProviderVerification: "NO",
      prospect: "NO",
      writePerformed: false,
    };
  }
  const prospect = isForbiddenWriteVerificationRecipient(declared);
  const controlled = isInfinityImrDomain(declared);
  const authorized = writeVerificationExplicitlyAuthorized();
  const founderConfirmed = authorized && !prospect;
  return {
    target: declared,
    infinityImrControlled: controlled ? "YES" : "NO",
    organizationControlled: controlled ? "YES" : founderConfirmed ? "UNKNOWN" : "NO",
    ownership: founderConfirmed ? "FOUNDER_CONFIRMED" : "UNCONFIRMED",
    authorizationClass: founderConfirmed ? "FOUNDER_CONFIRMED_CONTROLLED_TARGET" : "NONE",
    safeForProviderVerification: founderConfirmed ? "YES" : "NO",
    prospect: prospect ? "YES" : "NO",
    writePerformed: false,
  };
}

export async function inspectGmailConnection(
  fetchImpl: typeof fetch = fetch,
): Promise<GmailConnectionInspection> {
  const configured = gmailOAuthConfigured();
  const declared = declaredSenderEmail();
  const emptyScopes: ScopeVerification = {
    userinfoEmail: "NOT_RUN",
    gmailSend: "NOT_RUN",
    observedScopes: [],
  };
  if (!configured) {
    return {
      connected: "NO",
      providerReachable: "NOT_CONFIGURED",
      authenticated: "NOT_CONFIGURED",
      sender: {
        senderEmail: declared ?? "UNKNOWN",
        displayName: "unset",
        organizationDomain: declared ? domainOf(declared) : "UNKNOWN",
        verifiedByProvider: "UNKNOWN",
      },
      configuredSender: declared ?? "UNKNOWN",
      authenticatedIdentity: "UNKNOWN",
      senderMatch: "NOT_VERIFIED",
      ownership: "UNCONFIRMED",
      organizationControlled: "UNCONFIRMED",
      oauthReachable: "NOT_CONFIGURED",
      identityEndpoint: "NOT_CONFIGURED",
      gmailApi: "NOT_NEEDED",
      authenticationMode: GMAIL_AUTHENTICATION_MODE,
      scopes: GMAIL_REQUIRED_SCOPES,
      scopeVerification: emptyScopes,
      scopeEvidenceSource: "not_run",
      capabilityScopeAvailable: "NOT_CONFIGURED",
      serverOnlyConnection: "PASS",
      failure: "GOOGLE_OAUTH_NOT_CONFIGURED",
    };
  }
  const gmailContext = resolveGmailInvocationContext({ trigger_source: "HTTP" });
  const profile = await gmailReadOnlyProfile(fetchImpl, gmailContext);
  if (!profile.ok) {
    const failure: GmailConnectionFailure =
      profile.reason === "NOT_CONFIGURED"
        ? "GOOGLE_OAUTH_NOT_CONFIGURED"
        : /unavailable|network|ECONNREFUSED|ETIMEDOUT/i.test(profile.reason)
          ? "GOOGLE_API_UNAVAILABLE"
          : "GOOGLE_AUTHENTICATION_FAILED";
    return {
      connected: "NO",
      providerReachable: profile.reason === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "FAIL",
      authenticated: "FAIL",
      sender: {
        senderEmail: declared ?? "UNKNOWN",
        displayName: "unset",
        organizationDomain: declared ? domainOf(declared) : "UNKNOWN",
        verifiedByProvider: "NO",
      },
      configuredSender: declared ?? "UNKNOWN",
      authenticatedIdentity: "UNKNOWN",
      senderMatch: "NOT_VERIFIED",
      ownership: "UNCONFIRMED",
      organizationControlled: "UNCONFIRMED",
      oauthReachable: profile.reason === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "FAIL",
      identityEndpoint: "FAIL",
      gmailApi: "NOT_NEEDED",
      authenticationMode: GMAIL_AUTHENTICATION_MODE,
      scopes: GMAIL_REQUIRED_SCOPES,
      scopeVerification: emptyScopes,
      scopeEvidenceSource: "none",
      capabilityScopeAvailable: "FAIL",
      serverOnlyConnection: "PASS",
      failure,
    };
  }
  const userinfoEmail = "PASS" as const;
  const gmailSend = hasScope(profile.scopes, "https://www.googleapis.com/auth/gmail.send")
    ? ("PASS" as const)
    : profile.scopeSource === "none"
      ? ("CANNOT_CONFIRM_WITHOUT_WRITE" as const)
      : ("FAIL" as const);
  const senderMatch =
    declared && profile.email ? (declared === profile.email ? "YES" : "NO") : "NOT_VERIFIED";
  const mismatch = senderMatch === "NO";
  const scopeMissing = gmailSend === "FAIL";
  const failure: GmailConnectionFailure | null = mismatch
    ? "GOOGLE_SENDER_IDENTITY_MISMATCH"
    : scopeMissing
      ? "GOOGLE_SCOPE_MISSING"
      : null;
  return {
    connected: mismatch || scopeMissing ? "NO" : "YES",
    providerReachable: "PASS",
    authenticated: mismatch ? "FAIL" : "PASS",
    sender: {
      senderEmail: profile.email,
      displayName: "unset",
      organizationDomain: domainOf(profile.email),
      verifiedByProvider: profile.verified ? "YES" : "NO",
    },
    configuredSender: declared ?? "UNKNOWN",
    authenticatedIdentity: profile.email,
    senderMatch,
    ownership: senderMatch === "YES" ? "FOUNDER_CONFIRMED" : "UNCONFIRMED",
    organizationControlled: isInfinityImrDomain(profile.email) ? "YES" : "UNCONFIRMED",
    oauthReachable: "PASS",
    identityEndpoint: "PASS",
    gmailApi: "NOT_NEEDED",
    authenticationMode: GMAIL_AUTHENTICATION_MODE,
    scopes: profile.scopes.length > 0 ? profile.scopes : GMAIL_REQUIRED_SCOPES,
    scopeVerification: {
      userinfoEmail,
      gmailSend,
      observedScopes: profile.scopes,
    },
    scopeEvidenceSource: profile.scopeSource,
    capabilityScopeAvailable: scopeMissing ? "FAIL" : "PASS",
    serverOnlyConnection: "PASS",
    failure,
  };
}

export function deriveEmailSendCapabilityState(input: {
  architectureReady: boolean;
  connection: GmailConnectionInspection;
  writeVerified: boolean;
}): CommunicationCapabilityState {
  if (!input.architectureReady) return "UNAVAILABLE";
  if (input.writeVerified) {
    if (
      input.connection.failure === "GOOGLE_SENDER_IDENTITY_MISMATCH" ||
      input.connection.authenticated === "FAIL"
    ) {
      return "FAILED_VERIFICATION";
    }
    return "LIVE_WRITE_VERIFIED";
  }
  if (input.connection.failure === "GOOGLE_SENDER_IDENTITY_MISMATCH") return "FAILED_VERIFICATION";
  if (input.connection.connected === "YES" && input.connection.authenticated === "PASS") {
    return "READ_ONLY_VERIFIED";
  }
  if (input.connection.authenticated === "FAIL" || input.connection.providerReachable === "FAIL") {
    return "FAILED_VERIFICATION";
  }
  return "UNVERIFIED";
}

export async function verifyEmailSendReadOnly(
  fetchImpl: typeof fetch = fetch,
): Promise<{
  capability: typeof EMAIL_SEND_CAPABILITY;
  provider: typeof GMAIL_PROVIDER_ID;
  adapter: typeof GMAIL_ADAPTER_KEY;
  connection: GmailConnectionInspection;
  state: CommunicationCapabilityState;
  readOnlyVerification: "PASS" | "FAIL" | "NOT_RUN";
  writeVerification: "NOT_RUN";
  liveWriteVerified: false;
  credentials: ReturnType<typeof inspectCommunicationCredentialAttestation>;
  writeTarget: ControlledWriteTargetInspection;
}> {
  const connection = await inspectGmailConnection(fetchImpl);
  const alreadyLive = inspectEmailSendCapabilityState().state === "LIVE_WRITE_VERIFIED";
  const state = deriveEmailSendCapabilityState({
    architectureReady: true,
    connection,
    writeVerified: alreadyLive,
  });
  persistEmailSendCapabilityState(state);
  persistGmailConnectionRecord({
    provider: GMAIL_PROVIDER_ID,
    capability: EMAIL_SEND_CAPABILITY,
    state,
    senderIdentity: connection.authenticatedIdentity,
    verifiedAt:
      state === "READ_ONLY_VERIFIED" || state === "LIVE_WRITE_VERIFIED" ? new Date().toISOString() : null,
    scopes: connection.scopeVerification.observedScopes,
    credentialReference: `env:${GMAIL_OAUTH_REFRESH_TOKEN_ENV}`,
    providerAccountId:
      connection.authenticatedIdentity !== "UNKNOWN" ? connection.authenticatedIdentity : null,
  });
  const readOnlyVerification =
    connection.providerReachable === "NOT_CONFIGURED"
      ? "NOT_RUN"
      : connection.connected === "YES" &&
          connection.authenticated === "PASS" &&
          connection.authenticatedIdentity !== "UNKNOWN" &&
          connection.senderMatch !== "NO"
        ? "PASS"
        : "FAIL";
  return {
    capability: EMAIL_SEND_CAPABILITY,
    provider: GMAIL_PROVIDER_ID,
    adapter: gmailAdapterContract.adapterKey,
    connection,
    state,
    readOnlyVerification,
    writeVerification: "NOT_RUN",
    liveWriteVerified: false,
    credentials: inspectCommunicationCredentialAttestation(),
    writeTarget: inspectControlledWriteTarget(),
  };
}

export function prepareControlledWriteVerification(): {
  prepared: true;
  executed: false;
  target: ControlledWriteTargetInspection;
  blockedReason: string;
} {
  const target = inspectControlledWriteTarget();
  if (target.prospect === "YES") {
    return {
      prepared: true,
      executed: false,
      target,
      blockedReason: "PROSPECT_CANNOT_BE_PROVIDER_VERIFICATION_RECIPIENT",
    };
  }
  if (target.target === "NONE") {
    return { prepared: true, executed: false, target, blockedReason: "CONTROLLED_WRITE_TARGET_MISSING" };
  }
  if (target.safeForProviderVerification !== "YES") {
    return { prepared: true, executed: false, target, blockedReason: "WRITE_VERIFICATION_NOT_AUTHORIZED" };
  }
  return { prepared: true, executed: false, target, blockedReason: "WRITE_VERIFICATION_NOT_EXECUTED" };
}

export { inspectEmailSendCapabilityState };
