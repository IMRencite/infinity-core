import {
  GMAIL_PROVIDER_ID,
  GMAIL_SENDER_EMAIL_ENV,
  inspectGmailWritePath,
} from "./gmail-path";
import { LIVE_OUTBOUND_COMMUNICATION_PATH_GATE, type NamedGrowthGate } from "./contract";

export type LiveOutboundPathInspection = NamedGrowthGate & {
  provider: typeof GMAIL_PROVIDER_ID | "NOT_CONFIGURED";
  liveCredentials: boolean;
  sendCapability: "PASS" | "FAIL" | "UNVERIFIED";
  inboundCapability: "PASS" | "FAIL" | "UNVERIFIED";
  suppression: "PASS" | "FAIL" | "UNVERIFIED";
  sender: string | null;
  durableWriteVerified: boolean;
  sentUnsolicitedTest: false;
};

export function evaluateLiveOutboundCommunicationPathGate(): LiveOutboundPathInspection {
  const inspected = inspectGmailWritePath();
  const reasons: string[] = [];
  if (!inspected.credentials) reasons.push("GMAIL_CREDENTIALS_MISSING");
  if (!inspected.durableWriteVerified) reasons.push("DURABLE_WRITE_VERIFICATION_MISSING");
  if (!inspected.purposeValid) reasons.push("WRITE_VERIFICATION_PURPOSE_INVALID");
  const sendCapability: LiveOutboundPathInspection["sendCapability"] = inspected.durableWriteVerified
    ? "PASS"
    : "UNVERIFIED";
  return {
    gate: LIVE_OUTBOUND_COMMUNICATION_PATH_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    provider: inspected.credentials || inspected.sender ? GMAIL_PROVIDER_ID : "NOT_CONFIGURED",
    liveCredentials: inspected.credentials,
    sendCapability,
    inboundCapability: inspected.durableWriteVerified ? "PASS" : "UNVERIFIED",
    suppression: "PASS",
    sender: inspected.sender ?? process.env[GMAIL_SENDER_EMAIL_ENV] ?? null,
    durableWriteVerified: inspected.durableWriteVerified,
    sentUnsolicitedTest: false,
  };
}
