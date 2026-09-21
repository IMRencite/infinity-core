import type { BenchmarkCoverageStatus, BenchmarkEconomicsResearch, QualifiedBenchmark } from "./types";
import { rangeHasValue } from "../comparable-economics/provenance";
import { coverageFromAcceptedQuality } from "./confidence";
import { feedsBaseCase } from "./aggregate";

export function coverageStatus(input: { accepted: number; conflict?: boolean }): BenchmarkCoverageStatus {
  if (input.accepted >= 2 && !input.conflict) return "BENCHMARK_SUFFICIENT";
  if (input.accepted >= 1) return "BENCHMARK_PARTIAL";
  return "BENCHMARK_INSUFFICIENT";
}

function acceptedFor(
  qualified: QualifiedBenchmark[],
  dimension: string | ((item: QualifiedBenchmark) => boolean),
): QualifiedBenchmark[] {
  if (typeof dimension === "function") return qualified.filter((item) => feedsBaseCase(item) && dimension(item));
  return qualified.filter((item) => item.dimension === dimension && feedsBaseCase(item));
}

export function overallBenchmarkEconomicsStatus(input: {
  modeled: Pick<BenchmarkEconomicsResearch["modeled"], "arpu" | "cac" | "ltv" | "ltvCac" | "payback" | "grossMargin" | "lifetimeMonths">;
  coverage: Pick<BenchmarkEconomicsResearch["coverage"], "cac" | "retention" | "grossMargin" | "pricing">;
}): BenchmarkCoverageStatus {
  const ltvCloseable = rangeHasValue(input.modeled.ltv.range);
  const paybackCloseable = rangeHasValue(input.modeled.payback.range);
  const ratioCloseable = rangeHasValue(input.modeled.ltvCac.range);
  const criticalUsable =
    rangeHasValue(input.modeled.arpu.range) &&
    input.coverage.cac === "BENCHMARK_SUFFICIENT" &&
    input.coverage.retention === "BENCHMARK_SUFFICIENT" &&
    input.coverage.grossMargin === "BENCHMARK_SUFFICIENT" &&
    rangeHasValue(input.modeled.lifetimeMonths.range);
  if (criticalUsable && ltvCloseable && paybackCloseable && ratioCloseable) return "BENCHMARK_SUFFICIENT";
  if (
    rangeHasValue(input.modeled.arpu.range) ||
    input.coverage.cac !== "BENCHMARK_INSUFFICIENT" ||
    input.coverage.retention !== "BENCHMARK_INSUFFICIENT" ||
    input.coverage.grossMargin !== "BENCHMARK_INSUFFICIENT"
  ) {
    return "BENCHMARK_PARTIAL";
  }
  return "BENCHMARK_INSUFFICIENT";
}

export function coverageFromModel(
  model: Pick<BenchmarkEconomicsResearch, "aggregations" | "modeled" | "componentCac">,
  qualified: QualifiedBenchmark[] = [],
): BenchmarkEconomicsResearch["coverage"] {
  const cacAccepted = acceptedFor(qualified, "customer_acquisition_cost");
  const marginAccepted = acceptedFor(qualified, "gross_margin");
  const retentionAccepted = acceptedFor(
    qualified,
    (item) =>
      (item.dimension === "monthly_churn" && item.churnKind === "monthly_logo") ||
      (item.dimension === "retention_rate" && (item.churnKind === "annual_logo" || item.churnKind === "customer_retention")) ||
      (item.dimension === "annual_churn" && item.churnKind === "annual_logo") ||
      item.dimension === "customer_lifetime",
  );
  const conversionAccepted = acceptedFor(
    qualified,
    (item) =>
      item.dimension === "visitor_to_lead_conversion" ||
      item.dimension === "lead_to_customer_conversion" ||
      item.dimension === "sales_close_rate",
  );
  const salesCycleAccepted = acceptedFor(qualified, "sales_cycle_days");
  let cac = coverageFromAcceptedQuality(cacAccepted);
  if (cac !== "BENCHMARK_SUFFICIENT" && model.componentCac.used && rangeHasValue(model.componentCac.range) && conversionAccepted.length >= 2) {
    cac = "BENCHMARK_SUFFICIENT";
  }
  const coverage: BenchmarkEconomicsResearch["coverage"] = {
    pricing: rangeHasValue(model.modeled.arpu.range) ? "BENCHMARK_PARTIAL" : "BENCHMARK_INSUFFICIENT",
    cac,
    retention: coverageFromAcceptedQuality(retentionAccepted),
    grossMargin: coverageFromAcceptedQuality(marginAccepted),
    ltv: rangeHasValue(model.modeled.ltv.range) ? "BENCHMARK_PARTIAL" : "BENCHMARK_INSUFFICIENT",
    payback: rangeHasValue(model.modeled.payback.range) ? "BENCHMARK_PARTIAL" : "BENCHMARK_INSUFFICIENT",
    conversion: coverageFromAcceptedQuality(conversionAccepted),
    salesCycle: coverageFromAcceptedQuality(salesCycleAccepted),
    overall: "BENCHMARK_INSUFFICIENT",
  };
  coverage.overall = overallBenchmarkEconomicsStatus({ modeled: model.modeled, coverage });
  return coverage;
}
