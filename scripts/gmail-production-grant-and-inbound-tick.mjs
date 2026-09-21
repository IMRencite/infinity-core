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
const BASE = "https://infinity-runtime.vercel.app";
const secret = process.env.CRON_SECRET || process.env.INFINITY_RUNTIME_TICK_SECRET;
const headers = { authorization: `Bearer ${secret}`, "content-type": "application/json" };
const unauth = await fetch(`${BASE}/api/runtime/operating-state`, { cache: "no-store" });
const tick = await fetch(`${BASE}/api/runtime/tick`, { method: "POST", headers, cache: "no-store" });
const body = await tick.json().catch(() => ({}));
const inbound = body.inbound ?? null;
const outbound = body.outbound ?? null;
console.log(JSON.stringify({
  contract: "GmailProductionGrantAndInboundTickV1",
  runtime: BASE,
  operating_state_unauth: unauth.status,
  tick_status: tick.status,
  cycleId: body.cycleId ?? null,
  grant: {
    token_exchange: outbound?.token_exchange ?? null,
    send_scope: outbound?.send_scope ?? null,
    readonly_scope: outbound?.readonly_scope ?? null,
    userinfo_scope: outbound?.userinfo_scope ?? null,
    provider_healthy: outbound?.provider_healthy ?? null,
    credential_fingerprint: outbound?.credential_fingerprint ?? null,
    mode: outbound?.mode ?? null,
  },
  inbound: inbound
    ? {
      inbound_connection: inbound.inbound_connection,
      detector_enabled: inbound.detector_enabled,
      detector_mode: inbound.detector_mode,
      last_successful_check: inbound.last_successful_check,
      last_error: inbound.last_error,
      reply_found: inbound.reply_found,
      provider_message_id: inbound.provider_message_id,
      thread_id: inbound.thread_id,
      received_at: inbound.received_at,
      ingested: inbound.ingested,
      classification: inbound.classification,
      next_action: inbound.next_action,
      eligible: inbound.eligible,
      pacing_state: inbound.pacing_state,
      send_attempted: inbound.send_attempted,
      send_accepted: inbound.send_accepted,
      same_thread: inbound.same_thread,
      pipeline_state: inbound.pipeline_state,
    }
    : null,
  observe_error: body.observe_error ?? null,
  error: tick.status >= 400 ? (body.reason ?? body.error ?? "TICK_FAILED") : null,
}, null, 2));
if (tick.status !== 200) process.exit(1);
