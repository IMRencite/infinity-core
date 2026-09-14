import { HQ_ROUTES } from "@/lib/infinity/hq/constants";
import { displayMoney } from "./amounts";
import {
  CANONICAL_TREASURY_PROJECTION,
  HQ_FINANCIAL_PULSE_CONTRACT,
  HQ_FINANCIAL_TRUTH_ANCHOR,
  PORTFOLIO_ACTUAL_ECONOMICS_PROJECTION,
  type CanonicalTreasuryProjection,
  type CashCompleteness,
  type HqFinancialTruthView,
  type PortfolioActualEconomicsProjection,
} from "./types";

export type HqFinancialPulseMetricId =
  | "treasury_cash"
  | "authorized_capital"
  | "allocated_capital"
  | "actual_spend"
  | "month_revenue"
  | "lifetime_revenue"
  | "actual_contribution"
  | "top_revenue_venture";

export type HqFinancialPulseGroup = "treasury" | "performance";
export type HqFinancialPulseAction = "SCROLL_FINANCIAL_TRUTH" | "OPEN_ALLOCATIONS";

export type HqFinancialPulseMetric = {
  id: HqFinancialPulseMetricId;
  group: HqFinancialPulseGroup;
  label: string;
  display: string;
  value: number | null;
  action: HqFinancialPulseAction;
  href: string;
};

export type HqFinancialPulse = {
  contract: typeof HQ_FINANCIAL_PULSE_CONTRACT;
  source_contract: typeof CANONICAL_TREASURY_PROJECTION;
  economics_contract: typeof PORTFOLIO_ACTUAL_ECONOMICS_PROJECTION;
  treasury_status: CanonicalTreasuryProjection["treasury_status"];
  cash_completeness: CashCompleteness;
  status_label: "TREASURY LIVE" | "TREASURY DEGRADED";
  metrics: HqFinancialPulseMetric[];
  portfolio: PortfolioActualEconomicsProjection;
};

function numeric(value: number | "NOT_SET" | null | undefined): number | null {
  return typeof value === "number" ? value : null;
}

function metric(
  id: HqFinancialPulseMetricId,
  group: HqFinancialPulseGroup,
  label: string,
  display: string,
  value: number | null,
  action: HqFinancialPulseAction,
): HqFinancialPulseMetric {
  return {
    id,
    group,
    label,
    display,
    value,
    action,
    href: action === "OPEN_ALLOCATIONS" ? HQ_ROUTES.allocations : `#${HQ_FINANCIAL_TRUTH_ANCHOR}`,
  };
}

export function emptyPortfolioEconomics(now = new Date().toISOString()): PortfolioActualEconomicsProjection {
  return {
    contract: PORTFOLIO_ACTUAL_ECONOMICS_PROJECTION,
    current_month_gross_revenue: 0,
    lifetime_gross_revenue: 0,
    current_month_refunds: 0,
    current_month_processor_fees: 0,
    known_actual_cost: null,
    unknown_cost_state: "UNKNOWN",
    actual_contribution: null,
    contribution_display: "UNKNOWN",
    top_revenue_venture: {
      venture_id: null,
      display_name: null,
      current_month_gross_revenue: 0,
      ranking_basis: "CURRENT_MONTH_REVENUE",
      display: "NONE YET",
    },
    operating_venture_count: 0,
    last_updated_at: now,
    ventures: [],
  };
}

export function projectHqFinancialPulse(
  treasury: CanonicalTreasuryProjection | null | undefined,
  portfolio?: PortfolioActualEconomicsProjection | null,
): HqFinancialPulse | null {
  if (!treasury || treasury.contract !== CANONICAL_TREASURY_PROJECTION) return null;
  const economics = portfolio?.contract === PORTFOLIO_ACTUAL_ECONOMICS_PROJECTION
    ? portfolio
    : emptyPortfolioEconomics();
  return {
    contract: HQ_FINANCIAL_PULSE_CONTRACT,
    source_contract: CANONICAL_TREASURY_PROJECTION,
    economics_contract: PORTFOLIO_ACTUAL_ECONOMICS_PROJECTION,
    treasury_status: treasury.treasury_status,
    cash_completeness: treasury.cash_completeness,
    status_label: treasury.treasury_status === "LIVE" ? "TREASURY LIVE" : "TREASURY DEGRADED",
    portfolio: economics,
    metrics: [
      metric("treasury_cash", "treasury", "Treasury Cash", treasury.verified_treasury_cash.display, numeric(treasury.verified_treasury_cash.value), "SCROLL_FINANCIAL_TRUTH"),
      metric("authorized_capital", "treasury", "Authorized", treasury.authorized_capital.display, numeric(treasury.authorized_capital.value), "OPEN_ALLOCATIONS"),
      metric("allocated_capital", "treasury", "Allocated", treasury.allocated_capital.display, numeric(treasury.allocated_capital.value), "OPEN_ALLOCATIONS"),
      metric("actual_spend", "treasury", "Actual Spend", treasury.actual_spend.display, numeric(treasury.actual_spend.value), "SCROLL_FINANCIAL_TRUTH"),
      metric("month_revenue", "performance", "Month Revenue", displayMoney(economics.current_month_gross_revenue), economics.current_month_gross_revenue, "SCROLL_FINANCIAL_TRUTH"),
      metric("lifetime_revenue", "performance", "Lifetime Revenue", displayMoney(economics.lifetime_gross_revenue), economics.lifetime_gross_revenue, "SCROLL_FINANCIAL_TRUTH"),
      metric("actual_contribution", "performance", "Contribution", economics.contribution_display, economics.actual_contribution, "SCROLL_FINANCIAL_TRUTH"),
      metric("top_revenue_venture", "performance", "Top Venture", economics.top_revenue_venture.display, economics.top_revenue_venture.current_month_gross_revenue, "SCROLL_FINANCIAL_TRUTH"),
    ],
  };
}

export function projectHqFinancialPulseFromView(
  view: HqFinancialTruthView | null | undefined,
): HqFinancialPulse | null {
  return projectHqFinancialPulse(view?.treasury_control, view?.portfolio_economics);
}

export function pulseMetric(
  pulse: HqFinancialPulse | null | undefined,
  id: HqFinancialPulseMetricId,
): HqFinancialPulseMetric | undefined {
  return pulse?.metrics.find((row) => row.id === id);
}

export function pulseGroupMetrics(
  pulse: HqFinancialPulse | null | undefined,
  group: HqFinancialPulseGroup,
): HqFinancialPulseMetric[] {
  return pulse?.metrics.filter((row) => row.group === group) ?? [];
}
