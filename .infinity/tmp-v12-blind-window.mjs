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

function fingerprint(value) {
  return value ? createHash("sha256").update(value).digest("hex").slice(0, 12) : null;
}

loadEnv();

const PROJECT_ID = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const WINDOW_START = "2026-09-20T23:35:31.322Z";
const KNOWN_INBOUND = "1a0be7a9feee5375";
const KNOWN_THREAD = "1a0af74557b0eb36";

async function vercel(path) {
  const res = await fetch(`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

const listed = await vercel(`/v9/projects/${PROJECT_ID}/env`);
const envs = Array.isArray(listed.envs) ? listed.envs : [];
const values = {};
for (const key of ["GMAIL_OAUTH_CLIENT_ID", "GMAIL_OAUTH_CLIENT_SECRET", "GMAIL_OAUTH_REFRESH_TOKEN", "GMAIL_SENDER_EMAIL"]) {
  const row = envs.find((item) => item.key === key);
  if (!row) continue;
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
const tokenJson = await tokenRes.json();
const accessToken = tokenJson.access_token;
const sender = String(values.GMAIL_SENDER_EMAIL || "").toLowerCase();

async function gmail(path) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return { ok: res.ok, status: res.status, json: await res.json() };
}

const profile = await gmail("users/me/profile");
const historyId = profile.json?.historyId;
const after = Math.floor(new Date(WINDOW_START).getTime() / 1000);
const listedMessages = [];
let pageToken = "";
for (let i = 0; i < 10; i += 1) {
  const query = `users/me/messages?maxResults=100&q=${encodeURIComponent(`after:${after}`)}${pageToken ? `&pageToken=${pageToken}` : ""}`;
  const page = await gmail(query);
  if (!page.ok) break;
  listedMessages.push(...(page.json.messages || []));
  pageToken = page.json.nextPageToken || "";
  if (!pageToken) break;
}

function classify(from, to, headers, id, threadId, snippet) {
  const fromL = from.toLowerCase();
  const toL = to.toLowerCase();
  const subject = (headers.subject || "").toLowerCase();
  if (id === KNOWN_INBOUND || threadId === KNOWN_THREAD) return "FOUNDER_TEST";
  if (fromL.includes("mailer-daemon") || fromL.includes("no-reply") || subject.includes("delivery status")) return "SYSTEM";
  if (fromL.includes(sender) && toL.includes(sender)) return "SYSTEM";
  if (fromL.includes("communication-probe") || toL.includes("communication-probe")) return "KNOWN_PROBE";
  if (/@/.test(fromL) && !fromL.includes(sender) && !fromL.includes("imros.io") && !fromL.includes("infinitemediaresources")) {
    return "UNKNOWN_EXTERNAL";
  }
  if (fromL.includes("imros.io") || fromL.includes("infinitemediaresources") || fromL.includes(sender)) return "FOUNDER_TEST";
  return "UNKNOWN_EXTERNAL";
}

const classified = [];
for (const row of listedMessages) {
  const detail = await gmail(`users/me/messages/${row.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`);
  const headers = {};
  for (const header of detail.json?.payload?.headers || []) {
    headers[header.name.toLowerCase()] = header.value || "";
  }
  const kind = classify(headers.from || "", headers.to || "", headers, row.id, detail.json?.threadId || row.threadId, detail.json?.snippet || "");
  classified.push({
    id: row.id,
    threadId: detail.json?.threadId || row.threadId || null,
    kind,
    from_domain: (headers.from || "").split("@")[1]?.replace(/>$/, "") || null,
  });
}

const counts = classified.reduce((acc, row) => {
  acc[row.kind] = (acc[row.kind] || 0) + 1;
  return acc;
}, {});

const history = historyId
  ? await gmail(`users/me/history?startHistoryId=${encodeURIComponent(String(historyId))}&maxResults=1`)
  : { ok: false, status: 0, json: { error: "NO_PROFILE_HISTORY_ID" } };

const out = {
  collected_at: new Date().toISOString(),
  window_start: WINDOW_START,
  window_end: new Date().toISOString(),
  credential_fingerprint: fingerprint(values.GMAIL_OAUTH_REFRESH_TOKEN),
  mailbox_fingerprint: fingerprint(profile.json?.emailAddress || ""),
  profile_ok: profile.ok,
  history_with_profile_id: {
    ok: history.ok,
    status: history.status,
    error: history.ok ? null : (history.json?.error?.message || history.json?.error || null),
  },
  discovered: classified.length,
  counts,
  known_inbound_present: classified.some((row) => row.id === KNOWN_INBOUND),
  real_external_prospect: counts.REAL_EXTERNAL_PROSPECT || 0,
  unknown_external: counts.UNKNOWN_EXTERNAL || 0,
  founder_test: counts.FOUNDER_TEST || 0,
  system: counts.SYSTEM || 0,
  known_probe: counts.KNOWN_PROBE || 0,
};

writeFileSync(join(process.cwd(), ".infinity/blog-os/v12-blind-window.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
