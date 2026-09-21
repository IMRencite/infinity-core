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
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();
const expected = "dpl_wwjX883fGKaDmQduWnNSuPtkU7so";
const expectedSha = "837f7ec12480f6884c4b4eb9c8b6d7394fc29b3e";
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const beats = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-heartbeats-v1").maybeSingle();
const scheduler = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-runtime-scheduler-v1").maybeSingle();
const schedBeat = beats.data?.payload?.runtimes?.scheduler ?? {};
const sched = scheduler.data?.payload ?? {};
const tick = await fetch("https://infinity-runtime.vercel.app/api/runtime/communication-tick").then((res) => res.status).catch(() => 0);
const attest = await fetch("https://infinity-runtime.vercel.app/api/runtime/communication-attest").then((res) => res.status).catch(() => 0);
const match = schedBeat.deployment_id === expected && (schedBeat.release_sha === expectedSha || schedBeat.git_sha === expectedSha);
console.log(JSON.stringify({
  serving_tick: tick,
  serving_attest: attest,
  expected_deployment: expected,
  expected_sha: expectedSha,
  heartbeat_updated_at: beats.data?.updated_at ?? null,
  scheduler_last_success_at: schedBeat.last_success_at ?? sched.last_success_at ?? null,
  scheduler_deployment: schedBeat.deployment_id ?? sched.active_deployment_id ?? null,
  scheduler_release_sha: schedBeat.release_sha ?? schedBeat.git_sha ?? null,
  matching_heartbeat: match,
  now: new Date().toISOString(),
}, null, 2));
