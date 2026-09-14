import { computeVentureLedger } from "@/lib/infinity/venture-financial-governance/ledger";
import { occupancyNpvModeledAssumptions } from "@/lib/infinity/venture-financial-governance/projection";
import { inspectFinancialGovernance } from "@/lib/infinity/venture-financial-governance/store";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import type { ActualEconomics, ModeledEconomics } from "./types";

const MATERIAL_COST_LABELS = [
  "INFRASTRUCTURE",
  "PROVIDER_API",
  "GROWTH",
  "FULFILLMENT",
  "DOMAIN",
  "SOFTWARE",
  "SHARED_OVERHEAD",
] as const;

function unknownIfMissing(value: { actuality: string; value: number | null }): number | null {
  if (value.actuality === "UNKNOWN" || value.value == null) return null;
  return value.value;
}

export function projectActualEconomics(now = new Date().toISOString()): ActualEconomics {
  const state = inspectFinancialGovernance();
  const ledger = computeVentureLedger(state, CRE_VENTURE_ID, now);
  const period = now.slice(0, 7);
  const monthGross = state.revenues
    .filter((row) => row.venture_id === CRE_VENTURE_ID && row.paid_at.startsWith(period) && !row.synthetic)
    .reduce((sum, row) => sum + row.gross_amount, 0);
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
  const known_costs = knownPresent.length === 0 ? (unknown.length > 0 ? null : 0) : knownPresent.reduce((sum, value) => sum + value, 0);

  return {
    layer: "ACTUAL",
    gross_revenue: ledger.gross_revenue.value,
    refunds: ledger.refunds.value,
    processor_fees: unknownIfMissing(ledger.payment_processing_fees),
    net_revenue: ledger.net_revenue.value,
    known_costs,
    unknown_cost_categories: unknown,
    contribution: unknown.length > 0 ? null : unknownIfMissing(ledger.contribution_profit),
    current_month_gross_revenue: monthGross,
  };
}

export function projectModeledEconomics(override?: {
  modeled_revenue?: number | null;
  modeled_costs?: number | null;
  modeled_contribution?: number | null;
}): ModeledEconomics {
  void occupancyNpvModeledAssumptions();
  return {
    layer: "MODELED",
    modeled_revenue: override?.modeled_revenue ?? null,
    modeled_costs: override?.modeled_costs ?? null,
    modeled_contribution: override?.modeled_contribution ?? null,
    separated_from_actual: true,
  };
}

export function modeledDoesNotChangeCash(
  modeledRevenue: number,
  cashBefore: number | null,
  cashAfter: number | null,
): boolean {
  void modeledRevenue;
  return cashBefore === cashAfter;
}

export function materialUnknownCostLabels(): readonly string[] {
  return MATERIAL_COST_LABELS;
}
