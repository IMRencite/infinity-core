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
    process.env[trimmed.slice(0, sep)] = trimmed.slice(sep + 1).replace(/^['"]|['"]$/g, "");
  }
}

loadEnv();

const clientId = process.env.GMAIL_OAUTH_CLIENT_ID ?? "";
const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET ?? "";
const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN ?? "";
const sender = (process.env.GMAIL_SENDER_EMAIL ?? "").trim().toLowerCase();
const fingerprint = refreshToken
  ? createHash("sha256").update(refreshToken).digest("hex").slice(0, 12)
  : null;

const body = new URLSearchParams({
  client_id: clientId,
  client_secret: clientSecret,
  refresh_token: refreshToken,
  grant_type: "refresh_token",
});

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body,
});
const tokenJson = await tokenRes.json().catch(() => ({}));
const accessToken = typeof tokenJson.access_token === "string" ? tokenJson.access_token : "";
let scopes = typeof tokenJson.scope === "string" ? tokenJson.scope.split(/\s+/).filter(Boolean) : [];
if (accessToken) {
  const infoRes = await fetch("https://oauth2.googleapis.com/tokeninfo", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ access_token: accessToken }),
  });
  const infoJson = await infoRes.json().catch(() => ({}));
  if (typeof infoJson.scope === "string") {
    scopes = [...new Set([...scopes, ...infoJson.scope.split(/\s+/).filter(Boolean)])];
  }
}
const sendScope = scopes.some((scope) => scope.includes("gmail.send") || scope.includes("gmail.modify") || scope.includes("gmail.compose") || scope === "https://mail.google.com/");
const userinfoScope = scopes.some((scope) => scope.includes("userinfo.email") || scope.endsWith("/email"));
const scopeNames = scopes.map((scope) => scope.replace(/^https:\/\/www\.googleapis\.com\/auth\//, ""));

let identity = { ok: false, verified: false, domain: null };
if (accessToken) {
  const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const info = await infoRes.json().catch(() => ({}));
  const email = typeof info.email === "string" ? info.email.toLowerCase() : "";
  identity = {
    ok: infoRes.ok && email.includes("@"),
    verified: info.verified_email === true,
    domain: email.includes("@") ? email.split("@")[1] : null,
  };
}

const report = {
  credential_present: Boolean(clientId && clientSecret && refreshToken),
  credential_fingerprint: fingerprint,
  client_id_present: Boolean(clientId),
  client_secret_present: Boolean(clientSecret),
  refresh_token_present: Boolean(refreshToken),
  sender_declared: Boolean(sender.includes("@")),
  sender_identity: identity.domain ? { domain: identity.domain, verified: identity.verified } : "UNRESOLVED",
  token_exchange: tokenRes.ok && Boolean(accessToken) ? "PASS" : "FAIL",
  google_error: tokenJson.error ?? null,
  google_error_description: tokenJson.error_description ?? null,
  gmail_send_scope: sendScope,
  userinfo_email_scope: userinfoScope,
  scope_names: scopeNames,
  userinfo_identity: identity.ok ? "PASS" : "FAIL",
};
console.log(JSON.stringify(report, null, 2));
if (report.token_exchange !== "PASS" || !report.gmail_send_scope || report.userinfo_identity !== "PASS") process.exit(1);
