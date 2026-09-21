import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const secret = process.env.CRON_SECRET;
const stateRes = await fetch("https://infinity-runtime.vercel.app/api/runtime/operating-state", {
  headers: { authorization: `Bearer ${secret}`, "cache-control": "no-store" },
});
const json = await stateRes.json();
const s = json.communicationScheduler ?? {};
const jobs = (s.pacing_jobs ?? []).concat(
  Array.isArray(json.communicationScheduler?.jobs) ? json.communicationScheduler.jobs : [],
);
console.log(JSON.stringify({
  observe_only: true,
  http_status: stateRes.status,
  status: s.status,
  last_tick_at: s.last_tick_at,
  last_gmail_check_at: s.last_gmail_check_at,
  last_error: s.last_error,
  last_inbound_message_id: s.last_inbound_message_id ?? null,
  last_detected_at: s.last_detected_at ?? null,
  credential_health: s.credential_health,
  consecutive: s.consecutive_healthy_cron,
  business_loop: s.business_loop,
  inbound_overdue: s.inbound_overdue,
  inbound_reason: s.inbound_reason,
  newest_inbound_at: s.newest_inbound_at,
  inbound_state: s.inbound_state,
  watching: s.watching,
  mailbox_watch: s.mailbox_watch,
  waiting_jobs: s.waiting_jobs,
  ready_jobs: s.ready_jobs,
  failed_jobs: s.failed_jobs,
  messages_detected_24h: s.messages_detected_24h,
  last_error_sched: s.last_error,
  closedLoop: json.closedLoop ?? null,
  pacing_jobs: s.pacing_jobs ?? [],
  jobs_from_state: json.communicationScheduler?.jobs ?? null,
}, null, 2));
