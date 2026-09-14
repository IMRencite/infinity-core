import { displayMoney, displayNotSet } from "./amounts";
import { projectTreasuryCashTruth, sourcedTreasuryCash } from "./treasury-cash-truth";
import { allocatedCapitalTotal, loadCapitalLedger, type CapitalLedger } from "./capital-ledger";
import { canonicalTreasuryVentures } from "./canonical-treasury-ventures";
import { ensureFirstGovernedAllocationDecision } from "./venture-capital-allocation-decision";
import { CANONICAL_TREASURY_PROJECTION } from "./types";
import type {
  CanonicalAllocationRecord,
  CanonicalTreasuryProjection,
  CanonicalTreasuryTransaction,
  HqFinancialTruthView,
  SourcedTreasuryAmount,
} from "./types";
import { unallocatedVentureCapital } from "./venture-allocation";

function sourced(
  value: number | "NOT_SET" | null,
  source: string,
  sync: string | null,
  display?: string,
): SourcedTreasuryAmount {
  return {
    value,
    display: display ?? (value === "NOT_SET" || value == null ? displayNotSet(value) : displayMoney(value)),
    source,
    sync,
  };
}

function transactionDirection(amount: number | null): CanonicalTreasuryTransaction["direction"] {
  if (amount == null) return "UNKNOWN";
  if (amount > 0) return "INFLOW";
  if (amount < 0) return "OUTFLOW";
  return "UNKNOWN";
}

function allocationRecords(ledger: CapitalLedger, spent: number): CanonicalAllocationRecord[] {
  const catalog = canonicalTreasuryVentures();
  return catalog.map((venture) => {
    const existing = ledger.allocations.find((row) => row.venture_id === venture.venture_id);
    if (existing) {
      return {
        ...existing,
        display_name: venture.display_name,
        lifecycle_state: venture.lifecycle_state,
        spent_amount: existing.spent_amount,
        remaining: existing.allocated_amount + existing.reserved_amount - existing.committed_amount - existing.spent_amount,
      };
    }
    return {
      venture_id: venture.venture_id,
      display_name: venture.display_name,
      lifecycle_state: venture.lifecycle_state,
      allocated_amount: 0,
      reserved_amount: 0,
      committed_amount: 0,
      spent_amount: venture.venture_id === catalog[0]?.venture_id ? spent : 0,
      remaining: 0,
      purpose: null,
      allocation_source: null,
      status: "NOT_ALLOCATED",
      review_condition: null,
      created_at: null,
      updated_at: null,
    };
  });
}

export function projectCanonicalTreasury(
  view: Omit<HqFinancialTruthView, "treasury_control" | "gates"> & {
    gates?: HqFinancialTruthView["gates"];
  },
  ledger: CapitalLedger = loadCapitalLedger(),
): CanonicalTreasuryProjection {
  const decision = ensureFirstGovernedAllocationDecision();
  const current = loadCapitalLedger();
  void ledger;
  const mercurySync = view.mercury.last_verified;
  const capitalSync = view.last_financial_sync;
  const allocated = allocatedCapitalTotal(current);
  void allocated;
  const cashTruth = projectTreasuryCashTruth({
    mercury: view.mercury,
    stripe: view.stripe,
    cash: view.cash,
  });
  return {
    contract: CANONICAL_TREASURY_PROJECTION,
    treasury_status: view.mercury.connection === "LIVE" ? "LIVE" : "DEGRADED",
    bank_provider: "Mercury",
    bank_connection: "READ_ONLY",
    last_financial_sync: view.last_financial_sync,
    cash_completeness: view.cash.cash_completeness,
    infrastructure_mode: view.infrastructure_mode,
    parent_entity: view.parent_entity,
    verified_treasury_cash: sourcedTreasuryCash(cashTruth),
    mercury_available: sourced(view.cash.mercury_available, "MERCURY", mercurySync),
    mercury_current: sourced(view.cash.mercury_current, "MERCURY", mercurySync),
    authorized_capital: sourced(view.capital.authorized_capital, "FOUNDER CAPITAL POLICY", capitalSync),
    allocated_capital: sourced(view.capital.allocated_capital, "CAPITAL ALLOCATION LEDGER", capitalSync),
    committed_capital: sourced(view.capital.committed_capital, "TREASURY COMMITMENTS", capitalSync),
    actual_spend: sourced(view.capital.spent_capital, "CANONICAL ECONOMIC LEDGER", capitalSync),
    remaining_authorization: sourced(view.capital.remaining_authorized_capital, "FOUNDER CAPITAL POLICY", capitalSync),
    unallocated_authorized_capital: sourced(
      view.capital.unallocated_authorized_capital,
      "CAPITAL ALLOCATION LEDGER",
      capitalSync,
    ),
    monthly_burn_cap: sourced(view.capital.monthly_burn_cap, "FOUNDER CAPITAL POLICY", capitalSync),
    stripe_available: sourced(view.cash.stripe_available, "STRIPE", view.stripe.last_verified),
    stripe_pending: sourced(view.cash.stripe_pending, "STRIPE", view.stripe.last_verified),
    paid_acquisition_budget: sourced(view.capital.paid_advertising_budget, "FOUNDER CAPITAL POLICY", capitalSync),
    money_movement_enabled: false,
    mercury_write_access: false,
    execute_approved_payment_enabled: false,
    legacy_monthly_policy_active: false,
    manual_ledger_is_bank_cash_source: false,
    portfolio_budget: current.portfolio_budget,
    venture_budgets: current.venture_budgets,
    ventures: canonicalTreasuryVentures(),
    allocations: allocationRecords(current, view.capital.spent_capital ?? 0),
    transactions: view.mercury.transactions.map((txn) => ({
      date: txn.occurred_at ?? "UNKNOWN",
      description: txn.description ?? txn.merchant ?? "UNKNOWN",
      amount: displayMoney(txn.amount),
      direction: transactionDirection(txn.amount),
      status: txn.status,
      classification: txn.classification,
      venture_attribution: "UNATTRIBUTED",
      reconciliation_state: txn.stripe_settlement ? "STRIPE_RELATED" : "UNATTRIBUTED",
      safe_transaction_id: txn.safe_transaction_id,
    })),
    commitments: current.commitments,
    accounting_events: current.accounting_events,
    latest_allocation_decision: decision,
  };
}

export function ledgerAllocationsForHq(ledger: CapitalLedger, currency: string): import("./types").VentureCapitalAllocation[] {
  const catalog = canonicalTreasuryVentures();
  return catalog.map((venture) => {
    const existing = ledger.allocations.find((row) => row.venture_id === venture.venture_id);
    if (!existing || existing.status === "NOT_ALLOCATED") {
      return unallocatedVentureCapital(venture.venture_id, currency);
    }
    return {
      ...unallocatedVentureCapital(venture.venture_id, currency),
      allocated_amount: existing.allocated_amount + existing.reserved_amount,
      committed_amount: existing.committed_amount,
      spent_amount: existing.spent_amount,
      allocation_status: existing.status === "RESERVED" ? ("RESERVED" as const) : ("ALLOCATED" as const),
      authorized_at: existing.created_at,
      evidence_reference: existing.purpose,
    };
  });
}
