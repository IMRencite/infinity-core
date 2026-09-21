import { unknownRange, type EconomicRange } from "../comparable-economics/provenance";
import type { QualifiedBenchmark } from "./types";
import { feedsBaseCase } from "./aggregate";

function isSoftwareMargin(claim: string): boolean {
  return /software|hosted website software|saas/i.test(claim) && !/service|seo|content|agency/i.test(claim);
}

function isServiceMargin(claim: string): boolean {
  return /service|seo|content|agency|done-for-you|managed/i.test(claim);
}

function merge(values: number[]): EconomicRange {
  if (!values.length) return unknownRange();
  return { low: Math.min(...values), base: values.reduce((sum, value) => sum + value, 0) / values.length, high: Math.max(...values) };
}

export function classifyMarginRole(claim: string): NonNullable<QualifiedBenchmark["marginRole"]> {
  if (
    !/gross margin/i.test(claim) &&
    /\b(hosting cost|ai\/api|api usage|llm usage|payment processing|support cost|service labor|account management|content generation cost|fulfillment cost)\b/i.test(
      claim,
    )
  ) {
    return "COMPONENT_COST";
  }
  if (/\b(gpu|inference|llm|compute costs?|ai-native content|wix|base44)\b/i.test(claim)) return "INFRASTRUCTURE_MARGIN";
  if (/\bproject(ed|ion)\b/i.test(claim)) return "PROJECTED_MARGIN";
  if (/\b10-k\b|company reported|gross profit/i.test(claim)) return "DIRECT_COMPANY_MARGIN";
  if (/\badjacent|similar (category|vertical)/i.test(claim)) return "ADJACENT_MARGIN";
  if (/\bunrelated|enterprise field.sales\b/i.test(claim)) return "IRRELEVANT_MARGIN";
  return "CATEGORY_MARGIN";
}

export const COMPONENT_COST_CATEGORIES = [
  "hosting",
  "aiApi",
  "support",
  "paymentProcessing",
  "content",
  "serviceLabor",
  "accountManagement",
  "otherVariable",
] as const;

export type ComponentCostCategory = (typeof COMPONENT_COST_CATEGORIES)[number];
export type ComponentCostCoverageState = "KNOWN" | "PARTIAL" | "UNKNOWN";

const REQUIRED_SOFTWARE_COSTS: ComponentCostCategory[] = ["hosting", "aiApi", "support", "paymentProcessing"];

function coverageState(known: boolean, partial = false): ComponentCostCoverageState {
  if (known) return "KNOWN";
  if (partial) return "PARTIAL";
  return "UNKNOWN";
}

export function modelComponentMargin(input: {
  qualified: QualifiedBenchmark[];
  monthlyRevenue: EconomicRange | null;
}): {
  used: boolean;
  fullyUsable: boolean;
  software: EconomicRange;
  service: EconomicRange;
  blended: EconomicRange;
  formula: string;
  missing: string[];
  coverage: Record<ComponentCostCategory, ComponentCostCoverageState>;
  unknownCostsTreatedAsZero: false;
} {
  const costDims = new Set([
    "hosting_cost",
    "support_cost",
    "fulfillment_cost",
    "onboarding_cost",
    "sales_labor_cost",
    "software_variable_cost",
    "payment_processing",
    "service_labor",
  ]);
  const costs = input.qualified.filter((item) => costDims.has(item.dimension) && feedsBaseCase(item));
  const has = (dimension: string) => costs.some((item) => item.dimension === dimension);
  const coverage: Record<ComponentCostCategory, ComponentCostCoverageState> = {
    hosting: coverageState(has("hosting_cost")),
    aiApi: coverageState(has("software_variable_cost")),
    support: coverageState(has("support_cost")),
    paymentProcessing: coverageState(has("payment_processing")),
    content: coverageState(has("onboarding_cost")),
    serviceLabor: coverageState(has("sales_labor_cost") || has("fulfillment_cost") || has("service_labor")),
    accountManagement: coverageState(
      input.qualified.some((item) => /account management/i.test(item.claim) && feedsBaseCase(item) && costDims.has(item.dimension)),
    ),
    otherVariable: coverageState(costs.some((item) => item.dimension === "implementation_cost")),
  };
  const revenue = input.monthlyRevenue?.base ?? input.monthlyRevenue?.low ?? null;
  const missing: string[] = [];
  if (revenue == null || !(revenue > 0)) missing.push("revenue/customer");
  if (coverage.hosting !== "KNOWN") missing.push("hosting");
  if (coverage.support !== "KNOWN") missing.push("support");
  if (coverage.aiApi !== "KNOWN") missing.push("AI/API");
  if (coverage.content !== "KNOWN") missing.push("content generation");
  if (coverage.serviceLabor !== "KNOWN") missing.push("service labor");
  if (coverage.paymentProcessing !== "KNOWN") missing.push("payment processing");
  if (coverage.accountManagement !== "KNOWN") missing.push("account management");
  const requiredKnown = REQUIRED_SOFTWARE_COSTS.every((category) => coverage[category] === "KNOWN");
  const empty = {
    used: false as const,
    fullyUsable: false as const,
    software: unknownRange(),
    service: unknownRange(),
    blended: unknownRange(),
    formula:
      "Component contribution margin requires monthly revenue plus known material variable costs. Missing costs are never treated as zero.",
    missing,
    coverage,
    unknownCostsTreatedAsZero: false as const,
  };
  if (revenue == null || !requiredKnown) {
    return empty;
  }
  const monthlyCost = (item: QualifiedBenchmark) => {
    const value = item.range.base ?? item.range.low ?? item.range.high;
    if (value == null) return null;
    return item.unit === "percent" ? revenue * value : value;
  };
  const sumKnown = (predicate: (item: QualifiedBenchmark) => boolean) => {
    let total = 0;
    for (const item of costs.filter(predicate)) {
      const value = monthlyCost(item);
      if (value != null) total += value;
    }
    return total;
  };
  const softwareCost = sumKnown(
    (item) => item.dimension === "hosting_cost" || item.dimension === "software_variable_cost" || item.dimension === "payment_processing",
  );
  const serviceCost = sumKnown(
    (item) =>
      item.dimension === "support_cost" ||
      item.dimension === "onboarding_cost" ||
      item.dimension === "sales_labor_cost" ||
      item.dimension === "fulfillment_cost" ||
      item.dimension === "service_labor",
  );
  const total = softwareCost + serviceCost;
  const clamp = (value: number) => Math.max(0, Math.min(0.99, value));
  const softwareBase = clamp(1 - softwareCost / revenue);
  const serviceBase = serviceCost > 0 ? clamp(1 - serviceCost / revenue) : softwareBase;
  const blendedBase = clamp(1 - total / revenue);
  const fullyUsable = requiredKnown;
  return {
    used: true,
    fullyUsable,
    software: { low: softwareBase, base: softwareBase, high: softwareBase },
    service: { low: serviceBase, base: serviceBase, high: serviceBase },
    blended: { low: blendedBase, base: blendedBase, high: blendedBase },
    formula: "contribution margin = (revenue − known variable costs) / revenue. Unknown cost categories are omitted, not zeroed.",
    missing,
    coverage,
    unknownCostsTreatedAsZero: false,
  };
}

export function modelGrossMargin(qualified: QualifiedBenchmark[]): {
  software: EconomicRange;
  service: EconomicRange;
  blended: EconomicRange;
  usedGenericSaas80: false;
  formula: string;
  unusedEvidence: Array<{ claim: string; values: string; why: string }>;
  component?: ReturnType<typeof modelComponentMargin>;
} {
  const accepted = qualified.filter(
    (item) =>
      item.dimension === "gross_margin" &&
      feedsBaseCase(item) &&
      item.usableForModel !== false &&
      (item.range.base == null || item.range.base > 0.05 || item.marginStage === "CATEGORY_MARGIN"),
  );
  const unused = qualified.filter((item) => item.dimension === "gross_margin" && item.usableForModel === false);
  const software = merge(
    accepted.filter((item) => isSoftwareMargin(item.claim)).flatMap((item) => [item.range.low, item.range.base, item.range.high]).filter((value): value is number => value != null),
  );
  const service = merge(
    accepted.filter((item) => isServiceMargin(item.claim)).flatMap((item) => [item.range.low, item.range.base, item.range.high]).filter((value): value is number => value != null),
  );
  const all = merge(accepted.flatMap((item) => [item.range.low, item.range.base, item.range.high]).filter((value): value is number => value != null));
  const unusedEvidence = unused.map((item) => ({
    claim: item.claim,
    values: `${item.marginStage ?? "UNKNOWN"} ${(item.range.base ?? item.range.low ?? 0) * 100}%`,
    why: item.unusedWhy ?? "Not usable as modeled comparable margin.",
  }));
  if (software.base != null && service.base != null) {
    return {
      software,
      service,
      blended: {
        low: Math.min(software.low ?? software.base, service.low ?? service.base),
        base: (software.base + service.base) / 2,
        high: Math.max(software.high ?? software.base, service.high ?? service.base),
      },
      usedGenericSaas80: false,
      formula: "Hybrid blended margin uses software and service component evidence; weights are not invented.",
      unusedEvidence,
    };
  }
  return {
    software,
    service,
    blended: all,
    usedGenericSaas80: false,
    formula: all.base != null ? "Gross margin from accepted category/comparable observations." : "UNKNOWN — generic 80% SaaS margin is not assumed.",
    unusedEvidence,
  };
}
