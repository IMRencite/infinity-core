import type { NamedFinancialGate } from "./types";
import {
  AUTONOMOUS_COMMITMENT_CREATION_ENABLED,
  commitmentRemaining,
  isGovernedSpendCategory,
  isPaidAcquisitionCategory,
  openCommitmentTotal,
  type CommitmentObligationType,
  type VentureFinancialCommitment,
  type VentureSpendAuthority,
} from "./spend-authority";
import { evaluatePaidAcquisitionAuthorityGate } from "./spend-authority-gates";

export const VENTURE_COMMITMENT_GATE = "VentureCommitmentGate" as const;
export const VENTURE_COMMITMENT_IDEMPOTENCY_GATE = "VentureCommitmentIdempotencyGate" as const;
export const RECURRING_COMMITMENT_EXPOSURE_GATE = "RecurringCommitmentExposureGate" as const;
export const COMMITMENT_SETTLEMENT_RECONCILIATION_GATE = "CommitmentSettlementReconciliationGate" as const;
export const ALLOCATION_COMMITMENT_COMPATIBILITY_GATE = "AllocationCommitmentCompatibilityGate" as const;
export const FINANCIAL_COMMITMENT_QC_TEST_ISOLATION_GATE = "FinancialCommitmentQCTestIsolationGate" as const;
export const HQ_TREASURY_FINANCIAL_CONSISTENCY_GATE = "HQTreasuryFinancialConsistencyGate" as const;
export const TREASURY_LIVE_UPDATE_GATE = "TreasuryLiveUpdateGate" as const;
export const NO_MONEY_MOVEMENT_GATE = "NoMoneyMovementGate" as const;
export const AUTONOMOUS_COMMITMENT_ENABLEMENT_GATE = "AutonomousCommitmentEnablementGate" as const;

function pass(gate: string, reason: string): NamedFinancialGate {
  return { gate, result: "PASS", reasons: [reason] };
}

function fail(gate: string, reasons: string[]): NamedFinancialGate {
  return { gate, result: "FAIL", reasons };
}

export function evaluateVentureCommitmentGate(commitment: VentureFinancialCommitment): NamedFinancialGate {
  const reasons: string[] = [];
  if (commitment.contract !== "VentureFinancialCommitment") reasons.push("MISSING_CONTRACT");
  if (commitment.money_moved) reasons.push("MONEY_MOVED");
  if (commitment.execution_enabled) reasons.push("EXECUTION_ENABLED");
  if (commitment.amount <= 0) reasons.push("INVALID_AMOUNT");
  if (commitment.currency !== "USD") reasons.push("CURRENCY_MISMATCH");
  if (!commitment.spend_authority_id) reasons.push("MISSING_SPEND_AUTHORITY");
  if (!commitment.idempotency_key) reasons.push("MISSING_IDEMPOTENCY");
  if (!commitment.audit_lineage.length) reasons.push("MISSING_AUDIT_LINEAGE");
  if (commitmentRemaining(commitment) !== commitment.remaining_commitment) reasons.push("REMAINING_MISMATCH");
  return reasons.length ? fail(VENTURE_COMMITMENT_GATE, reasons) : pass(VENTURE_COMMITMENT_GATE, "COMMITMENT_IS_POLICY_RESERVE");
}

export function evaluateVentureCommitmentIdempotencyGate(input: {
  firstId: string | null;
  retryId: string | null;
  firstCount: number;
  retryCount: number;
}): NamedFinancialGate {
  const same = Boolean(input.firstId) && input.firstId === input.retryId && input.firstCount === input.retryCount;
  return same
    ? pass(VENTURE_COMMITMENT_IDEMPOTENCY_GATE, "RETRY_DID_NOT_DUPLICATE")
    : fail(VENTURE_COMMITMENT_IDEMPOTENCY_GATE, ["RETRY_CREATED_DUPLICATE"]);
}

export function evaluateRecurringCommitmentExposureGate(input: {
  obligationType: CommitmentObligationType | unknown;
  amount: number;
  periodAmount?: number | null;
  billingCadence?: string | null;
  maxAuthorizedExposure?: number | null;
  reviewAt?: string | null;
  remainingAuthority: number;
}): NamedFinancialGate {
  if (input.obligationType !== "RECURRING") {
    return pass(RECURRING_COMMITMENT_EXPOSURE_GATE, "ONE_TIME_NO_RECURRING_EXPOSURE");
  }
  const reasons: string[] = [];
  if (input.periodAmount == null || input.periodAmount <= 0) reasons.push("PERIOD_AMOUNT_REQUIRED");
  if (input.billingCadence !== "MONTHLY" && input.billingCadence !== "ANNUAL") reasons.push("BILLING_CADENCE_REQUIRED");
  if (input.maxAuthorizedExposure == null || input.maxAuthorizedExposure <= 0) reasons.push("MAX_EXPOSURE_REQUIRED");
  if (!input.reviewAt) reasons.push("REVIEW_CONDITION_REQUIRED");
  if (typeof input.maxAuthorizedExposure === "number" && input.maxAuthorizedExposure < (input.periodAmount ?? 0)) {
    reasons.push("MAX_EXPOSURE_BELOW_PERIOD");
  }
  if (typeof input.maxAuthorizedExposure === "number" && input.maxAuthorizedExposure > input.remainingAuthority) {
    reasons.push("MAX_EXPOSURE_EXCEEDS_REMAINING_AUTHORITY");
  }
  if (typeof input.maxAuthorizedExposure === "number" && input.amount !== input.maxAuthorizedExposure) {
    reasons.push("RECURRING_AMOUNT_MUST_EQUAL_MAX_EXPOSURE");
  }
  return reasons.length
    ? fail(RECURRING_COMMITMENT_EXPOSURE_GATE, reasons)
    : pass(RECURRING_COMMITMENT_EXPOSURE_GATE, "RECURRING_EXPOSURE_BOUNDED");
}

export function evaluateCommitmentSettlementReconciliationGate(input: {
  beforeCommitted: number;
  afterCommitted: number;
  beforeActual: number;
  afterActual: number;
  settledDelta: number;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (input.settledDelta < 0) reasons.push("NEGATIVE_SETTLEMENT");
  if (roundish(input.afterActual - input.beforeActual) !== roundish(input.settledDelta)) {
    reasons.push("ACTUAL_SPEND_DID_NOT_RECEIVE_SETTLEMENT");
  }
  if (roundish(input.beforeCommitted - input.afterCommitted) !== roundish(input.settledDelta)) {
    reasons.push("COMMITMENT_DID_NOT_RELEASE_SETTLED_AMOUNT");
  }
  if (roundish(input.afterCommitted + input.afterActual) === roundish(input.beforeCommitted + input.beforeActual + input.settledDelta)) {
    reasons.push("DOUBLE_COUNTED_AUTHORITY");
  }
  return reasons.length
    ? fail(COMMITMENT_SETTLEMENT_RECONCILIATION_GATE, reasons)
    : pass(COMMITMENT_SETTLEMENT_RECONCILIATION_GATE, "SETTLEMENT_CONVERTS_WITHOUT_DOUBLE_COUNT");
}

function roundish(value: number): number {
  return Math.round(value * 100) / 100;
}

export function evaluateAllocationCommitmentCompatibilityGate(input: {
  nextAllocation: number;
  spendCeiling: number | "NOT_SET";
  openCommitments: number;
}): NamedFinancialGate {
  const ceiling = typeof input.spendCeiling === "number" ? input.spendCeiling : 0;
  if (input.nextAllocation < input.openCommitments) {
    return fail(ALLOCATION_COMMITMENT_COMPATIBILITY_GATE, ["ALLOCATION_BELOW_COMMITMENTS"]);
  }
  if (typeof input.spendCeiling === "number" && input.nextAllocation < ceiling) {
    return fail(ALLOCATION_COMMITMENT_COMPATIBILITY_GATE, ["ALLOCATION_BELOW_SPEND_AUTHORITY"]);
  }
  return pass(ALLOCATION_COMMITMENT_COMPATIBILITY_GATE, "ALLOCATION_COMPATIBLE_WITH_COMMITMENTS");
}

export function evaluateFinancialCommitmentQCTestIsolationGate(input: {
  vitest: boolean;
  persistEnabled: boolean;
  wroteCanonicalLedger: boolean;
}): NamedFinancialGate {
  if (!input.vitest) return pass(FINANCIAL_COMMITMENT_QC_TEST_ISOLATION_GATE, "NOT_A_TEST");
  if (input.persistEnabled || input.wroteCanonicalLedger) {
    return fail(FINANCIAL_COMMITMENT_QC_TEST_ISOLATION_GATE, ["TEST_WOULD_MUTATE_FOUNDER_CAPITAL"]);
  }
  return pass(FINANCIAL_COMMITMENT_QC_TEST_ISOLATION_GATE, "FIXTURE_ISOLATED_FROM_FOUNDER_LEDGER");
}

export function evaluateHQTreasuryFinancialConsistencyGate(input: {
  hqAllocation: number;
  treasuryAllocation: number;
  hqAuthority: number;
  treasuryAuthority: number;
  hqCommitted: number;
  treasuryCommitted: number;
  hqActual: number;
  treasuryActual: number;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (input.hqAllocation !== input.treasuryAllocation) reasons.push("ALLOCATION_MISMATCH");
  if (input.hqAuthority !== input.treasuryAuthority) reasons.push("AUTHORITY_MISMATCH");
  if (input.hqCommitted !== input.treasuryCommitted) reasons.push("COMMITTED_MISMATCH");
  if (input.hqActual !== input.treasuryActual) reasons.push("ACTUAL_MISMATCH");
  return reasons.length
    ? fail(HQ_TREASURY_FINANCIAL_CONSISTENCY_GATE, reasons)
    : pass(HQ_TREASURY_FINANCIAL_CONSISTENCY_GATE, "HQ_TREASURY_LAYERS_AGREE");
}

export function evaluateTreasuryLiveUpdateGate(input: {
  beforeVersion: string;
  afterVersion: string;
  eventPublished: boolean;
}): NamedFinancialGate {
  if (input.beforeVersion === input.afterVersion || !input.eventPublished) {
    return fail(TREASURY_LIVE_UPDATE_GATE, ["LIVE_PROJECTION_DID_NOT_UPDATE"]);
  }
  return pass(TREASURY_LIVE_UPDATE_GATE, "PROJECTION_UPDATED_WITHOUT_REFRESH");
}

export function evaluateNoMoneyMovementGate(input: {
  mercuryWriteAccess: boolean;
  moneyMovementEnabled: boolean;
  achEnabled?: boolean;
  wireEnabled?: boolean;
  cardsEnabled?: boolean;
  recipientCreationEnabled?: boolean;
  externalPurchaseEnabled?: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (input.mercuryWriteAccess) reasons.push("MERCURY_WRITE_ENABLED");
  if (input.moneyMovementEnabled) reasons.push("MONEY_MOVEMENT_ENABLED");
  if (input.achEnabled) reasons.push("ACH_ENABLED");
  if (input.wireEnabled) reasons.push("WIRE_ENABLED");
  if (input.cardsEnabled) reasons.push("CARDS_ENABLED");
  if (input.recipientCreationEnabled) reasons.push("RECIPIENT_CREATION_ENABLED");
  if (input.externalPurchaseEnabled) reasons.push("EXTERNAL_PURCHASE_ENABLED");
  return reasons.length ? fail(NO_MONEY_MOVEMENT_GATE, reasons) : pass(NO_MONEY_MOVEMENT_GATE, "EXECUTION_PATHS_DISABLED");
}

export function evaluateAutonomousCommitmentEnablementGate(input: {
  autonomous: boolean;
  evidenceBacked?: boolean;
  policyAllowed?: boolean;
  riskAllowed?: boolean;
  economicRationale?: boolean;
}): NamedFinancialGate {
  if (!input.autonomous) return pass(AUTONOMOUS_COMMITMENT_ENABLEMENT_GATE, "FOUNDER_DIRECT_PATH");
  if (AUTONOMOUS_COMMITMENT_CREATION_ENABLED) {
    const reasons: string[] = [];
    if (!input.evidenceBacked) reasons.push("EVIDENCE_REQUIRED");
    if (!input.policyAllowed) reasons.push("POLICY_REQUIRED");
    if (!input.riskAllowed) reasons.push("RISK_NOT_ALLOWED");
    if (!input.economicRationale) reasons.push("RATIONALE_REQUIRED");
    return reasons.length
      ? fail(AUTONOMOUS_COMMITMENT_ENABLEMENT_GATE, reasons)
      : pass(AUTONOMOUS_COMMITMENT_ENABLEMENT_GATE, "BOUNDED_AUTONOMOUS_READY");
  }
  return fail(AUTONOMOUS_COMMITMENT_ENABLEMENT_GATE, ["AUTONOMOUS_REAL_CREATION_DISABLED"]);
}

export function evaluateCommitmentCreationPreconditions(input: {
  authority: VentureSpendAuthority;
  amount: number;
  category: unknown;
  commitments: VentureFinancialCommitment[];
}): NamedFinancialGate[] {
  return [
    evaluatePaidAcquisitionAuthorityGate({
      generalAuthority: input.authority.effective_spend_authority,
      paidAcquisitionAuthority: 0,
      requestedCategory: input.category,
    }),
    input.authority.status === "ACTIVE" && input.authority.effective_spend_authority > 0
      ? pass(VENTURE_COMMITMENT_GATE, "ACTIVE_SPEND_AUTHORITY")
      : fail(VENTURE_COMMITMENT_GATE, ["SPEND_AUTHORITY_REQUIRED"]),
    isGovernedSpendCategory(input.category) || isPaidAcquisitionCategory(input.category)
      ? pass(VENTURE_COMMITMENT_GATE, "CATEGORY_RECOGNIZED")
      : fail(VENTURE_COMMITMENT_GATE, ["CATEGORY_NOT_PERMITTED"]),
    openCommitmentTotal(input.commitments) + input.amount <= input.authority.effective_spend_authority + 1e-9
      ? pass("CommitmentWithinSpendAuthorityGate", "WITHIN_EFFECTIVE_AUTHORITY")
      : fail("CommitmentWithinSpendAuthorityGate", ["EXCEEDS_EFFECTIVE_AUTHORITY"]),
  ];
}
