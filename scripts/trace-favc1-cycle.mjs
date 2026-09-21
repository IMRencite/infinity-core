/**
 * Trace FAVC1 cycle persistence. No secrets printed.
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

const cycleKey = process.argv[2] ?? "cycle-1786902188200";
const orgId = process.argv[3] ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const idempotencyKey = `first-autonomous-venture-v1:${orgId}:${cycleKey}:discovery`;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

console.log("cycleKey:", cycleKey);
console.log("organizationId:", orgId);
console.log("discovery idempotencyKey:", idempotencyKey);

const { data: discovery, error: discoveryError } = await admin
  .from("opportunity_discovery_runs")
  .select("*")
  .eq("organization_id", orgId)
  .eq("idempotency_key", idempotencyKey)
  .maybeSingle();

if (discoveryError) {
  console.log("discovery query error:", discoveryError.code, discoveryError.message);
} else if (!discovery) {
  console.log("discovery run: NOT FOUND");
} else {
  console.log("\n=== DISCOVERY RUN ===");
  console.log("id:", discovery.id);
  console.log("status:", discovery.status);
  console.log("started_at:", discovery.started_at);
  console.log("completed_at:", discovery.completed_at);
  console.log("updated_at:", discovery.updated_at);
  console.log("failure_classification:", discovery.failure_classification);
  console.log("error_message:", discovery.error_message);
  console.log("research_call_count:", discovery.research_call_count);
  console.log("candidates_persisted:", discovery.candidates_persisted);
  console.log("research_run_ids:", JSON.stringify(discovery.research_run_ids));

  const researchIds = Array.isArray(discovery.research_run_ids) ? discovery.research_run_ids : [];
  if (researchIds.length) {
    const { data: researchRuns } = await admin
      .from("research_runs")
      .select("id, status, provider_id, started_at, completed_at, failure_classification, error_message, estimated_cost_usd")
      .in("id", researchIds);
    console.log("\n=== RESEARCH RUNS ===");
    for (const run of researchRuns ?? []) {
      console.log(JSON.stringify(run));
    }
  }

  const { data: candidates } = await admin
    .from("opportunity_candidates")
    .select("id, rank_position, title, created_at")
    .eq("discovery_run_id", discovery.id)
    .order("rank_position", { ascending: true });
  console.log("\n=== CANDIDATES ===");
  console.log("count:", candidates?.length ?? 0);
  for (const c of candidates ?? []) {
    console.log(JSON.stringify({ id: c.id, rank: c.rank_position, title: c.title?.slice(0, 60) }));
  }
}

const { data: providerCalls } = await admin
  .from("provider_calls")
  .select("id, provider_id, operation, status, started_at, completed_at, estimated_cost_usd, error_message")
  .eq("organization_id", orgId)
  .gte("started_at", new Date(Number(cycleKey.replace("cycle-", ""))).toISOString())
  .order("started_at", { ascending: true })
  .limit(30);

console.log("\n=== PROVIDER CALLS (since cycle timestamp) ===");
console.log("count:", providerCalls?.length ?? 0);
for (const call of providerCalls ?? []) {
  console.log(
    JSON.stringify({
      provider: call.provider_id,
      operation: call.operation,
      status: call.status,
      started_at: call.started_at,
      completed_at: call.completed_at,
      cost: call.estimated_cost_usd,
      error: call.error_message?.slice(0, 120) ?? null,
    }),
  );
}
