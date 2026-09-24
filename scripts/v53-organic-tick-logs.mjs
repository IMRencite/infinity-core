import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const TEAM = "team_ildi4jRJvHUKWF93cu4XEZ7Z";
const ORGANIC_PRJ = "prj_2eXHzKYh2VSd6qnK80dkV6eZL1Pp";
const INTENDED = "dpl_A7EeQBTHfQPZTdGnqhJPJz1iZJka";
const SINCE = Date.parse("2026-09-24T08:09:40.959Z");

function token() {
  return JSON.parse(readFileSync(join(homedir(), "AppData/Roaming/com.vercel.cli/Data/auth.json"), "utf8")).token;
}

async function vercel(path) {
  const url = `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${TEAM}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
  const text = await res.text().catch(() => "");
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

const logs = await vercel(`/v1/projects/${ORGANIC_PRJ}/deployments/${INTENDED}/runtime-logs?since=${SINCE}&source=serverless`);
const raw = typeof logs.json === "string" ? logs.json : JSON.stringify(logs.json ?? logs.text ?? {});
const out = {
  collected_at: new Date().toISOString(),
  logs_status: logs.status,
  mentions_organic_tick: /organic-tick/i.test(raw),
  mentions_vercel_cron: /vercel-cron/i.test(raw),
  mentions_authorized: /AUTHORIZED/.test(raw),
  mentions_execute_true: /"execute_publish":true/.test(raw) || /execute_publish": true/.test(raw),
  mentions_blocked: /BLOCKED_HOLD/.test(raw),
  sample: raw.replace(/[A-Za-z0-9._-]{24,}/g, "[redacted]").slice(0, 2500),
  token_printed: false,
};
writeFileSync(join(process.cwd(), ".infinity/blog-os/v53-organic-tick-logs.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
