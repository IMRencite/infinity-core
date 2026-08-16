import type {
  FinancialDataQuality,
  PortfolioRankingMetric,
  PortfolioSummary,
  PortfolioTopVenture,
  PortfolioVentureRow,
} from "./portfolio-types";

export function rankVenturesForTopEarners(
  ventures: PortfolioVentureRow[],
  limit = 10,
): { topEarners: PortfolioVentureRow[]; rankingMetric: PortfolioRankingMetric; qualifyingCount: number } {
  const included = ventures.filter((v) => !v.excludedFromPortfolio);

  const withProfit = included.filter(
    (v) => v.profitUsd != null && v.profitDataQuality !== "INSUFFICIENT_DATA",
  );
  if (withProfit.length > 0) {
    const sorted = [...withProfit].sort((a, b) => {
      const diff = (b.profitUsd ?? 0) - (a.profitUsd ?? 0);
      if (diff !== 0) return diff;
      return a.ventureName.localeCompare(b.ventureName);
    });
    return {
      topEarners: sorted.slice(0, limit).map((v) => ({
        ...v,
        rankingMetric: "profit" as const,
        rankingValue: v.profitUsd,
      })),
      rankingMetric: "profit",
      qualifyingCount: withProfit.length,
    };
  }

  const withRevenue = included.filter(
    (v) => v.revenueUsd != null && v.revenueDataQuality !== "INSUFFICIENT_DATA",
  );
  if (withRevenue.length > 0) {
    const sorted = [...withRevenue].sort((a, b) => {
      const diff = (b.revenueUsd ?? 0) - (a.revenueUsd ?? 0);
      if (diff !== 0) return diff;
      return a.ventureName.localeCompare(b.ventureName);
    });
    return {
      topEarners: sorted.slice(0, limit).map((v) => ({
        ...v,
        rankingMetric: "revenue" as const,
        rankingValue: v.revenueUsd,
      })),
      rankingMetric: "revenue",
      qualifyingCount: withRevenue.length,
    };
  }

  return { topEarners: [], rankingMetric: null, qualifyingCount: 0 };
}

export function selectTopVenture(
  topEarners: PortfolioVentureRow[],
  rankingMetric: PortfolioRankingMetric,
): PortfolioTopVenture | null {
  const leader = topEarners[0];
  if (!leader || rankingMetric == null || leader.rankingValue == null) return null;

  return {
    ventureAssemblyId: leader.ventureAssemblyId,
    ventureName: leader.ventureName,
    metric: rankingMetric,
    value: leader.rankingValue,
    displayLabel: rankingMetric === "profit" ? "profit" : "revenue",
  };
}

export function aggregatePortfolioFinancials(ventures: PortfolioVentureRow[]): {
  totalRevenueUsd: number | null;
  knownCostsUsd: number | null;
  totalProfitUsd: number | null;
  profitDataQuality: FinancialDataQuality;
  profitDisplayMode: PortfolioSummary["profitDisplayMode"];
  revenueDataQuality: FinancialDataQuality;
  costDataQuality: FinancialDataQuality;
} {
  const portfolioVentures = ventures.filter((v) => !v.excludedFromPortfolio);

  const revenueValues = portfolioVentures
    .map((v) => v.revenueUsd)
    .filter((v): v is number => v != null);
  const costValues = portfolioVentures
    .map((v) => v.knownCostsUsd)
    .filter((v): v is number => v != null);
  const profitValues = portfolioVentures
    .map((v) => v.profitUsd)
    .filter((v): v is number => v != null);

  const totalRevenueUsd = revenueValues.length ? revenueValues.reduce((a, b) => a + b, 0) : null;
  const knownCostsUsd = costValues.length ? costValues.reduce((a, b) => a + b, 0) : null;
  const totalProfitUsd = profitValues.length ? profitValues.reduce((a, b) => a + b, 0) : null;

  const revenueDataQuality: FinancialDataQuality =
    revenueValues.length === 0
      ? "INSUFFICIENT_DATA"
      : revenueValues.length === portfolioVentures.length
        ? "COMPLETE"
        : "PARTIAL";

  const costDataQuality: FinancialDataQuality =
    costValues.length === 0
      ? "INSUFFICIENT_DATA"
      : costValues.length === portfolioVentures.length
        ? "COMPLETE"
        : "PARTIAL";

  let profitDataQuality: FinancialDataQuality = "INSUFFICIENT_DATA";
  let profitDisplayMode: PortfolioSummary["profitDisplayMode"] = "unavailable";

  if (totalProfitUsd != null && totalRevenueUsd != null && knownCostsUsd != null) {
    profitDataQuality =
      revenueDataQuality === "COMPLETE" && costDataQuality === "COMPLETE" ? "COMPLETE" : "PARTIAL";
    profitDisplayMode = profitDataQuality === "COMPLETE" ? "profit" : "known_net_contribution";
  } else if (totalProfitUsd != null) {
    profitDataQuality = "PARTIAL";
    profitDisplayMode = "known_net_contribution";
  }

  return {
    totalRevenueUsd,
    knownCostsUsd,
    totalProfitUsd,
    profitDataQuality,
    profitDisplayMode,
    revenueDataQuality,
    costDataQuality,
  };
}
