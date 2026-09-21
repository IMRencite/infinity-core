import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";

async function main() {
  loadServerEnvFromLocalFile();
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.log(JSON.stringify({ ok: false, reason: "CRON_SECRET_MISSING" }));
    process.exit(1);
  }
  const res = await fetch("https://infinity-runtime.vercel.app/api/runtime/operating-state", {
    headers: { authorization: `Bearer ${secret}`, "cache-control": "no-store" },
  });
  const json = await res.json() as {
    communicationScheduler?: Record<string, unknown>;
    gmailAttestation?: Record<string, unknown>;
    consultativeComposer?: { version?: string; parity?: { result?: string } };
    closedLoop?: { conversation_state?: string; next_action?: string; suppression?: { status?: string; source_message_id?: string; source_role?: string } };
  };
  const sched = json.communicationScheduler ?? {};
  console.log(JSON.stringify({
    http: res.status,
    scheduler_status: sched.status,
    last_tick_at: sched.last_tick_at,
    last_gmail_check_at: sched.last_gmail_check_at,
    last_error: sched.last_error,
    token_exchange: sched.token_exchange,
    gmail_readonly: sched.gmail_readonly_present,
    gmail_send: sched.gmail_send_present,
    cron_health: sched.cron_health,
    observe_error_kind: sched.observe_error_kind,
    composer_version: json.consultativeComposer?.version ?? sched.composer_version,
    composer_parity: json.consultativeComposer?.parity?.result ?? null,
    env_client: json.gmailAttestation?.clientIdPresent,
    env_refresh: json.gmailAttestation?.refreshTokenPresent,
    conversation_state: json.closedLoop?.conversation_state ?? null,
    next_action: json.closedLoop?.next_action ?? null,
    suppression_status: json.closedLoop?.suppression?.status ?? null,
    suppression_source: json.closedLoop?.suppression?.source_message_id ?? null,
    suppression_role: json.closedLoop?.suppression?.source_role ?? null,
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "OBSERVE_FAILED" }));
  process.exit(1);
});
