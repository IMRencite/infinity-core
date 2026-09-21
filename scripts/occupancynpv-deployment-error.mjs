import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sep = trimmed.indexOf("=");
  if (sep === -1) continue;
  let val = trimmed.slice(sep + 1);
  const key = trimmed.slice(0, sep);
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  if (!process.env[key]) process.env[key] = val;
}

const id = process.argv[2] ?? "dpl_Gwb7uGdXhL6CgTj5ZD7EG9VC6EGG";
const token = process.env.VERCEL_TOKEN;
const team = (process.env.VERCEL_TEAM_ID ?? "").trim();
const qs = team ? `?teamId=${encodeURIComponent(team)}` : "";
const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

const dep = await fetch(`https://api.vercel.com/v13/deployments/${id}${qs}`, { headers });
const info = await dep.json();
console.log("readyState:", info.readyState ?? info.status ?? "UNKNOWN");
console.log("errorMessage:", typeof info.errorMessage === "string" ? info.errorMessage.slice(0, 400) : "NONE");
console.log("errorCode:", info.errorCode ?? "NONE");

const eventsRes = await fetch(`https://api.vercel.com/v3/deployments/${id}/events${qs}${qs ? "&" : "?"}limit=120`, { headers });
const events = await eventsRes.json();
const rows = Array.isArray(events) ? events : (events.events ?? []);
const texts = [];
for (const row of rows) {
  const text = typeof row.text === "string" ? row.text : typeof row.payload?.text === "string" ? row.payload.text : "";
  if (text) texts.push(text.replace(/\s+/g, " ").trim());
}
const idx = texts.findIndex((text) => /Type error/i.test(text));
const start = idx >= 0 ? Math.max(0, idx - 4) : Math.max(0, texts.length - 15);
for (const text of texts.slice(start, start + 12)) {
  console.log("log:", text.slice(0, 400));
}
