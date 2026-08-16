import type { FinancialDataQuality, PortfolioFinancialTrace } from "./portfolio-types";

const REVENUE_METRICS = new Set(["gross_revenue", "revenue", "realized_revenue", "net_revenue"]);
const COST_METRIC_KEYS = new Set(["provider_cost", "build_cost", "acquisition_spend", "total_cost"]);

export type MetricAggregateRow = {
  id: string;
  venture_id: string | null;
  metric: string;
  value: number;
  performance_intelligence_run_id: string;
};

export type PerformanceRunRow = {
  id: string;
  simulation_only: boolean;
  capability_test: boolean;
};

export function parseUsdFromRow(row: Record<string, unknown>): { amount: number | null; known: boolean } {
  for (const key of [
    "cumulative_cost_usd",
    "cost_usd",
    "total_cost_usd",
    "amount_usd",
    "estimated_cost_usd",
    "actual_cost_usd",
    "estimated_cost",
  ]) {
    const val = row[key];
    if (typeof val === "number" && Number.isFinite(val)) return { amount: val, known: true };
    if (typeof val === "string" && val.trim() && !Number.isNaN(Number(val))) {
      return { amount: Number(val), known: true };
    }
  }
  return { amount: null, known: false };
}

function qualityFromKnown(hasKnown: boolean, hasUnknown: boolean): FinancialDataQuality {
  if (hasKnown && !hasUnknown) return "COMPLETE";
  if (hasKnown && hasUnknown) return "PARTIAL";
  if (!hasKnown) return "INSUFFICIENT_DATA";
  return "UNKNOWN";
}

export function extractVentureRevenue(input: {
  correlationIds: string[];
  aggregates: MetricAggregateRow[];
  simulationRunIds: Set<string>;
}): { revenueUsd: number | null; quality: FinancialDataQuality; trace: PortfolioFinancialTrace } {
  const trace: PortfolioFinancialTrace = {
    revenueAggregateIds: [],
    costRecordIds: [],
    revenueRunIds: [],
  };

  const matching = input.aggregates.filter(
    (a) =>
      REVENUE_METRICS.has(a.metric.toLowerCase()) &&
      a.venture_id &&
      input.correlationIds.includes(a.venture_id) &&
      !input.simulationRunIds.has(a.performance_intelligence_run_id),
  );

  if (matching.length === 0) {
    return { revenueUsd: null, quality: "INSUFFICIENT_DATA", trace };
  }

  const total = matching.reduce((sum, row) => sum + row.value, 0);
  trace.revenueAggregateIds = matching.map((m) => m.id);
  trace.revenueRunIds = [...new Set(matching.map((m) => m.performance_intelligence_run_id))];
  return { revenueUsd: total, quality: "COMPLETE", trace };
}

export function sumCostRows(
  rows: Array<{ id: string; row: Record<string, unknown> }>,
): { total: number | null; quality: FinancialDataQuality; ids: string[] } {
  let total = 0;
  let knownCount = 0;
  let unknownCount = 0;
  const ids: string[] = [];

  for (const { id, row } of rows) {
    const parsed = parseUsdFromRow(row);
    if (parsed.known && parsed.amount != null) {
      total += parsed.amount;
      knownCount += 1;
      ids.push(id);
    } else {
      unknownCount += 1;
    }
  }

  if (knownCount === 0) {
    return { total: null, quality: "INSUFFICIENT_DATA", ids: [] };
  }

  return {
    total,
    quality: qualityFromKnown(knownCount > 0, unknownCount > 0),
    ids,
  };
}

export function extractCostMetricAggregates(input: {
  correlationIds: string[];
  aggregates: MetricAggregateRow[];
  simulationRunIds: Set<string>;
}): { costUsd: number | null; quality: FinancialDataQuality; ids: string[] } {
  const matching = input.aggregates.filter(
    (a) =>
      COST_METRIC_KEYS.has(a.metric.toLowerCase()) &&
      a.venture_id &&
      input.correlationIds.includes(a.venture_id) &&
      !input.simulationRunIds.has(a.performance_intelligence_run_id),
  );

  if (matching.length === 0) {
    return { costUsd: null, quality: "INSUFFICIENT_DATA", ids: [] };
  }

  const total = matching.reduce((sum, row) => sum + row.value, 0);
  return { costUsd: total, quality: "COMPLETE", ids: matching.map((m) => m.id) };
}

export function deriveVentureProfit(input: {
  revenueUsd: number | null;
  revenueQuality: FinancialDataQuality;
  knownCostsUsd: number | null;
  costQuality: FinancialDataQuality;
}): { profitUsd: number | null; quality: FinancialDataQuality } {
  if (input.revenueUsd == null || input.knownCostsUsd == null) {
    return { profitUsd: null, quality: "INSUFFICIENT_DATA" };
  }

  const profitUsd = input.revenueUsd - input.knownCostsUsd;
  if (input.revenueQuality === "COMPLETE" && input.costQuality === "COMPLETE") {
    return { profitUsd, quality: "COMPLETE" };
  }
  return { profitUsd, quality: "PARTIAL" };
}

export function mergeFinancialQuality(
  ...qualities: FinancialDataQuality[]
): FinancialDataQuality {
  if (qualities.every((q) => q === "INSUFFICIENT_DATA" || q === "UNKNOWN")) return "INSUFFICIENT_DATA";
  if (qualities.some((q) => q === "PARTIAL")) return "PARTIAL";
  if (qualities.every((q) => q === "COMPLETE")) return "COMPLETE";
  return "UNKNOWN";
}
