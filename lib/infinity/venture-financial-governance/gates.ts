import type { BudgetEnvelope, NamedGate, NewVentureCreationState } from "./types";
import {
  ACTION_SPEND_AUTHORIZATION_GATE,
  ACTIVE_VENTURE_BUILD_CAPACITY_GATE,
  EXPECTED_VALIDATION_BUDGET_GATE,
  PORTFOLIO_CAPITAL_STOP_GATE,
  PORTFOLIO_MONTHLY_BURN_GATE,
  UNVALIDATED_VENTURE_CAPITAL_RISK_GATE,
} from "./types";
import { inspectFinancialGovernance } from "./store";
import { computeVentureLedger } from "./ledger";
import { envelopeRemaining } from "./budget";
import { computeEpistemicMonthlyBurn } from "./epistemic-burn";

export type SpendKind = "DISCRETIONARY" | "CRITICAL_FULFILLMENT" | "CUSTOMER_SUPPORT" | "SECURITY" | "PAYMENT_OPS" | "REQUIRED_INFRASTRUCTURE";

/** Known recorded monthly spend only. Absence of telemetry is $0 known, not a known total. */
export function currentMonthKnownBurn(): number {
  return computeEpistemicMonthlyBurn().known_amount;
}

/** @deprecated Use currentMonthKnownBurn / computeEpistemicMonthlyBurn. This is known recorded spend, not total burn. */
export function currentMonthBurn(): number {
  return currentMonthKnownBurn();
}

export function portfolioSpentCommittedReserved() {
  const state = inspectFinancialGovernance();
  const spent = state.costs.filter((row) => row.committed_or_spent === "SPENT" && row.amount != null).reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const committed = state.costs.filter((row) => row.committed_or_spent === "COMMITTED" && row.amount != null).reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const reserved = state.costs.filter((row) => row.committed_or_spent === "RESERVED" && row.amount != null).reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const allocated = state.budgets.reduce((sum, row) => sum + (row.total_authorized_budget ?? 0), 0);
  return { spent, committed, reserved, allocated };
}

export function evaluateActionSpendAuthorizationGate(input: {
  venture_id: string;
  amount?: number | null;
  envelope?: BudgetEnvelope;
  kind?: SpendKind;
  risk?: "LOW" | "MEDIUM" | "HIGH";
}): NamedGate {
  const reasons: string[] = [];
  if (input.amount == null) {
    reasons.push("EXPECTED_COST_UNKNOWN");
    return { gate: ACTION_SPEND_AUTHORIZATION_GATE, result: "FAIL", reasons };
  }
  const state = inspectFinancialGovernance();
  const budget = state.budgets.find((row) => row.venture_id === input.venture_id);
  if (!budget || budget.total_authorized_budget == null || budget.status === "NOT_SET") {
    reasons.push("VENTURE_BUDGET_NOT_SET");
    return { gate: ACTION_SPEND_AUTHORIZATION_GATE, result: "FAIL", reasons };
  }
  const ledger = computeVentureLedger(state, input.venture_id);
  const available = ledger.available_capital.value ?? 0;
  if (input.amount > available) reasons.push("BLOCKED_VENTURE_BUDGET");
  if (input.envelope) {
    const remaining = envelopeRemaining(input.venture_id, input.envelope);
    if (remaining != null && input.amount > remaining) reasons.push("BLOCKED_CATEGORY_BUDGET");
  }
  const portfolio = evaluatePortfolioCapitalStopGate();
  if (portfolio.result === "FAIL" && (input.kind ?? "DISCRETIONARY") === "DISCRETIONARY") {
    reasons.push("BLOCKED_PORTFOLIO_CAPITAL");
  }
  const burn = evaluatePortfolioMonthlyBurnGate(input.kind ?? "DISCRETIONARY");
  if (burn.result === "FAIL") reasons.push("BLOCKED_MONTHLY_BURN");
  return { gate: ACTION_SPEND_AUTHORIZATION_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluatePortfolioCapitalStopGate(): NamedGate {
  const policy = inspectFinancialGovernance().portfolio;
  if (policy.status === "NOT_SET" || policy.total_authorized == null) {
    return { gate: PORTFOLIO_CAPITAL_STOP_GATE, result: "FAIL", reasons: ["NOT_SET"] };
  }
  const usage = portfolioSpentCommittedReserved();
  const remaining = policy.total_authorized - usage.spent - usage.committed - usage.reserved;
  return {
    gate: PORTFOLIO_CAPITAL_STOP_GATE,
    result: remaining <= 0 ? "FAIL" : "PASS",
    reasons: remaining <= 0 ? ["BLOCK_NEW_VENTURE_CREATION"] : [],
  };
}

export function evaluatePortfolioMonthlyBurnGate(kind: SpendKind = "DISCRETIONARY"): NamedGate {
  const critical = kind !== "DISCRETIONARY";
  const policy = inspectFinancialGovernance().portfolio;
  if (policy.status === "NOT_SET" || policy.monthly_burn_cap == null) {
    return { gate: PORTFOLIO_MONTHLY_BURN_GATE, result: critical ? "PASS" : "FAIL", reasons: ["NOT_SET"] };
  }
  const burn = computeEpistemicMonthlyBurn();
  if (!critical && burn.total_state !== "KNOWN") {
    return {
      gate: PORTFOLIO_MONTHLY_BURN_GATE,
      result: "FAIL",
      reasons: ["UNKNOWN_BURN_NOT_ZERO", "BURN_INCOMPLETE", "PAUSE_DISCRETIONARY_NEW_BUILD"],
    };
  }
  if (burn.total_state === "KNOWN" && (burn.total_amount ?? 0) >= policy.monthly_burn_cap && !critical) {
    return {
      gate: PORTFOLIO_MONTHLY_BURN_GATE,
      result: "FAIL",
      reasons: ["PAUSE_DISCRETIONARY_NEW_BUILD", "PAUSE_NONESSENTIAL_SPEND"],
    };
  }
  return { gate: PORTFOLIO_MONTHLY_BURN_GATE, result: "PASS", reasons: [] };
}

export function evaluateUnvalidatedVentureCapitalRiskGate(input?: { unvalidated_at_risk?: number; starting_unvalidated?: boolean }): NamedGate {
  const policy = inspectFinancialGovernance().portfolio;
  if (policy.status === "NOT_SET" || policy.unvalidated_capital_cap == null) {
    return { gate: UNVALIDATED_VENTURE_CAPITAL_RISK_GATE, result: "FAIL", reasons: ["NOT_SET"] };
  }
  const atRisk = input?.unvalidated_at_risk ?? 0;
  if ((input?.starting_unvalidated ?? true) && atRisk >= policy.unvalidated_capital_cap) {
    return { gate: UNVALIDATED_VENTURE_CAPITAL_RISK_GATE, result: "FAIL", reasons: ["BLOCKED_UNVALIDATED_RISK"] };
  }
  return { gate: UNVALIDATED_VENTURE_CAPITAL_RISK_GATE, result: "PASS", reasons: [] };
}

export function evaluateActiveVentureBuildCapacityGate(activeBuildCount: number): NamedGate {
  const policy = inspectFinancialGovernance().portfolio;
  if (policy.status === "NOT_SET" || policy.max_active_builds == null) {
    return { gate: ACTIVE_VENTURE_BUILD_CAPACITY_GATE, result: "FAIL", reasons: ["NOT_SET"] };
  }
  if (activeBuildCount >= policy.max_active_builds) {
    return { gate: ACTIVE_VENTURE_BUILD_CAPACITY_GATE, result: "FAIL", reasons: ["BLOCKED_BUILD_CAPACITY"] };
  }
  return { gate: ACTIVE_VENTURE_BUILD_CAPACITY_GATE, result: "PASS", reasons: [] };
}

export function evaluateExpectedValidationBudgetGate(input: {
  venture_id?: string;
  preliminary_economics?: boolean;
  expected_validation_cost?: number | null;
  expected_build_cost?: number | null;
  authorized_budget?: number | null;
}): NamedGate {
  const reasons: string[] = [];
  if (!input.preliminary_economics) reasons.push("EMPTY_ECONOMICS");
  if (input.expected_validation_cost == null) reasons.push("VALIDATION_COST_UNKNOWN");
  if (input.expected_build_cost == null) reasons.push("BUILD_COST_UNKNOWN");
  if (input.authorized_budget == null) reasons.push("BUDGET_NOT_SET");
  return { gate: EXPECTED_VALIDATION_BUDGET_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateVentureCreationPrecheck(input: {
  active_build_count: number;
  unvalidated_at_risk: number;
  starting_unvalidated?: boolean;
  preliminary_economics?: boolean;
  expected_validation_cost?: number | null;
  expected_build_cost?: number | null;
  authorized_budget?: number | null;
}): { state: NewVentureCreationState; discovery_may_continue: true; new_spend_build_may_begin: boolean; reason: string; gates: NamedGate[] } {
  const capital = evaluatePortfolioCapitalStopGate();
  const burn = evaluatePortfolioMonthlyBurnGate("DISCRETIONARY");
  const unvalidated = evaluateUnvalidatedVentureCapitalRiskGate({
    unvalidated_at_risk: input.unvalidated_at_risk,
    starting_unvalidated: input.starting_unvalidated ?? true,
  });
  const capacity = evaluateActiveVentureBuildCapacityGate(input.active_build_count);
  const economics = evaluateExpectedValidationBudgetGate({
    preliminary_economics: input.preliminary_economics ?? false,
    expected_validation_cost: input.expected_validation_cost,
    expected_build_cost: input.expected_build_cost,
    authorized_budget: input.authorized_budget,
  });
  const gates = [capital, burn, unvalidated, capacity, economics];
  let state: NewVentureCreationState = "ALLOWED";
  if (capital.reasons.includes("NOT_SET") || burn.reasons.includes("NOT_SET")) state = "BLOCKED_PENDING_CAPITAL_POLICY";
  else if (capital.result === "FAIL") state = "BLOCKED_CAPITAL";
  else if (burn.result === "FAIL") state = "BLOCKED_MONTHLY_BURN";
  else if (unvalidated.result === "FAIL") state = "BLOCKED_UNVALIDATED_RISK";
  else if (capacity.result === "FAIL") state = "BLOCKED_BUILD_CAPACITY";
  else if (economics.result === "FAIL") state = "BLOCKED_ECONOMICS";
  return {
    state,
    discovery_may_continue: true,
    new_spend_build_may_begin: state === "ALLOWED",
    reason: state === "ALLOWED" ? "ALL_CAPITAL_GATES_PASS" : gates.flatMap((gate) => gate.reasons).join(",") || state,
    gates,
  };
}

export function ventureBuildStopState(ventureId: string): "CONTINUE" | "BUDGET_EXHAUSTED" | "REALLOCATION_REQUIRED" | "PAUSE" | "CONTINUE_REVENUE_OPERATIONS_ONLY" {
  const budget = inspectFinancialGovernance().budgets.find((row) => row.venture_id === ventureId);
  if (!budget || budget.total_authorized_budget == null) return "PAUSE";
  const remaining = envelopeRemaining(ventureId, "BUILD");
  const overall = computeVentureLedger(inspectFinancialGovernance(), ventureId).available_capital.value;
  if ((remaining != null && remaining <= 0) || (overall != null && overall <= 0)) return "BUDGET_EXHAUSTED";
  return "CONTINUE";
}
