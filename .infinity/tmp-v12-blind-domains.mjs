import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();
const PROJECT_ID = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const WINDOW_START = "2026-09-20T23:35:31.322Z";
async function vercel(path) {
  const res = await fetch(`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
const listed = await vercel(`/v9/projects/${PROJECT_ID}/env`);
const values = {};
for (const key of ["GMAIL_OAUTH_CLIENT_ID", "GMAIL_OAUTH_CLIENT_SECRET", "GMAIL_OAUTH_REFRESH_TOKEN"]) {
  const row = (listed.envs || []).find((item) => item.key === key);
  const decrypted = await vercel(`/v9/projects/${PROJECT_ID}/env/${row.id}?decrypt=true`);
  values[key] = decrypted.value;
}
const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: values.GMAIL_OAUTH_CLIENT_ID,
    client_secret: values.GMAIL_OAUTH_CLIENT_SECRET,
    refresh_token: values.GMAIL_OAUTH_REFRESH_TOKEN,
    grant_type: "refresh_token",
  }),
});
const accessToken = (await tokenRes.json()).access_token;
async function gmail(path) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}
const after = Math.floor(new Date(WINDOW_START).getTime() / 1000);
const page = await gmail(`users/me/messages?maxResults=20&q=${encodeURIComponent(`after:${after}`)}`);
const rows = [];
for (const message of page.messages || []) {
  const detail = await gmail(`users/me/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`);
  const headers = Object.fromEntries((detail.payload?.headers || []).map((header) => [header.name.toLowerCase(), header.value || ""]));
  const from = headers.from || "";
  const domain = (from.match(/@([^>\s]+)/) || [])[1] || null;
  rows.push({
    id_fingerprint: createHash("sha256").update(message.id).digest("hex").slice(0, 12),
    thread_fingerprint: createHash("sha256").update(detail.threadId || "").digest("hex").slice(0, 12),
    from_domain: domain,
    known_inbound: message.id === "1a0be7a9feee5375",
    known_thread: detail.threadId === "1a0af74557b0eb36",
  });
}
writeFileSync(join(process.cwd(), ".infinity/blog-os/v12-blind-domains.json"), `${JSON.stringify({ collected_at: new Date().toISOString(), rows }, null, 2)}\n`);
console.log(JSON.stringify({ collected_at: new Date().toISOString(), count: rows.length, domains: rows }, null, 2));
