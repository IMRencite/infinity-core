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

async function claim(label: string, version: number) {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();
  const result = await client
    .from("communication_outbound_ownership")
    .update({
      state: "SENDING",
      owner_path: "OBLIGATION",
      owner_id: label,
      version: version + 1,
      updated_at: now,
    })
    .eq("mailbox_id", "occupancynpv-canary")
    .eq("thread_id", "1a0af74557b0eb36")
    .eq("answered_inbound_provider_message_id", "1a0be7a9feee5375")
    .eq("state", "AVAILABLE")
    .eq("version", version)
    .select("owner_id,state,version");
  return { label, ok: !result.error && (result.data?.length ?? 0) === 1, error: result.error?.message ?? null, rows: result.data ?? [] };
}

async function main() {
  loadEnv();
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const fixtureId = `synth:v8:${Date.now()}`;
  const seed = await client.from("communication_outbound_ownership").upsert({
    mailbox_id: "occupancynpv-canary",
    thread_id: `synth-v8-${Date.now()}`,
    answered_inbound_provider_message_id: fixtureId,
    owner_path: null,
    owner_id: null,
    state: "AVAILABLE",
    version: 1,
    updated_at: new Date().toISOString(),
  }).select("mailbox_id,thread_id,answered_inbound_provider_message_id,version,state");
  if (seed.error || !seed.data?.[0]) {
    console.log(JSON.stringify({ ok: false, reason: seed.error?.message ?? "SEED_FAILED", evidence: "SYNTHETIC_PROD_DB" }));
    process.exit(1);
  }
  const row = seed.data[0];
  const aClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();
  const [a, b] = await Promise.all([
    aClient.from("communication_outbound_ownership").update({
      state: "SENDING",
      owner_path: "OBLIGATION",
      owner_id: "conn-a",
      version: row.version + 1,
      updated_at: now,
    }).eq("mailbox_id", row.mailbox_id).eq("thread_id", row.thread_id).eq("answered_inbound_provider_message_id", row.answered_inbound_provider_message_id).eq("state", "AVAILABLE").eq("version", row.version).select("owner_id,state"),
    bClient.from("communication_outbound_ownership").update({
      state: "SENDING",
      owner_path: "OBLIGATION",
      owner_id: "conn-b",
      version: row.version + 1,
      updated_at: now,
    }).eq("mailbox_id", row.mailbox_id).eq("thread_id", row.thread_id).eq("answered_inbound_provider_message_id", row.answered_inbound_provider_message_id).eq("state", "AVAILABLE").eq("version", row.version).select("owner_id,state"),
  ]);
  const aWin = !a.error && (a.data?.length ?? 0) === 1;
  const bWin = !b.error && (b.data?.length ?? 0) === 1;
  await client.from("communication_outbound_ownership").delete().eq("answered_inbound_provider_message_id", fixtureId);
  const exactlyOne = (aWin ? 1 : 0) + (bWin ? 1 : 0) === 1;
  console.log(JSON.stringify({
    database: "POSTGRES",
    connections: 2,
    same_key: true,
    connection_a: aWin ? "SUCCESS" : "FAIL",
    connection_b: bWin ? "SUCCESS" : "FAIL",
    exactly_one_winner: exactlyOne,
    evidence: "SYNTHETIC_PROD_DB",
    gate: exactlyOne ? "PASS" : "FAIL",
    a_error: a.error?.message ?? null,
    b_error: b.error?.message ?? null,
  }, null, 2));
  process.exit(exactlyOne ? 0 : 1);
}

void claim;
main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
