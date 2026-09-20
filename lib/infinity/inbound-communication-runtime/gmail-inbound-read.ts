import { exchangeGmailAccessToken, inspectGmailAccessTokenScopes } from "@/lib/infinity/communication-provider/gmail-adapter";
import { sanitizeProviderError } from "@/lib/infinity/communication-provider/credential-boundary";
import type { GmailInvocationContext } from "@/lib/infinity/communication-provider/gmail-invocation-context";
import { parseGmailMessageBody, recoverTextFromRawRfc822 } from "@/lib/infinity/production-outbound/gmail-message-body";
import { INFINITY_MANAGED_SENDER } from "./constants";

export type GmailHeaderMap = Record<string, string>;

export type GmailThreadMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  inReplyTo: string | null;
  date: string | null;
  snippet: string;
  bodyText: string;
};

function headerValue(headers: Array<{ name?: string; value?: string }> | undefined, name: string): string {
  return headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value?.trim() ?? "";
}

function decodeBody(data?: string): string {
  if (!data) return "";
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return "";
  }
}

function extractText(payload: {
  mimeType?: string;
  body?: { data?: string };
  parts?: Array<{ mimeType?: string; body?: { data?: string }; parts?: unknown[] }>;
} | undefined): string {
  if (!payload) return "";
  if (payload.mimeType?.startsWith("text/plain") && payload.body?.data) return decodeBody(payload.body.data);
  for (const part of payload.parts ?? []) {
    if (part.mimeType?.startsWith("text/plain") && part.body?.data) return decodeBody(part.body.data);
    const nested = extractText(part as typeof payload);
    if (nested) return nested;
  }
  return "";
}

export function isGmailWriteUrl(url: string): boolean {
  return /gmail\.googleapis\.com\/gmail\/v1\/users\/me\/(messages\/send|drafts|labels|batchModify)|\/modify\b|\/trash\b|\/untrash\b/i.test(url);
}

export function createReadOnlyGmailFetch(inner: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    if (isGmailWriteUrl(url) || (url.includes("gmail.googleapis.com") && method !== "GET")) {
      throw new Error("GMAIL_WRITE_BLOCKED");
    }
    return inner(input, init);
  };
}

export async function exchangeAndInspectGrant(
  fetchImpl: typeof fetch = fetch,
  gmailContext?: GmailInvocationContext,
): Promise<{
  refresh: "PASS" | "FAIL";
  scopes: string[];
  scopeSource: "token" | "tokeninfo" | "none";
  reason: string | null;
  accessToken: string | null;
}> {
  const token = await exchangeGmailAccessToken(fetchImpl, gmailContext);
  if (!token.ok) return { refresh: "FAIL", scopes: [], scopeSource: "none", reason: token.reason, accessToken: null };
  let scopes = token.scopes;
  let scopeSource: "token" | "tokeninfo" | "none" = scopes.length > 0 ? "token" : "none";
  const inspected = await inspectGmailAccessTokenScopes(token.token, fetchImpl);
  if (inspected.ok && inspected.scopes.length > 0) {
    scopes = [...new Set([...scopes, ...inspected.scopes])];
    scopeSource = "tokeninfo";
  }
  return { refresh: "PASS", scopes, scopeSource, reason: null, accessToken: token.token };
}

async function gmailGet<T>(
  token: string,
  path: string,
  fetchImpl: typeof fetch,
): Promise<{ ok: true; json: T } | { ok: false; reason: string; status: number }> {
  try {
    const res = await fetchImpl(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
    if (!res.ok) {
      return {
        ok: false,
        reason: sanitizeProviderError(json.error?.message ?? `GMAIL_GET_FAILED_${res.status}`),
        status: res.status,
      };
    }
    return { ok: true, json };
  } catch (error) {
    return {
      ok: false,
      reason: sanitizeProviderError(error instanceof Error ? error.message : "provider_unavailable"),
      status: 0,
    };
  }
}

export async function readGmailThread(input: {
  threadId: string;
  fetchImpl?: typeof fetch;
  accessToken?: string | null;
  gmailContext?: GmailInvocationContext;
}): Promise<{ ok: true; messages: GmailThreadMessage[] } | { ok: false; reason: string }> {
  const token = input.accessToken
    ? { ok: true as const, token: input.accessToken, scopes: [] }
    : await exchangeGmailAccessToken(input.fetchImpl ?? fetch, input.gmailContext);
  if (!token.ok) return { ok: false, reason: token.reason };
  const got = await gmailGet<{
    id?: string;
    messages?: Array<{
      id?: string;
      threadId?: string;
      snippet?: string;
      payload?: {
        headers?: Array<{ name?: string; value?: string }>;
        mimeType?: string;
        body?: { data?: string };
        parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
      };
    }>;
  }>(token.token, `/threads/${encodeURIComponent(input.threadId)}?format=full`, input.fetchImpl ?? fetch);
  if (!got.ok) return { ok: false, reason: got.reason };
  const messages = [];
  for (const message of got.json.messages ?? []) {
    const parsed = {
      id: message.id ?? "",
      threadId: message.threadId ?? input.threadId,
      from: headerValue(message.payload?.headers, "From").toLowerCase(),
      to: headerValue(message.payload?.headers, "To").toLowerCase(),
      subject: headerValue(message.payload?.headers, "Subject"),
      inReplyTo: headerValue(message.payload?.headers, "In-Reply-To") || null,
      date: headerValue(message.payload?.headers, "Date") || null,
      snippet: message.snippet ?? "",
      bodyText: parseGmailMessageBody(message.payload).visible_text || parseGmailMessageBody(message.payload).text,
    };
    if (!parsed.bodyText && !parsed.snippet && parsed.id) {
      parsed.bodyText = await recoverEmptyMessageText(token.token, parsed.id, input.fetchImpl ?? fetch);
    }
    messages.push(parsed);
  }
  return { ok: true, messages };
}

export async function recoverEmptyMessageText(
  token: string,
  messageId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const got = await gmailGet<{ raw?: string }>(token, `/messages/${encodeURIComponent(messageId)}?format=raw`, fetchImpl);
  if (!got.ok || !got.json.raw) return "";
  try {
    const decoded = Buffer.from(got.json.raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return recoverTextFromRawRfc822(got.json.raw);
  } catch {
    return "";
  }
}

export async function searchTrackedGmailMessages(input: {
  query: string;
  fetchImpl?: typeof fetch;
  accessToken?: string | null;
  gmailContext?: GmailInvocationContext;
}): Promise<{ ok: true; ids: string[]; threadIds: string[] } | { ok: false; reason: string }> {
  const token = input.accessToken
    ? { ok: true as const, token: input.accessToken, scopes: [] }
    : await exchangeGmailAccessToken(input.fetchImpl ?? fetch, input.gmailContext);
  if (!token.ok) return { ok: false, reason: token.reason };
  const got = await gmailGet<{ messages?: Array<{ id?: string; threadId?: string }> }>(
    token.token,
    `/messages?q=${encodeURIComponent(input.query)}&maxResults=10`,
    input.fetchImpl ?? fetch,
  );
  if (!got.ok) return { ok: false, reason: got.reason };
  return {
    ok: true,
    ids: (got.json.messages ?? []).map((row) => row.id ?? "").filter(Boolean),
    threadIds: [...new Set((got.json.messages ?? []).map((row) => row.threadId ?? "").filter(Boolean))],
  };
}

export async function listGmailHistorySince(input: {
  startHistoryId: string;
  fetchImpl?: typeof fetch;
  gmailContext?: GmailInvocationContext;
}): Promise<
  | { ok: true; historyId: string; added: Array<{ id: string; threadId: string }> }
  | { ok: false; reason: string; expired: boolean }
> {
  const token = await exchangeGmailAccessToken(input.fetchImpl ?? fetch, input.gmailContext);
  if (!token.ok) return { ok: false, reason: token.reason, expired: false };
  const got = await gmailGet<{
    historyId?: string;
    history?: Array<{ messagesAdded?: Array<{ message?: { id?: string; threadId?: string } }> }>;
    error?: { message?: string };
  }>(
    token.token,
    `/history?startHistoryId=${encodeURIComponent(input.startHistoryId)}&historyTypes=messageAdded`,
    input.fetchImpl ?? fetch,
  );
  if (!got.ok) {
    return {
      ok: false,
      reason: got.reason,
      expired: got.status === 404 || /historyId/i.test(got.reason),
    };
  }
  const added = (got.json.history ?? []).flatMap((row) =>
    (row.messagesAdded ?? [])
      .map((item) => ({ id: item.message?.id ?? "", threadId: item.message?.threadId ?? "" }))
      .filter((item) => item.id && item.threadId),
  );
  return { ok: true, historyId: got.json.historyId ?? input.startHistoryId, added };
}

export async function readGmailHistoryCheckpoint(
  fetchImpl: typeof fetch = fetch,
  gmailContext?: GmailInvocationContext,
): Promise<{
  ok: true;
  historyId: string;
} | { ok: false; reason: string }> {
  const token = await exchangeGmailAccessToken(fetchImpl, gmailContext);
  if (!token.ok) return { ok: false, reason: token.reason };
  const got = await gmailGet<{ historyId?: string }>(token.token, "/profile", fetchImpl);
  if (!got.ok) return { ok: false, reason: got.reason };
  if (!got.json.historyId) return { ok: false, reason: "HISTORY_ID_MISSING" };
  return { ok: true, historyId: got.json.historyId };
}

export function classifyThreadDirection(message: GmailThreadMessage, prospectEmail: string): "OUTBOUND" | "INBOUND" | "OTHER" {
  const prospect = prospectEmail.toLowerCase();
  const sender = INFINITY_MANAGED_SENDER;
  const from = message.from;
  const to = message.to;
  if (from.includes(sender) && to.includes(prospect)) return "OUTBOUND";
  if (from.includes(prospect) && to.includes(sender)) return "INBOUND";
  return "OTHER";
}
