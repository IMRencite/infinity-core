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
const auth = { Authorization: `Bearer ${access}` };
const profile = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers: auth });
const profileJson = await profile.json().catch(() => ({}));
const identity = typeof profileJson.emailAddress === "string" ? profileJson.emailAddress : "";
const thread = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Message-ID`, {
  headers: auth,
});
const threadJson = await thread.json().catch(() => ({}));
const messages = Array.isArray(threadJson.messages) ? threadJson.messages : [];
const latest = messages.at(-1) ?? {};
const subjectHeader = (latest.payload?.headers ?? []).find((row) => String(row.name).toLowerCase() === "subject")?.value
  ?? "Lease occupancy NPV without another spreadsheet";
const mime = [
  `From: ${identity}`,
  `To: ${identity}`,
  subjectHeader.toLowerCase().startsWith("re:") ? `Subject: ${subjectHeader}` : `Subject: Re: ${subjectHeader}`,
  "MIME-Version: 1.0",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "STOP",
].join("\r\n");
const raw = Buffer.from(mime, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const send = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({ raw, threadId }),
});
const sent = await send.json().catch(() => ({}));
console.log(JSON.stringify({
  contract: "OccupancyNpvCanaryThreadStopV1",
  token_exchange: tokenRes.ok && Boolean(access) ? "PASS" : "FAIL",
  thread_id: threadId,
  prior_message_count: messages.length,
  send_status: send.status,
  accepted: send.ok,
  same_thread: sent.threadId === threadId,
  sent_message_id: typeof sent.id === "string" ? sent.id : null,
  identity_fingerprint: identity ? createHash("sha256").update(identity.toLowerCase()).digest("hex").slice(0, 12) : null,
}, null, 2));
if (!send.ok) process.exit(1);
