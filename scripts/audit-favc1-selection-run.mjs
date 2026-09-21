/**
 * Read-only audit probe for FAVC1 selection run ef1cbb88...
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

const orgId = process.argv[2] ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const discoveryRunId = process.argv[3] ?? "7a2ecd9e-7fb8-48d9-add4-6dcc70048ea3";
const monetizationRunId = process.argv[4] ?? "e6078b8c-1130-4087-aa5e-7394c99f227c";
const selectionRunId = process.argv[5] ?? "ef1cbb88-040e-49b0-831a-21f048612540";
const cycleKey = process.argv[6] ?? "cycle-1786920585370";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: selectionRun } = await admin
  .from("venture_selection_runs")
  .select("*")
  .eq("id", selectionRunId)
  .maybeSingle();

const { data: evals } = await admin
  .from("candidate_selection_evaluations")
  .select("*")
  .eq("venture_selection_run_id", selectionRunId)
  .order("selection_score", { ascending: false });

const { data: discoveryRun } = await admin
  .from("opportunity_discovery_runs")
  .select("*")
  .eq("id", discoveryRunId)
  .maybeSingle();

const { data: allDiscoveryCandidates } = await admin
  .from("opportunity_candidates")
  .select("*")
  .eq("discovery_run_id", discoveryRunId)
  .order("opportunity_score", { ascending: false, nullsFirst: false });

console.log("=== DISCOVERY RUN ===");
console.log(
  JSON.stringify(
    {
      id: discoveryRun?.id,
      status: discoveryRun?.status,
      candidates_discovered: discoveryRun?.candidates_discovered,
      candidates_merged: discoveryRun?.candidates_merged,
      candidates_persisted: discoveryRun?.candidates_persisted,
      estimated_cost_usd: discoveryRun?.estimated_cost_usd,
      scanner_report: discoveryRun?.scanner_report
        ? {
            candidateCount: discoveryRun.scanner_report.candidateCount,
            poolAdequacy: discoveryRun.scanner_report.poolAdequacy,
            duplicatesMerged: discoveryRun.scanner_report.duplicatesMerged,
          }
        : null,
    },
    null,
    2,
  ),
);

console.log("\n=== SELECTION RUN ===");
console.log(
  JSON.stringify(
    {
      id: selectionRun?.id,
      status: selectionRun?.status,
      inputCandidateIds: selectionRun?.opportunity_candidate_ids,
      discoveryRunIds: selectionRun?.discovery_run_ids,
      monetizationRunId: selectionRun?.monetization_run_id,
      build_count: selectionRun?.build_count,
      validate_count: selectionRun?.validate_count,
      reject_count: selectionRun?.reject_count,
      estimated_cost_usd: selectionRun?.estimated_cost_usd,
      selection_report: selectionRun?.selection_report,
    },
    null,
    2,
  ),
);

console.log("\n=== PER-CANDIDATE EVALUATIONS ===");
for (const [idx, e] of (evals ?? []).entries()) {
  const { data: cand } = await admin
    .from("opportunity_candidates")
    .select("*")
    .eq("id", e.opportunity_candidate_id)
    .maybeSingle();

  const rank =
    (allDiscoveryCandidates ?? []).findIndex((c) => c.id === e.opportunity_candidate_id) + 1;

  const { data: analysis } = await admin
    .from("monetization_candidate_analyses")
    .select("*")
    .eq("monetization_run_id", monetizationRunId)
    .eq("opportunity_candidate_id", e.opportunity_candidate_id)
    .maybeSingle();

  const { data: adversarial } = await admin
    .from("adversarial_reviews")
    .select("*")
    .eq("venture_selection_run_id", selectionRunId)
    .eq("opportunity_candidate_id", e.opportunity_candidate_id)
    .maybeSingle();

  console.log(
    JSON.stringify(
      {
        rank,
        candidateId: e.opportunity_candidate_id,
        title: cand?.title,
        organizationId: cand?.organization_id,
        discoveryRunId: cand?.discovery_run_id,
        opportunityScore: cand?.opportunity_score,
        economicViability: analysis?.economic_viability,
        recommendedPrimaryModel: analysis?.recommended_primary_model,
        recommendedPricingStrategy: analysis?.recommended_pricing_strategy,
        monetizationScore: analysis?.monetization_score,
        combinedDecisionScore: analysis?.combined_decision_score,
        selectionScore: e.selection_score,
        adversarialScore: e.adversarial_score,
        decision: e.decision,
        rejectionReason: e.rejection_reason,
        rationale: e.rationale,
        riskFlags: e.risk_flags,
        scoreBreakdown: e.score_breakdown,
        adversarialFindings: adversarial?.findings ?? null,
        adversarialRiskInputs: adversarial?.risk_inputs ?? null,
        adversarialSummary: adversarial?.summary ?? null,
        buildabilityEvidenceCount: Array.isArray(cand?.buildability_evidence)
          ? cand.buildability_evidence.length
          : 0,
        distributionEvidenceCount: Array.isArray(cand?.distribution_evidence)
          ? cand.distribution_evidence.length
          : 0,
      },
      null,
      2,
    ),
  );
}

// Budget: selection research/adversarial
const prefix = `first-autonomous-venture-v1:${orgId}:${cycleKey}`;
const { data: cycleResearch } = await admin
  .from("research_runs")
  .select("id, status, provider, model, estimated_cost, idempotency_key")
  .eq("organization_id", orgId)
  .like("idempotency_key", `${prefix}%`);

const selectionResearch = (cycleResearch ?? []).filter((r) =>
  r.idempotency_key.includes("venture_selection"),
);
const adversarialResearch = (cycleResearch ?? []).filter((r) =>
  r.idempotency_key.includes("adversarial"),
);

console.log("\n=== CYCLE RESEARCH / COST ===");
console.log(
  JSON.stringify(
    {
      totalResearchRuns: cycleResearch?.length ?? 0,
      selectionResearchCount: selectionResearch.length,
      adversarialResearchCount: adversarialResearch.length,
      selectionRunCost: selectionRun?.estimated_cost_usd,
      researchCosts: (cycleResearch ?? []).map((r) => ({
        key: r.idempotency_key.split(":").slice(-2).join(":"),
        cost: r.estimated_cost,
        provider: r.provider,
      })),
    },
    null,
    2,
  ),
);

// Lineage check
const inputIds = selectionRun?.opportunity_candidate_ids ?? [];
const lineageOk = (evals ?? []).every((e) => {
  const cand = (allDiscoveryCandidates ?? []).find((c) => c.id === e.opportunity_candidate_id);
  return (
    cand &&
    cand.organization_id === orgId &&
    cand.discovery_run_id === discoveryRunId &&
    inputIds.includes(e.opportunity_candidate_id)
  );
});
console.log("\n=== LINEAGE ===");
console.log(JSON.stringify({ all5CurrentCycleOnly: lineageOk, inputIds, evalCount: evals?.length }, null, 2));
