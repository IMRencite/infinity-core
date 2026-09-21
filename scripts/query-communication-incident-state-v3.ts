import { createClient } from "@supabase/supabase-js";
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
    process.env[key] = val;
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log(JSON.stringify({ ok: false, reason: "SUPABASE_UNAVAILABLE" }));
    process.exit(1);
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const incidentsTable = await client.from("communication_incidents").select("incident_id,provider_message_id,recovered,clean_eligible,recovery_reason_codes").eq("provider_message_id", "1a0be7a9feee5375").maybeSingle();
  const incidentFallback = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-incidents-v1").maybeSingle();
  const obligations = await client.from("communication_obligations").select("id,state,provider_message_id,thread_id").eq("provider_message_id", "1a0be7a9feee5375");
  const scheduler = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-heartbeats-v1").maybeSingle();
  const intended = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-intended-release-v1").maybeSingle();
  const epoch = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-cutover-epoch-v1").maybeSingle();
  const jobs = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-scheduler-v1").maybeSingle();
  const payload = jobs.data?.payload as { jobs?: Array<{ job_id?: string; state?: string; failure_reason?: string; inbound_message_id?: string; thread_id?: string; intent?: string; attempt_count?: number; eligible_at?: string }> } | undefined;
  const allJobs = payload?.jobs ?? [];
  const blocked = allJobs.filter((row) => row.state === "BLOCKED" || row.failure_reason === "CONTENT_QUALITY_BLOCKED");
  const escalate = allJobs.filter((row) => row.failure_reason === "ESCALATE_VISIBLE");
  const target = allJobs.find((row) => row.inbound_message_id === "1a0be7a9feee5375" || row.job_id?.includes("1a0be7a9feee5375"));
  console.log(JSON.stringify({
    ok: true,
    incident_table: incidentsTable.error?.message ?? incidentsTable.data,
    incident_fallback: incidentFallback.error?.message ?? incidentFallback.data,
    obligations: obligations.error?.message ?? obligations.data,
    intended: intended.data?.payload ?? intended.error?.message,
    epoch: epoch.data?.payload ?? epoch.error?.message,
    heartbeat: scheduler.data?.payload ?? scheduler.error?.message,
    target_job: target ?? null,
    blocked_count: blocked.length,
    escalate_count: escalate.length,
    blocked_jobs: blocked.slice(0, 20).map((row) => ({
      job_id: row.job_id,
      state: row.state,
      failure_reason: row.failure_reason,
      intent: row.intent,
      attempt_count: row.attempt_count,
    })),
    total_jobs: allJobs.length,
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
