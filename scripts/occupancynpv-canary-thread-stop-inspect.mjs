import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep);
    let val = trimmed.slice(sep + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[key] = val;
  }
}

function decodeBody(data) {
  if (!data) return "";
  try {
    return Buffer.from(String(data).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return "";
  }
}

function extractText(payload) {
  if (!payload) return "";
  if (String(payload.mimeType || "").startsWith("text/plain") && payload.body?.data) return decodeBody(payload.body.data);
  for (const part of payload.parts ?? []) {
    if (String(part.mimeType || "").startsWith("text/plain") && part.body?.data) return decodeBody(part.body.data);
    const nested = extractText(part);
    if (nested) return nested;
  }
  return "";
}

function isStop(text) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.some((line) => /^(stop|unsubscribe|opt[-\s]?out)$/i.test(line)) || /^\s*(stop|unsubscribe|opt[-\s]?out)\s*$/i.test(String(text).trim());
}

loadEnv();
const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: process.env.GMAIL_OAUTH_CLIENT_ID ?? "",
    client_secret: process.env.GMAIL_OAUTH_CLIENT_SECRET ?? "",
    refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN ?? "",
    grant_type: "refresh_token",
  }),
});
const tokenJson = await tokenRes.json().catch(() => ({}));
const access = typeof tokenJson.access_token === "string" ? tokenJson.access_token : "";
const threadId = "1a0af74557b0eb36";
const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`, {
  headers: { Authorization: `Bearer ${access}` },
});
const json = await res.json().catch(() => ({}));
const messages = Array.isArray(json.messages) ? json.messages : [];
const rows = messages.map((message) => {
  const snippet = String(message.snippet || "");
  const body = extractText(message.payload);
  return {
    id: message.id ?? null,
    snippet_len: snippet.length,
    body_len: body.length,
    snippet_stop: isStop(snippet),
    body_stop: isStop(body),
    first_line_stop: isStop((body || snippet).split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? ""),
  };
});
console.log(JSON.stringify({
  contract: "OccupancyNpvCanaryThreadStopInspectV1",
  token_exchange: tokenRes.ok && Boolean(access) ? "PASS" : "FAIL",
  thread_id: threadId,
  message_count: messages.length,
  stop_message_present: rows.some((row) => row.id === "1a0b23d641859457"),
  stop_detected: rows.some((row) => row.snippet_stop || row.body_stop || row.first_line_stop),
  messages: rows,
}, null, 2));
