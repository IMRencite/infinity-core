import type { NamedFinancialGate } from "./types";
import {
  ECONOMIC_ACTION_GATE,
  isGovernedSpendCategory,
  isPaidAcquisitionCategory,
  type SpendAuthorityMath,
  type VentureBudgetCeilingAudit,
  type VentureFinancialCommitment,
  type VentureSpendAuthority,
} from "./spend-authority";

export const VENTURE_SPEND_AUTHORITY_GATE = "VentureSpendAuthorityGate" as const;
export const SPEND_AUTHORITY_WITHIN_ALLOCATION_GATE = "SpendAuthorityWithinAllocationGate" as const;
export const COMMITMENT_WITHIN_SPEND_AUTHORITY_GATE = "CommitmentWithinSpendAuthorityGate" as const;
export const PAID_ACQUISITION_AUTHORITY_GATE = "PaidAcquisitionAuthorityGate" as const;
export const SPEND_AUTHORITY_REDUCTION_SAFETY_GATE = "SpendAuthorityReductionSafetyGate" as const;
export const SPEND_AUTHORITY_IDEMPOTENCY_GATE = "SpendAuthorityIdempotencyGate" as const;
export const SPEND_AUTHORITY_AUDIT_LINEAGE_GATE = "SpendAuthorityAuditLineageGate" as const;
export const ALLOCATION_BUDGET_COMMITMENT_SEPARATION_GATE = "AllocationBudgetCommitmentSeparationGate" as const;
export const TREASURY_SPEND_AUTHORITY_CONSISTENCY_GATE = "TreasurySpendAuthorityConsistencyGate" as const;

function pass(gate: string, reason: string): NamedFinancialGate {
  return { gate, result: "PASS", reasons: [reason] };
}

function fail(gate: string, reasons: string[]): NamedFinancialGate {
  return { gate, result: "FAIL", reasons };
}

export function evaluateVentureSpendAuthorityGate(authority: VentureSpendAuthority): NamedFinancialGate {
  const reasons: string[] = [];
  if (authority.contract !== "VentureSpendAuthority") reasons.push("MISSING_CONTRACT");
  if (authority.paid_acquisition_authority !== 0) reasons.push("PAID_ACQUISITION_IMPLIED");
  if (authority.money_moved) reasons.push("MONEY_MOVED");
  if (authority.allocation_amount > 0 && authority.effective_spend_authority === authority.allocation_amount && authority.authorized_spend_ceiling === "NOT_SET") {
    reasons.push("ALLOCATION_USED_AS_AUTHORITY");
  }
  if (authority.status === "NOT_SET" && authority.effective_spend_authority !== 0) {
    reasons.push("NOT_SET_HAS_EFFECTIVE_AUTHORITY");
  }
  return reasons.length ? fail(VENTURE_SPEND_AUTHORITY_GATE, reasons) : pass(VENTURE_SPEND_AUTHORITY_GATE, "AUTHORITY_SEPARATE_FROM_ALLOCATION");
}

export function evaluateSpendAuthorityWithinAllocationGate(input: {
  allocationAmount: number;
  requestedCeiling: number;
}): NamedFinancialGate {
  if (input.requestedCeiling < 0 || !Number.isFinite(input.requestedCeiling)) {
    return fail(SPEND_AUTHORITY_WITHIN_ALLOCATION_GATE, ["INVALID_AMOUNT"]);
  }
  if (input.requestedCeiling > input.allocationAmount) {
    return fail(SPEND_AUTHORITY_WITHIN_ALLOCATION_GATE, ["AUTHORITY_EXCEEDS_ALLOCATION"]);
  }
  return pass(SPEND_AUTHORITY_WITHIN_ALLOCATION_GATE, "AUTHORITY_WITHIN_ALLOCATION");
}

export function evaluateCommitmentWithinSpendAuthorityGate(input: {
  remainingAuthority: number;
  requestedAmount: number;
  category: unknown;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (isPaidAcquisitionCategory(input.category)) reasons.push("PAID_ACQUISITION_REQUIRES_SEPARATE_AUTHORITY");
  if (!isGovernedSpendCategory(input.category) && !isPaidAcquisitionCategory(input.category)) {
    reasons.push("CATEGORY_NOT_PERMITTED");
  }
  if (input.requestedAmount <= 0 || !Number.isFinite(input.requestedAmount)) reasons.push("INVALID_AMOUNT");
  if (input.requestedAmount > input.remainingAuthority) reasons.push("EXCEEDS_REMAINING_AUTHORITY");
  return reasons.length
    ? fail(COMMITMENT_WITHIN_SPEND_AUTHORITY_GATE, reasons)
    : pass(COMMITMENT_WITHIN_SPEND_AUTHORITY_GATE, "COMMITMENT_WITHIN_REMAINING_AUTHORITY");
}

export function evaluatePaidAcquisitionAuthorityGate(input: {
  generalAuthority: number;
  paidAcquisitionAuthority: number;
  requestedCategory?: unknown;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (input.paidAcquisitionAuthority !== 0) reasons.push("PAID_ACQUISITION_NOT_ZERO");
  if (isPaidAcquisitionCategory(input.requestedCategory) && input.paidAcquisitionAuthority <= 0) {
    reasons.push("GENERAL_AUTHORITY_CANNOT_FUND_ADS");
  }
  if (input.generalAuthority > 0 && isPaidAcquisitionCategory(input.requestedCategory)) {
    reasons.push("GENERAL_AUTHORITY_CANNOT_FUND_ADS");
  }
  return reasons.length
    ? fail(PAID_ACQUISITION_AUTHORITY_GATE, [...new Set(reasons)])
    : pass(PAID_ACQUISITION_AUTHORITY_GATE, "PAID_ACQUISITION_REMAINS_ZERO");
}

export function evaluateSpendAuthorityReductionSafetyGate(input: {
  nextCeiling: number;
  committedAmount: number;
  unreconciledActualSpend: number;
}): NamedFinancialGate {
  const floor = input.committedAmount + input.unreconciledActualSpend;
  if (input.nextCeiling < floor) {
    return fail(SPEND_AUTHORITY_REDUCTION_SAFETY_GATE, ["REDUCTION_BELOW_COMMITMENT"]);
  }
  return pass(SPEND_AUTHORITY_REDUCTION_SAFETY_GATE, "REDUCTION_SAFE");
}

export function evaluateSpendAuthorityIdempotencyGate(input: {
  first: { ok: boolean; ceiling: number | string };
  retry: { ok: boolean; ceiling: number | string };
}): NamedFinancialGate {
  const same = input.first.ok && input.retry.ok && input.first.ceiling === input.retry.ceiling;
  return same
    ? pass(SPEND_AUTHORITY_IDEMPOTENCY_GATE, "RETRY_DID_NOT_DUPLICATE")
    : fail(SPEND_AUTHORITY_IDEMPOTENCY_GATE, ["RETRY_CHANGED_AUTHORITY"]);
}

export function evaluateSpendAuthorityAuditLineageGate(input: {
  actor: string | null;
  audited: boolean;
  lineage: string[];
}): NamedFinancialGate {
  if (!input.actor || !input.audited || input.lineage.length === 0) {
    return fail(SPEND_AUTHORITY_AUDIT_LINEAGE_GATE, ["MISSING_AUDIT_LINEAGE"]);
  }
  return pass(SPEND_AUTHORITY_AUDIT_LINEAGE_GATE, "AUDIT_LINEAGE_RECORDED");
}

export function evaluateAllocationBudgetCommitmentSeparationGate(input: {
  allocation: number;
  spendAuthority: number | "NOT_SET";
  committed: number;
  actualSpend: number;
  paidAcquisition: number;
}): NamedFinancialGate {
  const reasons: string[] = [];
  const authority = input.spendAuthority === "NOT_SET" ? 0 : input.spendAuthority;
  if (input.allocation > 0 && authority === input.allocation && input.committed === input.allocation && input.actualSpend === input.allocation) {
    reasons.push("LAYERS_COLLAPSED");
  }
  if (input.paidAcquisition !== 0) reasons.push("PAID_ACQUISITION_NOT_SEPARATE");
  if (input.committed !== 0 && input.committed === input.actualSpend && input.actualSpend === authority && authority > 0) {
    reasons.push("COMMITMENT_COLLAPSED_INTO_SPEND");
  }
  return reasons.length
    ? fail(ALLOCATION_BUDGET_COMMITMENT_SEPARATION_GATE, reasons)
    : pass(ALLOCATION_BUDGET_COMMITMENT_SEPARATION_GATE, "ALLOCATION_AUTHORITY_COMMITMENT_SPEND_SEPARATE");
}

export function evaluateTreasurySpendAuthorityConsistencyGate(input: {
  hqAllocation: number;
  treasuryAllocation: number;
  hqAuthority: number;
  treasuryAuthority: number;
  mercuryWriteAccess: boolean;
  moneyMovementEnabled: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (input.hqAllocation !== input.treasuryAllocation) reasons.push("ALLOCATION_MISMATCH");
  if (input.hqAuthority !== input.treasuryAuthority) reasons.push("AUTHORITY_MISMATCH");
  if (input.mercuryWriteAccess || input.moneyMovementEnabled) reasons.push("MONEY_MOVEMENT_ENABLED");
  return reasons.length
    ? fail(TREASURY_SPEND_AUTHORITY_CONSISTENCY_GATE, reasons)
    : pass(TREASURY_SPEND_AUTHORITY_CONSISTENCY_GATE, "HQ_TREASURY_SPEND_AUTHORITY_AGREE");
}

export function evaluateEconomicActionGate(input: {
  execute: boolean;
  spendAuthorityValid: boolean;
  commitmentValid: boolean;
  mercuryWriteAccess: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (input.execute) reasons.push("EXECUTION_NOT_ENABLED");
  if (input.mercuryWriteAccess) reasons.push("MERCURY_WRITE_NOT_ENABLED");
  if (!input.spendAuthorityValid) reasons.push("SPEND_AUTHORITY_REQUIRED");
  if (!input.commitmentValid) reasons.push("COMMITMENT_REQUIRED");
  return reasons.length
    ? fail(ECONOMIC_ACTION_GATE, reasons)
    : pass(ECONOMIC_ACTION_GATE, "PREPARED_NOT_EXECUTED");
}

export function evaluateAllocationReductionAgainstAuthorityGate(input: {
  nextAllocation: number;
  spendCeiling: number | "NOT_SET";
  openCommitments: number;
}): NamedFinancialGate {
  const ceiling = typeof input.spendCeiling === "number" ? input.spendCeiling : 0;
  if (input.nextAllocation < input.openCommitments) {
    return fail("AllocationSpendAuthorityInteractionGate", ["ALLOCATION_BELOW_COMMITMENTS"]);
  }
  if (typeof input.spendCeiling === "number" && input.nextAllocation < ceiling) {
    return fail("AllocationSpendAuthorityInteractionGate", ["ALLOCATION_BELOW_SPEND_AUTHORITY"]);
  }
  return pass("AllocationSpendAuthorityInteractionGate", "ALLOCATION_COMPATIBLE");
}

export function budgetAuditAllowsAuthority(audit: VentureBudgetCeilingAudit): boolean {
  return audit.should_control_spend_authority;
}

export function commitmentDoesNotChangeActualSpend(
  before: { actual: number; committed: number },
  after: { actual: number; committed: number },
): boolean {
  return after.actual === before.actual && after.committed !== before.committed;
}

export function mathPreservesSeparation(math: SpendAuthorityMath): boolean {
  return (
    math.allocation_amount !== math.effective_spend_authority ||
    math.allocation_amount === 0 ||
    math.authorized_spend_ceiling === "NOT_SET"
  );
}

export function commitmentIsNotExecution(commitment: VentureFinancialCommitment): boolean {
  return commitment.money_moved === false && commitment.external_reference == null;
}
