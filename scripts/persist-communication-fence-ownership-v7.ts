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
  const row = {
    mailbox_id: "occupancynpv-canary",
    thread_id: "1a0af74557b0eb36",
    answered_inbound_provider_message_id: "1a0be7a9feee5375",
    owner_path: "FENCE",
    owner_id: "UNCLAIMED",
    state: "AVAILABLE",
    attempt_id: null,
    version: 1,
    lease_expires_at: null,
    created_at: now,
    updated_at: now,
  };
  const upsert = await client.from("communication_outbound_ownership").upsert(row);
  const read = await client.from("communication_outbound_ownership").select("mailbox_id,thread_id,answered_inbound_provider_message_id,owner_path,owner_id,state,version").eq("answered_inbound_provider_message_id", "1a0be7a9feee5375");
  console.log(JSON.stringify({
    ok: !upsert.error,
    error: upsert.error?.message ?? null,
    rows: read.data ?? [],
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
