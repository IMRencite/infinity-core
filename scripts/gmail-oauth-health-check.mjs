#!/usr/bin/env node
/** Reports Gmail OAuth health without printing secrets. */
import { readFileSync, existsSync } from "node:fs";
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

const clientId = process.env.GMAIL_OAUTH_CLIENT_ID ?? "";
const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET ?? "";
const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN ?? "";
const sender = process.env.GMAIL_SENDER_EMAIL ?? "";

const report = {
  collected_at: new Date().toISOString(),
  oauth_client: "Infinity OS Communications (existing env GMAIL_OAUTH_*)",
  client_id_present: Boolean(clientId),
  client_secret_present: Boolean(clientSecret),
  refresh_token_present: Boolean(refreshToken),
  sender_email_present: Boolean(sender),
  token_exchange: "NOT_RUN",
  gmail_readonly: "NOT_RUN",
  reauthorization: "FOUNDER_ACTION_REQUIRED",
};

if (!clientId || !clientSecret || !refreshToken) {
  console.log(JSON.stringify({ ...report, reason: "MISSING_OAUTH_MATERIAL" }, null, 2));
  process.exit(2);
}

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
if (!tokenRes.ok || tokenJson.error) {
  report.token_exchange = "FAIL";
  report.error_class = tokenJson.error ?? `HTTP_${tokenRes.status}`;
  report.reauthorization = "FOUNDER_ACTION_REQUIRED";
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

report.token_exchange = "PASS";
report.reauthorization = "PASS";
const accessToken = tokenJson.access_token;
const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
  headers: { Authorization: `Bearer ${accessToken}` },
});
report.gmail_readonly = profileRes.ok ? "PASS" : "FAIL";
report.gmail_send = "NOT_PROVEN";
console.log(JSON.stringify(report, null, 2));
process.exit(profileRes.ok ? 0 : 1);
