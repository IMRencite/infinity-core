import { describe, expect, it } from "vitest";
import { composeOccupancyNpvAlwaysClosingReply } from "@/lib/infinity/always-closing-sales/occupancynpv-replies";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { buildEmailEnvelope, composeFreshReplyHtml, translateEnvelopeToGmailRequest } from "@/lib/infinity/communication-provider";

const INBOUND = "Ok, can I keep using it after the 3 day trial period?";
const THREAD_ID = "1a0c6c76504f13b9";
const IN_REPLY_TO = "1a0cc543633460e5";
const INBOUND_FROM = "IMR <infinitemediaresources@gmail.com>";
const SUBJECT = "Re: Office lease comparison";

function deriveRecipient(from: string): string {
  return from.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0]?.toLowerCase() ?? "";
}

function decodeRaw(raw: string): string {
  return Buffer.from(raw, "base64url").toString("utf8");
}

function header(raw: string, name: string): string | null {
  const match = raw.match(new RegExp(`^${name}:\\s*(.+)$`, "im"));
  return match ? match[1].trim() : null;
}

function parts(decoded: string): { plain: string; html: string } {
  const boundary = header(decoded, "Content-Type")?.match(/boundary="?([^";\s]+)"?/i)?.[1];
  expect(boundary).toBeTruthy();
  const chunks = decoded.split(new RegExp(`--${boundary!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?`));
  let plain = "";
  let html = "";
  for (const chunk of chunks) {
    if (/Content-Type:\s*text\/plain/i.test(chunk)) {
      const idx = chunk.search(/\r?\n\r?\n/);
      plain = idx >= 0 ? chunk.slice(idx).trim() : "";
    }
    if (/Content-Type:\s*text\/html/i.test(chunk)) {
      const idx = chunk.search(/\r?\n\r?\n/);
      html = idx >= 0 ? chunk.slice(idx).trim() : "";
    }
  }
  return { plain, html };
}

describe("GMAIL_FRESH_REPLY_VISIBLE_GATE", () => {
  const composed = composeOccupancyNpvAlwaysClosingReply({ inbound: INBOUND, turn: 4 });
  const recipient = deriveRecipient(INBOUND_FROM);
  const envelope = buildEmailEnvelope({
    organizationId: "infinity",
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    toAddress: recipient,
    subject: SUBJECT,
    body: composed.body,
    fromIdentity: "infinitemediaresources@gmail.com",
    providerThreadId: THREAD_ID,
    inReplyTo: IN_REPLY_TO,
  });
  const request = translateEnvelopeToGmailRequest(envelope);
  const decoded = decodeRaw(request.raw);
  const { plain, html } = parts(decoded);

  it("keeps the fresh response top-level visible in both parts", () => {
    expect(composed.body.trim().length).toBeGreaterThan(20);
    expect(plain).toContain(composed.body.trim());
    expect(html).toContain("<p>");
    expect(html.replace(/<[^>]+>/g, " ")).toMatch(/trial|continue|OccupancyNPV/i);
    expect(plain).not.toMatch(/^\s*>/);
    expect(plain).not.toMatch(/^On .+ wrote:/m);
    expect(plain).not.toContain(INBOUND);
    expect(html).not.toMatch(/<blockquote/i);
    expect(html).not.toMatch(/gmail_quote/i);
    expect(html.trim().startsWith("<p>")).toBe(true);
    expect(composeFreshReplyHtml(composed.body)).toBe(html);
  });

  it("preserves threading metadata and derived recipient", () => {
    expect(header(decoded, "Content-Type")).toMatch(/multipart\/alternative/i);
    expect(header(decoded, "In-Reply-To")).toBe(IN_REPLY_TO);
    expect(header(decoded, "References")).toBe(IN_REPLY_TO);
    expect(envelope.providerThreadId).toBe(THREAD_ID);
    expect(envelope.inReplyTo).toBe(IN_REPLY_TO);
    expect(envelope.toAddress).toBe("infinitemediaresources@gmail.com");
    expect(envelope.subject).toBe(SUBJECT);
    expect(envelope.subject).toMatch(/Office lease comparison/i);
    expect(header(decoded, "Subject")).toBe(SUBJECT);
    expect(header(decoded, "To")).toBe(envelope.toAddress);
  });
});
