import { emptyMercurySnapshot, emptyStripeSnapshot } from "./cash-position";
import { projectActualEconomics, projectModeledEconomics } from "./economics";
import type { FinancialTruthSnapshot } from "./types";

export function emptyFinancialTruthSnapshot(now = new Date().toISOString()): FinancialTruthSnapshot {
  const actual = projectActualEconomics(now);
  return {
    mercury: emptyMercurySnapshot("CREDENTIALS_REQUIRED"),
    stripe: emptyStripeSnapshot("FAIL"),
    actual,
    modeled: projectModeledEconomics(),
    committed_capital: 0,
    spent_capital: 0,
    current_month_known_burn: actual.known_costs,
    unknown_cost_state: actual.unknown_cost_categories.length > 0 ? "UNKNOWN" : "KNOWN",
    lineages: [],
    anomalies: [],
    registry: [],
    captured_at: now,
  };
}
