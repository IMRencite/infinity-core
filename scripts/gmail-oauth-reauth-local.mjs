#!/usr/bin/env node
/**
 * Local Gmail OAuth reauth: listens on 127.0.0.1:8765/oauth2callback.
 * Never logs client_secret, authorization code, or refresh_token.
 */
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i);
    let v = t.slice(i + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] == null) process.env[k] = v;
  }
}

loadEnv();

const clientId = process.env.GMAIL_OAUTH_CLIENT_ID ?? "";
const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET ?? "";
const redirectUri = process.env.GMAIL_OAUTH_REDIRECT_URI?.trim() || "http://localhost:8765/oauth2callback";
const port = Number(process.env.GMAIL_OAUTH_LOCAL_PORT ?? "8765");
const state = randomBytes(16).toString("hex");
const statePath = join(process.cwd(), ".infinity/blog-os/gmail-oauth-local-state.json");

if (!clientId || !clientSecret) {
  console.log(JSON.stringify({ ok: false, reason: "MISSING_GMAIL_OAUTH_CLIENT_ID_OR_SECRET" }, null, 2));
  process.exit(2);
}

writeFileSync(
  statePath,
  `${JSON.stringify({ collected_at: new Date().toISOString(), state, redirect_uri: redirectUri }, null, 2)}\n`,
);

const scopes = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "openid",
  "email",
];
const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", redirectUri);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", scopes.join(" "));
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");
authUrl.searchParams.set("include_granted_scopes", "true");
authUrl.searchParams.set("state", state);

const reportPath = join(process.cwd(), ".infinity/blog-os/gmail-oauth-reauth-local-20260928.json");

function safeHtml(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><p>${body}</p></body></html>`;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  const err = url.searchParams.get("error");
  if (err) {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end(safeHtml("OAuth error", "Authorization was denied or failed. You can close this tab."));
    server.close();
    process.exit(1);
  }
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  if (!code || returnedState !== state) {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end(safeHtml("Invalid callback", "Missing code or state mismatch. Restart the listener and try again."));
    server.close();
    process.exit(1);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  const refreshPresent = Boolean(tokenJson.refresh_token);
  const fingerprint = tokenJson.refresh_token
    ? createHash("sha256").update(String(tokenJson.refresh_token)).digest("hex").slice(0, 12)
    : null;

  const report = {
    collected_at: new Date().toISOString(),
    callback: "PASS",
    token_exchange: tokenRes.ok && !tokenJson.error ? "PASS" : "FAIL",
    refresh_token_present: refreshPresent,
    refresh_token_fingerprint: fingerprint,
    next_step: refreshPresent
      ? "Copy refresh token from secure local exchange output into infinity-runtime GMAIL_OAUTH_REFRESH_TOKEN (do not commit)"
      : "Re-run with prompt=consent; Google may omit refresh_token if grant still active",
    error_class: tokenJson.error ?? null,
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(
    safeHtml(
      "Gmail reauth complete",
      refreshPresent
        ? "Token exchange succeeded. Check the local report file for next steps (refresh token is NOT shown in the browser)."
        : "Token exchange finished but no new refresh token was returned. See local report.",
    ),
  );

  console.log(JSON.stringify(report, null, 2));
  server.close();
  process.exit(tokenRes.ok && refreshPresent ? 0 : 1);
});

server.listen(port, "127.0.0.1", () => {
  const banner = {
    collected_at: new Date().toISOString(),
    GMAIL_LOCAL_OAUTH_CALLBACK: "LISTENING",
    host: "127.0.0.1",
    port,
    path: "/oauth2callback",
    founder_action: `Open while listener is running: ${authUrl.toString()}`,
    do_not_paste_in_chat: ["client_secret", "authorization_code", "refresh_token", "access_token"],
  };
  writeFileSync(reportPath, `${JSON.stringify(banner, null, 2)}\n`);
  console.log(JSON.stringify(banner, null, 2));
});
