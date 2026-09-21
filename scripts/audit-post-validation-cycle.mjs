/**
 * Read-only post-validation audit for a live FAVC1 cycle.
 * Does NOT mutate database rows or call providers.
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

const cycleKey = process.argv[2] ?? "cycle-1786944700372";
const candidateId = process.argv[3] ?? "ce09ed5b-c085-45a2-b9c4-473e37fbf0c1";
const orgId = process.argv[4] ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const selectionRunId = process.argv[5] ?? "2cebc076-d8d5-479b-83ee-d60d9deb6b8b";
const monetizationRunId = process.argv[6] ?? "666b1033-bd70-4c70-97b2-7bb6e010f14e";
const acquisitionResearchRunId = process.argv[7] ?? "29096031-a606-49ba-8648-6a9341f9631e";

const { buildFavc1IdempotencyKey } = await import("../lib/infinity/operator-console/favc1-cycle/types.ts");
const { loadCandidateBundlesForSelection } = await import("../lib/infinity/venture-selection/load/load-candidates.ts");
const { buildAssumptionRegister, analyzeFatalAssumptions } = await import("../lib/infinity/venture-selection/assumptions/register.ts");
const { executeAllowedValidationExperiments } = await import("../lib/infinity/first-autonomous-venture-cycle/bounded-validation/experiments.ts");
const { rescoreAfterValidation } = await import("../lib/infinity/first-autonomous-venture-cycle/bounded-validation/rescore.ts");
const { auditBuildGate } = await import("../lib/infinity/venture-selection/decisions/build-gate-audit.ts");
const { classifyEvidenceRelevance, deriveValidationCredit, classifySourceNovelty, extractPriorSourceUrls } = await import(
  "../lib/infinity/first-autonomous-venture-cycle/bounded-validation/evidence-relevance.ts"
);
const { dedupeValidationClaims, dedupeValidationSourceUrls } = await import(
  "../lib/infinity/first-autonomous-venture-cycle/bounded-validation/evidence-dedupe.ts"
);
const { mapCompletedResearchRunToResult } = await import("../lib/infinity/research/persistence.ts");
const { buildFavc1TerminalDisplay } = await import("../lib/infinity/operator-console/favc1-cycle/terminal-messaging.ts");
const { FAVC1_VALIDATION_MAX_ACQUISITION_CALLS, FAVC1_VALIDATION_MAX_ROUNDS } = await import(
  "../lib/infinity/first-autonomous-venture-cycle/bounded-validation/constants.ts"
);

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function scoreSnapshot(evaluation) {
  const plan = evaluation.candidate?.monetization?.primaryPlan;
  return {
    selectionScore: evaluation.selectionScore,
    monetizationScore: evaluation.candidate?.monetization?.monetizationScore ?? null,
    validationScore: evaluation.validationScore,
    buildabilityScore: evaluation.buildability?.buildabilityScore ?? null,
    confidence: evaluation.confidence,
    fatalAssumptionRisk: evaluation.fatalAssumptionRiskScore,
    platformDependencyRisk: plan?.platformDependencyRisk ?? null,
    regulatoryRisk: plan?.regulatoryRisk ?? null,
    capitalRequired: plan?.estimatedCapitalRequired ?? null,
    expectedROI: evaluation.expectedValueDerived?.expectedRoi ?? null,
    ltvCacRatio: plan?.ltvCacRatio ?? null,
    decision: evaluation.decision,
  };
}

const { data: evaluationRow } = await admin
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

const bundles = await loadCandidateBundlesForSelection(admin, orgId, {
  candidateIds: [candidateId],
  monetizationRunId,
});
const bundle = bundles[0];
if (!bundle || !evaluationRow) {
  console.error("Missing bundle or evaluation");
  process.exit(1);
}

const { buildPersistedEvaluationDraft } = await import("../lib/infinity/venture-selection/replay/replay-from-persisted.ts");

const preValidationEvaluation = buildPersistedEvaluationDraft({
  candidateId,
  title: bundle.title,
  oldDecision: evaluationRow.decision,
  selectionScore: Number(evaluationRow.selection_score ?? 0),
  portfolioAdjustedScore: Number(evaluationRow.portfolio_adjusted_score ?? 0),
  monetizationScore: Number(evaluationRow.monetization_score ?? 0),
  validationScore: Number(evaluationRow.validation_score ?? 0),
  buildabilityScore: Number(evaluationRow.buildability_score ?? 0),
  confidence: Number(evaluationRow.confidence ?? 0),
  fatalAssumptionRiskScore: Number(evaluationRow.fatal_assumption_risk_score ?? 0),
  expectedRoi: Number(evaluationRow.expected_roi ?? 0),
  blockingAssumptions: Array.isArray(evaluationRow.blocking_assumptions) ? evaluationRow.blocking_assumptions : [],
  primaryPlan: {
    estimatedCapitalRequired: bundle.monetization?.primaryPlan?.estimatedCapitalRequired ?? null,
    platformDependencyRisk: bundle.monetization?.primaryPlan?.platformDependencyRisk ?? null,
    regulatoryRisk: bundle.monetization?.primaryPlan?.regulatoryRisk ?? null,
    ltvCacRatio: bundle.monetization?.primaryPlan?.ltvCacRatio ?? null,
  },
});
preValidationEvaluation.candidate = bundle;
preValidationEvaluation.adversarialReview = adversarial
  ? {
      confidence: adversarial.confidence ?? 0.5,
      findings: Array.isArray(adversarial.findings) ? adversarial.findings : [],
      riskInputs: adversarial.risk_inputs ?? {},
    }
  : null;
const preAssumptions = buildAssumptionRegister(bundle, {
  adversarialRiskInputs: adversarial?.risk_inputs ?? undefined,
  adversarialFindings: Array.isArray(adversarial?.findings) ? adversarial.findings : [],
});

const synthesis = executeAllowedValidationExperiments({
  candidate: bundle,
  assumptions: preAssumptions,
  maxExperiments: 2,
  providerCalls: 0,
});

const { data: researchRun } = await admin.from("research_runs").select("*").eq("id", acquisitionResearchRunId).maybeSingle();
const researchResult = researchRun ? mapCompletedResearchRunToResult(researchRun) : null;

let acquisitionEvidence = [];
if (researchResult) {
  const priorUrls = extractPriorSourceUrls(bundle);
  const metadataByUrl = new Map(researchResult.sources.map((source) => [source.url, { sourceId: source.sourceId, destinationUrl: null }]));
  const rawUrls = [
    ...researchResult.evidence.flatMap((item) => item.sourceUrls),
    ...researchResult.sources.map((source) => source.url),
  ];
  const deduped = dedupeValidationSourceUrls(rawUrls, metadataByUrl);
  const rawClaims = researchResult.evidence.map((item) => item.claim);
  const dedupedClaims = dedupeValidationClaims(rawClaims);

  const blockingAssumption =
    preAssumptions.find((item) => item.remainingBlocker) ??
    preAssumptions.find((item) => /acquisition cost|150 paying customers/i.test(item.assumption));

  const combinedTextOld = researchResult.evidence.map((item) => item.claim).join(" | ");
  const combinedTextNew = dedupedClaims.uniqueClaims.join(" | ");
  const relevanceOld = classifyEvidenceRelevance({
    assumption: blockingAssumption ?? preAssumptions[0],
    evidenceText: combinedTextOld,
    experimentType: "comparable_benchmark_research",
  });
  const relevanceNew = classifyEvidenceRelevance({
    assumption: blockingAssumption ?? preAssumptions[0],
    evidenceText: combinedTextNew,
    experimentType: "comparable_benchmark_research",
  });
  const noveltyOld = classifySourceNovelty(rawUrls, priorUrls);
  const noveltyNew = classifySourceNovelty(deduped.uniqueUrls, priorUrls);
  const creditOld = deriveValidationCredit({
    relevance: relevanceOld,
    newSourceCount: noveltyOld.newSourceCount,
    reusedSourceCount: noveltyOld.reusedSourceCount,
    hasQuantitativeClaim: true,
  });
  const creditNew = deriveValidationCredit({
    relevance: relevanceNew,
    newSourceCount: noveltyNew.newSourceCount,
    reusedSourceCount: noveltyNew.reusedSourceCount,
    hasQuantitativeClaim: true,
  });

  acquisitionEvidence = [
    {
      assumptionCategory: blockingAssumption?.category ?? "distribution",
      assumptionId: blockingAssumption?.assumption ?? "unknown",
      claim: combinedTextNew,
      sourceUrls: deduped.uniqueUrls,
      newSourceUrls: noveltyNew.newSourceUrls,
      grounded: deduped.uniqueUrls.length > 0,
      confidenceImpact: creditNew.confidenceImpact,
      assumptionImpact: creditNew.assumptionImpact,
      uncertaintyReduction: creditNew.uncertaintyReduction,
      experimentType: "comparable_benchmark_research",
      relevanceClass: relevanceNew,
      validationResult: creditNew.validationResult,
      newEvidenceFound: noveltyNew.newSourceCount > 0,
      newSourceCount: noveltyNew.newSourceCount,
      reusedSourceCount: noveltyNew.reusedSourceCount,
    },
  ];

  console.log("=== SOURCE DEDUPE ===");
  console.log(JSON.stringify({ rawSourceCount: deduped.rawCount, uniqueSourceCount: deduped.uniqueCount, duplicateCount: deduped.duplicateCount, duplicateKeys: deduped.duplicateKeys }, null, 2));
  console.log("\n=== CLAIM DEDUPE ===");
  console.log(JSON.stringify({ rawClaimCount: dedupedClaims.rawCount, uniqueClaimCount: dedupedClaims.uniqueCount, duplicateClaimCount: dedupedClaims.duplicateCount }, null, 2));
  console.log("\n=== VALIDATION REPLAY ===");
  console.log(
    JSON.stringify(
      {
        oldRelevance: relevanceOld,
        newRelevance: relevanceNew,
        oldValidationResult: creditOld.validationResult,
        newValidationResult: creditNew.validationResult,
        oldUncertaintyReduction: creditOld.uncertaintyReduction,
        newUncertaintyReduction: creditNew.uncertaintyReduction,
        oldNewSourceCount: noveltyOld.newSourceCount,
        newNewSourceCount: noveltyNew.newSourceCount,
      },
      null,
      2,
    ),
  );
}

const allValidationEvidence = [...synthesis.validationEvidence, ...acquisitionEvidence];
const postValidationEvaluation = rescoreAfterValidation({
  preValidationEvaluation,
  validationEvidence: allValidationEvidence,
});

const preGate = auditBuildGate({ evaluation: preValidationEvaluation });
const postGate = auditBuildGate({ evaluation: postValidationEvaluation });

const assumptionRows = postValidationEvaluation.assumptions
  .filter((item) => item.fatalContribution > 0.01 || item.remainingBlocker || /518|150 paying|acquisition cost/i.test(item.assumption))
  .map((item) => ({
    assumption: item.assumption,
    category: item.category,
    impactScore: item.impactScore,
    preValidationUncertainty: preAssumptions.find((a) => a.assumption === item.assumption)?.uncertaintyScore ?? null,
    preFatalContribution: preAssumptions.find((a) => a.assumption === item.assumption)?.fatalContribution ?? null,
    validationEvidenceApplied: item.validationEvidenceApplied ?? false,
    postValidationUncertainty: item.uncertaintyScore,
    postFatalContribution: item.fatalContribution,
    fallbackUsed: item.fallbackUsed ?? false,
    remainingBlocker: item.remainingBlocker ? "YES" : "NO",
  }));

const cacOnlyCounterfactual = (() => {
  const adjustedAssumptions = postValidationEvaluation.assumptions.map((item) =>
    /acquisition cost|150 paying customers/i.test(item.assumption) ? { ...item, remainingBlocker: false, uncertaintyScore: 0.1, fatalContribution: 0.02 } : item,
  );
  const fatal = analyzeFatalAssumptions(adjustedAssumptions);
  const counterfactual = {
    ...postValidationEvaluation,
    assumptions: adjustedAssumptions,
    fatalAssumptionRiskScore: fatal.fatalAssumptionRiskScore,
    blockingAssumptions: fatal.blockingAssumptions,
  };
  const gate = auditBuildGate({ evaluation: counterfactual });
  return gate.passes ? "BUILD" : "VALIDATE";
})();

const terminalDisplay = buildFavc1TerminalDisplay({
  terminalOutcome: "BUSINESS_NO_GO",
  selectionStopReasonPath: "validation_required",
  validationOutcome: postValidationEvaluation.decision,
});

const { data: discoveryRun } = await admin
  .from("opportunity_discovery_runs")
  .select("estimated_cost_usd")
  .eq("idempotency_key", buildFavc1IdempotencyKey(orgId, cycleKey, "discovery"))
  .maybeSingle();
const { data: monetizationRun } = await admin.from("monetization_runs").select("estimated_cost_usd").eq("id", monetizationRunId).maybeSingle();
const { data: selectionRun } = await admin.from("venture_selection_runs").select("estimated_cost_usd").eq("id", selectionRunId).maybeSingle();

console.log("\n=== PRE / POST SCORES ===");
console.log(JSON.stringify({ pre: scoreSnapshot(preValidationEvaluation), post: scoreSnapshot(postValidationEvaluation) }, null, 2));
console.log("\n=== ASSUMPTION REGISTER ===");
console.log(JSON.stringify(assumptionRows, null, 2));
console.log("\n=== BUILD GATE (POST) ===");
console.log(JSON.stringify(postGate.rows, null, 2));
console.log("\n=== FAILED GATES ===");
console.log(postGate.rows.filter((row) => !row.pass));
console.log("\n=== CAC-ONLY COUNTERFACTUAL ===", cacOnlyCounterfactual);
console.log("\n=== TERMINAL DISPLAY ===");
console.log(JSON.stringify(terminalDisplay, null, 2));
console.log("\n=== BOUNDED POLICY ===");
console.log(
  JSON.stringify(
    {
      maxValidationRounds: FAVC1_VALIDATION_MAX_ROUNDS,
      maxAcquisitionCalls: FAVC1_VALIDATION_MAX_ACQUISITION_CALLS,
      legitimateTerminal: true,
      additionalAcquisition: "OPTIONAL OPTIMIZATION",
    },
    null,
    2,
  ),
);
console.log("\n=== COST ===");
console.log(
  JSON.stringify(
    {
      scanner: discoveryRun?.estimated_cost_usd ?? null,
      monetization: monetizationRun?.estimated_cost_usd ?? null,
      selection: selectionRun?.estimated_cost_usd ?? null,
      validation: researchRun?.estimated_cost ?? null,
      knownTotal:
        [discoveryRun?.estimated_cost_usd, monetizationRun?.estimated_cost_usd, selectionRun?.estimated_cost_usd, researchRun?.estimated_cost]
          .filter((value) => value != null)
          .reduce((sum, value) => sum + Number(value), 0) || null,
    },
    null,
    2,
  ),
);

console.log("\n=== PRE GATE FAILURES ===");
console.log(preGate.rows.filter((row) => !row.pass));
