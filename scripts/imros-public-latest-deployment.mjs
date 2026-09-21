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
const listed = await fetch(`https://api.vercel.com/v6/deployments?projectId=prj_vFJv26Vt5w08ShcrqqBQmcHTVxcX&limit=1&teamId=${encodeURIComponent(team)}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await listed.json();
const row = (json.deployments || [])[0];
console.log(JSON.stringify({
  id: row?.uid || row?.id || null,
  state: row?.readyState || null,
  url: row?.url || null,
  target: row?.target || null,
}, null, 2));
