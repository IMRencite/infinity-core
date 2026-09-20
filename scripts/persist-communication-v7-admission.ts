import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LIVE_ADMISSION_INTERNAL_DATE_WATERMARK_MS, PRE_CUTOVER_SNAPSHOT_MESSAGE_IDS } from "../lib/infinity/production-outbound/obligation/snapshot-ids";
import { recoveryAdmissionForTarget } from "../lib/infinity/production-outbound/obligation/admission";

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
  const admission = recoveryAdmissionForTarget(now);
  const deny = await client.from("communication_snapshot_deny_list").upsert(
    PRE_CUTOVER_SNAPSHOT_MESSAGE_IDS.map((id) => ({
      provider_message_id: id,
      thread_id: "1a0af74557b0eb36",
      classification: "PRE_CUTOVER_SNAPSHOT",
      created_at: now,
    })),
    { onConflict: "provider_message_id" },
  );
  const admit = await client.from("communication_recovery_admissions").upsert(admission);
  const watermark = await client.from("communication_admission_watermarks").upsert({
    mailbox_id: "occupancynpv-canary",
    live_admission_internal_date_watermark_ms: LIVE_ADMISSION_INTERNAL_DATE_WATERMARK_MS,
    gmail_sync_history_cursor: "15034254",
    updated_at: now,
  });
  const ownership = await client.from("communication_outbound_ownership").select("mailbox_id,thread_id,answered_inbound_provider_message_id,owner_path");
  console.log(JSON.stringify({
    deny: deny.error?.message ?? `UPSERTED_${PRE_CUTOVER_SNAPSHOT_MESSAGE_IDS.length}`,
    admit: admit.error?.message ?? "UPSERTED",
    watermark: watermark.error?.message ?? "UPSERTED",
    watermark_ms: LIVE_ADMISSION_INTERNAL_DATE_WATERMARK_MS,
    ownership_rows: ownership.data ?? [],
    ownership_error: ownership.error?.message ?? null,
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
