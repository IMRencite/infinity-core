/**
 * Read-only bounded validation evidence integrity replay.
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

const candidateId = process.argv[2] ?? "65e55dde-2b40-409e-b76e-f79ad295cf81";
const selectionRunId = process.argv[3] ?? "bf40295a-794c-4b65-b623-7ed7a198384b";
const monetizationRunId = process.argv[4] ?? "7940a03d-d580-4739-b1b5-473290aa657a";

const { loadCandidateBundlesForSelection } = await import(
  "../lib/infinity/venture-selection/load/load-candidates.ts"
);
const { buildAssumptionRegister, analyzeFatalAssumptions } = await import(
  "../lib/infinity/venture-selection/assumptions/register.ts"
);
const { executeAllowedValidationExperiments } = await import(
  "../lib/infinity/first-autonomous-venture-cycle/bounded-validation/experiments.ts"
);
const { rescoreAfterValidation } = await import(
  "../lib/infinity/first-autonomous-venture-cycle/bounded-validation/rescore.ts"
);
const { classifyEvidenceRelevance, extractPriorSourceUrls } = await import(
  "../lib/infinity/first-autonomous-venture-cycle/bounded-validation/evidence-relevance.ts"
);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: selectionRun } = await admin
  .from("venture_selection_runs")
  .select("organization_id")
  .eq("id", selectionRunId)
  .maybeSingle();

const { data: evaluation } = await admin
  .from("candidate_selection_evaluations")
  .select("*")
  .eq("venture_selection_run_id", selectionRunId)
  .eq("opportunity_candidate_id", candidateId)
  .maybeSingle();

const { data: adversarial } = await admin
  .from("adversarial_reviews")
  .select("*")
  .eq("venture_selection_run_id", selectionRunId)
  .eq("opportunity_candidate_id", candidateId)
  .maybeSingle();

const bundles = await loadCandidateBundlesForSelection(admin, selectionRun.organization_id, {
  candidateIds: [candidateId],
  monetizationRunId,
});

const bundle = bundles[0];
if (!bundle || !evaluation) {
  console.error("Candidate bundle or evaluation not found");
  process.exit(1);
}

const riskInputs = adversarial?.risk_inputs ?? undefined;
const findings = Array.isArray(adversarial?.findings) ? adversarial.findings : [];

const preAssumptions = buildAssumptionRegister(bundle, {
  adversarialRiskInputs: riskInputs,
  adversarialFindings: findings,
});
const preFatal = analyzeFatalAssumptions(preAssumptions);

const execution = executeAllowedValidationExperiments({
  candidate: bundle,
  assumptions: preAssumptions,
  maxExperiments: 2,
  providerCalls: 0,
});

const priorUrls = extractPriorSourceUrls(bundle);

console.log("=== PRIOR SOURCE URL COUNT ===", priorUrls.size);
console.log("\n=== EXPERIMENTS (CORRECTED LOGIC) ===");
for (const experiment of execution.experiments) {
  console.log(JSON.stringify(experiment, null, 2));
}

console.log("\n=== RELEVANCE AUDIT ===");
for (const experiment of execution.experiments) {
  const assumption = preAssumptions.find((item) => item.assumption === experiment.blockingAssumptionId);
  const relevance = assumption
    ? classifyEvidenceRelevance({
        assumption,
        evidenceText: experiment.actualEvidence,
        experimentType: experiment.experimentType,
      })
    : experiment.relevanceClass;
  console.log({
    assumption: experiment.blockingAssumptionId,
    evidence: experiment.actualEvidence.slice(0, 120),
    classification: relevance,
    justifiedReduction: experiment.uncertaintyReduction > 0,
    newEvidenceFound: experiment.newEvidenceFound,
    newSources: experiment.newSourceCount,
    reusedSources: experiment.reusedSourceCount,
  });
}

const postEvaluation = rescoreAfterValidation({
  preValidationEvaluation: {
    candidate: bundle,
    assumptions: preAssumptions,
    fatalAssumptionRiskScore: preFatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: preFatal.assumptionUncertaintyScore,
    blockingAssumptions: preFatal.blockingAssumptions,
    validationScore: Number(evaluation.validation_score ?? 0),
    validationDimensions: {},
    buildability: { buildabilityScore: Number(evaluation.buildability_score ?? 0) },
    speedToValue: {},
    expectedValueInputs: {},
    expectedValueDerived: { expectedRoi: Number(evaluation.expected_roi ?? 0) },
    capitalEfficiencyMetrics: {},
    selectionScoreInputs: {},
    selectionScore: Number(evaluation.selection_score ?? 0),
    portfolioAdjustedScore: Number(evaluation.portfolio_adjusted_score ?? 0),
    dependencyTags: [],
    correlationPenalties: [],
    experimentPriorities: [],
    adversarialReview: adversarial
      ? {
          provider: adversarial.provider,
          model: adversarial.model,
          summary: adversarial.summary ?? "",
          findings,
          riskInputs,
          confidence: Number(adversarial.confidence ?? 0.5),
          tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          estimatedCostUsd: null,
        }
      : null,
    decision: evaluation.decision,
    recommendedNextAction: "",
    queueReason: "",
    explanation: {},
    handoff: null,
    confidence: Number(evaluation.confidence ?? 0.7),
  },
  validationEvidence: execution.validationEvidence,
});

console.log("\n=== REPLAY SUMMARY ===");
console.log(
  JSON.stringify(
    {
      candidateId,
      title: bundle.title,
      preValidationFatalRisk: preFatal.fatalAssumptionRiskScore,
      persistedFatalRisk: Number(evaluation.fatal_assumption_risk_score ?? 0),
      postValidationFatalRiskCorrected: postEvaluation.fatalAssumptionRiskScore,
      preDecision: evaluation.decision,
      postDecision: postEvaluation.decision,
      fatalRiskDelta:
        postEvaluation.fatalAssumptionRiskScore - preFatal.fatalAssumptionRiskScore,
    },
    null,
    2,
  ),
);
