import { createClient } from "@supabase/supabase-js";
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
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ownership = await client.from("communication_outbound_ownership").select("mailbox_id,thread_id,answered_inbound_provider_message_id,owner_path,owner_id,state,version,lease_expires_at,updated_at");
const schema = await client.rpc("exec_sql", {
  query: "select indexname, indexdef from pg_indexes where tablename = 'communication_outbound_ownership'",
}).then((row) => row).catch(() => ({ data: null, error: { message: "RPC_UNAVAILABLE" } }));

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
const access = tokenJson.access_token ?? "";
const after = Math.floor(Date.parse("2026-09-20T23:30:00.000Z") / 1000);
const listed = access
  ? await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(`after:${after}`)}&maxResults=40`, {
    headers: { Authorization: `Bearer ${access}` },
  }).then((res) => res.json()).catch(() => ({}))
  : { error: tokenJson.error ?? "NO_TOKEN", error_description: tokenJson.error_description ?? null };
const messages = [];
for (const row of listed.messages ?? []) {
  const full = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${row.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, {
    headers: { Authorization: `Bearer ${access}` },
  }).then((res) => res.json()).catch(() => null);
  if (!full?.id) continue;
  messages.push({
    id: full.id,
    threadId: full.threadId,
    internalDate: full.internalDate ? Number(full.internalDate) : null,
    internalDateIso: full.internalDate ? new Date(Number(full.internalDate)).toISOString() : null,
  });
}
const gapStart = Date.parse("2026-09-20T23:35:31.322Z");
const wwjStart = Date.parse("2026-09-21T01:24:50.777Z");
const wwjEnd = Date.parse("2026-09-21T01:38:48.640Z");
const target = messages.find((row) => row.id === "1a0be7a9feee5375");
const out = {
  unique_key_query: schema.data ?? schema.error?.message ?? "NOT_PROVEN",
  unique_key_source: "v7 expand-only; v8 expand-only; no DROP CONSTRAINT in applied migrations",
  ownership_count: ownership.data?.length ?? 0,
  fence: (ownership.data ?? []).find((row) => row.thread_id === "1a0af74557b0eb36") ?? null,
  gmail_token: Boolean(access),
  gmail_token_error: access ? null : (tokenJson.error ?? tokenRes.status),
  messages_since_2330: messages.length,
  target_internal_date_ms: target?.internalDate ?? null,
  gap_window: { start: "2026-09-20T23:35:31.322Z", end: new Date().toISOString() },
  gap_messages: messages.filter((row) => (row.internalDate ?? 0) >= gapStart).map((row) => row.id),
  wwjX_window_messages: messages.filter((row) => (row.internalDate ?? 0) >= wwjStart && (row.internalDate ?? 0) <= wwjEnd).map((row) => row.id),
};
writeFileSync(join(process.cwd(), "tmp-v8-unique-gap.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
