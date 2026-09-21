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
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const id = process.argv[2] || "dpl_7TS21vFSrrmZFQFf8gBiUeXWhtQQ";
const res = await fetch(`https://api.vercel.com/v2/deployments/${id}/events?teamId=${encodeURIComponent(team)}&builds=1&direction=backward&limit=120`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await res.json().catch(() => ({}));
const events = Array.isArray(json) ? json : json.events || [];
const texts = events
  .map((row) => String(row.text || row.payload?.text || row.message || row.type || ""))
  .map((text) => text.replace(/ya29\.|GOCSPX-|Bearer\s+[A-Za-z0-9._-]+/gi, "[redacted]"));
const start = texts.findIndex((text) => /Type error|string \| undefined|Failed to type/i.test(text));
console.log(JSON.stringify({
  status: res.status,
  count: events.length,
  window: texts.slice(Math.max(0, start - 8), start + 15),
}, null, 2));
