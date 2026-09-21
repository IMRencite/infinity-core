import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
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
  const now = new Date().toISOString();
  const incident = {
    incident_id: "inc:1a0af74557b0eb36:1a0be7a9feee5375",
    provider_message_id: "1a0be7a9feee5375",
    mailbox_id: "occupancynpv-canary",
    thread_id: "1a0af74557b0eb36",
    incident_type: "PRODUCTION_RUNS_PRE_CUTOVER_RELEASE",
    recovered: true,
    clean_eligible: false,
    recovery_reason_codes: ["SLO_BREACH", "RELEASE_PARITY_FAIL", "LEGACY_PATH_HANDLED", "RUNTIME_REPAIR_REQUIRED"],
    first_detected_at: "2026-09-20T11:13:31.000Z",
    slo_breached_at: "2026-09-20T11:21:41.000Z",
    release_parity_failed: true,
    created_at: now,
    updated_at: now,
  };
  const table = await client.from("communication_incidents").upsert(incident).select("incident_id");
  const fallback = await client.from("cloud_runtime_state").upsert({
    scope: "communication-incidents-v1",
    version: 1,
    instance_id: "communication-incidents",
    payload: { incidents: [incident] },
    updated_at: now,
  });
  console.log(JSON.stringify({
    ok: !table.error || !fallback.error,
    table: table.error?.message ?? "UPSERTED",
    fallback: fallback.error?.message ?? "UPSERTED",
    incident_id: incident.incident_id,
    recovered: true,
    clean_eligible: false,
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
