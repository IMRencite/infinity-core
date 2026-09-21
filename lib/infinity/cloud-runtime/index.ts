export * from "./contract";
export * from "./types";
export * from "./store";
export * from "./persist-postgres";
export * from "./lease";
export * from "./catchup";
export * from "./observe";
export * from "./executor";
export * from "./auth";
export * from "./hq";
export * from "./public";
export * from "./scheduler";
export * from "./gates";
export * from "./sanitize";

export function cloudRuntimeFinancialLock() {
  return {
    verified_cash: 50,
    founder_authorized_capital: 50,
    portfolio_ceiling: 50,
    occupancynpv_allocation: 25,
    spend_authority: 5,
    committed: 0,
    actual_spend: 0,
    paid_acquisition: 0,
    mercury: "READ_ONLY" as const,
    general_money_movement: "DISABLED" as const,
    autonomous_financial_commitments: "DISABLED" as const,
    affiliate_live_payout: "DISABLED" as const,
  };
}
