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
  const snap = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-thread-snapshot-v5").maybeSingle();
  const payload = snap.data?.payload as {
    messages?: Array<{
      provider_message_id: string;
      classification: string;
      evidence_type: string;
      covering_outbound_id: string | null;
      labels: string[];
      internal_date: string | null;
      rfc_message_id: string | null;
      in_reply_to: string | null;
    }>;
    history_id_watermark?: string;
    timestamp_watermark?: string;
  } | undefined;
  console.log(JSON.stringify({
    ok: true,
    count: payload?.messages?.length ?? 0,
    history_id_watermark: payload?.history_id_watermark ?? null,
    timestamp_watermark: payload?.timestamp_watermark ?? null,
    rows: (payload?.messages ?? []).map((row) => ({
      id: row.provider_message_id,
      class: row.classification,
      evidence: row.evidence_type,
      cover: row.covering_outbound_id,
      labels: row.labels,
      date: row.internal_date,
      rfc: row.rfc_message_id ? "PRESENT" : "ABSENT",
      in_reply_to: row.in_reply_to ? "PRESENT" : "ABSENT",
    })),
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
