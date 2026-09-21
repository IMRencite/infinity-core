import type { FounderResearchPacket } from "../research-packet";
import type { VentureContext } from "../comparable-economics/qualify";
import type { RevenueModelResearch } from "../revenue-model-research/types";
import { rangeHasValue, unknownRange } from "../comparable-economics/provenance";
import { extractBenchmarkObservations } from "./extract";
import { qualifyBenchmarks } from "./qualify";
import { aggregateAll, feedsBaseCase } from "./aggregate";
import { modelCacFromBenchmarks } from "./model-cac";
import { modelRetention } from "./model-retention";
import { modelGrossMargin, modelComponentMargin } from "./model-margin";
import { ltvCacScenarios, modelLtvFromParts, paybackScenarios } from "./model-ltv";
import { coverageFromAcceptedQuality, confidenceFromAcceptedQuality, weakestConfidence } from "./confidence";
import { coverageFromModel } from "./coverage";
import { cacValidationTarget, canonicalCacPresentation, founderLowConfidenceCacCopy } from "./founder-copy";
import { assessEconomicHealth } from "../comparable-economics/unit-economics";
import { assessSourceIndependence, confidenceAfterIndependence } from "../revenue-model-research/source-independence";
import { buildEducatedEconomicsModel } from "../educated-estimates/model";
import type { BenchmarkEconomicsResearch } from "./types";

export function researchBenchmarkEconomics(input: {
  packet: FounderResearchPacket;
  context: VentureContext;
  revenueModel?: RevenueModelResearch | null;
}): BenchmarkEconomicsResearch {
  const observations = extractBenchmarkObservations(input.packet.findings);
  const qualified = qualifyBenchmarks(observations, input.context);
  const aggregations = aggregateAll(qualified);
  const cac = modelCacFromBenchmarks({ qualified, aggregations, context: input.context });
  const retention = modelRetention({ aggregations, qualified });
  const margin = modelGrossMargin(qualified);
  const monthly =
    input.revenueModel && rangeHasValue(input.revenueModel.revenuePerCustomer.monthlyRecurring)
      ? input.revenueModel.revenuePerCustomer.monthlyRecurring
      : aggregations.ARPU?.acceptedRange ?? unknownRange();
  const componentMargin = modelComponentMargin({ qualified, monthlyRevenue: monthly });
  const blendedMargin = rangeHasValue(margin.blended)
    ? margin.blended
    : componentMargin.used
      ? componentMargin.blended
      : unknownRange();
  const ltv = modelLtvFromParts({
    monthlyPrice: monthly,
    grossMargin: blendedMargin,
    lifetimeMonths: retention.lifetimeMonths,
  });
  const ltvCac = ltvCacScenarios(ltv.range, cac.range);
  const payback = paybackScenarios({ cac: cac.range, monthlyPrice: monthly, grossMargin: blendedMargin });
  const health = assessEconomicHealth({ ltvCac: { low: ltvCac.conservative, base: ltvCac.base, high: ltvCac.upside }, provenance: "COMPARABLE_MODELED" });

  const independence = assessSourceIndependence(
    input.packet.sources.length
      ? input.packet.sources
      : observations.map((item) => ({ url: item.sourceUrl })),
  );
  const hosts = new Set(
    observations.map((item) => {
      try {
        return new URL(item.sourceUrl).hostname;
      } catch {
        return item.sourceUrl;
      }
    }),
  );

  const outlierIds = new Set(
    Object.values(aggregations).flatMap((item) => item?.rejectedOutliers.map((row) => row.observationId) ?? []),
  );
  const accepted = qualified.filter((item) => feedsBaseCase(item) && !outlierIds.has(item.observationId));
  const cacAccepted = accepted.filter((item) => item.dimension === "customer_acquisition_cost");
  const marginAccepted = accepted.filter((item) => item.dimension === "gross_margin");
  const cacCoverage = coverageFromAcceptedQuality(cacAccepted);
  const marginCoverage = coverageFromAcceptedQuality(marginAccepted);
  const cacConfidence = confidenceAfterIndependence(confidenceFromAcceptedQuality(cacAccepted), independence.state);
  const marginConfidence = confidenceAfterIndependence(
    blendedMargin.base != null && componentMargin.used && !rangeHasValue(margin.blended)
      ? "LOW"
      : confidenceFromAcceptedQuality(marginAccepted),
    independence.state,
  );
  const lifetimeKnown = rangeHasValue(retention.lifetimeMonths);
  const retentionAccepted = accepted.filter(
    (item) =>
      (item.dimension === "monthly_churn" && item.churnKind === "monthly_logo") ||
      (item.dimension === "annual_churn" && item.churnKind === "annual_logo") ||
      item.dimension === "customer_lifetime",
  );
  const retentionConfidence = confidenceAfterIndependence(
    lifetimeKnown ? (confidenceFromAcceptedQuality(retentionAccepted) === "NONE" ? "LOW" : confidenceFromAcceptedQuality(retentionAccepted)) : "NONE",
    independence.state,
  );
  const arpuConfidence = confidenceAfterIndependence(
    rangeHasValue(monthly) ? (input.revenueModel?.revenuePerCustomer.arpuModel.confidence ?? "MEDIUM") : "NONE",
    independence.state,
  );
  const ltvConfidence = rangeHasValue(ltv.range)
    ? weakestConfidence(arpuConfidence, marginConfidence, retentionConfidence)
    : "NONE";
  const paybackKnown = rangeHasValue(payback.range);
  const paybackConfidence = paybackKnown ? weakestConfidence(cacConfidence, marginConfidence, arpuConfidence) : "NONE";
  const ltvCacConfidence = rangeHasValue({ low: ltvCac.conservative, base: ltvCac.base, high: ltvCac.upside })
    ? weakestConfidence(cacConfidence, ltvConfidence)
    : "NONE";

  const modeled: BenchmarkEconomicsResearch["modeled"] = {
    arpu: {
      range: monthly,
      base: monthly.base,
      confidence: arpuConfidence,
      provenance: rangeHasValue(monthly) ? "COMPARABLE_MODELED" : "UNKNOWN",
      sourceRefs: [],
      calculation: "Monthly revenue from revenue-model research or ARPU benchmarks.",
      assumptions: [],
      coverage: rangeHasValue(monthly) ? "BENCHMARK_PARTIAL" : "BENCHMARK_INSUFFICIENT",
    },
    cac: {
      range: cac.range,
      base: cac.range.base,
      confidence: weakestConfidence(confidenceAfterIndependence(cac.confidence, independence.state), cacConfidence),
      provenance: cac.provenance,
      sourceRefs: cac.sourceRefs,
      calculation: cac.calculation,
      assumptions: cac.adjustments.map((item) => `${item.name}: ${item.why}`),
      coverage: cacCoverage,
    },
    ltv: {
      range: ltv.range,
      base: ltv.range.base,
      confidence: ltvConfidence,
      provenance: ltv.range.base != null ? "COMPARABLE_MODELED" : "UNKNOWN",
      sourceRefs: qualified.filter((item) => item.dimension === "monthly_churn" || item.dimension === "gross_margin").map((item) => item.sourceUrl),
      calculation: ltv.formula,
      assumptions: [retention.formula, margin.formula],
      coverage: ltv.range.base != null ? "BENCHMARK_PARTIAL" : "BENCHMARK_INSUFFICIENT",
    },
    ltvCac: {
      range: { low: ltvCac.conservative, base: ltvCac.base, high: ltvCac.upside },
      base: ltvCac.base,
      confidence: ltvCacConfidence,
      provenance: ltvCac.base != null ? "COMPARABLE_MODELED" : "UNKNOWN",
      sourceRefs: cac.sourceRefs,
      calculation: "conservative = low LTV / high CAC; base = base/base; upside = high LTV / low CAC",
      assumptions: [],
      coverage: ltvCac.base != null ? "BENCHMARK_PARTIAL" : "BENCHMARK_INSUFFICIENT",
    },
    grossMargin: {
      range: blendedMargin,
      base: blendedMargin.base,
      confidence: blendedMargin.base != null ? (componentMargin.used && !rangeHasValue(margin.blended) ? "LOW" : marginConfidence) : "NONE",
      provenance: blendedMargin.base != null ? "CATEGORY_BENCHMARK" : "UNKNOWN",
      sourceRefs: qualified.filter((item) => item.dimension === "gross_margin").map((item) => item.sourceUrl),
      calculation: rangeHasValue(margin.blended) ? margin.formula : componentMargin.formula,
      assumptions: ["Generic 80% SaaS margin is not assumed. This is not Infinity CMS's own margin."],
      coverage: rangeHasValue(margin.blended) ? marginCoverage : componentMargin.used ? "BENCHMARK_PARTIAL" : "BENCHMARK_INSUFFICIENT",
    },
    contributionMargin: {
      range: blendedMargin,
      base: blendedMargin.base,
      confidence: blendedMargin.base != null ? (componentMargin.used && !rangeHasValue(margin.blended) ? "LOW" : marginConfidence) : "NONE",
      provenance: blendedMargin.base != null ? "CATEGORY_BENCHMARK" : "UNKNOWN",
      sourceRefs: qualified.filter((item) => item.dimension === "gross_margin").map((item) => item.sourceUrl),
      calculation: componentMargin.used
        ? componentMargin.formula
        : "Contribution approximated by grounded gross-margin evidence when variable costs are not separately observed.",
      assumptions: [],
      coverage: rangeHasValue(blendedMargin) ? (componentMargin.used && !rangeHasValue(margin.blended) ? "BENCHMARK_PARTIAL" : marginCoverage) : "BENCHMARK_INSUFFICIENT",
    },
    payback: {
      range: payback.range,
      base: payback.base,
      confidence: paybackConfidence,
      provenance: payback.base != null ? "COMPARABLE_MODELED" : "UNKNOWN",
      sourceRefs: cac.sourceRefs,
      calculation: "Payback months = CAC ÷ monthly contribution margin (monthly revenue × margin). Revenue alone is not used.",
      assumptions: [],
      coverage: payback.base != null ? "BENCHMARK_PARTIAL" : "BENCHMARK_INSUFFICIENT",
    },
    lifetimeMonths: {
      range: retention.lifetimeMonths,
      base: retention.lifetimeMonths.base,
      confidence: retentionConfidence,
      provenance: retention.lifetimeMonths.base != null ? "CATEGORY_BENCHMARK" : "UNKNOWN",
      sourceRefs: qualified.filter((item) => item.dimension === "monthly_churn" || item.dimension === "retention_rate").map((item) => item.sourceUrl),
      calculation: retention.formula,
      assumptions: [],
      coverage: rangeHasValue(retention.lifetimeMonths) ? "BENCHMARK_PARTIAL" : "BENCHMARK_INSUFFICIENT",
    },
  };

  const draft = {
    aggregations,
    modeled,
    componentCac: cac.component,
  };
  const coverage = coverageFromModel(draft, accepted);
  modeled.cac.coverage = coverage.cac;
  modeled.grossMargin.coverage = coverage.grossMargin;
  modeled.contributionMargin.coverage = coverage.grossMargin;
  modeled.lifetimeMonths.coverage = coverage.retention;

  const cacAmount = cac.range.base ?? cac.range.low ?? cac.range.high;
  const cacPresentation = canonicalCacPresentation({
    range: cac.range,
    confidence: modeled.cac.confidence,
    organic: cac.channelCac.organic,
    paid: cac.channelCac.paid,
    category: cac.channelCac.category,
  });
  const life = retention.lifetimeMonths;
  const validationTargets = [
    cacValidationTarget({ amount: cacAmount, confidence: modeled.cac.confidence, coverage: coverage.cac }),
    life.low != null && life.high != null
      ? `Do early cohorts show retention consistent with ${Math.round(life.low)}–${Math.round(life.high)} months?`
      : null,
  ].filter((item): item is string => Boolean(item));

  const nextToProve =
    modeled.cac.confidence === "LOW" && cacAmount != null
      ? founderLowConfidenceCacCopy({
          base: cacAmount,
          low: cac.range.low,
          high: cac.range.high,
          organic: cac.channelCac.organic,
          paid: cac.channelCac.paid,
          category: cac.channelCac.category,
        })
      : validationTargets[0] ?? "Measure real CAC on a bounded acquisition test.";

  const result: BenchmarkEconomicsResearch = {
    observations,
    qualified,
    aggregations,
    coverage,
    modeled,
    ltvCacScenarios: ltvCac,
    paybackScenarios: { conservative: payback.conservative, base: payback.base, upside: payback.upside },
    attractiveness: health.health,
    attractivenessWhy: health.why,
    cacAdjustments: cac.adjustments,
    componentCac: cac.component,
    sensitivity: [
      { name: "CAC", direction: "downside", why: "Higher CAC compresses LTV/CAC and extends payback." },
      { name: "churn", direction: "downside", why: "Higher monthly churn shortens lifetime and LTV." },
      { name: "price", direction: "upside", why: "Higher realized price raises contribution and LTV." },
      { name: "gross margin", direction: "downside", why: "Lower margin reduces LTV and lengthens payback." },
    ],
    validationTargets,
    mainUncertainty: !rangeHasValue(cac.range)
      ? "Customer acquisition cost is still unknown."
      : !rangeHasValue(retention.monthlyChurn)
        ? "Retention/churn is the largest remaining uncertainty."
        : "Modeled economics are not observed venture results.",
    nextToProve,
    observed: { cac: "UNKNOWN", ltv: "UNKNOWN" },
    buildImplication: {
      companyComparableGrantsBuild: false,
      categoryBenchmarkGrantsBuild: false,
      adjacentBenchmarkGrantsBuild: false,
      comparableModeledGrantsBuild: false,
      scenarioModelGrantsBuild: false,
      reason: "COMPANY_COMPARABLE, CATEGORY_BENCHMARK, ADJACENT_BENCHMARK, COMPARABLE_MODELED, and SCENARIO_MODEL cannot grant BUILD.",
    },
    sampleQuality: {
      sourcesFound: hosts.size,
      benchmarksExtracted: observations.length,
      benchmarksAccepted: accepted.length,
      benchmarksRejected: qualified.length - accepted.length,
      independentSources: independence.independentCount,
      independenceState: independence.state,
    },
    channelCac: cac.channelCac,
    unusedMarginEvidence: [
      ...margin.unusedEvidence,
      ...(!componentMargin.used && !rangeHasValue(margin.blended)
        ? [
            {
              claim: "Component margin",
              values: "missing",
              why: `Missing: ${componentMargin.missing.join(", ")}. Unknown variable costs are not treated as zero.`,
            },
          ]
        : []),
    ],
    cacPresentation,
    overallEconomicConfidence: weakestConfidence(
      modeled.cac.confidence,
      modeled.grossMargin.confidence,
      modeled.lifetimeMonths.confidence,
    ),
  };
  result.educatedEstimates = buildEducatedEconomicsModel({
    revenueModel: input.revenueModel,
    benchmark: result,
    serviceHeavy: /hybrid|managed|service|seo|content/i.test(
      input.revenueModel?.recommended.recommendedModel ?? input.context.businessModelHypothesis ?? "",
    ),
  });
  return result;
}

export function emptyBenchmarkEconomics(): BenchmarkEconomicsResearch {
  return researchBenchmarkEconomics({
    packet: {
      researchRunId: "none",
      candidateId: "none",
      submissionId: "none",
      grounded: false,
      failed: true,
      failureCode: "RESEARCH_FAILED",
      summary: "",
      findings: [],
      sources: [],
      competitorLeads: [],
      verifiedCompetitors: [],
      monetizationLayers: { category: "UNKNOWN", ideaSpecific: "UNKNOWN", unitEconomics: "UNKNOWN" },
      requiresMoreResearch: true,
    },
    context: {
      title: "",
      description: "",
      targetCustomer: "",
      problem: "",
      proposedSolution: "",
      businessModelHypothesis: "",
      pricingHypothesis: "",
    },
  });
}
