/**
 * Controlled validation integration probe — synthesis → provider escalation.
 * NOT FAVC1. Does not mutate historical selection decisions.
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
const candidateId = process.argv[3] ?? "96d65096-6390-4e2c-822d-cdcdd0d6fe17";
const monetizationRunId = process.argv[4];
const cycleKey = process.argv[5] ?? `escalation-probe-${Date.now()}`;

const { loadCandidateBundlesForSelection } = await import(
  "../lib/infinity/venture-selection/load/load-candidates.ts"
);
const {
  analyzeFatalAssumptions,
  buildAssumptionRegister,
} = await import("../lib/infinity/venture-selection/assumptions/register.ts");
const { assessBuildability } = await import(
  "../lib/infinity/venture-selection/buildability/assess.ts"
);
const { executeAllowedValidationExperiments } = await import(
  "../lib/infinity/first-autonomous-venture-cycle/bounded-validation/experiments.ts"
);
const { runBoundedFavc1ValidationLoop } = await import(
  "../lib/infinity/first-autonomous-venture-cycle/bounded-validation/run.ts"
);
const { CycleBudgetGovernor } = await import(
  "../lib/infinity/first-autonomous-venture-cycle/budget-governor.ts"
);
const { buildValidationStationState } = await import(
  "../lib/infinity/operator-console/favc1-cycle/validation-station.ts"
);
const { humanizeBlockingAssumption } = await import(
  "../lib/infinity/first-autonomous-venture-cycle/bounded-validation/escalation-policy.ts"
);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const bundles = await loadCandidateBundlesForSelection(admin, orgId, {
  candidateIds: [candidateId],
  monetizationRunId,
});

const candidate = bundles[0];
if (!candidate) {
  console.error("Candidate not found");
  process.exit(1);
}

const { data: adversarial } = await admin
  .from("adversarial_reviews")
  .select("risk_inputs, findings")
  .eq("opportunity_candidate_id", candidateId)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

const assumptions = buildAssumptionRegister(candidate, {
  adversarialRiskInputs: adversarial?.risk_inputs ?? undefined,
  adversarialFindings: Array.isArray(adversarial?.findings) ? adversarial.findings : [],
});
const fatal = analyzeFatalAssumptions(assumptions);

const synthesisOnly = executeAllowedValidationExperiments({
  candidate,
  assumptions,
  maxExperiments: 2,
  providerCalls: 0,
});

console.log("=== STEP A: SYNTHESIS ===");
for (const exp of synthesisOnly.experiments) {
  console.log({
    assumption: exp.blockingAssumptionId,
    relevance: exp.relevanceClass,
    result: exp.validationResult,
    newSources: exp.newSourceCount,
    reused: exp.reusedSourceCount,
    uncertaintyReduction: exp.uncertaintyReduction,
  });
}

const budget = new CycleBudgetGovernor();
const evaluation = {
  candidate,
  assumptions,
  fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
  assumptionUncertaintyScore: fatal.assumptionUncertaintyScore,
  blockingAssumptions: fatal.blockingAssumptions,
  validationScore: 68,
  validationDimensions: {},
  buildability: assessBuildability(candidate),
  speedToValue: {},
  expectedValueInputs: {},
  expectedValueDerived: { expectedRoi: 2.5 },
  capitalEfficiencyMetrics: {},
  selectionScoreInputs: {},
  selectionScore: 74,
  portfolioAdjustedScore: 74,
  dependencyTags: [],
  correlationPenalties: [],
  experimentPriorities: [],
  adversarialReview: adversarial
    ? {
        provider: "openai",
        model: "probe",
        summary: "",
        findings: adversarial.findings ?? [],
        riskInputs: adversarial.risk_inputs ?? {},
        confidence: 0.6,
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        estimatedCostUsd: null,
      }
    : null,
  decision: "VALIDATE",
  recommendedNextAction: "",
  queueReason: "",
  explanation: {},
  handoff: null,
  confidence: 0.7,
};

const result = await runBoundedFavc1ValidationLoop(admin, {
  organizationId: orgId,
  cycleKey,
  discoveryRunId: null,
  monetizationRunId: monetizationRunId ?? null,
  ventureSelectionRunId: null,
  evaluations: [evaluation],
  budget,
});

console.log("\n=== STEP B: FULL ROUND (synthesis + optional acquisition) ===");
console.log(JSON.stringify({
  acquisitionDecision: result.acquisitionDecision,
  acquisitionReason: result.acquisitionReason,
  synthesisStepCount: result.synthesisStepCount,
  acquisitionStepCount: result.acquisitionStepCount,
  providerCalls: result.providerCalls,
  validationRound: result.lineage.validationRound,
  preFatalRisk: result.preValidationFatalRisk,
  postFatalRisk: result.postValidationFatalRisk,
  costUsd: result.costUsd,
  costKnown: result.costKnown,
  technicalFailure: result.technicalFailure,
  outcome: result.outcome,
}, null, 2));

const acquisition = result.experiments.find((e) => e.validationStep === "acquisition");
if (acquisition) {
  console.log("\n=== ACQUISITION EXPERIMENT ===");
  console.log(JSON.stringify({
    provider: acquisition.provider,
    model: acquisition.model,
    researchRunId: acquisition.researchRunId,
    newSources: acquisition.newSourceCount,
    reused: acquisition.reusedSourceCount,
    relevance: acquisition.relevanceClass,
    validationResult: acquisition.validationResult,
    uncertaintyReduction: acquisition.uncertaintyReduction,
  }, null, 2));
}

const hqSynthesis = buildValidationStationState({
  validationActive: true,
  validationCompleted: false,
  providerCalls: 0,
  synthesisOnly: true,
  costUsd: 0,
  costKnown: true,
  currentTask: null,
});

const blocker = assumptions.find((a) => a.fatalRiskContribution === Math.max(...assumptions.map((x) => x.fatalRiskContribution)));
const hqAcquisition = buildValidationStationState({
  validationActive: true,
  validationCompleted: false,
  providerCalls: result.providerCalls,
  costUsd: result.costUsd,
  costKnown: result.costKnown,
  humanizedBlocker: blocker ? humanizeBlockingAssumption(blocker) : null,
  currentTask: null,
});

console.log("\n=== HQ STATES ===");
console.log("Synthesis:", JSON.stringify(hqSynthesis, null, 2));
console.log("Acquisition:", JSON.stringify(hqAcquisition, null, 2));

console.log("\n=== BUDGET LEDGER ===");
console.log(JSON.stringify(budget.ledger, null, 2));

console.log("\n=== READINESS ===");
console.log(
  result.acquisitionStepCount > 0 && !result.technicalFailure
    ? "YES — FAVC1 VALIDATION AUTOMATICALLY ESCALATES TO NEW GROUNDED EVIDENCE"
    : result.technicalFailure
      ? "NO — PROVIDER ACQUISITION TECHNICAL FAILURE"
      : "NO — ESCALATION DID NOT OCCUR",
);
