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
const EXPECTED_ATTEMPT = 7;

const mode = process.argv[2] ?? "snapshot";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function scoresOf(row) {
  return row?.scores_json && typeof row.scores_json === "object" ? row.scores_json : {};
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
        researchRunId: data?.research_run_id ?? scores.researchRunId ?? null,
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

if (mode !== "run") {
  console.log(JSON.stringify({ ok: false, error: "unknown_mode" }));
  process.exit(1);
}

const { loadFounderIdeaStoreForOrg } = await import("../lib/infinity/founder-idea-lab/hq/load.ts");
const { reanalyzeFounderIdeaWithCanonicalResearch } = await import(
  "../lib/infinity/founder-idea-lab/reanalyze.ts"
);
const { persistFounderIdea } = await import("../lib/infinity/founder-idea-lab/persist.ts");
const { derivedFounderReanalysisAttempt } = await import("../lib/infinity/founder-idea-lab/idempotency.ts");
const { runGroundedResearch } = await import("../lib/infinity/research/run.ts");
const { buildFounderIntelligenceView } = await import("../lib/infinity/founder-idea-lab/explainability/view.ts");
const { buildFounderMoneyView } = await import("../lib/infinity/founder-idea-lab/explainability/money-view.ts");
const { flattenExplainabilityForHq } = await import("../lib/infinity/founder-idea-lab/explainability/compose.ts");
const { researchRevenueModel } = await import("../lib/infinity/founder-idea-lab/revenue-model-research/from-evidence.ts");
const { extractMoneyObservations } = await import("../lib/infinity/founder-idea-lab/revenue-model-research/extract.ts");
const { classifyPriceRole, qualifyPriceFinding } = await import(
  "../lib/infinity/founder-idea-lab/revenue-model-research/price-role.ts"
);
const { researchBenchmarkEconomics } = await import(
  "../lib/infinity/founder-idea-lab/benchmark-economics/from-evidence.ts"
);
const { extractBenchmarkObservations } = await import("../lib/infinity/founder-idea-lab/benchmark-economics/extract.ts");
const { founderLowConfidenceCacCopy } = await import(
  "../lib/infinity/founder-idea-lab/benchmark-economics/founder-copy.ts"
);

const { data: beforeArt } = await admin.from("founder_idea_submissions").select("updated_at").eq("id", ART_BAY).maybeSingle();
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

const attempt = derivedFounderReanalysisAttempt(store.evaluationHistory.get(CMS_ID)?.length ?? 0);
if (attempt !== EXPECTED_ATTEMPT) {
  console.log(JSON.stringify({ ok: false, error: "ATTEMPT_NOT_7", attempt, historyLen: store.evaluationHistory.get(CMS_ID)?.length ?? 0 }));
  process.exit(1);
}

const result = await reanalyzeFounderIdeaWithCanonicalResearch(
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

const persisted = await persistFounderIdea(
  admin,
  result.submission,
  result.grade,
  null,
  store.candidates.get(CMS_CANDIDATE) ?? null,
  store.evaluationHistory.get(CMS_ID) ?? [],
);

const { data: afterArt } = await admin.from("founder_idea_submissions").select("updated_at").eq("id", ART_BAY).maybeSingle();
const packet = store.researchPackets.get(CMS_ID) ?? null;
const grade = result.grade;
const runId = result.submission.researchRunId ?? grade?.researchRunId ?? packet?.researchRunId ?? null;
let runRow = null;
if (runId) {
  const loaded = await admin
    .from("research_runs")
    .select("id,status,provider,model,estimated_cost,structured_result")
    .eq("id", runId)
    .maybeSingle();
  runRow = loaded.data;
}
const structured = runRow?.structured_result && typeof runRow.structured_result === "object" ? runRow.structured_result : {};
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
const revenue = packet ? researchRevenueModel({ packet, context }) : null;
const bench = packet ? researchBenchmarkEconomics({ packet, context, revenueModel: revenue }) : null;
const priceFindings = (packet?.findings ?? []).filter((item) =>
  extractMoneyObservations(item.claim).some((obs) => obs.unit === "USD" && (obs.amount != null || obs.amountLow != null || obs.amountHigh != null)),
);
const priceObservations = priceFindings.map((finding) => {
  const extracted = extractMoneyObservations(finding.claim);
  const role = classifyPriceRole(finding.claim, context);
  const qualification = qualifyPriceFinding(finding.claim, context);
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
      upperAnchor: item.upperAnchor,
      cadence: item.cadence,
    })),
    comparable: finding.verifiesFounderCompetitor ?? null,
    sourceUrls: finding.sourceUrls,
    accepted: qualification.acceptedForNumericPricing || qualification.acceptedForCorePrice || role === "SETUP_FEE" || role === "IMPLEMENTATION_FEE" || role === "MANAGED_SERVICE_RETAINER" || role === "TOOLING_PRICE" || role === "CATEGORY_PRICE_BENCHMARK",
    reason: qualification.reason,
  };
});
const fixtureHints = [
  "cmsMoneyResearchAfterPacket",
  "cmsBenchmarkEconomicsAfterPacket",
  "cmsLiveV6EconomicReplayPacket",
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
const cacAmount = bench?.channelCac?.organic ?? bench?.modeled?.cac?.range?.base ?? bench?.modeled?.cac?.range?.low ?? null;

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
  phaseLog: structured.phaseLog ?? [],
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
  revenueCoverage: revenue?.coverage ?? null,
  recommendedModel: revenue?.recommended?.recommendedModel ?? null,
  arpu: revenue?.revenuePerCustomer?.arpuModel ?? null,
  monthly: revenue?.revenuePerCustomer?.monthlyRecurring ?? null,
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
    sourceClass: row.sourceClass,
    confidence: row.sourceConfidence,
    why: row.whyRelevant,
  })),
  priceObservations,
  benchCoverage: bench?.coverage ?? null,
  observed: bench?.observed ?? null,
  modeledCac: bench?.modeled?.cac ?? null,
  channelCac: bench?.channelCac ?? null,
  modeledLtv: bench?.modeled?.ltv ?? null,
  ltvCac: bench?.ltvCacScenarios ?? null,
  payback: bench?.paybackScenarios ?? null,
  paybackModeled: bench?.modeled?.payback ?? null,
  margin: bench?.modeled?.grossMargin ?? null,
  lifetime: bench?.modeled?.lifetimeMonths ?? null,
  attractiveness: bench?.attractiveness ?? null,
  attractivenessWhy: bench?.attractivenessWhy ?? null,
  nextToProve: bench?.nextToProve ?? null,
  sampleQuality: bench?.sampleQuality ?? null,
  observations: extractBenchmarkObservations(packet?.findings ?? []).map((item) => ({
    dimension: item.dimension,
    range: item.range,
    claim: item.claim,
    sourceUrl: item.sourceUrl,
    sourceClass: item.sourceClass,
    companyName: item.companyName,
    channel: item.channel,
    churnKind: item.churnKind,
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
  })),
  moneySummary: money?.summary ?? null,
  moneyActual: money?.actualEconomics ?? null,
  moneyModeled: money?.modeledEconomics ?? null,
  moneyPresentation: money?.presentation ?? null,
  moneyPricing: money?.pricing ?? null,
  moneyCac: money?.cacDetail ?? null,
  moneyLtv: money?.ltvDetail ?? null,
  moneyLtvCac: money?.ltvCacDetail ?? null,
  moneyPayback: money?.paybackDetail ?? null,
  moneyComparables: money?.comparables ?? null,
  lowConfidenceCacCopy: cacAmount != null ? founderLowConfidenceCacCopy(cacAmount) : null,
  fixtureHits,
  hasRevenuePersisted: Boolean(grade?.revenueModel),
  hasBenchmarkPersisted: Boolean(grade?.benchmarkEconomics),
  hasExplainPersisted: Boolean(grade?.explainability),
  historyLenAfter: (store.evaluationHistory.get(CMS_ID) ?? []).length,
};

writeFileSync(join(root, "tmp-v7-live-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, attempt, researchRunId: runId, persistError: report.persistError, phaseLog: report.phaseLog, stopReason: report.stopReason, fixtureHits, buildReady: report.buildReady, artBayUnchanged: report.artBayUnchanged }, null, 2));
