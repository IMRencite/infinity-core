import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HQOutputDetail } from "@/components/dashboard/operator-console/artifacts/hq-output-detail";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import { createGovernedStore } from "@/lib/infinity/treasury/__tests__/fixtures";
import { analyzeFounderIdea } from "../analyze";
import { routeFounderBuild } from "../build-route";
import { convertFounderIdeaToCandidate } from "../convert";
import { provenanceGrantsBuild } from "../comparable-economics/provenance";
import {
  buildEducatedEconomicsModel,
  emptyEducatedEconomicsModel,
  presentEducatedEstimates,
  scenarioCacFromPartialChain,
  scenarioMarginAssumptions,
} from "../educated-estimates";
import { flattenExplainabilityForHq } from "../explainability/compose";
import { buildFounderFriendlyBrief } from "../explainability/founder-brief";
import { buildFounderMoneyView } from "../explainability/money-view";
import { buildFounderIntelligenceView } from "../explainability/view";
import { emptyBenchmarkEconomics, researchBenchmarkEconomics } from "../benchmark-economics/from-evidence";
import { buildFounderIdeaArtifacts } from "../hq/artifacts";
import { founderFriendlyPrimarySections, primarySectionBlob } from "../hq/founder-intelligence-primary";
import { founderMoneySections } from "../hq/founder-money-sections";
import { cmsLiveV8EconomicReplayPacket } from "../integrity-fixtures";
import {
  buildProductAdvantage,
  classifyCapability,
  classifyTableStake,
  clusterPainObservations,
  extractCompetitorStrengths,
  extractPainObservations,
  PRODUCT_ADVANTAGE_AUTHORITY,
} from "../product-advantage";
import { researchRevenueModel } from "../revenue-model-research/from-evidence";
import { evaluateBuildReadiness } from "../readiness";
import type { FounderResearchFinding, FounderResearchPacket } from "../research-packet";
import { FounderIdeaStore } from "../store";
import { submitFounderIdea } from "../submit";
import { assertFounderSpendStillTreasuryGated } from "../treasury-gate";
import type { FounderIdeaSubmissionInput } from "../types";
import type { BenchmarkAggregation, BenchmarkDimension } from "../benchmark-economics/types";

const CMS_CONTEXT = {
  title: "Infinity CMS",
  description: "Build a cms for businesses that they would fill out a knowledge base when they sign up",
  targetCustomer: "SMB owners",
  problem: "Local businesses need rankable sites",
  proposedSolution: "AI CMS with SEO/AEO publishing",
  businessModelHypothesis: "Monthly website package plus setup and optional SEO/content services",
  pricingHypothesis: "cost per month depending on your package",
};

function ideaInput(key = "market-gaps-v1"): FounderIdeaSubmissionInput {
  return {
    organizationId: "org-market-gaps-v1",
    submittedByUserId: "user-a",
    title: CMS_CONTEXT.title,
    description: CMS_CONTEXT.description,
    targetCustomer: CMS_CONTEXT.targetCustomer,
    problem: CMS_CONTEXT.problem,
    proposedSolution: CMS_CONTEXT.proposedSolution,
    businessModelHypothesis: CMS_CONTEXT.businessModelHypothesis,
    pricingHypothesis: CMS_CONTEXT.pricingHypothesis,
    idempotencyKey: key,
  };
}

function finding(
  dimension: FounderResearchFinding["dimension"],
  polarity: FounderResearchFinding["polarity"],
  claim: string,
  extra?: Partial<FounderResearchFinding>,
): FounderResearchFinding {
  return {
    findingId: extra?.findingId ?? claim.slice(0, 24).replace(/\W+/g, "-"),
    dimension,
    claim,
    polarity,
    grounded: extra?.grounded ?? true,
    confidence: extra && "confidence" in extra ? extra.confidence ?? null : 0.7,
    sourceUrls: extra?.sourceUrls ?? ["https://example.com/research"],
    limitations: extra?.limitations ?? [],
    verifiesFounderCompetitor: extra?.verifiesFounderCompetitor ?? null,
  };
}

function painPacket(submissionId: string, candidateId: string): FounderResearchPacket {
  const base = cmsLiveV8EconomicReplayPacket(submissionId, candidateId);
  return {
    ...base,
    findings: [
      ...base.findings,
      finding(
        "competition",
        "negative",
        "Generic site builders create thin local-service pages that fail to rank.",
        { verifiesFounderCompetitor: "Wix", sourceUrls: ["https://example.com/reviews-thin"] },
      ),
      finding(
        "competition",
        "negative",
        "Owners complain they can't edit generated pages and have limited control.",
        { verifiesFounderCompetitor: "Wix", sourceUrls: ["https://example.com/reviews-edit"] },
      ),
      finding(
        "pricing",
        "negative",
        "Hibu's expensive bundled retainer forces small businesses to pay for services they may not need.",
        { verifiesFounderCompetitor: "Hibu", sourceUrls: ["https://example.com/hibu-bundle"] },
      ),
      finding(
        "competition",
        "negative",
        "Reporting is opaque and owners can't see leads or ROI.",
        { verifiesFounderCompetitor: "Hibu", sourceUrls: ["https://example.com/hibu-reporting"] },
      ),
      finding(
        "competition",
        "positive",
        "Wix offers templates, mobile editing, hosting, analytics, and a dashboard.",
        { verifiesFounderCompetitor: "Wix", sourceUrls: ["https://example.com/wix-strengths"] },
      ),
    ],
  };
}

function agg(dimension: BenchmarkDimension, base: number, unitRange?: { low: number; high: number }): BenchmarkAggregation {
  const range = { low: unitRange?.low ?? base, base, high: unitRange?.high ?? base };
  return {
    dimension,
    sampleCount: 1,
    acceptedCount: 1,
    rejectedCount: 0,
    rawRange: range,
    acceptedRange: range,
    base,
    method: "single_observation",
    rejectedOutliers: [],
    conflict: false,
    conflictWhy: null,
    sourceCount: 1,
    independentSourceCount: 1,
    provenance: "CATEGORY_BENCHMARK",
    confidence: "LOW",
  };
}

describe("FOUNDER MARKET GAPS + EDUCATED ECONOMIC ESTIMATES V1", () => {
  const v8 = cmsLiveV8EconomicReplayPacket("s", "c");
  const revenue = researchRevenueModel({ packet: v8, context: CMS_CONTEXT });
  const bench = researchBenchmarkEconomics({ packet: v8, context: CMS_CONTEXT, revenueModel: revenue });
  const estimates = bench.educatedEstimates ?? buildEducatedEconomicsModel({ revenueModel: revenue, benchmark: bench });

  it("keeps observed fields untouched and does not write scenario values into canonical modeled margin/LTV", () => {
    expect(bench.observed.cac).toBe("UNKNOWN");
    expect(bench.observed.ltv).toBe("UNKNOWN");
    expect(bench.modeled.grossMargin.range.base).toBeNull();
    expect(bench.modeled.ltv.range.base).toBeNull();
    expect(estimates.observedUntouched).toEqual({
      cac: "UNKNOWN",
      ltv: "UNKNOWN",
      margin: "UNKNOWN",
      conversion: "UNKNOWN",
      retention: "UNKNOWN",
    });
    expect(estimates.grantsBuild).toBe(false);
    expect(estimates.ltv?.grantsBuild).toBe(false);
    expect(estimates.cac.selected?.grantsBuild).toBe(false);
    expect(estimates.margin.unknownCostsTreatedAsZero).toBe(false);
  });

  it("falls back to Infinity's best estimate when observed values are missing", () => {
    expect(estimates.coreMonthly?.displayRange).toMatch(/\$/);
    expect(estimates.cac.selected?.displayRange).toMatch(/\$/);
    expect(estimates.retention?.displayRange).toMatch(/month/i);
    expect(estimates.margin.selected?.provenance).toBe("SCENARIO_MODEL");
    expect(estimates.margin.selected?.whatIsIt).toMatch(/contribution margin/i);
    expect(estimates.ltv?.displayRange).toMatch(/\$/);
    expect(estimates.ltvCac?.base).not.toBeNull();
    expect(estimates.payback?.usesContributionMargin).toBe(true);
    const presented = presentEducatedEstimates(estimates);
    expect(presented.heading).toBe("Infinity's Best Estimate");
    expect(presented.rows.find((row) => row.metric === "LTV")?.actual).toBe("Not measured yet");
    expect(presented.rows.find((row) => row.metric === "Gross / contribution margin")?.bestEstimate).toMatch(/%/);
    expect(presented.grantsBuild).toBe(false);
  });

  it("estimates CAC from direct benchmark, component, and scenario paths", () => {
    expect(estimates.cac.directBenchmark).not.toBeNull();
    expect(estimates.cac.selected?.provenance).not.toBe("SCENARIO_MODEL");
    const componentOverlay = buildEducatedEconomicsModel({
      revenueModel: revenue,
      benchmark: {
        ...bench,
        componentCac: { used: true, channel: "paid_search", formula: "CPC ÷ (visitor→lead × close)", range: { low: 180, base: 300, high: 480 } },
      },
    });
    expect(componentOverlay.cac.componentModel?.provenance).toBe("COMPONENT_MODEL");
    expect(componentOverlay.cac.componentModel?.displayRange).toMatch(/\$/);
    const scenario = scenarioCacFromPartialChain({
      cost_per_click: agg("cost_per_click", 2.5, { low: 1.8, high: 4 }),
    });
    expect(scenario).not.toBeNull();
    expect(scenario?.formula).toMatch(/CPC/i);
    expect(scenario?.assumptions.some((item) => item.label === "MODELED_ASSUMPTION" && item.name === "visitor→lead")).toBe(true);
    expect(scenario?.assumptions.some((item) => item.label === "BENCHMARK" && item.name === "CPC")).toBe(true);
    const scenarioOnly = buildEducatedEconomicsModel({
      revenueModel: revenue,
      benchmark: {
        ...bench,
        modeled: {
          ...bench.modeled,
          cac: { ...bench.modeled.cac, range: { low: null, base: null, high: null }, confidence: "NONE", provenance: "UNKNOWN" },
        },
        componentCac: { used: false, channel: null, formula: "", range: { low: null, base: null, high: null } },
        aggregations: { ...bench.aggregations, cost_per_click: agg("cost_per_click", 2.5) },
      },
    });
    expect(scenarioOnly.cac.scenarioModel?.provenance).toBe("SCENARIO_MODEL");
    expect(scenarioOnly.cac.selected?.provenance).toBe("SCENARIO_MODEL");
    expect(scenarioOnly.cac.selected?.assumptions.some((item) => item.label === "MODELED_ASSUMPTION")).toBe(true);
  });

  it("estimates margin from direct, component, and disclosed scenario paths without zeroing unknown costs", () => {
    const direct = buildEducatedEconomicsModel({
      revenueModel: revenue,
      benchmark: {
        ...bench,
        modeled: {
          ...bench.modeled,
          grossMargin: {
            ...bench.modeled.grossMargin,
            range: { low: 0.55, base: 0.65, high: 0.75 },
            confidence: "MEDIUM",
            provenance: "CATEGORY_BENCHMARK",
            calculation: "category gross margin",
          },
        },
      },
    });
    expect(direct.margin.directBenchmark?.provenance).toBe("CATEGORY_BENCHMARK");
    expect(direct.margin.selected?.provenance).toBe("CATEGORY_BENCHMARK");
    const component = buildEducatedEconomicsModel({
      revenueModel: revenue,
      benchmark: {
        ...bench,
        modeled: {
          ...bench.modeled,
          contributionMargin: {
            ...bench.modeled.contributionMargin,
            range: { low: 0.42, base: 0.51, high: 0.6 },
            confidence: "LOW",
            provenance: "COMPARABLE_MODELED",
            calculation: "component cost model from hosting, AI/API, support, payment",
          },
        },
      },
    });
    expect(component.margin.componentModel?.provenance).toBe("COMPONENT_MODEL");
    expect(component.margin.unknownCostsTreatedAsZero).toBe(false);
    expect(estimates.margin.scenarioModel?.assumptions.map((item) => item.name)).toEqual(
      expect.arrayContaining(["Hosting", "AI/API", "Payment processing", "Support", "Service labor"]),
    );
    expect(
      estimates.margin.scenarioModel?.assumptions.every((item) =>
        ["CATEGORY_BENCHMARK", "ADJACENT_BENCHMARK", "SCENARIO_ASSUMPTION", "FOUNDER_HYPOTHESIS"].includes(item.label),
      ),
    ).toBe(true);
    const band = scenarioMarginAssumptions(true);
    expect(band.conservative).toBeGreaterThan(0.04);
    expect(band.upside).toBeLessThan(0.86);
    expect(band.assumptions.some((item) => /Not observed|Not a measured/i.test(item.why))).toBe(true);
  });

  it("models LTV, LTV/CAC, and payback from estimated inputs with confidence inheritance", () => {
    expect(estimates.ltv).not.toBeNull();
    expect(estimates.ltv?.confidence).toBe("LOW");
    expect(estimates.ltv?.strength).toBe("Weak");
    expect(estimates.ltvCac?.modeledNotObserved).toBe(true);
    expect(estimates.ltvCac?.grantsBuild).toBe(false);
    expect(estimates.payback?.formula).toMatch(/contribution margin/i);
    expect(estimates.payback?.usesContributionMargin).toBe(true);
    expect(estimates.firstYearCustomerValue?.formula).toMatch(/revenue, not profit/i);
    const presented = presentEducatedEstimates(estimates);
    expect(presented.ltvCac.note).toMatch(/MODELED — NOT OBSERVED/);
    expect(presented.payback.note).toMatch(/contribution margin/i);
    expect(presented.rows.find((row) => row.metric === "CAC")?.whatIsIt).toMatch(/acquisition cost/i);
    expect(presented.rows.find((row) => row.metric === "CAC")?.why.length).toBeGreaterThan(20);
    expect(presented.rows.find((row) => row.metric === "CAC")?.whatToTestNext).toMatch(/test|campaign|measure/i);
  });

  it("retains UNKNOWN / insufficient when a formula and provenanced inputs do not exist", () => {
    const empty = emptyBenchmarkEconomics();
    const model = empty.educatedEstimates ?? buildEducatedEconomicsModel({ benchmark: empty });
    expect(model.cac.selected).toBeNull();
    expect(model.margin.selected).toBeNull();
    expect(model.ltv).toBeNull();
    expect(model.ltvCac).toBeNull();
    expect(model.payback).toBeNull();
    const presented = presentEducatedEstimates(emptyEducatedEconomicsModel());
    expect(presented.rows.every((row) => row.actual === "Not measured yet")).toBe(true);
    expect(presented.rows.find((row) => row.metric === "LTV")?.bestEstimate).toBe("Not enough evidence yet");
    expect(scenarioCacFromPartialChain({})).toBeNull();
  });

  it("extracts, clusters, and maps competitor pain into product responses without fabricating complaints or current features", () => {
    const packet = painPacket("p", "c");
    const observations = extractPainObservations(packet);
    expect(observations.length).toBeGreaterThan(2);
    expect(observations.some((item) => item.category === "SEO")).toBe(true);
    expect(observations.some((item) => item.category === "CUSTOMIZATION")).toBe(true);
    expect(observations.some((item) => item.category === "PRICE" && item.competitor === "Hibu")).toBe(true);
    expect(observations.every((item) => packet.findings.some((finding) => finding.claim.includes(item.evidenceText.slice(0, 40))))).toBe(true);
    const clusters = clusterPainObservations(observations);
    expect(clusters.some((item) => item.id === "CUSTOMIZATION_LIMITATIONS")).toBe(true);
    expect(clusters.every((item) => item.sourceQuality && item.confidence && item.evidenceCount >= 1)).toBe(true);
    const clean = extractPainObservations({
      ...packet,
      findings: [finding("market", "positive", "SMB website and CMS spend is an established commercial market.")],
    });
    expect(clean).toEqual([]);
    expect(extractPainObservations({ ...packet, findings: [] }).every((item) => !/thin local-service/i.test(item.problem))).toBe(true);

    const advantage = buildProductAdvantage({
      packet,
      context: {
        proposedSolution: CMS_CONTEXT.proposedSolution,
        pricingHypothesis: CMS_CONTEXT.pricingHypothesis,
        businessModelHypothesis: CMS_CONTEXT.businessModelHypothesis,
        targetCustomer: CMS_CONTEXT.targetCustomer,
      },
    });
    expect(advantage.authority).toEqual(PRODUCT_ADVANTAGE_AUTHORITY);
    expect(advantage.authority.canPrioritizeCanonicalRoadmap).toBe(false);
    expect(advantage.recommendedImprovements.length).toBeGreaterThan(2);
    expect(advantage.recommendedImprovements.every((item) => !/Infinity already solves/i.test(item.recommendedImprovement))).toBe(true);
    expect(JSON.stringify(advantage)).not.toMatch(/Customers tell us/i);
    expect(advantage.doNotCopy.join(" ")).toMatch(/bundle|thin|custom/i);
    expect(advantage.tableStakes).toEqual(expect.arrayContaining(["templates", "mobile editing", "hosting"]));
    expect(advantage.expectedByCustomers.length).toBeGreaterThan(0);
    expect(advantage.priceFeatureInsights.some((item) => /optional managed/i.test(item.betterValueOpportunity))).toBe(true);
    expect(advantage.recommendedImprovements.some((item) => item.economicLink != null)).toBe(true);
    expect(advantage.differentiators.some((item) => item.type === "MEANINGFUL_DIFFERENTIATOR" || item.type === "INCREMENTAL_ADVANTAGE")).toBe(true);
    expect(extractCompetitorStrengths(packet).some((item) => /template|hosting|mobile/i.test(item.strength))).toBe(true);
    expect(classifyTableStake("mobile editing and templates")).toBe("mobile editing");
    expect(classifyCapability({ improvement: "x", proposedSolution: null })).toBe("UNKNOWN");
    expect(classifyCapability({ improvement: "structured service + location pages from a knowledge base", proposedSolution: "AI CMS with SEO/AEO" })).toBe("ALREADY_PLANNED");
    expect(classifyCapability({ improvement: "modular self-serve plus optional managed", proposedSolution: "AI CMS with SEO/AEO" })).toBe("PARTIALLY_COVERED");
    expect(classifyCapability({ improvement: "safe structured editor for generated pages", proposedSolution: "AI CMS with SEO/AEO publishing" })).toBe("NEW_OPPORTUNITY");
    expect(classifyCapability({ improvement: "mobile editing", proposedSolution: "cms", plannedCapabilities: ["built mobile editing"] })).toBe("ALREADY_BUILT");
    expect(advantage.recommendedImprovements.some((item) => item.capabilityStatus === "ALREADY_PLANNED" || item.capabilityStatus === "NEW_OPPORTUNITY" || item.capabilityStatus === "PARTIALLY_COVERED")).toBe(true);
    expect(advantage.summary.biggestPains.length).toBeGreaterThan(0);
    expect(advantage.buildBetter[0]?.recommendedImprovement).toBeTruthy();
  });

  it("renders Infinity's Best Estimate and Customer Problems & Product Advantage without raw enums in primary UI", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, ideaInput("ui"));
    convertFounderIdeaToCandidate(store, submission);
    const packet = painPacket(submission.id, submission.opportunityCandidateId!);
    const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
    if (!grade?.explainability) throw new Error("EXPLAINABILITY_MISSING");
    const view = buildFounderIntelligenceView(grade.explainability);
    const money = buildFounderMoneyView(view, flattenExplainabilityForHq(grade.explainability));
    expect(money.summary.ltv).toMatch(/not known|unknown|Not known yet/i);
    expect(money.bestEstimate.heading).toBe("Infinity's Best Estimate");
    expect(money.bestEstimate.rows.find((row) => row.metric === "Gross / contribution margin")?.bestEstimate).not.toBe("Not enough evidence yet");
    expect(money.bestEstimate.marginAssumptions.join(" ")).toMatch(/Hosting|AI\/API|Payment/i);
    expect(money.bestEstimate.marginAssumptions.join(" ")).not.toMatch(/MODELED_ASSUMPTION|BENCHMARK_PARTIAL/);
    expect(money.actualEconomics.cac).toBe("Not measured yet");
    expect(money.bestEstimate.grantsBuild).toBe(false);

    submission.infinityDecision = "HOLD";
    submission.status = "HELD";
    grade.buildReady = false;
    store.grades.set(submission.id, grade);
    store.submissions.set(submission.id, submission);
    const artifacts = buildFounderIdeaArtifacts(store, submission.organizationId);
    const founder = artifacts.opportunity_lab?.find((item) => item.artifactType === "founder_idea");
    if (!founder) throw new Error("FOUNDER_ARTIFACT_MISSING");
    const inspector = buildArtifactInspectorModel(founder, artifacts.opportunity_lab ?? []);
    const detail = buildEntityDetail(inspector);
    expect(detail.money.sections[0]?.title).toBe("Infinity Venture Brief");
    expect(detail.money.sections.some((section) => section.id === "money-best-estimate")).toBe(true);
    expect(detail.intelligence.sections.some((section) => section.id === "money-best-estimate")).toBe(false);
    expect(detail.intelligence.sections.some((section) => section.id === "money-summary")).toBe(false);
    expect(detail.intelligence.sections.find((section) => section.id === "intelligence-money-summary")?.rows).toHaveLength(3);
    const titles = detail.intelligence.sections.map((section) => section.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        "Customer Problems & Product Advantage",
        "What We Should Build Better",
        "What We Should Not Copy",
        "What Customers Already Expect",
      ]),
    );
    const takeIndex = titles.indexOf("Infinity's Take");
    const advantageIndex = titles.indexOf("Customer Problems & Product Advantage");
    const evidenceIndex = titles.indexOf("Evidence");
    expect(advantageIndex).toBeGreaterThan(takeIndex);
    expect(advantageIndex).toBeLessThan(evidenceIndex);
    const primary = founderFriendlyPrimarySections(view, flattenExplainabilityForHq(grade.explainability));
    const blob = primarySectionBlob(primary);
    expect(blob).not.toMatch(/BENCHMARK_PARTIAL|INDEPENDENCE_UNKNOWN|COMPARABLE_MODELED|REVENUE_MODEL_SUFFICIENT|MODELED_ASSUMPTION|TABLE_STAKES|NEW_OPPORTUNITY|ALREADY_PLANNED/);
    expect(blob.match(/UNKNOWN/g)?.length ?? 0).toBe(0);
    expect(blob).not.toMatch(/Customers tell us/i);
    const moneySections = founderMoneySections(view, {});
    const moneyBlob = JSON.stringify(moneySections);
    expect(moneyBlob).toContain("Infinity's Best Estimate");
    expect(moneyBlob).toMatch(/Weak evidence|Moderate evidence|Strong evidence/);
    expect(moneyBlob).toMatch(/What to validate next|Hosting|Assumption/);
    expect(moneyBlob).toMatch(/Hosting|Assumption/);
    const names =
      detail.money.sections.find((section) => section.id === "money-comparables")?.rows.map((row) => row.label.toLowerCase()) ?? [];
    expect(new Set(names).size).toBe(names.length);
    const system = detail.intelligence.sections.find((section) => section.id === "educated-estimates-system");
    expect(system?.rows.some((row) => row.value === "UNKNOWN")).toBe(true);
    expect(JSON.stringify(detail.intelligence.sections.find((section) => section.id === "product-advantage-system"))).toMatch(
      /PRICE|SEO|CUSTOMIZATION|canPrioritizeCanonicalRoadmap/,
    );
    const html = renderToStaticMarkup(createElement(HQOutputDetail, { detail, artifact: founder }));
    expect(html).toContain("Infinity");
    expect(html).toContain("Customer Problems");
    expect(html).toContain("What We Should Build Better");
    expect(html).toContain("What We Should Not Copy");
    expect(html).toContain("What Customers Already Expect");
    const uiSource = readFileSync(join(process.cwd(), "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"), "utf8");
    expect(uiSource).toContain("grid-cols-1");
    expect(uiSource).toContain("sm:grid-cols-");
    const brief = buildFounderFriendlyBrief(view, flattenExplainabilityForHq(grade.explainability));
    expect(brief.advantage.whatCustomersHate.length).toBeGreaterThan(10);
    expect(evaluateBuildReadiness({ decisionReady: true, evaluation: grade.evaluation }).buildReady).toBe(false);
    expect(provenanceGrantsBuild("SCENARIO_MODEL")).toBe(false);
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
    const { store: treasury } = createGovernedStore();
    const gate = assertFounderSpendStillTreasuryGated(treasury, submission);
    expect(gate.authorized).toBe(false);
  });
});
