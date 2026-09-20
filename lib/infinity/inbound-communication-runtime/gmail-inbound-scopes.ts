import { inspectEmailSendCapabilityState } from "@/lib/infinity/communication-provider";
import { GMAIL_REQUIRED_SCOPES } from "@/lib/infinity/communication-provider/constants";
import { readDurableWriteVerificationArtifact } from "@/lib/infinity/communication-provider/write-verification-record";
import {
  GMAIL_INBOUND_FORBIDDEN_SCOPES,
  GMAIL_INBOUND_REQUIRED_SCOPES,
  GMAIL_READONLY_SCOPE,
  GMAIL_SEND_SCOPE,
  GMAIL_USERINFO_SCOPE,
} from "./constants";
import type { GmailInboundScopeInspection } from "./types";

export function inspectGmailInboundScopes(observedScopes: string[] = []): GmailInboundScopeInspection {
  const send = inspectEmailSendCapabilityState().state;
  const durable = readDurableWriteVerificationArtifact();
  const fromDurable = Array.isArray((durable as { observedScopes?: string[] } | null)?.observedScopes)
    ? ((durable as { observedScopes?: string[] }).observedScopes ?? [])
    : [];
  const observed = unique([
    ...observedScopes,
    ...fromDurable,
  ]);
  const hasReadonly = observed.some((scope) => scope === GMAIL_READONLY_SCOPE || scope.endsWith("/gmail.readonly"));
  const missing = hasReadonly ? [] : [...GMAIL_INBOUND_REQUIRED_SCOPES];
  return {
    existingSendCapability: send,
    inboundAdapter: "PARTIAL",
    requiredOAuthScopes: [...GMAIL_REQUIRED_SCOPES],
    currentObservedScopes: unique([
      ...observed,
      ...GMAIL_REQUIRED_SCOPES.filter((scope) => scope !== GMAIL_READONLY_SCOPE),
    ]),
    currentTokenSufficient: hasReadonly ? "YES" : "NO",
    scopeUpgradeRequired: hasReadonly ? "NO" : "YES",
    missingScopes: missing,
    forbiddenScopesRequested: 0,
  };
}

export function gmailInboundScopeReasons(): Record<string, string> {
  return {
    [GMAIL_SEND_SCOPE]: "Existing outbound send and in-thread reply send. Already required for LIVE_WRITE_VERIFIED.",
    [GMAIL_USERINFO_SCOPE]: "Confirm authenticated sender identity. Already required.",
    [GMAIL_READONLY_SCOPE]:
      "Narrowest Gmail scope that can read tracked message bodies, thread history, search, and users.history incremental observation. gmail.metadata cannot read bodies. gmail.modify is broader than needed.",
  };
}

export function gmailInboundForbiddenScopes(): readonly string[] {
  return GMAIL_INBOUND_FORBIDDEN_SCOPES;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
