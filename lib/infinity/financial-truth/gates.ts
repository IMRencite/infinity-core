import type {
  HqFinancialTruthView,
  MercuryConnectionState,
  NamedFinancialGate,
  PortfolioCashPosition,
  StripeMercurySettlementReconciliation,
} from "./types";
import {
  FINANCIAL_ACCOUNT_RECONCILIATION_GATE,
  FOUNDER_CAPITAL_POLICY_FINANCIAL_TRUTH_GATE,
  HQ_LIVE_FINANCIAL_REFRESH_GATE,
  PORTFOLIO_CAPITAL_ALLOCATION_GATE,
  VERIFIED_CASH_COMPLETENESS_GATE,
} from "./types";
import { CANONICAL_FOUNDER_CAPITAL_POLICY } from "./founder-capital-policy";

export function evaluateVerifiedCashCompletenessGate(cash: PortfolioCashPosition): NamedFinancialGate {
  return {
    gate: VERIFIED_CASH_COMPLETENESS_GATE,
    result: cash.cash_completeness === "COMPLETE" ? "PASS" : cash.cash_completeness === "PARTIAL" ? "PARTIAL" : "FAIL",
    reasons: [cash.cash_completeness, `UNVERIFIED_${cash.unverified_accounts}`],
  };
}

export function evaluateFinancialAccountReconciliationGate(
  reconciliation: StripeMercurySettlementReconciliation,
): NamedFinancialGate {
  const failAnomaly = reconciliation.anomalies.some((row) => row.severity === "FAIL");
  if (
    reconciliation.stripe_to_ledger === "FAIL" ||
    reconciliation.stripe_payout_to_mercury === "FAIL" ||
    reconciliation.settlement_reconciliation_status === "FAILED" ||
    failAnomaly
  ) {
    return { gate: FINANCIAL_ACCOUNT_RECONCILIATION_GATE, result: "FAIL", reasons: ["RECONCILIATION_FAIL"] };
  }
  if (
    reconciliation.settlement_reconciliation_status === "PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED" &&
    reconciliation.duplicate_settlements === 0
  ) {
    return {
      gate: FINANCIAL_ACCOUNT_RECONCILIATION_GATE,
      result: "PASS_WITH_UNCONNECTED_SETTLEMENT_DESTINATION",
      reasons: ["PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED", "NOT_AN_ANOMALY"],
    };
  }
  if (
    reconciliation.stripe_to_ledger === "PARTIAL" ||
    reconciliation.stripe_payout_to_mercury === "PENDING" ||
    reconciliation.stripe_payout_to_mercury === "UNKNOWN" ||
    reconciliation.stripe_payout_to_mercury === "NO_SETTLEMENT_HISTORY" ||
    reconciliation.settlement_reconciliation_status === "PENDING" ||
    reconciliation.settlement_reconciliation_status === "UNKNOWN"
  ) {
    return {
      gate: FINANCIAL_ACCOUNT_RECONCILIATION_GATE,
      result: "PARTIAL",
      reasons: [reconciliation.stripe_to_ledger, reconciliation.stripe_payout_to_mercury],
    };
  }
  return { gate: FINANCIAL_ACCOUNT_RECONCILIATION_GATE, result: "PASS", reasons: ["RECONCILED"] };
}

export function evaluateHQLiveFinancialRefreshGate(input: {
  mercuryConnection: MercuryConnectionState;
  financialTruthProjected: boolean;
  mercuryMetricVisible: boolean;
  liquidMetricVisible: boolean;
  stripeAvailableVisible: boolean;
  stripePendingVisible: boolean;
  freshnessVisible: boolean;
  liveStateAttachesFinancialTruth: boolean;
  pollRefreshesProviders: boolean;
  catchUpRefreshesWhenUnverified: boolean;
  mercuryValueLive: boolean;
  verifiedLiquidRecalculated: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (input.mercuryConnection !== "LIVE") reasons.push("MERCURY_NOT_LIVE");
  if (!input.mercuryValueLive) reasons.push("MERCURY_VALUE_NOT_LIVE");
  if (!input.financialTruthProjected) reasons.push("FINANCIAL_TRUTH_NOT_PROJECTED");
  if (!input.mercuryMetricVisible) reasons.push("MERCURY_METRIC_MISSING");
  if (!input.liquidMetricVisible) reasons.push("LIQUID_CASH_METRIC_MISSING");
  if (!input.stripeAvailableVisible) reasons.push("STRIPE_AVAILABLE_METRIC_MISSING");
  if (!input.stripePendingVisible) reasons.push("STRIPE_PENDING_METRIC_MISSING");
  if (!input.freshnessVisible) reasons.push("FRESHNESS_NOT_VISIBLE");
  if (!input.liveStateAttachesFinancialTruth) reasons.push("LIVE_STATE_MISSING_FINANCIAL_TRUTH");
  if (input.pollRefreshesProviders) reasons.push("POLL_HITS_PROVIDERS");
  if (!input.catchUpRefreshesWhenUnverified) reasons.push("CATCH_UP_DOES_NOT_REFRESH");
  if (!input.verifiedLiquidRecalculated) reasons.push("LIQUID_CASH_NOT_RECALCULATED");
  return {
    gate: HQ_LIVE_FINANCIAL_REFRESH_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons: reasons.length === 0 ? ["HQ_LIVE_FINANCIAL_REFRESH"] : reasons,
  };
}

export function evaluatePortfolioCapitalAllocationGate(input: {
  authorized: number;
  allocated: number;
  committed: number;
  requested?: number;
}): NamedFinancialGate {
  const remaining = input.authorized - input.allocated - input.committed;
  if (input.allocated + input.committed > input.authorized) {
    return {
      gate: PORTFOLIO_CAPITAL_ALLOCATION_GATE,
      result: "FAIL",
      reasons: ["OVER_ALLOCATED"],
    };
  }
  if (input.requested != null && input.requested > remaining) {
    return {
      gate: PORTFOLIO_CAPITAL_ALLOCATION_GATE,
      result: "FAIL",
      reasons: ["REQUEST_EXCEEDS_REMAINING_AUTHORIZATION"],
    };
  }
  return {
    gate: PORTFOLIO_CAPITAL_ALLOCATION_GATE,
    result: "PASS",
    reasons: ["WITHIN_AUTHORIZED_CAPITAL"],
  };
}

export function evaluateFounderCapitalPolicyFinancialTruthGate(view: HqFinancialTruthView): NamedFinancialGate {
  const reasons: string[] = [];
  const required = [
    view.metrics.find((row) => row.id === "verified_liquid_cash"),
    view.metrics.find((row) => row.id === "mercury_cash"),
    view.metrics.find((row) => row.id === "stripe_available"),
    view.metrics.find((row) => row.id === "stripe_pending"),
    view.metrics.find((row) => row.id === "gross_revenue"),
    view.metrics.find((row) => row.id === "refunds"),
    view.metrics.find((row) => row.id === "processor_fees"),
    view.metrics.find((row) => row.id === "known_spend"),
    view.metrics.find((row) => row.id === "unknown_cost_state"),
    view.metrics.find((row) => row.id === "modeled_revenue"),
    view.metrics.find((row) => row.id === "authorized_capital"),
    view.metrics.find((row) => row.id === "remaining_authorized_capital"),
    view.metrics.find((row) => row.id === "allocated_capital"),
    view.metrics.find((row) => row.id === "unallocated_authorized_capital"),
    view.metrics.find((row) => row.id === "settlement_destination"),
    view.metrics.find((row) => row.id === "settlement_status"),
  ];
  if (required.some((row) => !row)) reasons.push("MISSING_HQ_METRIC");
  if (!view.layers_separated) reasons.push("LAYERS_COMBINED");
  if (view.founder_estimate_used) reasons.push("FOUNDER_ESTIMATE_USED");
  if (view.actual.unknown_cost_categories.length > 0 && view.actual.contribution != null) {
    reasons.push("UNKNOWN_COSTS_TREATED_AS_KNOWN_CONTRIBUTION");
  }
  if (view.actual.unknown_cost_categories.includes("INFRASTRUCTURE") && view.actual.known_costs === 0) {
    reasons.push("UNKNOWN_INFRASTRUCTURE_DISPLAYED_AS_ZERO");
  }
  if (view.mercury.connection !== "LIVE") reasons.push("MERCURY_CASH_NOT_LIVE");
  if (view.stripe.connection !== "LIVE") reasons.push("STRIPE_NOT_LIVE");
  if (view.cash.cash_completeness !== "COMPLETE") reasons.push("CASH_INCOMPLETE");
  if (view.capital.authorization_source !== "FOUNDER_EXPLICIT_AUTHORIZATION") {
    reasons.push("AUTHORIZATION_NOT_EXPLICIT");
  }
  if (typeof view.capital.authorized_capital !== "number") reasons.push("AUTHORIZED_CAPITAL_NOT_SET");
  const treasuryCash = view.cash.mercury_available ?? view.cash.verified_liquid_cash;
  if (
    typeof view.capital.authorized_capital === "number" &&
    (treasuryCash == null || view.capital.authorized_capital > treasuryCash)
  ) {
    reasons.push("AUTHORIZATION_EXCEEDS_VERIFIED_TREASURY_CASH");
  }
  if (view.capital.allocated_capital !== 0 && view.metrics.find((row) => row.id === "allocated_capital")?.display === view.metrics.find((row) => row.id === "verified_liquid_cash")?.display) {
    reasons.push("ALLOCATION_COLLAPSED_INTO_CASH");
  }
  if (view.capital.future_deposits_auto_authorize) reasons.push("FUTURE_DEPOSITS_AUTO_AUTHORIZE");
  if (view.capital.revenue_auto_authorizes) reasons.push("REVENUE_AUTO_AUTHORIZES");
  if (view.capital.money_movement_enabled || !view.read_only_bank_access) reasons.push("MONEY_MOVEMENT_ENABLED");
  const policyBurn = view.treasury_control?.portfolio_budget.monthly_burn_cap ?? "NOT_SET";
  if (view.capital.monthly_burn_cap !== policyBurn) reasons.push("MONTHLY_BURN_CAP_INVENTED");
  if (
    typeof view.capital.monthly_burn_cap === "number" &&
    typeof view.capital.authorized_capital === "number" &&
    view.capital.monthly_burn_cap > view.capital.authorized_capital
  ) {
    reasons.push("MONTHLY_BURN_EXCEEDS_AUTHORIZATION");
  }
  const policyAds = view.treasury_control?.portfolio_budget.paid_acquisition_budget ?? CANONICAL_FOUNDER_CAPITAL_POLICY.paid_advertising_budget;
  if (view.capital.paid_advertising_budget !== policyAds) {
    reasons.push("PAID_ADVERTISING_AUTO_AUTHORIZED");
  }
  return {
    gate: FOUNDER_CAPITAL_POLICY_FINANCIAL_TRUTH_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons: reasons.length === 0 ? ["EXPLICIT_FOUNDER_AUTHORIZATION"] : reasons,
  };
}
