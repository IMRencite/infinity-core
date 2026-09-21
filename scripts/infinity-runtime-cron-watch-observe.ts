import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";

async function main() {
  loadServerEnvFromLocalFile();
  const token = process.env.VERCEL_TOKEN;
  const team = process.env.VERCEL_TEAM_ID;
  const secret = process.env.CRON_SECRET;
  if (!token || !team || !secret) {
    console.log(JSON.stringify({ ok: false, reason: "ENV_MISSING" }));
    process.exit(1);
  }
  const projectId = "prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox";
  const crons = await fetch(`https://api.vercel.com/v1/projects/${projectId}/crons?teamId=${encodeURIComponent(team)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const cronJson = crons.ok ? await crons.json() as { crons?: Array<{ path?: string; schedule?: string; enabled?: boolean }> } : { crons: [] };
  const state = await fetch("https://infinity-runtime.vercel.app/api/runtime/operating-state", {
    headers: { authorization: `Bearer ${secret}`, "cache-control": "no-store" },
  });
  const json = await state.json() as {
    communicationScheduler?: {
      status?: string;
      last_tick_at?: string | null;
      last_gmail_check_at?: string | null;
      last_error?: string | null;
      token_exchange?: boolean;
      gmail_readonly_present?: boolean;
      gmail_send_present?: boolean;
      business_loop?: string;
      inbound_overdue?: boolean;
      watching?: boolean;
      mailbox_watch?: { result?: string; reasons?: string[] };
      credential_health?: string;
      credential_source?: string | null;
      credential_fingerprint?: string | null;
      consecutive_healthy_cron?: number;
      last_credential_failure_at?: string | null;
      last_successful_exchange_at?: string | null;
      same_invocation_parity?: string | null;
      exchange_input_fingerprint?: string | null;
      startup_state?: string;
      CronCredentialVisibilityStabilityGate?: { result?: string; reasons?: string[] };
      GmailCredentialConflictGate?: { result?: string };
      env_parity?: { result?: string };
      active_deployment_id?: string | null;
      last_authoritative_cron_at?: string | null;
      last_ignored_stale_observation?: string | null;
      last_write_conflict?: string | null;
      credential_projection_version?: string;
      PostCronOverwriteProtectionGate?: { result?: string; reasons?: string[] };
      StaleCredentialHealthWriterGate?: { result?: string; reasons?: string[] };
      PartialInvocationOverwriteGate?: { result?: string; reasons?: string[] };
      DeploymentScopedCredentialHealthGate?: { result?: string; reasons?: string[] };
    };
    consultativeComposer?: { version?: string };
    gmailAttestation?: {
      clientIdPresent?: boolean;
      refreshTokenPresent?: boolean;
    };
    gmailRuntime?: {
      source?: string;
      fingerprint?: string | null;
      fallback_used?: boolean;
      conflict?: boolean;
      reader_version?: string;
    };
  };
  const sched = json.communicationScheduler ?? {};
  const ageMin = sched.last_gmail_check_at
    ? (Date.now() - Date.parse(sched.last_gmail_check_at)) / 60000
    : Number.POSITIVE_INFINITY;
  console.log(JSON.stringify({
    observe_only: true,
    crons: (cronJson.crons ?? []).map((row) => ({ path: row.path, schedule: row.schedule, enabled: row.enabled ?? true })),
    communication_cron: (cronJson.crons ?? []).some((row) => row.path === "/api/runtime/communication-tick" && row.schedule === "*/5 * * * *"),
    scheduler_status: sched.status,
    last_tick_at: sched.last_tick_at,
    last_gmail_check_at: sched.last_gmail_check_at,
    gmail_check_age_min: Number.isFinite(ageMin) ? Math.round(ageMin * 10) / 10 : null,
    last_error: sched.last_error,
    token_exchange: sched.token_exchange,
    gmail_readonly: sched.gmail_readonly_present,
    gmail_send: sched.gmail_send_present,
    business_loop: sched.business_loop ?? null,
    inbound_overdue: sched.inbound_overdue ?? null,
    composer: json.consultativeComposer?.version ?? null,
    mailbox_watch: sched.mailbox_watch ?? null,
    credential_health: sched.credential_health ?? null,
    credential_source: sched.credential_source ?? json.gmailRuntime?.source ?? null,
    fingerprint: sched.credential_fingerprint ?? json.gmailRuntime?.fingerprint ?? null,
    consecutive_healthy_cron: sched.consecutive_healthy_cron ?? 0,
    last_credential_failure_at: sched.last_credential_failure_at ?? null,
    last_successful_exchange_at: sched.last_successful_exchange_at ?? null,
    same_invocation_parity: sched.same_invocation_parity ?? null,
    exchange_input_fingerprint: sched.exchange_input_fingerprint ?? null,
    startup_state: sched.startup_state ?? null,
    stability_gate: sched.CronCredentialVisibilityStabilityGate ?? null,
    conflict_gate: sched.GmailCredentialConflictGate ?? null,
    env_parity: sched.env_parity ?? null,
    active_deployment_id: sched.active_deployment_id ?? null,
    last_authoritative_cron_at: sched.last_authoritative_cron_at ?? null,
    last_ignored_stale_observation: sched.last_ignored_stale_observation ?? null,
    last_write_conflict: sched.last_write_conflict ?? null,
    credential_projection_version: sched.credential_projection_version ?? null,
    post_cron_protection: sched.PostCronOverwriteProtectionGate ?? null,
    stale_writer_gate: sched.StaleCredentialHealthWriterGate ?? null,
    partial_overwrite_gate: sched.PartialInvocationOverwriteGate ?? null,
    deployment_scoped_gate: sched.DeploymentScopedCredentialHealthGate ?? null,
    http_source: json.gmailRuntime?.source ?? null,
    http_fingerprint: json.gmailRuntime?.fingerprint ?? null,
    http_fallback_used: json.gmailRuntime?.fallback_used ?? null,
    reader_version: json.gmailRuntime?.reader_version ?? null,
    env_client: json.gmailAttestation?.clientIdPresent ?? null,
    env_refresh: json.gmailAttestation?.refreshTokenPresent ?? null,
    watching: sched.watching
      ?? (Boolean(sched.token_exchange) && !/GRANT:NOT_CONFIGURED|NOT_CONFIGURED/i.test(sched.last_error ?? "") && Boolean(sched.last_gmail_check_at) && ageMin <= 15),
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "OBSERVE_FAILED" }));
  process.exit(1);
});
