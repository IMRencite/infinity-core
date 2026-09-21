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
const id = "1a0b23d641859457";
const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
  headers: { Authorization: `Bearer ${access}` },
});
const json = await res.json().catch(() => ({}));
function partShape(part, depth = 0) {
  return {
    mime: part?.mimeType ?? null,
    body_size: part?.body?.size ?? 0,
    has_data: Boolean(part?.body?.data),
    filename: part?.filename || null,
    parts: Array.isArray(part?.parts) ? part.parts.map((child) => partShape(child, depth + 1)) : [],
  };
}
const raw = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=raw`, {
  headers: { Authorization: `Bearer ${access}` },
});
const rawJson = await raw.json().catch(() => ({}));
const rawLen = typeof rawJson.raw === "string" ? rawJson.raw.length : 0;
let decodedLen = 0;
if (rawJson.raw) {
  try {
    decodedLen = Buffer.from(String(rawJson.raw).replace(/-/g, "+").replace(/_/g, "/"), "base64").length;
  } catch {
    decodedLen = 0;
  }
}
console.log(JSON.stringify({
  contract: "OccupancyNpvCanaryStopMessageInspectV1",
  id,
  status: res.status,
  size_estimate: json.sizeEstimate ?? null,
  label_ids: json.labelIds ?? [],
  snippet_len: String(json.snippet || "").length,
  raw_status: raw.status,
  raw_len: rawLen,
  decoded_len: decodedLen,
  has_payload: Boolean(json.payload),
  payload_shape: partShape(json.payload),
  raw_has_stop_line: rawJson.raw
    ? /(?:^|\r?\n)stop(?:\r?\n|$)/i.test(Buffer.from(String(rawJson.raw).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"))
    : false,
}, null, 2));
