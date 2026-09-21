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
const expected = process.argv[2] || "dpl_Dr5nxcUJZAYTyP6KRaYdYHidCd5P";
const deadline = Date.now() + 36 * 60 * 1000;
const samples = [];

async function sample() {
  const aliasRes = await fetch(`https://api.vercel.com/v13/deployments/infinity-runtime.vercel.app?teamId=${encodeURIComponent(team)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const aliasJson = await aliasRes.json();
  const stateRes = await fetch("https://infinity-runtime.vercel.app/api/runtime/operating-state", {
    headers: { authorization: `Bearer ${secret}`, "cache-control": "no-store" },
  });
  const json = await stateRes.json();
  const s = json.communicationScheduler ?? {};
  return {
    at: new Date().toISOString(),
    alias_deployment: aliasJson.id ?? aliasJson.uid ?? null,
    last_tick_at: s.last_tick_at ?? null,
    last_authoritative_cron_at: s.last_authoritative_cron_at ?? null,
    last_successful_exchange_at: s.last_successful_exchange_at ?? null,
    last_error: s.last_error ?? null,
    token_exchange: s.token_exchange ?? null,
    gmail_readonly: s.gmail_readonly_present ?? null,
    gmail_send: s.gmail_send_present ?? null,
    consecutive: s.consecutive_healthy_cron ?? 0,
    credential_health: s.credential_health ?? null,
    fingerprint: s.credential_fingerprint ?? null,
    same_invocation_parity: s.same_invocation_parity ?? null,
    hydration: s.GmailConfigHydrationGate?.result ?? null,
    active_deployment_id: s.active_deployment_id ?? null,
    last_ignored_stale: s.last_ignored_stale_observation ?? null,
    last_write_conflict: s.last_write_conflict ?? null,
    stability: s.CronCredentialVisibilityStabilityGate?.result ?? null,
    post_cron: s.PostCronOverwriteProtectionGate?.result ?? null,
    stale_writer: s.StaleCredentialHealthWriterGate?.result ?? null,
    partial: s.PartialInvocationOverwriteGate?.result ?? null,
    deploy_scoped: s.DeploymentScopedCredentialHealthGate?.result ?? null,
    env_parity: s.env_parity?.result ?? null,
    mailbox_watch: s.mailbox_watch?.result ?? null,
    business_loop: s.business_loop ?? null,
  };
}

while (Date.now() < deadline) {
  try {
    const row = await sample();
    samples.push(row);
    console.log(JSON.stringify(row));
    const onExpected = row.alias_deployment === expected && row.active_deployment_id === expected;
    if (onExpected && row.consecutive >= 5 && row.stability === "PASS" && row.last_error == null && row.token_exchange === true) {
      console.log(JSON.stringify({ done: true, reason: "FIVE_OF_FIVE", samples: samples.length }, null, 2));
      process.exit(0);
    }
  } catch (error) {
    console.log(JSON.stringify({ at: new Date().toISOString(), error: error instanceof Error ? error.message : "SAMPLE_FAILED" }));
  }
  await new Promise((resolve) => setTimeout(resolve, 90_000));
}

console.log(JSON.stringify({ done: true, reason: "DEADLINE", last: samples.at(-1) ?? null, ticks: [...new Set(samples.map((row) => row.last_authoritative_cron_at).filter(Boolean))] }, null, 2));
process.exit(1);
