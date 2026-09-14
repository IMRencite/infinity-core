import { isCanonicalTreasuryVentureId, resolveCanonicalTreasuryVenture } from "./canonical-treasury-ventures";
import {
  appendTreasuryAudit,
  loadCapitalLedger,
  saveCapitalLedger,
  type CapitalLedger,
} from "./capital-ledger";
import type { TreasuryMutationResult } from "./treasury-mutations";
import {
  AUTONOMOUS_COMMITMENT_CREATION_ENABLED,
  calculateSpendAuthorityMath,
  commitmentRemaining,
  FOUNDER_VENTURE_COMMITMENT_MUTATION,
  FOUNDER_VENTURE_SPEND_AUTHORITY_MUTATION,
  inferCommitmentRiskClass,
  isGovernedSpendCategory,
  isPaidAcquisitionCategory,
  persistedCommitments,
  projectVentureSpendAuthority,
  syncAllocationCommitmentExposure,
  VENTURE_FINANCIAL_COMMITMENT_CONTRACT,
  VENTURE_SPEND_AUTHORITY_CONTRACT,
  type CommitmentBillingCadence,
  type CommitmentObligationType,
  type CommitmentStatus,
  type GovernedSpendCategory,
  type SpendAuthorizationSource,
  type VentureFinancialCommitment,
  type VentureSpendAuthority,
} from "./spend-authority";
import {
  evaluateAutonomousCommitmentEnablementGate,
  evaluateRecurringCommitmentExposureGate,
  evaluateVentureCommitmentGate,
} from "./financial-commitment-gates";
import {
  evaluateCommitmentWithinSpendAuthorityGate,
  evaluatePaidAcquisitionAuthorityGate,
  evaluateSpendAuthorityAuditLineageGate,
  evaluateSpendAuthorityReductionSafetyGate,
  evaluateSpendAuthorityWithinAllocationGate,
  evaluateVentureSpendAuthorityGate,
} from "./spend-authority-gates";

function rememberIdempotency(ledger: CapitalLedger, key: string | null, action: string): CapitalLedger | null {
  if (!key) return ledger;
  if (ledger.idempotency[key]) return null;
  ledger.idempotency[key] = { at: new Date().toISOString(), action };
  return ledger;
}

function validAmount(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function mutateVentureSpendAuthority(input: {
  actor: string;
  authorizedActor: boolean;
  ventureId: string;
  amountUsd: number;
  currency?: "USD";
  purpose?: string | null;
  category?: GovernedSpendCategory | "GENERAL";
  effectiveAt?: string | null;
  reviewAt?: string | null;
  reason?: string | null;
  idempotencyKey: string;
  authorizationSource?: SpendAuthorizationSource;
}): TreasuryMutationResult {
  const ledger = loadCapitalLedger();
  if (rememberIdempotency(ledger, input.idempotencyKey, "update_spend_authority") === null) {
    return { ok: true, ledger: loadCapitalLedger(), gates: [] };
  }
  if (!input.authorizedActor) {
    return { ok: false, error: "Unauthorized", reason: "UNAUTHORIZED_ACTOR", gates: [] };
  }
  if (input.currency && input.currency !== "USD") {
    return { ok: false, error: "Currency must match USD", reason: "CURRENCY_MISMATCH", gates: [] };
  }
  if (!validAmount(input.amountUsd)) {
    return { ok: false, error: "Invalid spend authority amount", reason: "INVALID_AMOUNT", gates: [] };
  }
  if (isPaidAcquisitionCategory(input.category)) {
    return {
      ok: false,
      error: "General spend authority cannot authorize paid acquisition",
      reason: "PAID_ACQUISITION_SEPARATE",
      gates: [
        evaluatePaidAcquisitionAuthorityGate({
          generalAuthority: input.amountUsd,
          paidAcquisitionAuthority: 0,
          requestedCategory: input.category,
        }),
      ],
    };
  }
  if (input.category && input.category !== "GENERAL" && !isGovernedSpendCategory(input.category)) {
    return { ok: false, error: "Category is not permitted", reason: "CATEGORY_NOT_PERMITTED", gates: [] };
  }
  const venture = resolveCanonicalTreasuryVenture(input.ventureId);
  if (!venture || !isCanonicalTreasuryVentureId(input.ventureId)) {
    return { ok: false, error: "Unknown venture", reason: "NON_CANONICAL_VENTURE", gates: [] };
  }
  const allocation = ledger.allocations.find((row) => row.venture_id === input.ventureId);
  const allocated = (allocation?.allocated_amount ?? 0) + (allocation?.reserved_amount ?? 0);
  if (allocated <= 0) {
    return { ok: false, error: "Venture allocation required before spend authority", reason: "ALLOCATION_REQUIRED", gates: [] };
  }
  const within = evaluateSpendAuthorityWithinAllocationGate({
    allocationAmount: allocated,
    requestedCeiling: input.amountUsd,
  });
  if (within.result !== "PASS") {
    return { ok: false, error: "Spend authority cannot exceed allocation", reason: "AUTHORITY_EXCEEDS_ALLOCATION", gates: [within] };
  }
  const current = projectVentureSpendAuthority(ledger, input.ventureId, allocation?.spent_amount ?? 0);
  const reduction = evaluateSpendAuthorityReductionSafetyGate({
    nextCeiling: input.amountUsd,
    committedAmount: current.committed_amount,
    unreconciledActualSpend: calculateSpendAuthorityMath({
      allocationAmount: allocated,
      spendCeiling: current.authorized_spend_ceiling,
      commitments: persistedCommitments(ledger).filter((row) => row.venture_id === input.ventureId),
      actualSpendAmount: allocation?.spent_amount ?? 0,
    }).unreconciled_actual_spend,
  });
  if (reduction.result !== "PASS") {
    return {
      ok: false,
      error: "Spend authority cannot reduce below outstanding commitments",
      reason: "REDUCTION_BELOW_COMMITMENT",
      gates: [reduction],
    };
  }
  const now = new Date().toISOString();
  const next: VentureSpendAuthority = {
    contract: VENTURE_SPEND_AUTHORITY_CONTRACT,
    id: current.status === "ACTIVE" && current.policy_reference === "VentureSpendAuthority" ? current.id : `spend-authority:${input.ventureId}:${input.idempotencyKey}`,
    venture_id: input.ventureId,
    currency: "USD",
    allocation_amount: allocated,
    authorized_spend_ceiling: input.amountUsd,
    committed_amount: current.committed_amount,
    actual_spend_amount: current.actual_spend_amount,
    remaining_spend_authority: 0,
    unused_allocation: 0,
    effective_spend_authority: 0,
    purpose: input.purpose ?? current.purpose,
    category: input.category ?? (current.category === "GENERAL" ? "OPERATIONS" : current.category),
    authorization_source: input.authorizationSource ?? "FOUNDER_DIRECT",
    authorization_scope: "VENTURE_OPERATING",
    effective_at: input.effectiveAt ?? now,
    expires_at: null,
    review_at: input.reviewAt ?? null,
    status: "ACTIVE",
    created_by: current.created_by ?? input.actor,
    created_at: current.created_at ?? now,
    updated_at: now,
    policy_reference: "VentureSpendAuthority",
    audit_lineage: [...current.audit_lineage],
    paid_acquisition_authority: 0,
    money_moved: false,
  };
  const math = calculateSpendAuthorityMath({
    allocationAmount: allocated,
    spendCeiling: input.amountUsd,
    commitments: persistedCommitments(ledger).filter((row) => row.venture_id === input.ventureId),
    actualSpendAmount: allocation?.spent_amount ?? 0,
  });
  next.remaining_spend_authority = math.remaining_spend_authority;
  next.unused_allocation = math.unused_allocation;
  next.effective_spend_authority = math.effective_spend_authority;
  ledger.spend_authorities = [
    ...ledger.spend_authorities.filter((row) => row.venture_id !== input.ventureId),
    next,
  ];
  appendTreasuryAudit(ledger, "UPDATE_VENTURE_SPEND_AUTHORITY", input.actor, {
    contract: FOUNDER_VENTURE_SPEND_AUTHORITY_MUTATION,
    venture_id: input.ventureId,
    amountUsd: input.amountUsd,
    purpose: input.purpose ?? null,
    category: next.category,
    reason: input.reason ?? null,
    money_moved: false,
    mercury_write_access: false,
  });
  const saved = saveCapitalLedger(ledger);
  const lineage = saved.audit.filter((row) => row.action === "UPDATE_VENTURE_SPEND_AUTHORITY").map((row) => row.id);
  next.audit_lineage = lineage;
  saved.spend_authorities = saved.spend_authorities.map((row) => (row.venture_id === input.ventureId ? { ...row, audit_lineage: lineage } : row));
  const persisted = saveCapitalLedger(saved);
  return {
    ok: true,
    ledger: persisted,
    gates: [
      evaluateVentureSpendAuthorityGate(projectVentureSpendAuthority(persisted, input.ventureId, allocation?.spent_amount ?? 0)),
      within,
      reduction,
      evaluateSpendAuthorityAuditLineageGate({
        actor: input.actor,
        audited: true,
        lineage,
      }),
      evaluatePaidAcquisitionAuthorityGate({
        generalAuthority: math.effective_spend_authority,
        paidAcquisitionAuthority: 0,
      }),
    ],
  };
}

function transition(
  at: string,
  from: CommitmentStatus | "NONE",
  to: CommitmentStatus,
  reason: string,
): VentureFinancialCommitment["state_transitions"][number] {
  return { at, from, to, reason };
}

export function createVentureFinancialCommitment(input: {
  actor: string;
  authorizedActor: boolean;
  ventureId: string;
  spendAuthorityId?: string | null;
  amountUsd: number;
  currency?: "USD";
  category: unknown;
  purpose?: string | null;
  vendorOrProvider?: string | null;
  vendor?: string | null;
  provider?: string | null;
  obligationType?: CommitmentObligationType;
  periodAmount?: number | null;
  billingCadence?: CommitmentBillingCadence | null;
  maxAuthorizedExposure?: number | null;
  reviewAt?: string | null;
  expiresAt?: string | null;
  reason?: string | null;
  authorizationSource?: SpendAuthorizationSource;
  autonomous?: boolean;
  evidenceBacked?: boolean;
  policyAllowed?: boolean;
  riskAllowed?: boolean;
  economicRationale?: boolean;
  missionOrActionRef?: string | null;
  idempotencyKey: string;
}): TreasuryMutationResult {
  const ledger = loadCapitalLedger();
  if (ledger.idempotency[input.idempotencyKey]) {
    return { ok: true, ledger: loadCapitalLedger(), gates: [] };
  }
  if (!input.authorizedActor) {
    return { ok: false, error: "Unauthorized", reason: "UNAUTHORIZED_ACTOR", gates: [] };
  }
  if (input.currency && input.currency !== "USD") {
    return { ok: false, error: "Currency must match USD", reason: "CURRENCY_MISMATCH", gates: [] };
  }
  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
    return { ok: false, error: "Commitment amount must be greater than zero", reason: "INVALID_AMOUNT", gates: [] };
  }
  const venture = resolveCanonicalTreasuryVenture(input.ventureId);
  if (!venture || !isCanonicalTreasuryVentureId(input.ventureId)) {
    return { ok: false, error: "Unknown venture", reason: "NON_CANONICAL_VENTURE", gates: [] };
  }
  const allocation = ledger.allocations.find((row) => row.venture_id === input.ventureId);
  const allocated = (allocation?.allocated_amount ?? 0) + (allocation?.reserved_amount ?? 0);
  if (!allocation || allocated <= 0 || (allocation.status !== "ALLOCATED" && allocation.status !== "RESERVED")) {
    return { ok: false, error: "Active allocation required before commitment", reason: "ALLOCATION_REQUIRED", gates: [] };
  }
  const authority = projectVentureSpendAuthority(ledger, input.ventureId, allocation.spent_amount);
  if (authority.status !== "ACTIVE" || authority.effective_spend_authority <= 0) {
    return { ok: false, error: "Spend authority required before commitment", reason: "SPEND_AUTHORITY_REQUIRED", gates: [] };
  }
  if (input.spendAuthorityId && input.spendAuthorityId !== authority.id) {
    return { ok: false, error: "Spend authority does not match the venture", reason: "SPEND_AUTHORITY_MISMATCH", gates: [] };
  }
  const source = input.authorizationSource ?? "FOUNDER_DIRECT";
  const autonomous = Boolean(input.autonomous) || source === "AUTONOMOUS_POLICY";
  const autonomousGate = evaluateAutonomousCommitmentEnablementGate({
    autonomous,
    evidenceBacked: input.evidenceBacked,
    policyAllowed: input.policyAllowed,
    riskAllowed: input.riskAllowed,
    economicRationale: input.economicRationale,
  });
  if (autonomousGate.result !== "PASS") {
    return {
      ok: false,
      error: AUTONOMOUS_COMMITMENT_CREATION_ENABLED
        ? "Autonomous commitment requirements were not met"
        : "Autonomous real commitment creation is disabled",
      reason: "AUTONOMOUS_COMMITMENT_DISABLED",
      gates: [autonomousGate],
    };
  }
  const obligationType: CommitmentObligationType = input.obligationType === "RECURRING" ? "RECURRING" : "ONE_TIME";
  const reservedAmount =
    obligationType === "RECURRING" && typeof input.maxAuthorizedExposure === "number"
      ? input.maxAuthorizedExposure
      : input.amountUsd;
  const recurring = evaluateRecurringCommitmentExposureGate({
    obligationType,
    amount: reservedAmount,
    periodAmount: input.periodAmount ?? (obligationType === "RECURRING" ? input.amountUsd : null),
    billingCadence: input.billingCadence,
    maxAuthorizedExposure: input.maxAuthorizedExposure,
    reviewAt: input.reviewAt,
    remainingAuthority: authority.remaining_spend_authority,
  });
  if (recurring.result !== "PASS") {
    return { ok: false, error: "Recurring obligation must be bounded", reason: recurring.reasons[0] ?? "RECURRING_UNBOUNDED", gates: [recurring] };
  }
  const ads = evaluatePaidAcquisitionAuthorityGate({
    generalAuthority: authority.effective_spend_authority,
    paidAcquisitionAuthority: 0,
    requestedCategory: input.category,
  });
  const within = evaluateCommitmentWithinSpendAuthorityGate({
    remainingAuthority: authority.remaining_spend_authority,
    requestedAmount: reservedAmount,
    category: input.category,
  });
  if (ads.result !== "PASS") {
    return { ok: false, error: "Paid acquisition is not authorized", reason: "PAID_ACQUISITION_BLOCKED", gates: [ads] };
  }
  if (within.result !== "PASS") {
    return { ok: false, error: "Commitment exceeds remaining spend authority", reason: within.reasons[0] ?? "EXCEEDS_REMAINING_AUTHORITY", gates: [within] };
  }
  const now = new Date().toISOString();
  const vendor = input.vendorOrProvider ?? input.vendor ?? input.provider ?? null;
  const risk = inferCommitmentRiskClass({ category: input.category, obligationType });
  const commitment: VentureFinancialCommitment = {
    contract: VENTURE_FINANCIAL_COMMITMENT_CONTRACT,
    commitment_id: `commitment:${input.idempotencyKey}`,
    venture_id: input.ventureId,
    spend_authority_id: authority.id,
    amount: reservedAmount,
    currency: "USD",
    category: input.category as VentureFinancialCommitment["category"],
    purpose: input.purpose ?? null,
    vendor_or_provider: vendor,
    vendor,
    provider: vendor,
    status: "COMMITTED",
    authorization_source: source,
    authorized_by: input.actor,
    created_at: now,
    updated_at: now,
    expires_at: input.expiresAt ?? null,
    review_at: input.reviewAt ?? null,
    idempotency_key: input.idempotencyKey,
    external_reference: null,
    settled_amount: 0,
    cancelled_amount: 0,
    remaining_commitment: reservedAmount,
    audit_lineage: [],
    risk_class: risk,
    policy_reference: "VentureFinancialCommitment",
    obligation_type: obligationType,
    period_amount: obligationType === "RECURRING" ? (input.periodAmount ?? input.amountUsd) : null,
    billing_cadence: obligationType === "RECURRING" ? (input.billingCadence ?? null) : null,
    max_authorized_exposure: obligationType === "RECURRING" ? (input.maxAuthorizedExposure ?? reservedAmount) : null,
    mission_or_action_ref: input.missionOrActionRef ?? null,
    state_transitions: [
      transition(now, "NONE", "PROPOSED", "COMMITMENT_PROPOSED"),
      transition(now, "PROPOSED", "AUTHORIZED", "COMMITMENT_AUTHORIZED"),
      transition(now, "AUTHORIZED", "COMMITTED", "COMMITMENT_CREATED"),
    ],
    money_moved: false,
    execution_enabled: false,
  };
  const contractGate = evaluateVentureCommitmentGate({ ...commitment, audit_lineage: ["pending"] });
  if (contractGate.result !== "PASS") {
    return { ok: false, error: "Commitment contract is incomplete", reason: contractGate.reasons[0] ?? "COMMITMENT_CONTRACT", gates: [contractGate] };
  }
  ledger.idempotency[input.idempotencyKey] = { at: now, action: "create_commitment" };
  ledger.venture_financial_commitments = [...ledger.venture_financial_commitments, commitment];
  syncAllocationCommitmentExposure(ledger, input.ventureId, now);
  appendTreasuryAudit(ledger, "CREATE_VENTURE_FINANCIAL_COMMITMENT", input.actor, {
    contract: FOUNDER_VENTURE_COMMITMENT_MUTATION,
    event: "COMMITMENT_CREATED",
    venture_id: input.ventureId,
    commitment_id: commitment.commitment_id,
    spend_authority_id: authority.id,
    amountUsd: reservedAmount,
    category: input.category,
    purpose: input.purpose ?? null,
    vendor_or_provider: vendor,
    obligation_type: obligationType,
    reason: input.reason ?? null,
    authorization_source: source,
    policy_reference: "VentureFinancialCommitment",
    idempotency_key: input.idempotencyKey,
    money_moved: false,
    execution_enabled: false,
    changes_actual_spend: false,
    changes_allocation: false,
  });
  const saved = saveCapitalLedger(ledger);
  const lineage = saved.audit.filter((row) => row.payload?.commitment_id === commitment.commitment_id).map((row) => row.id);
  saved.venture_financial_commitments = saved.venture_financial_commitments.map((row) =>
    row.commitment_id === commitment.commitment_id ? { ...row, audit_lineage: lineage } : row,
  );
  const persisted = saveCapitalLedger(saved);
  return {
    ok: true,
    ledger: persisted,
    gates: [
      evaluateVentureCommitmentGate(persistedCommitments(persisted).find((row) => row.commitment_id === commitment.commitment_id)!),
      within,
      ads,
      recurring,
      autonomousGate,
      evaluateSpendAuthorityAuditLineageGate({ actor: input.actor, audited: true, lineage }),
    ],
  };
}

export function cancelVentureFinancialCommitment(input: {
  actor: string;
  authorizedActor: boolean;
  commitmentId: string;
  reason?: string | null;
  idempotencyKey: string;
}): TreasuryMutationResult {
  const ledger = loadCapitalLedger();
  if (ledger.idempotency[input.idempotencyKey]) {
    return { ok: true, ledger: loadCapitalLedger(), gates: [] };
  }
  if (!input.authorizedActor) {
    return { ok: false, error: "Unauthorized", reason: "UNAUTHORIZED_ACTOR", gates: [] };
  }
  const current = persistedCommitments(ledger).find((row) => row.commitment_id === input.commitmentId);
  if (!current) {
    return { ok: false, error: "Commitment not found", reason: "COMMITMENT_NOT_FOUND", gates: [] };
  }
  if (current.status === "CANCELLED" || current.status === "SETTLED" || current.status === "EXPIRED") {
    return { ok: true, ledger, gates: [] };
  }
  const now = new Date().toISOString();
  const remaining = commitmentRemaining(current);
  ledger.idempotency[input.idempotencyKey] = { at: now, action: "cancel_commitment" };
  ledger.venture_financial_commitments = ledger.venture_financial_commitments.map((row) => {
    if (row.commitment_id !== input.commitmentId) return row;
    return {
      ...row,
      status: "CANCELLED" as const,
      cancelled_amount: remaining,
      remaining_commitment: 0,
      updated_at: now,
      state_transitions: [...(row.state_transitions ?? []), transition(now, current.status, "CANCELLED", "COMMITMENT_CANCELLED")],
    };
  });
  syncAllocationCommitmentExposure(ledger, current.venture_id, now);
  appendTreasuryAudit(ledger, "CANCEL_VENTURE_FINANCIAL_COMMITMENT", input.actor, {
    contract: FOUNDER_VENTURE_COMMITMENT_MUTATION,
    event: "COMMITMENT_CANCELLED",
    commitment_id: input.commitmentId,
    venture_id: current.venture_id,
    releasedUsd: remaining,
    reason: input.reason ?? null,
    money_moved: false,
    changes_actual_spend: false,
  });
  return { ok: true, ledger: saveCapitalLedger(ledger), gates: [] };
}

export function settleVentureFinancialCommitment(input: {
  actor: string;
  authorizedActor: boolean;
  commitmentId: string;
  amountUsd: number;
  reason?: string | null;
  idempotencyKey: string;
}): TreasuryMutationResult {
  const ledger = loadCapitalLedger();
  if (ledger.idempotency[input.idempotencyKey]) {
    return { ok: true, ledger: loadCapitalLedger(), gates: [] };
  }
  if (!input.authorizedActor) {
    return { ok: false, error: "Unauthorized", reason: "UNAUTHORIZED_ACTOR", gates: [] };
  }
  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
    return { ok: false, error: "Settlement amount must be greater than zero", reason: "INVALID_AMOUNT", gates: [] };
  }
  const current = persistedCommitments(ledger).find((row) => row.commitment_id === input.commitmentId);
  if (!current) {
    return { ok: false, error: "Commitment not found", reason: "COMMITMENT_NOT_FOUND", gates: [] };
  }
  const remaining = commitmentRemaining(current);
  if (input.amountUsd > remaining) {
    return { ok: false, error: "Settlement exceeds remaining commitment", reason: "EXCEEDS_REMAINING_COMMITMENT", gates: [] };
  }
  const now = new Date().toISOString();
  const nextSettled = current.settled_amount + input.amountUsd;
  const nextRemaining = commitmentRemaining({ ...current, settled_amount: nextSettled });
  const nextStatus: CommitmentStatus = nextRemaining <= 0 ? "SETTLED" : "PARTIALLY_SETTLED";
  ledger.idempotency[input.idempotencyKey] = { at: now, action: "settle_commitment" };
  ledger.venture_financial_commitments = ledger.venture_financial_commitments.map((row) => {
    if (row.commitment_id !== input.commitmentId) return row;
    return {
      ...row,
      status: nextStatus,
      settled_amount: nextSettled,
      remaining_commitment: nextRemaining,
      updated_at: now,
      state_transitions: [
        ...(row.state_transitions ?? []),
        transition(now, current.status, nextStatus, nextStatus === "SETTLED" ? "COMMITMENT_SETTLED" : "COMMITMENT_PARTIALLY_SETTLED"),
      ],
    };
  });
  const allocation = ledger.allocations.find((row) => row.venture_id === current.venture_id);
  if (allocation) {
    allocation.spent_amount = (allocation.spent_amount ?? 0) + input.amountUsd;
  }
  syncAllocationCommitmentExposure(ledger, current.venture_id, now);
  appendTreasuryAudit(ledger, "SETTLE_VENTURE_FINANCIAL_COMMITMENT", input.actor, {
    contract: FOUNDER_VENTURE_COMMITMENT_MUTATION,
    event: nextStatus === "SETTLED" ? "COMMITMENT_SETTLED" : "COMMITMENT_PARTIALLY_SETTLED",
    commitment_id: input.commitmentId,
    venture_id: current.venture_id,
    settledUsd: input.amountUsd,
    reason: input.reason ?? null,
    money_moved: false,
    execution_enabled: false,
    changes_actual_spend: true,
  });
  return { ok: true, ledger: saveCapitalLedger(ledger), gates: [] };
}

export function expireDueVentureFinancialCommitments(input: {
  actor?: string;
  now?: string;
} = {}): TreasuryMutationResult {
  const ledger = loadCapitalLedger();
  const now = input.now ?? new Date().toISOString();
  const nowMs = Date.parse(now);
  let changed = false;
  ledger.venture_financial_commitments = persistedCommitments(ledger).map((row) => {
    if (row.status !== "AUTHORIZED" && row.status !== "COMMITTED" && row.status !== "PARTIALLY_SETTLED") return row;
    if (!row.expires_at || Date.parse(row.expires_at) > nowMs) return row;
    if (row.review_at && Date.parse(row.review_at) > nowMs) return row;
    changed = true;
    const remaining = commitmentRemaining(row);
    return {
      ...row,
      status: "EXPIRED" as const,
      cancelled_amount: row.cancelled_amount + remaining,
      remaining_commitment: 0,
      updated_at: now,
      state_transitions: [...row.state_transitions, transition(now, row.status, "EXPIRED", "COMMITMENT_EXPIRED")],
    };
  });
  if (!changed) {
    return { ok: true, ledger, gates: [] };
  }
  const ventures = [...new Set(ledger.venture_financial_commitments.map((row) => row.venture_id))];
  for (const ventureId of ventures) {
    syncAllocationCommitmentExposure(ledger, ventureId, now);
  }
  appendTreasuryAudit(ledger, "EXPIRE_VENTURE_FINANCIAL_COMMITMENT", input.actor ?? "treasury:commitment-expiration", {
    event: "COMMITMENT_EXPIRED",
    money_moved: false,
    changes_actual_spend: false,
  });
  return { ok: true, ledger: saveCapitalLedger(ledger), gates: [] };
}
