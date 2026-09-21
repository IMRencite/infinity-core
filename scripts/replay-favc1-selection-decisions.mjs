/**
 * Read-only replay of venture selection decisions under repaired gate logic.
 * Does NOT mutate database rows.
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

const selectionRunId = process.argv[2] ?? "ef1cbb88-040e-49b0-831a-21f048612540";

const { replaySelectionPool } = await import(
  "../lib/infinity/venture-selection/replay/replay-from-persisted.ts"
);
const { estimateAdversarialReviewCostUsd } = await import(
  "../lib/infinity/venture-selection/cost/estimate-adversarial-cost.ts"
);

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

const { data: adversarialRows } = await admin
  .from("adversarial_reviews")
  .select("*")
  .eq("venture_selection_run_id", selectionRunId);

const snapshots = [];
for (const evaluation of evals ?? []) {
  const { data: candidate } = await admin
    .from("opportunity_candidates")
    .select("title")
    .eq("id", evaluation.opportunity_candidate_id)
    .maybeSingle();

  let primaryPlan = {
    estimatedCapitalRequired: evaluation.estimated_capital_required,
    platformDependencyRisk: null,
    regulatoryRisk: null,
    ltvCacRatio: null,
  };

  if (evaluation.primary_plan_id) {
    const { data: plan } = await admin
      .from("monetization_plans")
      .select(
        "estimated_capital_required, platform_dependency_risk, regulatory_risk, ltv_cac_ratio",
      )
      .eq("id", evaluation.primary_plan_id)
      .maybeSingle();
    if (plan) {
      primaryPlan = {
        estimatedCapitalRequired:
          plan.estimated_capital_required ?? evaluation.estimated_capital_required,
        platformDependencyRisk: plan.platform_dependency_risk,
        regulatoryRisk: plan.regulatory_risk,
        ltvCacRatio: plan.ltv_cac_ratio,
      };
    }
  }

  snapshots.push({
    candidateId: evaluation.opportunity_candidate_id,
    title: candidate?.title ?? evaluation.opportunity_candidate_id,
    oldDecision: evaluation.decision,
    selectionScore: Number(evaluation.selection_score ?? 0),
    portfolioAdjustedScore: Number(evaluation.portfolio_adjusted_score ?? 0),
    monetizationScore: Number(evaluation.monetization_score ?? 0),
    validationScore: Number(evaluation.validation_score ?? 0),
    buildabilityScore: Number(evaluation.buildability_score ?? 0),
    confidence: Number(evaluation.confidence ?? 0),
    fatalAssumptionRiskScore: Number(evaluation.fatal_assumption_risk_score ?? 0),
    expectedRoi: Number(evaluation.expected_roi ?? 0),
    blockingAssumptions: Array.isArray(evaluation.blocking_assumptions)
      ? evaluation.blocking_assumptions
      : [],
    primaryPlan,
  });
}

const replayed = replaySelectionPool(snapshots);

console.log("=== READ-ONLY HISTORICAL REPLAY ===");
console.log(JSON.stringify(replayed, null, 2));

const tokenUsage = selectionRun?.token_usage ?? {};
const inputTokens = Number(tokenUsage.inputTokens ?? tokenUsage.input_tokens ?? 0);
const outputTokens = Number(tokenUsage.outputTokens ?? tokenUsage.output_tokens ?? 0);
const totalTokens = Number(tokenUsage.totalTokens ?? tokenUsage.total_tokens ?? inputTokens + outputTokens);
const costEstimate = estimateAdversarialReviewCostUsd({ inputTokens, outputTokens, totalTokens });

console.log("\n=== SELECTION COST TELEMETRY (RECOMPUTED, NOT PERSISTED) ===");
console.log(
  JSON.stringify(
    {
      provider: adversarialRows?.[0]?.provider ?? "openai",
      model: adversarialRows?.[0]?.model ?? null,
      calls: adversarialRows?.length ?? 0,
      inputTokens,
      outputTokens,
      totalTokens,
      knownCost: costEstimate.estimatedCostUsd,
      unknownCost: costEstimate.known ? null : "adversarial provider cost",
      pricingVersion: costEstimate.pricingVersion,
      persistedRunCost: selectionRun?.estimated_cost_usd ?? null,
    },
    null,
    2,
  ),
);

console.log("\n=== REPLAY TABLE ===");
for (const row of replayed) {
  console.log(
    [
      row.candidateId.slice(0, 8),
      row.title.slice(0, 40),
      row.oldDecision,
      row.recomputedDecision,
      row.buildGatePassed ? "YES" : "NO",
      row.buildGateFailures.join("; ") || "-",
    ].join(" | "),
  );
}
