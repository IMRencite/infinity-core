import { rangeHasValue } from "../comparable-economics/provenance";
import { formatApproximateUsd } from "../money-presentation";
import type {
  EducatedEconomicsModel,
  EducatedMetricEstimate,
  FounderEconomicEstimateRow,
  FounderEconomicEstimateView,
  FounderEstimateHeroMetric,
  FounderEstimateStrength,
} from "./types";

export const FOUNDER_TERM_HELP = {
  actual: "Measured from this venture's real results.",
  estimated: "Infinity's best current estimate from market evidence.",
  modeled: "Bounded scenario with disclosed assumptions. Not observed.",
  confidence: "How much evidence supports this estimate.",
  contributionMargin: "Revenue left after variable costs. Not observed profit.",
  cac: "Estimated cost to acquire one paying customer.",
  ltv: "Estimated gross value of one customer over their lifetime.",
  ltvCac: "How much customer value may be created for each $1 spent acquiring them.",
  payback: "How long it may take to earn back customer acquisition cost.",
  sourceIndependence: "Whether the sources behind this estimate look independent of each other.",
} as const;

function assumptionLabel(value: string): string {
  if (value === "BENCHMARK" || value === "CATEGORY_BENCHMARK") return "Category benchmark";
  if (value === "ADJACENT_BENCHMARK") return "Nearby-category benchmark";
  if (value === "MODELED_ASSUMPTION" || value === "SCENARIO_ASSUMPTION") return "Modeled assumption";
  if (value === "FOUNDER_HYPOTHESIS") return "Founder assumption";
  return value.replace(/_/g, " ").toLowerCase();
}

function provenanceLabel(value: string): string {
  if (value === "OBSERVED") return "Measured from this venture";
  if (value === "DIRECT_COMPARABLE") return "Estimated from a similar company";
  if (value === "CATEGORY_BENCHMARK") return "Estimated from category benchmarks";
  if (value === "ADJACENT_BENCHMARK") return "Estimated from a nearby category";
  if (value === "COMPONENT_MODEL") return "Estimated from similar businesses";
  if (value === "SCENARIO_MODEL") return "Educated estimate — not observed";
  if (value === "FOUNDER_HYPOTHESIS") return "Founder assumption";
  return "Not enough evidence yet";
}

function whyBlock(estimate: EducatedMetricEstimate | null, fallbackMetric: string): string {
  if (!estimate) {
    return [
      `How Infinity estimated it: not enough evidence for ${fallbackMetric}.`,
      "Main assumptions: none.",
      "Evidence strength: Insufficient.",
      "What could change it: a relevant benchmark or grounded cost input.",
      "What to validate next: collect a comparable price, CAC, retention, or cost observation.",
    ].join(" ");
  }
  const assumptions = estimate.assumptions.length
    ? estimate.assumptions.map((item) => `${item.name} ${item.value}`).join("; ")
    : "None beyond the persisted comparable range.";
  return [
    `How Infinity estimated it: ${estimate.formula}`,
    `Main assumptions: ${assumptions}`,
    `Evidence strength: ${estimate.strength}.`,
    `What could change it: ${estimate.basis}`,
    `What to validate next: ${estimate.whatToTestNext}`,
  ].join(" ");
}

function row(metric: string, estimate: EducatedMetricEstimate | null): FounderEconomicEstimateRow {
  if (!estimate) {
    return {
      metric,
      actual: "Not measured yet",
      bestEstimate: "Not enough evidence yet",
      range: "Not enough evidence yet",
      base: "Not enough evidence yet",
      confidence: "Insufficient",
      provenance: "Not enough evidence yet",
      formula: "No defensible formula with provenanced inputs.",
      assumptions: [],
      basis: "Infinity can estimate this only when a formula and provenanced inputs exist.",
      nextValidation: "Collect a relevant benchmark or a grounded component input.",
      whatIsIt: metric,
      why: "There is not enough adjacent evidence to form a bounded estimate.",
      whatToTestNext: "Collect a relevant benchmark or a grounded component input.",
    };
  }
  return {
    metric,
    actual: estimate.actualDisplay,
    bestEstimate: estimate.displayRange,
    range: estimate.displayRange,
    base: estimate.displayBase,
    confidence: estimate.strength,
    provenance: provenanceLabel(estimate.provenance),
    formula: estimate.formula,
    assumptions: estimate.assumptions.map((item) => `${item.name}: ${item.value} (${assumptionLabel(item.label)}) — ${item.why}`),
    basis: estimate.basis,
    nextValidation: estimate.nextValidation,
    whatIsIt: estimate.whatIsIt,
    why: estimate.why,
    whatToTestNext: estimate.whatToTestNext,
  };
}

function pathLabel(estimate: EducatedMetricEstimate | null): string {
  if (!estimate) return "Not enough evidence yet";
  return `${estimate.displayRange} · ${estimate.strength} · ${provenanceLabel(estimate.provenance)}`;
}

function heroFrom(
  id: string,
  label: string,
  estimate: EducatedMetricEstimate | null,
  help: string,
  secondary = false,
): FounderEstimateHeroMetric {
  return {
    id,
    label,
    primary: estimate?.displayBase ?? "—",
    range: estimate?.displayRange ?? "Not enough evidence yet",
    confidence: estimate?.strength ?? "Insufficient",
    kind: "estimated",
    help,
    why: whyBlock(estimate, label),
    secondary,
  };
}

function weakestStrength(values: Array<FounderEstimateStrength | undefined>): FounderEstimateStrength {
  if (values.includes("Insufficient") || values.every((item) => !item)) return "Insufficient";
  if (values.includes("Weak")) return "Weak";
  if (values.includes("Moderate")) return "Moderate";
  return "Strong";
}

function conclusion(model: EducatedEconomicsModel): string {
  const core = model.coreMonthly?.displayBase;
  const cac = model.cac.selected?.displayBase;
  const ltv = model.ltv?.displayBase;
  const strength = weakestStrength([
    model.coreMonthly?.strength,
    model.cac.selected?.strength,
    model.ltv?.strength ?? model.retention?.strength,
  ]);
  if (!core && !cac) {
    return "Infinity does not yet have enough market evidence to publish a bounded best estimate.";
  }
  const evidence =
    strength === "Strong"
      ? "Evidence is relatively strong."
      : strength === "Moderate"
        ? "Evidence is moderate."
        : "Evidence is still weak.";
  const parts: string[] = [];
  const bare = (value: string) => value.replace(/^~/, "");
  if (core) parts.push(`this could support roughly ${bare(core)} per core customer`);
  if (cac) parts.push(`with acquisition around ${bare(cac)}`);
  if (ltv) parts.push(`and customer value around ${bare(ltv)}`);
  return `Based on similar businesses and the evidence available today, Infinity estimates ${parts.join(", ")}. ${evidence}`;
}

export function presentEducatedEstimates(model: EducatedEconomicsModel): FounderEconomicEstimateView {
  const ltvCac = model.ltvCac;
  const payback = model.payback;
  const ltvCacAsMetric =
    ltvCac && ltvCac.base != null
      ? {
          actual: "UNKNOWN" as const,
          actualDisplay: "Not measured yet",
          bestEstimate: { low: ltvCac.conservative, base: ltvCac.base, high: ltvCac.upside },
          displayRange: `${ltvCac.conservative ?? "—"}–${ltvCac.upside ?? "—"}×`,
          displayBase: `${ltvCac.base}×`,
          confidence: ltvCac.confidence,
          strength: ltvCac.strength,
          provenance: ltvCac.provenance,
          formula: ltvCac.formula,
          assumptions: [],
          basis: "MODELED — NOT OBSERVED",
          whatIsIt: "LTV/CAC",
          whatInfinityEstimates: `${ltvCac.base}×`,
          why: ltvCac.why,
          whatToTestNext: ltvCac.whatToTestNext,
          nextValidation: ltvCac.whatToTestNext,
          modeledNotObserved: true as const,
          grantsBuild: false as const,
        }
      : null;
  const paybackAsMetric =
    payback && payback.base != null
      ? {
          actual: "UNKNOWN" as const,
          actualDisplay: "Not measured yet",
          bestEstimate: { low: payback.upside, base: payback.base, high: payback.conservative },
          displayRange: `${payback.upside ?? "—"}–${payback.conservative ?? "—"} months`,
          displayBase: `${payback.base} months`,
          confidence: payback.confidence,
          strength: payback.strength,
          provenance: payback.provenance,
          formula: payback.formula,
          assumptions: [],
          basis: "MODELED — NOT OBSERVED. Uses contribution margin, not revenue.",
          whatIsIt: "CAC payback period",
          whatInfinityEstimates: `${payback.base} months`,
          why: payback.why,
          whatToTestNext: payback.whatToTestNext,
          nextValidation: payback.whatToTestNext,
          modeledNotObserved: true as const,
          grantsBuild: false as const,
        }
      : null;
  const hero = [
    heroFrom("core", "Monthly revenue per customer", model.coreMonthly, FOUNDER_TERM_HELP.estimated),
    heroFrom("cac", "CAC", model.cac.selected, FOUNDER_TERM_HELP.cac),
    heroFrom("lifetime", "Customer lifetime", model.retention, FOUNDER_TERM_HELP.estimated),
    heroFrom("margin", "Contribution margin", model.margin.selected, FOUNDER_TERM_HELP.contributionMargin),
    heroFrom("ltv", "LTV", model.ltv, FOUNDER_TERM_HELP.ltv),
    heroFrom("ltv-cac", "LTV/CAC", ltvCacAsMetric, FOUNDER_TERM_HELP.ltvCac),
    heroFrom("payback", "Payback", paybackAsMetric, FOUNDER_TERM_HELP.payback),
  ];
  const secondary = [
    heroFrom("setup", "Setup", model.setup, FOUNDER_TERM_HELP.estimated, true),
    heroFrom("managed", "Optional managed service", model.managedMonthly, FOUNDER_TERM_HELP.estimated, true),
    heroFrom("addon", "Optional add-on / tooling", model.addOnMonthly, FOUNDER_TERM_HELP.estimated, true),
  ];
  const firstYear = {
    coreOnly: model.revenueScenarios.find((item) => item.id === "CORE_ONLY")?.firstYear ?? "Not enough evidence yet",
    corePlusAddOn: model.revenueScenarios.find((item) => item.id === "CORE_PLUS_ADDON")?.firstYear ?? "Not enough evidence yet",
    corePlusManaged: model.revenueScenarios.find((item) => item.id === "CORE_PLUS_MANAGED")?.firstYear ?? "Not enough evidence yet",
    fullService: model.revenueScenarios.find((item) => item.id === "FULL_SERVICE")?.firstYear ?? "Not enough evidence yet",
  };
  return {
    heading: "Infinity's Best Estimate",
    conclusion: conclusion(model),
    note: "These are Infinity's best bounded estimates from available evidence. They are not actual results from this venture, and they cannot approve BUILD.",
    hero,
    secondary,
    rows: [
      row("Core monthly revenue/customer", model.coreMonthly),
      row("Total monthly revenue/customer", model.totalMonthly),
      row("Setup revenue/customer", model.setup),
      row("CAC", model.cac.selected),
      row("Retention/lifetime", model.retention),
      row("Gross / contribution margin", model.margin.selected),
      row("LTV", model.ltv),
      row("LTV/CAC", ltvCacAsMetric),
      row("Payback", paybackAsMetric),
      row("First-year customer value", model.firstYearCustomerValue),
    ],
    revenueScenarios: model.revenueScenarios,
    cacPaths: {
      direct: pathLabel(model.cac.directBenchmark),
      component: pathLabel(model.cac.componentModel),
      scenario: pathLabel(model.cac.scenarioModel),
    },
    marginPaths: {
      direct: pathLabel(model.margin.directBenchmark),
      component: pathLabel(model.margin.componentModel),
      scenario: pathLabel(model.margin.scenarioModel),
    },
    marginAssumptions: model.margin.costAssumptions.map((item) => `${item.name}: ${item.value} (${assumptionLabel(item.label)})`),
    ltvCac: {
      conservative: ltvCac?.conservative != null ? `${ltvCac.conservative}×` : "Not enough evidence yet",
      base: ltvCac?.base != null ? `${ltvCac.base}×` : "Not enough evidence yet",
      upside: ltvCac?.upside != null ? `${ltvCac.upside}×` : "Not enough evidence yet",
      note: "MODELED — NOT OBSERVED",
    },
    payback: {
      conservative: payback?.conservative != null ? `${payback.conservative} months` : "Not enough evidence yet",
      base: payback?.base != null ? `${payback.base} months` : "Not enough evidence yet",
      upside: payback?.upside != null ? `${payback.upside} months` : "Not enough evidence yet",
      note: "MODELED — NOT OBSERVED. Payback uses contribution margin, not revenue.",
    },
    firstYear,
    inputSources: model.inputSources,
    availability: model.availability,
    methodology: [
      "Actual: measured from this venture's real results.",
      "Market estimate: Infinity's best current estimate from comparable or category evidence.",
      "Scenario estimate: a bounded range that uses disclosed assumptions when a direct benchmark is missing.",
      "Founder assumption: a number the founder supplied, labeled as such.",
      "Confidence: how much evidence supports the estimate. Weak estimates can still be shown.",
      "Source independence: whether the sources look independent of each other.",
    ],
    grantsBuild: false,
  };
}

export function estimateUsdKnown(range: { base: number | null } | null | undefined): boolean {
  return rangeHasValue({ low: range?.base ?? null, base: range?.base ?? null, high: range?.base ?? null });
}

export { formatApproximateUsd };
