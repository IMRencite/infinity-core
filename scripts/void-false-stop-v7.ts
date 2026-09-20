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

async function main() {
  loadEnv();
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();
  const row = await client.from("cloud_runtime_state").select("payload").eq("scope", "production-outbound-closed-loop-v1").maybeSingle();
  const payload = (row.data?.payload ?? {}) as { suppression?: Record<string, unknown> };
  const current = payload.suppression ?? null;
  if (!current || current.source_message_id !== "1a0b254b39f5c645") {
    console.log(JSON.stringify({ ok: true, changed: false, reason: "NO_FALSE_STOP_RECORD", status: current?.status ?? null }));
    return;
  }
  if (current.status === "INVALIDATED" && (current.correction as { reason?: string } | undefined)?.reason === "SYSTEM_AUTHORED_FALSE_STOP") {
    console.log(JSON.stringify({ ok: true, changed: false, reason: "ALREADY_VOIDED", status: "INVALIDATED" }));
    return;
  }
  payload.suppression = {
    ...current,
    status: "INVALIDATED",
    source_role: "SYSTEM",
    valid: false,
    valid_prospect_opt_out: false,
    correction: {
      reason: "SYSTEM_AUTHORED_FALSE_STOP",
      source_role: "SYSTEM",
      corrected_at: now,
      corrected_state: "INVALIDATED",
      original_status: "ACTIVE",
    },
  };
  const upsert = await client.from("cloud_runtime_state").upsert({
    scope: "production-outbound-closed-loop-v1",
    version: 1,
    instance_id: "production-outbound-closed-loop",
    payload,
    updated_at: now,
  });
  console.log(JSON.stringify({
    ok: !upsert.error,
    changed: !upsert.error,
    error: upsert.error?.message ?? null,
    status: "INVALIDATED",
    reason: "SYSTEM_AUTHORED_FALSE_STOP",
  }));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
