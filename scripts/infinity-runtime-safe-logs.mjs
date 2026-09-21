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
const id = "dpl_YCDSQLoGC6u4r9iGwLsJeVgmm3mm";
const res = await fetch(`https://api.vercel.com/v2/deployments/${id}/events?teamId=${encodeURIComponent(team)}&builds=1&direction=backward&limit=50`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await res.json().catch(() => ({}));
const events = Array.isArray(json) ? json : json.events || [];
const safe = events.map((row) => String(row.text || row.payload?.text || row.message || row.type || "")
  .replace(/ya29\.|GOCSPX-|Bearer\s+[A-Za-z0-9._-]+/gi, "[redacted]")
  .slice(0, 200));
console.log(JSON.stringify({ status: res.status, count: events.length, sample: safe.slice(0, 20) }, null, 2));
