import { createHash } from "node:crypto";
import { validatePublicFetchTarget } from "./ssrf";
import type { PublicPageFetchResult } from "./types";

const MAX_BYTES = 512_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8_000;
const ALLOWED_TYPES = /^(text\/html|text\/plain|application\/xhtml\+xml|application\/xml|text\/xml)/i;

function titleFromHtml(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeEntities(match?.[1]?.replace(/\s+/g, " ").trim() ?? "").slice(0, 200);
}

export function htmlToVisibleText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  ).slice(0, 12_000);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

async function readBoundedBody(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return (await response.text()).slice(0, MAX_BYTES);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    size += value.byteLength;
    if (size > MAX_BYTES) break;
    chunks.push(value);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}

export async function fetchPublicPage(
  rawUrl: string,
  input?: { fetchImpl?: typeof fetch; now?: Date },
): Promise<PublicPageFetchResult> {
  const observedAt = (input?.now ?? new Date()).toISOString();
  const traceId = `pwf_${createHash("sha256").update(`${rawUrl}|${observedAt}`).digest("hex").slice(0, 16)}`;
  const failed = (blockedReason: string, status = 0): PublicPageFetchResult => ({
    url: rawUrl,
    finalUrl: rawUrl,
    ok: false,
    status,
    title: "",
    text: "",
    html: "",
    contentType: "",
    observedAt,
    provider: "web.fetch_public_page",
    costState: "UNKNOWN",
    traceId,
    blockedReason,
  });
  let current = rawUrl;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const target = await validatePublicFetchTarget(current);
      const response = await (input?.fetchImpl ?? fetch)(target.toString(), {
        method: "GET",
        redirect: "manual",
        headers: { accept: "text/html,text/plain;q=0.9", "user-agent": "InfinityPublicWebResearch/1.0" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || hop === MAX_REDIRECTS) return failed("redirect_limit", response.status);
        current = new URL(location, target).toString();
        await validatePublicFetchTarget(current);
        continue;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!ALLOWED_TYPES.test(contentType)) return failed("content_type", response.status);
      const body = await readBoundedBody(response);
      return {
        url: rawUrl,
        finalUrl: target.toString(),
        ok: response.ok,
        status: response.status,
        title: titleFromHtml(body),
        text: htmlToVisibleText(body),
        html: body.slice(0, MAX_BYTES),
        contentType,
        observedAt,
        provider: "web.fetch_public_page",
        costState: "UNKNOWN",
        traceId,
        blockedReason: response.ok ? null : `http_${response.status}`,
      };
    }
    return failed("redirect_limit");
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch_failed";
    return failed(message.startsWith("SSRF_BLOCKED") ? message : `fetch_failed:${message.slice(0, 80)}`);
  }
}
