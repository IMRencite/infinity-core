import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
const expected = "dpl_8sX5jqiu7YUPox4gJoto3td6f5mS";
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function sample() {
  const beats = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-heartbeats-v1").maybeSingle();
  const s = beats.data?.payload?.runtimes?.scheduler ?? {};
  const p = beats.data?.payload?.runtimes?.provider ?? {};
  const d = beats.data?.payload?.runtimes?.discovery ?? {};
  const w = beats.data?.payload?.runtimes?.worker ?? {};
  const g = beats.data?.payload?.runtimes?.watchdog ?? {};
  return {
    at: new Date().toISOString(),
    last_success_at: s.last_success_at ?? null,
    deployment_id: s.deployment_id ?? null,
    invoked_by: s.invoked_by ?? null,
    release_sha: s.release_sha ?? s.git_sha ?? null,
    schema: s.schema_version_seen ?? s.schema ?? null,
    last_error: s.last_error ?? null,
    provider_auth: p.last_error ? "FAIL" : (p.last_success_at ? "PASS" : "NOT_PROVEN"),
    provider_last_success_at: p.last_success_at ?? null,
    discovery_last_success_at: d.last_success_at ?? null,
    worker_last_success_at: w.last_success_at ?? null,
    watchdog_last_success_at: g.last_success_at ?? null,
  };
}

const ticks = [];
const deadline = Date.now() + 16 * 60 * 1000;
let last = null;
while (Date.now() < deadline && ticks.length < 3) {
  const row = await sample();
  if (row.last_success_at && row.last_success_at !== last && row.deployment_id === expected && (row.invoked_by === "cron" || row.invoked_by === "VERCEL_CRON")) {
    ticks.push(row);
    last = row.last_success_at;
  }
  if (ticks.length >= 3) break;
  await new Promise((resolve) => setTimeout(resolve, 20000));
}

function spacingOk(rows) {
  if (rows.length < 2) return false;
  for (let i = 1; i < rows.length; i += 1) {
    const delta = Date.parse(rows[i].last_success_at) - Date.parse(rows[i - 1].last_success_at);
    if (delta < 4 * 60 * 1000 || delta > 6 * 60 * 1000 + 30000) return false;
  }
  return true;
}

const status = ticks.length === 0 ? "DOWN" : ticks.length === 1 ? "FIRST_TICK_OBSERVED" : ticks.length === 2 ? "RESTORING" : "SCHEDULER_RESTORED_VERIFIED";
const out = { expected, ticks, consecutive: ticks.length, spacing_ok: spacingOk(ticks), SchedulerRestore: status };
writeFileSync(join(process.cwd(), "tmp-v10-consecutive-ticks.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
process.exit(ticks.length >= 3 && spacingOk(ticks) ? 0 : 2);
