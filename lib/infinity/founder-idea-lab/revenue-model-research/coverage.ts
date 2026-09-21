import type { FounderResearchFinding, FounderResearchPacket } from "../research-packet";
import { claimHasNumericMonetization, coreMonthlyObservationsFromFindings, coreMonthlyRangeFromFindings, extractMoneyObservations } from "./extract";
import { rangeHasValue } from "../comparable-economics/provenance";
import { primaryRevenueModelType } from "./classify";
import type {
  RevenueModelComparable,
  RevenueModelCoverage,
  RevenueModelCoverageDimension,
  RevenueModelCoverageStatus,
  RevenueEvidenceSufficiency,
  RevenueSourceClass,
} from "./types";
import { REVENUE_MODEL_COVERAGE_DIMENSIONS } from "./types";
import type { VentureContext } from "../comparable-economics/qualify";
import { assessPricingEvidenceQuality } from "./price-quality";

const QUALITATIVE_MONETIZATION =
  /\b(subscription|monthly package|retainer|setup fee|pricing tier|plan|packages?|commission|per seat|per user|per location|add-?on|upsell)\b/i;

const DIMENSION_PATTERNS: Record<RevenueModelCoverageDimension, RegExp> = {
  revenue_model_type: /\b(subscription|saas|retainer|commission|marketplace|license|freemium|usage[- ]based|per (?:user|seat|location))\b/i,
  pricing_structure: /\b(pric(?:e|ing)|plan|package|tier)\b/i,
  monthly_subscription: /\b(monthly|\/\s*mo|per month|subscription)\b/i,
  annual_subscription: /\b(annual|per year|\/\s*year|12[- ]month)\b/i,
  setup_onboarding_fee: /\b(setup fee|onboarding fee|setup\/onboarding)\b/i,
  implementation_fee: /\b(implementation fee|implementation cost)\b/i,
  tiering_packaging: /\b(tier|package|plan|starter|professional|premium)\b/i,
  per_seat: /\b(per seat|\/\s*seat)\b/i,
  per_user: /\b(per user|\/\s*user)\b/i,
  per_location: /\b(per location|\/\s*location)\b/i,
  usage_based: /\b(usage[- ]based|metered|per request)\b/i,
  service_retainer: /\b(retainer|managed service|done-for-you)\b/i,
  commission: /\bcommission\b/i,
  marketplace_take_rate: /\b(marketplace|take\s*rate)\b/i,
  lead_generation_fee: /\b(lead gen|per lead|pay.?per.?lead)\b/i,
  advertising: /\b(advertising|ad revenue|sponsored listing)\b/i,
  licensing: /\b(licen[sc]e fee|software license)\b/i,
  premium_support: /\b(premium support|priority support|white glove)\b/i,
  add_ons: /\b(add-?on)\b/i,
  upsells: /\b(upsell|premium (?:feature|package|seo|aeo))\b/i,
  cross_sell: /\b(cross[- ]sell|bundle|additional (?:product|service))\b/i,
  contract_terms: /\b(contract|minimum term|cancellation|renewal|trial)\b/i,
  billing_cadence: /\b(monthly|annual|one[- ]time|usage|per transaction)\b/i,
  revenue_per_customer: /\b(\$\s*[\d,]+).{0,20}(per month|\/\s*mo|per year|\/\s*user)\b/i,
  gross_margin_basis: /\b(gross margin|contribution margin|\d+\s*%\s*margin)\b/i,
  customer_acquisition_basis: /\b(cac|customer acquisition|paid search cost)\b/i,
  retention_basis: /\b(churn|retention|lifetime)\b/i,
};

const OPTIONAL_UNLESS_MENTIONED: RevenueModelCoverageDimension[] = [
  "per_seat",
  "per_user",
  "per_location",
  "usage_based",
  "commission",
  "marketplace_take_rate",
  "lead_generation_fee",
  "advertising",
  "licensing",
  "cross_sell",
];

function dimensionState(
  dimension: RevenueModelCoverageDimension,
  claims: string[],
  numeric: boolean,
  hay: string,
): RevenueModelCoverage["dimensions"][RevenueModelCoverageDimension] {
  if (OPTIONAL_UNLESS_MENTIONED.includes(dimension) && !DIMENSION_PATTERNS[dimension].test(hay)) {
    return "not_applicable";
  }
  const hit = claims.some((claim) => DIMENSION_PATTERNS[dimension].test(claim));
  if (!hit) return "unknown";
  if (dimension === "revenue_per_customer") return numeric ? "covered" : "unknown";
  if (
    dimension === "pricing_structure" ||
    dimension === "monthly_subscription" ||
    dimension === "annual_subscription" ||
    dimension === "setup_onboarding_fee" ||
    dimension === "implementation_fee"
  ) {
    return numeric ? "covered" : "partial";
  }
  if (dimension === "tiering_packaging" && numeric) return "covered";
  return "partial";
}

export function categoryMonetizationIsNotEnough(layersCategory: string | null | undefined): boolean {
  return layersCategory === "SUPPORTED";
}

export function assessRevenueModelCoverage(input: {
  packet: FounderResearchPacket;
  comparables: RevenueModelComparable[];
  context?: VentureContext | null;
}): RevenueModelCoverage {
  const claims = input.packet.findings.map((item) => item.claim);
  const hay = claims.join(" ");
  const numeric = claims.some((claim) => claimHasNumericMonetization(claim));
  const monthlyRange = coreMonthlyRangeFromFindings(claims, input.context);
  const coreMonthlyCount = coreMonthlyObservationsFromFindings(claims, input.context).length;
  const setupHits = claims.some((claim) =>
    extractMoneyObservations(claim).some(
      (item) => item.kind === "SETUP_FEE" && (item.amountLow != null || item.amountHigh != null || item.amount != null),
    ),
  );
  const pricingQuality = assessPricingEvidenceQuality({ findings: input.packet.findings, context: input.context });
  const dimensions = Object.fromEntries(
    REVENUE_MODEL_COVERAGE_DIMENSIONS.map((dimension) => [dimension, dimensionState(dimension, claims, numeric, hay)]),
  ) as RevenueModelCoverage["dimensions"];

  const yesComparables = input.comparables.filter((row) => row.revenueModelRole === "YES");
  const numericComparables = input.comparables.filter(
    (row) => row.numericPricingContribution && row.monthlyPrice.low != null && row.monthlyPrice.high != null,
  );

  const structureKnown =
    QUALITATIVE_MONETIZATION.test(hay) ||
    primaryRevenueModelType(hay) !== "UNKNOWN" ||
    yesComparables.length >= 1 ||
    input.comparables.some((row) => row.revenueModelRole === "PARTIAL");
  const pricingSufficient = pricingQuality.status === "SUFFICIENT";
  const pricingPartial = !pricingSufficient && (coreMonthlyCount >= 1 || numericComparables.length >= 1 || numeric || pricingQuality.status === "PARTIAL");
  const structureStatus: RevenueEvidenceSufficiency = structureKnown ? "SUFFICIENT" : "INSUFFICIENT";
  const monthlyStatus: RevenueEvidenceSufficiency = pricingSufficient
    ? "SUFFICIENT"
    : pricingPartial
      ? "PARTIAL"
      : "INSUFFICIENT";
  const setupStatus: RevenueEvidenceSufficiency = setupHits ? "SUFFICIENT" : dimensions.setup_onboarding_fee === "partial" ? "PARTIAL" : "INSUFFICIENT";
  const upsellStatus: RevenueEvidenceSufficiency =
    dimensions.add_ons === "covered" || dimensions.upsells === "covered"
      ? "SUFFICIENT"
      : dimensions.add_ons === "partial" || dimensions.upsells === "partial"
        ? "PARTIAL"
        : "INSUFFICIENT";
  const billingStatus: RevenueEvidenceSufficiency =
    dimensions.billing_cadence === "covered" || dimensions.annual_subscription === "covered"
      ? "SUFFICIENT"
      : dimensions.billing_cadence === "partial"
        ? "PARTIAL"
        : "INSUFFICIENT";
  const arpuStatus: RevenueEvidenceSufficiency = rangeHasValue(monthlyRange)
    ? pricingSufficient
      ? "SUFFICIENT"
      : "PARTIAL"
    : "INSUFFICIENT";

  let status: RevenueModelCoverageStatus = "REVENUE_MODEL_INSUFFICIENT";
  let sufficientBasis = "No grounded comparable monetization evidence; category monetization SUPPORTED is not sufficient.";
  if (structureKnown && pricingSufficient) {
    status = "REVENUE_MODEL_SUFFICIENT";
    sufficientBasis = "Revenue structure and quality-sufficient monthly pricing evidence are both sufficient.";
  } else if (structureKnown && !pricingSufficient) {
    status = pricingPartial ? "REVENUE_MODEL_PARTIAL" : "REVENUE_MODEL_INSUFFICIENT";
    sufficientBasis = pricingQuality.reason;
  } else if (numericComparables.length >= 1 || pricingPartial) {
    status = "REVENUE_MODEL_PARTIAL";
    sufficientBasis = "Some monetization evidence exists but not enough comparables to mark sufficient.";
  } else if (structureKnown) {
    status = "REVENUE_MODEL_INSUFFICIENT";
    sufficientBasis = "Qualitative monetization language only; no defensible numeric money model.";
  }

  if (input.packet.monetizationLayers.category === "SUPPORTED" && status !== "REVENUE_MODEL_SUFFICIENT") {
    sufficientBasis =
      "Category monetization is SUPPORTED but that does not satisfy revenue-model coverage without comparable money evidence.";
  }

  const researchableGaps: string[] = [];
  if (monthlyStatus !== "SUFFICIENT") researchableGaps.push("actual comparable pricing");
  if (dimensions.setup_onboarding_fee !== "covered" && dimensions.implementation_fee !== "covered") {
    researchableGaps.push("setup/onboarding fee");
  }
  if (dimensions.monthly_subscription !== "covered") researchableGaps.push("recurring pricing structure");
  if (dimensions.tiering_packaging !== "covered" && dimensions.tiering_packaging !== "partial") {
    researchableGaps.push("tiering/packaging");
  }
  if (dimensions.add_ons === "unknown" && dimensions.upsells === "unknown") researchableGaps.push("add-ons/upsells");
  if (dimensions.annual_subscription === "unknown" && dimensions.contract_terms === "unknown") {
    researchableGaps.push("annual contracts");
  }
  if (dimensions.per_seat === "unknown" || dimensions.per_user === "unknown" || dimensions.per_location === "unknown" || dimensions.usage_based === "unknown") {
    researchableGaps.push("per-seat/per-location/usage structure");
  }
  if (dimensions.service_retainer === "unknown") researchableGaps.push("service intensity");
  if (dimensions.customer_acquisition_basis === "unknown") researchableGaps.push("distribution/acquisition model");
  if (dimensions.retention_basis === "unknown") researchableGaps.push("churn/retention benchmark");
  if (dimensions.gross_margin_basis === "unknown") researchableGaps.push("gross margin benchmark");

  const nextMoneyResearchTargets = [
    monthlyStatus !== "SUFFICIENT" ? "Find comparable public monthly pricing" : null,
    dimensions.setup_onboarding_fee !== "covered" && dimensions.implementation_fee !== "covered"
      ? "Find setup/onboarding pricing"
      : null,
    dimensions.tiering_packaging === "unknown" ? "Find packaging/tier evidence" : null,
    dimensions.add_ons === "unknown" && dimensions.upsells === "unknown" ? "Find comparable upsell pricing" : null,
    dimensions.annual_subscription === "unknown" ? "Find annual contract terms" : null,
    dimensions.gross_margin_basis === "unknown" ? "Find category gross-margin benchmark" : null,
  ].filter((item): item is string => Boolean(item));

  return {
    status,
    decisionCoverageIndependent: true,
    dimensions,
    revenueStructureStatus: structureStatus,
    pricingEvidenceStatus: monthlyStatus,
    setupEvidenceStatus: setupStatus,
    revenuePerCustomerStatus: arpuStatus,
    evidence: {
      businessModelStructure: structureStatus,
      monthlyPricingEvidence: monthlyStatus,
      setupPricingEvidence: setupStatus,
      upsellPricingEvidence: upsellStatus,
      billingEvidence: billingStatus,
      revenuePerCustomerEvidence: arpuStatus,
    },
    sufficientBasis,
    researchableGaps,
    nextMoneyResearchTargets,
    pricingQualityReason: pricingQuality.reason,
    stopReason:
      pricingSufficient && setupStatus !== "SUFFICIENT"
        ? "CORE_PRICING_SUFFICIENT_SETUP_REMAINS"
        : pricingSufficient
          ? "REVENUE_MODEL_SUFFICIENT"
          : null,
  };
}

export function qualitativeMonetizationFinding(finding: FounderResearchFinding): boolean {
  return QUALITATIVE_MONETIZATION.test(finding.claim) && !claimHasNumericMonetization(finding.claim);
}

export function findingsIndicateRevenueModel(findings: FounderResearchFinding[]): boolean {
  const text = findings.map((item) => item.claim).join(" ");
  return QUALITATIVE_MONETIZATION.test(text) || primaryRevenueModelType(text) !== "UNKNOWN";
}

export function findingsHaveNumericPricing(findings: FounderResearchFinding[]): boolean {
  return findings.some((item) =>
    extractMoneyObservations(item.claim).some(
      (obs) =>
        obs.amount != null &&
        !obs.vagueLanguage &&
        obs.unit === "USD" &&
        obs.kind !== "CHURN" &&
        obs.kind !== "GROSS_MARGIN",
    ),
  );
}

export function bestSourceClass(classes: RevenueSourceClass[]): RevenueSourceClass {
  const rank: Record<RevenueSourceClass, number> = {
    OFFICIAL_PRICING_PAGE: 100,
    OFFICIAL_PLAN_PAGE: 95,
    OFFICIAL_PRODUCT_PAGE: 80,
    OFFICIAL_TERMS: 75,
    PUBLIC_RATE_CARD: 70,
    PUBLIC_PROPOSAL: 65,
    PUBLIC_MARKETPLACE_LISTING: 55,
    CREDIBLE_CUSTOMER_REPORT: 50,
    CREDIBLE_REVIEW_COMPARISON: 40,
    CATEGORY_BENCHMARK: 30,
    UNKNOWN: 10,
  };
  return classes.reduce<RevenueSourceClass>((best, cls) => (rank[cls] > rank[best] ? cls : best), "UNKNOWN");
}
