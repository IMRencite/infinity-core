import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

function loadEnv() {
  const envPath = "c:/Users/Antivist/Desktop/Infinity/infinity-core/.env.local";
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
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const payload = {
  code: "COMMUNICATION_CRON_OUTAGE_AFTER_BAD_PROMOTION",
  type: "PRODUCTION_RELEASE_DEFECT",
  status: "RESTORED",
  last_healthy_heartbeat_at: "2026-09-20T23:35:31.322Z",
  first_missed_expected_tick_at: "2026-09-20T23:40:00.000Z",
  production_target_switch_at: "2026-09-20T23:38:28.066Z",
  defective_deployment: "dpl_5iC51KgrdBghubsk5pzajV5pvm1B",
  missing_route: "/api/runtime/communication-tick",
  first_failure: "CRON_TARGET_MISSING_ROUTE",
  alias_restore: "DOMAIN_ONLY",
  known_good_source: "dpl_6saLKJDLFKFhPoscmEhTW9QdhHeo",
  restore_method: "POST /v13/deployments redeploy known-good target=production",
  restore_deployment: "dpl_8sX5jqiu7YUPox4gJoto3td6f5mS",
  restore_started_at: "2026-09-21T02:46:45.320Z",
  first_healthy_after_restore_at: "2026-09-21T02:50:31.512Z",
  invoked_by: "cron",
  outage_ms: Date.parse("2026-09-21T02:50:31.512Z") - Date.parse("2026-09-20T23:40:00.000Z"),
};
const result = await client.from("cloud_runtime_state").upsert({
  scope: "communication-cron-outage-v9",
  version: 1,
  instance_id: "communication-cron-outage",
  payload,
  updated_at: new Date().toISOString(),
});
console.log(JSON.stringify({ ok: !result.error, error: result.error?.message ?? null, outage_ms: payload.outage_ms }, null, 2));
