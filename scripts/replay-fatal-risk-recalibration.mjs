/**
 * Read-only replay of fatal assumption risk under recalibrated register logic.
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

const selectionRunId = process.argv[2] ?? "7cf70675-a94d-47a8-bd3e-37fd7ab86c19";

const { loadCandidateBundlesForSelection } = await import(
  "../lib/infinity/venture-selection/load/load-candidates.ts"
);
const { buildAssumptionRegister, analyzeFatalAssumptions } = await import(
  "../lib/infinity/venture-selection/assumptions/register.ts"
);
const { passesBuildGate, classifyDecision, simulateResourceAllocation } = await import(
  "../lib/infinity/venture-selection/decisions/classify.ts"
);
const {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
  DEFAULT_RESOURCE_CONSTRAINTS,
} = await import("../lib/infinity/venture-selection/constants.ts");
const { assessBuildability } = await import(
  "../lib/infinity/venture-selection/buildability/assess.ts"
);
const { deriveExpectedValueInputs, calculateExpectedValue } = await import(
  "../lib/infinity/venture-selection/economics/expected-value.ts"
);
const { calculateValidationDimensions } = await import(
  "../lib/infinity/venture-selection/scoring/validation-score.ts"
);
const { calculateSelectionScore } = await import(
  "../lib/infinity/venture-selection/scoring/selection-score.ts"
);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: selectionRun } = await admin
  .from("venture_selection_runs")
  .select("organization_id, monetization_run_id")
  .eq("id", selectionRunId)
  .maybeSingle();

if (!selectionRun) {
  console.error("Selection run not found");
  process.exit(1);
}

const { data: evals } = await admin
  .from("candidate_selection_evaluations")
  .select("*")
  .eq("venture_selection_run_id", selectionRunId)
  .order("queue_rank", { ascending: true });

const { data: adversarialRows } = await admin
  .from("adversarial_reviews")
  .select("*")
  .eq("venture_selection_run_id", selectionRunId);

const candidateIds = (evals ?? []).map((row) => row.opportunity_candidate_id);
const bundles = await loadCandidateBundlesForSelection(admin, selectionRun.organization_id, {
  candidateIds,
  monetizationRunId: selectionRun.monetization_run_id,
});

const replayRows = [];
for (const evaluation of evals ?? []) {
  const bundle = bundles.find((item) => item.candidateId === evaluation.opportunity_candidate_id);
  if (!bundle) continue;

  const adversarial = (adversarialRows ?? []).find(
    (row) => row.opportunity_candidate_id === evaluation.opportunity_candidate_id,
  );
  const riskInputs =
    adversarial?.risk_inputs && typeof adversarial.risk_inputs === "object"
      ? adversarial.risk_inputs
      : undefined;
  const findings = Array.isArray(adversarial?.findings) ? adversarial.findings : [];

  const assumptions = buildAssumptionRegister(bundle, {
    adversarialRiskInputs: riskInputs,
    adversarialFindings: findings,
  });
  const fatal = analyzeFatalAssumptions(assumptions);
  const buildability = assessBuildability(bundle);
  const expectedValueInputs = deriveExpectedValueInputs(bundle);
  const expectedValueDerived = calculateExpectedValue(expectedValueInputs);
  const { validationScore } = calculateValidationDimensions({
    candidate: bundle,
    buildability,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    adversarialRiskInputs: riskInputs,
  });
  const { selectionScore } = calculateSelectionScore({
    candidate: bundle,
    validationScore,
    buildability,
    expectedValue: expectedValueDerived,
    speedToValue: {
      estimatedBuildTimeDays: 60,
      estimatedValidationTimeDays: 21,
      estimatedLaunchTimeDays: 74,
      estimatedTimeToFirstVisitorDays: 81,
      estimatedTimeToFirstLeadDays: 95,
      estimatedTimeToFirstTransactionDays: 72,
      estimatedTimeToFirstRevenueDays: 90,
      estimatedTimeToBreakEvenDays: 225,
      speedToValueScore: 70,
    },
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    adversarialRiskInputs: riskInputs,
  });

  const draft = {
    candidate: bundle,
    assumptions,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
    blockingAssumptions: fatal.blockingAssumptions,
    validationScore,
    validationDimensions: {},
    buildability,
    speedToValue: {
      estimatedBuildTimeDays: 60,
      estimatedValidationTimeDays: 21,
      estimatedLaunchTimeDays: 74,
      estimatedTimeToFirstVisitorDays: 81,
      estimatedTimeToFirstLeadDays: 95,
      estimatedTimeToFirstTransactionDays: 72,
      estimatedTimeToFirstRevenueDays: 90,
      estimatedTimeToBreakEvenDays: 225,
      speedToValueScore: 70,
    },
    expectedValueInputs,
    expectedValueDerived,
    capitalEfficiencyMetrics: {},
    selectionScoreInputs: {},
    selectionScore,
    portfolioAdjustedScore: selectionScore,
    dependencyTags: [],
    correlationPenalties: [],
    experimentPriorities: [],
    adversarialReview: null,
    decision: evaluation.decision,
    recommendedNextAction: "",
    queueReason: "",
    explanation: {
      whyThisOpportunity: "",
      whyNow: "",
      whyInfinityCanBuildIt: "",
      whyCustomersWillPay: "",
      whyThisModel: "",
      whyItRanksAboveAlternatives: "",
      largestRisks: [],
      fatalAssumptions: [],
      validationNeeded: [],
      expectedEconomics: {},
      resourceRequirements: {},
      confidence: Number(evaluation.confidence ?? 0.7),
    },
    handoff: null,
    confidence: Number(evaluation.confidence ?? 0.7),
  };

  const buildGate = passesBuildGate({
    evaluation: draft,
    thresholds: DEFAULT_BUILD_GATE_THRESHOLDS,
  });
  const allocationPreview = simulateResourceAllocation({
    rankedEvaluations: [{ ...draft, decision: buildGate.passes ? "BUILD" : "VALIDATE" }],
    constraints: DEFAULT_RESOURCE_CONSTRAINTS,
  });
  const classified = classifyDecision({
    evaluation: draft,
    buildGatePassed: buildGate.passes,
    buildGateReasons: buildGate.reasons,
    hasResourceCapacity:
      allocationPreview.allocations.some(
        (item) => item.candidateId === draft.candidate.candidateId,
      ) || buildGate.passes,
    decisionThresholds: DEFAULT_DECISION_THRESHOLDS,
  });

  replayRows.push({
    candidateId: evaluation.opportunity_candidate_id,
    title: bundle.title,
    oldFatalRisk: Number(evaluation.fatal_assumption_risk_score ?? 0),
    newFatalRisk: fatal.fatalAssumptionRiskScore,
    fallbackRate: fatal.fallbackRate,
    fallbackAssumptions: assumptions.filter((item) => item.fallbackUsed).map((item) => item.assumption),
    evidenceUsed: assumptions.flatMap((item) => item.evidenceSources),
    buildGatePassed: buildGate.passes,
    buildGateFailures: buildGate.reasons,
    oldDecision: evaluation.decision,
    newDecision: classified.decision,
  });
}

console.log("=== FATAL RISK RECALIBRATION REPLAY (READ-ONLY) ===");
console.log(JSON.stringify(replayRows, null, 2));

console.log("\n=== REPLAY TABLE ===");
for (const row of replayRows) {
  console.log(
    [
      row.candidateId.slice(0, 8),
      row.title.slice(0, 36),
      row.oldFatalRisk,
      row.newFatalRisk,
      row.buildGatePassed ? "PASS" : "FAIL",
      row.newDecision,
    ].join(" | "),
  );
}
