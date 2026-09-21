import { readFileSync, writeFileSync } from "node:fs";
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
if (!process.env.RESEARCH_MAX_ESTIMATED_COST_USD) {
  process.env.RESEARCH_MAX_ESTIMATED_COST_USD = "8";
}

const CMS_ID = "69d45f14-ca07-4a30-b601-54af6d05953f";
const CMS_CANDIDATE = "091f50e7-feb7-4dae-aba7-0e478a736ba4";
const ART_BAY = "50f883a9-08e9-4315-9d19-49917382d77f";
const ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const EXPECTED_ATTEMPT = 8;

const mode = process.argv[2] ?? "snapshot";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function scoresOf(row) {
  return row?.scores_json && typeof row.scores_json === "object" ? row.scores_json : {};
}

function band(cls) {
  if (!cls) return "LOW";
  if (/OFFICIAL_PRICING|OFFICIAL_PLAN|OFFICIAL_PRODUCT|PUBLIC_COMPANY|OFFICIAL_COMPANY|FINANCIAL_DISCLOSURE|CREDIBLE_BENCHMARK|RECOGNIZED_RESEARCH/i.test(cls)) {
    return "HIGH";
  }
  if (/PUBLIC_RATE|PUBLIC_PROPOSAL|MARKETPLACE|CUSTOMER_REPORT|REVIEW|AGENCY_WITH_METHODOLOGY|ACADEMIC/i.test(cls)) {
    return "MEDIUM";
  }
  return "LOW";
}

function countBands(items) {
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const item of items) counts[band(item)] += 1;
  return counts;
}

if (mode === "snapshot") {
  const { data, error } = await admin
    .from("founder_idea_submissions")
    .select("id,title,status,opportunity_candidate_id,infinity_decision,updated_at,scores_json")
    .eq("id", CMS_ID)
    .maybeSingle();
  if (error) {
    console.log(JSON.stringify({ ok: false, error: error.message }));
    process.exit(1);
  }
  const scores = scoresOf(data);
  const hist = Array.isArray(scores.evaluationHistory) ? scores.evaluationHistory.length : 0;
  const { data: artRow } = await admin
    .from("founder_idea_submissions")
    .select("id,title,updated_at")
    .eq("id", ART_BAY)
    .maybeSingle();
  console.log(
    JSON.stringify(
      {
        provider: process.env.RESEARCH_PROVIDER ?? null,
        model: process.env.GEMINI_RESEARCH_MODEL ?? process.env.GOOGLE_GEMINI_MODEL ?? null,
        enabled: process.env.RESEARCH_ENABLED ?? null,
        maxCost: process.env.RESEARCH_MAX_ESTIMATED_COST_USD ?? null,
        id: data?.id ?? null,
        title: data?.title ?? null,
        status: data?.status ?? null,
        candidate: data?.opportunity_candidate_id ?? null,
        researchRunId: scores.researchRunId ?? null,
        decision: data?.infinity_decision ?? null,
        historyLen: hist,
        derivedAttempt: hist + 1,
        expectedAttempt: EXPECTED_ATTEMPT,
        attemptOk: hist + 1 === EXPECTED_ATTEMPT,
        hasRevenueModel: Boolean(scores.revenueModel),
        hasBenchmark: Boolean(scores.benchmarkEconomics),
        hasExplain: Boolean(scores.explainability),
        revCoverage: scores.revenueModel?.coverage?.status ?? scores.revenueModel?.coverage ?? null,
        pricingEvidence: scores.revenueModel?.coverage?.pricingEvidenceStatus ?? scores.revenueModel?.coverage?.evidence?.monthlyPricingEvidence ?? null,
        benchOverall: scores.benchmarkEconomics?.coverage?.overall ?? null,
        artBay: artRow ? { id: artRow.id, title: artRow.title, updated: artRow.updated_at } : null,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (mode !== "run" && mode !== "report") {
  console.log(JSON.stringify({ ok: false, error: "unknown_mode" }));
  process.exit(1);
}

const { loadFounderIdeaStoreForOrg } = await import("../lib/infinity/founder-idea-lab/hq/load.ts");
const { reanalyzeFounderIdeaWithCanonicalResearch } = await import("../lib/infinity/founder-idea-lab/reanalyze.ts");
const { persistFounderIdea } = await import("../lib/infinity/founder-idea-lab/persist.ts");
const { derivedFounderReanalysisAttempt } = await import("../lib/infinity/founder-idea-lab/idempotency.ts");
const { runGroundedResearch } = await import("../lib/infinity/research/run.ts");
const { founderResearchPacketFromResult } = await import("../lib/infinity/founder-idea-lab/research-from-canonical.ts");
const { buildFounderIntelligenceView } = await import("../lib/infinity/founder-idea-lab/explainability/view.ts");
const { buildFounderMoneyView } = await import("../lib/infinity/founder-idea-lab/explainability/money-view.ts");
const { flattenExplainabilityForHq } = await import("../lib/infinity/founder-idea-lab/explainability/compose.ts");
const { researchRevenueModel } = await import("../lib/infinity/founder-idea-lab/revenue-model-research/from-evidence.ts");
const { extractMoneyObservations, taggedMoneyObservationsFromFindings, aggregateModeledArpu } = await import(
  "../lib/infinity/founder-idea-lab/revenue-model-research/extract.ts"
);
const { classifyPriceRole, qualifyPriceFinding } = await import("../lib/infinity/founder-idea-lab/revenue-model-research/price-role.ts");
const { canContributeToCorePricing } = await import("../lib/infinity/founder-idea-lab/revenue-model-research/numeric-contribution.ts");
const { assessPricingEvidenceQuality, collectQualifiedCorePrices } = await import(
  "../lib/infinity/founder-idea-lab/revenue-model-research/price-quality.ts"
);
const { researchBenchmarkEconomics } = await import("../lib/infinity/founder-idea-lab/benchmark-economics/from-evidence.ts");
const { extractBenchmarkObservations } = await import("../lib/infinity/founder-idea-lab/benchmark-economics/extract.ts");
const { evaluateRevenueGapFillEligibility } = await import("../lib/infinity/research/coverage/revenue-gap-fill.ts");
const { loadResearchCoveragePolicy } = await import("../lib/infinity/research/coverage/policy.ts");
const { sourceQualityHigh, sourceQualityScore } = await import("../lib/infinity/founder-idea-lab/benchmark-economics/quality.ts");

const ART_BAY_BEFORE_V8 = "2026-08-23T08:44:51.916+00:00";
const store = await loadFounderIdeaStoreForOrg(admin, ORG);
const submission = store.submissions.get(CMS_ID);
if (!submission) {
  console.log(JSON.stringify({ ok: false, error: "FOUNDER_IDEA_NOT_FOUND" }));
  process.exit(1);
}
if (submission.opportunityCandidateId !== CMS_CANDIDATE) {
  console.log(JSON.stringify({ ok: false, error: "CANDIDATE_MISMATCH", got: submission.opportunityCandidateId }));
  process.exit(1);
}

let attempt;
let result;
let persisted;
let beforeArt;
let afterArt;
let packet;
let grade;
let runRow = null;

if (mode === "run") {
  const { data: beforeArtRow } = await admin.from("founder_idea_submissions").select("updated_at").eq("id", ART_BAY).maybeSingle();
  beforeArt = beforeArtRow;
  attempt = derivedFounderReanalysisAttempt(store.evaluationHistory.get(CMS_ID)?.length ?? 0);
  if (attempt !== EXPECTED_ATTEMPT) {
    console.log(JSON.stringify({ ok: false, error: "ATTEMPT_NOT_8", attempt, historyLen: store.evaluationHistory.get(CMS_ID)?.length ?? 0 }));
    process.exit(1);
  }

  result = await reanalyzeFounderIdeaWithCanonicalResearch(
    store,
    submission,
    (input) => {
      if (input.candidateId && input.candidateId !== CMS_CANDIDATE) {
        throw new Error(`REFUSING_NON_CMS_CANDIDATE:${input.candidateId}`);
      }
      if (input.idempotencyKey && input.idempotencyKey.includes(ART_BAY)) {
        throw new Error("REFUSING_ART_BAY_IDEMPOTENCY");
      }
      return runGroundedResearch(admin, input);
    },
    { analysisAttempt: attempt },
  );

  if (result.submission.id !== CMS_ID) {
    console.log(JSON.stringify({ ok: false, error: "SUBMISSION_MUTATION" }));
    process.exit(1);
  }

  persisted = await persistFounderIdea(
    admin,
    result.submission,
    result.grade,
    null,
    store.candidates.get(CMS_CANDIDATE) ?? null,
    store.evaluationHistory.get(CMS_ID) ?? [],
  );
  const { data: afterArtRow } = await admin.from("founder_idea_submissions").select("updated_at").eq("id", ART_BAY).maybeSingle();
  afterArt = afterArtRow;
  packet = store.researchPackets.get(CMS_ID) ?? null;
  grade = result.grade;
} else {
  const hist = store.evaluationHistory.get(CMS_ID)?.length ?? 0;
  if (hist !== EXPECTED_ATTEMPT) {
    console.log(JSON.stringify({ ok: false, error: "REPORT_EXPECTED_HISTORY_8", historyLen: hist }));
    process.exit(1);
  }
  attempt = EXPECTED_ATTEMPT;
  grade = store.grades.get(CMS_ID) ?? null;
  result = { submission, grade };
  persisted = { ok: true };
  const { data: artRow } = await admin.from("founder_idea_submissions").select("updated_at").eq("id", ART_BAY).maybeSingle();
  beforeArt = { updated_at: ART_BAY_BEFORE_V8 };
  afterArt = artRow;
}

const runId = result.submission.researchRunId ?? grade?.researchRunId ?? packet?.researchRunId ?? null;
if (runId) {
  const loaded = await admin
    .from("research_runs")
    .select("id,status,provider,model,estimated_cost,structured_result,idempotency_key")
    .eq("id", runId)
    .maybeSingle();
  runRow = loaded.data;
}
const structured = runRow?.structured_result && typeof runRow.structured_result === "object" ? runRow.structured_result : {};
if (!packet && structured.evidence) {
  packet = founderResearchPacketFromResult({ result: structured, submission });
  const seen = new Set((packet.findings ?? []).map((item) => item.claim));
  for (const item of structured.evidence ?? []) {
    if (!item?.claim || seen.has(item.claim)) continue;
    seen.add(item.claim);
    packet.findings.push({
      findingId: item.findingId ?? `extra-${seen.size}`,
      evidenceId: item.evidenceId ?? null,
      dimension: "monetization",
      claim: item.claim,
      polarity: "unknown",
      grounded: Boolean(item.grounded),
      confidence: item.confidence ?? null,
      sourceUrls: item.sourceUrls ?? [],
      limitations: item.limitations ?? [],
      verifiesFounderCompetitor: null,
    });
  }
}
const explain = grade?.explainability ?? null;
const view = explain ? buildFounderIntelligenceView(explain) : null;
const metadata = explain ? flattenExplainabilityForHq(explain) : {};
const money = view ? buildFounderMoneyView(view, metadata) : null;
const context = {
  title: submission.title,
  description: submission.description,
  targetCustomer: submission.targetCustomer,
  problem: submission.problem,
  proposedSolution: submission.proposedSolution,
  businessModelHypothesis: submission.businessModelHypothesis,
  pricingHypothesis: submission.pricingHypothesis,
};
const recomputedRevenue = packet ? researchRevenueModel({ packet, context }) : null;
const recomputedBench = packet ? researchBenchmarkEconomics({ packet, context, revenueModel: grade?.revenueModel ?? recomputedRevenue }) : null;
const revenue = grade?.revenueModel ?? recomputedRevenue;
const bench = grade?.benchmarkEconomics ?? recomputedBench;
const tagged = packet ? taggedMoneyObservationsFromFindings(packet.findings.map((item) => item.claim), context) : [];
const arpu = aggregateModeledArpu(tagged);
const priceQuality = packet ? assessPricingEvidenceQuality({ findings: packet.findings, context }) : null;
const phaseLog = structured.phaseLog ?? [];
const initialPhase = phaseLog.find((item) => item.phase === "initial");
const revenuePhase = phaseLog.find((item) => item.phase === "revenue_model_gap_fill");
const benchPhase = phaseLog.find((item) => item.phase === "benchmark_economics_gap_fill");
const preRevenueEvidence = (packet?.findings ?? []).slice(0, initialPhase?.findingsAfter ?? packet?.findings?.length ?? 0);
const preRevenueQuality = assessPricingEvidenceQuality({
  findings: (packet?.findings ?? []).filter((_, index) => index < (revenuePhase?.findingsBefore ?? preRevenueEvidence.length)),
  context,
});
const revenuePlanner = packet
  ? evaluateRevenueGapFillEligibility({
      materialCoverageSufficient: true,
      evidence: packet.findings.map((item) => ({ claim: item.claim, grounded: item.grounded, sourceUrls: item.sourceUrls })),
      sources: packet.sources,
      policy: loadResearchCoveragePolicy(),
      seed: { ideaTitle: submission.title, targetCustomer: submission.targetCustomer, competitorLeads: packet.competitorLeads },
      issuedQueries: [],
      revenueGapFillPhasesUsed: 0,
      recordedCostUsd: 0.01,
      estimatedGapFillCostUsd: 0.01,
    })
  : null;

const priceObservations = (packet?.findings ?? [])
  .map((finding) => {
    const extracted = extractMoneyObservations(finding.claim);
    if (!extracted.some((obs) => obs.unit === "USD" && (obs.amount != null || obs.amountLow != null || obs.amountHigh != null))) {
      return null;
    }
    const role = classifyPriceRole(finding.claim, context);
    const qualification = qualifyPriceFinding(finding.claim, context);
    const core = extracted.some((obs) => canContributeToCorePricing(obs, role));
    return {
      raw: finding.claim,
      role,
      extracted: extracted.map((item) => ({
        kind: item.kind,
        low: item.amountLow,
        high: item.amountHigh,
        amount: item.amount,
        boundKind: item.boundKind,
        upperOpen: item.upperOpen,
        cadence: item.cadence,
      })),
      comparable: finding.verifiesFounderCompetitor ?? null,
      sourceUrls: finding.sourceUrls,
      contributesToCore: core,
      accepted: qualification.acceptedForNumericPricing || qualification.acceptedForCorePrice || role === "SETUP_FEE" || role === "IMPLEMENTATION_FEE" || role === "MANAGED_SERVICE_RETAINER" || role === "TOOLING_PRICE" || role === "CATEGORY_PRICE_BENCHMARK",
      reason: qualification.reason,
      sourceClass: finding.sourceUrls?.[0] ? finding.sourceUrls[0] : null,
    };
  })
  .filter(Boolean);

const acceptedCore = priceObservations.filter((item) => item.contributesToCore);
const rejectedService = priceObservations.filter((item) => item.role === "MANAGED_SERVICE_RETAINER");
const rejectedTooling = priceObservations.filter((item) => item.role === "TOOLING_PRICE" || item.role === "ADD_ON_PRICE");
const setupObs = priceObservations.filter((item) => item.role === "SETUP_FEE" || item.role === "IMPLEMENTATION_FEE");

const fixtureHints = [
  "cmsMoneyResearchAfterPacket",
  "cmsBenchmarkEconomicsAfterPacket",
  "cmsLiveV6EconomicReplayPacket",
  "cmsLiveV7EconomicReplayPacket",
  "Northstar Sites",
  "LocalLaunch Web",
  "KeyBanc",
  "OpenView 2024 industry report lists managed website platform CAC",
  "Bessemer Cloud Index outlier",
];
const blob = JSON.stringify({
  claims: packet?.findings?.map((item) => item.claim) ?? [],
  summary: packet?.summary ?? "",
});
const fixtureHits = fixtureHints.filter((hint) => blob.includes(hint));
const sources = packet?.sources ?? [];
const publisherTitleCount = sources.filter((item) => Boolean(item.title || item.publisher)).length;
const opaqueRedirects = sources.filter((item) => /vertexaisearch\.cloud\.google\.com/i.test(item.url)).length;

const pricingClasses = acceptedCore.map((item) => (item.sourceUrls?.[0] ? "LOW" : "LOW"));
const cacObs = (bench?.qualified ?? []).filter((item) => item.dimension === "customer_acquisition_cost");
const retObs = (bench?.qualified ?? []).filter(
  (item) =>
    item.dimension === "monthly_churn" ||
    item.dimension === "annual_churn" ||
    item.dimension === "retention_rate" ||
    item.dimension === "customer_lifetime",
);
const marginObs = (bench?.qualified ?? []).filter((item) => item.dimension === "gross_margin");
const componentDims = new Set([
  "cost_per_click",
  "cost_per_lead",
  "visitor_to_lead_conversion",
  "lead_to_customer_conversion",
  "sales_close_rate",
  "sales_labor_cost",
]);
const componentObs = (bench?.qualified ?? []).filter((item) => componentDims.has(item.dimension));

const report = {
  ok: persisted.ok,
  persistError: persisted.error ?? null,
  attempt,
  idempotencyKey: `founder-idea-research:${CMS_ID}:${CMS_CANDIDATE}:v${attempt}`,
  submissionId: result.submission.id,
  candidateId: result.submission.opportunityCandidateId,
  researchRunId: runId,
  runStatus: runRow?.status ?? null,
  provider: runRow?.provider ?? structured.providerId ?? null,
  model: runRow?.model ?? structured.modelId ?? null,
  estimatedCost: runRow?.estimated_cost ?? structured.estimatedCostUsd ?? null,
  telemetry: structured.callTelemetry ?? null,
  stopReason: structured.stopReason ?? null,
  issuedQueries: structured.issuedQueries ?? [],
  phaseLog,
  status: result.submission.status,
  decision: result.submission.infinityDecision,
  buildReady: grade?.buildReady ?? false,
  artBayUnchanged: (beforeArt?.updated_at ?? null) === (afterArt?.updated_at ?? null),
  packetFailed: packet?.failed ?? null,
  packetSummary: packet?.summary ?? null,
  findingCount: packet?.findings?.length ?? 0,
  sourceCount: sources.length,
  sources: sources.map((item) => ({
    url: item.url,
    title: item.title ?? null,
    publisher: item.publisher ?? null,
    domain: item.domain ?? null,
  })),
  publisherTitleCount,
  opaqueRedirects,
  preRevenueQuality,
  finalPriceQuality: priceQuality,
  revenuePlannerEligibleAfter: revenuePlanner?.eligible ?? null,
  revenuePlannerReason: revenuePlanner?.reason ?? null,
  revenueCoverage: revenue?.coverage ?? null,
  recommendedModel: revenue?.recommended?.recommendedModel ?? null,
  arpu,
  monthly: revenue?.revenuePerCustomer?.monthlyRecurring ?? null,
  coreArpu: revenue?.revenuePerCustomer?.coreRecurringARPU ?? arpu.core,
  managedArpu: revenue?.revenuePerCustomer?.managedServiceARPU ?? arpu.managedService,
  addOnArpu: revenue?.revenuePerCustomer?.addOnARPU ?? arpu.addOn,
  totalMonthly: revenue?.revenuePerCustomer?.totalModeledMonthlyRevenuePerCustomer ?? arpu.total,
  setup: revenue?.revenuePerCustomer?.firstYearSetup ?? revenue?.architecture?.setup ?? null,
  streams: (revenue?.streams ?? []).map((item) => item.name),
  directAnswer: revenue?.directAnswer ?? null,
  comparables: (revenue?.comparables ?? []).map((row) => ({
    name: row.name,
    strategic: row.strategicComparable,
    revenueModel: row.revenueModelComparable,
    economic: row.economicComparable,
    pricing: row.monthlyPrice,
    setup: row.setupFee,
    addOns: row.addOns,
    numeric: row.numericPricingContribution,
    priceRole: row.priceRole,
    founderRole: row.founderComparableRole,
    sourceClass: row.sourceClass,
    confidence: row.sourceConfidence,
    why: row.whyRelevant,
  })),
  priceObservations,
  acceptedCore,
  rejectedService,
  rejectedTooling,
  setupObs,
  benchCoverage: bench?.coverage ?? null,
  observed: bench?.observed ?? null,
  modeledCac: bench?.modeled?.cac ?? null,
  channelCac: bench?.channelCac ?? null,
  cacPresentation: bench?.cacPresentation ?? null,
  modeledLtv: bench?.modeled?.ltv ?? null,
  ltvCac: bench?.ltvCacScenarios ?? null,
  payback: bench?.paybackScenarios ?? null,
  paybackModeled: bench?.modeled?.payback ?? null,
  margin: bench?.modeled?.grossMargin ?? null,
  unusedMargin: bench?.unusedMarginEvidence ?? null,
  lifetime: bench?.modeled?.lifetimeMonths ?? null,
  attractiveness: bench?.attractiveness ?? null,
  attractivenessWhy: bench?.attractivenessWhy ?? null,
  nextToProve: bench?.nextToProve ?? null,
  sampleQuality: bench?.sampleQuality ?? null,
  overallEconomicConfidence: bench?.overallEconomicConfidence ?? null,
  observations: extractBenchmarkObservations(packet?.findings ?? []).map((item) => ({
    dimension: item.dimension,
    range: item.range,
    claim: item.claim,
    sourceUrl: item.sourceUrl,
    sourceClass: item.sourceClass,
    companyName: item.companyName,
    channel: item.channel,
    churnKind: item.churnKind,
    marginStage: item.marginStage ?? null,
    usableForModel: item.usableForModel ?? null,
  })),
  qualified: (bench?.qualified ?? []).map((item) => ({
    dimension: item.dimension,
    range: item.range,
    relevance: item.relevance,
    score: item.relevanceScore,
    rejectedReason: item.rejectedReason,
    sourceUrl: item.sourceUrl,
    sourceClass: item.sourceClass,
    companyName: item.companyName,
    channel: item.channel,
    churnKind: item.churnKind,
    claim: item.claim,
    marginStage: item.marginStage ?? null,
    usableForModel: item.usableForModel ?? null,
  })),
  sourceQuality: (() => {
    const countBench = (items) => {
      const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
      for (const item of items) {
        const cls = item.sourceClass;
        if (sourceQualityHigh(cls)) counts.HIGH += 1;
        else if (sourceQualityScore(cls) >= 0.7) counts.MEDIUM += 1;
        else counts.LOW += 1;
      }
      return counts;
    };
    const corePrices = packet ? collectQualifiedCorePrices({ findings: packet.findings, context }) : [];
    const pricing = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const item of corePrices) pricing[item.quality] += 1;
    const accepted = (items) => items.filter((item) => item.relevance !== "REJECTED");
    return {
      pricing,
      cac: countBench(accepted(cacObs)),
      retention: countBench(accepted(retObs)),
      margin: countBench(accepted(marginObs)),
    };
  })(),
  cacDirectCount: cacObs.filter((item) => item.relevance !== "REJECTED").length,
  componentCount: componentObs.filter((item) => item.relevance !== "REJECTED").length,
  componentCac: bench?.componentCac ?? null,
  retentionFormula: bench?.modeled?.lifetimeMonths?.calculation ?? null,
  ltvFormula: bench?.modeled?.ltv?.calculation ?? null,
  paybackFormula: bench?.modeled?.payback?.calculation ?? null,
  moneyRevenuePerCustomer: money?.revenuePerCustomer ?? null,
  moneySummary: money?.summary ?? null,
  moneyActual: money?.actualEconomics ?? null,
  moneyModeled: money?.modeledEconomics ?? null,
  moneyPresentation: money?.presentation ?? null,
  moneyPricing: money?.pricing ?? null,
  moneyCac: money?.cacDetail ?? null,
  moneyLtv: money?.ltvDetail ?? null,
  moneyLtvCac: money?.ltvCacDetail ?? null,
  moneyPayback: money?.paybackDetail ?? null,
  moneyUnit: money?.unitEconomics ?? null,
  moneyComparables: money?.comparables ?? null,
  fixtureHits,
  hasRevenuePersisted: Boolean(grade?.revenueModel),
  hasBenchmarkPersisted: Boolean(grade?.benchmarkEconomics),
  hasExplainPersisted: Boolean(grade?.explainability),
  historyLenAfter: (store.evaluationHistory.get(CMS_ID) ?? []).length,
  initialPhase: Boolean(initialPhase),
  revenuePhase: Boolean(revenuePhase),
  benchPhase: Boolean(benchPhase),
};

writeFileSync(join(root, "tmp-v8-live-report.json"), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      ok: report.ok,
      attempt,
      researchRunId: runId,
      persistError: report.persistError,
      phaseLog: report.phaseLog,
      stopReason: report.stopReason,
      fixtureHits,
      buildReady: report.buildReady,
      artBayUnchanged: report.artBayUnchanged,
    },
    null,
    2,
  ),
);
