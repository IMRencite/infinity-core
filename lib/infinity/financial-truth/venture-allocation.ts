import type { VentureCapitalAllocation } from "./types";
import { VENTURE_CAPITAL_ALLOCATION } from "./types";

export function emptyVentureCapitalAllocation(ventureId: string, currency = "USD"): VentureCapitalAllocation {
  return {
    contract: VENTURE_CAPITAL_ALLOCATION,
    venture_id: ventureId,
    source_treasury_account_id: null,
    destination_treasury_account_id: null,
    allocated_amount: null,
    currency,
    authorized_amount: "NOT_SET",
    committed_amount: null,
    spent_amount: null,
    remaining_authority: "NOT_SET",
    allocation_status: "NOT_SET",
    authorized_by: null,
    authorized_at: null,
    effective_at: null,
    policy_reference: null,
    evidence_reference: null,
  };
}

export function allocationIsNotBalance(allocation: VentureCapitalAllocation, treasuryBalance: number | null): boolean {
  if (allocation.allocated_amount == null || treasuryBalance == null) return true;
  return allocation.allocated_amount !== treasuryBalance;
}

export function allocationIsNotSpendingAuthority(allocation: VentureCapitalAllocation): boolean {
  return allocation.authorized_amount === "NOT_SET" || allocation.authorized_amount !== allocation.allocated_amount;
}

export function unallocatedVentureCapital(ventureId: string, currency = "USD"): VentureCapitalAllocation {
  return {
    ...emptyVentureCapitalAllocation(ventureId, currency),
    allocated_amount: 0,
    committed_amount: 0,
    spent_amount: 0,
    allocation_status: "NOT_ALLOCATED",
  };
}

export function tryAllocateVentureCapital(input: {
  requested_amount: number;
  portfolio_authorized: number;
  current_allocations: number;
  current_commitments: number;
}): { ok: true; remaining: number } | { ok: false; reason: "EXCEEDS_REMAINING_AUTHORIZATION" } {
  const remaining = input.portfolio_authorized - input.current_allocations - input.current_commitments;
  if (input.requested_amount > remaining) {
    return { ok: false, reason: "EXCEEDS_REMAINING_AUTHORIZATION" };
  }
  return { ok: true, remaining: remaining - input.requested_amount };
}

export function applyVentureRevenue(input: {
  previousGross: number;
  revenue: number;
  previousAuthorized: "NOT_SET" | number;
}): { gross_revenue: number; authorized_capital: "NOT_SET" | number } {
  return {
    gross_revenue: input.previousGross + input.revenue,
    authorized_capital: input.previousAuthorized,
  };
}
