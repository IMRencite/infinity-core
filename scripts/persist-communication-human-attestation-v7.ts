import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHumanAttestationRequests } from "../lib/infinity/production-outbound/obligation/human-attestation";

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

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log(JSON.stringify({ ok: false, reason: "SUPABASE_UNAVAILABLE" }));
    process.exit(1);
  }
  const now = new Date().toISOString();
  const requests = createHumanAttestationRequests(now);
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const existing = await client.from("cloud_runtime_state").select("payload").eq("scope", "communication-human-attestation-v7").maybeSingle();
  const prior = (existing.data?.payload as { requests?: typeof requests } | null)?.requests;
  const payload = {
    requests: prior?.length ? prior : requests,
    created_if_absent: !prior?.length,
    owner: "FOUNDER",
    status: "AWAITING_HUMAN",
  };
  const upsert = await client.from("cloud_runtime_state").upsert({
    scope: "communication-human-attestation-v7",
    version: 1,
    instance_id: "communication-human-attestation",
    payload,
    updated_at: now,
  });
  console.log(JSON.stringify({
    ok: !upsert.error,
    error: upsert.error?.message ?? null,
    requests: payload.requests.map((row) => ({
      id: row.id,
      status: row.status,
      owner: row.owner,
      requested_at: row.requested_at,
      due_at: row.due_at,
      renotify_at: row.renotify_at,
      escalation_count: row.escalation_count,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
