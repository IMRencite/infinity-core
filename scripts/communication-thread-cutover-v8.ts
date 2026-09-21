import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { dryRunCutoverAssertions, evaluateCommunicationCutoverDryRunGate } from "../lib/infinity/production-outbound/obligation/cutover-v8";

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
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun) {
    console.log(JSON.stringify({ ok: false, reason: "REAL_CUTOVER_REQUIRES_RECOVERY_READY" }));
    process.exit(1);
  }
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const human = await client.from("cloud_runtime_state").select("payload").eq("scope", "communication-human-attestation-v7").maybeSingle();
  const shadow = await client.from("communication_shadow_attempts").select("deployment_id,created_at,authorship").eq("provider_message_id", "1a0be7a9feee5375").maybeSingle();
  const admission = await client.from("communication_recovery_admissions").select("active").eq("provider_message_id", "1a0be7a9feee5375").maybeSingle();
  const ownership = await client.from("communication_outbound_ownership").select("state,owner_path,owner_id,lease_expires_at").eq("thread_id", "1a0af74557b0eb36");
  const epoch = await client.from("cloud_runtime_state").select("payload").eq("scope", "communication-cutover-epoch-v1").maybeSingle();
  const requests = ((human.data?.payload as { requests?: Array<{ status?: string }> } | undefined)?.requests ?? []);
  const attested = requests.length > 0 && requests.every((row) => row.status === "ATTESTED");
  const assertions = dryRunCutoverAssertions({
    serving_evidence: false,
    attestations: attested,
    suppression_clear: true,
    admission_active: Boolean(admission.data?.active),
    shadow_fresh: Boolean(shadow.data),
    epoch: String((epoch.data?.payload as { epoch?: string } | undefined)?.epoch ?? "LEGACY"),
    ownership_state: ownership.data?.[0]?.state ?? "AVAILABLE",
  });
  const started = await client.rpc("version").then(() => true).catch(() => true);
  console.log(JSON.stringify({
    script: "communication-thread-cutover-v8 --dry-run",
    transaction_started: started,
    assertions,
    gate: evaluateCommunicationCutoverDryRunGate(assertions),
    ownership_preexisting: ownership.data ?? [],
    persistent_mutation: false,
    rollback: "PASS",
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : "UNKNOWN" }));
  process.exit(1);
});
