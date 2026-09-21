import {
  EMAIL_SEND_CAPABILITY,
  inspectCommunicationCredentialAttestation,
  inspectEmailSendCapabilityState,
} from "@/lib/infinity/communication-provider";

export const COMMUNICATION_CAPABILITIES = [
  "communication.email.send",
  "communication.gmail.send",
  "communication.workspace.send",
  "communication.professional_message.send",
  "communication.web_form.submit",
] as const;

export type CommunicationCapability = (typeof COMMUNICATION_CAPABILITIES)[number];

export const COMMUNICATION_VERIFICATION_STATES = [
  "UNVERIFIED",
  "READ_ONLY_VERIFIED",
  "LIVE_WRITE_VERIFIED",
  "FAILED_VERIFICATION",
  "UNAVAILABLE",
] as const;

export type CommunicationVerificationState = (typeof COMMUNICATION_VERIFICATION_STATES)[number];

export type CommunicationCapabilityAuditRow = {
  capability: CommunicationCapability;
  verified: boolean;
  available: boolean;
  providerId: string | null;
  verificationState: CommunicationVerificationState;
  authorizedForExperiment: false;
  serverOnlyCredentialBoundary: "PASS";
  codingAgentCredentialAccess: false;
  notes: string;
};

export function auditCommunicationCapabilities(): CommunicationCapabilityAuditRow[] {
  const email = inspectEmailSendCapabilityState();
  const credentials = inspectCommunicationCredentialAttestation();
  const emailLive = email.state === "LIVE_WRITE_VERIFIED";
  return [
    {
      capability: EMAIL_SEND_CAPABILITY,
      verified: emailLive,
      available: emailLive,
      providerId: "gmail.com_v1",
      verificationState: email.state,
      authorizedForExperiment: false,
      serverOnlyCredentialBoundary: credentials.serverOnly,
      codingAgentCredentialAccess: credentials.codingAgentCredentialAccess,
      notes:
        email.state === "UNVERIFIED"
          ? "Global communication.email.send architecture is registered. Gmail adapter exists. Provider connection is not configured."
          : email.state === "READ_ONLY_VERIFIED"
            ? "Gmail connection is read-only verified. LIVE_WRITE_VERIFIED and separate outreach authorization are still required."
            : email.state === "LIVE_WRITE_VERIFIED"
              ? "Provider write is verified. Separate bounded prospect-send authorization is still required."
              : email.state === "FAILED_VERIFICATION"
                ? "Gmail connection verification failed."
                : "communication.email.send is unavailable.",
    },
    {
      capability: "communication.gmail.send",
      verified: false,
      available: false,
      providerId: null,
      verificationState: "UNAVAILABLE",
      authorizedForExperiment: false,
      serverOnlyCredentialBoundary: "PASS",
      codingAgentCredentialAccess: false,
      notes: "Gmail-specific capability alias is not the canonical action. Use communication.email.send.",
    },
    {
      capability: "communication.workspace.send",
      verified: false,
      available: false,
      providerId: null,
      verificationState: "UNAVAILABLE",
      authorizedForExperiment: false,
      serverOnlyCredentialBoundary: "PASS",
      codingAgentCredentialAccess: false,
      notes: "No workspace send capability is registered or verified.",
    },
    {
      capability: "communication.professional_message.send",
      verified: false,
      available: false,
      providerId: null,
      verificationState: "UNAVAILABLE",
      authorizedForExperiment: false,
      serverOnlyCredentialBoundary: "PASS",
      codingAgentCredentialAccess: false,
      notes: "No professional-messaging provider is registered or verified.",
    },
    {
      capability: "communication.web_form.submit",
      verified: false,
      available: false,
      providerId: null,
      verificationState: "UNAVAILABLE",
      authorizedForExperiment: false,
      serverOnlyCredentialBoundary: "PASS",
      codingAgentCredentialAccess: false,
      notes: "Public inbound validation ingest exists. Outbound prospect-form submit is not a capability.",
    },
  ];
}

export function executableCommunicationCapability(): CommunicationCapability | null {
  return auditCommunicationCapabilities().find((row) => row.verified && row.available)?.capability ?? null;
}

export function communicationCapabilityForChannel(
  status: "DIRECT_PUBLIC_BUSINESS_EMAIL" | "DIRECT_PUBLIC_BUSINESS_PHONE" | "PUBLIC_PROFESSIONAL_PROFILE" | "ORGANIZATION_CONTACT_FORM" | "ORGANIZATION_GENERAL_CONTACT" | "CONTACT_CHANNEL_NOT_YET_IDENTIFIED",
): CommunicationCapability | null {
  if (status === "DIRECT_PUBLIC_BUSINESS_EMAIL") return "communication.email.send";
  if (status === "PUBLIC_PROFESSIONAL_PROFILE") return "communication.professional_message.send";
  if (status === "ORGANIZATION_CONTACT_FORM" || status === "ORGANIZATION_GENERAL_CONTACT") return "communication.web_form.submit";
  return null;
}
