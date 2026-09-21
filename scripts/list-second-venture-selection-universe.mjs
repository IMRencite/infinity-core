/**
 * Read-only: load selection + monetization evidence for non-OccupancyNPV candidates.
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

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const orgId = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const occupancyNpvId = "7e7e924e-0741-4155-a729-8d529da77ea9";

const { data: evals, error: evalError } = await admin
  .from("candidate_selection_evaluations")
  .select("opportunity_candidate_id,selection_score,decision,rejection_reason,rationale,risk_flags,venture_selection_run_id,created_at")
  .order("selection_score", { ascending: false, nullsFirst: false })
  .limit(80);

const { data: analyses, error: analysisError } = await admin
  .from("monetization_candidate_analyses")
  .select("opportunity_candidate_id,economic_viability,recommended_primary_model,recommended_pricing_strategy,monetization_score,combined_decision_score,monetization_run_id")
  .order("combined_decision_score", { ascending: false, nullsFirst: false })
  .limit(80);

const candidateIds = [...new Set([
  ...(evals ?? []).map((row) => row.opportunity_candidate_id),
  ...(analyses ?? []).map((row) => row.opportunity_candidate_id),
])].filter((id) => id && id !== occupancyNpvId);

const { data: candidates } = await admin
  .from("opportunity_candidates")
  .select("id,title,problem,target_customer,market,opportunity_score,business_model_candidates,revenue_mechanism_candidates,unknowns,risks")
  .in("id", candidateIds.slice(0, 40));

const byId = new Map((candidates ?? []).map((row) => [row.id, row]));

const merged = candidateIds.slice(0, 25).map((id) => {
  const candidate = byId.get(id);
  const candidateEvals = (evals ?? []).filter((row) => row.opportunity_candidate_id === id);
  const candidateAnalyses = (analyses ?? []).filter((row) => row.opportunity_candidate_id === id);
  return {
    id,
    title: candidate?.title ?? null,
    market: candidate?.market ?? null,
    customer: candidate?.target_customer ?? null,
    opportunity_score: candidate?.opportunity_score ?? null,
    models: candidate?.business_model_candidates ?? [],
    unknowns: candidate?.unknowns ?? [],
    latestDecision: candidateEvals[0]?.decision ?? null,
    latestSelectionScore: candidateEvals[0]?.selection_score ?? null,
    latestRationale: candidateEvals[0]?.rationale ?? null,
    rejectionReason: candidateEvals[0]?.rejection_reason ?? null,
    evaluationCount: candidateEvals.length,
    latestViability: candidateAnalyses[0]?.economic_viability ?? null,
    latestMonetizationScore: candidateAnalyses[0]?.monetization_score ?? null,
    recommendedModel: candidateAnalyses[0]?.recommended_primary_model ?? null,
    recommendedPricing: candidateAnalyses[0]?.recommended_pricing_strategy ?? null,
  };
});

console.log(JSON.stringify({
  evalError: evalError?.message ?? null,
  analysisError: analysisError?.message ?? null,
  evalCount: evals?.length ?? 0,
  analysisCount: analyses?.length ?? 0,
  occupancyNpvEvals: (evals ?? []).filter((row) => row.opportunity_candidate_id === occupancyNpvId).map((row) => ({
    decision: row.decision,
    selection_score: row.selection_score,
    run: row.venture_selection_run_id,
  })),
  merged,
}, null, 2));
