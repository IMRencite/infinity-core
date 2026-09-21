/**
 * Trace discovery → monetization → selection handoff for a live FAVC1 cycle.
 * Read-only probe — does not execute selection or build.
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

const discoveryRunId = process.argv[2] ?? "b6ee782c-38cf-4279-8318-caa118e33989";
const monetizationRunId = process.argv[3] ?? "94b34a17-bfc5-4207-9f96-c7c735f86eaf";
const focusCandidate = process.argv[4] ?? "6152c9eb-dd92-4683-b925-6c241a94422b";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: discoveryRun } = await admin
  .from("opportunity_discovery_runs")
  .select("*")
  .eq("id", discoveryRunId)
  .maybeSingle();

const { data: candidates } = await admin
  .from("opportunity_candidates")
  .select("*")
  .eq("discovery_run_id", discoveryRunId)
  .order("opportunity_score", { ascending: false, nullsFirst: false });

console.log("=== DISCOVERY RUN ===");
console.log(
  JSON.stringify(
    {
      id: discoveryRun?.id,
      organizationId: discoveryRun?.organization_id,
      status: discoveryRun?.status,
      poolAdequacy: discoveryRun?.pool_adequacy,
      researchCallCount: discoveryRun?.research_call_count,
      estimatedCostUsd: discoveryRun?.estimated_cost_usd,
      candidateCount: candidates?.length ?? 0,
    },
    null,
    2,
  ),
);

console.log("\n=== DISCOVERY CANDIDATES ===");
for (const [idx, c] of (candidates ?? []).entries()) {
  console.log(
    JSON.stringify({
      rank: idx + 1,
      candidateId: c.id,
      title: c.title,
      opportunityScore: c.opportunity_score,
      strategyId: c.strategy_id,
      riskFiltered: c.risk_filter_status ?? null,
    }),
  );
}

const { data: monetizationRun } = await admin
  .from("monetization_runs")
  .select("*")
  .eq("id", monetizationRunId)
  .maybeSingle();

console.log("\n=== MONETIZATION RUN ===");
console.log(
  JSON.stringify(
    {
      id: monetizationRun?.id,
      organizationId: monetizationRun?.organization_id,
      status: monetizationRun?.status,
      inputCandidateIds: monetizationRun?.opportunity_candidate_ids,
      inputCount: monetizationRun?.opportunity_candidate_ids?.length ?? 0,
      candidatesAnalyzed: monetizationRun?.candidates_analyzed,
      researchCallCount: monetizationRun?.research_call_count,
      estimatedCostUsd: monetizationRun?.estimated_cost_usd,
      engineReport: monetizationRun?.engine_report
        ? {
            candidatesAnalyzed: monetizationRun.engine_report.candidatesAnalyzed,
            candidateFailures: monetizationRun.engine_report.candidateFailures ?? [],
            analyses: monetizationRun.engine_report.analyses?.map((a) => ({
              candidateId: a.candidateId,
              title: a.candidateTitle,
              economicViability: a.economicViability,
            })),
          }
        : null,
    },
    null,
    2,
  ),
);

const { data: analyses } = await admin
  .from("monetization_candidate_analyses")
  .select("*")
  .eq("monetization_run_id", monetizationRunId)
  .order("created_at", { ascending: true });

const monetizedIds = new Set((analyses ?? []).map((a) => a.opportunity_candidate_id));

console.log("\n=== PER-CANDIDATE HANDOFF ===");
for (const c of candidates ?? []) {
  const analysis = analyses?.find((a) => a.opportunity_candidate_id === c.id);
  const inputIds = monetizationRun?.opportunity_candidate_ids ?? [];
  const sentToMonetization = inputIds.includes(c.id);
  const inInputButNoAnalysis = sentToMonetization && !analysis;
  const notInInput = !sentToMonetization;

  let reason = null;
  if (analysis) reason = "monetized";
  else if (notInInput) reason = "not_in_monetization_input";
  else if (inInputButNoAnalysis) {
    const failures = monetizationRun?.engine_report?.candidateFailures ?? [];
    const failure = failures.find((f) => f.startsWith(c.id));
    reason = failure ?? "in_input_but_no_analysis";
  }

  console.log(
    JSON.stringify({
      candidateId: c.id,
      title: c.title,
      sentToMonetization,
      currentAnalysisExists: Boolean(analysis),
      monetizationStatus: analysis ? "succeeded" : reason,
      eligibleForSelection: Boolean(analysis),
      focus: c.id === focusCandidate,
    }),
  );
}

console.log("\n=== FOCUS CANDIDATE ===");
const focus = candidates?.find((c) => c.id === focusCandidate);
const focusAnalysis = analyses?.find((a) => a.opportunity_candidate_id === focusCandidate);
console.log(
  JSON.stringify(
    {
      candidateId: focusCandidate,
      title: focus?.title ?? null,
      sentToMonetization: monetizationRun?.opportunity_candidate_ids?.includes(focusCandidate) ?? false,
      currentAnalysisExists: Boolean(focusAnalysis),
      rank: (candidates ?? []).findIndex((c) => c.id === focusCandidate) + 1,
    },
    null,
    2,
  ),
);

console.log("\n=== HANDOFF SUMMARY ===");
console.log(
  JSON.stringify(
    {
      discoveredCandidateIds: (candidates ?? []).map((c) => c.id),
      monetizationInputIds: monetizationRun?.opportunity_candidate_ids ?? [],
      monetizedCandidateIds: [...monetizedIds],
      excludedFromMonetization: (candidates ?? [])
        .filter((c) => !monetizedIds.has(c.id))
        .map((c) => ({
          candidateId: c.id,
          title: c.title,
          inMonetizationInput: monetizationRun?.opportunity_candidate_ids?.includes(c.id) ?? false,
        })),
    },
    null,
    2,
  ),
);

// Research runs for monetization
const { data: researchRuns } = await admin
  .from("research_runs")
  .select("id, status, estimated_cost, provider, model, failure_classification, error_message")
  .eq("organization_id", monetizationRun?.organization_id ?? "")
  .like("idempotency_key", `%${monetizationRunId}%`);

console.log("\n=== MONETIZATION RESEARCH (by idempotency pattern) ===");
console.log(JSON.stringify(researchRuns ?? [], null, 2));

// Also check research runs linked to monetization run
if (monetizationRun?.research_run_ids?.length) {
  const { data: linkedResearch } = await admin
    .from("research_runs")
    .select("id, status, estimated_cost, provider, model, failure_classification, error_message, idempotency_key")
    .in("id", monetizationRun.research_run_ids);
  console.log("\n=== LINKED RESEARCH RUNS ===");
  console.log(JSON.stringify(linkedResearch ?? [], null, 2));
}
