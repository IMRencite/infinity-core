import type { FounderResearchPacket } from "../research-packet";
import type { MonetizationEvidenceLayers } from "../monetization-levels";
import { researchRevenueModel } from "../revenue-model-research/from-evidence";
import type { RevenueModelResearch } from "../revenue-model-research/types";
import { researchBenchmarkEconomics } from "../benchmark-economics/from-evidence";
import type { BenchmarkEconomicsResearch } from "../benchmark-economics/types";
import { modelCac } from "./cac";
import { modelLtv } from "./ltv";
import { isMonthlyPriceClaim, isSetupPriceClaim, normalizePricingObservation, parseMoneyRange } from "./pricing";
import {
  confidenceFromSupport,
  formatRange,
  mergeRanges,
  provenanceMaySatisfyBuildEconomics,
  rangeHasValue,
  unknownRange,
  type EconomicEvidenceClass,
} from "./provenance";
import { qualifyComparables, type VentureContext } from "./qualify";
import type { ComparableBusiness, ComparableEconomicsModel, PricingScenario } from "./types";
import { assessEconomicHealth, breakEvenRange, buildScenarios, ltvCacRange, paybackRange, sensitivityDrivers } from "./unit-economics";

function applyRevenueRoles(
  row: ComparableBusiness,
  revenueModel: RevenueModelResearch,
): ComparableBusiness {
  const match = revenueModel.comparables.find((item) => item.name.toLowerCase() === row.name.toLowerCase());
  if (!match) {
    return {
      ...row,
      strategicComparable: row.confidenceBand !== "WEAK_EXCLUDED",
      economicComparable: false,
      revenueModelComparable: false,
      revenueModelRole: "NO",
      numericPricingContribution: false,
    };
  }
  return {
    ...row,
    strategicComparable: match.strategicComparable,
    economicComparable: match.economicComparable,
    revenueModelComparable: match.revenueModelComparable,
    revenueModelRole: match.revenueModelRole,
    numericPricingContribution: match.numericPricingContribution,
  };
}

export function modelComparableEconomics(input: {
  packet: FounderResearchPacket;
  context: VentureContext;
  layers: MonetizationEvidenceLayers;
  founderPricingHypothesis?: string | null;
  monthlyFixedCost?: number | null;
  revenueModel?: RevenueModelResearch;
  benchmarkEconomics?: BenchmarkEconomicsResearch;
}): ComparableEconomicsModel {
  const revenueModel =
    input.revenueModel ??
    researchRevenueModel({ packet: input.packet, context: input.context, monthlyFixedCost: input.monthlyFixedCost });
  const benchmarks =
    input.benchmarkEconomics ??
    researchBenchmarkEconomics({ packet: input.packet, context: input.context, revenueModel });
  const qualified = qualifyComparables({ packet: input.packet, context: input.context });
  const included = qualified.included.map((row) => applyRevenueRoles(row, revenueModel));
  const excluded = qualified.excluded.map((row) => applyRevenueRoles(row, revenueModel));
  const numericNames = new Set(
    revenueModel.comparables.filter((row) => row.numericPricingContribution).map((row) => row.name.toLowerCase()),
  );
  const pricingFindings = input.packet.findings.filter((finding) => {
    const moneyClaim = finding.dimension === "pricing" || isMonthlyPriceClaim(finding.claim) || isSetupPriceClaim(finding.claim);
    if (!moneyClaim) return false;
    if (!numericNames.size) return false;
    const claim = finding.claim.toLowerCase();
    if ([...numericNames].some((name) => claim.includes(name) || finding.verifiesFounderCompetitor?.toLowerCase() === name)) {
      return true;
    }
    return !finding.verifiesFounderCompetitor && /category|vendors|benchmark|website-as-a-service/i.test(finding.claim);
  });
  const observations = pricingFindings
    .map(normalizePricingObservation)
    .filter((item): item is NonNullable<typeof item> => item != null);

  const monthlyFromModel = revenueModel.revenuePerCustomer.monthlyRecurring;
  const setupFromModel = revenueModel.architecture.setup;
  const monthlyParts = pricingFindings.filter((finding) => isMonthlyPriceClaim(finding.claim)).map((finding) => parseMoneyRange(finding.claim));
  const setupParts = pricingFindings.filter((finding) => isSetupPriceClaim(finding.claim)).map((finding) => parseMoneyRange(finding.claim));
  const monthly = rangeHasValue(monthlyFromModel) ? monthlyFromModel : monthlyParts.length ? mergeRanges(monthlyParts) : unknownRange();
  const setup = rangeHasValue(setupFromModel) ? setupFromModel : setupParts.length ? mergeRanges(setupParts) : unknownRange();

  const groundedSources = [...new Set(pricingFindings.flatMap((finding) => finding.sourceUrls))];
  const provenance: EconomicEvidenceClass = observations.length ? "COMPARABLE_MODELED" : "UNKNOWN";
  const confidence = confidenceFromSupport({
    sourceCount: groundedSources.length,
    comparableCount: numericNames.size,
    grounded: pricingFindings.some((finding) => finding.grounded),
  });

  const scenarios: PricingScenario[] = [
    {
      id: "CONSERVATIVE",
      setup: { low: setup.low, base: setup.low, high: setup.low },
      monthly: { low: monthly.low, base: monthly.low, high: monthly.low },
      rationale: "Low end of observed comparable ranges.",
    },
    {
      id: "BASE",
      setup,
      monthly,
      rationale: "Midpoint of observed comparable ranges.",
    },
    {
      id: "PREMIUM",
      setup: { low: setup.high, base: setup.high, high: setup.high },
      monthly: { low: monthly.high, base: monthly.high, high: monthly.high },
      rationale: "High end of observed comparable ranges.",
    },
  ];
  const recommendation = monthly.base != null || monthly.low != null ? scenarios[1]! : null;

  const cac = modelCac({ findings: input.packet.findings, provenance });
  const ltv = modelLtv({ findings: input.packet.findings, monthlyPrice: monthly, provenance });
  const cacRange = rangeHasValue(benchmarks.modeled.cac.range) ? benchmarks.modeled.cac.range : cac.range;
  const ltvRange = rangeHasValue(benchmarks.modeled.ltv.range) ? benchmarks.modeled.ltv.range : ltv.range;
  const marginRange = rangeHasValue(benchmarks.modeled.grossMargin.range) ? benchmarks.modeled.grossMargin.range : ltv.grossMarginPercent;
  const monthlyChurn = rangeHasValue(benchmarks.aggregations.monthly_churn?.acceptedRange ?? unknownRange())
    ? benchmarks.aggregations.monthly_churn!.acceptedRange
    : ltv.monthlyChurn;
  const lifetime = rangeHasValue(benchmarks.modeled.lifetimeMonths.range) ? benchmarks.modeled.lifetimeMonths.range : ltv.lifetimeMonths;
  const cacProvenance = rangeHasValue(cacRange) ? (rangeHasValue(benchmarks.modeled.cac.range) ? benchmarks.modeled.cac.provenance : provenance) : "UNKNOWN";
  const ltvProvenance = rangeHasValue(ltvRange) ? (rangeHasValue(benchmarks.modeled.ltv.range) ? benchmarks.modeled.ltv.provenance : provenance) : "UNKNOWN";
  const ltvCac = rangeHasValue(benchmarks.modeled.ltvCac.range) ? benchmarks.modeled.ltvCac.range : ltvCacRange(ltvRange, cacRange);
  const payback = rangeHasValue(benchmarks.modeled.payback.range)
    ? benchmarks.modeled.payback.range
    : paybackRange({
        cac: cacRange,
        monthlyRevenue: ltv.monthlyRevenue,
        grossMarginPercent: marginRange,
      });
  const breakEven = breakEvenRange({
    monthlyFixedCost: input.monthlyFixedCost ?? null,
    monthlyRevenue: ltv.monthlyRevenue,
    grossMarginPercent: marginRange,
  });
  const health = assessEconomicHealth({ ltvCac, provenance: rangeHasValue(ltvCac) ? "COMPARABLE_MODELED" : provenance });

  const founderHypothesis = input.founderPricingHypothesis?.trim()
    ? `Founder pricing hypothesis is FOUNDER_HYPOTHESIS and is not treated as comparable evidence: ${input.founderPricingHypothesis}`
    : "No founder pricing hypothesis provided.";

  const rationale = [
    recommendation
      ? `Comparable research supports a modeled monthly range of ${formatRange(monthly, "$")} and setup ${formatRange(setup, "$")}.`
      : "No comparable monthly price could be extracted; missing price is UNKNOWN, not free.",
    included.length
      ? `High/medium comparables: ${included.map((item) => item.name).join(", ")}.`
      : "No high-confidence economic comparables qualified.",
    excluded.length ? `Excluded weak comparables: ${excluded.map((item) => item.name).join(", ")}.` : "",
    `Category layer ${input.layers.category}; idea-specific ${input.layers.ideaSpecific}; unit ${input.layers.unitEconomics}.`,
    founderHypothesis,
    "COMPARABLE_MODELED values must not be stored as OBSERVED CAC/LTV.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    comparables: included,
    excludedComparables: excluded,
    pricing: {
      observations,
      scenarios,
      recommendation,
      rationale,
      provenance,
      confidence: recommendation ? confidence : "NONE",
    },
    cac: {
      channels: cac.channels.length ? cac.channels : benchmarks.componentCac.channel ? [benchmarks.componentCac.channel] : [],
      components: cac.components,
      range: cacRange,
      formula: rangeHasValue(benchmarks.modeled.cac.range) ? benchmarks.modeled.cac.calculation : cac.formula,
      provenance: cacProvenance,
      confidence: rangeHasValue(cacRange) ? (benchmarks.modeled.cac.confidence !== "NONE" ? benchmarks.modeled.cac.confidence : confidence) : "NONE",
    },
    ltv: {
      monthlyRevenue: ltv.monthlyRevenue,
      grossMarginPercent: marginRange,
      monthlyChurn,
      lifetimeMonths: lifetime,
      range: ltvRange,
      formula: rangeHasValue(benchmarks.modeled.ltv.range) ? benchmarks.modeled.ltv.calculation : ltv.formula,
      provenance: ltvProvenance,
      confidence: rangeHasValue(ltvRange) ? (benchmarks.modeled.ltv.confidence !== "NONE" ? benchmarks.modeled.ltv.confidence : confidence) : "NONE",
    },
    outputs: {
      arpu: ltv.monthlyRevenue,
      cac: cacRange,
      ltv: ltvRange,
      ltvCac,
      paybackMonths: payback,
      grossMarginPercent: marginRange,
      breakEvenCustomers: breakEven,
    },
    scenarios: buildScenarios({
      monthly,
      setup,
      cac: cacRange,
      ltv: ltvRange,
      margin: marginRange,
      churn: monthlyChurn,
      lifetime,
      ltvCac,
      payback,
      breakEven,
      provenance: rangeHasValue(ltvCac) ? "COMPARABLE_MODELED" : provenance,
    }),
    health: health.health,
    healthWhy: health.why,
    sensitivity: sensitivityDrivers({
      churnKnown: monthlyChurn.base != null,
      cacKnown: cacRange.base != null,
      priceKnown: monthly.base != null,
      marginKnown: marginRange.base != null,
    }),
    assumptions: [
      {
        id: "pricing",
        name: "Monthly price",
        range: monthly,
        unit: "usd_per_month",
        provenance,
        confidence,
        sourceRefs: observations.map((item) => item.sourceRef).filter((item): item is string => Boolean(item)),
        assumption: "Comparable public prices bound a modeled range.",
        calculationMethod: "Extract dollar ranges from grounded pricing/monetization findings; midpoint is base.",
        freshness: null,
        uncertainty: "Positioning and included services may not match this venture's product scope.",
      },
      {
        id: "cac",
        name: "CAC",
        range: cacRange,
        unit: "usd_per_customer",
        provenance: cacProvenance,
        confidence: rangeHasValue(cacRange) ? benchmarks.modeled.cac.confidence : "NONE",
        sourceRefs: [...new Set([...cac.components.flatMap((item) => item.sourceRefs), ...benchmarks.modeled.cac.sourceRefs])],
        assumption: rangeHasValue(benchmarks.modeled.cac.range) ? benchmarks.modeled.cac.calculation : cac.formula,
        calculationMethod: rangeHasValue(benchmarks.modeled.cac.range) ? benchmarks.modeled.cac.calculation : cac.formula,
        freshness: null,
        uncertainty: "Channel mix and close rate may differ from comparables.",
      },
      {
        id: "ltv",
        name: "LTV",
        range: ltvRange,
        unit: "usd",
        provenance: ltvProvenance,
        confidence: rangeHasValue(ltvRange) ? benchmarks.modeled.ltv.confidence : "NONE",
        sourceRefs: groundedSources,
        assumption: rangeHasValue(benchmarks.modeled.ltv.range) ? benchmarks.modeled.ltv.calculation : ltv.formula,
        calculationMethod: rangeHasValue(benchmarks.modeled.ltv.range) ? benchmarks.modeled.ltv.calculation : ltv.formula,
        freshness: null,
        uncertainty: "Churn and margin must be supported; unknown churn is not zero.",
      },
    ],
    buildImplication: {
      modeledSatisfiesBuild: false,
      observedSatisfiesBuild: provenanceMaySatisfyBuildEconomics("OBSERVED") && false,
      reason:
        "COMPANY_COMPARABLE, CATEGORY_BENCHMARK, ADJACENT_BENCHMARK, COMPARABLE_MODELED, SCENARIO_MODEL, VALIDATION_ESTIMATE, and FOUNDER_HYPOTHESIS cannot satisfy BUILD unit-economics. UNKNOWN fails closed.",
    },
    dimensionCoverage: {},
  };
}
