import type { PortfolioSummary, PortfolioVentureRow } from "./portfolio-types";
import {
  aggregatePortfolioFinancials,
  rankVenturesForTopEarners,
  selectTopVenture,
} from "./portfolio-ranking";

export function buildPortfolioSummary(ventures: PortfolioVentureRow[]): PortfolioSummary {
  const portfolioVentures = ventures.filter((v) => !v.excludedFromPortfolio);
  const builtIds = new Set(portfolioVentures.filter((v) => v.isBuilt).map((v) => v.ventureAssemblyId));
  const active = portfolioVentures.filter((v) => v.isActive);

  const financials = aggregatePortfolioFinancials(ventures);
  const { topEarners, rankingMetric, qualifyingCount } = rankVenturesForTopEarners(ventures, 10);
  const topVenture = selectTopVenture(topEarners, rankingMetric);

  return {
    generatedAt: new Date().toISOString(),
    totalVenturesBuilt: builtIds.size,
    activeVentures: active.length,
    ...financials,
    topVenture,
    topEarners,
    rankingMetric,
    qualifyingVentureCount: qualifyingCount,
    ventures,
    includedVentureIds: portfolioVentures.map((v) => v.ventureAssemblyId),
    excludedVentureIds: ventures.filter((v) => v.excludedFromPortfolio).map((v) => v.ventureAssemblyId),
  };
}
