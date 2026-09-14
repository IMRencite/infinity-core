import { freshnessFromAge } from "./amounts";
import type { FreshnessState, NamedFinancialGate } from "./types";
import { FINANCIAL_DATA_FRESHNESS_GATE } from "./types";

export function evaluateFinancialDataFreshnessGate(input: {
  mercury: FreshnessState;
  stripe: FreshnessState;
  ledger: FreshnessState;
}): NamedFinancialGate {
  const reasons = [`MERCURY_${input.mercury}`, `STRIPE_${input.stripe}`, `LEDGER_${input.ledger}`];
  const silentCurrent =
    (input.mercury === "STALE" && !reasons.includes("MERCURY_STALE")) ||
    (input.stripe === "STALE" && !reasons.includes("STRIPE_STALE"));
  return {
    gate: FINANCIAL_DATA_FRESHNESS_GATE,
    result: silentCurrent ? "FAIL" : "PASS",
    reasons,
  };
}

export function ledgerFreshness(lastLedgerCalc: string | null, nowMs = Date.now()): FreshnessState {
  return freshnessFromAge(lastLedgerCalc, nowMs);
}
