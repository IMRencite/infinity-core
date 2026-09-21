import { unknownRange, type EconomicRange } from "../comparable-economics/provenance";
import type { AcquisitionChannel } from "../comparable-economics/types";
import type { VentureContext } from "../comparable-economics/qualify";
import type { BenchmarkAggregation, CacAdjustment, QualifiedBenchmark } from "./types";
import { aggregateDimension, feedsBaseCase } from "./aggregate";

function pick(agg: BenchmarkAggregation | undefined): EconomicRange {
  return agg?.acceptedRange ?? unknownRange();
}

function center(range: EconomicRange): number | null {
  return range.base ?? range.low ?? range.high;
}

export function modelComponentCac(aggregations: Partial<Record<string, BenchmarkAggregation>>): {
  used: boolean;
  channel: AcquisitionChannel | null;
  formula: string;
  range: EconomicRange;
} {
  const cpc = pick(aggregations.cost_per_click);
  const cpl = pick(aggregations.cost_per_lead);
  const vtl = pick(aggregations.visitor_to_lead_conversion);
  const ltc = pick(aggregations.lead_to_customer_conversion);
  const close = pick(aggregations.sales_close_rate);
  const scale = (range: EconomicRange, fn: (value: number) => number): EconomicRange => ({
    low: range.low != null ? fn(range.low) : null,
    base: range.base != null ? fn(range.base) : null,
    high: range.high != null ? fn(range.high) : null,
  });

  if (center(cpc) != null && center(vtl) != null && (center(ltc) != null || center(close) != null)) {
    const conv = center(ltc) != null ? ltc : close;
    const formula = "paid_search CAC = CPC ÷ (visitor-to-lead × lead-to-customer)";
    const cacFor = (cpcV: number | null, vtlV: number | null, ltcV: number | null) => {
      if (cpcV == null || vtlV == null || ltcV == null || vtlV <= 0 || ltcV <= 0) return null;
      return Math.round(cpcV / (vtlV * ltcV));
    };
    return {
      used: true,
      channel: "paid_search",
      formula,
      range: {
        low: cacFor(cpc.low ?? cpc.base, vtl.high ?? vtl.base, conv.high ?? conv.base),
        base: cacFor(cpc.base, vtl.base, conv.base),
        high: cacFor(cpc.high ?? cpc.base, vtl.low ?? vtl.base, conv.low ?? conv.base),
      },
    };
  }
  if (center(cpl) != null && (center(ltc) != null || center(close) != null)) {
    const conv = center(ltc) != null ? ltc : close;
    const cacFor = (lead: number | null, rate: number | null) =>
      lead != null && rate != null && rate > 0 ? Math.round(lead / rate) : null;
    return {
      used: true,
      channel: "paid_search",
      formula: "CAC = CPL ÷ lead-to-customer conversion",
      range: {
        low: cacFor(cpl.low ?? cpl.base, conv.high ?? conv.base),
        base: cacFor(cpl.base, conv.base),
        high: cacFor(cpl.high ?? cpl.base, conv.low ?? conv.base),
      },
    };
  }
  const labor = pick(aggregations.sales_labor_cost);
  if (center(labor) != null && center(close) != null) {
    const cacFor = (cost: number | null, rate: number | null) =>
      cost != null && rate != null && rate > 0 ? cost / rate : null;
    return {
      used: true,
      channel: "outbound",
      formula: "outbound CAC = (list/data + sales labor + touch cost) ÷ close rate",
      range: {
        low: cacFor(labor.low ?? labor.base, close.high ?? close.base),
        base: cacFor(labor.base, close.base),
        high: cacFor(labor.high ?? labor.base, close.low ?? close.base),
      },
    };
  }
  const partner = pick(aggregations.partner_fee);
  const acv = pick(aggregations.ACV);
  const arpu = pick(aggregations.ARPU);
  const contract = center(acv) != null ? acv : arpu.base != null ? scale(arpu, (value) => value * 12) : unknownRange();
  if (center(partner) != null && center(contract) != null) {
    const cacFor = (value: number | null, fee: number | null) =>
      value != null && fee != null && fee > 0 ? value * fee : null;
    return {
      used: true,
      channel: "partnership",
      formula: "partner CAC = ACV (or ARPU × 12) × partner commission",
      range: {
        low: cacFor(contract.low ?? contract.base, partner.low ?? partner.base),
        base: cacFor(contract.base, partner.base),
        high: cacFor(contract.high ?? contract.base, partner.high ?? partner.base),
      },
    };
  }
  const content = pick(aggregations.onboarding_cost);
  const ltcOnly = pick(aggregations.lead_to_customer_conversion);
  if (center(content) != null && center(ltcOnly) != null) {
    const cacFor = (cost: number | null, rate: number | null) =>
      cost != null && rate != null && rate > 0 ? cost / rate : null;
    return {
      used: true,
      channel: "content",
      formula: "content/SEO CAC = allocated content production cost ÷ lead-to-customer conversion",
      range: {
        low: cacFor(content.low ?? content.base, ltcOnly.high ?? ltcOnly.base),
        base: cacFor(content.base, ltcOnly.base),
        high: cacFor(content.high ?? content.base, ltcOnly.low ?? ltcOnly.base),
      },
    };
  }
  return { used: false, channel: null, formula: "No complete channel formula; missing CPC/CPL or conversion.", range: unknownRange() };
}

export function cacAdjustments(context: VentureContext, qualified: QualifiedBenchmark[]): CacAdjustment[] {
  const blob = `${context.title} ${context.description} ${context.proposedSolution} ${context.businessModelHypothesis} ${context.targetCustomer}`;
  const adjustments: CacAdjustment[] = [];
  const categorySelfServe = qualified.some((item) => /self-?serve/i.test(item.claim) && feedsBaseCase(item));
  if (/sales|demo|agency|onboarding/i.test(blob) && categorySelfServe) {
    adjustments.push({ name: "sales_assisted", factor: 0.2, why: "Venture appears sales-assisted versus self-serve category comps." });
  }
  if (/seo|managed|content|done-for-you/i.test(blob) && qualified.some((item) => /software-only|pure saas/i.test(item.claim))) {
    adjustments.push({ name: "service_intensity", factor: 0.15, why: "Service-heavy delivery versus software-only benchmarks." });
  }
  return adjustments;
}

export function applyAdjustments(range: EconomicRange, adjustments: CacAdjustment[]): EconomicRange {
  const factor = adjustments.reduce((sum, item) => sum * (1 + item.factor), 1);
  if (factor === 1) return range;
  const scale = (value: number | null) => (value == null ? null : Math.round(value * factor));
  return { low: scale(range.low), base: scale(range.base), high: scale(range.high) };
}

export function modelCacFromBenchmarks(input: {
  qualified: QualifiedBenchmark[];
  aggregations: Partial<Record<string, BenchmarkAggregation>>;
  context: VentureContext;
}): {
  range: EconomicRange;
  calculation: string;
  adjustments: CacAdjustment[];
  component: ReturnType<typeof modelComponentCac>;
  provenance: BenchmarkAggregation["provenance"];
  confidence: BenchmarkAggregation["confidence"];
  sourceRefs: string[];
  channelCac: {
    organic: number | null;
    paid: number | null;
    category: number | null;
    independentSourceCount: number;
    blendedFromSameSource: false;
    channelMismatch: boolean;
    channelMismatchReason: string | null;
  };
} {
  const component = modelComponentCac(input.aggregations);
  const adjustments = cacAdjustments(input.context, input.qualified);
  const cacItems = input.qualified.filter((item) => item.dimension === "customer_acquisition_cost" && feedsBaseCase(item));
  const hosts = new Set(
    cacItems.map((item) => {
      try {
        return new URL(item.sourceUrl).hostname.replace(/^www\./, "");
      } catch {
        return item.sourceUrl;
      }
    }),
  );
  const organic = cacItems.find((item) => item.channel === "seo" || item.channel === "content");
  const paid = cacItems.find((item) => item.channel === "paid_search" || item.channel === "social");
  const category = cacItems.find((item) => item.channel == null);
  const organicVal = organic ? (organic.range.base ?? organic.range.low ?? organic.range.high) : null;
  const paidVal = paid ? (paid.range.base ?? paid.range.low ?? paid.range.high) : null;
  const categoryVal = category ? (category.range.base ?? category.range.low ?? category.range.high) : null;
  const channelMismatch = paidVal != null && organicVal != null;
  const channelCac = {
    organic: organicVal,
    paid: paidVal,
    category: categoryVal,
    independentSourceCount: hosts.size,
    blendedFromSameSource: false as const,
    channelMismatch,
    channelMismatchReason: channelMismatch
      ? "Paid and organic CAC differ; do not use one channel against generic LTV/CAC without stating the channel."
      : null,
  };
  const mixedSameSource = hosts.size === 1 && cacItems.length >= 2;
  if (mixedSameSource) {
    const values = cacItems
      .map((item) => item.range.base ?? item.range.low ?? item.range.high)
      .filter((value): value is number => value != null);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const sorted = values.slice().sort((a, b) => a - b);
    const base =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2
        : sorted[Math.floor(sorted.length / 2)]!;
    const adjusted = applyAdjustments({ low, base, high }, adjustments);
    return {
      range: adjusted,
      calculation:
        "Channel or category CAC clues from one source. Not blended as independent benchmarks.",
      adjustments,
      component,
      provenance: "CATEGORY_BENCHMARK",
      confidence: "LOW",
      sourceRefs: [...new Set(cacItems.map((item) => item.sourceUrl))],
      channelCac,
    };
  }
  const direct = aggregateDimension("customer_acquisition_cost", input.qualified);
  if (direct.acceptedCount > 0 && (direct.acceptedRange.base != null || direct.acceptedRange.low != null)) {
    const adjusted = applyAdjustments(direct.acceptedRange, adjustments);
    const outlierIds = new Set(direct.rejectedOutliers.map((item) => item.observationId));
    return {
      range: adjusted,
      calculation: adjustments.length
        ? `Direct CAC ${direct.method} ${direct.base} with ${adjustments.map((item) => `${item.name} +${Math.round(item.factor * 100)}%`).join(", ")}.`
        : `Direct CAC median of ${direct.acceptedCount} accepted observations (${direct.method}).`,
      adjustments,
      component,
      provenance: "COMPARABLE_MODELED",
      confidence: direct.confidence,
      sourceRefs: input.qualified
        .filter((item) => item.dimension === "customer_acquisition_cost" && feedsBaseCase(item) && !outlierIds.has(item.observationId))
        .map((item) => item.sourceUrl),
      channelCac,
    };
  }
  if (component.used && component.range.base != null) {
    const adjusted = applyAdjustments(component.range, adjustments);
    return {
      range: adjusted,
      calculation: component.formula,
      adjustments,
      component,
      provenance: "COMPARABLE_MODELED",
      confidence: "LOW",
      sourceRefs: input.qualified.filter((item) => ["cost_per_click", "cost_per_lead", "visitor_to_lead_conversion", "lead_to_customer_conversion"].includes(item.dimension)).map((item) => item.sourceUrl),
      channelCac,
    };
  }
  return {
    range: unknownRange(),
    calculation: "UNKNOWN — no trustworthy CAC benchmark or complete component formula.",
    adjustments: [],
    component,
    provenance: "UNKNOWN",
    confidence: "NONE",
    sourceRefs: [],
    channelCac,
  };
}
