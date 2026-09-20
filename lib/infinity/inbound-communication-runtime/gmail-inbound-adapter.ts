import { inspectInboundCapabilityStates } from "./capabilities";
import { inspectGmailInboundScopes } from "./gmail-inbound-scopes";

export function inspectGmailInboundAdapter(): {
  provider: "gmail.com_v1";
  adapter: "PARTIAL" | "READ_ONLY_VERIFIED";
  liveRead: boolean;
  liveWatch: boolean;
  liveReply: false;
  blocker: "GMAIL_INBOUND_OAUTH_SCOPE_UPGRADE_REQUIRED" | "AUTONOMOUS_REPLY_WRITE_VERIFICATION_REQUIRED" | "NONE";
} {
  const scopes = inspectGmailInboundScopes();
  const read = inspectInboundCapabilityStates()["communication.email.read"];
  const liveRead = read === "READ_ONLY_VERIFIED";
  return {
    provider: "gmail.com_v1",
    adapter: liveRead ? "READ_ONLY_VERIFIED" : "PARTIAL",
    liveRead,
    liveWatch: liveRead,
    liveReply: false,
    blocker: liveRead
      ? "AUTONOMOUS_REPLY_WRITE_VERIFICATION_REQUIRED"
      : scopes.scopeUpgradeRequired === "YES"
        ? "GMAIL_INBOUND_OAUTH_SCOPE_UPGRADE_REQUIRED"
        : "NONE",
  };
}
