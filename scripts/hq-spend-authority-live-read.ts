import { loadCapitalLedger } from "../lib/infinity/financial-truth/capital-ledger";
import { auditVentureBudgetCeiling, projectOccupancyNpvSpendAuthority } from "../lib/infinity/financial-truth/spend-authority";
import { OCCUPANCYNPV_VENTURE_ID } from "../lib/infinity/financial-truth/allocation-reconciliation";
import { projectPortfolioActualEconomics } from "../lib/infinity/financial-truth/portfolio-actual-economics";
import { CANONICAL_FOUNDER_CAPITAL_POLICY } from "../lib/infinity/financial-truth/founder-capital-policy";
import { allocatedCapitalTotal } from "../lib/infinity/financial-truth/capital-ledger";

const ledger = loadCapitalLedger();
const audit = auditVentureBudgetCeiling(ledger, OCCUPANCYNPV_VENTURE_ID);
const authority = projectOccupancyNpvSpendAuthority(ledger, 0);
const economics = projectPortfolioActualEconomics();
const occupancy = economics.ventures.find((row) => row.venture_id === OCCUPANCYNPV_VENTURE_ID);
const allocated = allocatedCapitalTotal(ledger);

process.stdout.write(
  JSON.stringify(
    {
      cash_policy_authorized: CANONICAL_FOUNDER_CAPITAL_POLICY.authorized_capital,
      allocated,
      unallocated: CANONICAL_FOUNDER_CAPITAL_POLICY.authorized_capital - allocated,
      audit,
      authority: {
        allocation_amount: authority.allocation_amount,
        authorized_spend_ceiling: authority.authorized_spend_ceiling,
        effective_spend_authority: authority.effective_spend_authority,
        remaining_spend_authority: authority.remaining_spend_authority,
        unused_allocation: authority.unused_allocation,
        committed_amount: authority.committed_amount,
        actual_spend_amount: authority.actual_spend_amount,
        paid_acquisition_authority: authority.paid_acquisition_authority,
        status: authority.status,
        authorization_source: authority.authorization_source,
        money_moved: authority.money_moved,
      },
      commitments: ledger.venture_financial_commitments.length,
      mercury_write: CANONICAL_FOUNDER_CAPITAL_POLICY.mercury_write_access,
      money_movement: CANONICAL_FOUNDER_CAPITAL_POLICY.money_movement_enabled,
      economics: {
        occupancy_revenue: occupancy?.lifetime_gross_revenue ?? null,
        occupancy_known_cost: occupancy?.known_actual_cost ?? null,
        occupancy_contribution: occupancy?.actual_contribution ?? null,
        occupancy_unknown: occupancy?.unknown_cost_state ?? null,
        portfolio_revenue: economics.lifetime_gross_revenue,
        portfolio_contribution: economics.contribution_display,
        completeness: economics.unknown_cost_state,
      },
    },
    null,
    2,
  ),
);
