import type { PortfolioCapitalPosition, PortfolioCashPosition } from "./types";
import { PORTFOLIO_CAPITAL_POSITION } from "./types";
import {
  CANONICAL_FOUNDER_CAPITAL_POLICY,
  DEFAULT_PAID_ADVERTISING_BUDGET_USD,
  type FounderCapitalPolicy,
} from "./founder-capital-policy";

export function computePortfolioCapitalPosition(input: {
  cash: PortfolioCashPosition;
  committed_capital: number | null;
  spent_capital: number | null;
  current_month_known_burn: number | null;
  unknown_cost_state: "KNOWN" | "PARTIAL" | "UNKNOWN";
  portfolio_cap?: number | null;
  monthly_burn_cap?: number | null;
  allocated_capital?: number | null;
  policy?: FounderCapitalPolicy | null;
  applyCanonicalPolicy?: boolean;
}): PortfolioCapitalPosition {
  const policy = input.applyCanonicalPolicy === false ? input.policy ?? null : input.policy ?? CANONICAL_FOUNDER_CAPITAL_POLICY;
  const allocated = input.allocated_capital ?? 0;
  const committed = input.committed_capital ?? 0;
  const spent = input.spent_capital ?? 0;
  const burnSet = input.monthly_burn_cap != null && Number.isFinite(input.monthly_burn_cap);
  if (!policy) {
    const capSet = input.portfolio_cap != null && Number.isFinite(input.portfolio_cap);
    return {
      contract: PORTFOLIO_CAPITAL_POSITION,
      verified_liquid_cash: input.cash.verified_liquid_cash,
      configured_portfolio_cap: capSet ? input.portfolio_cap! : "NOT_SET",
      authorized_capital: capSet ? input.portfolio_cap! : "NOT_SET",
      committed_capital: committed,
      spent_capital: spent,
      remaining_authorized_capital: capSet ? input.portfolio_cap! - allocated - committed : "NOT_SET",
      reserve_requirement: "NOT_SET",
      available_for_new_ventures: capSet ? input.portfolio_cap! - allocated : "NOT_SET",
      monthly_burn_cap: burnSet ? input.monthly_burn_cap! : "NOT_SET",
      current_month_known_burn: input.current_month_known_burn,
      unknown_cost_state: input.unknown_cost_state,
      founder_deposits_auto_increase_spend_authority: false,
      allocated_capital: allocated,
      unallocated_authorized_capital: capSet ? input.portfolio_cap! - allocated : "NOT_SET",
      portfolio_capital_ceiling: capSet ? input.portfolio_cap! : "NOT_SET",
      policy_status: "NOT_SET",
      authorization_source: "NOT_SET",
      founder_decision: null,
      future_deposits_auto_authorize: false,
      revenue_auto_authorizes: false,
      paid_advertising_budget: DEFAULT_PAID_ADVERTISING_BUDGET_USD,
      money_movement_enabled: false,
    };
  }
  const authorized = policy.authorized_capital;
  const remaining = authorized - allocated - committed;
  const unallocated = authorized - allocated;
  return {
    contract: PORTFOLIO_CAPITAL_POSITION,
    verified_liquid_cash: input.cash.verified_liquid_cash,
    configured_portfolio_cap: policy.portfolio_capital_ceiling,
    authorized_capital: authorized,
    committed_capital: committed,
    spent_capital: spent,
    remaining_authorized_capital: remaining,
    reserve_requirement: "NOT_SET",
    available_for_new_ventures: unallocated,
    monthly_burn_cap: policy.monthly_burn_cap,
    current_month_known_burn: input.current_month_known_burn,
    unknown_cost_state: input.unknown_cost_state,
    founder_deposits_auto_increase_spend_authority: false,
    allocated_capital: allocated,
    unallocated_authorized_capital: unallocated,
    portfolio_capital_ceiling: policy.portfolio_capital_ceiling,
    policy_status: policy.status,
    authorization_source: policy.authorization_source,
    founder_decision: policy.founder_decision,
    future_deposits_auto_authorize: false,
    revenue_auto_authorizes: false,
    paid_advertising_budget: policy.paid_advertising_budget,
    money_movement_enabled: false,
  };
}

export function applyFounderMercuryDeposit(input: {
  previousMercuryAvailable: number;
  deposit: number;
  previousAuthorized: "NOT_SET" | number;
}): { mercury_available: number; authorized_capital: "NOT_SET" | number } {
  return {
    mercury_available: input.previousMercuryAvailable + input.deposit,
    authorized_capital: input.previousAuthorized,
  };
}
