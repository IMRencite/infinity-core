export type FinancialDataQuality = "COMPLETE" | "PARTIAL" | "INSUFFICIENT_DATA" | "UNKNOWN";

export type PortfolioRankingMetric = "profit" | "revenue" | null;

export type PortfolioFinancialTrace = {
  revenueAggregateIds: string[];
  costRecordIds: string[];
  revenueRunIds: string[];
};

export type PortfolioVentureRow = {
  ventureAssemblyId: string;
  ventureName: string;
  missionId: string;
  status: string;
  ventureBlueprintId: string | null;
  revenueUsd: number | null;
  knownCostsUsd: number | null;
  profitUsd: number | null;
  profitDataQuality: FinancialDataQuality;
  revenueDataQuality: FinancialDataQuality;
  costDataQuality: FinancialDataQuality;
  rankingMetric: PortfolioRankingMetric;
  rankingValue: number | null;
  isBuilt: boolean;
  isActive: boolean;
  excludedFromPortfolio: boolean;
  exclusionReason: string | null;
  traceability: PortfolioFinancialTrace;
};

export type PortfolioTopVenture = {
  ventureAssemblyId: string;
  ventureName: string;
  metric: PortfolioRankingMetric;
  value: number | null;
  displayLabel: string;
};

export type PortfolioSummary = {
  generatedAt: string;
  totalVenturesBuilt: number;
  activeVentures: number;
  totalRevenueUsd: number | null;
  knownCostsUsd: number | null;
  totalProfitUsd: number | null;
  profitDataQuality: FinancialDataQuality;
  profitDisplayMode: "profit" | "known_net_contribution" | "unavailable";
  revenueDataQuality: FinancialDataQuality;
  costDataQuality: FinancialDataQuality;
  topVenture: PortfolioTopVenture | null;
  topEarners: PortfolioVentureRow[];
  rankingMetric: PortfolioRankingMetric;
  qualifyingVentureCount: number;
  ventures: PortfolioVentureRow[];
  includedVentureIds: string[];
  excludedVentureIds: string[];
};
