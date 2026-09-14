import { FOUNDER_CAPITAL_POLICY_CONTRACT } from "./types";

export const FOUNDER_AUTHORIZED_PORTFOLIO_CAPITAL_USD = 50;
export const FOUNDER_PORTFOLIO_CAPITAL_CEILING_USD = 50;
export const FOUNDER_AUTHORIZATION_SOURCE = "FOUNDER_EXPLICIT_AUTHORIZATION" as const;
export const FOUNDER_CAPITAL_DECISION = "AUTHORIZE_ALL_CURRENT_VERIFIED_MERCURY_CASH" as const;
export const FOUNDER_CAPITAL_POLICY_CURRENCY = "USD" as const;
export const FOUNDER_CAPITAL_POLICY_STATUS = "ACTIVE" as const;
export const DEFAULT_PAID_ADVERTISING_BUDGET_USD = 0;
export const BUDGET_CEILING_IS_NOT_A_SPENDING_TARGET = true;
export const FUTURE_DEPOSITS_AUTO_AUTHORIZE = false;
export const REVENUE_AUTO_AUTHORIZES = false;
export const AUTHORIZED_CAPITAL_IS_EVERGREEN_BALANCE_RULE = false;

export const EAG_TREASURY_EXECUTION_REQUIREMENTS = [
  "PORTFOLIO_AUTHORIZATION_EXISTS",
  "VENTURE_ALLOCATION_EXISTS",
  "SUFFICIENT_REMAINING_ALLOCATION",
  "SPEND_CATEGORY_PERMITTED",
  "AMOUNT_WITHIN_LIMITS",
  "RECIPIENT_PROVIDER_VALID",
  "DUPLICATE_PAYMENT_CHECK",
  "RISK_CONTROLS",
  "IDEMPOTENCY",
  "AUDIT_LINEAGE",
] as const;

export type FounderCapitalPolicy = {
  contract: typeof FOUNDER_CAPITAL_POLICY_CONTRACT;
  authorized_capital: number;
  portfolio_capital_ceiling: number;
  currency: typeof FOUNDER_CAPITAL_POLICY_CURRENCY;
  status: typeof FOUNDER_CAPITAL_POLICY_STATUS;
  authorization_source: typeof FOUNDER_AUTHORIZATION_SOURCE;
  founder_decision: typeof FOUNDER_CAPITAL_DECISION;
  authorized_cash_source: "MERCURY_VERIFIED_TREASURY_CASH";
  evergreen_future_balances: false;
  future_deposits_auto_authorize: false;
  revenue_auto_authorizes: false;
  paid_advertising_budget: number;
  monthly_burn_cap: "NOT_SET" | number;
  money_movement_enabled: false;
  mercury_write_access: false;
  permits_arbitrary_spending: false;
};

export const CANONICAL_FOUNDER_CAPITAL_POLICY: FounderCapitalPolicy = {
  contract: FOUNDER_CAPITAL_POLICY_CONTRACT,
  authorized_capital: FOUNDER_AUTHORIZED_PORTFOLIO_CAPITAL_USD,
  portfolio_capital_ceiling: FOUNDER_PORTFOLIO_CAPITAL_CEILING_USD,
  currency: FOUNDER_CAPITAL_POLICY_CURRENCY,
  status: FOUNDER_CAPITAL_POLICY_STATUS,
  authorization_source: FOUNDER_AUTHORIZATION_SOURCE,
  founder_decision: FOUNDER_CAPITAL_DECISION,
  authorized_cash_source: "MERCURY_VERIFIED_TREASURY_CASH",
  evergreen_future_balances: false,
  future_deposits_auto_authorize: false,
  revenue_auto_authorizes: false,
  paid_advertising_budget: DEFAULT_PAID_ADVERTISING_BUDGET_USD,
  monthly_burn_cap: "NOT_SET",
  money_movement_enabled: false,
  mercury_write_access: false,
  permits_arbitrary_spending: false,
};

export function loadCanonicalFounderCapitalPolicy(): FounderCapitalPolicy {
  return CANONICAL_FOUNDER_CAPITAL_POLICY;
}

export function futureDepositDoesNotIncreaseAuthorization(input: {
  previousAuthorized: number;
  mercuryAfterDeposit: number;
}): { authorized_capital: number; mercury_available: number } {
  return {
    authorized_capital: input.previousAuthorized,
    mercury_available: input.mercuryAfterDeposit,
  };
}

export function revenueDoesNotIncreaseAuthorization(input: {
  previousAuthorized: number;
  revenue: number;
}): { authorized_capital: number; revenue: number } {
  return {
    authorized_capital: input.previousAuthorized,
    revenue: input.revenue,
  };
}
