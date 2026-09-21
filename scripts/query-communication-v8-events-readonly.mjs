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

function iso(ms) {
  return typeof ms === "number" && Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

async function vercel(path) {
  const token = process.env.VERCEL_TOKEN;
  const team = process.env.VERCEL_TEAM_ID;
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${team}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
}

loadEnv();
const since = Date.parse("2026-09-20T23:00:00.000Z");
const deployments = await vercel("/v6/deployments?projectId=prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox&limit=20");
const events = await vercel(`/v3/events?projectId=prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox&limit=50&since=${since}`);
const dpl5aliases = await vercel("/v2/deployments/dpl_5iC51KgrdBghubsk5pzajV5pvm1B/aliases");
const dpl6aliases = await vercel("/v2/deployments/dpl_6saLKJDLFKFhPoscmEhTW9QdhHeo/aliases");
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
const access = (await tokenRes.json().catch(() => ({}))).access_token ?? "";
const target = access
  ? await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/1a0be7a9feee5375?format=metadata", {
    headers: { Authorization: `Bearer ${access}` },
  }).then((res) => res.json()).catch(() => ({}))
  : { error: "NO_TOKEN" };
const after = Math.floor(Date.parse("2026-09-20T23:30:00.000Z") / 1000);
const before = Math.floor(Date.now() / 1000);
const listed = access
  ? await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(`after:${after} before:${before}`)}&maxResults=20`, {
    headers: { Authorization: `Bearer ${access}` },
  }).then((res) => res.json()).catch(() => ({}))
  : {};
const rows = [];
for (const row of listed.messages ?? []) {
  const msg = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${row.id}?format=metadata&metadataHeaders=From`, {
    headers: { Authorization: `Bearer ${access}` },
  }).then((res) => res.json()).catch(() => ({}));
  rows.push({
    id: msg.id ?? row.id,
    internalDate: Number(msg.internalDate ?? 0),
    from: msg.payload?.headers?.find((header) => header.name?.toLowerCase() === "from")?.value ?? "",
    threadId: msg.threadId ?? "",
  });
}
const report = {
  deployments: (deployments.json?.deployments ?? []).map((row) => ({
    uid: row.uid,
    created: iso(row.created),
    ready: iso(row.ready),
    state: row.state,
    url: row.url,
    target: row.target,
  })),
  events: (events.json?.events ?? events.json?.items ?? []).slice(0, 40).map((row) => ({
    type: row.type,
    created: iso(row.createdAt ?? row.created),
    text: row.text ?? row.payload?.info ?? null,
    payload: row.payload ?? null,
  })),
  events_status: events.status,
  events_keys: events.json ? Object.keys(events.json) : [],
  dpl5_aliases: dpl5aliases.json,
  dpl6_aliases: dpl6aliases.json,
  gmail_token: Boolean(access),
  target_status_error: target.error ?? null,
  target_internal_date_ms: target.internalDate ? Number(target.internalDate) : null,
  target_id: target.id ?? null,
  recent_messages: rows,
};
writeFileSync(join(process.cwd(), "tmp-v8-events.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
