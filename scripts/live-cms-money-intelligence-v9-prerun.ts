/**
 * Attempt-9 PRE_RUN_ONLY harness.
 * Loads canonical research modules via vite-node (vitest.config.ts aliases).
 * Never calls providers. Never writes FounderIdea / ResearchRun / Treasury.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { persistFounderIdea } from "@/lib/infinity/founder-idea-lab/persist";
import { readScoresEnvelope, submissionToRow } from "@/lib/infinity/founder-idea-lab/persistence";
import { derivedFounderReanalysisAttempt } from "@/lib/infinity/founder-idea-lab/idempotency";
import { buildFounderMoneyView } from "@/lib/infinity/founder-idea-lab/explainability/money-view";
import type { FounderIdeaGrade, FounderIdeaSubmission } from "@/lib/infinity/founder-idea-lab/types";
import { modelComponentCac } from "@/lib/infinity/founder-idea-lab/benchmark-economics/model-cac";
import { classifyMarginRole, modelComponentMargin, modelGrossMargin } from "@/lib/infinity/founder-idea-lab/benchmark-economics/model-margin";
import { modelLtvFromParts, ltvCacScenarios, paybackScenarios } from "@/lib/infinity/founder-idea-lab/benchmark-economics/model-ltv";
import { lifetimeMonthsFromMonthlyChurn, modelRetention } from "@/lib/infinity/founder-idea-lab/benchmark-economics/model-retention";
import { selectPricingCluster, classifyPricingCluster } from "@/lib/infinity/founder-idea-lab/revenue-model-research/pricing-cluster";
import { assessSourceIndependence, confidenceAfterIndependence } from "@/lib/infinity/founder-idea-lab/revenue-model-research/source-independence";
import { vertexRedirectResolutionCapability } from "@/lib/infinity/founder-idea-lab/revenue-model-research/source-redirect";
import {
  buildResearchCoveragePlan,
  loadResearchCoveragePolicy,
  runCoverageDirectedPhases,
} from "@/lib/infinity/research/coverage";
import {
  evaluateQualityReplacementEligibility,
  QUALITY_REPLACEMENT_PRIORITY,
} from "@/lib/infinity/research/coverage/quality-replacement";
import { runGroundedResearch } from "@/lib/infinity/research/run";
import { normalizeGroundedResearch } from "@/lib/infinity/research/normalization/evidence";
import type { ProviderResearchStructuredOutput, ResearchResult } from "@/lib/infinity/research/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CMS_ID = "69d45f14-ca07-4a30-b601-54af6d05953f";
const CMS_CANDIDATE = "091f50e7-feb7-4dae-aba7-0e478a736ba4";
const ART_BAY = "50f883a9-08e9-4315-9d19-49917382d77f";
const EXPECTED_ATTEMPT = 9;
const FIXTURE_MARKERS = [
  "cmsMoneyResearchAfterPacket",
  "cmsBenchmarkEconomicsAfterPacket",
  "cmsLiveV6EconomicReplayPacket",
  "cmsLiveV7EconomicReplayPacket",
  "cmsLiveV8EconomicReplayPacket",
];

function loadEnvLocal() {
  const content = readFileSync(join(root, ".env.local"), "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator);
    let val = trimmed.slice(separator + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
}

loadEnvLocal();

const mode = process.argv[2] ?? "prerun";
if (mode !== "prerun" && mode !== "snapshot") {
  console.log(JSON.stringify({ ok: false, error: "PRE_RUN_ONLY", mode }, null, 2));
  process.exit(1);
}

function yesNo(value: boolean): "YES" | "NO" {
  return value ? "YES" : "NO";
}

function finding(
  overrides: Partial<ProviderResearchStructuredOutput["findings"][number]> & { findingId: string },
): ProviderResearchStructuredOutput["findings"][number] {
  return {
    claim: "Observed signal.",
    signalType: "search_demand",
    observedSignal: "Search results.",
    relevance: "positive",
    confidence: 0.6,
    grounded: true,
    inference: false,
    sourceUrls: ["https://example.com/prerun-source"],
    limitations: [],
    ...overrides,
  };
}

function syntheticResult(findings: ProviderResearchStructuredOutput["findings"]): ResearchResult {
  return normalizeGroundedResearch({
    researchRunId: "prerun-dry-run",
    organizationId: "prerun-org",
    missionId: null,
    providerId: "mock",
    modelId: "prerun-no-provider",
    researchObjective: "Infinity CMS prerun dry-run",
    inputHash: "prerun",
    structured: {
      schemaVersion: "grounded_research_v1",
      summary: "Pre-run dry-run. No live provider.",
      findings,
      limitations: ["prerun"],
      requiresMoreResearch: true,
    },
    groundingMetadata: {
      webSearchQueries: ["prerun"],
      groundingChunks: findings.flatMap((item) => (item.sourceUrls ?? []).map((uri) => ({ web: { uri } }))),
    },
    tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    groundingUsage: {
      webSearchQueries: ["prerun"],
      searchQueryCount: 0,
      groundingChunkCount: 4,
      groundingSupportCount: 0,
      groundingInvoked: false,
      searchCostKnown: true,
    },
    estimatedCostUsd: 0.01,
    costUncertainty: "prerun",
    latencyMs: 1,
    requestId: "prerun",
    retryMetadata: { attemptCount: 1, maxAttempts: 1, retried: false },
    rawProviderResponseStored: false,
  });
}

const MATERIAL_FINDINGS = [
  finding({ findingId: "demand-1", signalType: "search_demand" }),
  finding({ findingId: "market-1", signalType: "growing_market" }),
  finding({ findingId: "competition-1", signalType: "competitor_presence", claim: "Adjacent CMS vendors sell SMB web packages." }),
  finding({
    findingId: "monetization-1",
    signalType: "monetization_precedent",
    claim: "Website platforms charge monthly packages around $449 to $1,150.",
  }),
];

const cmsContext = {
  title: "Infinity CMS",
  description: "CMS that builds pages from a knowledge base",
  targetCustomer: "SMB owners",
  problem: "thin AI websites do not rank",
  proposedSolution: "AI CMS with SEO/AEO publishing",
  businessModelHypothesis: "subscription",
  pricingHypothesis: "monthly credits",
};

async function evaluateExecutableGates() {
  const policy = loadResearchCoveragePolicy();
  const wiringPolicy = { ...policy, maxEstimatedCostUsd: Math.max(policy.maxEstimatedCostUsd, 2) };
  const seed = {
    ideaTitle: cmsContext.title,
    ideaDescription: cmsContext.description,
    targetCustomer: cmsContext.targetCustomer,
    problem: cmsContext.problem,
    businessModelHypothesis: cmsContext.businessModelHypothesis,
    pricingHypothesis: cmsContext.pricingHypothesis,
    competitorLeads: ["Hibu", "Dealerspike"],
  };
  const plan = buildResearchCoveragePlan({ seed, policy });
  const observedPhases: string[] = [];
  const directed = await runCoverageDirectedPhases({
    plan,
    policy: wiringPolicy,
    seed,
    modelId: "prerun-no-provider",
    executePhase: async ({ phase }) => {
      observedPhases.push(phase);
      return { result: syntheticResult(MATERIAL_FINDINGS), attemptCount: 1 };
    },
  });

  const qualityDecision = evaluateQualityReplacementEligibility({
    materialCoverageSufficient: true,
    evidence: directed.result.evidence.map((item) => ({
      claim: item.claim,
      grounded: item.grounded,
      sourceUrls: item.sourceUrls,
    })),
    sources: directed.result.sources,
    policy: wiringPolicy,
    seed,
    issuedQueries: [],
    qualityReplacementPhasesUsed: 0,
    recordedCostUsd: 0.01,
    estimatedGapFillCostUsd: 0.01,
  });

  const cluster = selectPricingCluster({
    context: cmsContext,
    pricedClusters: ["VERTICAL_CMS_PLATFORM", "SELF_SERVE_SITE_BUILDER", "SEO_AEO_TOOLING", "MARKETING_RETAINER"],
  });
  const independence = assessSourceIndependence([
    { url: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/prerun-a" },
    { url: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/prerun-b" },
  ]);
  const componentMargin = modelComponentMargin({
    qualified: [],
    monthlyRevenue: { low: 100, base: 100, high: 100 },
  });
  const componentCac = modelComponentCac({});
  const retention = modelRetention({ aggregations: {}, qualified: [] });
  const ltv = modelLtvFromParts({
    monthlyPrice: { low: 100, base: 100, high: 100 },
    grossMargin: { low: 0.7, base: 0.7, high: 0.7 },
    lifetimeMonths: { low: 12, base: 12, high: 12 },
  });
  const ltvCac = ltvCacScenarios(ltv.range, { low: 200, base: 250, high: 300 });
  const payback = paybackScenarios({
    cac: { low: 200, base: 250, high: 300 },
    monthlyPrice: { low: 100, base: 100, high: 100 },
    grossMargin: { low: 0.7, base: 0.7, high: 0.7 },
  });
  const dummySubmission: FounderIdeaSubmission = {
    id: "prerun-dummy",
    organizationId: "prerun-org",
    submittedByUserId: "prerun-user",
    title: "Infinity CMS",
    description: "prerun",
    targetCustomer: "SMB owners",
    problem: "prerun",
    proposedSolution: "prerun",
    businessModelHypothesis: "prerun",
    pricingHypothesis: "prerun",
    competitors: null,
    notes: null,
    desiredMode: "GRADE_ONLY",
    status: "GRADED",
    opportunityCandidateId: CMS_CANDIDATE,
    infinityDecision: null,
    founderDecision: null,
    origin: "FOUNDER_SUBMITTED",
    failureCode: null,
    needsReanalysis: false,
    researchRunId: null,
    analyzedByUserId: null,
    approvedByUserId: null,
    idempotencyKey: "prerun-dummy",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const dummyGrade = {
    opportunityScores: null,
    selectionScore: null,
    validationScore: null,
    monetizationScore: null,
    fatalAssumptionRisk: null,
    expectedRoi: null,
    estimatedCapitalRequired: null,
    buildReadiness: null,
    opportunityQuality: null,
    evaluation: null,
    scoreIntegrity: "INCOMPLETE",
    readyForDecision: false,
    buildReady: false,
    researchRunId: "prerun-dummy-run",
    monetizationRunId: null,
    provenance: [],
    coverage: null,
    monetizationLayers: null,
    explainability: { version: "prerun" },
    comparableEconomics: null,
    revenueModel: { coverage: { status: "PARTIAL" } },
    benchmarkEconomics: { coverage: { overall: "PARTIAL" } },
  } as unknown as FounderIdeaGrade;
  const persistedShape = submissionToRow(dummySubmission, dummyGrade, []);
  const money = buildFounderMoneyView(null, {});
  const executeSrc = readFileSync(join(root, "lib/infinity/research/coverage/execute.ts"), "utf8");
  const qualitySrc = readFileSync(join(root, "lib/infinity/research/coverage/quality-replacement.ts"), "utf8");
  const runSrc = readFileSync(join(root, "lib/infinity/research/run.ts"), "utf8");
  const fixtureHits = FIXTURE_MARKERS.filter(
    (marker) => executeSrc.includes(marker) || qualitySrc.includes(marker) || runSrc.includes(marker),
  );
  const redirect = vertexRedirectResolutionCapability();

  return {
    policy,
    observedPhases,
    directedPhases: directed.phaseLog.map((item) => item.phase),
    qualityCallCount: directed.telemetry.qualityReplacementCallCount,
    initialCallCount: directed.telemetry.initialResearchCallCount,
    revenueCallCount: directed.telemetry.revenueGapFillCallCount,
    benchmarkCallCount: directed.telemetry.benchmarkGapFillCallCount,
    qualityEligible: qualityDecision.eligible,
    qualityState: qualityDecision.state,
    qualityQueryCapOk: qualityDecision.eligible ? qualityDecision.queries.length <= policy.maxQualityReplacementQueryHardCap : true,
    clusterRecommended: cluster.recommendedPricingCluster,
    clusterSelected: cluster.selectedPricingCluster,
    classifiedAiCms: classifyPricingCluster("AI CMS platform monthly website CMS subscription", cmsContext),
    independenceState: independence.state,
    independenceDowngrades:
      confidenceAfterIndependence("MEDIUM", independence.state) === "LOW" && independence.state === "INDEPENDENCE_UNKNOWN",
    infraMarginRole: classifyMarginRole("AI platform GPU inference gross margin 50-60% because of compute costs"),
    directMarginFn: typeof modelGrossMargin === "function",
    componentMarginAttempted: componentMargin.unknownCostsTreatedAsZero === false,
    componentMarginUsable: componentMargin.used,
    componentCacUsed: componentCac.used,
    componentCacFn: typeof modelComponentCac === "function",
    retentionFn: typeof modelRetention === "function" && typeof lifetimeMonthsFromMonthlyChurn === "function",
    retentionLifetimeFromChurn: lifetimeMonthsFromMonthlyChurn(0.035),
    retentionUsableWithoutRevenueChurn: retention.lifetimeMonths.base == null,
    ltvBase: ltv.range.base,
    ltvFormula: ltv.formula,
    ltvCacBase: ltvCac.base,
    paybackBase: payback.base,
    moneyViewFn: typeof buildFounderMoneyView === "function" && money != null,
    persistFn: typeof persistFounderIdea === "function",
    persistShape: (() => {
      const envelope = readScoresEnvelope(persistedShape.scores_json);
      return Boolean(envelope?.revenueModel) && Boolean(envelope?.benchmarkEconomics) && Boolean(envelope?.explainability);
    })(),
    runFn: typeof runGroundedResearch === "function",
    redirectOff: redirect.supported === false,
    fixtureHits,
    priority: QUALITY_REPLACEMENT_PRIORITY,
  };
}

type Snapshot = {
  founderIdea: string | null;
  title: string | null;
  candidate: string | null;
  historyLen: number;
  nextAttempt: number;
  latestResearchRun: string | null;
  cmsUpdatedAt: string | null;
  artBayTitle: string | null;
  artBayUpdatedAt: string | null;
  treasuryEventsHead: number | null;
  treasuryLedgerHead: number | null;
  snapshotError: string | null;
};

async function snapshotState(): Promise<Snapshot> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return {
      founderIdea: null,
      title: null,
      candidate: null,
      historyLen: -1,
      nextAttempt: -1,
      latestResearchRun: null,
      cmsUpdatedAt: null,
      artBayTitle: null,
      artBayUpdatedAt: null,
      treasuryEventsHead: null,
      treasuryLedgerHead: null,
      snapshotError: "missing_supabase_env",
    };
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await admin
    .from("founder_idea_submissions")
    .select("id,title,opportunity_candidate_id,updated_at,scores_json")
    .eq("id", CMS_ID)
    .maybeSingle();
  if (error) {
    return {
      founderIdea: CMS_ID,
      title: null,
      candidate: null,
      historyLen: -1,
      nextAttempt: -1,
      latestResearchRun: null,
      cmsUpdatedAt: null,
      artBayTitle: null,
      artBayUpdatedAt: null,
      treasuryEventsHead: null,
      treasuryLedgerHead: null,
      snapshotError: error.message,
    };
  }
  const scores = data?.scores_json && typeof data.scores_json === "object" ? (data.scores_json as Record<string, unknown>) : {};
  const hist = Array.isArray(scores.evaluationHistory) ? scores.evaluationHistory.length : 0;
  const { data: artRow } = await admin
    .from("founder_idea_submissions")
    .select("id,title,updated_at")
    .eq("id", ART_BAY)
    .maybeSingle();
  let treasuryEventsHead: number | null = null;
  let treasuryLedgerHead: number | null = null;
  try {
    const events = await admin.from("treasury_events").select("id", { count: "exact", head: true });
    treasuryEventsHead = events.count ?? null;
  } catch {
    treasuryEventsHead = null;
  }
  try {
    const ledger = await admin.from("treasury_ledger_entries").select("id", { count: "exact", head: true });
    treasuryLedgerHead = ledger.count ?? null;
  } catch {
    treasuryLedgerHead = null;
  }
  return {
    founderIdea: data?.id ?? null,
    title: data?.title ?? null,
    candidate: data?.opportunity_candidate_id ?? null,
    historyLen: hist,
    nextAttempt: derivedFounderReanalysisAttempt(hist),
    latestResearchRun: typeof scores.researchRunId === "string" ? scores.researchRunId : null,
    cmsUpdatedAt: data?.updated_at ?? null,
    artBayTitle: artRow?.title ?? null,
    artBayUpdatedAt: artRow?.updated_at ?? null,
    treasuryEventsHead,
    treasuryLedgerHead,
    snapshotError: null,
  };
}

const gates = await evaluateExecutableGates();
const snapshot = await snapshotState();

const targetIsCms = /infinity cms/i.test(snapshot.title ?? "") && snapshot.founderIdea === CMS_ID;
const targetIsNotArtBay = snapshot.founderIdea !== ART_BAY && !/art bay|code name/i.test(snapshot.title ?? "");
const candidateOk = snapshot.candidate === CMS_CANDIDATE;
const attemptOk = snapshot.nextAttempt === EXPECTED_ATTEMPT;
const artBayDistinct = snapshot.artBayUpdatedAt != null && (snapshot.artBayTitle ?? "").length > 0;

const checks = {
  initialResearch: gates.runFn && gates.initialCallCount === 1 && gates.observedPhases[0] === "initial",
  revenueModelGapFill: gates.observedPhases.includes("revenue_model_gap_fill"),
  benchmarkEconomicsGapFill: gates.observedPhases.includes("benchmark_economics_gap_fill"),
  qualityReplacement:
    gates.qualityEligible &&
    gates.observedPhases.includes("quality_replacement") &&
    gates.qualityCallCount === 1 &&
    gates.priority.join(",") === "margin,pricing,cac,retention,setup",
  qualityReplacementMaxPhases: gates.policy.maxQualityReplacementPhases === 1,
  qualityReplacementMaxQueries:
    gates.policy.maxQualityReplacementQueries <= gates.policy.maxQualityReplacementQueryHardCap &&
    gates.policy.maxQualityReplacementQueries <= 8 &&
    gates.qualityQueryCapOk,
  pricingClusterSelection: gates.clusterRecommended === "AI_CMS_PLATFORM" && typeof gates.classifiedAiCms === "string",
  sourceIndependence: gates.independenceState === "INDEPENDENCE_UNKNOWN" && gates.independenceDowngrades,
  marginDirectBenchmarkPath: gates.directMarginFn && gates.infraMarginRole === "INFRASTRUCTURE_MARGIN",
  marginComponentModelPath: gates.componentMarginAttempted && gates.componentMarginUsable === false,
  cacComponentModelPath: gates.componentCacFn && gates.componentCacUsed === false,
  retentionCorroboration: gates.retentionFn && gates.retentionLifetimeFromChurn != null,
  ltv: gates.ltvBase === 840 && /monthly revenue/i.test(gates.ltvFormula),
  ltvCac: gates.ltvCacBase === 3.36,
  payback: gates.paybackBase === 3.6,
  moneyPersistence: gates.moneyViewFn && gates.persistFn && gates.persistShape,
  fixtureContaminationGuard: gates.fixtureHits.length === 0 && gates.redirectOff,
  attemptIs9: attemptOk,
  targetInfinityCms: targetIsCms && targetIsNotArtBay && candidateOk && artBayDistinct,
};

if (mode === "snapshot") {
  console.log(JSON.stringify({ ok: attemptOk && targetIsCms, snapshot, checks: { attemptIs9: yesNo(attemptOk) } }, null, 2));
  process.exit(attemptOk && targetIsCms ? 0 : 2);
}

const failed = Object.entries(checks)
  .filter(([, value]) => value !== true)
  .map(([key]) => key);
const ready = failed.length === 0 && snapshot.snapshotError == null;

const report = {
  mode: "PRE_RUN_ONLY",
  providerCalls: { gemini: 0, openai: 0 },
  writes: { founderIdea: 0, researchRun: 0, treasury: 0 },
  gates: {
    initialResearch: yesNo(checks.initialResearch),
    revenueGapFill: yesNo(checks.revenueModelGapFill),
    benchmarkGapFill: yesNo(checks.benchmarkEconomicsGapFill),
    qualityReplacement: yesNo(checks.qualityReplacement),
    pricingClusters: yesNo(checks.pricingClusterSelection),
    sourceIndependence: yesNo(checks.sourceIndependence),
    marginDirect: yesNo(checks.marginDirectBenchmarkPath),
    marginComponent: yesNo(checks.marginComponentModelPath),
    cacComponent: yesNo(checks.cacComponentModelPath),
    retentionCorroboration: yesNo(checks.retentionCorroboration),
    ltv: yesNo(checks.ltv),
    ltvCac: yesNo(checks.ltvCac),
    payback: yesNo(checks.payback),
    moneyPersistence: yesNo(checks.moneyPersistence),
    fixtureGuard: yesNo(checks.fixtureContaminationGuard),
  },
  qualityReplacementPolicy: {
    maxPhases: gates.policy.maxQualityReplacementPhases,
    maxQueries: gates.policy.maxQualityReplacementQueries,
    hardCap: gates.policy.maxQualityReplacementQueryHardCap,
    priority: gates.priority,
  },
  dryRunPhases: gates.observedPhases,
  snapshot,
  failed,
  READY_FOR_ATTEMPT_9: yesNo(ready),
};

console.log(
  [
    "ATTEMPT 9 PRE-RUN GATE REPORT",
    `Initial research: ${report.gates.initialResearch}`,
    `Revenue gap-fill: ${report.gates.revenueGapFill}`,
    `Benchmark gap-fill: ${report.gates.benchmarkGapFill}`,
    `Quality replacement: ${report.gates.qualityReplacement}`,
    `Pricing clusters: ${report.gates.pricingClusters}`,
    `Source independence: ${report.gates.sourceIndependence}`,
    `Margin direct: ${report.gates.marginDirect}`,
    `Margin component: ${report.gates.marginComponent}`,
    `CAC component: ${report.gates.cacComponent}`,
    `Retention corroboration: ${report.gates.retentionCorroboration}`,
    `LTV: ${report.gates.ltv}`,
    `LTV/CAC: ${report.gates.ltvCac}`,
    `Payback: ${report.gates.payback}`,
    `Money persistence: ${report.gates.moneyPersistence}`,
    `Fixture guard: ${report.gates.fixtureGuard}`,
    `Max phases: ${report.qualityReplacementPolicy.maxPhases}`,
    `Max queries: ${report.qualityReplacementPolicy.maxQueries}`,
    `Hard cap: ${report.qualityReplacementPolicy.hardCap}`,
    `Next attempt: ${snapshot.nextAttempt}`,
    `READY_FOR_ATTEMPT_9: ${report.READY_FOR_ATTEMPT_9}`,
    failed.length ? `Blockers: ${failed.join(", ")}` : "Blockers: none",
  ].join("\n"),
);
console.log(JSON.stringify(report, null, 2));
process.exit(ready ? 0 : 2);
