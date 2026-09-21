import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

async function main() {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await client.from("cloud_runtime_state").select("payload, updated_at").eq("scope", "communication-runtime-scheduler-v1").maybeSingle();
  const payload = (data?.payload ?? {}) as {
    jobs?: Array<Record<string, unknown>>;
    detections_24h?: Array<{ at?: string; inbound_message_id?: string }>;
    last_detected_at?: string;
    last_inbound_message_id?: string;
    last_tick_at?: string;
    active_deployment_id?: string;
    credential_deploy_id?: string;
    cron_cycles_since_deploy?: number;
    last_authoritative_cron_at?: string;
  };
  const job = payload.jobs?.find((row) => row.inbound_message_id === "1a0be7a9feee5375" || String(row.job_id).includes("1a0be7a9feee5375"));
  const detections = (payload.detections_24h ?? []).filter((row) => row.inbound_message_id === "1a0be7a9feee5375");
  console.log(JSON.stringify({
    updated_at: data?.updated_at,
    last_tick_at: payload.last_tick_at,
    last_detected_at: payload.last_detected_at,
    last_inbound_message_id: payload.last_inbound_message_id,
    active_deployment_id: payload.active_deployment_id ?? payload.credential_deploy_id,
    cron_cycles_since_deploy: payload.cron_cycles_since_deploy,
    last_authoritative_cron_at: payload.last_authoritative_cron_at,
    detection: detections,
    job,
    obligation_count: (await client.from("communication_obligations").select("id", { count: "exact", head: true })).count,
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "FAILED" }));
});
