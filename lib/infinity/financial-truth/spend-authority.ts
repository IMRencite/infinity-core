import { displayMoney, displayNotSet, roundUsd } from "./amounts";
import { OCCUPANCYNPV_VENTURE_ID } from "./allocation-reconciliation";
import type { CapitalLedger, TreasuryAuditEvent } from "./capital-ledger";
import type { CanonicalAllocationRecord, FreshnessState, NotSet, VentureBudgetPolicy } from "./types";

export const VENTURE_SPEND_AUTHORITY_CONTRACT = "VentureSpendAuthority" as const;
export const VENTURE_FINANCIAL_COMMITMENT_CONTRACT = "VentureFinancialCommitment" as const;
export const FOUNDER_VENTURE_SPEND_AUTHORITY_MUTATION = "FounderVentureSpendAuthorityMutation" as const;
export const FOUNDER_VENTURE_COMMITMENT_MUTATION = "FounderVentureCommitmentMutation" as const;
export const ECONOMIC_ACTION_GATE = "EconomicActionGate" as const;
export const AUTONOMOUS_COMMITMENT_CREATION_ENABLED = false;

export const SPEND_AUTHORIZATION_SOURCES = [
  "FOUNDER_DIRECT",
  "AUTONOMOUS_POLICY",
  "EAG_APPROVED",
  "TREASURY_POLICY",
  "PORTFOLIO_POLICY",
] as const;
export type SpendAuthorizationSource = (typeof SPEND_AUTHORIZATION_SOURCES)[number];

export const SPEND_AUTHORITY_STATUSES = ["ACTIVE", "NOT_SET", "SUSPENDED", "EXPIRED"] as const;
export type SpendAuthorityStatus = (typeof SPEND_AUTHORITY_STATUSES)[number];

export const GOVERNED_SPEND_CATEGORIES = [
  "INFRASTRUCTURE",
  "DOMAIN",
  "HOSTING",
  "SOFTWARE",
  "AI_PROVIDER",
  "EMAIL",
  "OPERATIONS",
  "CREATIVE",
  "LEGAL",
  "DATA",
  "OTHER",
] as const;
export type GovernedSpendCategory = (typeof GOVERNED_SPEND_CATEGORIES)[number];

export const PAID_ACQUISITION_CATEGORY = "PAID_ACQUISITION" as const;
export type SpendCategory = GovernedSpendCategory | typeof PAID_ACQUISITION_CATEGORY;

export const BUDGET_AUDIT_STATES = [
  "CURRENT_CANONICAL",
  "FOUNDER_CONFIGURED",
  "STALE",
  "LEGACY",
  "TEST",
  "UNKNOWN",
] as const;
export type BudgetAuditState = (typeof BUDGET_AUDIT_STATES)[number];

export const COMMITMENT_STATUSES = [
  "PROPOSED",
  "AUTHORIZED",
  "COMMITTED",
  "PARTIALLY_SETTLED",
  "SETTLED",
  "CANCELLED",
  "EXPIRED",
  "BLOCKED",
  "FAILED",
] as const;
export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];
export const LEGACY_COMMITMENT_STATUSES = ["OPEN", "PARTIAL"] as const;
export const OUTSTANDING_COMMITMENT_STATUSES = ["AUTHORIZED", "COMMITTED", "PARTIALLY_SETTLED", "OPEN", "PARTIAL"] as const;
export const COMMITMENT_OBLIGATION_TYPES = ["ONE_TIME", "RECURRING"] as const;
export type CommitmentObligationType = (typeof COMMITMENT_OBLIGATION_TYPES)[number];
export const COMMITMENT_RISK_CLASSES = ["LOW", "MEDIUM", "HIGH"] as const;
export type CommitmentRiskClass = (typeof COMMITMENT_RISK_CLASSES)[number];
export const COMMITMENT_BILLING_CADENCES = ["MONTHLY", "ANNUAL"] as const;
export type CommitmentBillingCadence = (typeof COMMITMENT_BILLING_CADENCES)[number];

export const COMMITMENT_EVENT_TYPES = [
  "COMMITMENT_PROPOSED",
  "COMMITMENT_AUTHORIZED",
  "COMMITMENT_CREATED",
  "COMMITMENT_CANCELLED",
  "COMMITMENT_PARTIALLY_SETTLED",
  "COMMITMENT_SETTLED",
  "COMMITMENT_EXPIRED",
  "COMMITMENT_BLOCKED",
] as const;
export type CommitmentEventType = (typeof COMMITMENT_EVENT_TYPES)[number];

/**
 * Canonical reservation: remaining obligation consumes spend authority.
 * Settled amounts become actual spend and stop consuming as commitment.
 * Partial $5 / $2 → remaining commitment $3, actual $2, remaining authority $0.
 */
export const COMMITMENT_RESERVATION_POLICY = "REMAINING_OBLIGATION_CONSUMES_AUTHORITY" as const;

export type VentureSpendAuthority = {
  contract: typeof VENTURE_SPEND_AUTHORITY_CONTRACT;
  id: string;
  venture_id: string;
  currency: "USD";
  allocation_amount: number;
  authorized_spend_ceiling: number | NotSet;
  committed_amount: number;
  actual_spend_amount: number;
  remaining_spend_authority: number;
  unused_allocation: number;
  effective_spend_authority: number;
  purpose: string | null;
  category: GovernedSpendCategory | "GENERAL";
  authorization_source: SpendAuthorizationSource | "NONE";
  authorization_scope: "VENTURE_OPERATING";
  effective_at: string | null;
  expires_at: string | null;
  review_at: string | null;
  status: SpendAuthorityStatus;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  policy_reference: "VentureBudgetPolicy" | "VentureSpendAuthority" | null;
  audit_lineage: string[];
  paid_acquisition_authority: 0;
  money_moved: false;
};

export type VentureFinancialCommitment = {
  contract: typeof VENTURE_FINANCIAL_COMMITMENT_CONTRACT;
  commitment_id: string;
  venture_id: string;
  spend_authority_id: string | null;
  amount: number;
  currency: "USD";
  category: SpendCategory;
  purpose: string | null;
  vendor_or_provider: string | null;
  vendor: string | null;
  provider: string | null;
  status: CommitmentStatus;
  authorization_source: SpendAuthorizationSource | "NONE";
  authorized_by: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  review_at: string | null;
  idempotency_key: string;
  external_reference: string | null;
  settled_amount: number;
  cancelled_amount: number;
  remaining_commitment: number;
  audit_lineage: string[];
  risk_class: CommitmentRiskClass;
  policy_reference: "VentureFinancialCommitment" | "VentureSpendAuthority";
  obligation_type: CommitmentObligationType;
  period_amount: number | null;
  billing_cadence: CommitmentBillingCadence | null;
  max_authorized_exposure: number | null;
  mission_or_action_ref: string | null;
  state_transitions: Array<{ at: string; from: CommitmentStatus | "NONE"; to: CommitmentStatus; reason: string }>;
  money_moved: false;
  execution_enabled: false;
};

export type VentureBudgetCeilingAudit = {
  venture_id: string;
  observed_ceiling: number | NotSet;
  source: SpendAuthorizationSource | "NONE";
  freshness: FreshnessState;
  state: BudgetAuditState;
  should_control_spend_authority: boolean;
  reason: string;
  last_budget_audit_id: string | null;
  last_budget_at: string | null;
};

export type SpendAuthorityMath = {
  allocation_amount: number;
  authorized_spend_ceiling: number | NotSet;
  effective_spend_authority: number;
  committed_amount: number;
  actual_spend_amount: number;
  reconciled_actual_spend: number;
  unreconciled_actual_spend: number;
  remaining_spend_authority: number;
  unused_allocation: number;
};

export function isGovernedSpendCategory(value: unknown): value is GovernedSpendCategory {
  return typeof value === "string" && (GOVERNED_SPEND_CATEGORIES as readonly string[]).includes(value);
}

export function isPaidAcquisitionCategory(value: unknown): value is typeof PAID_ACQUISITION_CATEGORY {
  return value === PAID_ACQUISITION_CATEGORY;
}

export function normalizeCommitmentStatus(status: string | null | undefined): CommitmentStatus {
  if (status === "OPEN") return "COMMITTED";
  if (status === "PARTIAL") return "PARTIALLY_SETTLED";
  if ((COMMITMENT_STATUSES as readonly string[]).includes(status ?? "")) return status as CommitmentStatus;
  return "PROPOSED";
}

export function commitmentConsumesAuthority(status: string | null | undefined): boolean {
  const normalized = normalizeCommitmentStatus(status);
  return normalized === "AUTHORIZED" || normalized === "COMMITTED" || normalized === "PARTIALLY_SETTLED";
}

export function inferCommitmentRiskClass(input: {
  category: SpendCategory | unknown;
  obligationType?: CommitmentObligationType | null;
}): CommitmentRiskClass {
  if (input.category === "LEGAL" || input.category === PAID_ACQUISITION_CATEGORY) return "HIGH";
  if (input.obligationType === "RECURRING") return "MEDIUM";
  if (input.category === "CREATIVE" || input.category === "OTHER" || input.category === "AI_PROVIDER") return "MEDIUM";
  return "LOW";
}

export function commitmentRemaining(row: Pick<VentureFinancialCommitment, "amount" | "settled_amount" | "cancelled_amount">): number {
  return roundUsd(Math.max(0, row.amount - row.settled_amount - row.cancelled_amount));
}

export function openCommitmentTotal(commitments: VentureFinancialCommitment[]): number {
  return roundUsd(
    commitments
      .filter((row) => commitmentConsumesAuthority(row.status))
      .reduce((sum, row) => sum + commitmentRemaining(row), 0),
  );
}

export function reconciledActualSpend(commitments: VentureFinancialCommitment[]): number {
  return roundUsd(commitments.reduce((sum, row) => sum + Math.max(0, row.settled_amount), 0));
}

/**
 * remaining = effective - outstanding remaining obligations - actual spend.
 * Settled amounts are actual spend, not remaining obligation, so they are not added twice.
 * Example: $5 authority, $5 committed, $2 settled → remaining commitment $3, actual $2, remaining authority $0.
 */
export function calculateSpendAuthorityMath(input: {
  allocationAmount: number;
  spendCeiling: number | NotSet | null | undefined;
  commitments?: VentureFinancialCommitment[];
  actualSpendAmount?: number;
}): SpendAuthorityMath {
  const allocation = Math.max(0, input.allocationAmount);
  const ceiling = typeof input.spendCeiling === "number" && Number.isFinite(input.spendCeiling) ? input.spendCeiling : null;
  const effective = ceiling == null ? 0 : roundUsd(Math.min(allocation, Math.max(0, ceiling)));
  const commitments = input.commitments ?? [];
  const committed = openCommitmentTotal(commitments);
  const actual = Math.max(0, input.actualSpendAmount ?? 0);
  const reconciled = reconciledActualSpend(commitments);
  const unreconciled = roundUsd(Math.max(0, actual - reconciled));
  const remaining = roundUsd(Math.max(0, effective - committed - actual));
  return {
    allocation_amount: allocation,
    authorized_spend_ceiling: ceiling == null ? "NOT_SET" : ceiling,
    effective_spend_authority: effective,
    committed_amount: committed,
    actual_spend_amount: actual,
    reconciled_actual_spend: reconciled,
    unreconciled_actual_spend: unreconciled,
    remaining_spend_authority: remaining,
    unused_allocation: roundUsd(Math.max(0, allocation - effective)),
  };
}

function founderBudgetAudits(ledger: CapitalLedger, ventureId: string): TreasuryAuditEvent[] {
  return ledger.audit.filter((row) => {
    if (row.action !== "UPDATE_VENTURE_BUDGET") return false;
    const policy = row.payload?.policy as VentureBudgetPolicy | undefined;
    return policy?.venture_id === ventureId;
  });
}

export function auditVentureBudgetCeiling(ledger: CapitalLedger, ventureId: string): VentureBudgetCeilingAudit {
  const budget = ledger.venture_budgets.find((row) => row.venture_id === ventureId);
  const allocation = ledger.allocations.find((row) => row.venture_id === ventureId);
  const audits = founderBudgetAudits(ledger, ventureId);
  const last = audits[audits.length - 1] ?? null;
  const lastPolicy = last?.payload?.policy as VentureBudgetPolicy | undefined;
  const ceiling = budget?.venture_budget_ceiling ?? "NOT_SET";
  const allocated = (allocation?.allocated_amount ?? 0) + (allocation?.reserved_amount ?? 0);

  if (process.env.VITEST && !budget) {
    return {
      venture_id: ventureId,
      observed_ceiling: "NOT_SET",
      source: "NONE",
      freshness: "UNKNOWN",
      state: "UNKNOWN",
      should_control_spend_authority: false,
      reason: "No venture budget ceiling is present on this isolated ledger.",
      last_budget_audit_id: null,
      last_budget_at: null,
    };
  }

  if (ceiling === "NOT_SET" || ceiling == null) {
    return {
      venture_id: ventureId,
      observed_ceiling: "NOT_SET",
      source: "NONE",
      freshness: "UNKNOWN",
      state: "UNKNOWN",
      should_control_spend_authority: false,
      reason: "No numeric venture budget ceiling exists. Allocation is not spend authority.",
      last_budget_audit_id: last?.id ?? null,
      last_budget_at: last?.at ?? budget?.updated_at ?? null,
    };
  }

  if (typeof ceiling !== "number" || !Number.isFinite(ceiling) || ceiling < 0) {
    return {
      venture_id: ventureId,
      observed_ceiling: "NOT_SET",
      source: "NONE",
      freshness: "UNKNOWN",
      state: "UNKNOWN",
      should_control_spend_authority: false,
      reason: "Budget ceiling is not a usable number.",
      last_budget_audit_id: last?.id ?? null,
      last_budget_at: last?.at ?? budget?.updated_at ?? null,
    };
  }

  const lastCeiling = lastPolicy?.venture_budget_ceiling;
  const founderWroteCurrent = typeof lastCeiling === "number" && lastCeiling === ceiling;
  const allocationCorrectionPreserved =
    ledger.audit.some((row) => row.action === "CORRECT_VENTURE_CAPITAL_ALLOCATION") &&
    ledger.venture_budgets.some((row) => row.venture_id === ventureId && row.venture_budget_ceiling === ceiling);
  const withinAllocation = allocated <= 0 || ceiling <= allocated;
  const qcIsolation = Boolean(process.env.VITEST) && process.env.INFINITY_FINANCIAL_TRUTH_PERSIST !== "1";

  if (qcIsolation && !founderWroteCurrent && audits.length === 0) {
    return {
      venture_id: ventureId,
      observed_ceiling: ceiling,
      source: "NONE",
      freshness: "UNKNOWN",
      state: "TEST",
      should_control_spend_authority: false,
      reason: "Isolated test fixture budget is not founder-canonical spend authority.",
      last_budget_audit_id: last?.id ?? null,
      last_budget_at: last?.at ?? budget?.updated_at ?? null,
    };
  }

  if (founderWroteCurrent && withinAllocation) {
    return {
      venture_id: ventureId,
      observed_ceiling: ceiling,
      source: "FOUNDER_DIRECT",
      freshness: "FRESH",
      state: "FOUNDER_CONFIGURED",
      should_control_spend_authority: true,
      reason: allocationCorrectionPreserved
        ? "Founder UPDATE_VENTURE_BUDGET set this ceiling. Allocation correction preserved it as a budget layer, not as allocation."
        : "Founder UPDATE_VENTURE_BUDGET set this ceiling. It is current policy, not allocation and not spend.",
      last_budget_audit_id: last?.id ?? null,
      last_budget_at: last?.at ?? budget?.updated_at ?? null,
    };
  }

  if (!withinAllocation) {
    return {
      venture_id: ventureId,
      observed_ceiling: ceiling,
      source: founderWroteCurrent ? "FOUNDER_DIRECT" : "NONE",
      freshness: "STALE",
      state: "STALE",
      should_control_spend_authority: false,
      reason: "Budget ceiling exceeds active allocation, so it cannot authorize spend.",
      last_budget_audit_id: last?.id ?? null,
      last_budget_at: last?.at ?? budget?.updated_at ?? null,
    };
  }

  return {
    venture_id: ventureId,
    observed_ceiling: ceiling,
    source: "NONE",
    freshness: "UNKNOWN",
    state: "UNKNOWN",
    should_control_spend_authority: false,
    reason: "Budget ceiling exists but lacks a matching founder authorization lineage.",
    last_budget_audit_id: last?.id ?? null,
    last_budget_at: last?.at ?? budget?.updated_at ?? null,
  };
}

function emptyAuthority(ventureId: string, allocation: number, actual: number): VentureSpendAuthority {
  const math = calculateSpendAuthorityMath({
    allocationAmount: allocation,
    spendCeiling: "NOT_SET",
    actualSpendAmount: actual,
  });
  return {
    contract: VENTURE_SPEND_AUTHORITY_CONTRACT,
    id: `spend-authority:not-set:${ventureId}`,
    venture_id: ventureId,
    currency: "USD",
    allocation_amount: math.allocation_amount,
    authorized_spend_ceiling: "NOT_SET",
    committed_amount: 0,
    actual_spend_amount: math.actual_spend_amount,
    remaining_spend_authority: 0,
    unused_allocation: math.unused_allocation,
    effective_spend_authority: 0,
    purpose: null,
    category: "GENERAL",
    authorization_source: "NONE",
    authorization_scope: "VENTURE_OPERATING",
    effective_at: null,
    expires_at: null,
    review_at: null,
    status: "NOT_SET",
    created_by: null,
    created_at: null,
    updated_at: null,
    policy_reference: null,
    audit_lineage: [],
    paid_acquisition_authority: 0,
    money_moved: false,
  };
}

export function persistedSpendAuthorities(ledger: CapitalLedger): VentureSpendAuthority[] {
  return (ledger.spend_authorities ?? []).map((row) => ({
    ...row,
    contract: VENTURE_SPEND_AUTHORITY_CONTRACT,
    paid_acquisition_authority: 0,
    money_moved: false as const,
  }));
}

export function persistedCommitments(ledger: CapitalLedger): VentureFinancialCommitment[] {
  return (ledger.venture_financial_commitments ?? []).map((row) => {
    const vendor = row.vendor_or_provider ?? row.vendor ?? row.provider ?? null;
    const status = normalizeCommitmentStatus(row.status);
    return {
      ...row,
      contract: VENTURE_FINANCIAL_COMMITMENT_CONTRACT,
      status,
      vendor_or_provider: vendor,
      vendor: row.vendor ?? vendor,
      provider: row.provider ?? vendor,
      authorization_source: row.authorization_source ?? "FOUNDER_DIRECT",
      updated_at: row.updated_at ?? row.created_at,
      expires_at: row.expires_at ?? null,
      review_at: row.review_at ?? null,
      audit_lineage: row.audit_lineage ?? [],
      risk_class: row.risk_class ?? inferCommitmentRiskClass({ category: row.category, obligationType: row.obligation_type }),
      policy_reference: row.policy_reference ?? "VentureFinancialCommitment",
      obligation_type: row.obligation_type ?? "ONE_TIME",
      period_amount: row.period_amount ?? null,
      billing_cadence: row.billing_cadence ?? null,
      max_authorized_exposure: row.max_authorized_exposure ?? null,
      mission_or_action_ref: row.mission_or_action_ref ?? null,
      state_transitions: row.state_transitions ?? [],
      remaining_commitment: commitmentRemaining(row),
      money_moved: false as const,
      execution_enabled: false as const,
    };
  });
}

export function syncAllocationCommitmentExposure(ledger: CapitalLedger, ventureId: string, now: string): void {
  const allocation = ledger.allocations.find((row) => row.venture_id === ventureId);
  if (!allocation) return;
  const commitments = persistedCommitments(ledger).filter((row) => row.venture_id === ventureId);
  allocation.committed_amount = openCommitmentTotal(commitments);
  allocation.spent_amount = Math.max(allocation.spent_amount, reconciledActualSpend(commitments));
  allocation.remaining = allocation.allocated_amount + allocation.reserved_amount - allocation.committed_amount - allocation.spent_amount;
  allocation.updated_at = now;
}

export function projectVentureSpendAuthority(
  ledger: CapitalLedger,
  ventureId: string,
  actualSpendAmount = 0,
): VentureSpendAuthority {
  const allocation = ledger.allocations.find((row) => row.venture_id === ventureId);
  const allocated = (allocation?.allocated_amount ?? 0) + (allocation?.reserved_amount ?? 0);
  const actual = Math.max(actualSpendAmount, allocation?.spent_amount ?? 0);
  const commitments = persistedCommitments(ledger).filter((row) => row.venture_id === ventureId);
  const persisted = persistedSpendAuthorities(ledger)
    .filter((row) => row.venture_id === ventureId && row.status === "ACTIVE")
    .sort((a, b) => Date.parse(b.updated_at ?? "") - Date.parse(a.updated_at ?? ""))[0];

  if (persisted) {
    const math = calculateSpendAuthorityMath({
      allocationAmount: allocated,
      spendCeiling: persisted.authorized_spend_ceiling,
      commitments,
      actualSpendAmount: actual,
    });
    return {
      ...persisted,
      allocation_amount: math.allocation_amount,
      authorized_spend_ceiling: math.authorized_spend_ceiling,
      committed_amount: math.committed_amount,
      actual_spend_amount: math.actual_spend_amount,
      remaining_spend_authority: math.remaining_spend_authority,
      unused_allocation: math.unused_allocation,
      effective_spend_authority: math.effective_spend_authority,
      paid_acquisition_authority: 0,
      money_moved: false,
    };
  }

  const audit = auditVentureBudgetCeiling(ledger, ventureId);
  if (!audit.should_control_spend_authority || typeof audit.observed_ceiling !== "number") {
    return emptyAuthority(ventureId, allocated, actual);
  }

  const math = calculateSpendAuthorityMath({
    allocationAmount: allocated,
    spendCeiling: audit.observed_ceiling,
    commitments,
    actualSpendAmount: actual,
  });
  return {
    contract: VENTURE_SPEND_AUTHORITY_CONTRACT,
    id: `spend-authority:derived:${ventureId}:${audit.last_budget_audit_id ?? "budget"}`,
    venture_id: ventureId,
    currency: "USD",
    allocation_amount: math.allocation_amount,
    authorized_spend_ceiling: math.authorized_spend_ceiling,
    committed_amount: math.committed_amount,
    actual_spend_amount: math.actual_spend_amount,
    remaining_spend_authority: math.remaining_spend_authority,
    unused_allocation: math.unused_allocation,
    effective_spend_authority: math.effective_spend_authority,
    purpose: "OccupancyNPV operating spend ceiling derived from current founder venture budget policy",
    category: "OPERATIONS",
    authorization_source: audit.source === "NONE" ? "TREASURY_POLICY" : audit.source,
    authorization_scope: "VENTURE_OPERATING",
    effective_at: audit.last_budget_at,
    expires_at: null,
    review_at: null,
    status: "ACTIVE",
    created_by: audit.last_budget_audit_id,
    created_at: audit.last_budget_at,
    updated_at: audit.last_budget_at,
    policy_reference: "VentureBudgetPolicy",
    audit_lineage: audit.last_budget_audit_id ? [audit.last_budget_audit_id] : [],
    paid_acquisition_authority: 0,
    money_moved: false,
  };
}

export function projectOccupancyNpvSpendAuthority(
  ledger: CapitalLedger,
  actualSpendAmount = 0,
): VentureSpendAuthority {
  return projectVentureSpendAuthority(ledger, OCCUPANCYNPV_VENTURE_ID, actualSpendAmount);
}

export function displaySpendCeiling(value: number | NotSet): string {
  return value === "NOT_SET" ? displayNotSet(value) : displayMoney(value);
}

export function allocationRecordRemaining(row: CanonicalAllocationRecord): number {
  return row.allocated_amount + row.reserved_amount - row.committed_amount - row.spent_amount;
}
