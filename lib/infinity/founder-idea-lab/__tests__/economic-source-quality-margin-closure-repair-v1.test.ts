import { describe, expect, it } from "vitest";
import { createGovernedStore } from "@/lib/infinity/treasury/__tests__/fixtures";
import { loadResearchCoveragePolicy } from "@/lib/infinity/research/coverage/policy";
import {
  assessQualityReplacementNeeds,
  beginQualityReplacementPhase,
  evaluateQualityReplacementEligibility,
  lowMetricRemainsResearchable,
  QUALITY_REPLACEMENT_PRIORITY,
  QUALITY_REPLACEMENT_STATES,
  qualityReplacementQueries,
} from "@/lib/infinity/research/coverage/quality-replacement";
import { normalizeGroundedResearch } from "@/lib/infinity/research/normalization/evidence";
import type { ProviderResearchStructuredOutput } from "@/lib/infinity/research/types";
import { analyzeFounderIdea } from "../analyze";
import { routeFounderBuild } from "../build-route";
import { convertFounderIdeaToCandidate } from "../convert";
import { buildFounderMoneyView } from "../explainability/money-view";
import { buildFounderIntelligenceView } from "../explainability/view";
import { founderMoneySections } from "../hq/founder-money-sections";
import { cmsLiveV7EconomicReplayPacket, cmsLiveV8EconomicReplayPacket } from "../integrity-fixtures";
import { monetizeFromResearchPacket } from "../monetization-from-research";
import { evaluateBuildReadiness } from "../readiness";
import { FounderIdeaStore } from "../store";
import { submitFounderIdea } from "../submit";
import { assertFounderSpendStillTreasuryGated } from "../treasury-gate";
import { unitEconomicsNumericallyKnown } from "../economics-known";
import { provenanceGrantsBuild } from "../comparable-economics/provenance";
import { researchRevenueModel } from "../revenue-model-research/from-evidence";
import { researchBenchmarkEconomics } from "../benchmark-economics/from-evidence";
import { canContributeToCorePricing } from "../revenue-model-research/numeric-contribution";
import { classifyPriceRole } from "../revenue-model-research/price-role";
import {
  extractMoneyObservations,
  taggedMoneyObservationsFromFindings,
  aggregateModeledArpu,
} from "../revenue-model-research/extract";
import {
  classifyPricingCluster,
  marginQueriesForCluster,
  selectPricingCluster,
  setupQueriesForCluster,
} from "../revenue-model-research/pricing-cluster";
import {
  assessSourceIndependence,
  confidenceAfterIndependence,
  evidenceStrengthLabel,
  independenceDisplay,
} from "../revenue-model-research/source-independence";
import {
  extractProviderSourceMetadata,
  vertexRedirectResolutionCapability,
} from "../revenue-model-research/source-redirect";
import { classifyMarginRole, modelComponentMargin } from "../benchmark-economics/model-margin";
import { lifetimeMonthsFromMonthlyChurn } from "../benchmark-economics/model-retention";
import type { FounderIdeaSubmissionInput } from "../types";
import type { QualifiedBenchmark } from "../benchmark-economics/types";

const CMS_CONTEXT = {
  title: "Infinity CMS",
  description: "Build a cms for businesses that they would fill out a knowledge base when they sign up",
  targetCustomer: "SMB owners",
  problem: "Local businesses need rankable sites",
  proposedSolution: "AI CMS with SEO/AEO publishing",
  businessModelHypothesis: "Monthly website package plus setup and optional SEO/content services",
  pricingHypothesis: "cost per month depending on your package",
};

function ideaInput(): FounderIdeaSubmissionInput {
  return {
    organizationId: "org-econ-quality-v1",
    submittedByUserId: "user-a",
    title: CMS_CONTEXT.title,
    description: CMS_CONTEXT.description,
    targetCustomer: CMS_CONTEXT.targetCustomer,
    problem: CMS_CONTEXT.problem,
    proposedSolution: CMS_CONTEXT.proposedSolution,
    businessModelHypothesis: CMS_CONTEXT.businessModelHypothesis,
    pricingHypothesis: CMS_CONTEXT.pricingHypothesis,
    idempotencyKey: "econ-quality-v1",
  };
}

function qualifiedCost(dimension: QualifiedBenchmark["dimension"], amount: number, unit: QualifiedBenchmark["unit"] = "usd"): QualifiedBenchmark {
  return {
    observationId: dimension,
    dimension,
    claim: `${dimension} ${amount}`,
    findingId: dimension,
    sourceUrl: "https://example.com/costs",
    sourceClass: "CREDIBLE_BENCHMARK_STUDY",
    companyName: null,
    categoryLabel: "SMB SaaS",
    channel: null,
    range: { low: amount, base: amount, high: amount },
    unit,
    churnKind: null,
    provenance: "CATEGORY_BENCHMARK",
    publishedAt: null,
    retrievedAt: null,
    grounded: true,
    canonicalStatKey: dimension,
    relevance: "HIGH_RELEVANCE",
    relevanceScore: 1,
    relevanceFactors: {
      target_customer_match: true,
      business_model_match: true,
      revenue_model_match: true,
      acv_pricing_match: true,
      sales_motion_match: true,
      channel_match: true,
      service_intensity_match: true,
      geography_match: true,
      recency: true,
      source_quality: true,
    },
    whyRelevant: "Grounded cost input",
    rejectedReason: null,
  };
}

describe("ECONOMIC SOURCE QUALITY + MARGIN CLOSURE REPAIR V1", () => {
  const packet = cmsLiveV8EconomicReplayPacket("s", "c");
  const revenue = researchRevenueModel({ packet, context: CMS_CONTEXT });
  const bench = researchBenchmarkEconomics({ packet, context: CMS_CONTEXT, revenueModel: revenue });

  it("treats LOW numeric metrics as still researchable and triggers quality replacement", () => {
    expect(lowMetricRemainsResearchable({ hasNumericEvidence: true, confidence: "LOW", coverage: "PARTIAL" })).toBe(true);
    expect(lowMetricRemainsResearchable({ hasNumericEvidence: true, confidence: "HIGH", coverage: "SUFFICIENT" })).toBe(false);
    const needs = assessQualityReplacementNeeds({
      evidence: packet.findings.map((item) => ({ claim: item.claim, grounded: item.grounded, sourceUrls: item.sourceUrls })),
      sources: packet.sources,
      seed: { ideaTitle: "Infinity CMS", targetCustomer: "SMB owners", competitorLeads: ["Hibu", "Dealer Spike"] },
    });
    expect(needs.state).toBe("QUALITY_REPLACEMENT_REQUIRED");
    expect(needs.dimensions).toEqual(expect.arrayContaining(["pricing", "cac", "retention", "margin", "setup"]));
    const decision = evaluateQualityReplacementEligibility({
      materialCoverageSufficient: true,
      evidence: packet.findings.map((item) => ({ claim: item.claim, grounded: item.grounded, sourceUrls: item.sourceUrls })),
      sources: packet.sources,
      policy: loadResearchCoveragePolicy(),
      seed: { ideaTitle: "Infinity CMS", targetCustomer: "SMB owners" },
      issuedQueries: [],
      qualityReplacementPhasesUsed: 0,
      recordedCostUsd: 0.01,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(decision.eligible).toBe(true);
    expect(decision.state).toBe("QUALITY_REPLACEMENT_REQUIRED");
    expect(beginQualityReplacementPhase(decision)).toBe("QUALITY_REPLACEMENT_RUNNING");
    expect(QUALITY_REPLACEMENT_STATES).toEqual(
      expect.arrayContaining([
        "QUALITY_REPLACEMENT_REQUIRED",
        "QUALITY_REPLACEMENT_RUNNING",
        "QUALITY_REPLACEMENT_EXHAUSTED",
        "QUALITY_REPLACEMENT_SUCCEEDED",
      ]),
    );
    expect(QUALITY_REPLACEMENT_PRIORITY).toEqual(["margin", "pricing", "cac", "retention", "setup"]);
    expect(decision.queries.length).toBeGreaterThan(1);
    expect(decision.queries.length).toBeLessThanOrEqual(5);
    expect(decision.queries.map((item) => item.intent).join(" ")).toMatch(/margin/);
    expect(decision.queries.map((item) => item.intent).join(" ")).toMatch(/pricing/);
    expect(decision.queries.map((item) => item.intent).join(" ")).toMatch(/cac/);
    expect(decision.queries.map((item) => item.intent).join(" ")).toMatch(/retention/);
    expect(decision.queries[0]?.intent).toMatch(/margin/);
    const policy = loadResearchCoveragePolicy();
    expect(policy.maxQualityReplacementPhases).toBe(1);
    expect(policy.maxQualityReplacementQueries).toBe(5);
    expect(policy.maxQualityReplacementQueryHardCap).toBe(8);
    const exhausted = evaluateQualityReplacementEligibility({
      materialCoverageSufficient: true,
      evidence: packet.findings.map((item) => ({ claim: item.claim, grounded: item.grounded, sourceUrls: item.sourceUrls })),
      sources: packet.sources,
      policy,
      seed: { ideaTitle: "Infinity CMS", targetCustomer: "SMB owners" },
      issuedQueries: [],
      qualityReplacementPhasesUsed: 1,
      recordedCostUsd: 0.01,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(exhausted.eligible).toBe(false);
    expect(exhausted.state).toBe("QUALITY_REPLACEMENT_EXHAUSTED");
    const hardCapped = evaluateQualityReplacementEligibility({
      materialCoverageSufficient: true,
      evidence: packet.findings.map((item) => ({ claim: item.claim, grounded: item.grounded, sourceUrls: item.sourceUrls })),
      sources: packet.sources,
      policy: { ...policy, maxQualityReplacementQueries: 20 },
      seed: { ideaTitle: "Infinity CMS", targetCustomer: "SMB owners" },
      issuedQueries: [],
      qualityReplacementPhasesUsed: 0,
      recordedCostUsd: 0.01,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(hardCapped.eligible).toBe(true);
    expect(hardCapped.queries.length).toBeLessThanOrEqual(8);
  });

  it("splits pricing into semantic clusters and does not mix self-serve with $1,000+ platforms", () => {
    expect(classifyPricingCluster("Self-serve website builders list $9–$40/month.")).toBe("SELF_SERVE_SITE_BUILDER");
    expect(classifyPricingCluster("Vertical dealership CMS platforms charge $449–$1,500+/month.")).toBe("VERTICAL_CMS_PLATFORM");
    expect(classifyPricingCluster("Dealer Spike charges $1,149+/month for dealer website packages.")).toBe("VERTICAL_CMS_PLATFORM");
    expect(classifyPricingCluster("Hibu bundled local marketing retainers: $1,100–$1,500/month.")).toBe("MARKETING_RETAINER");
    expect(classifyPricingCluster("HubSpot Marketing Hub Starter is $45/month for CRM and AEO tooling.")).toBe("SEO_AEO_TOOLING");
    expect(classifyPricingCluster("AEO rank-tracking tooling lists $99–$10,000/month.")).toBe("SEO_AEO_TOOLING");
    expect(classifyPricingCluster("Setup fee $2,500 for website migration and launch.")).toBe("SETUP_IMPLEMENTATION");
    expect(classifyPricingCluster("Unrelated field-sales CRM charges $80/user.")).toBe("OTHER");
    const tagged = taggedMoneyObservationsFromFindings(
      packet.findings.map((item) => item.claim),
      CMS_CONTEXT,
    );
    const arpu = aggregateModeledArpu(tagged, CMS_CONTEXT);
    expect(arpu.selfServe.low).toBe(9);
    expect(arpu.selfServe.high).toBe(40);
    expect(arpu.core.low).toBe(449);
    expect(arpu.core.base).toBe(1150);
    expect(arpu.core.high).toBe(1150);
    expect(arpu.core.low).not.toBe(9);
    expect(arpu.core.high).not.toBe(2400);
    expect(arpu.observations.some((item) => item.contributesToCore && /hibu/i.test(item.sourceText))).toBe(false);
    expect(arpu.observations.some((item) => item.contributesToCore && /self-serve/i.test(item.sourceText))).toBe(false);
    expect(arpu.observations.some((item) => item.semanticCluster === "SEO_AEO_TOOLING" && item.contributesToCore)).toBe(false);
    expect(arpu.qualityReplacementRequired).toBe(true);
    expect(arpu.sampleCount).toBeGreaterThan(0);
    expect(arpu.independenceState).toBe("INDEPENDENCE_UNKNOWN");
    expect(arpu.sourceQuality).toBe("LOW");
  });

  it("selects a recommended Infinity CMS cluster from the founder profile, then core ARPU from priced core comparables", () => {
    const selection = selectPricingCluster({
      context: CMS_CONTEXT,
      pricedClusters: ["VERTICAL_CMS_PLATFORM", "SELF_SERVE_SITE_BUILDER", "SEO_AEO_TOOLING", "MARKETING_RETAINER"],
    });
    expect(selection.recommendedPricingCluster).toBe("AI_CMS_PLATFORM");
    expect(selection.selectedPricingCluster).toBe("VERTICAL_CMS_PLATFORM");
    expect(selection.fallbackUsed).toBe(true);
    expect(selection.confidence).toBe("LOW");
    expect(selection.acceptedEvidence).toEqual(["VERTICAL_CMS_PLATFORM"]);
    expect(selection.rejectedEvidence).toEqual(expect.arrayContaining(["SELF_SERVE_SITE_BUILDER", "SEO_AEO_TOOLING", "MARKETING_RETAINER"]));
    expect(revenue.pricingClusters?.recommended).toBe("AI_CMS_PLATFORM");
    expect(revenue.pricingClusters?.selected).toBe("VERTICAL_CMS_PLATFORM");
    expect(revenue.revenuePerCustomer.arpuModel.confidence).toBe("LOW");
    expect(revenue.coverage.pricingEvidenceStatus).toBe("PARTIAL");
  });

  it("classifies Dealer Spike and Hibu roles deterministically", () => {
    const dealerClaim = "Dealer Spike charges $1,149+/month for dealer website packages.";
    const hibuClaim = "Hibu bundled local marketing retainers: $1,100–$1,500/month.";
    expect(classifyPriceRole(dealerClaim, CMS_CONTEXT)).toBe("DIRECT_COMPARABLE_CORE_PRICE");
    expect(classifyPriceRole("Dealer Spike CMS lists $1,149/month.", CMS_CONTEXT)).toBe("ADJACENT_COMPARABLE_CORE_PRICE");
    expect(classifyPriceRole(hibuClaim, CMS_CONTEXT)).toBe("MANAGED_SERVICE_RETAINER");
    expect(canContributeToCorePricing(extractMoneyObservations(dealerClaim)[0]!, classifyPriceRole(dealerClaim, CMS_CONTEXT), dealerClaim)).toBe(true);
    expect(canContributeToCorePricing(extractMoneyObservations(hibuClaim)[0]!, classifyPriceRole(hibuClaim, CMS_CONTEXT), hibuClaim)).toBe(false);
    const hibu = revenue.comparables.find((row) => /hibu/i.test(row.name));
    const dealer = revenue.comparables.find((row) => /dealer spike/i.test(row.name));
    expect(hibu?.numericPricingContribution).toBe(false);
    expect(dealer?.numericPricingContribution).toBe(true);
    expect(revenue.revenuePerCustomer.arpuModel.managedService.low).toBe(1100);
  });

  it("plans setup and cluster-targeted margin queries without generic CMS-only overreliance", () => {
    const setup = setupQueriesForCluster("VERTICAL_CMS_PLATFORM", "SMB owners");
    expect(setup.some((item) => /setup fee/i.test(item))).toBe(true);
    expect(setup.some((item) => /onboarding fee/i.test(item))).toBe(true);
    expect(setup.some((item) => /implementation fee/i.test(item))).toBe(true);
    expect(setup.every((item) => !/^CMS setup fee$/i.test(item))).toBe(true);
    const margin = marginQueriesForCluster("VERTICAL_CMS_PLATFORM", "SMB owners");
    expect(margin.some((item) => /vertical SaaS gross margin/i.test(item))).toBe(true);
    expect(margin.some((item) => /SMB SaaS gross margin/i.test(item))).toBe(true);
    expect(margin.every((item) => !/^CMS gross margin benchmark$/i.test(item))).toBe(true);
    expect(revenue.coverage.setupEvidenceStatus).toBe("INSUFFICIENT");
  });

  it("plans CAC quality replacement and a complete component chain", () => {
    const queries = qualityReplacementQueries({
      seed: { ideaTitle: "Infinity CMS", targetCustomer: "SMB owners" },
      dimensions: ["cac", "retention"],
      selectedCluster: "VERTICAL_CMS_PLATFORM",
      missingCacStages: ["CPC", "visitor_to_lead", "lead_to_customer", "sales_labor"],
    });
    const blob = queries.map((item) => item.query).join(" | ");
    expect(blob).toMatch(/CAC benchmark report/i);
    expect(blob).toMatch(/Google Ads CPC/i);
    expect(blob).toMatch(/visitor to lead/i);
    expect(blob).toMatch(/lead to customer/i);
    expect(blob).toMatch(/sales labor/i);
    expect(blob).toMatch(/monthly logo churn/i);
    expect(queries.every((item) => !/^CMS CAC$/i.test(item.query))).toBe(true);
    const missingStage = qualityReplacementQueries({
      seed: { ideaTitle: "Infinity CMS", targetCustomer: "SMB owners" },
      dimensions: ["cac"],
      selectedCluster: "VERTICAL_CMS_PLATFORM",
      missingCacStages: ["lead_to_customer"],
    });
    const missingBlob = missingStage.map((item) => item.query).join(" | ");
    expect(missingBlob).toMatch(/lead to customer/i);
    expect(missingBlob).not.toMatch(/Google Ads CPC/i);
  });

  it("keeps v8 CAC LOW, retention usable from logo churn, and margin/LTV unknown", () => {
    expect(bench.modeled.cac.range.base).toBe(559);
    expect(bench.modeled.cac.confidence).toBe("LOW");
    expect(bench.channelCac.independentSourceCount).toBe(1);
    expect(bench.modeled.lifetimeMonths.base).toBeCloseTo(lifetimeMonthsFromMonthlyChurn(0.035) ?? 0, 5);
    expect(Math.round(bench.modeled.lifetimeMonths.base ?? 0)).toBe(29);
    expect(bench.modeled.grossMargin.range.base).toBeNull();
    expect(bench.modeled.ltv.range.base).toBeNull();
    expect(bench.modeled.ltvCac.range.base).toBeNull();
    expect(bench.modeled.payback.range.base).toBeNull();
    expect(bench.unusedMarginEvidence?.some((item) => /Missing:/i.test(item.why))).toBe(true);
  });

  it("classifies margin roles, keeps projected/infrastructure out of base, and can model component margin", () => {
    expect(classifyMarginRole("Wix Base44 AI website builder starting near 0% gross margin")).toBe("INFRASTRUCTURE_MARGIN");
    expect(classifyMarginRole("Projected 60% gross margin")).toBe("PROJECTED_MARGIN");
    expect(classifyMarginRole("SMB SaaS category gross margin 70%")).toBe("CATEGORY_MARGIN");
    expect(classifyMarginRole("Hosting cost $40/month plus support cost $80")).toBe("COMPONENT_COST");
    const empty = modelComponentMargin({
      qualified: [],
      monthlyRevenue: { low: 449, base: 1149, high: 1149 },
    });
    expect(empty.used).toBe(false);
    expect(empty.unknownCostsTreatedAsZero).toBe(false);
    expect(empty.missing).toEqual(expect.arrayContaining(["hosting", "support", "AI/API", "service labor", "payment processing"]));
    expect(empty.coverage.hosting).toBe("UNKNOWN");
    const incomplete = modelComponentMargin({
      qualified: [qualifiedCost("hosting_cost", 40), qualifiedCost("support_cost", 80), qualifiedCost("software_variable_cost", 30)],
      monthlyRevenue: { low: 449, base: 1149, high: 1149 },
    });
    expect(incomplete.used).toBe(false);
    expect(incomplete.blended.base).toBeNull();
    expect(incomplete.unknownCostsTreatedAsZero).toBe(false);
    expect(incomplete.missing).toEqual(expect.arrayContaining(["payment processing"]));
    const closed = modelComponentMargin({
      qualified: [
        qualifiedCost("hosting_cost", 40),
        qualifiedCost("support_cost", 80),
        qualifiedCost("software_variable_cost", 30),
        qualifiedCost("payment_processing", 0.03, "percent"),
      ],
      monthlyRevenue: { low: 449, base: 1149, high: 1149 },
    });
    expect(closed.used).toBe(true);
    expect(closed.coverage.hosting).toBe("KNOWN");
    expect(closed.coverage.aiApi).toBe("KNOWN");
    expect(closed.coverage.support).toBe("KNOWN");
    expect(closed.coverage.paymentProcessing).toBe("KNOWN");
    expect(closed.unknownCostsTreatedAsZero).toBe(false);
    expect(closed.blended.base).toBeCloseTo(1 - (150 + 1149 * 0.03) / 1149, 5);
    expect(closed.software.base).not.toBeNull();
    expect(closed.service.base).not.toBeNull();
  });

  it("extracts provider source metadata, does not follow Vertex redirects, and marks independence unknown", () => {
    const meta = extractProviderSourceMetadata({
      url: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-meta",
      groundingTitle: "KeyBanc SaaS Survey",
      groundingPublisher: "KeyBanc Capital Markets",
      webTitle: "KeyBanc SaaS Survey",
    });
    expect(meta.title).toBe("KeyBanc SaaS Survey");
    expect(meta.publisher).toBe("KeyBanc Capital Markets");
    expect(meta.url).toContain("vertexaisearch.cloud.google.com");
    expect(vertexRedirectResolutionCapability().supported).toBe(false);
    const independence = assessSourceIndependence(packet.sources);
    expect(independence.state).toBe("INDEPENDENCE_UNKNOWN");
    expect(independence.independentCount).toBe(1);
    expect(independenceDisplay(independence.state)).toBe("Unknown");
    expect(bench.sampleQuality.independenceState).toBe("INDEPENDENCE_UNKNOWN");
    const known = assessSourceIndependence([
      { url: "https://keybanc.com/saas-survey", publisher: "KeyBanc", title: "SaaS Survey" },
      { url: "https://bvp.com/state-of-cloud", publisher: "Bessemer", title: "State of Cloud" },
    ]);
    expect(known.state).toBe("KNOWN");
    expect(known.independentCount).toBe(2);
    const opaqueNine = assessSourceIndependence(
      Array.from({ length: 9 }, (_, index) => ({
        url: `https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-opaque-${index}`,
      })),
    );
    expect(opaqueNine.state).toBe("INDEPENDENCE_UNKNOWN");
    expect(opaqueNine.independentCount).toBe(1);
    expect(confidenceAfterIndependence("HIGH", opaqueNine.state)).toBe("LOW");
    expect(confidenceAfterIndependence("MEDIUM", "PARTIALLY_KNOWN")).toBe("MEDIUM");
    expect(confidenceAfterIndependence("HIGH", "PARTIALLY_KNOWN")).toBe("MEDIUM");
    expect(evidenceStrengthLabel({ coverage: "INSUFFICIENT", highCount: 0, mediumCount: 0, lowCount: 0, observationCount: 0 })).toBe(
      "Not enough evidence",
    );
  });

  it("persists grounding chunk title and publisher without fabricating destination URLs", () => {
    const finding: ProviderResearchStructuredOutput["findings"][number] = {
      findingId: "meta-1",
      claim: "SMB SaaS CAC is $559.",
      signalType: "monetization_precedent",
      observedSignal: "Benchmark",
      relevance: "mixed",
      confidence: 0.5,
      grounded: true,
      inference: false,
      sourceUrls: ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-meta-1"],
      limitations: [],
    };
    const result = normalizeGroundedResearch({
      researchRunId: "run-meta",
      organizationId: "org-1",
      missionId: null,
      providerId: "gemini",
      modelId: "gemini-3.5-flash",
      researchObjective: "Infinity CMS",
      inputHash: "hash",
      structured: {
        schemaVersion: "grounded_research_v1",
        summary: "Metadata fixture.",
        findings: [finding],
        limitations: [],
        requiresMoreResearch: true,
      },
      groundingMetadata: {
        webSearchQueries: ["vertical SaaS SMB CAC"],
        groundingChunks: [
          {
            web: {
              uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-meta-1",
              title: "KeyBanc SaaS Survey",
              publisher: "KeyBanc Capital Markets",
            },
          },
        ],
      },
      tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      groundingUsage: {
        webSearchQueries: ["vertical SaaS SMB CAC"],
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
      retryMetadata: { attemptCount: 1, maxAttempts: 2, retried: false },
      rawProviderResponseStored: true,
    });
    expect(result.sources[0]?.title).toBe("KeyBanc SaaS Survey");
    expect(result.sources[0]?.publisher).toBe("KeyBanc Capital Markets");
    expect(result.sources[0]?.url).toContain("vertexaisearch.cloud.google.com");
    expect(result.sources[0]?.url).not.toContain("keybanc.com");
  });

  it("shows clustered Money pricing, evidence strength, independence, and margin explanation", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, ideaInput());
    convertFounderIdeaToCandidate(store, submission);
    const livePacket = cmsLiveV8EconomicReplayPacket(submission.id, submission.opportunityCandidateId!);
    const { grade } = analyzeFounderIdea(store, submission, { researchPacket: livePacket });
    if (!grade?.explainability) throw new Error("EXPLAINABILITY_MISSING");
    const view = buildFounderIntelligenceView(grade.explainability);
    const money = buildFounderMoneyView(view);
    expect(money.summary.selfServePlatformPricing).toMatch(/9/);
    expect(money.summary.managedVerticalPricing).toMatch(/449|1,149|1149|1,100/);
    expect(money.summary.recommendedPricingCluster).toMatch(/AI CMS|VERTICAL CMS/i);
    expect(money.summary.corePlatformPricing).not.toMatch(/\$9\s*[–-]\s*\$?2,400/);
    expect(money.presentation.evidenceStrength).toMatch(/Weak|Moderate|Strong/);
    expect(money.presentation.sourceIndependence).toBe("Unknown");
    expect(money.presentation.marginExplanation).toMatch(/Missing:/i);
    expect(money.presentation.ltvBlocker).toMatch(/margin/i);
    expect(money.summary.ltv).toMatch(/not known|unknown/i);
    expect(evidenceStrengthLabel({ coverage: "PARTIAL", highCount: 0, mediumCount: 0, lowCount: 1 })).toBe("Weak");
    const sections = founderMoneySections(view, {});
    const blob = JSON.stringify(sections);
    expect(blob).toMatch(/Self-serve platforms/);
    expect(blob).toMatch(/Evidence strength/);
    expect(blob).toMatch(/Source independence/);
    expect(blob).toMatch(/How Infinity estimated margin/);
  });

  it("replays v8 expected closure without granting BUILD, Treasury, or commercialization", () => {
    expect(revenue.coverage.pricingEvidenceStatus).toBe("PARTIAL");
    expect(revenue.revenuePerCustomer.coreRecurringARPU.low).toBeGreaterThanOrEqual(449);
    expect(revenue.revenuePerCustomer.coreRecurringARPU.high).not.toBe(2400);
    expect(bench.modeled.cac.confidence).toBe("LOW");
    expect(bench.modeled.lifetimeMonths.base).not.toBeNull();
    expect(bench.modeled.grossMargin.range.base).toBeNull();
    expect(bench.modeled.ltv.range.base).toBeNull();
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, ideaInput());
    convertFounderIdeaToCandidate(store, submission);
    const livePacket = cmsLiveV8EconomicReplayPacket(submission.id, submission.opportunityCandidateId!);
    const { grade } = analyzeFounderIdea(store, submission, { researchPacket: livePacket });
    expect(grade?.buildReady).toBe(false);
    expect(evaluateBuildReadiness({ decisionReady: true, evaluation: grade?.evaluation ?? null }).buildReady).toBe(false);
    const monetization = monetizeFromResearchPacket({
      candidate: store.candidates.get(submission.opportunityCandidateId!)!,
      packet: livePacket,
      revenueModel: revenue,
    });
    expect(unitEconomicsNumericallyKnown(monetization?.primaryPlan)).toBe(false);
    expect(provenanceGrantsBuild("COMPARABLE_MODELED")).toBe(false);
    const { store: treasury } = createGovernedStore();
    expect(() => assertFounderSpendStillTreasuryGated(treasury, submission)).not.toThrow();
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
  });

  it("does not regress v7 Hibu/Dealer Spike core ARPU", () => {
    const v7 = cmsLiveV7EconomicReplayPacket("s", "c");
    const v7Revenue = researchRevenueModel({ packet: v7, context: CMS_CONTEXT });
    expect(classifyPriceRole("Hibu local marketing retainers: $1,100–$1,500/month.", CMS_CONTEXT)).toBe("MANAGED_SERVICE_RETAINER");
    expect(v7Revenue.revenuePerCustomer.coreRecurringARPU.base).toBe(1150);
    expect(v7Revenue.revenuePerCustomer.arpuModel.managedService.low).toBe(1100);
  });
});
