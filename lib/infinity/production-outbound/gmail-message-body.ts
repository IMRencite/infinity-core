import { createHash } from "node:crypto";

export const GMAIL_MESSAGE_BODY_PARSER_GATE = "GmailMessageBodyParserGate" as const;

export type GmailMimePayload = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMimePayload[];
};

export type ParsedGmailBody = {
  text: string;
  html: string;
  visible_text: string;
  mime_type: string;
  parse_succeeded: boolean;
  empty_top_level_with_child_parts: boolean;
  quoted_only: boolean;
  visible_length: number;
  source: "TEXT_PLAIN" | "TEXT_HTML" | "NESTED_PART" | "RAW_RFC822" | "EMPTY";
};

export function decodeGmailBase64Url(data?: string): string {
  if (!data) return "";
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return "";
  }
}

export function extractVisibleTextFromHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function stripQuotedReply(text: string): string {
  const withoutHistory = text
    .split(/\nOn .+?\bwrote:\s*/i)[0]
    .split(/\nFrom:\s/i)[0]
    .split(/\n-{2,}\s*Original Message\s*-{2,}/i)[0]
    .split(/\n_{2,}\n/)[0];
  const lines = withoutHistory.split(/\r?\n/);
  const kept: string[] = [];
  for (const line of lines) {
    if (/^>/.test(line.trim())) break;
    kept.push(line);
  }
  return kept.join("\n").trim();
}

function collectParts(payload: GmailMimePayload | undefined, acc: Array<{ mime: string; text: string }>): void {
  if (!payload) return;
  const mime = payload.mimeType ?? "";
  const decoded = decodeGmailBase64Url(payload.body?.data);
  if (decoded) acc.push({ mime, text: decoded });
  for (const part of payload.parts ?? []) collectParts(part, acc);
}

export function parseGmailMessageBody(payload: GmailMimePayload | undefined, rawRfc822?: string): ParsedGmailBody {
  const mimeType = payload?.mimeType ?? "unknown";
  const emptyTop = Boolean(payload && (!payload.body?.data || payload.body.size === 0) && (payload.parts?.length ?? 0) > 0);
  const parts: Array<{ mime: string; text: string }> = [];
  collectParts(payload, parts);
  const plain = parts.find((row) => row.mime.startsWith("text/plain"))?.text
    ?? (mimeType.startsWith("text/plain") ? decodeGmailBase64Url(payload?.body?.data) : "");
  const html = parts.find((row) => row.mime.startsWith("text/html"))?.text
    ?? (mimeType.startsWith("text/html") ? decodeGmailBase64Url(payload?.body?.data) : "");
  let text = plain.trim();
  let source: ParsedGmailBody["source"] = text ? "TEXT_PLAIN" : "EMPTY";
  if (!text && html) {
    text = extractVisibleTextFromHtml(html);
    source = "TEXT_HTML";
  }
  if (!text && parts.some((row) => row.text.trim())) {
    const nested = parts.find((row) => row.text.trim());
    text = nested?.mime.includes("html") ? extractVisibleTextFromHtml(nested.text) : nested?.text ?? "";
    source = "NESTED_PART";
  }
  if (!text && rawRfc822) {
    text = recoverTextFromRawRfc822(rawRfc822);
    if (text) source = "RAW_RFC822";
  }
  const visible = stripQuotedReply(text);
  return {
    text,
    html,
    visible_text: visible,
    mime_type: mimeType,
    parse_succeeded: Boolean(visible || text),
    empty_top_level_with_child_parts: emptyTop,
    quoted_only: Boolean(text.trim()) && !visible,
    visible_length: visible.length,
    source,
  };
}

export function recoverTextFromRawRfc822(rawBase64Url: string): string {
  const decoded = decodeGmailBase64Url(rawBase64Url);
  if (!decoded) return "";
  const blank = decoded.search(/\r?\n\r?\n/);
  const body = blank >= 0 ? decoded.slice(blank).trim() : decoded;
  if (/<!DOCTYPE html|<html[\s>]/i.test(body)) return extractVisibleTextFromHtml(body);
  return stripQuotedReply(body);
}

export function bodyHash(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 16);
}

export function evaluateGmailMessageBodyParserGate(input: {
  fixtures: Array<{ expected: string; parsed: string }>;
}): { gate: typeof GMAIL_MESSAGE_BODY_PARSER_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const failed = input.fixtures.filter((row) => stripQuotedReply(row.parsed).trim() !== stripQuotedReply(row.expected).trim());
  return {
    gate: GMAIL_MESSAGE_BODY_PARSER_GATE,
    result: failed.length ? "FAIL" : "PASS",
    reasons: failed.length ? ["PARSE_MISMATCH"] : ["KNOWN_MESSAGES_RECONSTRUCTED"],
  };
}
