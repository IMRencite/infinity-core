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
const projectId = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
if (!token || !team) {
  console.log(JSON.stringify({ ok: false, reason: "VERCEL_TOKEN_OR_TEAM_MISSING" }));
  process.exit(1);
}

const listed = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=3&teamId=${encodeURIComponent(team)}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await listed.json();
const rows = (json.deployments || []).map((row) => ({
  id: row.uid || row.id,
  state: row.readyState || row.state,
  target: row.target,
  url: row.url,
  created: row.created,
}));
console.log(JSON.stringify({ ok: listed.ok, rows }, null, 2));
