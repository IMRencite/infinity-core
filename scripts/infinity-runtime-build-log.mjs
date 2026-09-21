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
const id = process.argv[2] || "dpl_23chbX9pEFKDsL4hHRQypHUy6ax5";
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const urls = [
  `https://api.vercel.com/v2/deployments/${id}/events?teamId=${encodeURIComponent(team)}&builds=1`,
  `https://api.vercel.com/v3/deployments/${id}/events?teamId=${encodeURIComponent(team)}`,
];
const out = [];
for (const url of urls) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => null);
  out.push({ url: url.split("?")[0], status: res.status, type: Array.isArray(json) ? "array" : typeof json, keys: json && !Array.isArray(json) ? Object.keys(json) : null, sample: Array.isArray(json) ? json.slice(-8).map((row) => row.text || row.type || row.payload) : json?.error || json?.message || null });
}
console.log(JSON.stringify(out, null, 2));
