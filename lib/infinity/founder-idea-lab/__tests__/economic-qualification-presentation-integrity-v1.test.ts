import { describe, expect, it } from "vitest";
import { createGovernedStore } from "@/lib/infinity/treasury/__tests__/fixtures";
import { loadResearchCoveragePolicy } from "@/lib/infinity/research/coverage/policy";
import {
  assessBenchmarkPlannerCoverage,
  evaluateBenchmarkGapFillEligibility,
} from "@/lib/infinity/research/coverage/benchmark-gap-fill";
import { evaluateRevenueGapFillEligibility } from "@/lib/infinity/research/coverage/revenue-gap-fill";
import { analyzeFounderIdea } from "../analyze";
import { routeFounderBuild } from "../build-route";
import { convertFounderIdeaToCandidate } from "../convert";
import { buildFounderMoneyView } from "../explainability/money-view";
import { buildFounderIntelligenceView } from "../explainability/view";
import { cmsLiveV7EconomicReplayPacket } from "../integrity-fixtures";
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
  aggregateModeledArpu,
  extractMoneyObservations,
  taggedMoneyObservationsFromFindings,
} from "../revenue-model-research/extract";
import { qualifyRevenueModelComparables } from "../revenue-model-research/qualify";
import { assessPricingEvidenceQuality } from "../revenue-model-research/price-quality";
import { qualifyComparableEntity, extractQualifiedComparableNames } from "../revenue-model-research/entity";
import { extractBenchmarkObservations } from "../benchmark-economics/extract";
import { benchmarkEconomicsQueries } from "../benchmark-economics/queries";
import { founderLowConfidenceCacCopy } from "../benchmark-economics/founder-copy";
import { weakestConfidence } from "../benchmark-economics/confidence";
import { presentUsdMetric } from "../money-presentation";
import type { FounderIdeaSubmissionInput } from "../types";

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
    organizationId: "org-econ-qual-v1",
    submittedByUserId: "user-a",
    title: CMS_CONTEXT.title,
    description: CMS_CONTEXT.description,
    targetCustomer: CMS_CONTEXT.targetCustomer,
    problem: CMS_CONTEXT.problem,
    proposedSolution: CMS_CONTEXT.proposedSolution,
    businessModelHypothesis: CMS_CONTEXT.businessModelHypothesis,
    pricingHypothesis: CMS_CONTEXT.pricingHypothesis,
    idempotencyKey: "econ-qual-v1",
  };
}

function persistV7() {
  const store = new FounderIdeaStore();
  const submission = submitFounderIdea(store, ideaInput());
  convertFounderIdeaToCandidate(store, submission);
  const livePacket = cmsLiveV7EconomicReplayPacket(submission.id, submission.opportunityCandidateId!);
  const { grade } = analyzeFounderIdea(store, submission, { researchPacket: livePacket });
  if (!grade?.explainability) throw new Error("EXPLAINABILITY_MISSING");
  const view = buildFounderIntelligenceView(grade.explainability);
  const money = buildFounderMoneyView(view);
  return { store, submission, grade, view, money, packet: livePacket };
}

describe("ECONOMIC QUALIFICATION + PRESENTATION INTEGRITY V1", () => {
  const packet = cmsLiveV7EconomicReplayPacket("s", "c");
  const revenue = researchRevenueModel({ packet, context: CMS_CONTEXT });
  const bench = researchBenchmarkEconomics({ packet, context: CMS_CONTEXT, revenueModel: revenue });

  it("uses one canonical numeric contribution rule for UI and ARPU", () => {
    const hibuClaim = "Hibu local marketing retainers: $1,100–$1,500/month.";
    const dealerClaim = "Dealer Spike charges $1,149/month for dealer website packages.";
    const hibuRole = classifyPriceRole(hibuClaim, CMS_CONTEXT);
    const dealerRole = classifyPriceRole(dealerClaim, CMS_CONTEXT);
    const hibuObs = extractMoneyObservations(hibuClaim)[0]!;
    const dealerObs = extractMoneyObservations(dealerClaim)[0]!;
    expect(hibuRole).toBe("MANAGED_SERVICE_RETAINER");
    expect(canContributeToCorePricing(hibuObs, hibuRole)).toBe(false);
    expect(canContributeToCorePricing(dealerObs, dealerRole)).toBe(true);
    const hibu = revenue.comparables.find((row) => /hibu/i.test(row.name));
    const dealer = revenue.comparables.find((row) => /dealer spike/i.test(row.name));
    expect(hibu?.numericPricingContribution).toBe(false);
    expect(hibu?.numericPricingContribution).toBe(canContributeToCorePricing(hibuObs, hibuRole));
    expect(dealer?.numericPricingContribution).toBe(true);
    expect(revenue.revenuePerCustomer.arpuModel.observations.some((item) => item.contributesToCore && /hibu/i.test(item.sourceText))).toBe(
      false,
    );
    expect(revenue.revenuePerCustomer.coreRecurringARPU.base).toBe(1150);
    expect(revenue.revenuePerCustomer.arpuModel.managedService.low).toBe(1100);
    expect(revenue.revenuePerCustomer.arpuModel.managedService.high).toBe(1500);
  });

  it("does not call pricing SUFFICIENT from closed weak/opaque prices", () => {
    const quality = assessPricingEvidenceQuality({ findings: packet.findings, context: CMS_CONTEXT });
    expect(quality.status).toBe("PARTIAL");
    expect(revenue.coverage.pricingEvidenceStatus).toBe("PARTIAL");
    expect(revenue.coverage.revenueStructureStatus).toBe("SUFFICIENT");
    expect(revenue.coverage.status).toBe("REVENUE_MODEL_PARTIAL");
    const strong = assessPricingEvidenceQuality({
      findings: [
        {
          claim: "Northstar Sites public plans start at $149 per month for SMB website packages.",
          sourceUrls: ["https://example.com/northstar/pricing"],
          verifiesFounderCompetitor: "Northstar Sites",
        },
        {
          claim: "LocalLaunch Web monthly website packages are $299 per month.",
          sourceUrls: ["https://example.com/locallaunch/pricing"],
          verifiesFounderCompetitor: "LocalLaunch Web",
        },
      ],
      context: CMS_CONTEXT,
    });
    expect(strong.status).toBe("SUFFICIENT");
  });

  it("clusters core, managed-service, and tooling prices separately", () => {
    const tagged = taggedMoneyObservationsFromFindings(
      packet.findings.map((item) => item.claim),
      CMS_CONTEXT,
    );
    const arpu = aggregateModeledArpu(tagged);
    expect(arpu.observations.some((item) => item.role === "DIRECT_COMPARABLE_CORE_PRICE" && item.cluster === "CORE_PLATFORM")).toBe(true);
    expect(arpu.observations.some((item) => item.role === "MANAGED_SERVICE_RETAINER" && item.cluster === "MANAGED_SERVICE")).toBe(true);
    expect(arpu.observations.some((item) => item.role === "TOOLING_PRICE" && item.cluster === "ADD_ON_TOOLING")).toBe(true);
    expect(arpu.core.base).toBe(1150);
    expect(arpu.core.low).toBe(1150);
    expect(arpu.core.high).toBe(1150);
    expect(arpu.managedService.low).toBe(1100);
    expect(arpu.addOn.low).toBe(79);
    expect(arpu.total.base).toBeNull();
    expect(arpu.falsePrecision).toBe(false);
    expect(arpu.confidence).toBe("LOW");
    expect(JSON.stringify(arpu.core)).not.toMatch(/1209\.40|1209\.4/);
  });

  it("preserves setup as a researchable secondary money gap", () => {
    expect(revenue.coverage.setupEvidenceStatus).toBe("INSUFFICIENT");
    expect(revenue.coverage.nextMoneyResearchTargets.some((item) => /setup/i.test(item))).toBe(true);
    expect(revenue.coverage.stopReason).not.toBe("REVENUE_MODEL_SUFFICIENT");
    const gap = evaluateRevenueGapFillEligibility({
      materialCoverageSufficient: true,
      evidence: packet.findings.map((item) => ({ claim: item.claim, grounded: item.grounded, sourceUrls: item.sourceUrls })),
      sources: packet.sources,
      policy: loadResearchCoveragePolicy(),
      seed: { ideaTitle: "Infinity CMS", targetCustomer: "SMB owners", competitorLeads: ["Hibu", "Dealer Spike"] },
      issuedQueries: [],
      revenueGapFillPhasesUsed: 0,
      recordedCostUsd: 0.01,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(gap.eligible).toBe(true);
  });

  it("splits current vs projected margin and does not model 0%", () => {
    const marginObs = bench.observations.filter((item) => item.dimension === "gross_margin");
    expect(marginObs.some((item) => item.marginStage === "OBSERVED_CURRENT_MARGIN" && item.range.base === 0)).toBe(true);
    expect(marginObs.some((item) => item.marginStage === "PROJECTED_MARGIN" && item.range.base === 0.6)).toBe(true);
    expect(marginObs.every((item) => item.usableForModel === false)).toBe(true);
    expect(bench.modeled.grossMargin.range.base).toBeNull();
    expect(bench.unusedMarginEvidence?.length).toBeGreaterThan(0);
    const { money } = persistV7();
    expect(money.summary.grossMargin).toMatch(/not enough reliable evidence/i);
    expect(money.summary.grossMargin).not.toMatch(/^0%/);
    expect(money.presentation.marginWhyNotUsed).toMatch(/projected|cost structure|early-stage|0%/i);
  });

  it("keeps CAC base display consistent and labels same-source channels", () => {
    expect(bench.channelCac.organic).toBe(249);
    expect(bench.channelCac.paid).toBeNull();
    expect(bench.channelCac.category).toBe(702);
    expect(bench.channelCac.independentSourceCount).toBe(1);
    expect(bench.modeled.cac.range.low).toBe(249);
    expect(bench.modeled.cac.range.high).toBe(702);
    expect(bench.modeled.cac.range.base).toBe(475.5);
    expect(bench.modeled.cac.confidence).toBe("LOW");
    const copy = founderLowConfidenceCacCopy({
      base: 475.5,
      low: 249,
      high: 702,
      organic: 249,
      category: 702,
    });
    expect(copy).toMatch(/About \$476/);
    expect(copy).toMatch(/\$249/);
    expect(copy).toMatch(/\$702/);
    expect(copy).toMatch(/Organic benchmark/);
    expect(copy).toMatch(/Low/);
    const { money } = persistV7();
    expect(money.summary.cac).toMatch(/\$476/);
    expect(money.summary.cac).not.toMatch(/\$702/);
    expect(money.cacDetail.base).toMatch(/\$476/);
    expect(money.cacDetail.estimated).toMatch(/\$476/);
    expect(money.modeledEconomics.cac).toMatch(/\$476/);
    expect(money.presentation.cacEstimate).toMatch(/\$476/);
    expect(money.cacDetail.organic).toMatch(/\$249/);
    expect(money.cacDetail.category).toMatch(/\$702/);
    expect(money.cacDetail.independentSources).toBe("1");
    expect(money.cacDetail.confidence.toLowerCase()).toMatch(/low/);
  });

  it("rejects comparable-name noise and keeps ChatGPT as a non-comparable entity", () => {
    const noise = "Business Bundled JSON LLMs ChatGPT Customer Acquisition Cost CPC";
    const names = extractQualifiedComparableNames(noise);
    expect(names).not.toEqual(expect.arrayContaining(["Business", "Bundled", "JSON", "LLMs", "ChatGPT", "CPC", "Customer Acquisition Cost"]));
    const chat = qualifyComparableEntity("ChatGPT", noise);
    expect(chat.validEntity).toBe(true);
    expect(chat.comparableCandidate).toBe(false);
    const comparables = qualifyRevenueModelComparables({ packet, context: CMS_CONTEXT });
    const namesFound = comparables.map((row) => row.name);
    expect(namesFound.some((name) => /^(Business|Bundled|JSON|LLMs|ChatGPT|CPC|Customer Acquisition Cost)$/i.test(name))).toBe(false);
    expect(comparables.some((row) => /dealer spike/i.test(row.name))).toBe(true);
    expect(comparables.some((row) => /hibu/i.test(row.name))).toBe(true);
  });

  it("excludes ambiguous gross churn from lifetime and targets business-model retention queries", () => {
    const churn = extractBenchmarkObservations(packet.findings).find((item) => item.dimension === "monthly_churn");
    expect(churn?.churnKind).not.toBe("monthly_logo");
    expect(bench.modeled.lifetimeMonths.base).toBeNull();
    expect(bench.modeled.ltv.range.base).toBeNull();
    expect(bench.modeled.ltvCac.range.base).toBeNull();
    expect(bench.modeled.payback.range.base).toBeNull();
    const queries = benchmarkEconomicsQueries({ ideaTitle: "Website CMS", targetCustomer: "SMB" }, ["churn", "margin"]);
    expect(queries.some((item) => /monthly logo churn|customer churn|website SaaS customer retention|managed website service retention/i.test(item.query))).toBe(
      true,
    );
    expect(queries.some((item) => /vertical SaaS gross margin|SMB SaaS gross margin|website-as-a-service gross margin|hybrid SaaS service gross margin/i.test(item.query))).toBe(
      true,
    );
    expect(queries.every((item) => !/Infinity CMS/i.test(item.query))).toBe(true);
  });

  it("keeps replacement research eligible when numeric ranges exist at LOW confidence", () => {
    const planner = assessBenchmarkPlannerCoverage({
      evidence: packet.findings.map((item) => ({ claim: item.claim, grounded: item.grounded, sourceUrls: item.sourceUrls })),
      sources: packet.sources,
      seed: { ideaTitle: "Website CMS", targetCustomer: "SMB" },
    });
    expect(planner.sufficient).toBe(false);
    expect(planner.missing).toEqual(expect.arrayContaining(["cac", "churn", "margin"]));
    const fill = evaluateBenchmarkGapFillEligibility({
      materialCoverageSufficient: true,
      evidence: packet.findings.map((item) => ({ claim: item.claim, grounded: item.grounded, sourceUrls: item.sourceUrls })),
      sources: packet.sources,
      policy: loadResearchCoveragePolicy(),
      seed: { ideaTitle: "Website CMS", targetCustomer: "SMB" },
      issuedQueries: [],
      benchmarkGapFillPhasesUsed: 0,
      recordedCostUsd: 0.01,
      estimatedGapFillCostUsd: 0.01,
    });
    expect(fill.eligible).toBe(true);
  });

  it("inherits weakest economic confidence and keeps overall PARTIAL", () => {
    expect(weakestConfidence("LOW", "NONE", "NONE")).toBe("NONE");
    expect(bench.overallEconomicConfidence).toBe("NONE");
    expect(bench.coverage.overall).toBe("BENCHMARK_PARTIAL");
    expect(bench.coverage.overall).not.toBe("BENCHMARK_SUFFICIENT");
    const { money } = persistV7();
    expect(money.presentation.overallEconomicConfidence.toLowerCase()).not.toMatch(/high/);
  });

  it("separates Money tab pricing clusters and keeps CAC/margin consistent", () => {
    const { money } = persistV7();
    expect(money.summary.corePlatformPricing).toMatch(/1,150|1150/);
    expect(money.summary.managedServicePricing).toMatch(/1,100|1100/);
    expect(money.summary.addOnToolPricing).toMatch(/79/);
    expect(money.summary.totalMonthlyCustomerRevenue).toMatch(/not known|unknown/i);
    expect(money.presentation.coreArpuRange).toBe(money.summary.corePlatformPricing);
    expect(money.summary.cac).toBe(money.cacDetail.estimated);
    expect(money.modeledEconomics.cac).toBe(money.cacDetail.estimated);
    expect(money.unitEconomics.grossMargin).toMatch(/not enough reliable evidence/i);
    expect(money.comparables.some((item) => /adjacent service comparable/i.test(item.founderRole))).toBe(true);
    expect(money.comparables.some((item) => /direct pricing comparable/i.test(item.founderRole))).toBe(true);
    expect(JSON.stringify(money)).not.toMatch(/1,209\.40|1209\.40/);
  });

  it("replays v7 expected closure without granting BUILD or writing Treasury", () => {
    expect(revenue.coverage.revenueStructureStatus).toBe("SUFFICIENT");
    expect(revenue.coverage.pricingEvidenceStatus).toBe("PARTIAL");
    expect(revenue.revenuePerCustomer.coreRecurringARPU.base).toBe(1150);
    expect(bench.modeled.cac.range.base).toBe(475.5);
    expect(bench.modeled.grossMargin.range.base).toBeNull();
    expect(bench.modeled.lifetimeMonths.base).toBeNull();
    expect(bench.modeled.ltv.range.base).toBeNull();
    expect(bench.modeled.ltvCac.range.base).toBeNull();
    expect(bench.modeled.payback.range.base).toBeNull();
    expect(bench.coverage.overall).toBe("BENCHMARK_PARTIAL");
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, ideaInput());
    convertFounderIdeaToCandidate(store, submission);
    const livePacket = cmsLiveV7EconomicReplayPacket(submission.id, submission.opportunityCandidateId!);
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
    const presented = presentUsdMetric({ range: { low: 249, base: 475.5, high: 702 }, confidence: "LOW" });
    expect(presented.displayBase).toBe("~$476");
    expect(presented.displayBase).not.toMatch(/\.\d{2}/);
  });
});
