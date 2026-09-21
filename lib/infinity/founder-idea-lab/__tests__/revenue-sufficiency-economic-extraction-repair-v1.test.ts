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
import { extractMoneyObservations } from "../revenue-model-research/extract";
import { classifyPriceRole } from "../revenue-model-research/price-role";
import { researchRevenueModel } from "../revenue-model-research/from-evidence";
import { founderPricingCluesCopy } from "../revenue-model-research/founder-copy";
import { qualifyRevenueModelComparables } from "../revenue-model-research/qualify";
import { extractBenchmarkObservations, churnKindOf } from "../benchmark-economics/extract";
import { researchBenchmarkEconomics } from "../benchmark-economics/from-evidence";
import {
  monthlyChurnFromAnnualChurn,
  monthlyChurnFromAnnualRetention,
  modelRetention,
} from "../benchmark-economics/model-retention";
import { coverageFromAcceptedQuality } from "../benchmark-economics/confidence";
import { weakestConfidence } from "../benchmark-economics/confidence";
import { cacValidationTarget, founderLowConfidenceCacCopy } from "../benchmark-economics/founder-copy";
import { cmsLiveV6EconomicReplayPacket, cmsMoneyResearchAfterPacket } from "../integrity-fixtures";
import { createGovernedStore, ORG_A } from "@/lib/infinity/treasury/__tests__/fixtures";
import {
  assessRevenuePlannerCoverage,
  evaluateRevenueGapFillEligibility,
  assessBenchmarkPlannerCoverage,
  evaluateBenchmarkGapFillEligibility,
  loadResearchCoveragePolicy,
} from "@/lib/infinity/research/coverage";
import { normalizeGroundedResearch } from "@/lib/infinity/research/normalization/evidence";
import { buildFounderIntelligenceView } from "../explainability/view";
import { composeFounderExplainability } from "../explainability/compose";
import { buildFounderMoneyView } from "../explainability/money-view";
import { provenanceGrantsBuild } from "../comparable-economics/provenance";
import type { FounderIdeaSubmissionInput } from "../types";
import type { FounderResearchFinding } from "../research-packet";
import type { QualifiedBenchmark } from "../benchmark-economics/types";

const USER_A = "user-a";
const CMS_CONTEXT = {
  title: "Infinity CMS",
  description: "Build a cms for businesses that they would fill out a knowledge base when they sign up",
  targetCustomer: "SMB owners",
  problem: "Local businesses need rankable sites",
  proposedSolution: "AI CMS with SEO/AEO publishing",
  businessModelHypothesis: "Monthly website package plus setup",
  pricingHypothesis: "cost per month depending on your package",
};

function ideaInput(): FounderIdeaSubmissionInput {
  return {
    organizationId: ORG_A,
    submittedByUserId: USER_A,
    title: CMS_CONTEXT.title,
    description: CMS_CONTEXT.description,
    targetCustomer: CMS_CONTEXT.targetCustomer,
    problem: CMS_CONTEXT.problem,
    proposedSolution: CMS_CONTEXT.proposedSolution,
    businessModelHypothesis: CMS_CONTEXT.businessModelHypothesis,
    pricingHypothesis: CMS_CONTEXT.pricingHypothesis,
    idempotencyKey: "economic-extraction-repair",
  };
}

function finding(claim: string, extra?: Partial<FounderResearchFinding>): FounderResearchFinding {
  return {
    findingId: extra?.findingId ?? `f-${Math.random().toString(16).slice(2)}`,
    dimension: extra?.dimension ?? "pricing",
    claim,
    polarity: extra?.polarity ?? "positive",
    grounded: extra?.grounded ?? true,
    confidence: extra?.confidence ?? 0.7,
    sourceUrls: extra?.sourceUrls ?? ["https://example.com/research"],
    limitations: extra?.limitations ?? [],
    verifiesFounderCompetitor: extra?.verifiesFounderCompetitor ?? null,
  };
}

describe("REVENUE SUFFICIENCY + ECONOMIC EXTRACTION REPAIR V1", () => {
  const packet = cmsLiveV6EconomicReplayPacket("s", "c");
  const revenue = researchRevenueModel({ packet, context: CMS_CONTEXT });
  const bench = researchBenchmarkEconomics({ packet, context: CMS_CONTEXT, revenueModel: revenue });

  it("separates revenue structure from pricing sufficiency and keeps gap-fill running", () => {
    expect(revenue.coverage.evidence.businessModelStructure).toBe("SUFFICIENT");
    expect(["PARTIAL", "INSUFFICIENT"]).toContain(revenue.coverage.evidence.monthlyPricingEvidence);
    expect(revenue.coverage.evidence.monthlyPricingEvidence).not.toBe("SUFFICIENT");
    expect(revenue.coverage.status).not.toBe("REVENUE_MODEL_SUFFICIENT");
    const planner = assessRevenuePlannerCoverage({
      evidence: packet.findings.map((item) => ({ claim: item.claim, grounded: item.grounded, sourceUrls: item.sourceUrls })),
      sources: packet.sources,
      seed: { ideaTitle: "Infinity CMS", competitorLeads: ["Hibu"] },
    });
    expect(planner.status).not.toBe("REVENUE_MODEL_SUFFICIENT");
    const decision = evaluateRevenueGapFillEligibility({
      materialCoverageSufficient: true,
      evidence: packet.findings.map((item) => ({ claim: item.claim, grounded: item.grounded, sourceUrls: item.sourceUrls })),
      sources: packet.sources,
      policy: loadResearchCoveragePolicy(),
      seed: { ideaTitle: "Infinity CMS", targetCustomer: "SMB owners", competitorLeads: ["Hibu"] },
      issuedQueries: [],
      revenueGapFillPhasesUsed: 0,
      recordedCostUsd: 0.01,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(decision.eligible).toBe(true);
    if (decision.eligible) {
      expect(decision.queries.some((query) => /monthly pricing|setup fee|add-on|annual billing/i.test(query.query))).toBe(true);
      expect(decision.queries.every((query) => !/^Hibu subscription$/i.test(query.query))).toBe(true);
    }
  });

  it("skips revenue gap-fill only when closed monthly pricing is sufficient", () => {
    const after = cmsMoneyResearchAfterPacket("s", "c");
    const afterModel = researchRevenueModel({ packet: after, context: CMS_CONTEXT });
    expect(afterModel.coverage.evidence.monthlyPricingEvidence).toBe("SUFFICIENT");
    expect(afterModel.coverage.status).toBe("REVENUE_MODEL_SUFFICIENT");
    const skip = evaluateRevenueGapFillEligibility({
      materialCoverageSufficient: true,
      evidence: after.findings.map((item) => ({ claim: item.claim, grounded: item.grounded, sourceUrls: item.sourceUrls })),
      sources: after.sources,
      policy: loadResearchCoveragePolicy(),
      seed: { ideaTitle: "Infinity CMS", competitorLeads: ["Northstar Sites", "LocalLaunch Web"] },
      issuedQueries: [],
      revenueGapFillPhasesUsed: 0,
      recordedCostUsd: 0.01,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(skip.eligible).toBe(false);
    expect(skip.reason).toBe("REVENUE_MODEL_SUFFICIENT");
  });

  it("extracts open, closed, setup, and upper-bound prices without inventing intervals", () => {
    const category = extractMoneyObservations("SaaS CMS / AI website builders: $10–$80+/month");
    expect(category[0]?.amountLow).toBe(10);
    expect(category[0]?.amountHigh).toBe(80);
    expect(category[0]?.upperOpen).toBe(true);
    expect(category[0]?.upperAnchor).toBe(80);
    expect(category[0]?.boundKind).toBe("OPEN_HIGH");
    const durable = extractMoneyObservations("Durable public plans list $12/month");
    expect(durable[0]?.amount).toBe(12);
    expect(durable[0]?.kind).toBe("MONTHLY_PRICE");
    expect(durable[0]?.boundKind).toBe("CLOSED");
    const aeo = extractMoneyObservations("AEO tracking tools charge $79–$380/month");
    expect(aeo[0]?.amountLow).toBe(79);
    expect(aeo[0]?.amountHigh).toBe(380);
    const setup = extractMoneyObservations("Agency setup/onboarding fees are typically $1,000–$5,000");
    expect(setup[0]?.kind).toBe("SETUP_FEE");
    expect(setup[0]?.amountLow).toBe(1000);
    expect(setup[0]?.amountHigh).toBe(5000);
    const hibu = extractMoneyObservations("Hibu local marketing retainers: up to $3,500/month");
    expect(hibu[0]?.boundKind).toBe("UPPER_BOUND");
    expect(hibu[0]?.amountLow).toBeNull();
    expect(hibu[0]?.amountHigh).toBe(3500);
    expect(hibu[0]?.amount).toBeNull();
    expect(extractMoneyObservations("starts at $12/month")[0]?.boundKind).toBe("LOWER_BOUND");
    expect(extractMoneyObservations("from $12/month")[0]?.boundKind).toBe("LOWER_BOUND");
  });

  it("qualifies Durable, keeps AEO as tooling, and separates setup from MRR", () => {
    expect(classifyPriceRole("SaaS CMS / AI website builders: $10–$80+/month", CMS_CONTEXT)).toBe("CATEGORY_PRICE_BENCHMARK");
    expect(classifyPriceRole("Durable public plans list $12/month for an AI website builder.", CMS_CONTEXT)).toBe(
      "DIRECT_COMPARABLE_CORE_PRICE",
    );
    expect(classifyPriceRole("AEO tracking tools charge $79–$380/month.", CMS_CONTEXT)).toBe("TOOLING_PRICE");
    expect(classifyPriceRole("Agency setup/onboarding fees are typically $1,000–$5,000.", CMS_CONTEXT)).toBe("SETUP_FEE");
    expect(classifyPriceRole("Hibu local marketing retainers: up to $3,500/month.", CMS_CONTEXT)).toBe("MANAGED_SERVICE_RETAINER");
    const durable = revenue.comparables.find((row) => /durable/i.test(row.name));
    expect(durable).toBeTruthy();
    expect(durable?.revenueModelComparable).toBe(true);
    expect(durable?.numericPricingContribution).toBe(true);
    const monthly = revenue.revenuePerCustomer.monthlyRecurring;
    expect(monthly.high === 380 || monthly.base === 380).toBe(false);
    expect(revenue.revenuePerCustomer.firstYearSetup.low).toBe(1000);
    expect(revenue.revenuePerCustomer.firstYearSetup.high).toBe(5000);
    expect(revenue.directAnswer.coreRevenue).toMatch(/pricing clues/i);
    expect(revenue.directAnswer.pricingClues.length).toBeGreaterThan(0);
  });

  it("does not let a single weak CAC or margin become SUFFICIENT", () => {
    const cacObs = bench.observations.filter((item) => item.dimension === "customer_acquisition_cost");
    expect(cacObs.some((item) => item.range.base === 476)).toBe(true);
    expect(cacObs.some((item) => item.range.base === 723)).toBe(true);
    expect(bench.coverage.cac).toBe("BENCHMARK_PARTIAL");
    expect(bench.modeled.cac.confidence).toBe("LOW");
    expect(bench.modeled.cac.range.base === 476 || bench.modeled.cac.range.low === 476 || bench.modeled.cac.range.high === 476).toBe(true);
    expect(bench.coverage.grossMargin).toBe("BENCHMARK_PARTIAL");
    expect(bench.modeled.grossMargin.confidence).toBe("LOW");
    expect(bench.modeled.grossMargin.range.base).toBeCloseTo(0.77);
    const weak: QualifiedBenchmark[] = [
      {
        ...bench.qualified.find((item) => item.dimension === "customer_acquisition_cost")!,
        relevance: "MEDIUM_RELEVANCE",
        sourceClass: "UNSOURCED_SEO_PAGE",
      },
    ];
    expect(coverageFromAcceptedQuality(weak)).toBe("BENCHMARK_PARTIAL");
  });

  it("splits mixed churn, excludes ambiguous churn from lifetime, and converts annual logo churn with compounding", () => {
    const mixed = extractBenchmarkObservations([
      finding("Median monthly gross churn is 8–10%, and AI wrappers 45% annual churn.", {
        dimension: "capital_efficiency",
      }),
    ]);
    const monthly = mixed.find((item) => item.dimension === "monthly_churn");
    const annual = mixed.find((item) => item.dimension === "annual_churn");
    expect(monthly?.range.low).toBeCloseTo(0.08);
    expect(monthly?.range.high).toBeCloseTo(0.1);
    expect(monthly?.churnKind).toBe("monthly_revenue");
    expect(annual?.range.base).toBeCloseTo(0.45);
    expect(annual?.churnKind).toBe("unknown");
    expect(annual?.range.base).not.toBeCloseTo(0.1);
    expect(churnKindOf("monthly logo churn 3%")).toBe("monthly_logo");
    expect(churnKindOf("annual revenue churn 12%")).toBe("annual_revenue");
    const modeled = modelRetention({ aggregations: {}, qualified: bench.qualified });
    expect(modeled.lifetimeMonths.base).toBeNull();
    expect(modeled.formula).toMatch(/excluded|mix|UNKNOWN/i);
    expect(monthlyChurnFromAnnualRetention(0.8)).toBeCloseTo(1 - 0.8 ** (1 / 12));
    expect(monthlyChurnFromAnnualChurn(0.45)).toBeCloseTo(1 - (1 - 0.45) ** (1 / 12));
    expect(monthlyChurnFromAnnualChurn(0.45)).not.toBeCloseTo(0.45 / 12);
  });

  it("inherits the weakest critical confidence and does not declare overall economics sufficient", () => {
    expect(bench.modeled.ltv.range.base).toBeNull();
    expect(bench.coverage.overall).not.toBe("BENCHMARK_SUFFICIENT");
    expect(weakestConfidence("HIGH", "LOW")).toBe("LOW");
    expect(bench.modeled.ltvCac.confidence === "NONE" || bench.modeled.ltvCac.confidence === "LOW").toBe(true);
    expect(bench.modeled.payback.confidence === "LOW" || bench.modeled.payback.range.base == null).toBe(true);
    const continueFill = evaluateBenchmarkGapFillEligibility({
      materialCoverageSufficient: true,
      evidence: packet.findings.map((item) => ({ claim: item.claim, grounded: item.grounded, sourceUrls: item.sourceUrls })),
      sources: packet.sources,
      policy: loadResearchCoveragePolicy(),
      seed: { ideaTitle: "Infinity CMS", targetCustomer: "SMB owners" },
      issuedQueries: [],
      benchmarkGapFillPhasesUsed: 0,
      recordedCostUsd: 0.01,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(continueFill.eligible).toBe(true);
    const planner = assessBenchmarkPlannerCoverage({
      evidence: packet.findings.map((item) => ({ claim: item.claim, grounded: item.grounded, sourceUrls: item.sourceUrls })),
      sources: packet.sources,
      seed: { ideaTitle: "Infinity CMS", targetCustomer: "SMB owners" },
    });
    expect(planner.sufficient).toBe(false);
    expect(planner.missing).toContain("cac");
  });

  it("preserves publisher/title metadata and does not invent canonical URLs", () => {
    const result = normalizeGroundedResearch({
      researchRunId: "run-meta",
      organizationId: "org-1",
      missionId: null,
      providerId: "gemini",
      modelId: "gemini-3.5-flash",
      researchObjective: "meta",
      inputHash: "hash",
      structured: {
        schemaVersion: "grounded_research_v1",
        summary: "meta",
        findings: [
          {
            findingId: "f1",
            claim: "Observed.",
            signalType: "search_demand",
            observedSignal: "signal",
            relevance: "positive",
            confidence: 0.5,
            grounded: true,
            inference: false,
            sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-meta"],
            limitations: [],
          },
        ],
        limitations: [],
        requiresMoreResearch: true,
      },
      groundingMetadata: {
        webSearchQueries: ["cms"],
        groundingChunks: [
          {
            web: {
              uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-meta",
              title: "Website builder pricing roundup",
              domain: "vertexaisearch.cloud.google.com",
              publisher: "Industry roundup",
            },
          },
        ],
      },
      tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      groundingUsage: {
        webSearchQueries: ["cms"],
        searchQueryCount: 1,
        groundingChunkCount: 1,
        groundingSupportCount: 0,
        groundingInvoked: true,
        searchCostKnown: false,
      },
      estimatedCostUsd: 0.01,
      costUncertainty: "fixture",
      latencyMs: 1,
      requestId: "req",
      retryMetadata: { attemptCount: 1, maxAttempts: 1, retried: false },
      rawProviderResponseStored: true,
    });
    expect(result.sources[0]?.title).toBe("Website builder pricing roundup");
    expect(result.sources[0]?.publisher).toBe("Industry roundup");
    expect(result.sources[0]?.url).toContain("vertexaisearch.cloud.google.com");
    expect(result.sources[0]?.canonicalUrl).toContain("vertexaisearch.cloud.google.com");
  });

  it("uses low-confidence CAC copy and pricing-clue copy", () => {
    expect(founderLowConfidenceCacCopy(476)).toContain("Preliminary CAC estimate");
    expect(founderLowConfidenceCacCopy(476)).toContain("About $476");
    expect(founderLowConfidenceCacCopy(476)).toContain("Infinity found only one weak market benchmark.");
    expect(cacValidationTarget({ amount: 476, confidence: "LOW", coverage: "BENCHMARK_PARTIAL" })).toMatch(
      /preliminary \$476/,
    );
    expect(cacValidationTarget({ amount: 476, confidence: "HIGH", coverage: "BENCHMARK_SUFFICIENT" })).toMatch(
      /below approximately \$476/,
    );
    expect(cacValidationTarget({ amount: null, confidence: "NONE", coverage: "BENCHMARK_INSUFFICIENT" })).toBe("Measure CAC.");
    expect(founderPricingCluesCopy(["Durable $12/month"])).toMatch(/pricing clues/);
    expect(founderPricingCluesCopy(["Durable $12/month"])).toMatch(/Examples found/);
    expect(bench.nextToProve).toMatch(/Preliminary CAC estimate/);
    expect(revenue.directAnswer.coreRevenue).not.toMatch(/no grounded public monthly price/);
  });

  it("exposes Money tab presentation data without granting BUILD", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, ideaInput());
    convertFounderIdeaToCandidate(store, submission);
    const livePacket = cmsLiveV6EconomicReplayPacket(submission.id, submission.opportunityCandidateId!);
    const { grade } = analyzeFounderIdea(store, submission, { researchPacket: livePacket });
    const explain = composeFounderExplainability({
      submission,
      grade: grade!,
      packet: livePacket,
      layers: livePacket.monetizationLayers,
    });
    const view = buildFounderIntelligenceView(explain);
    const money = buildFounderMoneyView(view);
    expect(money.presentation.pricingClues.length).toBeGreaterThan(0);
    expect(grade?.buildReady).toBe(false);
    expect(evaluateBuildReadiness({ decisionReady: true, evaluation: grade?.evaluation ?? null }).buildReady).toBe(false);
    const monetization = monetizeFromResearchPacket({
      candidate: store.candidates.get(submission.opportunityCandidateId!)!,
      packet: livePacket,
      revenueModel: revenue,
    });
    expect(unitEconomicsNumericallyKnown(monetization?.primaryPlan)).toBe(false);
    expect(monetization?.primaryPlan?.estimatedCAC).toBeNull();
    expect(monetization?.primaryPlan?.estimatedLTV).toBeNull();
    expect(provenanceGrantsBuild("COMPARABLE_MODELED")).toBe(false);
    expect(provenanceGrantsBuild("CATEGORY_BENCHMARK")).toBe(false);
    const { store: treasury } = createGovernedStore();
    expect(() => assertFounderSpendStillTreasuryGated(treasury, submission)).not.toThrow();
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
  });
});
