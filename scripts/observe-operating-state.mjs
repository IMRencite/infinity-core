import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
const token = process.env.VERCEL_TOKEN;
const team = process.env.VERCEL_TEAM_ID;
if (!secret || !token || !team) {
  console.log(JSON.stringify({ ok: false, reason: "ENV_MISSING" }));
  process.exit(1);
}

const aliasRes = await fetch(`https://api.vercel.com/v13/deployments/infinity-runtime.vercel.app?teamId=${encodeURIComponent(team)}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const aliasJson = await aliasRes.json();
const stateRes = await fetch("https://infinity-runtime.vercel.app/api/runtime/operating-state", {
  headers: { authorization: `Bearer ${secret}`, "cache-control": "no-store" },
});
const json = await stateRes.json();
const s = json.communicationScheduler ?? {};
console.log(JSON.stringify({
  observe_only: true,
  http_status: stateRes.status,
  alias_ok: aliasRes.ok,
  alias_deployment: aliasJson.id ?? aliasJson.uid ?? null,
  alias_url: aliasJson.url ?? null,
  readyState: aliasJson.readyState ?? null,
  status: s.status ?? null,
  last_tick_at: s.last_tick_at ?? null,
  last_gmail_check_at: s.last_gmail_check_at ?? null,
  last_error: s.last_error ?? null,
  token_exchange: s.token_exchange ?? null,
  gmail_readonly: s.gmail_readonly_present ?? null,
  gmail_send: s.gmail_send_present ?? null,
  credential_health: s.credential_health ?? null,
  credential_source: s.credential_source ?? null,
  fingerprint: s.credential_fingerprint ?? null,
  consecutive: s.consecutive_healthy_cron ?? 0,
  same_invocation_parity: s.same_invocation_parity ?? null,
  last_successful_exchange_at: s.last_successful_exchange_at ?? null,
  startup_state: s.startup_state ?? null,
  active_deployment_id: s.active_deployment_id ?? null,
  last_authoritative_cron_at: s.last_authoritative_cron_at ?? null,
  last_ignored_stale: s.last_ignored_stale_observation ?? null,
  last_write_conflict: s.last_write_conflict ?? null,
  projection_version: s.credential_projection_version ?? null,
  stability: s.CronCredentialVisibilityStabilityGate ?? null,
  post_cron: s.PostCronOverwriteProtectionGate ?? null,
  stale_writer: s.StaleCredentialHealthWriterGate ?? null,
  partial: s.PartialInvocationOverwriteGate ?? null,
  deploy_scoped: s.DeploymentScopedCredentialHealthGate ?? null,
  hydration: s.GmailConfigHydrationGate ?? null,
  parity_gate: s.GmailSameInvocationParityGate ?? null,
  env_parity: s.env_parity ?? null,
  mailbox_watch: s.mailbox_watch ?? null,
  business_loop: s.business_loop ?? null,
  http_source: json.gmailRuntime?.source ?? null,
  http_fingerprint: json.gmailRuntime?.fingerprint ?? null,
}, null, 2));
