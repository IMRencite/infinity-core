import { formatApproximateUsd } from "@/lib/infinity/founder-idea-lab/money-presentation";
import type { FounderEstimateStrength } from "@/lib/infinity/founder-idea-lab/educated-estimates/types";
import type { ZeroToProductionStep } from "@/lib/infinity/founder-idea-lab/build-plan/types";
import type {
  CanonicalMonetizationPlanInput,
  CanonicalPerformanceInput,
  EconomicDisplayOrigin,
  ExpectedVsActualRow,
  ProvenanceRef,
  VentureEconomicMetricView,
  VentureEconomicsView,
} from "./types";
import { missingAtStage } from "./lifecycle";
import { MISSING_COPY, displayOr } from "./missing-data";

function confidenceFor(origin: EconomicDisplayOrigin): FounderEstimateStrength {
  if (origin === "OBSERVED") return "Strong";
  if (origin === "VALIDATED") return "Moderate";
  if (origin === "MODELED") return "Weak";
  return "Insufficient";
}

function usd(value: number | null, fallback: string): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return formatApproximateUsd(value);
}

function ratio(value: number | null, fallback: string): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return `${value.toFixed(2).replace(/\.00$/, "")}×`;
}

function months(value: number | null, fallback: string): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return `${Math.round(value * 10) / 10} months`;
}

function percent(value: number | null, fallback: string): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  const scaled = value > 1 ? value : value * 100;
  return `${Math.round(scaled * 10) / 10}%`;
}

function metricValue(input: CanonicalPerformanceInput, names: string[]): number | null {
  for (const name of names) {
    const row = input.aggregates.find((item) => item.metric.toLowerCase() === name);
    if (row && Number.isFinite(row.value)) return row.value;
  }
  return null;
}

function assessmentFor(input: CanonicalPerformanceInput, names: string[]): CanonicalPerformanceInput["assessments"][number] | null {
  for (const name of names) {
    const row = input.assessments.find((item) => item.metric.toLowerCase() === name);
    if (row) return row;
  }
  return null;
}

function pick(input: {
  id: string;
  label: string;
  actual: number | null;
  modeled: number | null;
  format: (value: number | null, fallback: string) => string;
  step: ZeroToProductionStep;
  sourceType: string;
  sourceId: string | null;
  help?: string;
}): VentureEconomicMetricView {
  const actualFallback = missingAtStage(input.step, "actual");
  const modeledFallback = missingAtStage(input.step, "estimate");
  const actualDisplay = input.format(input.actual, actualFallback);
  const expectedDisplay = input.format(input.modeled, modeledFallback);
  const origin: EconomicDisplayOrigin =
    input.actual != null ? "OBSERVED" : input.modeled != null ? "MODELED" : "MISSING";
  const display = origin === "OBSERVED" ? actualDisplay : origin === "MODELED" ? expectedDisplay : modeledFallback;
  let varianceDisplay: string | null = null;
  if (input.actual != null && input.modeled != null && input.modeled !== 0) {
    const delta = input.actual - input.modeled;
    const pct = (delta / Math.abs(input.modeled)) * 100;
    varianceDisplay = `${delta >= 0 ? "+" : ""}${Math.round(pct)}% vs expected`;
  }
  const provenance: ProvenanceRef = {
    field: input.id,
    sourceType: origin === "OBSERVED" ? "performance_intelligence" : input.sourceType,
    sourceId: input.sourceId,
    note: origin === "OBSERVED" ? "Observed / live wins over modeled estimates." : "Modeled estimate. Not observed.",
  };
  return {
    id: input.id,
    label: input.label,
    display,
    origin,
    confidence: confidenceFor(origin),
    actualDisplay,
    expectedDisplay,
    varianceDisplay,
    help: input.help,
    provenance,
  };
}

function expectedVsActualRow(
  metric: string,
  expected: string,
  actual: string,
  assessment: CanonicalPerformanceInput["assessments"][number] | null,
): ExpectedVsActualRow {
  if (!assessment || assessment.actualValue == null || assessment.expectedValue == null) {
    if (actual === MISSING_COPY.notMeasured || actual === MISSING_COPY.notApplicable || expected === MISSING_COPY.noEstimate) {
      return { metric, expected, actual, variance: MISSING_COPY.notMeasured, status: "insufficient_data" };
    }
  }
  const status = assessment?.status ?? "insufficient_data";
  const variance =
    assessment?.variancePercent != null
      ? `${assessment.variancePercent >= 0 ? "+" : ""}${Math.round(assessment.variancePercent)}%`
      : assessment?.variance != null
        ? String(assessment.variance)
        : MISSING_COPY.notMeasured;
  return { metric, expected, actual, variance, status };
}

export function composeEconomics(input: {
  plan: CanonicalMonetizationPlanInput | null;
  performance: CanonicalPerformanceInput;
  step: ZeroToProductionStep;
  sourceId: string | null;
}): { economics: VentureEconomicsView; expectedVsActual: ExpectedVsActualRow[] } {
  const plan = input.plan;
  const monthlyModeled = plan?.estimatedRevenuePerCustomer ?? plan?.estimatedPriceBase ?? null;
  const contributionModeled = plan?.contributionMarginPerCustomer ?? null;
  const cacModeled = plan?.estimatedCAC ?? null;
  const ltvModeled = plan?.estimatedLTV ?? null;
  const ltvCacModeled = plan?.ltvCacRatio ?? (ltvModeled != null && cacModeled ? ltvModeled / cacModeled : null);
  const marginModeled = plan?.estimatedGrossMarginPercent ?? null;
  const paybackModeled =
    plan?.estimatedMonthsToBreakEven ??
    (cacModeled != null && contributionModeled ? cacModeled / Math.max(contributionModeled, 0.0001) : null);
  const lifetimeModeled =
    monthlyModeled && ltvModeled ? ltvModeled / Math.max(monthlyModeled, 0.0001) : null;
  const firstYearModeled = monthlyModeled != null ? monthlyModeled * 12 : null;
  const firstYearContributionModeled = contributionModeled != null ? contributionModeled * 12 : null;
  const lifetimeContributionModeled =
    contributionModeled != null && lifetimeModeled != null ? contributionModeled * lifetimeModeled : null;

  const actualCac = metricValue(input.performance, ["cac"]);
  const actualRevenue = metricValue(input.performance, ["revenue_per_customer", "arpu", "gross_revenue", "revenue"]);
  const actualMargin = metricValue(input.performance, ["margin", "gross_margin"]);
  const actualConversion = metricValue(input.performance, ["conversion_rate"]);
  const actualRetention = metricValue(input.performance, ["retention", "logo_retention"]);
  const actualLtv = metricValue(input.performance, ["ltv"]);
  const actualPayback = metricValue(input.performance, ["payback"]);

  const monthly = pick({
    id: "core",
    label: "Monthly revenue / customer",
    actual: metricValue(input.performance, ["revenue_per_customer", "arpu"]),
    modeled: monthlyModeled,
    format: usd,
    step: input.step,
    sourceType: "monetization_plan",
    sourceId: input.sourceId,
    help: "Per-customer revenue. Observed values replace modeled estimates when both exist.",
  });
  const contribution = pick({
    id: "contribution",
    label: "Contribution profit / customer",
    actual: null,
    modeled: contributionModeled,
    format: usd,
    step: input.step,
    sourceType: "monetization_plan",
    sourceId: input.sourceId,
    help: "Revenue left after variable delivery costs. This is not company net profit.",
  });
  const cac = pick({
    id: "cac",
    label: "CAC",
    actual: actualCac,
    modeled: cacModeled,
    format: usd,
    step: input.step,
    sourceType: "monetization_plan",
    sourceId: input.sourceId,
  });
  const lifetime = pick({
    id: "lifetime",
    label: "Customer lifetime",
    actual: actualRetention != null ? (actualRetention > 1 ? actualRetention : 1 / Math.max(1 - actualRetention, 0.0001)) : null,
    modeled: lifetimeModeled,
    format: months,
    step: input.step,
    sourceType: "monetization_plan",
    sourceId: input.sourceId,
  });
  const ltv = pick({
    id: "ltv",
    label: "LTV",
    actual: actualLtv,
    modeled: ltvModeled,
    format: usd,
    step: input.step,
    sourceType: "monetization_plan",
    sourceId: input.sourceId,
  });
  const ltvCac = pick({
    id: "ltv-cac",
    label: "LTV/CAC",
    actual: actualLtv != null && actualCac ? actualLtv / actualCac : null,
    modeled: ltvCacModeled,
    format: ratio,
    step: input.step,
    sourceType: "monetization_plan",
    sourceId: input.sourceId,
  });
  const payback = pick({
    id: "payback",
    label: "Payback",
    actual: actualPayback,
    modeled: paybackModeled,
    format: months,
    step: input.step,
    sourceType: "monetization_plan",
    sourceId: input.sourceId,
  });
  const firstYear = pick({
    id: "first-year",
    label: "First-year revenue / customer",
    actual: null,
    modeled: firstYearModeled,
    format: usd,
    step: input.step,
    sourceType: "monetization_plan",
    sourceId: input.sourceId,
  });
  const firstYearContribution = pick({
    id: "first-year-contribution",
    label: "First-year contribution",
    actual: null,
    modeled: firstYearContributionModeled,
    format: usd,
    step: input.step,
    sourceType: "monetization_plan",
    sourceId: input.sourceId,
  });
  const lifetimeContribution = pick({
    id: "lifetime-contribution",
    label: "Lifetime contribution",
    actual: null,
    modeled: lifetimeContributionModeled,
    format: usd,
    step: input.step,
    sourceType: "monetization_plan",
    sourceId: input.sourceId,
  });
  const conversion = pick({
    id: "conversion",
    label: "Conversion",
    actual: actualConversion,
    modeled: null,
    format: percent,
    step: input.step,
    sourceType: "performance_intelligence",
    sourceId: input.sourceId,
  });
  const retention = pick({
    id: "retention",
    label: "Retention",
    actual: actualRetention,
    modeled: null,
    format: percent,
    step: input.step,
    sourceType: "performance_intelligence",
    sourceId: input.sourceId,
  });
  const margin = pick({
    id: "margin",
    label: "Margin",
    actual: actualMargin,
    modeled: marginModeled,
    format: percent,
    step: input.step,
    sourceType: "monetization_plan",
    sourceId: input.sourceId,
  });

  const observedCount = [monthly, contribution, cac, ltv, ltvCac, payback, margin].filter((item) => item.origin === "OBSERVED").length;
  const modeledCount = [monthly, contribution, cac, ltv, ltvCac, payback, margin].filter((item) => item.origin === "MODELED").length;
  const economicConfidence: VentureEconomicsView["economicConfidence"] =
    observedCount >= 3 ? "Strong" : modeledCount >= 3 ? "Moderate" : modeledCount > 0 ? "Weak" : "Weak";

  const expectedVsActual: ExpectedVsActualRow[] = [
    expectedVsActualRow("CAC", cac.expectedDisplay, cac.actualDisplay, assessmentFor(input.performance, ["cac"])),
    expectedVsActualRow("Revenue/customer", monthly.expectedDisplay, monthly.actualDisplay, assessmentFor(input.performance, ["gross_revenue", "revenue"])),
    expectedVsActualRow("Margin", margin.expectedDisplay, margin.actualDisplay, assessmentFor(input.performance, ["margin", "gross_margin"])),
    expectedVsActualRow("Conversion", conversion.expectedDisplay, conversion.actualDisplay, assessmentFor(input.performance, ["conversion_rate"])),
    expectedVsActualRow("Retention", retention.expectedDisplay, retention.actualDisplay, assessmentFor(input.performance, ["retention"])),
    expectedVsActualRow("LTV", ltv.expectedDisplay, ltv.actualDisplay, assessmentFor(input.performance, ["ltv"])),
  ].filter((row) => row.status !== "insufficient_data");

  return {
    economics: {
      monthlyRevenuePerCustomer: monthly,
      contributionProfitPerCustomer: contribution,
      cac,
      lifetime,
      ltv,
      ltvCac,
      payback,
      firstYearRevenuePerCustomer: firstYear,
      firstYearContribution,
      lifetimeContribution,
      conversion,
      retention,
      margin,
      economicConfidence,
      evidenceStrength: observedCount
        ? "Observed operating data preferred over modeled estimates."
        : modeledCount
          ? "Modeled estimates only — not observed."
          : "No reliable economic evidence yet.",
      prefersActuals: true,
    },
    expectedVsActual,
  };
}

export function metricCardsFrom(economics: VentureEconomicsView): Array<{
  id: string;
  label: string;
  value: string;
  confidence: FounderEstimateStrength;
  help?: string;
}> {
  return [
    economics.monthlyRevenuePerCustomer,
    economics.contributionProfitPerCustomer,
    economics.cac,
    economics.lifetime,
    economics.ltv,
    economics.ltvCac,
    economics.payback,
    economics.firstYearRevenuePerCustomer,
  ].map((item) => ({
    id: item.id,
    label: item.label,
    value: item.display,
    confidence: item.confidence === "Insufficient" ? "Weak" : item.confidence,
    help: item.help,
  }));
}

export function weakEconomics(economics: VentureEconomicsView): boolean {
  const ratioDisplay = economics.ltvCac.display;
  const numeric = Number(ratioDisplay.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 && numeric < 1;
}

export function promisingEconomics(economics: VentureEconomicsView): boolean {
  const ratioDisplay = economics.ltvCac.display;
  const numeric = Number(ratioDisplay.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) && numeric >= 3;
}

export function hasEconomics(economics: VentureEconomicsView): boolean {
  return [economics.monthlyRevenuePerCustomer, economics.cac, economics.ltv, economics.ltvCac].some(
    (item) => item.origin !== "MISSING",
  );
}

export function actualMetricLabels(economics: VentureEconomicsView): string[] {
  return [
    economics.cac,
    economics.monthlyRevenuePerCustomer,
    economics.conversion,
    economics.margin,
    economics.retention,
    economics.ltv,
    economics.payback,
  ]
    .filter((item) => item.origin === "OBSERVED")
    .map((item) => item.label);
}
