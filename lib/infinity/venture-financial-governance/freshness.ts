import type { NamedGate } from "./types";
import { FINANCIAL_DATA_FRESHNESS_GATE } from "./types";
import { inspectFinancialGovernance } from "./store";

const STALE_MS = 36 * 60 * 60 * 1000;

export function evaluateFinancialDataFreshnessGate(now = Date.now()): NamedGate {
  const state = inspectFinancialGovernance();
  const reasons: string[] = [];
  const check = (label: string, iso: string | null) => {
    if (!iso) {
      reasons.push(`${label}_NEVER`);
      return;
    }
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) {
      reasons.push(`${label}_INVALID`);
      return;
    }
    if (now - ts > STALE_MS) reasons.push(`${label}_STALE`);
  };
  check("PAYMENT_SYNC", state.last_payment_sync);
  check("COST_SYNC", state.last_cost_sync);
  check("LEDGER_CALC", state.last_ledger_calc);
  return {
    gate: FINANCIAL_DATA_FRESHNESS_GATE,
    result: "PASS",
    reasons: reasons.length === 0 ? ["FRESH"] : reasons,
  };
}

export function freshnessLabels(now = Date.now()) {
  const gate = evaluateFinancialDataFreshnessGate(now);
  const state = inspectFinancialGovernance();
  return {
    last_payment_sync: state.last_payment_sync,
    last_cost_sync: state.last_cost_sync,
    last_ledger_calc: state.last_ledger_calc,
    stale: gate.reasons.some((row) => row.endsWith("_STALE") || row.endsWith("_NEVER")),
    labels: gate.reasons,
  };
}
