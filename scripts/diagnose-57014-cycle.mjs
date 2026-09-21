/**
 * Diagnose SQLSTATE 57014 for FAVC1 scanner path.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sep = trimmed.indexOf("=");
  if (sep === -1) continue;
  process.env[trimmed.slice(0, sep)] = trimmed.slice(sep + 1).replace(/^["']|["']$/g, "");
}

const cycleKey = process.argv[2] ?? "cycle-1786905324456";
const orgId = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const idempotencyKey = `first-autonomous-venture-v1:${orgId}:${cycleKey}:discovery`;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

console.log("=== DISCOVERY RUN ===");
const { data: discovery } = await admin
  .from("opportunity_discovery_runs")
  .select("id, status, started_at, failed_at, failure_classification, error_message, research_call_count, candidates_persisted, candidates_discovered, research_run_ids")
  .eq("organization_id", orgId)
  .eq("idempotency_key", idempotencyKey)
  .maybeSingle();
console.log(JSON.stringify(discovery, null, 2));

if (discovery?.id) {
  const { count } = await admin
    .from("opportunity_candidates")
    .select("id", { count: "exact", head: true })
    .eq("discovery_run_id", discovery.id);
  console.log("candidates for discovery run:", count);
}

console.log("\n=== TABLE COUNTS (org scoped where applicable) ===");
for (const [table, filter] of [
  ["opportunity_discovery_runs", { organization_id: orgId }],
  ["opportunity_candidates", { organization_id: orgId }],
  ["opportunity_candidate_evidence", { organization_id: orgId }],
  ["opportunity_candidate_scores", { organization_id: orgId }],
  ["research_runs", { organization_id: orgId }],
]) {
  const q = admin.from(table).select("id", { count: "exact", head: true });
  if (filter.organization_id) q.eq("organization_id", filter.organization_id);
  const { count, error } = await q;
  console.log(`${table}:`, error ? error.message : count);
}
