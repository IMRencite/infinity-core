import type { EconomicConfidenceLevel, EconomicEvidenceClass, EconomicRange } from "../comparable-economics/provenance";
import { rangeHasValue, unknownRange } from "../comparable-economics/provenance";
import { weakestConfidence } from "../benchmark-economics/confidence";
import { ltvCacScenarios, modelLtvFromParts, paybackScenarios } from "../benchmark-economics/model-ltv";
import type { BenchmarkEconomicsResearch } from "../benchmark-economics/types";
import type { RevenueModelResearch } from "../revenue-model-research/types";
import { formatApproximateUsd, formatUsdRange, roundModeledUsd } from "../money-presentation";
import type {
  CacEstimatePaths,
  EducatedEconomicsModel,
  EducatedMetricEstimate,
  EstimateAssumption,
  EstimateAvailability,
  EstimateClass,
  FounderEstimateStrength,
  MarginEstimatePaths,
  RevenueAttachScenario,
} from "./types";

const ACTUAL: EducatedMetricEstimate["actual"] = "UNKNOWN";
const ACTUAL_DISPLAY = "Not measured yet";

export function estimateStrength(confidence: EconomicConfidenceLevel): FounderEstimateStrength {
  if (confidence === "HIGH") return "Strong";
  if (confidence === "MEDIUM") return "Moderate";
  if (confidence === "LOW") return "Weak";
  return "Insufficient";
}

export function classFromProvenance(value: EconomicEvidenceClass | string | null | undefined): EstimateClass {
  const raw = String(value ?? "UNKNOWN").toUpperCase();
  if (raw === "OBSERVED") return "OBSERVED";
  if (raw === "COMPANY_COMPARABLE" || raw === "DIRECT_COMPARABLE") return "DIRECT_COMPARABLE";
  if (raw === "CATEGORY_BENCHMARK") return "CATEGORY_BENCHMARK";
  if (raw === "ADJACENT_BENCHMARK") return "ADJACENT_BENCHMARK";
  if (raw === "COMPARABLE_MODELED" || raw === "COMPONENT_MODEL") return "COMPONENT_MODEL";
  if (raw === "SCENARIO_MODEL") return "SCENARIO_MODEL";
  if (raw === "FOUNDER_HYPOTHESIS" || raw === "VALIDATION_ESTIMATE") return "FOUNDER_HYPOTHESIS";
  return "UNKNOWN";
}

function roundRange(range: EconomicRange, kind: "usd" | "percent" | "months" | "ratio"): EconomicRange {
  const round = (value: number | null) => {
    if (value == null || !Number.isFinite(value)) return null;
    if (kind === "usd") return roundModeledUsd(value);
    if (kind === "percent") return Math.round(value * 1000) / 1000;
    if (kind === "months") return Math.round(value);
    return Math.round(value * 100) / 100;
  };
  return { low: round(range.low), base: round(range.base), high: round(range.high) };
}

function displayFor(range: EconomicRange, kind: "usd" | "percent" | "months" | "ratio"): { range: string; base: string } {
  if (!rangeHasValue(range)) return { range: "Not enough evidence yet", base: "Not enough evidence yet" };
  if (kind === "usd") {
    return { range: formatUsdRange(range.low, range.high), base: formatApproximateUsd(range.base ?? range.low ?? range.high) };
  }
  if (kind === "percent") {
    const pct = (value: number | null) => (value == null ? null : `${Math.round(value * 100)}%`);
    const low = pct(range.low);
    const high = pct(range.high);
    const base = pct(range.base ?? range.low ?? range.high);
    return {
      range: low && high && low !== high ? `${low}–${high}` : base ?? "Not enough evidence yet",
      base: base ?? "Not enough evidence yet",
    };
  }
  if (kind === "months") {
    const n = (value: number | null) => (value == null ? null : `${Math.round(value)}`);
    const low = n(range.low);
    const high = n(range.high);
    const base = n(range.base ?? range.low ?? range.high);
    return {
      range: low && high && low !== high ? `${low}–${high} months` : base ? `${base} months` : "Not enough evidence yet",
      base: base ? `${base} months` : "Not enough evidence yet",
    };
  }
  const n = (value: number | null) => (value == null ? null : `${Math.round(value * 10) / 10}`);
  const low = n(range.low);
  const high = n(range.high);
  const base = n(range.base ?? range.low ?? range.high);
  return {
    range: low && high && low !== high ? `${low}–${high}×` : base ? `${base}×` : "Not enough evidence yet",
    base: base ? `${base}×` : "Not enough evidence yet",
  };
}

function metric(input: {
  range: EconomicRange;
  kind: "usd" | "percent" | "months" | "ratio";
  confidence: EconomicConfidenceLevel;
  provenance: EstimateClass;
  formula: string;
  assumptions: EstimateAssumption[];
  basis: string;
  whatIsIt: string;
  why: string;
  whatToTestNext: string;
}): EducatedMetricEstimate | null {
  if (!rangeHasValue(input.range) || input.confidence === "NONE" || input.provenance === "UNKNOWN") return null;
  const rounded = roundRange(input.range, input.kind);
  const shown = displayFor(rounded, input.kind);
  const strength = estimateStrength(input.confidence);
  return {
    actual: ACTUAL,
    actualDisplay: ACTUAL_DISPLAY,
    bestEstimate: rounded,
    displayRange: shown.range,
    displayBase: shown.base,
    confidence: input.confidence,
    strength,
    provenance: input.provenance,
    formula: input.formula,
    assumptions: input.assumptions,
    basis: input.basis,
    whatIsIt: input.whatIsIt,
    whatInfinityEstimates: shown.range,
    why: input.why,
    whatToTestNext: input.whatToTestNext,
    nextValidation: input.whatToTestNext,
    modeledNotObserved: true,
    grantsBuild: false,
  };
}

function fromModeled(input: {
  range: EconomicRange;
  confidence: EconomicConfidenceLevel;
  provenance: EconomicEvidenceClass | string;
  calculation: string;
  kind: "usd" | "percent" | "months" | "ratio";
  whatIsIt: string;
  why: string;
  whatToTestNext: string;
  basis?: string;
}): EducatedMetricEstimate | null {
  return metric({
    range: input.range,
    kind: input.kind,
    confidence: input.confidence,
    provenance: classFromProvenance(input.provenance),
    formula: input.calculation,
    assumptions: [],
    basis: input.basis ?? "Persisted modeled evidence from comparable and category research.",
    whatIsIt: input.whatIsIt,
    why: input.why,
    whatToTestNext: input.whatToTestNext,
  });
}

function center(agg: { acceptedRange?: EconomicRange } | undefined): number | null {
  const range = agg?.acceptedRange;
  if (!range) return null;
  return range.base ?? range.low ?? range.high;
}

/**
 * Paid-search CAC scenario: only when at least one grounded acquisition-cost input exists.
 * Missing conversion stages are labeled MODELED_ASSUMPTION, never silent.
 */
export function scenarioCacFromPartialChain(aggregations: BenchmarkEconomicsResearch["aggregations"]): {
  range: EconomicRange;
  assumptions: EstimateAssumption[];
  formula: string;
} | null {
  const cpc = center(aggregations.cost_per_click);
  const cpl = center(aggregations.cost_per_lead);
  if (cpc == null && cpl == null) return null;
  const vtl = center(aggregations.visitor_to_lead_conversion);
  const ltc = center(aggregations.lead_to_customer_conversion) ?? center(aggregations.sales_close_rate);
  const assumptions: EstimateAssumption[] = [];
  const vtlUsed = vtl ?? 0.02;
  const ltcUsed = ltc ?? 0.1;
  if (vtl == null) {
    assumptions.push({
      name: "visitor→lead",
      value: "1%–4% (used 2%)",
      label: "MODELED_ASSUMPTION",
      why: "No grounded visitor-to-lead rate; SMB software landing-page conversion is assumed and disclosed.",
    });
  } else {
    assumptions.push({
      name: "visitor→lead",
      value: `${Math.round(vtl * 1000) / 10}%`,
      label: "BENCHMARK",
      why: "Grounded conversion observation.",
    });
  }
  if (ltc == null) {
    assumptions.push({
      name: "lead→customer",
      value: "5%–20% (used 10%)",
      label: "MODELED_ASSUMPTION",
      why: "No grounded close rate; SMB software close-rate band is assumed and disclosed.",
    });
  } else {
    assumptions.push({
      name: "lead→customer",
      value: `${Math.round(ltc * 1000) / 10}%`,
      label: "BENCHMARK",
      why: "Grounded close/lead-to-customer observation.",
    });
  }
  if (cpc != null) {
    assumptions.unshift({
      name: "CPC",
      value: formatApproximateUsd(cpc),
      label: "BENCHMARK",
      why: "Grounded cost-per-click observation.",
    });
    const cacFor = (cpcV: number, vtlV: number, ltcV: number) => Math.round(cpcV / (vtlV * ltcV));
    const lowVtl = vtl ?? 0.04;
    const highVtl = vtl ?? 0.01;
    const lowLtc = ltc ?? 0.2;
    const highLtc = ltc ?? 0.05;
    return {
      range: {
        low: cacFor(cpc * 0.8, lowVtl, lowLtc),
        base: cacFor(cpc, vtlUsed, ltcUsed),
        high: cacFor(cpc * 1.2, highVtl, highLtc),
      },
      assumptions,
      formula: "paid-search CAC = CPC ÷ (visitor→lead × lead→customer)",
    };
  }
  assumptions.unshift({
    name: "CPL",
    value: formatApproximateUsd(cpl),
    label: "BENCHMARK",
    why: "Grounded cost-per-lead observation.",
  });
  const cacFromCpl = (cplV: number, ltcV: number) => Math.round(cplV / ltcV);
  return {
    range: {
      low: cacFromCpl(cpl! * 0.8, ltc ?? 0.2),
      base: cacFromCpl(cpl!, ltcUsed),
      high: cacFromCpl(cpl! * 1.2, ltc ?? 0.05),
    },
    assumptions,
    formula: "CAC = CPL ÷ lead→customer",
  };
}

/**
 * Disclosed AI/hybrid CMS contribution-margin scenario.
 * Unknown real costs are never treated as zero; they are replaced only by labeled assumptions.
 */
export function scenarioMarginAssumptions(serviceHeavy: boolean): {
  assumptions: EstimateAssumption[];
  conservative: number;
  base: number;
  upside: number;
} {
  const payment = { low: 0.025, base: 0.029, high: 0.035 };
  const hosting = { low: 0.04, base: 0.08, high: 0.12 };
  const aiApi = { low: 0.08, base: 0.14, high: 0.22 };
  const support = { low: 0.06, base: 0.1, high: 0.15 };
  const labor = serviceHeavy ? { low: 0.08, base: 0.12, high: 0.2 } : { low: 0, base: 0, high: 0.05 };
  const sum = (pick: "low" | "base" | "high") =>
    payment[pick] + hosting[pick] + aiApi[pick] + support[pick] + labor[pick];
  const cogsHigh = sum("high");
  const cogsBase = sum("base");
  const cogsLow = sum("low");
  const clamp = (value: number) => Math.min(0.85, Math.max(0.05, 1 - value));
  const assumptions: EstimateAssumption[] = [
    {
      name: "Payment processing",
      value: "2.5%–3.5% of revenue",
      label: "CATEGORY_BENCHMARK",
      why: "Typical card-network / processor take-rate for SaaS. Not observed Infinity costs.",
    },
    {
      name: "Hosting",
      value: "4%–12% of revenue",
      label: "CATEGORY_BENCHMARK",
      why: "Hosted SMB website-platform infrastructure band. Not a measured Infinity bill.",
    },
    {
      name: "AI/API",
      value: "8%–22% of revenue",
      label: "SCENARIO_ASSUMPTION",
      why: "AI CMS generation/inference is expected to be a material variable cost. Not observed usage.",
    },
    {
      name: "Support",
      value: "6%–15% of revenue",
      label: "SCENARIO_ASSUMPTION",
      why: "SMB software support burden. Not observed ticket cost.",
    },
    {
      name: "Service labor",
      value: serviceHeavy ? "8%–20% of revenue" : "0%–5% of revenue",
      label: "SCENARIO_ASSUMPTION",
      why: serviceHeavy
        ? "Hybrid software/service delivery is in the founder model, so some fulfillment labor is included."
        : "Core platform is treated as software-first; managed work is optional, not zeroed silently.",
    },
  ];
  return {
    assumptions,
    conservative: clamp(cogsHigh),
    base: clamp(cogsBase),
    upside: clamp(cogsLow),
  };
}

function classifyAvailability(estimate: EducatedMetricEstimate | null): EstimateAvailability {
  if (!estimate || !rangeHasValue(estimate.bestEstimate)) return "INSUFFICIENT";
  if (estimate.provenance === "SCENARIO_MODEL" || estimate.provenance === "FOUNDER_HYPOTHESIS") return "SCENARIO_AVAILABLE";
  return "AVAILABLE";
}

function persistedSource(range: EconomicRange | null | undefined, path: string): string | null {
  return rangeHasValue(range ?? unknownRange()) ? path : null;
}

function attachScenarios(input: {
  core: EducatedMetricEstimate | null;
  addOn: EducatedMetricEstimate | null;
  managed: EducatedMetricEstimate | null;
  setup: EducatedMetricEstimate | null;
}): RevenueAttachScenario[] {
  const core = input.core?.bestEstimate.base ?? null;
  const addOn = input.addOn?.bestEstimate.base ?? null;
  const managed = input.managed?.bestEstimate.base ?? null;
  const setup = input.setup?.bestEstimate.base ?? 0;
  const year = (monthly: number | null) =>
    monthly == null ? "Not enough evidence yet" : formatApproximateUsd(Math.round(monthly * 12 + setup));
  const month = (monthly: number | null) => (monthly == null ? "Not enough evidence yet" : formatApproximateUsd(monthly));
  const coreOnly: RevenueAttachScenario = {
    id: "CORE_ONLY",
    label: "Core only",
    monthly: month(core),
    firstYear: year(core),
    assumption: "Core subscription plus setup. Optional streams are excluded.",
    available: core != null ? "AVAILABLE" : "INSUFFICIENT",
  };
  const plusAddOn: RevenueAttachScenario = {
    id: "CORE_PLUS_ADDON",
    label: "Core + add-on",
    monthly: month(core != null && addOn != null ? core + addOn : null),
    firstYear: year(core != null && addOn != null ? core + addOn : null),
    assumption: "Assumes 100% add-on attach. No adoption evidence is persisted.",
    available: core != null && addOn != null ? "SCENARIO_AVAILABLE" : "INSUFFICIENT",
  };
  const plusManaged: RevenueAttachScenario = {
    id: "CORE_PLUS_MANAGED",
    label: "Core + managed service",
    monthly: month(core != null && managed != null ? core + managed : null),
    firstYear: year(core != null && managed != null ? core + managed : null),
    assumption: "Assumes 100% managed-service attach. No adoption evidence is persisted.",
    available: core != null && managed != null ? "SCENARIO_AVAILABLE" : "INSUFFICIENT",
  };
  const full: RevenueAttachScenario = {
    id: "FULL_SERVICE",
    label: "Full service",
    monthly: month(core != null && addOn != null && managed != null ? core + addOn + managed : null),
    firstYear: year(core != null && addOn != null && managed != null ? core + addOn + managed : null),
    assumption: "Assumes 100% managed-service and add-on attach. No adoption evidence is persisted.",
    available: core != null && addOn != null && managed != null ? "SCENARIO_AVAILABLE" : "INSUFFICIENT",
  };
  return [coreOnly, plusAddOn, plusManaged, full];
}

function pickPreferred(options: Array<EducatedMetricEstimate | null>): EducatedMetricEstimate | null {
  const rank: Record<EstimateClass, number> = {
    OBSERVED: 0,
    DIRECT_COMPARABLE: 1,
    CATEGORY_BENCHMARK: 2,
    ADJACENT_BENCHMARK: 3,
    COMPONENT_MODEL: 4,
    SCENARIO_MODEL: 5,
    FOUNDER_HYPOTHESIS: 6,
    UNKNOWN: 7,
  };
  const present = options.filter((item): item is EducatedMetricEstimate => Boolean(item));
  present.sort((a, b) => rank[a.provenance] - rank[b.provenance]);
  return present[0] ?? null;
}

export function buildEducatedEconomicsModel(input: {
  revenueModel?: RevenueModelResearch | null;
  benchmark: BenchmarkEconomicsResearch;
  serviceHeavy?: boolean;
}): EducatedEconomicsModel {
  const bench = input.benchmark;
  const rpc = input.revenueModel?.revenuePerCustomer;
  const serviceHeavy =
    input.serviceHeavy ??
    /hybrid|managed|service|seo|content/i.test(input.revenueModel?.recommended.recommendedModel ?? "");

  const coreMonthly = fromModeled({
    range: rpc?.coreRecurringARPU ?? bench.modeled.arpu.range,
    confidence: rpc?.arpuModel.confidence ?? bench.modeled.arpu.confidence,
    provenance: rpc?.arpuModel.provenance ?? bench.modeled.arpu.provenance,
    calculation: "Core monthly revenue from the selected pricing cluster only.",
    kind: "usd",
    whatIsIt: "What a customer would likely pay each month for the core platform.",
    why: "Public comparable pricing in the selected cluster, not Infinity's own sales.",
    whatToTestNext: "Publish a core price and see what similar businesses actually pay.",
  });
  const totalMonthly = fromModeled({
    range: rpc?.totalModeledMonthlyRevenuePerCustomer ?? rpc?.monthlyRecurring ?? unknownRange(),
    confidence: rpc?.arpuModel.confidence ?? bench.modeled.arpu.confidence,
    provenance: rpc?.arpuModel.provenance ?? "COMPARABLE_MODELED",
    calculation: "Core + optional managed/add-on monthly revenue when those streams are evidenced separately.",
    kind: "usd",
    whatIsIt: "Total monthly revenue per customer if optional streams also attach.",
    why: "Managed and add-on prices are kept separate from core software pricing.",
    whatToTestNext: "Test whether customers buy the core platform alone or with services.",
  });
  const setup = fromModeled({
    range: rpc?.firstYearSetup ?? unknownRange(),
    confidence: input.revenueModel?.coverage.setupEvidenceStatus === "SUFFICIENT" ? "MEDIUM" : "LOW",
    provenance: "COMPARABLE_MODELED",
    calculation: "Setup/onboarding fee from comparable implementation evidence, kept separate from recurring ARPU.",
    kind: "usd",
    whatIsIt: "One-time setup or onboarding revenue per customer.",
    why: "Comparable platforms often charge a launch/implementation fee.",
    whatToTestNext: "Quote a setup fee and measure take-rate versus waiving it.",
  });
  const managedMonthly = fromModeled({
    range: rpc?.managedServiceARPU ?? unknownRange(),
    confidence: rpc?.arpuModel.confidence ?? "LOW",
    provenance: "COMPARABLE_MODELED",
    calculation: "Optional managed-service monthly revenue. Not folded into core ARPU.",
    kind: "usd",
    whatIsIt: "Optional managed-service monthly revenue per customer.",
    why: "Comparable managed/agency packages. Adoption is not assumed unless a scenario says so.",
    whatToTestNext: "Measure what share of customers buy managed service.",
  });
  const addOnMonthly = fromModeled({
    range: rpc?.addOnARPU ?? unknownRange(),
    confidence: rpc?.arpuModel.confidence ?? "LOW",
    provenance: "COMPARABLE_MODELED",
    calculation: "Optional add-on/tooling monthly revenue. Not folded into core ARPU.",
    kind: "usd",
    whatIsIt: "Optional add-on or tooling monthly revenue per customer.",
    why: "Comparable tooling/add-on prices. Adoption is not assumed unless a scenario says so.",
    whatToTestNext: "Measure add-on attach rate after the first 20 customers.",
  });

  const directCac = rangeHasValue(bench.modeled.cac.range)
    ? fromModeled({
        range: bench.modeled.cac.range,
        confidence: bench.modeled.cac.confidence,
        provenance: bench.modeled.cac.provenance,
        calculation: bench.modeled.cac.calculation,
        kind: "usd",
        whatIsIt: "Customer acquisition cost",
        why: "Similar SMB software businesses and category benchmarks suggest this range.",
        whatToTestNext: "Run a small paid-search and outbound campaign.",
        basis: "Direct or category CAC benchmarks. Not Infinity's actual spend.",
      })
    : null;
  const componentCac =
    bench.componentCac.used && rangeHasValue(bench.componentCac.range)
      ? metric({
          range: bench.componentCac.range,
          kind: "usd",
          confidence: "LOW",
          provenance: "COMPONENT_MODEL",
          formula: bench.componentCac.formula,
          assumptions: [],
          basis: "Component CAC from grounded CPC/conversion chain.",
          whatIsIt: "Customer acquisition cost from channel math",
          why: "Infinity multiplied grounded acquisition-funnel inputs instead of using a headline CAC.",
          whatToTestNext: "Measure real CPC, visitor→lead, and close rate.",
        })
      : null;
  const scenarioCacRaw = scenarioCacFromPartialChain(bench.aggregations);
  const scenarioCac = scenarioCacRaw
    ? metric({
        range: scenarioCacRaw.range,
        kind: "usd",
        confidence: "LOW",
        provenance: "SCENARIO_MODEL",
        formula: scenarioCacRaw.formula,
        assumptions: scenarioCacRaw.assumptions,
        basis: "Partial grounded CAC chain plus disclosed assumptions for missing stages.",
        whatIsIt: "Customer acquisition cost",
        why: "A complete grounded CAC chain was not available, so Infinity completed the formula with labeled assumptions.",
        whatToTestNext: "Fill the missing funnel stage with a bounded live test.",
      })
    : null;
  const cac: CacEstimatePaths = {
    directBenchmark: directCac,
    componentModel: componentCac,
    scenarioModel: scenarioCac,
    selected: pickPreferred([directCac, componentCac, scenarioCac]),
  };

  const retention = fromModeled({
    range: bench.modeled.lifetimeMonths.range,
    confidence: bench.modeled.lifetimeMonths.confidence,
    provenance: bench.modeled.lifetimeMonths.provenance,
    calculation: bench.modeled.lifetimeMonths.calculation,
    kind: "months",
    whatIsIt: "How long a customer is expected to stay",
    why: "Compatible logo/customer churn or lifetime evidence, not revenue churn.",
    whatToTestNext: "Measure monthly logo churn after the first 20 customers.",
  });

  const directMargin = rangeHasValue(bench.modeled.grossMargin.range)
    ? fromModeled({
        range: bench.modeled.grossMargin.range,
        confidence: bench.modeled.grossMargin.confidence,
        provenance: bench.modeled.grossMargin.provenance,
        calculation: bench.modeled.grossMargin.calculation,
        kind: "percent",
        whatIsIt: "Gross margin",
        why: "Relevant company or category margin evidence.",
        whatToTestNext: "Collect actual hosting, AI/API, and support costs.",
      })
    : null;
  const componentMargin =
    rangeHasValue(bench.modeled.contributionMargin.range) && /component/i.test(bench.modeled.contributionMargin.calculation)
      ? fromModeled({
          range: bench.modeled.contributionMargin.range,
          confidence: bench.modeled.contributionMargin.confidence,
          provenance: "COMPONENT_MODEL",
          calculation: bench.modeled.contributionMargin.calculation,
          kind: "percent",
          whatIsIt: "Contribution margin from known variable costs",
          why: "Grounded cost components were complete enough to subtract from revenue.",
          whatToTestNext: "Replace remaining assumed costs with invoices.",
        })
      : null;
  const scenarioBand = !directMargin && !componentMargin && (coreMonthly || rangeHasValue(bench.modeled.arpu.range))
    ? scenarioMarginAssumptions(serviceHeavy)
    : null;
  const scenarioMargin = scenarioBand
    ? metric({
        range: { low: scenarioBand.conservative, base: scenarioBand.base, high: scenarioBand.upside },
        kind: "percent",
        confidence: "LOW",
        provenance: "SCENARIO_MODEL",
        formula: "contribution margin = 1 − (payment + hosting + AI/API + support + service labor) / revenue",
        assumptions: scenarioBand.assumptions,
        basis: "No usable gross-margin benchmark. Infinity used a disclosed AI/hybrid CMS cost scenario. This is contribution margin, not observed gross margin.",
        whatIsIt: "Estimated contribution margin",
        why: "Infinity could not find a defensible company/category gross-margin benchmark, so it modeled typical variable costs for an AI website platform and labeled every assumption.",
        whatToTestNext: "Replace assumed hosting, AI/API, and support costs with real invoices.",
      })
    : null;
  const margin: MarginEstimatePaths = {
    directBenchmark: directMargin,
    componentModel: componentMargin,
    scenarioModel: scenarioMargin,
    selected: pickPreferred([directMargin, componentMargin, scenarioMargin]),
    unknownCostsTreatedAsZero: false,
    costAssumptions: scenarioBand?.assumptions ?? [],
  };

  const monthlyForLtv = coreMonthly?.bestEstimate ?? (rangeHasValue(bench.modeled.arpu.range) ? bench.modeled.arpu.range : unknownRange());
  const marginForLtv = margin.selected?.bestEstimate ?? unknownRange();
  const lifeForLtv = retention?.bestEstimate ?? bench.modeled.lifetimeMonths.range;
  const ltvParts = modelLtvFromParts({
    monthlyPrice: monthlyForLtv,
    grossMargin: marginForLtv,
    lifetimeMonths: lifeForLtv,
  });
  const ltvConfidence = rangeHasValue(ltvParts.range)
    ? weakestConfidence(
        coreMonthly?.confidence ?? bench.modeled.arpu.confidence,
        margin.selected?.confidence ?? "NONE",
        retention?.confidence ?? bench.modeled.lifetimeMonths.confidence,
      )
    : "NONE";
  const ltv = metric({
    range: ltvParts.range,
    kind: "usd",
    confidence: ltvConfidence,
    provenance: margin.selected?.provenance === "SCENARIO_MODEL" ? "SCENARIO_MODEL" : "COMPONENT_MODEL",
    formula: ltvParts.formula,
    assumptions: margin.selected?.assumptions ?? [],
    basis: "LTV = monthly revenue × margin × expected lifetime months. Confidence cannot exceed the weakest input.",
    whatIsIt: "Customer lifetime value",
    why: "Infinity combined modeled monthly revenue, a disclosed margin estimate, and compatible retention.",
    whatToTestNext: "Confirm margin with real costs and retention with actual logo churn.",
  });

  const cacRange = cac.selected?.bestEstimate ?? unknownRange();
  const ltvCac = ltv && rangeHasValue(cacRange) ? ltvCacScenarios(ltv.bestEstimate, cacRange) : null;
  const ltvCacConfidence = ltv && cac.selected ? weakestConfidence(ltv.confidence, cac.selected.confidence) : "NONE";
  const payback = ltv && cac.selected && rangeHasValue(marginForLtv)
    ? paybackScenarios({ cac: cacRange, monthlyPrice: monthlyForLtv, grossMargin: marginForLtv })
    : null;
  const paybackConfidence = payback && rangeHasValue(payback.range)
    ? weakestConfidence(cac.selected?.confidence ?? "NONE", margin.selected?.confidence ?? "NONE", coreMonthly?.confidence ?? "NONE")
    : "NONE";

  const setupBase = setup?.bestEstimate.base ?? 0;
  const yearRev = rangeHasValue(monthlyForLtv)
    ? {
        low: Math.round((monthlyForLtv.low ?? monthlyForLtv.base ?? 0) * 12 + setupBase),
        base: Math.round((monthlyForLtv.base ?? 0) * 12 + setupBase),
        high: Math.round((monthlyForLtv.high ?? monthlyForLtv.base ?? 0) * 12 + setupBase),
      }
    : unknownRange();
  const firstYear = metric({
    range: yearRev,
    kind: "usd",
    confidence: weakestConfidence(coreMonthly?.confidence ?? "NONE", setup?.confidence ?? "LOW"),
    provenance: "COMPONENT_MODEL",
    formula: "first-year customer revenue = setup + 12 × monthly core revenue (revenue, not profit)",
    assumptions: [],
    basis: "Does not apply margin. This is first-year revenue per customer, not contribution.",
    whatIsIt: "First-year customer value (revenue)",
    why: "Setup plus a year of core subscription, before costs.",
    whatToTestNext: "Track actual first-year collections versus this envelope.",
  });

  const revenueScenarios = attachScenarios({
    core: coreMonthly,
    addOn: addOnMonthly,
    managed: managedMonthly,
    setup,
  });
  const inputSources = {
    coreArpu:
      persistedSource(rpc?.coreRecurringARPU, "explainability.revenueModel.revenuePerCustomer.coreRecurringARPU") ??
      persistedSource(bench.modeled.arpu.range, "explainability.benchmarkEconomics.modeled.arpu.range") ??
      "UNKNOWN — not present on persisted packet",
    managedArpu:
      persistedSource(rpc?.managedServiceARPU, "explainability.revenueModel.revenuePerCustomer.managedServiceARPU") ??
      "UNKNOWN — not present on persisted packet",
    addOnArpu:
      persistedSource(rpc?.addOnARPU, "explainability.revenueModel.revenuePerCustomer.addOnARPU") ??
      "UNKNOWN — not present on persisted packet",
    setup:
      persistedSource(rpc?.firstYearSetup, "explainability.revenueModel.revenuePerCustomer.firstYearSetup") ??
      "UNKNOWN — not present on persisted packet",
    cac:
      persistedSource(bench.modeled.cac.range, "explainability.benchmarkEconomics.modeled.cac.range") ??
      "UNKNOWN — not present on persisted packet",
    lifetime:
      persistedSource(bench.modeled.lifetimeMonths.range, "explainability.benchmarkEconomics.modeled.lifetimeMonths.range") ??
      "UNKNOWN — not present on persisted packet",
    margin: rangeHasValue(bench.modeled.grossMargin.range)
      ? "explainability.benchmarkEconomics.modeled.grossMargin.range"
      : scenarioMargin
        ? "scenarioMarginAssumptions(serviceHeavy) — no persisted gross-margin range"
        : "UNKNOWN — not present on persisted packet",
    variableCosts: scenarioBand
      ? "scenarioMarginAssumptions — payment/hosting/AI/API/support/labor; not persisted invoices"
      : rangeHasValue(bench.modeled.contributionMargin.range)
        ? "explainability.benchmarkEconomics.modeled.contributionMargin.range"
        : "UNKNOWN — not present on persisted packet",
    founderAssumptions: "none persisted on this packet",
  };
  const ltvCacModel = ltvCac
    ? {
        conservative: ltvCac.conservative,
        base: ltvCac.base,
        upside: ltvCac.upside,
        confidence: ltvCacConfidence,
        strength: estimateStrength(ltvCacConfidence),
        provenance: "SCENARIO_MODEL" as const,
        modeledNotObserved: true as const,
        grantsBuild: false as const,
        formula: "conservative = low LTV / high CAC; base = base / base; upside = high LTV / low CAC",
        why: "MODELED — NOT OBSERVED. Compares estimated customer value with estimated acquisition cost.",
        whatToTestNext: "Measure real CAC and confirm lifetime before treating this as a planning target.",
      }
    : null;
  const paybackModel =
    payback && rangeHasValue(payback.range)
      ? {
          conservative: payback.conservative,
          base: payback.base,
          upside: payback.upside,
          confidence: paybackConfidence,
          strength: estimateStrength(paybackConfidence),
          provenance: "SCENARIO_MODEL" as const,
          modeledNotObserved: true as const,
          grantsBuild: false as const,
          usesContributionMargin: true as const,
          formula: "payback months = CAC ÷ (monthly revenue × contribution margin)",
          why: "MODELED — NOT OBSERVED. Uses contribution margin, not gross revenue.",
          whatToTestNext: "Replace assumed margin with actual contribution after costs.",
        }
      : null;

  return {
    coreMonthly,
    managedMonthly,
    addOnMonthly,
    totalMonthly,
    setup,
    cac,
    retention,
    margin,
    ltv,
    ltvCac: ltvCacModel,
    payback: paybackModel,
    firstYearCustomerValue: firstYear,
    revenueScenarios,
    inputSources,
    availability: {
      corePrice: classifyAvailability(coreMonthly),
      setup: classifyAvailability(setup),
      cac: classifyAvailability(cac.selected),
      lifetime: classifyAvailability(retention),
      margin: classifyAvailability(margin.selected),
      ltv: classifyAvailability(ltv),
      ltvCac: ltvCacModel?.base != null ? "SCENARIO_AVAILABLE" : "INSUFFICIENT",
      payback: paybackModel?.base != null ? "SCENARIO_AVAILABLE" : "INSUFFICIENT",
      firstYear: classifyAvailability(firstYear),
    },
    observedUntouched: {
      cac: "UNKNOWN",
      ltv: "UNKNOWN",
      margin: "UNKNOWN",
      conversion: "UNKNOWN",
      retention: "UNKNOWN",
    },
    grantsBuild: false,
  };
}

const EMPTY_SOURCES: EducatedEconomicsModel["inputSources"] = {
  coreArpu: "UNKNOWN — not present on persisted packet",
  managedArpu: "UNKNOWN — not present on persisted packet",
  addOnArpu: "UNKNOWN — not present on persisted packet",
  setup: "UNKNOWN — not present on persisted packet",
  cac: "UNKNOWN — not present on persisted packet",
  lifetime: "UNKNOWN — not present on persisted packet",
  margin: "UNKNOWN — not present on persisted packet",
  variableCosts: "UNKNOWN — not present on persisted packet",
  founderAssumptions: "none persisted on this packet",
};

const EMPTY_AVAILABILITY: EducatedEconomicsModel["availability"] = {
  corePrice: "INSUFFICIENT",
  setup: "INSUFFICIENT",
  cac: "INSUFFICIENT",
  lifetime: "INSUFFICIENT",
  margin: "INSUFFICIENT",
  ltv: "INSUFFICIENT",
  ltvCac: "INSUFFICIENT",
  payback: "INSUFFICIENT",
  firstYear: "INSUFFICIENT",
};

export function emptyEducatedEconomicsModel(): EducatedEconomicsModel {
  return {
    coreMonthly: null,
    managedMonthly: null,
    addOnMonthly: null,
    totalMonthly: null,
    setup: null,
    cac: { directBenchmark: null, componentModel: null, scenarioModel: null, selected: null },
    retention: null,
    margin: {
      directBenchmark: null,
      componentModel: null,
      scenarioModel: null,
      selected: null,
      unknownCostsTreatedAsZero: false,
      costAssumptions: [],
    },
    ltv: null,
    ltvCac: null,
    payback: null,
    firstYearCustomerValue: null,
    revenueScenarios: [],
    inputSources: EMPTY_SOURCES,
    availability: EMPTY_AVAILABILITY,
    observedUntouched: {
      cac: "UNKNOWN",
      ltv: "UNKNOWN",
      margin: "UNKNOWN",
      conversion: "UNKNOWN",
      retention: "UNKNOWN",
    },
    grantsBuild: false,
  };
}
