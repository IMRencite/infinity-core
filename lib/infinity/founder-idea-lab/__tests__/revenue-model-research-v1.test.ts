import { describe, expect, it } from "vitest";
import { FounderIdeaStore } from "../store";
import { submitFounderIdea } from "../submit";
import { convertFounderIdeaToCandidate } from "../convert";
import { analyzeFounderIdea } from "../analyze";
import { routeFounderBuild } from "../build-route";
import { assertFounderSpendStillTreasuryGated } from "../treasury-gate";
import { evaluateBuildReadiness } from "../readiness";
import { unitEconomicsNumericallyKnown } from "../economics-known";
import { monetizeFromResearchPacket } from "../monetization-from-research";
import { composeFounderExplainability } from "../explainability/compose";
import { modelComparableEconomics } from "../comparable-economics/from-evidence";
import { researchRevenueModel } from "../revenue-model-research/from-evidence";
import { extractMoneyObservations, isVagueNonNumericLanguage } from "../revenue-model-research/extract";
import { comparableFollowUpQueries, planRevenueModelFollowUpQueries } from "../revenue-model-research/queries";
import { qualifyRevenueModelComparables } from "../revenue-model-research/qualify";
import { REVENUE_MODEL_COVERAGE_DIMENSIONS, REVENUE_MODEL_TYPES } from "../revenue-model-research/types";
import { classifySourceClass } from "../revenue-model-research/extract";
import { cmsMoneyResearchAfterPacket, infinityCmsLiveV5ReplayPacket } from "../integrity-fixtures";
import { founderIdeaIntelligenceSections } from "../hq/intelligence-sections";
import { buildFounderIdeaArtifacts } from "../hq/artifacts";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import { createGovernedStore, ORG_A } from "@/lib/infinity/treasury/__tests__/fixtures";
import {
  evaluateGapFillEligibility,
  evaluateRevenueGapFillEligibility,
  loadResearchCoveragePolicy,
  runCoverageDirectedPhases,
  buildResearchCoveragePlan,
  assessGroundedResearchCoverage,
} from "@/lib/infinity/research/coverage";
import { normalizeGroundedResearch } from "@/lib/infinity/research/normalization/evidence";
import type { ProviderResearchStructuredOutput, ResearchResult } from "@/lib/infinity/research/types";
import type { FounderIdeaSubmissionInput } from "../types";

const USER_A = "user-a";
const REDIRECTS = Array.from(
  { length: 12 },
  (_, index) => `https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-rev-${index + 1}`,
);

function input(overrides: Partial<FounderIdeaSubmissionInput> = {}): FounderIdeaSubmissionInput {
  return {
    organizationId: ORG_A,
    submittedByUserId: USER_A,
    title: "Infinity CMS",
    description: "Build a cms for businesses that they would fill out a knowledge base when they sign up",
    targetCustomer: "SMB owners",
    problem: "Local businesses need rankable sites",
    proposedSolution: "AI CMS with SEO/AEO publishing",
    businessModelHypothesis: "Monthly website package plus setup",
    pricingHypothesis: "cost per month depending on your package",
    idempotencyKey: "revenue-model",
    ...overrides,
  };
}

function contextFrom(title = "Infinity CMS") {
  return {
    title,
    description: "SMB website CMS",
    targetCustomer: "SMB owners",
    problem: "need websites",
    proposedSolution: "managed CMS with SEO",
    businessModelHypothesis: "monthly subscription plus setup",
    pricingHypothesis: null,
  };
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
    sourceUrls: [],
    limitations: [],
    ...overrides,
  };
}

function normalize(findings: ProviderResearchStructuredOutput["findings"], urls = REDIRECTS): ResearchResult {
  return normalizeGroundedResearch({
    researchRunId: "run-revenue",
    organizationId: "org-1",
    missionId: null,
    providerId: "gemini",
    modelId: "gemini-3.5-flash",
    researchObjective: "Infinity CMS",
    inputHash: "hash",
    structured: {
      schemaVersion: "grounded_research_v1",
      summary: "Coverage fixture.",
      findings,
      limitations: ["fixture"],
      requiresMoreResearch: true,
    },
    groundingMetadata: {
      webSearchQueries: ["cms"],
      groundingChunks: urls.map((uri) => ({ web: { uri } })),
    },
    tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    groundingUsage: {
      webSearchQueries: ["cms"],
      searchQueryCount: 1,
      groundingChunkCount: urls.length,
      groundingSupportCount: 0,
      groundingInvoked: true,
      searchCostKnown: false,
    },
    estimatedCostUsd: 0.01,
    costUncertainty: "fixture",
    latencyMs: 12,
    requestId: "req",
    retryMetadata: { attemptCount: 1, maxAttempts: 2, retried: false },
    rawProviderResponseStored: true,
  });
}

const MATERIAL_FINDINGS = [
  finding({ findingId: "demand-1", signalType: "search_demand", sourceUrls: [REDIRECTS[0]!] }),
  finding({ findingId: "market-1", signalType: "growing_market", sourceUrls: [REDIRECTS[1]!] }),
  finding({ findingId: "competition-1", signalType: "competitor_presence", claim: "Hibu sells SMB web packages.", sourceUrls: [REDIRECTS[2]!] }),
  finding({ findingId: "monetization-1", signalType: "monetization_precedent", claim: "CMS vendors charge monthly packages.", sourceUrls: [REDIRECTS[3]!] }),
];

describe("REVENUE_MODEL_RESEARCH_V1 extraction", () => {
  it("extracts monthly, annual, setup, per-user, per-seat, per-location, and commission without converting vague language", () => {
    const monthly = extractMoneyObservations("$299/month");
    expect(monthly[0]?.amount).toBe(299);
    expect(monthly[0]?.kind).toBe("MONTHLY_PRICE");
    expect(extractMoneyObservations("$299 per month")[0]?.monthlyRecurringEquivalent).toBe(299);
    expect(extractMoneyObservations("starts at $299")[0]?.amount).toBe(299);
    const range = extractMoneyObservations("$199-$499");
    expect(range[0]?.amountLow).toBe(199);
    expect(range[0]?.amountHigh).toBe(499);
    expect(extractMoneyObservations("$199 to $499")[0]?.amountLow).toBe(199);
    expect(extractMoneyObservations("$2,000 setup")[0]?.kind).toBe("SETUP_FEE");
    const annual = extractMoneyObservations("$3,600/year");
    expect(annual[0]?.kind).toBe("ANNUAL_PRICE");
    expect(annual[0]?.monthlyRecurringEquivalent).toBe(300);
    expect(extractMoneyObservations("$99/user/month")[0]?.kind).toBe("PER_USER");
    expect(extractMoneyObservations("$99/seat/month")[0]?.kind).toBe("PER_SEAT");
    expect(extractMoneyObservations("$250/location/month")[0]?.kind).toBe("PER_LOCATION");
    expect(extractMoneyObservations("10% commission")[0]?.kind).toBe("COMMISSION");
    expect(extractMoneyObservations("2% monthly churn")[0]?.kind).toBe("CHURN");
    expect(extractMoneyObservations("70% gross margin")[0]?.kind).toBe("GROSS_MARGIN");
    expect(isVagueNonNumericLanguage("hundreds per month")).toBe(true);
    expect(extractMoneyObservations("hundreds per month")[0]?.amount).toBeNull();
    expect(extractMoneyObservations("thousands per year")[0]?.vagueLanguage).toBe(true);
    expect(extractMoneyObservations("premium pricing")[0]?.kind).toBe("QUALITATIVE_ONLY");
    expect(extractMoneyObservations("high-ticket")[0]?.amount).toBeNull();
    expect(extractMoneyObservations("enterprise pricing")[0]?.amount).toBeNull();
    expect(extractMoneyObservations("enterprise pricing")[0]?.kind).toBe("QUALITATIVE_ONLY");
  });
});

describe("REVENUE_MODEL_RESEARCH_V1 coverage vs decision coverage", () => {
  it("keeps decision coverage PASS while revenue-model coverage is INSUFFICIENT on CMS v5", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "v5" }));
    convertFounderIdeaToCandidate(store, submission);
    const packet = infinityCmsLiveV5ReplayPacket(submission.id, submission.opportunityCandidateId!);
    const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
    const model = researchRevenueModel({ packet, context: contextFrom() });
    expect(grade?.coverage?.materialCoverageSufficient).toBe(true);
    expect(grade?.readyForDecision).toBe(true);
    expect(model.coverage.status).toBe("REVENUE_MODEL_INSUFFICIENT");
    expect(model.coverage.decisionCoverageIndependent).toBe(true);
    expect(REVENUE_MODEL_COVERAGE_DIMENSIONS.length).toBeGreaterThanOrEqual(16);
    expect(REVENUE_MODEL_COVERAGE_DIMENSIONS).toContain("monthly_subscription");
    expect(REVENUE_MODEL_COVERAGE_DIMENSIONS).toContain("per_user");
    expect(REVENUE_MODEL_COVERAGE_DIMENSIONS).toContain("marketplace_take_rate");
    expect(model.recommended.recommendedModel).toBe("UNKNOWN");
    expect(model.buildImplication.revenueModelResearchGrantsBuild).toBe(false);
    expect(grade?.buildReady).toBe(false);
  });
});

describe("REVENUE_MODEL_RESEARCH_V1 comparable roles", () => {
  it("treats Dealerspike name-only as strategic but not revenue-model or economic", () => {
    const packet = infinityCmsLiveV5ReplayPacket("s", "c");
    const rows = qualifyRevenueModelComparables({ packet, context: contextFrom() });
    const dealer = rows.find((row) => /dealerspike/i.test(row.name));
    const hibu = rows.find((row) => /hibu/i.test(row.name));
    expect(dealer?.strategicComparable).toBe(true);
    expect(dealer?.revenueModelComparable).toBe(false);
    expect(dealer?.revenueModelRole).toBe("NO");
    expect(dealer?.economicComparable).toBe(false);
    expect(dealer?.numericPricingContribution).toBe(false);
    expect(dealer?.revenueModelConfidence).toBe("NONE");
    expect(dealer?.economicConfidence).toBe("NONE");
    expect(hibu?.strategicComparable).toBe(true);
    expect(hibu?.revenueModelRole).toBe("PARTIAL");
    expect(hibu?.revenueModelComparable).toBe(true);
    expect(hibu?.economicComparable).toBe(false);
    expect(hibu?.numericPricingContribution).toBe(false);
    expect(hibu?.revenueModelConfidence).not.toBe("HIGH");
    expect(hibu?.economicConfidence).toBe("NONE");
  });
});

describe("REVENUE_MODEL_RESEARCH_V1 query planning", () => {
  it("plans bounded follow-ups from discovered names and adjacent queries without hardcoded companies", () => {
    const queries = comparableFollowUpQueries(["Acme Co"]);
    expect(queries).toContain("Acme Co pricing");
    expect(queries).toContain("Acme Co setup fee");
    expect(queries).toContain("Acme Co annual cost");
    expect(queries).toContain("Acme Co per location pricing");
    expect(queries).toContain("Acme Co add-ons");
    const planned = planRevenueModelFollowUpQueries({
      seed: { ideaTitle: "Infinity CMS", targetCustomer: "SMB owners", competitorLeads: ["Acme Co"] },
      discoveredCompanies: ["Acme Co"],
      issuedQueries: [],
      limit: 5,
      hardCap: 8,
      claims: ["Acme Co exists"],
    });
    expect(planned.length).toBeLessThanOrEqual(5);
    expect(planned.length).toBeGreaterThan(0);
    expect(planned.every((item) => /Acme Co|SMB owners|website as a service|managed website/i.test(item.query))).toBe(true);
    expect(classifySourceClass("https://vendor.example/pricing")).toBe("OFFICIAL_PRICING_PAGE");
    expect(classifySourceClass("https://vendor.example/plans")).toBe("OFFICIAL_PLAN_PAGE");
  });
});

describe("REVENUE_MODEL_RESEARCH_V1 bounded revenue gap-fill", () => {
  it("does not reuse material coverage stop reasons when decision coverage already passed", async () => {
    const policy = loadResearchCoveragePolicy({
      RESEARCH_COVERAGE_MAX_INITIAL_QUERIES: "8",
      RESEARCH_COVERAGE_MAX_GAP_FILL_QUERIES: "4",
      RESEARCH_REVENUE_MAX_GAP_FILL_QUERIES: "5",
    });
    expect(policy.maxRevenueGapFillPhases).toBe(1);
    expect(policy.maxRevenueGapFillQueries).toBe(5);
    expect(policy.maxRevenueGapFillQueryHardCap).toBe(8);
    const plan = buildResearchCoveragePlan({
      seed: { ideaTitle: "Infinity CMS", targetCustomer: "local businesses", competitorLeads: ["Hibu", "Dealerspike"] },
      policy,
    });
    const phases: string[] = [];
    const directed = await runCoverageDirectedPhases({
      plan,
      policy,
      seed: { ideaTitle: "Infinity CMS", targetCustomer: "local businesses", competitorLeads: ["Hibu", "Dealerspike"] },
      modelId: "gemini-3.5-flash",
      executePhase: async ({ phase, queries }) => {
        phases.push(phase);
        if (phase === "revenue_model_gap_fill") {
          expect(queries.length).toBeLessThanOrEqual(8);
          expect(queries.length).toBeGreaterThan(0);
          expect(queries.some((query) => /pricing|plans|setup|subscription/i.test(query.query))).toBe(true);
          return {
            result: normalize([
              ...MATERIAL_FINDINGS,
              finding({
                findingId: "price-1",
                signalType: "pricing_pain",
                claim: "Northstar Sites plans list $199-$399 per month.",
                sourceUrls: [REDIRECTS[4]!],
              }),
            ]),
            attemptCount: 1,
          };
        }
        return { result: normalize(MATERIAL_FINDINGS), attemptCount: 1 };
      },
    });
    expect(phases).toEqual(["initial", "revenue_model_gap_fill", "benchmark_economics_gap_fill", "quality_replacement"]);
    expect(directed.telemetry.gapFillCallCount).toBe(0);
    expect(directed.telemetry.revenueGapFillCallCount).toBe(1);
    expect(directed.telemetry.benchmarkGapFillCallCount).toBe(1);
    expect(directed.telemetry.qualityReplacementCallCount).toBe(1);
    expect(directed.stopReason).not.toBe("material_coverage_sufficient");
    expect([
      "REVENUE_MODEL_SUFFICIENT",
      "CORE_PRICING_SUFFICIENT_SETUP_REMAINS",
      "REVENUE_GAP_FILL_LIMIT",
      "BENCHMARK_ECONOMICS_SUFFICIENT",
      "BENCHMARK_GAP_FILL_LIMIT",
      "LOW_BENCHMARK_INFORMATION_VALUE",
      "NO_RESEARCHABLE_BENCHMARK_GAP",
      "QUALITY_REPLACEMENT_SUCCEEDED",
      "QUALITY_REPLACEMENT_EXHAUSTED",
      "QUALITY_REPLACEMENT_LIMIT",
      "LOW_QUALITY_REPLACEMENT_INFORMATION_VALUE",
    ]).toContain(directed.stopReason);
  });

  it("stops revenue gap-fill when budget is exhausted", () => {
    const decision = evaluateGapFillEligibility({
      assessment: assessGroundedResearchCoverage(normalize(MATERIAL_FINDINGS)),
      plan: buildResearchCoveragePlan({ seed: {}, policy: loadResearchCoveragePolicy() }),
      policy: loadResearchCoveragePolicy(),
      issuedQueries: [],
      gapFillPhasesUsed: 0,
      recordedCostUsd: 0.01,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(decision.eligible).toBe(false);
    const revenue = evaluateRevenueGapFillEligibility({
      materialCoverageSufficient: true,
      evidence: normalize(MATERIAL_FINDINGS).evidence,
      sources: normalize(MATERIAL_FINDINGS).sources,
      policy: { ...loadResearchCoveragePolicy(), maxEstimatedCostUsd: 0.02 },
      seed: { competitorLeads: ["Hibu"] },
      issuedQueries: [],
      revenueGapFillPhasesUsed: 0,
      recordedCostUsd: 0.05,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(revenue.eligible).toBe(false);
    expect(revenue.reason).toBe("REVENUE_RESEARCH_BUDGET_EXHAUSTED");
  });
});

describe("REVENUE_MODEL_RESEARCH_V1 CMS money-research after fixture", () => {
  it("improves coverage, generates a grounded model, and still cannot grant BUILD", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "after" }));
    convertFounderIdeaToCandidate(store, submission);
    const packet = cmsMoneyResearchAfterPacket(submission.id, submission.opportunityCandidateId!);
    const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
    const model = grade?.revenueModel ?? researchRevenueModel({ packet, context: contextFrom() });
    const economics = grade?.comparableEconomics ?? modelComparableEconomics({
      packet,
      context: contextFrom(),
      layers: packet.monetizationLayers,
      revenueModel: model,
    });
    expect(model.coverage.status).toBe("REVENUE_MODEL_SUFFICIENT");
    expect(["HYBRID_SOFTWARE_SERVICE", "SUBSCRIPTION_PLUS_SETUP"]).toContain(model.recommended.recommendedModel);
    expect(model.recommended.alternativeModels.length).toBeGreaterThan(0);
    expect(model.streams.some((item) => item.recurringOrOneTime === "RECURRING")).toBe(true);
    expect(model.streams.some((item) => item.type === "ONE_TIME_IMPLEMENTATION")).toBe(true);
    expect(model.streams.every((item) => item.id && item.name)).toBe(true);
    expect(model.architecture.base?.monthly.base ?? model.architecture.base?.monthly.low).not.toBeNull();
    expect(model.revenuePerCustomer.monthlyRecurring.base ?? model.revenuePerCustomer.monthlyRecurring.low).not.toBeNull();
    expect(model.revenuePerCustomer.annualRecurring.base ?? model.revenuePerCustomer.annualRecurring.low).not.toBeNull();
    expect(model.revenuePerCustomer.firstYearRecurring.base ?? model.revenuePerCustomer.firstYearRecurring.low).not.toBeNull();
    expect(model.revenuePerCustomer.firstYearSetup.base ?? model.revenuePerCustomer.firstYearSetup.low).not.toBeNull();
    const ten = model.customerCountScenarios.find((row) => row.customers === 10);
    expect(ten?.provenance).toBe("SCENARIO_MODEL");
    expect(ten?.mrr).not.toBeNull();
    expect(ten?.arr).toBe((ten?.mrr ?? 0) * 12);
    expect(model.customerCountScenarios.map((row) => row.customers)).toEqual([10, 25, 50, 100]);
    expect(model.directAnswer.billingStructure).not.toBe("");
    expect(model.explainability.whatCurrentPlatformsDo).toBeTruthy();
    expect(model.costTelemetry.costUnknown).toBe(true);
    expect(model.comparables.find((row) => /dealerspike/i.test(row.name))?.numericPricingContribution).toBe(false);
    expect(model.comparables.find((row) => /hibu/i.test(row.name))?.numericPricingContribution).toBe(false);
    expect(economics.pricing.recommendation?.monthly.low).not.toBeNull();
    expect(economics.buildImplication.modeledSatisfiesBuild).toBe(false);
    expect(grade?.buildReady).toBe(false);
    const monetization = monetizeFromResearchPacket({
      candidate: store.candidates.get(submission.opportunityCandidateId!)!,
      packet,
      revenueModel: model,
    });
    expect(unitEconomicsNumericallyKnown(monetization?.primaryPlan)).toBe(false);
    expect(monetization?.primaryPlan?.estimatedCAC).toBeNull();
    expect(monetization?.primaryPlan?.estimatedLTV).toBeNull();
    expect(monetization?.primaryPlan?.estimatedPriceBase).toBeNull();
    expect(monetization?.primaryPlan?.revenueStreams.length).toBeGreaterThan(0);
    expect(evaluateBuildReadiness({ decisionReady: true, evaluation: grade?.evaluation ?? null }).buildReady).toBe(false);
  });
});

describe("REVENUE_MODEL_RESEARCH_V1 explainability + UI", () => {
  it("surfaces how this should make money and remaining money gaps", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "ui" }));
    convertFounderIdeaToCandidate(store, submission);
    const packet = cmsMoneyResearchAfterPacket(submission.id, submission.opportunityCandidateId!);
    const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
    const explain = composeFounderExplainability({
      submission,
      grade: grade!,
      packet,
      layers: packet.monetizationLayers,
    });
    expect(explain.revenueModel?.directAnswer.question).toBe("How should this make money?");
    const artifacts = buildFounderIdeaArtifacts(store, ORG_A);
    const founder = artifacts.opportunity_lab?.find((item) => item.artifactType === "founder_idea");
    const inspector = buildArtifactInspectorModel(founder!, artifacts.opportunity_lab ?? []);
    const detail = buildEntityDetail(inspector);
    const titles = detail.intelligence.sections.map((section) => section.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        "How This Business Makes Money",
        "Recommended Revenue Model",
        "Revenue Streams",
        "Comparable Revenue Models",
        "Pricing & Packaging",
        "Revenue per Customer",
        "MRR / ARR Scenarios",
        "Upsell Opportunities",
        "Revenue Quality",
        "Money Research Still Needed",
      ]),
    );
    expect(detail.availableTabs).toEqual(
      expect.arrayContaining(["intelligence", "money", "overview"]),
    );
    expect(detail.money.sections.map((section) => section.title)).toEqual(
      expect.arrayContaining([
        "Money Summary",
        "How this business makes money",
        "Pricing & Packaging",
        "Revenue per customer",
      ]),
    );
    const sections = founderIdeaIntelligenceSections(founder!.metadata);
    expect(sections.some((section) => section.id === "how-this-makes-money")).toBe(true);
  });
});

describe("REVENUE_MODEL_RESEARCH_V1 decision/treasury/commercialization regressions", () => {
  it("does not block HOLD and does not open Treasury or commercialization", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "gate" }));
    convertFounderIdeaToCandidate(store, submission);
    const packet = cmsMoneyResearchAfterPacket(submission.id, submission.opportunityCandidateId!);
    const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
    expect(grade?.evaluation?.decision).toBe("HOLD");
    expect(grade?.readyForDecision).toBe(true);
    expect(grade?.buildReady).toBe(false);
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
    const { store: treasury } = createGovernedStore();
    const gate = assertFounderSpendStillTreasuryGated(treasury, submission);
    expect(gate.bypassed).toBe(false);
    expect(gate.authorized).toBe(false);
    expect(REVENUE_MODEL_TYPES).toContain("SUBSCRIPTION_SAAS");
    expect(REVENUE_MODEL_TYPES).toContain("HYBRID_SOFTWARE_SERVICE");
    expect(REVENUE_MODEL_TYPES).toContain("PER_USER");
    expect(REVENUE_MODEL_TYPES).toContain("PRODUCTIZED_SERVICE");
  });
});
