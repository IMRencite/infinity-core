/**
 * Trace grounding failures for a FAVC1/scanner discovery run.
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

const discoveryRunId = process.argv[2] ?? "7979f49f-fb61-480f-8369-5f7b924d83ae";
const orgId = process.argv[3] ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: discovery } = await admin
  .from("opportunity_discovery_runs")
  .select("*")
  .eq("id", discoveryRunId)
  .maybeSingle();

console.log("=== DISCOVERY RUN ===");
console.log(JSON.stringify({
  id: discovery?.id,
  status: discovery?.status,
  idempotency_key: discovery?.idempotency_key,
  research_call_count: discovery?.research_call_count,
  candidates_persisted: discovery?.candidates_persisted,
  failure_classification: discovery?.failure_classification,
  error_message: discovery?.error_message,
  estimated_cost_usd: discovery?.estimated_cost_usd,
  scanner_report: discovery?.scanner_report,
}, null, 2));

const researchIds = Array.isArray(discovery?.research_run_ids) ? discovery.research_run_ids : [];
console.log("\n=== RESEARCH RUN IDS ===", researchIds.length);

for (const runId of researchIds) {
  const { data: run } = await admin
    .from("research_runs")
    .select("id, status, provider, model, failure_classification, error_message, estimated_cost, grounding_metadata, normalized_sources, structured_result, raw_provider_response")
    .eq("id", runId)
    .maybeSingle();
  if (!run) {
    console.log("\n--- RUN", runId, "NOT FOUND ---");
    continue;
  }
  const structured = run.structured_result ?? {};
  const findings = structured?.findings ?? structured?.groundedFindings ?? [];
  const sources = run.normalized_sources ?? structured?.sources ?? [];
  const groundingMeta = run.grounding_metadata ?? {};
  const raw = run.raw_provider_response ?? {};

  console.log("\n--- RESEARCH RUN", runId, "---");
  console.log(JSON.stringify({
    status: run.status,
    provider: run.provider,
    model: run.model,
    failure_classification: run.failure_classification,
    error_message: run.error_message?.slice(0, 300),
    estimated_cost: run.estimated_cost,
    findingsCount: Array.isArray(findings) ? findings.length : 0,
    sourcesCount: Array.isArray(sources) ? sources.length : 0,
    groundingKeys: Object.keys(groundingMeta),
    rawGroundingKeys: raw?.groundingMetadata ? Object.keys(raw.groundingMetadata) : Object.keys(raw).slice(0, 15),
  }, null, 2));

  if (Array.isArray(findings)) {
    for (const f of findings.slice(0, 5)) {
      console.log("  finding:", JSON.stringify({
        id: f.id ?? f.findingId,
        grounded: f.grounded,
        sourceUrls: f.sourceUrls ?? f.sources ?? f.citations,
        claim: (f.claim ?? f.title ?? "").slice(0, 120),
      }));
    }
  }
  if (Array.isArray(sources) && sources.length) {
    console.log("  sample sources:", JSON.stringify(sources.slice(0, 3), null, 2));
  }
}

const { data: candidates } = await admin
  .from("opportunity_candidates")
  .select("id, title, opportunity_score, rank_position, discovery_strategies, research_run_ids")
  .eq("discovery_run_id", discoveryRunId)
  .order("rank_position", { ascending: true });

console.log("\n=== CANDIDATES ===", candidates?.length ?? 0);
for (const c of candidates ?? []) {
  console.log(JSON.stringify({ id: c.id, title: c.title, score: c.opportunity_score, strategies: c.discovery_strategies }));
}

const cycleKey = process.argv[4] ?? "cycle-1786908976153";
const idempotencyPrefix = `first-autonomous-venture-v1:${orgId}:${cycleKey}:discovery:research:`;
const strategyIds = [
  "market_pain_discovery",
  "search_demand_discovery",
  "expensive_workflow_discovery",
  "underserved_niche_discovery",
];

console.log("\n=== STRATEGY RESEARCH RUNS ===");
for (const strategyId of strategyIds) {
  const { data: run } = await admin
    .from("research_runs")
    .select("id, status, provider, model, failure_classification, error_message, estimated_cost, grounding_metadata, structured_result")
    .eq("organization_id", orgId)
    .eq("idempotency_key", `${idempotencyPrefix}${strategyId}`)
    .maybeSingle();
  const gm = run?.grounding_metadata ?? {};
  const findings = run?.structured_result?.findings ?? [];
  console.log("\n---", strategyId, "---");
  console.log(JSON.stringify({
    id: run?.id,
    status: run?.status,
    failure_classification: run?.failure_classification,
    error_message: run?.error_message,
    estimated_cost: run?.estimated_cost,
    groundingChunkCount: gm.groundingChunks?.length ?? 0,
    webSearchQueryCount: gm.webSearchQueries?.length ?? 0,
    findingCount: findings.length,
    findings: findings.map((f) => ({
      id: f.findingId,
      grounded: f.grounded,
      sourceUrls: f.sourceUrls,
    })),
  }, null, 2));
}

const vsRunId = process.argv[5] ?? "4eda68f6-8f74-4fe3-b0e0-5ae6cb3b75cb";
if (vsRunId) {
  const { data: evals } = await admin
    .from("candidate_selection_evaluations")
    .select("*")
    .eq("venture_selection_run_id", vsRunId);
  console.log("\n=== VENTURE SELECTION EVALUATIONS ===");
  for (const e of evals ?? []) {
    console.log(JSON.stringify({
      candidate_id: e.opportunity_candidate_id,
      decision: e.decision,
      selection_score: e.selection_score,
      adversarial_score: e.adversarial_score,
      rejection_reason: e.rejection_reason ?? e.rationale,
    }));
  }
}
