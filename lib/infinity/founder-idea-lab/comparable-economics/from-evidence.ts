import type { FounderResearchPacket } from "../research-packet";
import type { MonetizationEvidenceLayers } from "../monetization-levels";
import { modelCac } from "./cac";
import { modelLtv } from "./ltv";
import { isMonthlyPriceClaim, isSetupPriceClaim, normalizePricingObservation, parseMoneyRange } from "./pricing";
import {
  confidenceFromSupport,
  formatRange,
  mergeRanges,
  provenanceMaySatisfyBuildEconomics,
  unknownRange,
  type EconomicEvidenceClass,
} from "./provenance";
import { qualifyComparables, type VentureContext } from "./qualify";
import type { ComparableEconomicsModel, PricingScenario } from "./types";
import { assessEconomicHealth, breakEvenRange, buildScenarios, ltvCacRange, paybackRange, sensitivityDrivers } from "./unit-economics";

export function modelComparableEconomics(input: {
  packet: FounderResearchPacket;
  context: VentureContext;
  layers: MonetizationEvidenceLayers;
  founderPricingHypothesis?: string | null;
  monthlyFixedCost?: number | null;
}): ComparableEconomicsModel {
  const { included, excluded } = qualifyComparables({ packet: input.packet, context: input.context });
  const pricingFindings = input.packet.findings.filter((finding) => finding.dimension === "pricing" || isMonthlyPriceClaim(finding.claim) || isSetupPriceClaim(finding.claim));
  const observations = pricingFindings
    .map(normalizePricingObservation)
    .filter((item): item is NonNullable<typeof item> => item != null);

  const monthlyParts = pricingFindings.filter((finding) => isMonthlyPriceClaim(finding.claim)).map((finding) => parseMoneyRange(finding.claim));
  const setupParts = pricingFindings.filter((finding) => isSetupPriceClaim(finding.claim)).map((finding) => parseMoneyRange(finding.claim));
  const monthly = monthlyParts.length ? mergeRanges(monthlyParts) : unknownRange();
  const setup = setupParts.length ? mergeRanges(setupParts) : unknownRange();

  const groundedSources = [...new Set(input.packet.findings.flatMap((finding) => finding.sourceUrls))];
  const provenance: EconomicEvidenceClass = observations.length || included.length ? "COMPARABLE_MODELED" : "UNKNOWN";
  const confidence = confidenceFromSupport({
    sourceCount: groundedSources.length,
    comparableCount: included.length,
    grounded: input.packet.findings.some((finding) => finding.grounded),
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
  const ltvCac = ltvCacRange(ltv.range, cac.range);
  const payback = paybackRange({
    cac: cac.range,
    monthlyRevenue: ltv.monthlyRevenue,
    grossMarginPercent: ltv.grossMarginPercent,
  });
  const breakEven = breakEvenRange({
    monthlyFixedCost: input.monthlyFixedCost ?? null,
    monthlyRevenue: ltv.monthlyRevenue,
    grossMarginPercent: ltv.grossMarginPercent,
  });
  const health = assessEconomicHealth({ ltvCac, provenance });

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
      channels: cac.channels,
      components: cac.components,
      range: cac.range,
      formula: cac.formula,
      provenance: cac.range.base != null ? provenance : "UNKNOWN",
      confidence: cac.range.base != null ? confidence : "NONE",
    },
    ltv: {
      monthlyRevenue: ltv.monthlyRevenue,
      grossMarginPercent: ltv.grossMarginPercent,
      monthlyChurn: ltv.monthlyChurn,
      lifetimeMonths: ltv.lifetimeMonths,
      range: ltv.range,
      formula: ltv.formula,
      provenance: ltv.range.base != null ? provenance : "UNKNOWN",
      confidence: ltv.range.base != null ? confidence : "NONE",
    },
    outputs: {
      arpu: ltv.monthlyRevenue,
      cac: cac.range,
      ltv: ltv.range,
      ltvCac,
      paybackMonths: payback,
      grossMarginPercent: ltv.grossMarginPercent,
      breakEvenCustomers: breakEven,
    },
    scenarios: buildScenarios({
      monthly,
      setup,
      cac: cac.range,
      ltv: ltv.range,
      margin: ltv.grossMarginPercent,
      churn: ltv.monthlyChurn,
      lifetime: ltv.lifetimeMonths,
      ltvCac,
      payback,
      breakEven,
      provenance,
    }),
    health: health.health,
    healthWhy: health.why,
    sensitivity: sensitivityDrivers({
      churnKnown: ltv.monthlyChurn.base != null,
      cacKnown: cac.range.base != null,
      priceKnown: monthly.base != null,
      marginKnown: ltv.grossMarginPercent.base != null,
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
        range: cac.range,
        unit: "usd_per_customer",
        provenance: cac.range.base != null ? provenance : "UNKNOWN",
        confidence: cac.range.base != null ? confidence : "NONE",
        sourceRefs: cac.components.flatMap((item) => item.sourceRefs),
        assumption: cac.formula,
        calculationMethod: cac.formula,
        freshness: null,
        uncertainty: "Channel mix and close rate may differ from comparables.",
      },
      {
        id: "ltv",
        name: "LTV",
        range: ltv.range,
        unit: "usd",
        provenance: ltv.range.base != null ? provenance : "UNKNOWN",
        confidence: ltv.range.base != null ? confidence : "NONE",
        sourceRefs: groundedSources,
        assumption: ltv.formula,
        calculationMethod: ltv.formula,
        freshness: null,
        uncertainty: "Churn and margin must be supported; unknown churn is not zero.",
      },
    ],
    buildImplication: {
      modeledSatisfiesBuild: false,
      observedSatisfiesBuild: provenanceMaySatisfyBuildEconomics("OBSERVED") && false,
      reason:
        "COMPARABLE_MODELED and VALIDATION_ESTIMATE cannot satisfy BUILD unit-economics. FOUNDER_HYPOTHESIS cannot. UNKNOWN fails closed.",
    },
    dimensionCoverage: {},
  };
}
