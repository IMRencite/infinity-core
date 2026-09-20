import {
  EMAIL_DELIVERY_OBSERVE_CAPABILITY,
  EMAIL_INBOUND_FUTURE_CAPABILITIES,
  EMAIL_MAILBOX_WATCH_CAPABILITY,
  EMAIL_READ_CAPABILITY,
  EMAIL_REPLY_INGEST_CAPABILITY,
  EMAIL_REPLY_SEND_CAPABILITY,
  EMAIL_SEARCH_CAPABILITY,
  EMAIL_SUPPRESSION_WRITE_CAPABILITY,
  EMAIL_THREAD_READ_CAPABILITY,
} from "@/lib/infinity/provider-capabilities/email-inbound-capabilities";
import { inspectGmailInboundScopes } from "./gmail-inbound-scopes";
import type { CapabilityReadModel } from "./types";

let verifiedOverride: CapabilityReadModel | null = null;

export function persistInboundReadCapabilityStates(states: CapabilityReadModel): CapabilityReadModel {
  verifiedOverride = states;
  return states;
}

export function resetInboundReadCapabilityStates(): void {
  verifiedOverride = null;
}

export function architectureInboundCapabilityStates(): CapabilityReadModel {
  const scopes = inspectGmailInboundScopes();
  const readState = scopes.currentTokenSufficient === "YES" ? "ARCHITECTURE_BUILT" : "ARCHITECTURE_BUILT_SCOPE_BLOCKED";
  return {
    [EMAIL_READ_CAPABILITY]: readState,
    [EMAIL_REPLY_INGEST_CAPABILITY]: "ARCHITECTURE_BUILT",
    [EMAIL_THREAD_READ_CAPABILITY]: readState,
    [EMAIL_SEARCH_CAPABILITY]: readState,
    [EMAIL_MAILBOX_WATCH_CAPABILITY]: "ARCHITECTURE_BUILT_POLLING_FALLBACK",
    [EMAIL_REPLY_SEND_CAPABILITY]: "ARCHITECTURE_BUILT_WRITE_UNVERIFIED",
    [EMAIL_SUPPRESSION_WRITE_CAPABILITY]: "ARCHITECTURE_BUILT",
    [EMAIL_DELIVERY_OBSERVE_CAPABILITY]: "ARCHITECTURE_BUILT",
  };
}

export function inspectInboundCapabilityStates(): CapabilityReadModel {
  return verifiedOverride ?? architectureInboundCapabilityStates();
}

export function markInboundReadOnlyVerified(): CapabilityReadModel {
  const current = inspectInboundCapabilityStates();
  return persistInboundReadCapabilityStates({
    ...architectureInboundCapabilityStates(),
    [EMAIL_READ_CAPABILITY]: "READ_ONLY_VERIFIED",
    [EMAIL_THREAD_READ_CAPABILITY]: "READ_ONLY_VERIFIED",
    [EMAIL_SEARCH_CAPABILITY]: "READ_ONLY_VERIFIED",
    [EMAIL_MAILBOX_WATCH_CAPABILITY]: "READ_ONLY_VERIFIED",
    [EMAIL_REPLY_INGEST_CAPABILITY]: "READ_ONLY_VERIFIED",
    [EMAIL_REPLY_SEND_CAPABILITY]:
      current[EMAIL_REPLY_SEND_CAPABILITY] === "LIVE_WRITE_VERIFIED"
        ? "LIVE_WRITE_VERIFIED"
        : "ARCHITECTURE_BUILT_WRITE_UNVERIFIED",
  });
}

export function markReplySendLiveWriteVerified(): CapabilityReadModel {
  return persistInboundReadCapabilityStates({
    ...inspectInboundCapabilityStates(),
    [EMAIL_READ_CAPABILITY]: "READ_ONLY_VERIFIED",
    [EMAIL_THREAD_READ_CAPABILITY]: "READ_ONLY_VERIFIED",
    [EMAIL_SEARCH_CAPABILITY]: "READ_ONLY_VERIFIED",
    [EMAIL_MAILBOX_WATCH_CAPABILITY]: "READ_ONLY_VERIFIED",
    [EMAIL_REPLY_INGEST_CAPABILITY]: "READ_ONLY_VERIFIED",
    [EMAIL_REPLY_SEND_CAPABILITY]: "LIVE_WRITE_VERIFIED",
  });
}

export function inspectFutureInboundCapabilities(): Record<string, "DEFINED"> {
  return Object.fromEntries(EMAIL_INBOUND_FUTURE_CAPABILITIES.map((capability) => [capability, "DEFINED" as const]));
}

export function providerNeutralInboundModel(): "BUILT" {
  return "BUILT";
}
