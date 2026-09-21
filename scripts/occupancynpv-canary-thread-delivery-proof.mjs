import { createHash } from "node:crypto";
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

loadEnv();
const clientId = process.env.GMAIL_OAUTH_CLIENT_ID ?? "";
const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET ?? "";
const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN ?? "";
const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  }),
});
const tokenJson = await tokenRes.json().catch(() => ({}));
const access = typeof tokenJson.access_token === "string" ? tokenJson.access_token : "";
const threadId = "1a0af74557b0eb36";
const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, {
  headers: { Authorization: `Bearer ${access}` },
});
const json = await res.json().catch(() => ({}));
const messages = Array.isArray(json.messages) ? json.messages : [];
const ids = messages.map((row) => row.id).filter(Boolean);
const snippets = messages.map((row) => String(row.snippet || ""));
const replyVisible = snippets.some((snippet) => /comparison workspace|lease, occupancy, and property|autonomous venture operating system/i.test(snippet));
const inboundVisible = snippets.some((snippet) => /sounds interesting|tell me|best for/i.test(snippet));
console.log(JSON.stringify({
  contract: "OccupancyNpvCanaryThreadDeliveryProofV1",
  token_exchange: tokenRes.ok && Boolean(access) ? "PASS" : "FAIL",
  thread_id: threadId,
  message_count: ids.length,
  inbound_message_id: ids.includes("1a0b113843dd3f35") ? "1a0b113843dd3f35" : null,
  latest_message_id: ids.at(-1) ?? null,
  inbound_visible: inboundVisible,
  infinity_reply_visible: replyVisible,
  same_thread: ids.length >= 2,
  fingerprint: refreshToken ? createHash("sha256").update(refreshToken).digest("hex").slice(0, 12) : null,
}, null, 2));
if (!res.ok) process.exit(1);
