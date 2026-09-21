import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadServerEnvFromLocalFile, reloadGmailOAuthFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { readGmailThread } from "../lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import { classifyMessageRole } from "../lib/infinity/production-outbound/conversation-semantics";
import { stripQuotedReply } from "../lib/infinity/production-outbound/gmail-message-body";
import { INFINITY_MANAGED_SENDER } from "../lib/infinity/inbound-communication-runtime/constants";
import { resolveApprovedCanaryEmail } from "../lib/infinity/production-outbound/canary-contact";
import { resolveAuthorship } from "../lib/infinity/production-outbound/obligation/authorship";

const THREAD = "1a0af74557b0eb36";
const NEEDLE = /rather just try it|how do i start the free trial/i;

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
    if (process.env[key] == null) process.env[key] = val;
  }
}

loadEnv();
loadServerEnvFromLocalFile();
reloadGmailOAuthFromLocalFile();

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function main() {
  const prospect = resolveApprovedCanaryEmail();
  const thread = await readGmailThread({ threadId: THREAD });
  const messages = thread.ok ? thread.messages : [];
  const matched = messages.filter((message) => NEEDLE.test(stripQuotedReply(message.bodyText || message.snippet || "")));
  const latest = matched.at(-1) ?? null;
  const authorship = latest
    ? resolveAuthorship({
      provider_message_id: latest.id,
      ledger: [],
      same_mailbox_test_mode: true,
    })
    : null;
  const role = latest
    ? classifyMessageRole({
      message_id: latest.id,
      from: latest.from,
      to: latest.to,
      body: latest.bodyText || latest.snippet || "",
      snippet: latest.snippet,
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: prospect || INFINITY_MANAGED_SENDER,
    })
    : null;
  const client = admin();
  const obligations = client
    ? await client.from("communication_obligations").select("*").eq("thread_id", THREAD)
    : { data: null, error: { message: "NO_CLIENT" } };
  const attempts = client && latest
    ? await client.from("communication_attempts").select("*").eq("obligation_id", `comm-ob:occupancynpv-canary:${latest.id}`)
    : { data: null, error: null };
  const logs = client
    ? await client.from("communication_transition_log").select("*").eq("obligation_id", latest ? `comm-ob:occupancynpv-canary:${latest.id}` : "").order("timestamp", { ascending: true })
    : { data: null, error: { message: "NO_CLIENT" } };
  const ledger = client
    ? await client.from("communication_outbound_ledger").select("*").eq("thread_id", THREAD)
    : { data: null, error: { message: "NO_CLIENT" } };
  const scheduler = client
    ? await client.from("cloud_runtime_state").select("payload, updated_at").eq("scope", "communication-runtime-scheduler-v1").maybeSingle()
    : { data: null, error: { message: "NO_CLIENT" } };
  const closed = client
    ? await client.from("cloud_runtime_state").select("payload, updated_at").eq("scope", "communication-closed-loop-v1").maybeSingle()
    : { data: null, error: { message: "NO_CLIENT" } };
  const payload = (scheduler.data?.payload ?? {}) as Record<string, unknown>;
  console.log(JSON.stringify({
    gmail_ok: thread.ok,
    message_count: messages.length,
    matched: latest ? {
      id: latest.id,
      thread_id: latest.threadId,
      date: latest.date,
      from: latest.from,
      to: latest.to,
      preview: stripQuotedReply(latest.bodyText || latest.snippet || "").slice(0, 220),
      role: role?.role,
      direction: role?.direction,
      authorship,
    } : null,
    later_messages: latest
      ? messages.filter((row) => (row.date ?? "") > (latest.date ?? "")).map((row) => ({
        id: row.id,
        date: row.date,
        from: row.from,
        preview: stripQuotedReply(row.bodyText || row.snippet || "").slice(0, 120),
      }))
      : [],
    obligation_rows: obligations.data ?? obligations.error,
    attempt_rows: attempts.data ?? attempts.error,
    transition_rows: logs.data ?? logs.error,
    ledger_rows: ledger.data ?? ledger.error,
    scheduler: {
      updated_at: scheduler.data?.updated_at ?? null,
      last_tick_at: payload.last_tick_at ?? null,
      last_success_at: payload.last_success_at ?? null,
      last_failure_at: payload.last_failure_at ?? null,
      last_error: payload.last_error ?? null,
      last_trigger_source: payload.last_trigger_source ?? null,
      last_gmail_check_at: payload.last_gmail_check_at ?? null,
      last_inbound_message_id: payload.last_inbound_message_id ?? null,
      credential_fingerprint: payload.credential_fingerprint ?? null,
      active_deployment_id: payload.active_deployment_id ?? payload.credential_deploy_id ?? null,
      jobs: Array.isArray(payload.jobs)
        ? (payload.jobs as Array<Record<string, unknown>>).slice(-8).map((job) => ({
          job_id: job.job_id,
          inbound: job.inbound_message_id,
          state: job.state,
          eligible_at: job.eligible_at,
          failure_reason: job.failure_reason,
          provider_message_id: job.provider_message_id,
        }))
        : [],
    },
    conversation: (closed.data?.payload as { conversation?: unknown } | null)?.conversation ?? null,
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "FORENSIC_FAILED" }));
  process.exit(1);
});
