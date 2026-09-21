import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { formatMoney } from "./ledger";
import { computeVentureLedger } from "./ledger";
import { inspectFinancialGovernance } from "./store";
import { ventureBudgetSnapshot } from "./budget";
import { evaluateVentureCreationPrecheck, portfolioSpentCommittedReserved } from "./gates";
import {
  computeEpistemicMonthlyBurn,
  formatEstimatedBurn,
  formatEpistemicTotal,
  formatKnownBurn,
} from "./epistemic-burn";
import { freshnessLabels } from "./freshness";
import { evaluateVentureEconomicsActualVsModeledContract } from "./actual-vs-modeled";
import type { MoneyTruth, NewVentureCreationState, VentureFinancialLedger } from "./types";

export type ProfitLabMoneyLine = { label: string; value: string; layer: "MODELED" | "ACTUAL" | "FORECAST" | "BUDGET" };

export type ProfitLabVentureFinancialView = {
  venture_id: string;
  modeled: ProfitLabMoneyLine[];
  actual: ProfitLabMoneyLine[];
  forecast: ProfitLabMoneyLine[];
  budget: ProfitLabMoneyLine[];
  transaction_count: number;
  freshness: ReturnType<typeof freshnessLabels>;
  layers_separated: true;
};

export type PortfolioCapitalView = {
  authorized_capital: string;
  allocated: string;
  spent: string;
  committed: string;
  reserved: string;
  remaining: string;
  known_monthly_burn: string;
  estimated_monthly_burn: string;
  monthly_burn: string;
  monthly_burn_state: "KNOWN" | "PARTIAL" | "UNKNOWN";
  monthly_burn_completeness: string;
  missing_cost_categories: string;
  monthly_burn_cap: string;
  revenue: string;
  operating_contribution: string;
  active_ventures: number;
  pre_revenue_ventures: number;
  profitable_ventures: number;
  unvalidated_capital_at_risk: string;
  active_build_count: number;
  new_venture_creation_state: NewVentureCreationState;
  discovery_may_continue: true;
  new_spend_build_may_begin: boolean;
};

function display(amount: MoneyTruth, notSet = false): string {
  return formatMoney(amount, notSet);
}

function usd(value: number | null, notSet = false): string {
  if (notSet || value == null) return "NOT_SET";
  return `$${value.toFixed(value % 1 === 0 ? 0 : 2)}`;
}

export function projectVentureFinancialView(
  ventureId: string,
  modeled: {
    revenue_assumptions: string;
    cac: string;
    ltv: string;
    contribution: string;
    payback: string;
    break_even: string;
    confidence: string;
  },
): ProfitLabVentureFinancialView {
  const state = inspectFinancialGovernance();
  const ledger = computeVentureLedger(state, ventureId);
  const budget = ventureBudgetSnapshot(ventureId);
  const burn = computeEpistemicMonthlyBurn();
  const notSet = budget.authorized == null;
  return {
    venture_id: ventureId,
    modeled: [
      { layer: "MODELED", label: "Revenue assumptions", value: modeled.revenue_assumptions },
      { layer: "MODELED", label: "CAC", value: modeled.cac },
      { layer: "MODELED", label: "LTV", value: modeled.ltv },
      { layer: "MODELED", label: "Contribution", value: modeled.contribution },
      { layer: "MODELED", label: "Payback", value: modeled.payback },
      { layer: "MODELED", label: "Break-even", value: modeled.break_even },
      { layer: "MODELED", label: "Confidence", value: modeled.confidence },
    ],
    actual: [
      { layer: "ACTUAL", label: "Revenue", value: display(ledger.gross_revenue) },
      { layer: "ACTUAL", label: "Transaction count", value: String(ledger.transaction_count) },
      { layer: "ACTUAL", label: "Refunds", value: display(ledger.refunds) },
      { layer: "ACTUAL", label: "Net Revenue", value: display(ledger.net_revenue) },
      { layer: "ACTUAL", label: "Payment Fees", value: display(ledger.payment_processing_fees) },
      { layer: "ACTUAL", label: "Direct Costs", value: display(ledger.other_direct_cost) },
      { layer: "ACTUAL", label: "Infrastructure", value: display(ledger.infrastructure_cost) },
      { layer: "ACTUAL", label: "Provider/API", value: display(ledger.provider_api_cost) },
      { layer: "ACTUAL", label: "Growth", value: display(ledger.growth_cost) },
      { layer: "ACTUAL", label: "Fulfillment", value: display(ledger.fulfillment_cost) },
      { layer: "ACTUAL", label: "Gross Profit", value: display(ledger.gross_profit) },
      { layer: "ACTUAL", label: "Contribution Profit", value: display(ledger.contribution_profit) },
      { layer: "ACTUAL", label: "Known monthly burn", value: formatKnownBurn(burn.known_amount) },
      { layer: "ACTUAL", label: "Estimated monthly burn", value: formatEstimatedBurn(burn.estimated_amount) },
      { layer: "ACTUAL", label: "Actual total monthly burn", value: formatEpistemicTotal(burn) },
      { layer: "ACTUAL", label: "Burn completeness", value: burn.completeness },
      { layer: "ACTUAL", label: "Missing cost categories", value: burn.unknown_components.join(", ") || "NONE" },
      { layer: "ACTUAL", label: "Actual CAC", value: display(ledger.actual_cac) },
      { layer: "ACTUAL", label: "Actual LTV", value: display(ledger.actual_ltv) },
      { layer: "ACTUAL", label: "Actual Payback", value: display(ledger.actual_payback) },
      { layer: "ACTUAL", label: "Break-even", value: display(ledger.actual_break_even) },
      { layer: "ACTUAL", label: "Confidence / missing data", value: ledger.data_confidence },
    ],
    forecast: [
      { layer: "FORECAST", label: "Forecast CAC", value: "UNKNOWN" },
      { layer: "FORECAST", label: "Forecast LTV", value: "UNKNOWN" },
      { layer: "FORECAST", label: "Forecast contribution", value: "UNKNOWN" },
    ],
    budget: [
      { layer: "BUDGET", label: "Budget", value: notSet ? "NOT_SET" : usd(budget.authorized) },
      { layer: "BUDGET", label: "Spent", value: usd(budget.spent) },
      { layer: "BUDGET", label: "Committed", value: usd(budget.committed) },
      { layer: "BUDGET", label: "Reserved", value: usd(budget.reserved) },
      { layer: "BUDGET", label: "Remaining", value: notSet ? "NOT_SET" : usd(budget.remaining) },
      { layer: "BUDGET", label: "Available", value: notSet ? "NOT_SET" : usd(budget.available) },
      { layer: "BUDGET", label: "Category envelopes", value: budget.envelopes ? JSON.stringify(budget.envelopes) : "NOT_SET" },
    ],
    transaction_count: ledger.transaction_count,
    freshness: freshnessLabels(),
    layers_separated: true,
  };
}

export function projectPortfolioCapitalView(input?: {
  venture_ids?: string[];
  active_ventures?: number;
  pre_revenue_ventures?: number;
  profitable_ventures?: number;
  active_build_count?: number;
  unvalidated_at_risk?: number;
}): PortfolioCapitalView {
  const state = inspectFinancialGovernance();
  const usage = portfolioSpentCommittedReserved();
  const policy = state.portfolio;
  const notSet = policy.status === "NOT_SET" || policy.total_authorized == null;
  const remaining = notSet ? null : policy.total_authorized! - usage.spent - usage.committed - usage.reserved;
  const ledgers = (input?.venture_ids ?? uniqueVentureIds(state)).map((id) => computeVentureLedger(state, id));
  const portfolioRevenue = ledgers.reduce((sum, row) => sum + (row.gross_revenue.value ?? 0), 0);
  const contributionUnknown = ledgers.some((row) => row.operating_contribution.actuality === "UNKNOWN");
  const contribution = ledgers.reduce((sum, row) => sum + (row.operating_contribution.value ?? 0), 0);
  const burn = computeEpistemicMonthlyBurn();
  const creation = evaluateVentureCreationPrecheck({
    active_build_count: input?.active_build_count ?? 0,
    unvalidated_at_risk: input?.unvalidated_at_risk ?? usage.spent,
    preliminary_economics: false,
    expected_validation_cost: null,
    expected_build_cost: null,
    authorized_budget: null,
  });
  return {
    authorized_capital: notSet ? "NOT_SET" : usd(policy.total_authorized),
    allocated: usd(usage.allocated),
    spent: usd(usage.spent),
    committed: usd(usage.committed),
    reserved: usd(usage.reserved),
    remaining: notSet ? "NOT_SET" : usd(remaining),
    known_monthly_burn: formatKnownBurn(burn.known_amount),
    estimated_monthly_burn: formatEstimatedBurn(burn.estimated_amount),
    monthly_burn: formatEpistemicTotal(burn),
    monthly_burn_state: burn.total_state,
    monthly_burn_completeness: burn.completeness,
    missing_cost_categories: burn.unknown_components.join(", ") || "NONE",
    monthly_burn_cap: policy.monthly_burn_cap == null ? "NOT_SET" : usd(policy.monthly_burn_cap),
    revenue: usd(portfolioRevenue),
    operating_contribution: contributionUnknown ? "UNKNOWN" : usd(contribution),
    active_ventures: input?.active_ventures ?? 1,
    pre_revenue_ventures: input?.pre_revenue_ventures ?? (portfolioRevenue === 0 ? 1 : 0),
    profitable_ventures: input?.profitable_ventures ?? 0,
    unvalidated_capital_at_risk: usd(input?.unvalidated_at_risk ?? 0),
    active_build_count: input?.active_build_count ?? 0,
    new_venture_creation_state: creation.state,
    discovery_may_continue: true,
    new_spend_build_may_begin: creation.new_spend_build_may_begin,
  };
}

function uniqueVentureIds(state: ReturnType<typeof inspectFinancialGovernance>): string[] {
  const ids = new Set<string>([CRE_VENTURE_ID, ...state.budgets.map((row) => row.venture_id), ...state.revenues.map((row) => row.venture_id)]);
  return [...ids];
}

export function occupancyNpvModeledAssumptions() {
  return {
    revenue_assumptions: "Professional $290/year · Per-Deal $149 one-time",
    cac: "UNKNOWN",
    ltv: "UNKNOWN",
    contribution: "UNKNOWN",
    payback: "UNKNOWN",
    break_even: "UNKNOWN",
    confidence: "MEDIUM",
  };
}

export function projectOccupancyNpvFinancialView(): ProfitLabVentureFinancialView {
  return projectVentureFinancialView(CRE_VENTURE_ID, occupancyNpvModeledAssumptions());
}

export function evaluateModeledVsActualSeparation(view: ProfitLabVentureFinancialView) {
  const modeledCac = view.modeled.find((row) => row.label === "CAC")?.value;
  const actualCac = view.actual.find((row) => row.label === "Actual CAC")?.value;
  return evaluateVentureEconomicsActualVsModeledContract({
    blended: modeledCac === actualCac && modeledCac !== "UNKNOWN" && Boolean(modeledCac),
    modeled_overwritten_by_actual: false,
    actual_inferred_from_forecast: view.actual.some((row) => row.value !== "UNKNOWN" && view.forecast.some((forecast) => forecast.label.includes(row.label) && forecast.value === row.value && row.value !== "UNKNOWN")),
  });
}

export function financialControlArtifacts(): Array<{ id: string; label: string; tone: "warning" | "pending" | "neutral" | "success" }> {
  const portfolio = projectPortfolioCapitalView();
  const occ = ventureBudgetSnapshot(CRE_VENTURE_ID);
  const incidents = inspectFinancialGovernance().incidents.filter((row) => row.open);
  const items: Array<{ id: string; label: string; tone: "warning" | "pending" | "neutral" | "success" }> = [
    {
      id: "fin-new-venture-state",
      label: `New venture creation ${portfolio.new_venture_creation_state}`,
      tone: portfolio.new_spend_build_may_begin ? "neutral" : "warning",
    },
    {
      id: "fin-portfolio-cap",
      label: `Portfolio capital cap ${portfolio.authorized_capital}`,
      tone: portfolio.authorized_capital === "NOT_SET" ? "pending" : "neutral",
    },
    {
      id: "fin-monthly-burn",
      label: `Known burn ${portfolio.known_monthly_burn} · total ${portfolio.monthly_burn} · cap ${portfolio.monthly_burn_cap}`,
      tone: portfolio.monthly_burn_state === "KNOWN" ? "neutral" : "pending",
    },
    {
      id: "fin-occ-budget",
      label: `OccupancyNPV budget ${occ.authorized == null ? "NOT_SET" : usd(occ.authorized)}`,
      tone: occ.authorized == null ? "pending" : "neutral",
    },
  ];
  for (const incident of incidents) {
    items.push({ id: incident.incident_id, label: `${incident.kind}: ${incident.detail}`, tone: "warning" });
  }
  return items;
}

export type { VentureFinancialLedger };
