import { createHash } from "node:crypto";
import { GMAIL_REQUIRED_SCOPES } from "@/lib/infinity/communication-provider/constants";
import { gmailReadOnlyProfile } from "@/lib/infinity/communication-provider/gmail-adapter";
import { resolveGmailInvocationContext } from "@/lib/infinity/communication-provider/gmail-invocation-context";
import type { OutboundProviderReadiness } from "./types";

export type OutboundProviderSendResult = {
  accepted: boolean;
  provider_message_id: string | null;
  error?: string;
};

export type OutboundProviderAdapter = {
  id: string;
  readiness: OutboundProviderReadiness;
  send: (input: {
    to: string;
    subject: string;
    body: string;
    idempotency_key: string;
    thread_id?: string | null;
    in_reply_to?: string | null;
  }) => Promise<OutboundProviderSendResult>;
};

export function fixtureOutboundProvider(options: {
  healthy?: boolean;
  fail?: boolean;
  timeout?: boolean;
  sends?: OutboundProviderSendResult[];
} = {}): OutboundProviderAdapter & { calls: number } {
  const calls = { count: 0 };
  const readiness: OutboundProviderReadiness = {
    bound: true,
    credentials_present: options.healthy !== false,
    healthy: options.healthy !== false,
    sending_identity_verified: options.healthy !== false,
    reply_path_configured: true,
    bounce_path_configured: true,
    unsubscribe_path_configured: true,
    provider: "fixture",
    reasons: options.healthy === false ? ["FIXTURE_UNHEALTHY"] : ["FIXTURE_READY"],
  };
  return {
    id: "fixture",
    readiness,
    get calls() {
      return calls.count;
    },
    async send() {
      calls.count += 1;
      if (options.timeout) {
        return { accepted: false, provider_message_id: null, error: "TIMEOUT" };
      }
      if (options.fail) {
        return { accepted: false, provider_message_id: null, error: "PROVIDER_REJECTED" };
      }
      return options.sends?.[calls.count - 1] ?? { accepted: true, provider_message_id: `fixture-${calls.count}` };
    },
  };
}

function fingerprintRefreshToken(env: NodeJS.Dict<string>): string | null {
  const token = env.GMAIL_OAUTH_REFRESH_TOKEN;
  if (!token) return null;
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}

export function inspectGmailProviderReadiness(env: NodeJS.Dict<string> = process.env): OutboundProviderReadiness {
  const credentials = Boolean(env.GMAIL_OAUTH_CLIENT_ID && env.GMAIL_OAUTH_CLIENT_SECRET && env.GMAIL_OAUTH_REFRESH_TOKEN);
  const identity = Boolean((env.GMAIL_SENDER_EMAIL ?? "").includes("@"));
  const reasons: string[] = [];
  if (!credentials) reasons.push("GMAIL_CREDENTIALS_MISSING");
  if (!identity) reasons.push("SENDING_IDENTITY_UNDECLARED");
  reasons.push("GMAIL_LIVE_AUTH_NOT_PROBED");
  return {
    bound: credentials,
    credentials_present: credentials,
    healthy: false,
    sending_identity_verified: identity,
    reply_path_configured: credentials,
    bounce_path_configured: credentials,
    unsubscribe_path_configured: true,
    token_exchange: false,
    send_scope: false,
    credential_fingerprint: fingerprintRefreshToken(env),
    provider: "gmail",
    reasons,
  };
}

export async function probeGmailProviderHealth(env: NodeJS.Dict<string> = process.env): Promise<OutboundProviderReadiness> {
  const base = inspectGmailProviderReadiness(env);
  if (!base.credentials_present) return base;
  const gmailContext = resolveGmailInvocationContext({ trigger_source: "HTTP" });
  const profile = await gmailReadOnlyProfile(fetch, gmailContext);
  if (!profile.ok) {
    return {
      ...base,
      healthy: false,
      token_exchange: false,
      send_scope: false,
      readonly_scope: false,
      userinfo_scope: false,
      sending_identity_verified: false,
      reasons: ["GMAIL_TOKEN_EXCHANGE_FAILED", profile.reason],
    };
  }
  const sendScope = profile.scopes.some((scope) =>
    GMAIL_REQUIRED_SCOPES.some((required) => required.includes("gmail.send") && scope.includes("gmail.send"))
    || scope.includes("gmail.send")
    || scope === "https://mail.google.com/",
  );
  const readonlyScope = profile.scopes.some((scope) => scope.includes("gmail.readonly"));
  const userinfoScope = profile.scopes.some((scope) => scope.includes("userinfo.email") || scope.endsWith("/email"));
  const identityOk = profile.verified && profile.email.includes("@");
  const healthy = sendScope && identityOk;
  const reasons: string[] = [];
  if (!sendScope) reasons.push("GMAIL_SEND_SCOPE_MISSING");
  if (!readonlyScope) reasons.push("GMAIL_READONLY_SCOPE_MISSING");
  if (!userinfoScope) reasons.push("GMAIL_USERINFO_SCOPE_MISSING");
  if (!identityOk) reasons.push("SENDING_IDENTITY_UNVERIFIED");
  return {
    ...base,
    healthy,
    token_exchange: true,
    send_scope: sendScope,
    readonly_scope: readonlyScope,
    userinfo_scope: userinfoScope,
    sending_identity_verified: identityOk,
    reply_path_configured: true,
    bounce_path_configured: true,
    unsubscribe_path_configured: true,
    reasons: reasons.length ? reasons : ["GMAIL_LIVE_READY"],
  };
}

export function emptyProviderReadiness(provider = "none"): OutboundProviderReadiness {
  return {
    bound: false,
    credentials_present: false,
    healthy: false,
    sending_identity_verified: false,
    reply_path_configured: false,
    bounce_path_configured: false,
    unsubscribe_path_configured: false,
    provider,
    reasons: ["PROVIDER_NOT_BOUND"],
  };
}
