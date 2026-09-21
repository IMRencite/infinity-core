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
const keys = [
  "GMAIL_OAUTH_CLIENT_ID",
  "GMAIL_OAUTH_CLIENT_SECRET",
  "GMAIL_OAUTH_REFRESH_TOKEN",
  "GMAIL_SENDER_EMAIL",
  "OUTBOUND_CANARY_EMAIL",
  "OUTBOUND_CANARY_ENABLED",
  "OUTBOUND_MODE",
];
const listed = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?teamId=${encodeURIComponent(team)}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await listed.json();
const envs = Array.isArray(json.envs) ? json.envs : [];
const report = Object.fromEntries(keys.map((key) => {
  const rows = envs.filter((row) => row.key === key);
  return [key, {
    present: rows.length > 0,
    targets: rows.map((row) => row.target ?? []).flat(),
    type: rows.map((row) => row.type).filter(Boolean),
  }];
}));
console.log(JSON.stringify({
  ok: listed.ok,
  project: "infinity-runtime",
  gmail: report,
  totalEnvKeys: envs.length,
}, null, 2));
