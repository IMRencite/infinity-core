import { readFileSync } from "node:fs";
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
import { buildFounderIntelligenceView } from "../explainability/view";
import { buildFounderFriendlyBrief } from "../explainability/founder-brief";
import { flattenExplainabilityForHq } from "../explainability/compose";
import { founderFriendlyPrimarySections, primarySectionBlob } from "../hq/founder-intelligence-primary";
import { founderIdeaIntelligenceSections } from "../hq/intelligence-sections";
import { researchRevenueModel } from "../revenue-model-research/from-evidence";
import { modelComparableEconomics } from "../comparable-economics/from-evidence";
import {
  ECONOMIC_EVIDENCE_CLASSES,
  provenanceGrantsBuild,
  provenanceMaySatisfyBuildEconomics,
  unknownToZero,
} from "../comparable-economics/provenance";
import { researchBenchmarkEconomics } from "../benchmark-economics/from-evidence";
import { extractBenchmarkObservations } from "../benchmark-economics/extract";
import { classifyBenchmarkSource } from "../benchmark-economics/quality";
import { qualifyBenchmarks, scoreBenchmarkRelevance } from "../benchmark-economics/qualify";
import { aggregateDimension, feedsBaseCase } from "../benchmark-economics/aggregate";
import { modelComponentCac } from "../benchmark-economics/model-cac";
import {
  annualChurnFromAnnualRetention,
  lifetimeMonthsFromMonthlyChurn,
  monthlyChurnFromAnnualRetention,
  modelRetention,
} from "../benchmark-economics/model-retention";
import { modelGrossMargin } from "../benchmark-economics/model-margin";
import { ltvCacScenarios, modelLtvFromParts, paybackScenarios } from "../benchmark-economics/model-ltv";
import { benchmarkEconomicsQueries } from "../benchmark-economics/queries";
import { BENCHMARK_DIMENSIONS } from "../benchmark-economics/types";
import {
  cmsBenchmarkEconomicsAfterPacket,
  cmsConflictingBenchmarkPacket,
  cmsUnknownBenchmarkPacket,
  cmsWeakEnterpriseBenchmarkPacket,
  infinityCmsLiveV5ReplayPacket,
} from "../integrity-fixtures";
import { createGovernedStore, ORG_A } from "@/lib/infinity/treasury/__tests__/fixtures";
import {
  evaluateBenchmarkGapFillEligibility,
  loadResearchCoveragePolicy,
} from "@/lib/infinity/research/coverage";
import { buildResearchUserPrompt } from "@/lib/infinity/research/prompts";
import type { FounderResearchFinding, FounderResearchPacket } from "../research-packet";
import type { FounderIdeaSubmissionInput } from "../types";

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

function input(overrides: Partial<FounderIdeaSubmissionInput> = {}): FounderIdeaSubmissionInput {
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
    idempotencyKey: "benchmark-economics",
    ...overrides,
  };
}

function finding(
  claim: string,
  extra?: Partial<FounderResearchFinding>,
): FounderResearchFinding {
  return {
    findingId: extra?.findingId ?? `f-${Math.random().toString(16).slice(2)}`,
    dimension: extra?.dimension ?? "capital_efficiency",
    claim,
    polarity: extra?.polarity ?? "mixed",
    grounded: extra?.grounded ?? true,
    confidence: extra?.confidence ?? 0.7,
    sourceUrls: extra?.sourceUrls ?? ["https://www.keybanc.com/reports/fixture"],
    limitations: extra?.limitations ?? [],
    verifiesFounderCompetitor: extra?.verifiesFounderCompetitor ?? null,
  };
}

function packetFrom(findings: FounderResearchFinding[]): FounderResearchPacket {
  return {
    researchRunId: "run-bench",
    candidateId: "cand",
    submissionId: "sub",
    grounded: true,
    failed: false,
    failureCode: null,
    summary: "fixture",
    findings,
    sources: [{ url: findings[0]?.sourceUrls[0] ?? "https://example.com", title: "t", domain: "example.com" }],
    competitorLeads: [],
    verifiedCompetitors: [],
    monetizationLayers: { category: "SUPPORTED", ideaSpecific: "UNKNOWN", unitEconomics: "UNKNOWN" },
    requiresMoreResearch: true,
  };
}

describe("BENCHMARK_ECONOMICS_V1 provenance hierarchy", () => {
  it("preserves distinct classes and never grants BUILD except OBSERVED", () => {
    expect(ECONOMIC_EVIDENCE_CLASSES).toEqual([
      "OBSERVED",
      "VALIDATION_ESTIMATE",
      "COMPANY_COMPARABLE",
      "CATEGORY_BENCHMARK",
      "ADJACENT_BENCHMARK",
      "COMPARABLE_MODELED",
      "SCENARIO_MODEL",
      "FOUNDER_HYPOTHESIS",
      "UNKNOWN",
    ]);
    expect(provenanceMaySatisfyBuildEconomics("OBSERVED")).toBe(true);
    for (const cls of ECONOMIC_EVIDENCE_CLASSES.filter((item) => item !== "OBSERVED")) {
      expect(provenanceGrantsBuild(cls)).toBe(false);
      expect(provenanceMaySatisfyBuildEconomics(cls)).toBe(false);
    }
    expect(unknownToZero(null)).toBe(false);
  });
});

describe("BENCHMARK_ECONOMICS_V1 extraction / quality / recency / relevance", () => {
  it("extracts CAC, CPC, CPL, conversion, churn, margin, and sales cycle without mixing funnels", () => {
    const observations = extractBenchmarkObservations([
      finding("Category CAC is $900-$1,100"),
      finding("Google Ads CPC is $4.50"),
      finding("Paid search CPL is $60"),
      finding("Visitor-to-lead conversion is 4%"),
      finding("Lead-to-customer conversion is 20%"),
      finding("Demo-to-close conversion is 30%"),
      finding("Trial-to-paid conversion is 12%"),
      finding("SMB monthly logo churn is 3%"),
      finding("Annual logo retention is 80%"),
      finding("Hosted website software gross margin 62%"),
      finding("SMB website package sales cycle is 30 days"),
      finding("Partner commission 20%"),
      finding("Sales labor cost $250 plus list cost $40"),
    ]);
    const dimensions = new Set(observations.map((item) => item.dimension));
    expect(dimensions.has("customer_acquisition_cost")).toBe(true);
    expect(dimensions.has("cost_per_click")).toBe(true);
    expect(dimensions.has("cost_per_lead")).toBe(true);
    expect(dimensions.has("visitor_to_lead_conversion")).toBe(true);
    expect(dimensions.has("lead_to_customer_conversion")).toBe(true);
    expect(dimensions.has("demo_to_close_conversion")).toBe(true);
    expect(dimensions.has("trial_to_paid_conversion")).toBe(true);
    expect(dimensions.has("monthly_churn")).toBe(true);
    expect(dimensions.has("retention_rate")).toBe(true);
    expect(dimensions.has("gross_margin")).toBe(true);
    expect(dimensions.has("sales_cycle_days")).toBe(true);
    expect(BENCHMARK_DIMENSIONS).toContain("customer_acquisition_cost");
    expect(observations.find((item) => item.dimension === "monthly_churn")?.churnKind).toBe("monthly_logo");
    expect(observations.find((item) => item.dimension === "retention_rate")?.churnKind).toBe("annual_logo");
  });

  it("classifies source quality and recency", () => {
    expect(classifyBenchmarkSource("https://www.sec.gov/Archives/edgar/data/1/10-k.htm", "10-K filing")).toBe(
      "PUBLIC_COMPANY_REPORTING",
    );
    expect(classifyBenchmarkSource("https://www.gartner.com/en/doc", "Gartner benchmark study")).toMatch(
      /RECOGNIZED_RESEARCH_FIRM|CREDIBLE_BENCHMARK_STUDY/,
    );
    expect(classifyBenchmarkSource("https://medium.com/ai-generated-listicle", "AI generated listicle")).toBe(
      "AI_GENERATED_LISTICLE",
    );
    const recent = extractBenchmarkObservations([finding("2024 KeyBanc CAC is $900")]);
    const old = extractBenchmarkObservations([finding("2012 category CAC is $900")]);
    expect(recent[0]?.publishedAt).toBe("2024");
    expect(old[0]?.publishedAt).toBe("2012");
    const scoredOld = scoreBenchmarkRelevance(old[0]!, CMS_CONTEXT);
    expect(scoredOld.relevanceFactors.recency).toBe(false);
  });

  it("distinguishes company comparable, category, and adjacent benchmarks", () => {
    const company = extractBenchmarkObservations([
      finding("Northstar Sites reported CAC of $1,100 in official disclosures", {
        verifiesFounderCompetitor: "Northstar Sites",
      }),
    ]);
    const category = extractBenchmarkObservations([finding("SMB website-as-a-service category CAC benchmark is $900")]);
    const adjacent = extractBenchmarkObservations([finding("Adjacent nearby category CAC benchmark is $2,400")]);
    expect(company[0]?.provenance).toBe("COMPANY_COMPARABLE");
    expect(category[0]?.provenance).toBe("CATEGORY_BENCHMARK");
    expect(adjacent[0]?.provenance).toBe("ADJACENT_BENCHMARK");
  });

  it("rejects enterprise SaaS CAC for an SMB venture and does not let it feed base", () => {
    const packet = cmsWeakEnterpriseBenchmarkPacket("s", "c");
    const model = researchBenchmarkEconomics({ packet, context: CMS_CONTEXT });
    const weak = model.qualified.find((item) => item.dimension === "customer_acquisition_cost");
    expect(weak?.relevance === "REJECTED" || weak?.relevance === "LOW_RELEVANCE").toBe(true);
    expect(feedsBaseCase(weak!)).toBe(false);
    expect(model.modeled.cac.range.base).toBeNull();
    expect(model.coverage.cac).toBe("BENCHMARK_INSUFFICIENT");
  });
});

describe("BENCHMARK_ECONOMICS_V1 CAC modeling", () => {
  it("models paid-search CAC from CPC and conversion, not inverted bounds", () => {
    const observations = extractBenchmarkObservations([
      finding("Google Ads CPC is $3.50-$7"),
      finding("Visitor-to-lead conversion is 3%-6%"),
      finding("Lead-to-customer conversion is 15%-25%"),
    ]);
    const qualified = qualifyBenchmarks(observations, CMS_CONTEXT);
    const component = modelComponentCac(
      Object.fromEntries(
        ["cost_per_click", "visitor_to_lead_conversion", "lead_to_customer_conversion"].map((dimension) => [
          dimension,
          aggregateDimension(dimension as "cost_per_click", qualified),
        ]),
      ),
    );
    expect(component.used).toBe(true);
    expect(component.channel).toBe("paid_search");
    expect(component.range.low).toBeLessThan(component.range.high!);
    expect(component.range.base).toBeGreaterThan(100);
  });

  it("models outbound and partner CAC with channel-specific formulas", () => {
    const outbound = extractBenchmarkObservations([
      finding("Outbound sales labor cost $250"),
      finding("Outbound close rate is 10%"),
    ]);
    const partner = extractBenchmarkObservations([
      finding("Partner commission 20%"),
      finding("Annual contract value ACV is $6,000"),
    ]);
    const outModel = modelComponentCac({
      sales_labor_cost: aggregateDimension("sales_labor_cost", qualifyBenchmarks(outbound, CMS_CONTEXT)),
      sales_close_rate: aggregateDimension("sales_close_rate", qualifyBenchmarks(outbound, CMS_CONTEXT)),
    });
    expect(outModel.channel).toBe("outbound");
    expect(outModel.range.base).toBe(2500);
    const partnerModel = modelComponentCac({
      partner_fee: aggregateDimension("partner_fee", qualifyBenchmarks(partner, CMS_CONTEXT)),
      ACV: aggregateDimension("ACV", qualifyBenchmarks(partner, CMS_CONTEXT)),
    });
    expect(partnerModel.channel).toBe("partnership");
    expect(partnerModel.range.base).toBe(1200);
  });

  it("uses component CAC when direct CAC is missing and stays UNKNOWN without trustworthy inputs", () => {
    const componentOnly = packetFrom([
      finding("SMB Google Ads CPC is $5"),
      finding("Visitor-to-lead conversion is 5%"),
      finding("Lead-to-customer conversion is 20%"),
    ]);
    const withComponent = researchBenchmarkEconomics({ packet: componentOnly, context: CMS_CONTEXT });
    expect(withComponent.componentCac.used).toBe(true);
    expect(withComponent.modeled.cac.range.base).toBeCloseTo(500, 0);
    const empty = researchBenchmarkEconomics({
      packet: cmsUnknownBenchmarkPacket("s", "c"),
      context: CMS_CONTEXT,
    });
    expect(empty.modeled.cac.range.base).toBeNull();
    expect(empty.modeled.cac.provenance).toBe("UNKNOWN");
    expect(empty.modeled.cac.calculation).toMatch(/UNKNOWN/);
  });
});

describe("BENCHMARK_ECONOMICS_V1 retention, margin, LTV, payback", () => {
  it("keeps monthly and annual churn distinct and converts only valid retention math", () => {
    expect(monthlyChurnFromAnnualRetention(0.8)).toBeCloseTo(1 - 0.8 ** (1 / 12));
    expect(annualChurnFromAnnualRetention(0.8)).toBeCloseTo(0.2);
    expect(lifetimeMonthsFromMonthlyChurn(0.04)).toBeCloseTo(25);
    const mixed = modelRetention({
      aggregations: {},
      qualified: qualifyBenchmarks(
        extractBenchmarkObservations([
          finding("Monthly logo churn is 3%"),
          finding("Monthly revenue churn is 8%"),
        ]),
        CMS_CONTEXT,
      ),
    });
    expect(mixed.mixedIncompatible).toBe(true);
    expect(mixed.lifetimeMonths.base).toBeNull();
  });

  it("models hybrid margin without a generic 80% SaaS assumption", () => {
    const qualified = qualifyBenchmarks(
      extractBenchmarkObservations([
        finding("Hosted website software gross margin 60%-70%"),
        finding("Managed SEO/content service gross margin 40%-50%"),
      ]),
      CMS_CONTEXT,
    );
    const margin = modelGrossMargin(qualified);
    expect(margin.usedGenericSaas80).toBe(false);
    expect(margin.software.base).toBeGreaterThan(0.5);
    expect(margin.service.base).toBeLessThan(0.55);
    expect(margin.blended.base).toBeGreaterThan(0.4);
    expect(margin.blended.base).toBeLessThan(0.8);
  });

  it("computes conservative/base/upside LTV-CAC and contribution payback", () => {
    const ltv = modelLtvFromParts({
      monthlyPrice: { low: 100, base: 200, high: 300 },
      grossMargin: { low: 0.5, base: 0.6, high: 0.7 },
      lifetimeMonths: { low: 20, base: 30, high: 40 },
    });
    expect(ltv.formula).toMatch(/monthly revenue × gross margin × expected lifetime/);
    expect(ltv.range.base).toBe(3600);
    const ratios = ltvCacScenarios(ltv.range, { low: 400, base: 800, high: 1200 });
    expect(ratios.conservative).toBeCloseTo(1000 / 1200);
    expect(ratios.base).toBeCloseTo(3600 / 800);
    expect(ratios.upside).toBeCloseTo(8400 / 400);
    const payback = paybackScenarios({
      cac: { low: 400, base: 800, high: 1200 },
      monthlyPrice: { low: 100, base: 200, high: 300 },
      grossMargin: { low: 0.5, base: 0.6, high: 0.7 },
    });
    expect(payback.base).toBeCloseTo(6.7, 1);
    expect(payback.conservative).toBeGreaterThan(payback.upside!);
  });
});

describe("BENCHMARK_ECONOMICS_V1 aggregation, outliers, conflict, dedupe", () => {
  it("rejects the $18,000 outlier and uses a robust center on the after fixture", () => {
    const packet = cmsBenchmarkEconomicsAfterPacket("s", "c");
    const model = researchBenchmarkEconomics({
      packet,
      context: CMS_CONTEXT,
      revenueModel: researchRevenueModel({ packet, context: CMS_CONTEXT }),
    });
    const cacAgg = model.aggregations.customer_acquisition_cost!;
    expect(cacAgg.sampleCount).toBeGreaterThanOrEqual(4);
    expect(cacAgg.rejectedOutliers.some((item) => (item.range.base ?? 0) >= 18000)).toBe(true);
    expect(cacAgg.acceptedCount).toBeGreaterThanOrEqual(4);
    expect(cacAgg.method === "median" || cacAgg.method === "weighted_median").toBe(true);
    expect(cacAgg.acceptedRange.low).toBeGreaterThanOrEqual(700);
    expect(cacAgg.acceptedRange.high).toBeLessThanOrEqual(1400);
    expect(cacAgg.base).toBeGreaterThanOrEqual(900);
    expect(cacAgg.base).toBeLessThanOrEqual(1200);
    const hosts = new Set(model.qualified.filter((item) => item.dimension === "customer_acquisition_cost").map((item) => item.sourceUrl));
    expect(hosts.size).toBeGreaterThanOrEqual(4);
  });

  it("dedupes repeated underlying statistics", () => {
    const observations = extractBenchmarkObservations([
      finding("Category CAC is $900", { sourceUrls: ["https://www.keybanc.com/a"] }),
      finding("Category CAC is $900", { sourceUrls: ["https://www.keybanc.com/b"] }),
    ]);
    const qualified = qualifyBenchmarks(observations, CMS_CONTEXT);
    expect(qualified.filter((item) => item.dimension === "customer_acquisition_cost")).toHaveLength(1);
  });

  it("surfaces conflict instead of silently averaging", () => {
    const packet = cmsConflictingBenchmarkPacket("s", "c");
    const model = researchBenchmarkEconomics({ packet, context: CMS_CONTEXT });
    const cac = model.aggregations.customer_acquisition_cost!;
    expect(cac.conflict).toBe(true);
    expect(cac.confidence).toBe("LOW");
    expect((cac.acceptedRange.high ?? 0) / (cac.acceptedRange.low ?? 1)).toBeGreaterThanOrEqual(2.5);
    const mean = 937.5;
    expect(cac.conflictWhy).toMatch(/disagree/);
    expect(cac.acceptedRange.low).not.toBe(mean);
    expect(cac.acceptedRange.high).not.toBe(mean);
  });
});

describe("BENCHMARK_ECONOMICS_V1 CMS before / after + BUILD safety", () => {
  it("CMS v5 before fixture stays unknown on actual and benchmark economics", () => {
    const packet = infinityCmsLiveV5ReplayPacket("s", "c");
    const model = researchBenchmarkEconomics({ packet, context: CMS_CONTEXT });
    expect(model.observed.cac).toBe("UNKNOWN");
    expect(model.observed.ltv).toBe("UNKNOWN");
    expect(model.modeled.cac.range.base).toBeNull();
    expect(model.coverage.cac).toBe("BENCHMARK_INSUFFICIENT");
    expect(model.coverage.retention).toBe("BENCHMARK_INSUFFICIENT");
    expect(model.coverage.grossMargin).toBe("BENCHMARK_INSUFFICIENT");
  });

  it("after fixture models ranges, keeps observed UNKNOWN, and cannot BUILD", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "after" }));
    convertFounderIdeaToCandidate(store, submission);
    const packet = cmsBenchmarkEconomicsAfterPacket(submission.id, submission.opportunityCandidateId!);
    const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
    const revenue = researchRevenueModel({ packet, context: CMS_CONTEXT });
    const bench = grade?.benchmarkEconomics ?? researchBenchmarkEconomics({ packet, context: CMS_CONTEXT, revenueModel: revenue });
    expect(bench.modeled.cac.range.low).not.toBeNull();
    expect(bench.modeled.cac.range.high).not.toBeNull();
    expect(bench.modeled.cac.range.base).toBeGreaterThan(0);
    expect(bench.modeled.ltv.range.base).toBeGreaterThan(0);
    expect(bench.ltvCacScenarios.conservative).not.toBeNull();
    expect(bench.ltvCacScenarios.base).not.toBeNull();
    expect(bench.ltvCacScenarios.upside).not.toBeNull();
    expect(bench.ltvCacScenarios.conservative!).toBeLessThanOrEqual(bench.ltvCacScenarios.base!);
    expect(bench.ltvCacScenarios.base!).toBeLessThanOrEqual(bench.ltvCacScenarios.upside!);
    expect(bench.modeled.grossMargin.range.base).toBeGreaterThan(0.4);
    expect(bench.modeled.payback.range.base).toBeGreaterThan(0);
    expect(bench.attractiveness).toBe("PROMISING_BUT_UNVALIDATED");
    expect(bench.modeled.cac.confidence === "MEDIUM" || bench.modeled.cac.confidence === "HIGH").toBe(true);
    expect(bench.modeled.cac.provenance).not.toBe("OBSERVED");
    expect(bench.observed.cac).toBe("UNKNOWN");
    expect(bench.buildImplication.companyComparableGrantsBuild).toBe(false);
    expect(bench.buildImplication.categoryBenchmarkGrantsBuild).toBe(false);
    expect(bench.buildImplication.adjacentBenchmarkGrantsBuild).toBe(false);
    expect(bench.buildImplication.comparableModeledGrantsBuild).toBe(false);
    expect(bench.buildImplication.scenarioModelGrantsBuild).toBe(false);
    const monetization = monetizeFromResearchPacket({
      candidate: store.candidates.get(submission.opportunityCandidateId!)!,
      packet,
    });
    expect(monetization?.primaryPlan?.estimatedCAC).toBeNull();
    expect(monetization?.primaryPlan?.estimatedLTV).toBeNull();
    expect(unitEconomicsNumericallyKnown(monetization?.primaryPlan)).toBe(false);
    expect(grade?.buildReady).toBe(false);
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
    expect(evaluateBuildReadiness({ decisionReady: true, evaluation: grade?.evaluation ?? null }).buildReady).toBe(false);
    const economics = modelComparableEconomics({ packet, context: CMS_CONTEXT, layers: packet.monetizationLayers, revenueModel: revenue, benchmarkEconomics: bench });
    expect(economics.buildImplication.modeledSatisfiesBuild).toBe(false);
    expect(economics.health).toBe("PROMISING_BUT_UNVALIDATED");
  });
});

describe("BENCHMARK_ECONOMICS_V1 founder UX + validation", () => {
  it("separates actual vs estimated and keeps sources inspectable", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "ux" }));
    convertFounderIdeaToCandidate(store, submission);
    const packet = cmsBenchmarkEconomicsAfterPacket(submission.id, submission.opportunityCandidateId!);
    const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
    const explain = grade?.explainability ?? composeFounderExplainability({ submission, grade: grade!, packet, layers: packet.monetizationLayers });
    const view = buildFounderIntelligenceView(explain);
    const metadata = flattenExplainabilityForHq(explain);
    const brief = buildFounderFriendlyBrief(view, metadata);
    expect(brief.market.hasEstimates).toBe(true);
    expect(brief.market.explanation).toMatch(/do not have actual venture economics/i);
    expect(brief.numbers.actualCac).toBe("Not measured yet");
    expect(brief.numbers.actualLtv).toBe("Not measured yet");
    expect(brief.numbers.explanation).toMatch(/don't know the actual numbers yet/i);
    expect(brief.numbers.cac).toMatch(/\$/);
    expect(brief.numbers.cacExplanation).toMatch(/still unknown/i);
    expect(brief.numbers.ltvExplanation).toMatch(/lifetime value/i);
    expect(brief.numbers.marginExplanation).toMatch(/gross margin/i);
    expect(brief.market.mainRisk.length).toBeGreaterThan(8);
    expect(brief.market.nextToProve).toMatch(/acquire|CAC|retention/i);
    expect(brief.market.sources.length).toBeGreaterThan(0);
    expect(brief.market.validationTargets.length).toBeGreaterThan(0);
    expect(JSON.stringify(brief.market)).not.toMatch(/automatic spend|spend money/i);
    const blob = primarySectionBlob(founderFriendlyPrimarySections(view, metadata));
    expect(blob).toContain("Money");
    expect(blob).not.toContain("What The Market Says About The Numbers");
    expect(blob.match(/UNKNOWN/g)?.length ?? 0).toBe(0);
    const money = founderIdeaIntelligenceSections(metadata).filter((section) => section.id.startsWith("money-"));
    expect(money.some((section) => section.id === "money-summary")).toBe(true);
    expect(money.some((section) => /Not measured yet/.test(JSON.stringify(section)))).toBe(true);
    const advanced = founderIdeaIntelligenceSections(metadata);
    expect(advanced.some((section) => section.id === "benchmark-economics-system")).toBe(true);
    expect(advanced.some((section) => section.id === "benchmark-economics-system" && section.rows.some((row) => /COMPARABLE_MODELED|CATEGORY_BENCHMARK|UNKNOWN/.test(row.value)))).toBe(true);
  });
});

describe("BENCHMARK_ECONOMICS_V1 gap-fill, provider neutrality, cost, regressions", () => {
  it("plans bounded benchmark gap-fill without CMS-hardcoded queries", () => {
    const policy = loadResearchCoveragePolicy();
    expect(policy.maxBenchmarkGapFillPhases).toBe(1);
    expect(policy.maxBenchmarkGapFillQueries).toBe(5);
    expect(policy.maxBenchmarkGapFillQueryHardCap).toBe(8);
    const queries = benchmarkEconomicsQueries(
      { ideaTitle: "Local booking software", targetCustomer: "dentists", competitorLeads: ["Acme"] },
      ["cac", "churn"],
    );
    expect(queries.length).toBeGreaterThan(0);
    expect(queries.every((item) => !/Infinity CMS/i.test(item.query))).toBe(true);
    expect(queries.some((item) => /dentists/i.test(item.query))).toBe(true);
    const prompt = buildResearchUserPrompt("Collect evidence.", {
      phase: "benchmark_economics_gap_fill",
      plannedQueries: queries.map((item) => item.query),
    });
    expect(prompt).toMatch(/BENCHMARK-ECONOMICS GAP-FILL/);
    expect(prompt).not.toMatch(/\$1,100 CAC for Infinity CMS/);
    const eligible = evaluateBenchmarkGapFillEligibility({
      materialCoverageSufficient: true,
      evidence: [{ claim: "Northstar Sites plans list $199 per month.", grounded: true }],
      sources: [{ url: "https://example.com/northstar" }],
      policy,
      seed: { ideaTitle: "Local booking software", targetCustomer: "dentists" },
      issuedQueries: [],
      benchmarkGapFillPhasesUsed: 0,
      recordedCostUsd: 0.01,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(eligible.eligible).toBe(true);
    if (eligible.eligible) expect(eligible.queries.length).toBeLessThanOrEqual(8);
    const limited = evaluateBenchmarkGapFillEligibility({
      materialCoverageSufficient: true,
      evidence: [{ claim: "Northstar Sites plans list $199 per month.", grounded: true }],
      sources: [{ url: "https://example.com/northstar" }],
      policy,
      issuedQueries: [],
      benchmarkGapFillPhasesUsed: 1,
      recordedCostUsd: 0.01,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(limited.eligible).toBe(false);
    expect(limited.reason).toBe("BENCHMARK_GAP_FILL_LIMIT");
  });

  it("does not treat unknown research cost as zero and stops when budget is exhausted", () => {
    const limited = evaluateBenchmarkGapFillEligibility({
      materialCoverageSufficient: true,
      evidence: [{ claim: "Northstar Sites plans list $199 per month.", grounded: true }],
      sources: [{ url: "https://example.com/northstar" }],
      policy: { ...loadResearchCoveragePolicy(), maxEstimatedCostUsd: 0.02 },
      issuedQueries: [],
      benchmarkGapFillPhasesUsed: 0,
      recordedCostUsd: 0.05,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(limited.reason).toBe("BENCHMARK_BUDGET_EXHAUSTED");
    expect(unknownToZero(null)).toBe(false);
  });

  it("production benchmark logic has no hardcoded Infinity CMS economics", () => {
    const files = [
      "lib/infinity/founder-idea-lab/benchmark-economics/model-cac.ts",
      "lib/infinity/founder-idea-lab/benchmark-economics/model-ltv.ts",
      "lib/infinity/founder-idea-lab/benchmark-economics/model-margin.ts",
      "lib/infinity/founder-idea-lab/benchmark-economics/from-evidence.ts",
      "lib/infinity/founder-idea-lab/benchmark-economics/queries.ts",
    ];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/Infinity CMS CAC|CMS-specific CAC|\$1,100/);
      expect(src).not.toMatch(/80% SaaS margin is assumed/);
    }
  });

  it("does not open Treasury or commercialization from modeled benchmarks", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "treasury" }));
    convertFounderIdeaToCandidate(store, submission);
    const packet = cmsBenchmarkEconomicsAfterPacket(submission.id, submission.opportunityCandidateId!);
    const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
    expect(grade?.evaluation?.decision).not.toBe("BUILD");
    expect(grade?.buildReady).toBe(false);
    const { store: treasury } = createGovernedStore();
    const gate = assertFounderSpendStillTreasuryGated(treasury, submission);
    expect(gate.bypassed).toBe(false);
    expect(gate.authorized).toBe(false);
  });
});
