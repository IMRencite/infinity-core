/**
 * Read-only FAVC1 safety / fatal-assumption calibration audit probe.
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
const selectionRunId = process.argv[3] ?? "7cf70675-a94d-47a8-bd3e-37fd7ab86c19";
const monetizationRunId = process.argv[4] ?? "bf394c6c-bd5b-455b-a6d3-b044e67f433f";
const discoveryRunId = process.argv[5] ?? "400a891c-0cd5-4826-9411-26796725ca86";

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
  .order("queue_rank", { ascending: true });

const { data: monetizationRun } = await admin
  .from("monetization_runs")
  .select("*")
  .eq("id", monetizationRunId)
  .maybeSingle();

const { data: orgEvals } = await admin
  .from("candidate_selection_evaluations")
  .select("fatal_assumption_risk_score, venture_selection_run_id, decision, created_at")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false })
  .limit(200);

console.log("=== SELECTION RUN ===");
console.log(
  JSON.stringify(
    {
      id: selectionRun?.id,
      status: selectionRun?.status,
      estimated_cost_usd: selectionRun?.estimated_cost_usd,
      token_usage: selectionRun?.token_usage,
      selection_report: selectionRun?.selection_report,
    },
    null,
    2,
  ),
);

console.log("\n=== MONETIZATION RUN ===");
console.log(
  JSON.stringify(
    {
      id: monetizationRun?.id,
      status: monetizationRun?.status,
      estimated_cost_usd: monetizationRun?.estimated_cost_usd,
      engine_report: monetizationRun?.engine_report
        ? {
            costSummary: monetizationRun.engine_report.costSummary,
            researchCallCount: monetizationRun.engine_report.costSummary?.researchCallCount,
          }
        : null,
    },
    null,
    2,
  ),
);

console.log("\n=== PER-CANDIDATE ===");
for (const e of evals ?? []) {
  const { data: cand } = await admin
    .from("opportunity_candidates")
    .select("title, opportunity_score")
    .eq("id", e.opportunity_candidate_id)
    .maybeSingle();

  const { data: plan } = e.primary_plan_id
    ? await admin
        .from("monetization_plans")
        .select("*")
        .eq("id", e.primary_plan_id)
        .maybeSingle()
    : { data: null };

  const { data: adversarial } = await admin
    .from("adversarial_reviews")
    .select("*")
    .eq("venture_selection_run_id", selectionRunId)
    .eq("opportunity_candidate_id", e.opportunity_candidate_id)
    .maybeSingle();

  const { data: assumptions } = await admin
    .from("candidate_assumptions")
    .select("*")
    .eq("candidate_selection_evaluation_id", e.id)
    .order("fatal_risk_contribution", { ascending: false });

  console.log(
    JSON.stringify(
      {
        candidateId: e.opportunity_candidate_id,
        title: cand?.title,
        opportunityScore: cand?.opportunity_score,
        monetizationScore: e.monetization_score,
        validationScore: e.validation_score,
        buildabilityScore: e.buildability_score,
        selectionScore: e.selection_score,
        portfolioAdjustedScore: e.portfolio_adjusted_score,
        confidence: e.confidence,
        fatalAssumptionRisk: e.fatal_assumption_risk_score,
        platformDependencyRisk: plan?.platform_dependency_risk,
        regulatoryRisk: plan?.regulatory_risk,
        estimatedCapitalRequired: e.estimated_capital_required ?? plan?.estimated_capital_required,
        expectedRoi: e.expected_roi,
        decision: e.decision,
        blockingAssumptions: e.blocking_assumptions,
        recommendedValidation: e.recommended_next_action,
        queueReason: e.queue_reason,
        topAssumptions: (assumptions ?? []).slice(0, 5).map((a) => ({
          assumption: a.assumption,
          impactScore: a.impact_score,
          uncertaintyScore: a.uncertainty_score,
          fatalRiskContribution: a.fatal_risk_contribution,
          validationMethod: a.validation_method,
        })),
        adversarialSummary: adversarial?.summary ?? null,
        adversarialRiskInputs: adversarial?.risk_inputs ?? null,
        adversarialConfidence: adversarial?.confidence,
        adversarialCost: adversarial?.estimated_cost_usd,
        adversarialTokenUsage: adversarial?.token_usage,
      },
      null,
      2,
    ),
  );
}

const scores = (orgEvals ?? [])
  .map((row) => Number(row.fatal_assumption_risk_score))
  .filter((v) => Number.isFinite(v));

function freq(target) {
  return scores.filter((v) => Math.abs(v - target) < 0.0001).length;
}

scores.sort((a, b) => a - b);
const mean = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null;
const median =
  scores.length === 0
    ? null
    : scores.length % 2 === 1
      ? scores[(scores.length - 1) / 2]
      : (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2;

console.log("\n=== FATAL RISK DISTRIBUTION (org, last 200 evals) ===");
console.log(
  JSON.stringify(
    {
      count: scores.length,
      min: scores[0] ?? null,
      max: scores[scores.length - 1] ?? null,
      mean: mean != null ? Math.round(mean * 10000) / 10000 : null,
      median,
      uniqueValues: [...new Set(scores.map((v) => Math.round(v * 100) / 100))].sort(),
      freq045: freq(0.45),
      freq046: freq(0.46),
      freq047: freq(0.47),
      freq048: freq(0.48),
      freq050: freq(0.5),
    },
    null,
    2,
  ),
);

const { data: adversarialAll } = await admin
  .from("adversarial_reviews")
  .select("provider, model, token_usage, estimated_cost_usd")
  .eq("venture_selection_run_id", selectionRunId);

console.log("\n=== ADVERSARIAL CALLS ===");
console.log(JSON.stringify(adversarialAll, null, 2));
