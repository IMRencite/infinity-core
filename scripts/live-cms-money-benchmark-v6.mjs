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
if (!process.env.RESEARCH_MAX_ESTIMATED_COST_USD) {
  process.env.RESEARCH_MAX_ESTIMATED_COST_USD = "8";
}

const CMS_ID = "69d45f14-ca07-4a30-b601-54af6d05953f";
const CMS_CANDIDATE = "091f50e7-feb7-4dae-aba7-0e478a736ba4";
const ART_BAY = "50f883a9-08e9-4315-9d19-49917382d77f";
const ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

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
        researchRunId: scores.researchRunId ?? null,
        decision: data?.infinity_decision ?? null,
        historyLen: hist,
        hasRevenueModel: Boolean(scores.revenueModel),
        hasBenchmark: Boolean(scores.benchmarkEconomics),
        hasExplain: Boolean(scores.explainability),
        revCoverage: scores.revenueModel?.coverage?.status ?? scores.revenueModel?.coverage ?? null,
        benchCac: scores.benchmarkEconomics?.coverage?.cac ?? null,
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
const { buildFounderFriendlyBrief } = await import("../lib/infinity/founder-idea-lab/explainability/founder-brief.ts");
const { buildFounderIntelligenceView } = await import("../lib/infinity/founder-idea-lab/explainability/view.ts");
const { founderFriendlyPrimarySections, primarySectionBlob } = await import(
  "../lib/infinity/founder-idea-lab/hq/founder-intelligence-primary.ts"
);
const { flattenExplainabilityForHq } = await import("../lib/infinity/founder-idea-lab/explainability/compose.ts");
const { researchRevenueModel } = await import("../lib/infinity/founder-idea-lab/revenue-model-research/from-evidence.ts");
const { researchBenchmarkEconomics } = await import(
  "../lib/infinity/founder-idea-lab/benchmark-economics/from-evidence.ts"
);
const { extractBenchmarkObservations } = await import("../lib/infinity/founder-idea-lab/benchmark-economics/extract.ts");

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
if (store.submissions.get(ART_BAY)) {
  // loaded for org, but we must not persist it
}

const attempt = derivedFounderReanalysisAttempt(store.evaluationHistory.get(CMS_ID)?.length ?? 0);
const result = await reanalyzeFounderIdeaWithCanonicalResearch(
  store,
  submission,
  (input) => {
    if (input.candidateId && input.candidateId !== CMS_CANDIDATE) {
      throw new Error(`REFUSING_NON_CMS_CANDIDATE:${input.candidateId}`);
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
const brief = view ? buildFounderFriendlyBrief(view, metadata) : null;
const primary = view ? founderFriendlyPrimarySections(view, metadata) : [];
const market = primary.find((section) => section.id === "what-the-market-says");
const money = primary.find((section) => section.id === "how-this-could-make-money");
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
const observations = packet ? extractBenchmarkObservations(packet.findings) : [];
const fixtureHints = [
  "cmsMoneyResearchAfterPacket",
  "cmsBenchmarkEconomicsAfterPacket",
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

console.log(
  JSON.stringify(
    {
      ok: persisted.ok,
      persistError: persisted.error ?? null,
      attempt,
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
      sourceCount: packet?.sources?.length ?? 0,
      sourceDomains: [...new Set((packet?.sources ?? []).map((item) => item.domain).filter(Boolean))],
      opaqueRedirects: (packet?.sources ?? []).filter((item) => /vertexaisearch\.cloud\.google\.com/i.test(item.url)).length,
      publisherSources: (packet?.sources ?? []).filter((item) => item.domain && !/vertexaisearch\.cloud\.google\.com/i.test(item.domain)).length,
      revenueCoverage: revenue?.coverage?.status ?? null,
      recommendedModel: revenue?.recommended?.recommendedModel ?? null,
      monthly: revenue?.revenuePerCustomer?.monthlyRecurring ?? null,
      setup: revenue?.architecture?.setup ?? null,
      streams: (revenue?.streams ?? []).map((item) => item.name),
      benchCoverage: bench?.coverage ?? null,
      observed: bench?.observed ?? null,
      modeledCac: bench?.modeled?.cac ?? null,
      modeledLtv: bench?.modeled?.ltv ?? null,
      ltvCac: bench?.ltvCacScenarios ?? null,
      payback: bench?.paybackScenarios ?? null,
      margin: bench?.modeled?.grossMargin ?? null,
      attractiveness: bench?.attractiveness ?? null,
      observations: observations.map((item) => ({
        dimension: item.dimension,
        range: item.range,
        claim: item.claim,
        sourceUrl: item.sourceUrl,
        sourceClass: item.sourceClass,
        companyName: item.companyName,
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
        claim: item.claim,
      })),
      comparables: (view?.comparables ?? []).map((item) => ({
        name: item.name,
        role: item.role,
        pricing: item.pricingEvidence,
        economic: item.economicEvidence,
      })),
      marketRows: market?.rows ?? [],
      moneyRows: money?.rows ?? [],
      marketBlob: market ? primarySectionBlob([market]) : null,
      moneyBlob: money ? primarySectionBlob([money]) : null,
      briefMarket: brief?.market ?? null,
      briefMoney: brief?.money ?? null,
      fixtureHits,
      hasRevenuePersisted: Boolean(grade?.revenueModel),
      hasBenchmarkPersisted: Boolean(grade?.benchmarkEconomics),
      hasExplainPersisted: Boolean(grade?.explainability),
    },
    null,
    2,
  ),
);
