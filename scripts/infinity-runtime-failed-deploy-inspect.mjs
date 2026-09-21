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
const id = "dpl_23chbX9pEFKDsL4hHRQypHUy6ax5";
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
const headers = { Authorization: `Bearer ${token}` };
const qs = `teamId=${encodeURIComponent(team)}`;

const deployment = await fetch(`https://api.vercel.com/v13/deployments/${id}?${qs}`, { headers }).then((r) => r.json());
const events = await fetch(`https://api.vercel.com/v2/deployments/${id}/events?${qs}&builds=1&direction=backward&limit=200`, { headers }).then((r) => r.json());
const rows = Array.isArray(events) ? events : events.events || events.data || [];
const texts = rows.map((row) => {
  const text = row.text || row.payload?.text || row.payload?.info || row.payload?.name || "";
  return { type: row.type || row.payload?.type || null, text: String(text).slice(0, 400) };
}).filter((row) => row.text);

const interesting = texts.filter((row) => /error|fail|cannot|unable|missing|module not found|Type error|ELIFECYCLE|npm run build/i.test(row.text));
console.log(JSON.stringify({
  readyState: deployment.readyState,
  errorCode: deployment.errorCode || null,
  errorMessage: deployment.errorMessage || null,
  source: deployment.source || null,
  target: deployment.target || null,
  buildingAt: deployment.buildingAt || null,
  ready: deployment.ready || null,
  interesting: interesting.slice(0, 40),
  lastTexts: texts.slice(0, 25).map((row) => row.text),
}, null, 2));
