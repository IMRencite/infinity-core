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
const id = process.argv[2];
if (!id?.startsWith("dpl_")) {
  console.error("usage: vercel-deployment-events.mjs <dpl_id>");
  process.exit(1);
}
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
if (!token || !team) {
  console.log(JSON.stringify({ ok: false, reason: "VERCEL_TOKEN_OR_TEAM_MISSING" }));
  process.exit(2);
}
const headers = { Authorization: `Bearer ${token}` };
const qs = `teamId=${encodeURIComponent(team)}`;
const deployment = await fetch(`https://api.vercel.com/v13/deployments/${id}?${qs}`, { headers }).then((r) => r.json());
const events = await fetch(`https://api.vercel.com/v2/deployments/${id}/events?${qs}&builds=1&direction=backward&limit=200`, { headers }).then((r) => r.json());
const rows = Array.isArray(events) ? events : events.events || events.data || [];
const texts = rows
  .map((row) => {
    const text = row.text || row.payload?.text || row.payload?.info || row.payload?.name || "";
    return String(text).slice(0, 500);
  })
  .filter(Boolean);
const interesting = texts.filter((t) => /error|fail|cannot|unable|missing|module not found|Type error|ELIFECYCLE/i.test(t));
console.log(
  JSON.stringify(
    {
      readyState: deployment.readyState,
      errorCode: deployment.errorCode ?? null,
      errorMessage: deployment.errorMessage ?? null,
      interesting: interesting.slice(0, 30),
      tail: texts.slice(0, 15),
    },
    null,
    2,
  ),
);
