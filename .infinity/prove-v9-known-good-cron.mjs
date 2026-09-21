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
const since = "2026-09-21T02:46:45.320Z";
const windowMs = 11 * 60 * 1000;
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function beat() {
  const beats = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-heartbeats-v1").maybeSingle();
  const scheduler = beats.data?.payload?.runtimes?.scheduler ?? {};
  const provider = beats.data?.payload?.runtimes?.provider ?? {};
  const discovery = beats.data?.payload?.runtimes?.discovery ?? {};
  const worker = beats.data?.payload?.runtimes?.worker ?? {};
  const watchdog = beats.data?.payload?.runtimes?.watchdog ?? {};
  return {
    updated_at: beats.data?.updated_at ?? null,
    last_success_at: scheduler.last_success_at ?? null,
    deployment_id: scheduler.deployment_id ?? null,
    invoked_by: scheduler.invoked_by ?? null,
    last_error: scheduler.last_error ?? null,
    schema: scheduler.schema_version_seen ?? scheduler.schema ?? null,
    provider_last_success_at: provider.last_success_at ?? null,
    provider_last_error: provider.last_error ?? null,
    discovery_last_success_at: discovery.last_success_at ?? null,
    worker_last_success_at: worker.last_success_at ?? null,
    watchdog_last_success_at: watchdog.last_success_at ?? null,
  };
}

const samples = [];
let match = null;
const deadline = Date.parse(since) + windowMs;
while (Date.now() < deadline && !match) {
  const row = await beat();
  const fresh = row.last_success_at && Date.parse(row.last_success_at) >= Date.parse(since);
  const cron = row.invoked_by === "cron" || row.invoked_by === "VERCEL_CRON";
  const same = row.deployment_id === expected;
  samples.push({ at: new Date().toISOString(), row, fresh, cron, same });
  if (fresh && cron && same) {
    match = row;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 20000));
}

const out = {
  expected,
  since,
  match,
  samples_count: samples.length,
  last: samples.at(-1) ?? null,
  PostRestoreCronHeartbeatGate: match ? "PASS" : "FAIL",
};
writeFileSync(join(process.cwd(), "tmp-v9-known-good-cron.json"), `${JSON.stringify({ ...out, samples }, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
process.exit(match ? 0 : 2);
