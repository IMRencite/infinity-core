import { EMAIL_SEND_CAPABILITY } from "@/lib/infinity/provider-capabilities/email-send-capability";
import {
  GMAIL_ADAPTER_KEY,
  GMAIL_AUTHENTICATION_MODE,
  GMAIL_PROVIDER_ID,
  GMAIL_REQUIRED_SCOPES,
} from "./constants";
import { sanitizeProviderError } from "./credential-boundary";
import {
  fingerprintGmailOAuthMaterial,
  missingHydratedMaterialFields,
  recordGmailInvocationEvent,
  type GmailInvocationContext,
} from "./gmail-invocation-context";
import type {
  CommunicationEmailEnvelope,
  CommunicationProviderResult,
  ProviderFailureCategory,
} from "./types";

export const gmailAdapterContract = {
  provider: GMAIL_PROVIDER_ID,
  adapterKey: GMAIL_ADAPTER_KEY,
  capability: EMAIL_SEND_CAPABILITY,
  authenticationMode: GMAIL_AUTHENTICATION_MODE,
  requiredScopes: GMAIL_REQUIRED_SCOPES,
  domainContractGmailSpecific: false,
  executionGmailSpecific: true,
} as const;

export type GmailProviderRequest = {
  raw: string;
  userId: "me";
};

function unknownCost(): CommunicationProviderResult["cost"] {
  return { classification: "UNKNOWN", amountUsd: null, treatedAsZero: false };
}

export function translateEnvelopeToGmailRequest(envelope: CommunicationEmailEnvelope): GmailProviderRequest {
  const from = envelope.fromIdentity ?? "me";
  const lines = [
    `From: ${from}`,
    `To: ${envelope.toAddress}`,
    envelope.replyTo ? `Reply-To: ${envelope.replyTo}` : null,
    envelope.inReplyTo ? `In-Reply-To: ${envelope.inReplyTo}` : null,
    envelope.inReplyTo ? `References: ${envelope.inReplyTo}` : null,
    `Subject: ${envelope.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    envelope.body,
  ].filter((line): line is string => line !== null);
  return {
    raw: Buffer.from(lines.join("\r\n")).toString("base64url"),
    userId: "me",
  };
}

export function classifyGmailFailure(status: number, message: string): ProviderFailureCategory {
  const text = message.toLowerCase();
  if (status === 401 || /invalid[_ ]grant|unauthenticated|invalid credentials/i.test(text)) {
    return "authentication_failure";
  }
  if (status === 429 || /rate.?limit|user-rate-limit/i.test(text)) return "rate_limit";
  if (/quota|usageLimits/i.test(text) || status === 403 && /quota/i.test(text)) return "quota_exceeded";
  if (/invalid.?to|invalid.?recipient|recipientaddress/i.test(text)) return "invalid_recipient";
  if (status >= 500) return "provider_unavailable";
  if (status === 400 || status === 403 || status === 404) return "provider_rejection";
  return "unknown_failure";
}

export function normalizeGmailSendResponse(input: {
  accepted: boolean;
  id?: string | null;
  threadId?: string | null;
  timestamp?: string | null;
  status?: number;
  error?: string | null;
}): CommunicationProviderResult {
  if (!input.accepted) {
    const failureMessage = sanitizeProviderError(input.error ?? "unknown_failure");
    return {
      accepted: false,
      delivered: false,
      deliveryProven: false,
      attemptState: "FAILED",
      providerMessageId: null,
      providerThreadId: null,
      providerTimestamp: input.timestamp ?? null,
      failureCategory: classifyGmailFailure(input.status ?? 0, failureMessage),
      failureMessage,
      cost: unknownCost(),
    };
  }
  return {
    accepted: true,
    delivered: false,
    deliveryProven: false,
    attemptState: "PROVIDER_ACCEPTED",
    providerMessageId: input.id ?? null,
    providerThreadId: input.threadId ?? null,
    providerTimestamp: input.timestamp ?? new Date().toISOString(),
    failureCategory: null,
    failureMessage: null,
    cost: unknownCost(),
  };
}

function parseScopeList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[ ,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function exchangeGmailAccessToken(
  fetchImpl: typeof fetch = fetch,
  gmailContext?: GmailInvocationContext,
): Promise<{ ok: true; token: string; scopes: string[] } | { ok: false; reason: string; status: number }> {
  if (!gmailContext) {
    return { ok: false, reason: "HYDRATION_REQUIRED:NO_INVOCATION_CONTEXT", status: 0 };
  }
  recordGmailInvocationEvent(gmailContext, "TOKEN_EXCHANGE_STARTED");
  if (gmailContext.conflict) {
    gmailContext.token_exchange_result = "FAIL";
    recordGmailInvocationEvent(gmailContext, "TOKEN_EXCHANGE_COMPLETED");
    return { ok: false, reason: "CONFIGURATION_CONFLICT", status: 0 };
  }
  const material = gmailContext.oauth_material;
  gmailContext.exchange_input_fingerprint = fingerprintGmailOAuthMaterial(material);
  if (!material.clientId || !material.clientSecret || !material.refreshToken) {
    const missing = missingHydratedMaterialFields(material);
    gmailContext.token_exchange_result = "FAIL";
    recordGmailInvocationEvent(gmailContext, "TOKEN_EXCHANGE_COMPLETED");
    return {
      ok: false,
      reason: missing.length ? `NOT_CONFIGURED:${missing.join(",")}` : "NOT_CONFIGURED:UNKNOWN_FIELD",
      status: 0,
    };
  }
  const body = new URLSearchParams({
    client_id: material.clientId,
    client_secret: material.clientSecret,
    refresh_token: material.refreshToken,
    grant_type: "refresh_token",
  });
  try {
    const res = await fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      scope?: string;
      error?: string;
    };
    if (!res.ok || !json.access_token) {
      gmailContext.token_exchange_result = "FAIL";
      recordGmailInvocationEvent(gmailContext, "TOKEN_EXCHANGE_COMPLETED");
      return {
        ok: false,
        reason: sanitizeProviderError(json.error ?? `TOKEN_EXCHANGE_FAILED_${res.status}`),
        status: res.status,
      };
    }
    gmailContext.token_exchange_result = "PASS";
    recordGmailInvocationEvent(gmailContext, "TOKEN_EXCHANGE_COMPLETED");
    return { ok: true, token: json.access_token, scopes: parseScopeList(json.scope) };
  } catch (error) {
    gmailContext.token_exchange_result = "FAIL";
    recordGmailInvocationEvent(gmailContext, "TOKEN_EXCHANGE_COMPLETED");
    return {
      ok: false,
      reason: sanitizeProviderError(error instanceof Error ? error.message : "provider_unavailable"),
      status: 0,
    };
  }
}

export async function inspectGmailAccessTokenScopes(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; scopes: string[] } | { ok: false; reason: string }> {
  try {
    const body = new URLSearchParams({ access_token: accessToken });
    const res = await fetchImpl("https://oauth2.googleapis.com/tokeninfo", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json().catch(() => ({}))) as { scope?: string; error?: string };
    if (!res.ok) {
      return { ok: false, reason: sanitizeProviderError(json.error ?? `TOKENINFO_FAILED_${res.status}`) };
    }
    return { ok: true, scopes: parseScopeList(json.scope) };
  } catch (error) {
    return {
      ok: false,
      reason: sanitizeProviderError(error instanceof Error ? error.message : "provider_unavailable"),
    };
  }
}

export async function gmailReadOnlyProfile(
  fetchImpl: typeof fetch = fetch,
  gmailContext?: GmailInvocationContext,
): Promise<
  | { ok: true; email: string; verified: boolean; scopes: string[]; scopeSource: "token" | "tokeninfo" | "none" }
  | { ok: false; reason: string; status: number }
> {
  const token = await exchangeGmailAccessToken(fetchImpl, gmailContext);
  if (!token.ok) return { ok: false, reason: token.reason, status: token.status };
  let scopes = token.scopes;
  let scopeSource: "token" | "tokeninfo" | "none" = scopes.length > 0 ? "token" : "none";
  const inspected = await inspectGmailAccessTokenScopes(token.token, fetchImpl);
  if (inspected.ok && inspected.scopes.length > 0) {
    scopes = [...new Set([...scopes, ...inspected.scopes])];
    scopeSource = "tokeninfo";
  } else if (scopes.length === 0) {
    scopeSource = "none";
  }
  try {
    const res = await fetchImpl("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${token.token}` },
    });
    const json = (await res.json().catch(() => ({}))) as {
      email?: string;
      verified_email?: boolean;
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        ok: false,
        reason: sanitizeProviderError(json.error?.message ?? `USERINFO_FAILED_${res.status}`),
        status: res.status,
      };
    }
    const email = json.email?.trim().toLowerCase() ?? "";
    if (!email.includes("@")) return { ok: false, reason: "SENDER_IDENTITY_UNRESOLVED", status: res.status };
    return { ok: true, email, verified: json.verified_email === true, scopes, scopeSource };
  } catch (error) {
    return {
      ok: false,
      reason: sanitizeProviderError(error instanceof Error ? error.message : "provider_unavailable"),
      status: 0,
    };
  }
}

export async function gmailSendMessage(
  envelope: CommunicationEmailEnvelope,
  fetchImpl: typeof fetch = fetch,
  gmailContext?: GmailInvocationContext,
): Promise<CommunicationProviderResult> {
  const token = await exchangeGmailAccessToken(fetchImpl, gmailContext);
  if (!token.ok) {
    return normalizeGmailSendResponse({
      accepted: false,
      status: token.status,
      error: token.reason,
    });
  }
  const request = translateEnvelopeToGmailRequest(envelope);
  try {
    const res = await fetchImpl("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: request.raw,
        ...(envelope.providerThreadId ? { threadId: envelope.providerThreadId } : {}),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      threadId?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      return normalizeGmailSendResponse({
        accepted: false,
        status: res.status,
        error: json.error?.message ?? `SEND_FAILED_${res.status}`,
      });
    }
    return normalizeGmailSendResponse({
      accepted: true,
      id: json.id ?? null,
      threadId: json.threadId ?? null,
    });
  } catch (error) {
    return normalizeGmailSendResponse({
      accepted: false,
      status: 0,
      error: error instanceof Error ? error.message : "provider_unavailable",
    });
  }
}
