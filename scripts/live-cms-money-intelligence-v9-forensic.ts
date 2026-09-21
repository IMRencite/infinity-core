/**
 * Attempt-9 READ-ONLY forensic inspection.
 * vite-node + vitest.config.ts. No providers. No writes.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { derivedFounderReanalysisAttempt, founderResearchAttemptKey } from "@/lib/infinity/founder-idea-lab/idempotency";
import { buildFounderMoneyView } from "@/lib/infinity/founder-idea-lab/explainability/money-view";
import { buildFounderIntelligenceView } from "@/lib/infinity/founder-idea-lab/explainability/view";
import { flattenExplainabilityForHq } from "@/lib/infinity/founder-idea-lab/explainability/compose";
import type { FounderExplainability } from "@/lib/infinity/founder-idea-lab/explainability/types";
import { readCandidateIdFromStructuredResult } from "@/lib/infinity/research/candidate-lineage";
import { sourceQualityHigh, sourceQualityScore } from "@/lib/infinity/founder-idea-lab/benchmark-economics/quality";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CMS_ID = "69d45f14-ca07-4a30-b601-54af6d05953f";
const CMS_CANDIDATE = "091f50e7-feb7-4dae-aba7-0e478a736ba4";
const ART_BAY = "50f883a9-08e9-4315-9d19-49917382d77f";
const EXPECTED_RUN = "74fd1512-7578-45d4-929c-50b943e7870a";
const FIXTURE_MARKERS = [
  "cmsMoneyResearchAfterPacket",
  "cmsBenchmarkEconomicsAfterPacket",
  "cmsLiveV6EconomicReplayPacket",
  "cmsLiveV7EconomicReplayPacket",
  "cmsLiveV8EconomicReplayPacket",
  "Northstar Sites",
  "LocalLaunch Web",
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function nested(rootObj: unknown, path: string[]): unknown {
  let current: unknown = rootObj;
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function rangeOf(value: unknown): { low: unknown; base: unknown; high: unknown } {
  const record = asRecord(value);
  return { low: record.low ?? null, base: record.base ?? record.baseCase ?? null, high: record.high ?? null };
}

function band(sourceClass: unknown): "HIGH" | "MEDIUM" | "LOW" {
  const cls = String(sourceClass ?? "");
  if (sourceQualityHigh(cls as never)) return "HIGH";
  if (sourceQualityScore(cls as never) >= 0.7) return "MEDIUM";
  return "LOW";
}

function countBands(items: Array<{ sourceClass?: unknown }>): { HIGH: number; MEDIUM: number; LOW: number } {
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const item of items) counts[band(item.sourceClass)] += 1;
  return counts;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log(JSON.stringify({ ok: false, error: "missing_supabase_env" }));
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: cms, error: cmsError } = await admin
  .from("founder_idea_submissions")
  .select(
    "id,title,status,opportunity_candidate_id,infinity_decision,organization_id,updated_at,created_at,scores_json,idempotency_key",
  )
  .eq("id", CMS_ID)
  .maybeSingle();
if (cmsError || !cms) {
  console.log(JSON.stringify({ ok: false, error: cmsError?.message ?? "FOUNDER_IDEA_NOT_FOUND" }));
  process.exit(1);
}

const { data: artBay } = await admin
  .from("founder_idea_submissions")
  .select("id,title,updated_at,opportunity_candidate_id")
  .eq("id", ART_BAY)
  .maybeSingle();

const scores = asRecord(cms.scores_json);
const history = asArray(scores.evaluationHistory).map((item, index) => {
  const row = asRecord(item);
  return {
    index,
    oneBased: index + 1,
    attemptDerivedFromOrder: index + 1,
    archivedAt: row.archivedAt ?? null,
    evaluationVersion: row.evaluationVersion ?? null,
    researchRunId: row.researchRunId ?? null,
    candidateId: row.candidateId ?? null,
    decision: row.decision ?? null,
    status: row.status ?? null,
    scoreIntegrity: row.scoreIntegrity ?? null,
    reason: row.reason ?? null,
    opportunityScore: row.opportunityScore ?? null,
  };
});

const historyLen = history.length;
const nextAttempt = derivedFounderReanalysisAttempt(historyLen);
const completedAttempt = historyLen;
const currentResearchRunId = typeof scores.researchRunId === "string" ? scores.researchRunId : null;
const v9Key = founderResearchAttemptKey({ submissionId: CMS_ID, candidateId: CMS_CANDIDATE, attempt: 9 });
const v10Key = founderResearchAttemptKey({ submissionId: CMS_ID, candidateId: CMS_CANDIDATE, attempt: 10 });
const historyEntry9 = history[8] ?? null;

const { data: run } = await admin
  .from("research_runs")
  .select(
    "id,organization_id,mission_id,provider,model,status,validation_status,idempotency_key,research_objective,estimated_cost,cost_uncertainty,retry_count,failure_classification,error_message,request_id,correlation_id,started_at,completed_at,failed_at,created_at,token_usage,grounding_usage,structured_result,normalized_evidence,normalized_sources,prompt_version,schema_version",
  )
  .eq("id", EXPECTED_RUN)
  .maybeSingle();

const { data: runByKey } = await admin
  .from("research_runs")
  .select("id,idempotency_key,status,provider,model,created_at")
  .eq("idempotency_key", v9Key)
  .maybeSingle();

const { data: runV10 } = await admin
  .from("research_runs")
  .select("id,idempotency_key,status")
  .eq("idempotency_key", v10Key)
  .maybeSingle();

const { count: treasuryLedgerHead } = await admin.from("treasury_ledger_entries").select("id", { count: "exact", head: true });

const structured = asRecord(run?.structured_result);
const telemetry = asRecord(structured.callTelemetry);
const phaseLog = asArray(structured.phaseLog).map((item) => {
  const row = asRecord(item);
  return {
    phase: String(row.phase ?? "unknown"),
    queries: asArray(row.queries).map(String),
    findingsBefore: row.findingsBefore ?? null,
    findingsAfter: row.findingsAfter ?? null,
    sourcesBefore: row.sourcesBefore ?? null,
    sourcesAfter: row.sourcesAfter ?? null,
    materialCoverageBefore: row.materialCoverageBefore ?? null,
    materialCoverageAfter: row.materialCoverageAfter ?? null,
    attemptCount: row.attemptCount ?? null,
    estimatedCostUsd: row.estimatedCostUsd ?? null,
  };
});
const issuedQueries = asArray(structured.issuedQueries);
const evidence = asArray(run?.normalized_evidence).length ? asArray(run?.normalized_evidence) : asArray(structured.evidence);
const sources = asArray(run?.normalized_sources).length ? asArray(run?.normalized_sources) : asArray(structured.sources);
const tokenUsage = asRecord(run?.token_usage);
const groundingUsage = asRecord(run?.grounding_usage);
const runCandidateId = readCandidateIdFromStructuredResult(structured);
const blob = JSON.stringify({ structured, scores: { revenueModel: scores.revenueModel, benchmarkEconomics: scores.benchmarkEconomics } });
const fixtureHits = FIXTURE_MARKERS.filter((marker) => blob.includes(marker));

const phaseByName = (name: string) => phaseLog.find((item) => item.phase === name) ?? null;
const summarizePhase = (name: string) => {
  const row = phaseByName(name);
  if (!row) return { ran: "NO", queries: [], findingsAdded: null, sourcesAdded: null, coverageBefore: null, coverageAfter: null, providerCalls: null };
  const findingsAdded =
    typeof row.findingsAfter === "number" && typeof row.findingsBefore === "number" ? row.findingsAfter - row.findingsBefore : null;
  const sourcesAdded =
    typeof row.sourcesAfter === "number" && typeof row.sourcesBefore === "number" ? row.sourcesAfter - row.sourcesBefore : null;
  return {
    ran: "YES",
    queries: row.queries,
    findingsAdded,
    sourcesAdded,
    coverageBefore: row.materialCoverageBefore,
    coverageAfter: row.materialCoverageAfter,
    providerCalls: row.attemptCount,
    estimatedCostUsd: row.estimatedCostUsd,
  };
};

const revenue = asRecord(scores.revenueModel);
const rpc = asRecord(revenue.revenuePerCustomer);
const arpuModel = asRecord(rpc.arpuModel);
const clusters = asRecord(revenue.pricingClusters);
const coverageRev = asRecord(revenue.coverage);
const bench = asRecord(scores.benchmarkEconomics);
const modeled = asRecord(bench.modeled);
const benchCoverage = asRecord(bench.coverage);
const sampleQuality = asRecord(bench.sampleQuality);
const qualified = asArray(bench.qualified).map((item) => asRecord(item));
const accepted = qualified.filter((item) => item.relevance !== "REJECTED");
const cacObs = accepted.filter((item) => item.dimension === "customer_acquisition_cost");
const retObs = accepted.filter((item) =>
  ["monthly_churn", "annual_churn", "retention_rate", "customer_lifetime"].includes(String(item.dimension)),
);
const marginObs = accepted.filter((item) => item.dimension === "gross_margin");
const rejectedMargin = qualified.filter((item) => item.dimension === "gross_margin" && item.relevance === "REJECTED");
const componentCac = asRecord(bench.componentCac);
const unusedMargin = asArray(bench.unusedMarginEvidence).map((item) => asRecord(item));

const corePrices = asArray(arpuModel.observations)
  .map((item) => asRecord(item))
  .filter((item) => item.contributesToCore);
const pricingBands = countBands(corePrices.length ? corePrices : asArray(arpuModel.observations).map((item) => asRecord(item)));

const publisherTitleCount = sources.filter((item) => {
  const row = asRecord(item);
  return Boolean(row.title || row.publisher);
}).length;
const opaqueOnly = sources.filter((item) => /vertexaisearch\.cloud\.google\.com/i.test(String(asRecord(item).url ?? ""))).length;

const explain = scores.explainability ? (scores.explainability as FounderExplainability) : null;
const view = explain ? buildFounderIntelligenceView(explain) : null;
const metadata = explain ? flattenExplainabilityForHq(explain) : {};
const money = view ? buildFounderMoneyView(view, metadata) : null;

const geminiCalls = telemetry.totalProviderCalls ?? telemetry.initialResearchCallCount ?? null;
const openaiCalls = run?.provider === "openai" ? geminiCalls : 0;
const liveEvidence = {
  status: run?.status ?? null,
  hasTokenUsage: Object.keys(tokenUsage).length > 0,
  inputTokens: tokenUsage.inputTokens ?? tokenUsage.promptTokenCount ?? null,
  outputTokens: tokenUsage.outputTokens ?? tokenUsage.candidatesTokenCount ?? null,
  totalTokens: tokenUsage.totalTokens ?? tokenUsage.totalTokenCount ?? null,
  groundingInvoked: groundingUsage.groundingInvoked ?? null,
  searchQueryCount: groundingUsage.searchQueryCount ?? groundingUsage.webSearchQueries ?? null,
  telemetry,
  estimatedCost: run?.estimated_cost ?? structured.estimatedCostUsd ?? null,
  retryCount: run?.retry_count ?? null,
  requestId: run?.request_id ?? null,
};
const live =
  run?.status === "completed" &&
  (Number(liveEvidence.estimatedCost) > 0 ||
    Number(liveEvidence.inputTokens) > 0 ||
    Number(telemetry.totalProviderCalls) > 0 ||
    groundingUsage.groundingInvoked === true)
    ? "YES"
    : run
      ? "UNKNOWN"
      : "NO";

const ltvRange = rangeOf(asRecord(modeled.ltv).range ?? modeled.ltv);
const cacRange = rangeOf(asRecord(modeled.cac).range ?? modeled.cac);
const marginRange = rangeOf(asRecord(modeled.grossMargin).range ?? modeled.grossMargin);
const lifetimeRange = rangeOf(asRecord(modeled.lifetimeMonths).range ?? modeled.lifetimeMonths);
const setupRange = rangeOf(asRecord(rpc.firstYearSetup).range ?? rpc.firstYearSetup ?? nested(revenue, ["architecture", "setup"]));
const coreRange = rangeOf(rpc.coreRecurringARPU ?? clusters.core ?? arpuModel.core);
const managedRange = rangeOf(rpc.managedServiceARPU ?? arpuModel.managedService);
const addOnRange = rangeOf(rpc.addOnARPU ?? arpuModel.addOn);

const marginBlocker = unusedMargin.map((item) => String(item.why ?? item.claim ?? "")).filter(Boolean);
const ltvBlocker =
  ltvRange.base == null
    ? money?.presentation?.ltvBlocker ??
      (marginRange.base == null
        ? "usable gross-margin evidence is missing"
        : "LTV inputs incomplete")
    : "NONE";

const duplicateHistory = history.some((row, index) =>
  history.slice(index + 1).some(
    (other) => other.researchRunId && other.researchRunId === row.researchRunId && other.archivedAt === row.archivedAt,
  ),
);
const mixedCandidates = history.filter((row) => row.candidateId && row.candidateId !== CMS_CANDIDATE).map((row) => row.candidateId);
const terminal = ["completed", "failed", "policy_blocked", "validation_failed"].includes(String(run?.status ?? ""));
const artBayContam =
  cms.id === ART_BAY ||
  String(cms.title).toLowerCase().includes("art bay") ||
  history.some((row) => row.candidateId && String(row.candidateId) === String(artBay?.opportunity_candidate_id)) ||
  String(run?.idempotency_key ?? "").includes(ART_BAY);

const classification =
  fixtureHits.length > 0
    ? "SIMULATION_OR_FIXTURE"
    : !run
      ? currentResearchRunId
        ? "HISTORY_ONLY"
        : "UNKNOWN"
      : run.status !== "completed"
        ? "LIVE_FAILED"
        : live !== "YES"
          ? "PERSISTENCE_ONLY"
          : marginRange.base == null
            ? "COMPLETE_LIVE_PARTIAL"
            : "COMPLETE_LIVE_SUCCESS";

const qualityPhase = phaseByName("quality_replacement");
const qualityQueries = qualityPhase?.queries ?? [];
const stopReason = structured.stopReason ?? null;

const report = {
  mode: "FORENSIC_READ_ONLY",
  writes: { founderIdea: 0, researchRun: 0, treasury: 0 },
  providerCallsThisInspection: { gemini: 0, openai: 0 },
  founder: {
    id: cms.id,
    title: cms.title,
    status: cms.status,
    decision: cms.infinity_decision,
    candidate: cms.opportunity_candidate_id,
    organizationId: cms.organization_id,
    updatedAt: cms.updated_at,
    currentResearchRunId,
    historyLen,
    nextAttempt,
    completedAttemptDerived: completedAttempt,
  },
  history,
  historyEntry9,
  currentAttempt9: {
    meaning: "Canonical attempt 9 is the current FounderIdea grade after history length reached 9. History[8] is the prior grade archived when attempt 9 started.",
    researchRunId: currentResearchRunId,
    idempotency: v9Key,
    timestamp: cms.updated_at,
    decision: cms.infinity_decision,
    status: cms.status,
    attemptFieldOnSnapshot: "missing — derived from history length / idempotency key",
  },
  lineage: {
    infinityCms: cms.id === CMS_ID && /infinity cms/i.test(String(cms.title)),
    canonicalCandidate: cms.opportunity_candidate_id === CMS_CANDIDATE,
    runMatchesExpected: run?.id === EXPECTED_RUN,
    currentScoresPointToRun: currentResearchRunId === EXPECTED_RUN,
    historyEntry9PointsToRun: historyEntry9?.researchRunId === EXPECTED_RUN,
    runIdempotencyIsV9: run?.idempotency_key === v9Key,
    runByKeyMatches: runByKey?.id === EXPECTED_RUN,
    runCandidateId,
    runCandidateMatches: runCandidateId === CMS_CANDIDATE || runCandidateId == null,
    artBayTitle: artBay?.title ?? null,
    artBayUpdatedAt: artBay?.updated_at ?? null,
    artBayContamination: artBayContam,
    v10RunExists: Boolean(runV10),
  },
  researchRun: run
    ? {
        id: run.id,
        organizationId: run.organization_id,
        missionId: run.mission_id,
        provider: run.provider,
        model: run.model,
        status: run.status,
        validationStatus: run.validation_status,
        idempotencyKey: run.idempotency_key,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        failedAt: run.failed_at,
        createdAt: run.created_at,
        cost: run.estimated_cost,
        costUncertainty: run.cost_uncertainty,
        retryCount: run.retry_count,
        failureClassification: run.failure_classification,
        errorMessage: run.error_message,
        requestId: run.request_id,
        correlationId: run.correlation_id,
        promptVersion: run.prompt_version,
        schemaVersion: run.schema_version,
        objective: run.research_objective,
        providerCalls: telemetry.totalProviderCalls ?? null,
        telemetry,
        queryCount: asArray(structured.issuedQueries).length || qualityQueries.length,
        issuedQueryCount: issuedQueries.length,
        sourceCount: sources.length,
        findingCount: evidence.length,
        stopReason,
        candidateId: runCandidateId,
      }
    : null,
  liveEvidence,
  live,
  openaiCalls,
  phases: {
    initial: summarizePhase("initial"),
    revenue_model_gap_fill: summarizePhase("revenue_model_gap_fill"),
    benchmark_economics_gap_fill: summarizePhase("benchmark_economics_gap_fill"),
    quality_replacement: summarizePhase("quality_replacement"),
    gap_fill: summarizePhase("gap_fill"),
    sequence: phaseLog.map((item) => item.phase),
    stopReason,
  },
  qualityReplacement: {
    triggered: qualityPhase ? "YES" : phaseLog.length ? "NO" : "UNKNOWN",
    state: stopReason ?? null,
    queriesExecuted: qualityQueries,
    issuedQueries: issuedQueries
      .map((item) => asRecord(item))
      .filter((item) => String(item.intent ?? item.query ?? "").includes("quality-replacement"))
      .map((item) => item.query ?? item),
    callCount: telemetry.qualityReplacementCallCount ?? null,
    stopReason,
  },
  pricing: {
    recommended: clusters.recommended ?? arpuModel.recommendedPricingCluster ?? null,
    selected: clusters.selected ?? arpuModel.selectedPricingCluster ?? null,
    fallbackUsed: clusters.selected && clusters.recommended && clusters.selected !== clusters.recommended,
    reason: clusters.reason ?? arpuModel.clusterReason ?? null,
    clusterConfidence: clusters.confidence ?? arpuModel.clusterConfidence ?? null,
    core: coreRange,
    coverage: coverageRev.pricingEvidenceStatus ?? coverageRev.status ?? asRecord(modeled.arpu).coverage ?? null,
    confidence: asRecord(rpc.arpuModel).confidence ?? asRecord(modeled.arpu).confidence ?? null,
    independence: arpuModel.independenceState ?? sampleQuality.independenceState ?? null,
    sourceQuality: arpuModel.sourceQuality ?? null,
    pricingBands,
  },
  managedToolingSetup: {
    managed: managedRange,
    addOn: addOnRange,
    setup: setupRange,
    setupCoverage: coverageRev.setupEvidenceStatus ?? null,
  },
  cac: {
    actual: nested(bench, ["observed", "cac"]) ?? "UNKNOWN",
    ...cacRange,
    coverage: asRecord(modeled.cac).coverage ?? benchCoverage.cac ?? null,
    confidence: asRecord(modeled.cac).confidence ?? null,
    independence: sampleQuality.independenceState ?? nested(bench, ["channelCac", "independentSourceCount"]) ?? null,
    componentModel: componentCac.used === true ? componentCac : { used: componentCac.used ?? false, formula: componentCac.formula ?? null },
    accepted: cacObs.map((item) => ({ claim: item.claim, range: item.range, sourceClass: item.sourceClass, relevance: item.relevance })),
    bands: countBands(cacObs),
    channel: bench.channelCac ?? null,
  },
  retention: {
    accepted: retObs.map((item) => ({
      claim: item.claim,
      dimension: item.dimension,
      churnKind: item.churnKind,
      range: item.range,
      sourceClass: item.sourceClass,
    })),
    lifetime: lifetimeRange,
    coverage: asRecord(modeled.lifetimeMonths).coverage ?? benchCoverage.retention ?? null,
    confidence: asRecord(modeled.lifetimeMonths).confidence ?? null,
    formula: asRecord(modeled.lifetimeMonths).calculation ?? null,
    bands: countBands(retObs),
  },
  margin: {
    accepted: marginObs.map((item) => ({ claim: item.claim, range: item.range, marginRole: item.marginRole, relevance: item.relevance, usableForModel: item.usableForModel })),
    rejected: rejectedMargin.map((item) => ({ claim: item.claim, rejectedReason: item.rejectedReason, marginRole: item.marginRole })),
    unused: unusedMargin,
    ...marginRange,
    coverage: asRecord(modeled.grossMargin).coverage ?? benchCoverage.grossMargin ?? null,
    confidence: asRecord(modeled.grossMargin).confidence ?? null,
    calculation: asRecord(modeled.grossMargin).calculation ?? null,
    contribution: rangeOf(asRecord(modeled.contributionMargin).range ?? modeled.contributionMargin),
    bands: countBands(marginObs),
  },
  ltv: {
    ...ltvRange,
    coverage: asRecord(modeled.ltv).coverage ?? benchCoverage.ltv ?? null,
    confidence: asRecord(modeled.ltv).confidence ?? null,
    calculation: asRecord(modeled.ltv).calculation ?? null,
    blocker: ltvBlocker,
  },
  ltvCac: bench.ltvCacScenarios ?? rangeOf(asRecord(modeled.ltvCac).range ?? modeled.ltvCac),
  ltvCacConfidence: asRecord(modeled.ltvCac).confidence ?? null,
  payback: bench.paybackScenarios ?? rangeOf(asRecord(modeled.payback).range ?? modeled.payback),
  paybackConfidence: asRecord(modeled.payback).confidence ?? null,
  money: money
    ? {
        summary: money.summary,
        actual: money.actualEconomics,
        modeled: money.modeledEconomics,
        cacDetail: money.cacDetail,
        ltvDetail: money.ltvDetail,
        ltvCacDetail: money.ltvCacDetail,
        paybackDetail: money.paybackDetail,
        unit: money.unitEconomics,
        presentation: {
          recommendedCluster: money.presentation.recommendedCluster,
          coreArpuRange: money.presentation.coreArpuRange,
          managedArpuRange: money.presentation.managedArpuRange,
          addOnArpuRange: money.presentation.addOnArpuRange,
          setupRange: money.presentation.setupRange,
          cacEstimate: money.presentation.cacEstimate,
          retentionEvidence: money.presentation.retentionEvidence,
          margin: money.presentation.margin,
          marginExplanation: money.presentation.marginExplanation,
          ltv: money.presentation.ltv,
          ltvBlocker: money.presentation.ltvBlocker,
          ltvCac: money.presentation.ltvCac,
          payback: money.presentation.payback,
          evidenceStrength: money.presentation.evidenceStrength,
          sourceIndependence: money.presentation.sourceIndependence,
        },
      }
    : null,
  sources: {
    count: sources.length,
    publisherTitleCount,
    opaqueOnly,
    pricing: pricingBands,
    cac: countBands(cacObs),
    retention: countBands(retObs),
    margin: countBands(marginObs),
    sampleQuality,
  },
  fixtureHits,
  classification,
  attempt10Safety: {
    nextAttempt,
    historyLen,
    duplicateHistory,
    mixedCandidates,
    terminal,
    artBayContamination: artBayContam,
    v10AlreadyExists: Boolean(runV10),
    treasuryLedgerHead: treasuryLedgerHead ?? null,
  },
};

const safe =
  report.lineage.infinityCms &&
  report.lineage.canonicalCandidate &&
  !artBayContam &&
  terminal &&
  nextAttempt === 10 &&
  !duplicateHistory &&
  !runV10 &&
  currentResearchRunId === EXPECTED_RUN;

console.log(
  [
    "ATTEMPT 9 FORENSIC INSPECTION",
    `History length: ${historyLen}`,
    `Current researchRunId: ${currentResearchRunId}`,
    `Run status: ${run?.status ?? "MISSING"}`,
    `Live: ${live}`,
    `Quality replacement: ${report.qualityReplacement.triggered}`,
    `Phases: ${report.phases.sequence.join(" → ") || "none"}`,
    `Classification: ${classification}`,
    `SAFE_FOR_FUTURE_ATTEMPT_10: ${safe ? "YES" : "NO"}`,
  ].join("\n"),
);
console.log(JSON.stringify(report, null, 2));
process.exit(0);
