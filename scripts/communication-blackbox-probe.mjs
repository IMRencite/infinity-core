/**
 * Black-box mailbox probe. Independent of runtime heartbeats and gates.
 * Uses its own mailbox. Excluded from clean-turn counts.
 * Armed only with COMMUNICATION_PROBE_GMAIL_* credentials — never the
 * production or founder test mailbox.
 */
import { randomBytes } from "node:crypto";

const PAGE_WEBHOOK = process.env.COMMUNICATION_PAGE_WEBHOOK || "";
const PRODUCTION_MAILBOX = process.env.COMMUNICATION_PRODUCTION_MAILBOX || "hello@imros.io";
const SLO_MS = Number(process.env.COMMUNICATION_PROBE_SLO_MS || 20 * 60 * 1000);
const now = new Date().toISOString();

function env(name) {
  return (process.env[name] ?? "").trim();
}

const probeMailbox = env("COMMUNICATION_PROBE_MAILBOX");
const clientId = env("COMMUNICATION_PROBE_GMAIL_CLIENT_ID");
const clientSecret = env("COMMUNICATION_PROBE_GMAIL_CLIENT_SECRET");
const refreshToken = env("COMMUNICATION_PROBE_GMAIL_REFRESH_TOKEN");
const armed = Boolean(probeMailbox && clientId && clientSecret && refreshToken);

async function page(reason, detail) {
  if (!PAGE_WEBHOOK) return { paged: false, reason: "PAGE_WEBHOOK_UNSET" };
  const res = await fetch(PAGE_WEBHOOK, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind: "COMMUNICATION_BLACKBOX_PROBE",
      reason,
      detail,
      at: now,
    }),
  }).catch((error) => ({ ok: false, status: 0, error: error instanceof Error ? error.message : "PAGE_FAILED" }));
  return { paged: Boolean(res && "ok" in res ? res.ok : false), status: res && "status" in res ? res.status : 0 };
}

if (!armed) {
  console.log(JSON.stringify({
    ok: false,
    status: "PROBE_NOT_ARMED",
    page: false,
    counts_toward_clean: false,
    reason: "PROBE_MAILBOX_CREDENTIALS_MISSING",
    required: [
      "COMMUNICATION_PROBE_MAILBOX",
      "COMMUNICATION_PROBE_GMAIL_CLIENT_ID",
      "COMMUNICATION_PROBE_GMAIL_CLIENT_SECRET",
      "COMMUNICATION_PROBE_GMAIL_REFRESH_TOKEN",
    ],
    observed_at: now,
  }, null, 2));
  process.exit(2);
}

if (probeMailbox.toLowerCase() === PRODUCTION_MAILBOX.toLowerCase()) {
  console.log(JSON.stringify({
    ok: false,
    status: "PROBE_REFUSED_SAME_MAILBOX",
    page: false,
    reason: "PROBE_MUST_USE_OWN_MAILBOX",
    observed_at: now,
  }, null, 2));
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
const access = tokenJson.access_token ?? "";
if (!access) {
  const alert = await page("PROBE_TOKEN_FAILED", { error: tokenJson.error ?? tokenRes.status });
  console.log(JSON.stringify({ ok: false, status: "PROBE_TOKEN_FAILED", alert, observed_at: now }, null, 2));
  process.exit(2);
}

const token = randomBytes(8).toString("hex");
const subject = `[INFINITY-PROBE ${token}]`;
const raw = [
  `To: ${PRODUCTION_MAILBOX}`,
  `From: ${probeMailbox}`,
  `Subject: ${subject}`,
  "MIME-Version: 1.0",
  "Content-Type: text/plain; charset=utf-8",
  "X-Infinity-Probe: 1",
  "",
  `Black-box probe ${token} at ${now}. Do not count toward clean turns.`,
].join("\r\n");
const encoded = Buffer.from(raw).toString("base64url");
const sent = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${access}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ raw: encoded }),
});
const sentJson = await sent.json().catch(() => ({}));
if (!sent.ok) {
  const alert = await page("PROBE_SEND_FAILED", { status: sent.status });
  console.log(JSON.stringify({ ok: false, status: "PROBE_SEND_FAILED", alert, observed_at: now }, null, 2));
  process.exit(2);
}

const sentAt = now;
const deadline = Date.now() + Math.min(SLO_MS, 8 * 60 * 1000);
let repliedAt = null;
while (Date.now() < deadline && !repliedAt) {
  const listed = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(`subject:${token} newer_than:1d`)}&maxResults=10`,
    { headers: { Authorization: `Bearer ${access}` } },
  ).then((res) => res.json()).catch(() => ({}));
  for (const row of listed.messages ?? []) {
    const full = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${row.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, {
      headers: { Authorization: `Bearer ${access}` },
    }).then((res) => res.json()).catch(() => null);
    const from = (full?.payload?.headers ?? []).find((header) => header.name?.toLowerCase() === "from")?.value ?? "";
    if (full?.id && full.id !== sentJson.id && from.toLowerCase().includes(PRODUCTION_MAILBOX.toLowerCase())) {
      repliedAt = new Date().toISOString();
      break;
    }
  }
  if (!repliedAt) await new Promise((resolve) => setTimeout(resolve, 20000));
}

const age = Date.parse(new Date().toISOString()) - Date.parse(sentAt);
const sloMiss = !repliedAt && age > SLO_MS;
const snapshot = {
  observer: "github-actions-communication-blackbox-probe",
  shares_vercel_runtime: false,
  counts_toward_clean: false,
  mailbox: probeMailbox,
  production_mailbox: PRODUCTION_MAILBOX,
  token,
  sent_id: sentJson.id ?? null,
  replied_at: repliedAt,
  slo_ms: SLO_MS,
  first_failure: sloMiss ? "PROBE_SLO_MISS" : (repliedAt ? null : "PROBE_IN_FLIGHT"),
  observed_at: new Date().toISOString(),
};

if (sloMiss) {
  const alert = await page("PROBE_SLO_MISS", snapshot);
  console.log(JSON.stringify({ ok: false, snapshot, alert }, null, 2));
  process.exit(2);
}

console.log(JSON.stringify({ ok: Boolean(repliedAt), snapshot }, null, 2));
if (!repliedAt) process.exit(2);
