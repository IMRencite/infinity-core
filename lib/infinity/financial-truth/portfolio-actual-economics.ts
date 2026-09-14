import { displayMoney } from "./amounts";
import { canonicalTreasuryVentures } from "./canonical-treasury-ventures";
import {
  PORTFOLIO_ACTUAL_ECONOMICS_PROJECTION,
  type PortfolioActualEconomicsProjection,
  type PortfolioUnknownCostState,
  type PortfolioVentureEconomicsRow,
} from "./types";
import { computeVentureLedger } from "@/lib/infinity/venture-financial-governance/ledger";
import { inspectFinancialGovernance } from "@/lib/infinity/venture-financial-governance/store";

function unknownIfMissing(value: { actuality: string; value: number | null }): number | null {
  if (value.actuality === "UNKNOWN" || value.value == null) return null;
  return value.value;
}

function costState(unknown: string[], known: number | null): PortfolioUnknownCostState {
  if (unknown.length === 0) return "KNOWN";
  if (known != null) return "PARTIAL";
  return "UNKNOWN";
}

function contributionDisplay(
  state: PortfolioUnknownCostState,
  value: number | null,
): PortfolioActualEconomicsProjection["contribution_display"] {
  if (state === "UNKNOWN") return "UNKNOWN";
  if (state === "PARTIAL") return "PARTIAL";
  return displayMoney(value);
}

function slugName(displayName: string, ventureId: string): string {
  return displayName.toLowerCase().replace(/[^a-z0-9]+/g, "") || ventureId.slice(-8);
}

export function isRecognizedVentureRevenue(row: {
  synthetic?: boolean;
  unpaid?: boolean;
  venture_id?: string | null;
}): boolean {
  return Boolean(row.venture_id) && row.synthetic !== true && row.unpaid !== true;
}

export function projectPortfolioActualEconomics(
  now = new Date().toISOString(),
): PortfolioActualEconomicsProjection {
  const state = inspectFinancialGovernance();
  const period = now.slice(0, 7);
  const catalog = canonicalTreasuryVentures();
  const extraIds = [...new Set(state.revenues.filter(isRecognizedVentureRevenue).map((row) => row.venture_id))];
  const ids = [...new Set([...catalog.map((row) => row.venture_id), ...extraIds])];
  const nameFor = (ventureId: string) =>
    catalog.find((row) => row.venture_id === ventureId)?.display_name ?? ventureId;

  const ventures: PortfolioVentureEconomicsRow[] = ids.map((ventureId) => {
    const ledger = computeVentureLedger(state, ventureId, now);
    const recognized = state.revenues.filter((row) => row.venture_id === ventureId && isRecognizedVentureRevenue(row));
    const monthRows = recognized.filter((row) => row.paid_at.startsWith(period));
    const unknown: string[] = [];
    if (ledger.infrastructure_cost.actuality === "UNKNOWN") unknown.push("INFRASTRUCTURE");
    if (ledger.provider_api_cost.actuality === "UNKNOWN") unknown.push("PROVIDER_API");
    if (ledger.growth_cost.actuality === "UNKNOWN") unknown.push("GROWTH");
    if (ledger.fulfillment_cost.actuality === "UNKNOWN") unknown.push("FULFILLMENT");
    if (ledger.domain_cost.actuality === "UNKNOWN") unknown.push("DOMAIN");
    if (ledger.software_tooling_cost.actuality === "UNKNOWN") unknown.push("SOFTWARE");
    if (ledger.allocated_shared_overhead.actuality === "UNKNOWN") unknown.push("SHARED_OVERHEAD");
    const knownParts = [
      unknownIfMissing(ledger.fulfillment_cost),
      unknownIfMissing(ledger.infrastructure_cost),
      unknownIfMissing(ledger.provider_api_cost),
      unknownIfMissing(ledger.growth_cost),
      unknownIfMissing(ledger.software_tooling_cost),
      unknownIfMissing(ledger.domain_cost),
      unknownIfMissing(ledger.contractor_or_external_service_cost),
      unknownIfMissing(ledger.allocated_shared_overhead),
      unknownIfMissing(ledger.other_direct_cost),
    ];
    const knownPresent = knownParts.filter((row): row is number => row != null);
    const known_actual_cost = knownPresent.length === 0
      ? (unknown.length > 0 ? null : 0)
      : knownPresent.reduce((sum, value) => sum + value, 0);
    const unknown_cost_state = costState(unknown, known_actual_cost);
    return {
      venture_id: ventureId,
      display_name: nameFor(ventureId),
      current_month_gross_revenue: monthRows.reduce((sum, row) => sum + row.gross_amount, 0),
      lifetime_gross_revenue: recognized.reduce((sum, row) => sum + row.gross_amount, 0),
      refunds: ledger.refunds.value ?? 0,
      processor_fees: unknownIfMissing(ledger.payment_processing_fees),
      known_actual_cost,
      unknown_cost_state,
      actual_contribution: unknown_cost_state === "KNOWN" ? unknownIfMissing(ledger.contribution_profit) : null,
    };
  });

  const current_month_gross_revenue = ventures.reduce((sum, row) => sum + row.current_month_gross_revenue, 0);
  const lifetime_gross_revenue = ventures.reduce((sum, row) => sum + row.lifetime_gross_revenue, 0);
  const monthRefunds = state.refunds
    .filter((row) => ids.includes(row.venture_id) && row.refunded_at?.startsWith(period))
    .reduce((sum, row) => sum + row.amount, 0);
  const monthFeeValues = state.revenues
    .filter((row) => isRecognizedVentureRevenue(row) && row.paid_at.startsWith(period))
    .map((row) => (row.fee_status === "ACTUAL" && row.fee_amount != null ? row.fee_amount : null));
  const current_month_processor_fees = monthFeeValues.every((row) => row != null)
    ? monthFeeValues.reduce((sum, value) => sum + (value ?? 0), 0)
    : null;
  const knownParts = ventures.map((row) => row.known_actual_cost);
  const knownPresent = knownParts.filter((row): row is number => row != null);
  const known_actual_cost = knownPresent.length === 0
    ? (ventures.some((row) => row.unknown_cost_state !== "KNOWN") ? null : 0)
    : knownPresent.reduce((sum, value) => sum + value, 0);
  const unknown_cost_state: PortfolioUnknownCostState = ventures.every((row) => row.unknown_cost_state === "KNOWN")
    ? "KNOWN"
    : ventures.some((row) => row.unknown_cost_state === "KNOWN" || row.known_actual_cost != null)
      ? "PARTIAL"
      : "UNKNOWN";
  const actual_contribution = unknown_cost_state === "KNOWN"
    ? ventures.reduce((sum, row) => sum + (row.actual_contribution ?? 0), 0)
    : null;
  const ranked = [...ventures].sort((left, right) => right.current_month_gross_revenue - left.current_month_gross_revenue);
  const top = ranked[0];
  const hasRevenue = Boolean(top && top.current_month_gross_revenue > 0);

  return {
    contract: PORTFOLIO_ACTUAL_ECONOMICS_PROJECTION,
    current_month_gross_revenue,
    lifetime_gross_revenue,
    current_month_refunds: monthRefunds,
    current_month_processor_fees,
    known_actual_cost,
    unknown_cost_state,
    actual_contribution,
    contribution_display: contributionDisplay(unknown_cost_state, actual_contribution),
    top_revenue_venture: {
      venture_id: hasRevenue ? top.venture_id : null,
      display_name: hasRevenue ? top.display_name : null,
      current_month_gross_revenue: hasRevenue ? top.current_month_gross_revenue : 0,
      ranking_basis: "CURRENT_MONTH_REVENUE",
      display: hasRevenue ? top.display_name : "NONE YET",
    },
    operating_venture_count: catalog.filter((row) => row.allocatable || Boolean(row.production_state)).length,
    last_updated_at: now,
    ventures,
  };
}

export function portfolioVentureSlug(displayName: string, ventureId: string): string {
  return slugName(displayName, ventureId);
}
