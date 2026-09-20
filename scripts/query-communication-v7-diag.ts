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
  const ownership = await client.from("communication_outbound_ownership").select("mailbox_id,thread_id,answered_inbound_provider_message_id,owner_path,state").eq("thread_id", "1a0af74557b0eb36");
  const obligations = await client.from("communication_obligations").select("id,state,provider_message_id");
  const snap = await client.from("cloud_runtime_state").select("payload").eq("scope", "communication-thread-snapshot-v5").maybeSingle();
  const closed = await client.from("cloud_runtime_state").select("payload").eq("scope", "production-outbound-closed-loop-v1").maybeSingle();
  const human = await client.from("cloud_runtime_state").select("payload,updated_at").eq("scope", "communication-human-attestation-v7").maybeSingle();
  const messages = ((snap.data?.payload as { messages?: Array<Record<string, string | null>> } | undefined)?.messages ?? []);
  const target = messages.find((row) => row.provider_message_id === "1a0be7a9feee5375") ?? null;
  const falseStop = messages.find((row) => row.provider_message_id === "1a0b254b39f5c645") ?? null;
  const suppression = (closed.data?.payload as { suppression?: { status?: string; source_message_id?: string; valid?: boolean } } | undefined)?.suppression ?? null;
  console.log(JSON.stringify({
    ownership_rows: ownership.data ?? [],
    ownership_error: ownership.error?.message ?? null,
    obligation_count: obligations.data?.length ?? null,
    snapshot_count: messages.length,
    snapshot_ids: messages.map((row) => row.provider_message_id),
    target_headers: target ? {
      id: target.provider_message_id,
      rfc: target.rfc_message_id ? "PRESENT" : "ABSENT",
      in_reply_to: target.in_reply_to ? "PRESENT" : "ABSENT",
      subject_present: target.subject_present ?? null,
      internal_date: target.internal_date,
      classification: target.classification,
    } : null,
    false_stop: falseStop ? { id: falseStop.provider_message_id, classification: falseStop.classification } : null,
    suppression: suppression ? { status: suppression.status, source: suppression.source_message_id, valid: suppression.valid } : null,
    human: human.data?.payload ?? null,
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
