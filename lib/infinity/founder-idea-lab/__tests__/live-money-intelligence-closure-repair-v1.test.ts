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
import {
  aggregateModeledArpu,
  extractMoneyObservations,
  taggedMoneyObservationsFromFindings,
} from "../revenue-model-research/extract";
import { classifyPriceRole, qualifyPriceFinding } from "../revenue-model-research/price-role";
import { researchRevenueModel } from "../revenue-model-research/from-evidence";
import { founderPricingCluesCopy } from "../revenue-model-research/founder-copy";
import { qualifyRevenueModelComparables } from "../revenue-model-research/qualify";
import { extractBenchmarkObservations, cacChannelLabel } from "../benchmark-economics/extract";
import { researchBenchmarkEconomics } from "../benchmark-economics/from-evidence";
import { coverageFromAcceptedQuality, weakestConfidence } from "../benchmark-economics/confidence";
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
import { composeFounderExplainability } from "../explainability/compose";
import { buildFounderIntelligenceView } from "../explainability/view";
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
    idempotencyKey: "live-money-intelligence-closure-repair",
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

describe("LIVE MONEY INTELLIGENCE CLOSURE REPAIR V1", () => {
  const packet = cmsLiveV6EconomicReplayPacket("s", "c");
  const revenue = researchRevenueModel({ packet, context: CMS_CONTEXT });
  const bench = researchBenchmarkEconomics({ packet, context: CMS_CONTEXT, revenueModel: revenue });

  it("keeps revenue structure separate from pricing sufficiency and still triggers gap-fill", () => {
    expect(revenue.coverage.revenueStructureStatus).toBe("SUFFICIENT");
    expect(revenue.coverage.pricingEvidenceStatus).toBe("PARTIAL");
    expect(revenue.coverage.revenuePerCustomerStatus).toBe("PARTIAL");
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
      expect(decision.queries.some((query) => /monthly pricing|setup fee|add-on|annual billing|pricing tiers/i.test(query.query))).toBe(
        true,
      );
    }
  });

  it("skips revenue gap-fill only when pricing evidence is sufficient", () => {
    const after = cmsMoneyResearchAfterPacket("s", "c");
    const afterModel = researchRevenueModel({ packet: after, context: CMS_CONTEXT });
    expect(afterModel.coverage.pricingEvidenceStatus).toBe("SUFFICIENT");
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

  it("audits v6 price findings with open bounds, roles, and qualification", () => {
    const categoryClaim = "SaaS CMS / AI website builders: $10–$80+/month for hosted website packages.";
    const category = extractMoneyObservations(categoryClaim)[0];
    expect(category?.amountLow).toBe(10);
    expect(category?.upperAnchor).toBe(80);
    expect(category?.upperOpen).toBe(true);
    expect(category?.boundKind).toBe("OPEN_HIGH");
    expect(classifyPriceRole(categoryClaim, CMS_CONTEXT)).toBe("CATEGORY_PRICE_BENCHMARK");
    expect(qualifyPriceFinding(categoryClaim, CMS_CONTEXT).acceptedForCorePrice).toBe(false);

    const durableClaim = "Durable public plans list $12/month for an AI website builder.";
    const durable = extractMoneyObservations(durableClaim)[0];
    expect(durable?.amount).toBe(12);
    expect(durable?.boundKind).toBe("CLOSED");
    expect(durable?.upperOpen).toBe(false);
    expect(classifyPriceRole(durableClaim, CMS_CONTEXT)).toBe("DIRECT_COMPARABLE_CORE_PRICE");
    expect(qualifyPriceFinding(durableClaim, CMS_CONTEXT).acceptedForNumericPricing).toBe(true);

    const aeoClaim = "AEO tracking tools charge $79–$380/month.";
    const aeo = extractMoneyObservations(aeoClaim)[0];
    expect(aeo?.amountLow).toBe(79);
    expect(aeo?.amountHigh).toBe(380);
    expect(aeo?.upperOpen).toBe(false);
    expect(classifyPriceRole(aeoClaim, CMS_CONTEXT)).toBe("TOOLING_PRICE");
    expect(qualifyPriceFinding(aeoClaim, CMS_CONTEXT).acceptedForCorePrice).toBe(false);

    const setupClaim = "Agency setup/onboarding fees are typically $1,000–$5,000.";
    const setup = extractMoneyObservations(setupClaim)[0];
    expect(setup?.kind).toBe("SETUP_FEE");
    expect(setup?.amountLow).toBe(1000);
    expect(setup?.amountHigh).toBe(5000);
    expect(classifyPriceRole(setupClaim, CMS_CONTEXT)).toBe("SETUP_FEE");

    const hibuClaim = "Hibu local marketing retainers: up to $3,500/month.";
    const hibu = extractMoneyObservations(hibuClaim)[0];
    expect(hibu?.boundKind).toBe("UPPER_BOUND");
    expect(hibu?.amountLow).toBeNull();
    expect(hibu?.amountHigh).toBe(3500);
    expect(hibu?.amount).toBeNull();
    expect(classifyPriceRole(hibuClaim, CMS_CONTEXT)).toBe("MANAGED_SERVICE_RETAINER");
    expect(classifyPriceRole("Implementation fee $2,500", CMS_CONTEXT)).toBe("IMPLEMENTATION_FEE");
  });

  it("promotes Durable automatically and does not let AEO tooling set core price", () => {
    const comparables = qualifyRevenueModelComparables({ packet, context: CMS_CONTEXT });
    const durable = comparables.find((row) => /durable/i.test(row.name));
    expect(durable).toBeTruthy();
    expect(durable?.revenueModelComparable).toBe(true);
    expect(durable?.numericPricingContribution).toBe(true);
    expect(revenue.revenuePerCustomer.monthlyRecurring.high === 380 || revenue.revenuePerCustomer.monthlyRecurring.base === 380).toBe(
      false,
    );
    expect(revenue.revenuePerCustomer.firstYearSetup.low).toBe(1000);
    expect(revenue.revenuePerCustomer.firstYearSetup.high).toBe(5000);
  });

  it("generates modeled ARPU from qualified recurring evidence without observed venture ARPU", () => {
    const tagged = taggedMoneyObservationsFromFindings(
      packet.findings.map((item) => item.claim),
      CMS_CONTEXT,
    );
    const arpu = aggregateModeledArpu(tagged);
    expect(arpu.ventureObserved).toBe("UNKNOWN");
    expect(arpu.range.low).toBe(10);
    expect(arpu.range.base).toBe(12);
    expect(arpu.range.high).toBe(12);
    expect(arpu.confidence).toBe("LOW");
    expect(arpu.observations.some((item) => item.role === "DIRECT_COMPARABLE_CORE_PRICE")).toBe(true);
    expect(arpu.observations.some((item) => item.role === "TOOLING_PRICE" && item.contributesToCore)).toBe(false);
    expect(revenue.revenuePerCustomer.arpuModel.range.base).toBe(12);
    expect(revenue.directAnswer.coreRevenue).toMatch(/pricing clues/i);
    expect(revenue.directAnswer.coreRevenue).not.toMatch(/no grounded public monthly price/i);
  });

  it("keeps organic and paid CAC as channel-specific same-source clues", () => {
    const cacObs = bench.observations.filter((item) => item.dimension === "customer_acquisition_cost");
    const organic = cacObs.find((item) => item.range.base === 476);
    const paid = cacObs.find((item) => item.range.base === 723);
    expect(organic).toBeTruthy();
    expect(paid).toBeTruthy();
    expect(cacChannelLabel(organic?.channel ?? null)).toBe("organic");
    expect(cacChannelLabel(paid?.channel ?? null)).toBe("paid");
    expect(bench.channelCac.organic).toBe(476);
    expect(bench.channelCac.paid).toBe(723);
    expect(bench.channelCac.independentSourceCount).toBe(1);
    expect(bench.channelCac.blendedFromSameSource).toBe(false);
    expect(bench.modeled.cac.range.base).toBe(599.5);
    expect(bench.modeled.cac.range.high).toBe(723);
    expect(bench.coverage.cac).toBe("BENCHMARK_PARTIAL");
    expect(bench.modeled.cac.confidence).toBe("LOW");
    expect(bench.modeled.cac.calculation).toMatch(/not blended/i);
    const weak: QualifiedBenchmark[] = [
      {
        ...bench.qualified.find((item) => item.dimension === "customer_acquisition_cost")!,
        relevance: "MEDIUM_RELEVANCE",
        sourceClass: "UNSOURCED_SEO_PAGE",
      },
    ];
    expect(coverageFromAcceptedQuality(weak)).toBe("BENCHMARK_PARTIAL");
    expect(coverageFromAcceptedQuality([weak[0]!, { ...weak[0]!, observationId: "dup", range: { low: 723, base: 723, high: 723 } }])).toBe(
      "BENCHMARK_PARTIAL",
    );
  });

  it("keeps a single weak margin PARTIAL and splits mixed churn without lifetime", () => {
    expect(bench.coverage.grossMargin).toBe("BENCHMARK_PARTIAL");
    expect(bench.modeled.grossMargin.confidence).toBe("LOW");
    expect(bench.modeled.grossMargin.range.base).toBeCloseTo(0.77);
    const mixed = extractBenchmarkObservations([
      finding("Median monthly gross churn is 8–10%, and AI wrappers 45% annual churn.", {
        dimension: "capital_efficiency",
      }),
    ]);
    const monthly = mixed.find((item) => item.dimension === "monthly_churn");
    const annual = mixed.find((item) => item.dimension === "annual_churn");
    expect(monthly?.range.low).toBeCloseTo(0.08);
    expect(monthly?.churnKind).toBe("monthly_revenue");
    expect(annual?.range.base).toBeCloseTo(0.45);
    expect(annual?.churnKind).toBe("unknown");
    expect(bench.modeled.lifetimeMonths.base).toBeNull();
    expect(bench.modeled.ltv.range.base).toBeNull();
    expect(bench.modeled.ltvCac.range.base).toBeNull();
  });

  it("inherits weakest confidence and does not call overall economics sufficient", () => {
    expect(weakestConfidence("MEDIUM", "LOW", "NONE")).toBe("NONE");
    expect(bench.modeled.ltv.confidence).toBe("NONE");
    expect(bench.modeled.ltvCac.confidence).toBe("NONE");
    expect(bench.modeled.payback.range.base).not.toBeNull();
    expect(bench.modeled.payback.confidence).toBe("LOW");
    expect(bench.coverage.overall).toBe("BENCHMARK_PARTIAL");
    expect(bench.coverage.overall).not.toBe("BENCHMARK_SUFFICIENT");
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
    if (continueFill.eligible) {
      expect(continueFill.queries.some((query) => /benchmark report|SaaS study|public filing|official company/i.test(query.query))).toBe(
        true,
      );
    }
    const planner = assessBenchmarkPlannerCoverage({
      evidence: packet.findings.map((item) => ({ claim: item.claim, grounded: item.grounded, sourceUrls: item.sourceUrls })),
      sources: packet.sources,
      seed: { ideaTitle: "Infinity CMS", targetCustomer: "SMB owners" },
    });
    expect(planner.sufficient).toBe(false);
  });

  it("preserves publisher/title metadata and does not invent canonical URLs", () => {
    const result = normalizeGroundedResearch({
      researchRunId: "run-meta-closure",
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
            sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-meta-2"],
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
              uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-meta-2",
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

  it("exposes Money tab presentation data and founder copy without granting BUILD", () => {
    expect(founderLowConfidenceCacCopy(476)).toContain("Preliminary CAC estimate");
    expect(founderLowConfidenceCacCopy(476)).toContain("Infinity found only one weak market benchmark.");
    expect(founderPricingCluesCopy(["Durable $12/month"])).toMatch(/some public pricing clues/);
    expect(founderPricingCluesCopy(["Durable $12/month"])).toMatch(/recommend final pricing/);
    expect(cacValidationTarget({ amount: 476, confidence: "LOW", coverage: "BENCHMARK_PARTIAL" })).toMatch(/preliminary \$476/);
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
    expect(money.presentation.pricingEvidenceStatus).toMatch(/PARTIAL/i);
    expect(money.presentation.arpuRange).toBeTruthy();
    expect(money.presentation.setupRange).toBeTruthy();
    expect(money.presentation.cacConfidence.toLowerCase()).toMatch(/low/);
    expect(money.presentation.retentionEvidence).toMatch(/not lifetime-compatible|not known/i);
    expect(money.presentation.overallEconomicConfidence).toBeTruthy();
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
    const { store: treasury } = createGovernedStore();
    expect(() => assertFounderSpendStillTreasuryGated(treasury, submission)).not.toThrow();
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
  });
});
