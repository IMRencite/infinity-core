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
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const HQ = "prj_AVa1EK79vagoOB8PEtzWAQZTX0xI";
const url = `https://api.vercel.com/v6/deployments?projectId=${HQ}&limit=20&teamId=${encodeURIComponent(team)}`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
const json = await res.json();
const rows = (json.deployments || []).map((row) => ({
  id: row.uid,
  created: row.created ? new Date(row.created).toISOString() : null,
  state: row.readyState || row.state,
  target: row.target,
  url: row.url,
  aliases: row.aliases || [],
}));
const out = {
  collected_at: new Date().toISOString(),
  status: res.status,
  ready_production: rows.filter((row) => row.state === "READY" && row.target === "production"),
  ready_any: rows.filter((row) => row.state === "READY"),
  latest: rows[0] || null,
  rows,
};
writeFileSync(join(process.cwd(), ".infinity/blog-os/hq-deployments-v4.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
