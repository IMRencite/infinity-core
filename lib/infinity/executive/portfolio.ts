import type { ExecutiveDecision, PortfolioEntry, PortfolioSnapshot } from "./types";

export function buildPortfolioSnapshot(entries: PortfolioEntry[]): PortfolioSnapshot {
  const industryCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  for (const entry of entries) {
    const industry = (entry.industry ?? "unknown").toLowerCase();
    const category = (entry.category ?? "unknown").toLowerCase();
    industryCounts[industry] = (industryCounts[industry] ?? 0) + 1;
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
  }

  return { entries, industryCounts, categoryCounts };
}

export function assessPortfolioDiversity(
  snapshot: PortfolioSnapshot,
  industry: string | null,
  category: string | null,
  maxConcentration: number,
): { diverseEnough: boolean; concentration: number; notes: string[] } {
  const notes: string[] = [];
  const industryKey = (industry ?? "unknown").toLowerCase();
  const categoryKey = (category ?? "unknown").toLowerCase();
  const total = Math.max(1, snapshot.entries.length + 1);
  const industryShare = (snapshot.industryCounts[industryKey] ?? 0) / total;
  const categoryShare = (snapshot.categoryCounts[categoryKey] ?? 0) / total;
  const concentration = Math.max(industryShare, categoryShare);

  if (concentration > maxConcentration) {
    notes.push(
      `Portfolio concentration ${(concentration * 100).toFixed(0)}% exceeds limit ${(maxConcentration * 100).toFixed(0)}%.`,
    );
  } else {
    notes.push("Portfolio diversity within configured concentration limits.");
  }

  return {
    diverseEnough: concentration <= maxConcentration,
    concentration,
    notes,
  };
}

export function appendPortfolioEntry(
  snapshot: PortfolioSnapshot,
  entry: PortfolioEntry,
): PortfolioSnapshot {
  return buildPortfolioSnapshot([...snapshot.entries, entry]);
}

export function countDecisions(
  snapshot: PortfolioSnapshot,
  decision: ExecutiveDecision,
): number {
  return snapshot.entries.filter((e) => e.decision === decision).length;
}
