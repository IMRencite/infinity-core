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
const base = "https://infinity-runtime.vercel.app";
const secret = process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET;
const res = await fetch(`${base}/api/runtime/operating-state`, {
  cache: "no-store",
  headers: { authorization: `Bearer ${secret}` },
});
const body = await res.json().catch(() => ({}));
const scheduler = body.communicationScheduler && typeof body.communicationScheduler === "object" ? body.communicationScheduler : {};
console.log(JSON.stringify({
  status: res.status,
  runtimeStatus: body.status ?? null,
  gmailAttestation: body.gmailAttestation ?? null,
  scheduler: {
    status: scheduler.status ?? null,
    last_tick_at: scheduler.last_tick_at ?? null,
    last_gmail_check_at: scheduler.last_gmail_check_at ?? null,
    last_error: scheduler.last_error ?? null,
    waiting_jobs: scheduler.waiting_jobs ?? null,
    ready_jobs: scheduler.ready_jobs ?? null,
    failed_jobs: scheduler.failed_jobs ?? null,
    token_exchange: scheduler.token_exchange ?? null,
    gmail_send_present: scheduler.gmail_send_present ?? null,
    gmail_readonly_present: scheduler.gmail_readonly_present ?? null,
    cron_health: scheduler.cron_health ?? null,
    env_parity: scheduler.env_parity ?? null,
    observe_error_kind: scheduler.observe_error_kind ?? null,
  },
}, null, 2));
