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
  const beats = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-heartbeats-v1").maybeSingle();
  const intended = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-intended-release-v1").maybeSingle();
  const scheduler = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-scheduler-v1").maybeSingle();
  const payload = scheduler.data?.payload as { last_success_at?: string; deployment?: string; git_sha?: string; invoked_by?: string } | undefined;
  console.log(JSON.stringify({
    ok: true,
    heartbeat: beats.data ?? beats.error?.message ?? null,
    intended: intended.data?.payload ?? intended.error?.message ?? null,
    scheduler_updated_at: scheduler.data?.updated_at ?? null,
    scheduler_last_success_at: payload?.last_success_at ?? null,
    scheduler_deployment: payload?.deployment ?? null,
    scheduler_git_sha: payload?.git_sha ?? null,
    scheduler_invoked_by: payload?.invoked_by ?? null,
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
