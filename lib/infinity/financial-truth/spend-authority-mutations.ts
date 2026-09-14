import { isCanonicalTreasuryVentureId, resolveCanonicalTreasuryVenture } from "./canonical-treasury-ventures";
import {
  appendTreasuryAudit,
  loadCapitalLedger,
  saveCapitalLedger,
  type CapitalLedger,
} from "./capital-ledger";
import type { TreasuryMutationResult } from "./treasury-mutations";
import {
  calculateSpendAuthorityMath,
  FOUNDER_VENTURE_SPEND_AUTHORITY_MUTATION,
  isGovernedSpendCategory,
  isPaidAcquisitionCategory,
  persistedCommitments,
  projectVentureSpendAuthority,
  VENTURE_FINANCIAL_COMMITMENT_CONTRACT,
  VENTURE_SPEND_AUTHORITY_CONTRACT,
  type GovernedSpendCategory,
  type SpendAuthorizationSource,
  type VentureFinancialCommitment,
  type VentureSpendAuthority,
} from "./spend-authority";
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

export function createVentureFinancialCommitment(input: {
  actor: string;
  authorizedActor: boolean;
  ventureId: string;
  amountUsd: number;
  category: unknown;
  purpose?: string | null;
  vendor?: string | null;
  provider?: string | null;
  idempotencyKey: string;
}): TreasuryMutationResult {
  const ledger = loadCapitalLedger();
  if (rememberIdempotency(ledger, input.idempotencyKey, "create_commitment") === null) {
    return { ok: true, ledger: loadCapitalLedger(), gates: [] };
  }
  if (!input.authorizedActor) {
    return { ok: false, error: "Unauthorized", reason: "UNAUTHORIZED_ACTOR", gates: [] };
  }
  const authority = projectVentureSpendAuthority(ledger, input.ventureId);
  const ads = evaluatePaidAcquisitionAuthorityGate({
    generalAuthority: authority.effective_spend_authority,
    paidAcquisitionAuthority: 0,
    requestedCategory: input.category,
  });
  const within = evaluateCommitmentWithinSpendAuthorityGate({
    remainingAuthority: authority.remaining_spend_authority,
    requestedAmount: input.amountUsd,
    category: input.category,
  });
  if (authority.status === "NOT_SET" || authority.effective_spend_authority <= 0) {
    return { ok: false, error: "Spend authority required before commitment", reason: "SPEND_AUTHORITY_REQUIRED", gates: [within] };
  }
  if (ads.result !== "PASS") {
    return { ok: false, error: "Paid acquisition is not authorized", reason: "PAID_ACQUISITION_BLOCKED", gates: [ads] };
  }
  if (within.result !== "PASS") {
    return { ok: false, error: "Commitment exceeds remaining spend authority", reason: within.reasons[0] ?? "EXCEEDS_REMAINING_AUTHORITY", gates: [within] };
  }
  const now = new Date().toISOString();
  const commitment: VentureFinancialCommitment = {
    contract: VENTURE_FINANCIAL_COMMITMENT_CONTRACT,
    commitment_id: `commitment:${input.idempotencyKey}`,
    venture_id: input.ventureId,
    amount: input.amountUsd,
    currency: "USD",
    category: input.category as VentureFinancialCommitment["category"],
    vendor: input.vendor ?? null,
    provider: input.provider ?? null,
    purpose: input.purpose ?? null,
    status: "OPEN",
    created_at: now,
    authorized_by: input.actor,
    spend_authority_id: authority.id,
    idempotency_key: input.idempotencyKey,
    external_reference: null,
    settled_amount: 0,
    cancelled_amount: 0,
    remaining_commitment: input.amountUsd,
    money_moved: false,
  };
  ledger.venture_financial_commitments = [...ledger.venture_financial_commitments, commitment];
  const allocation = ledger.allocations.find((row) => row.venture_id === input.ventureId);
  if (allocation) {
    allocation.committed_amount = authority.committed_amount + input.amountUsd;
    allocation.remaining = allocation.allocated_amount + allocation.reserved_amount - allocation.committed_amount - allocation.spent_amount;
    allocation.updated_at = now;
  }
  appendTreasuryAudit(ledger, "CREATE_VENTURE_FINANCIAL_COMMITMENT", input.actor, {
    venture_id: input.ventureId,
    amountUsd: input.amountUsd,
    category: input.category,
    money_moved: false,
    changes_actual_spend: false,
  });
  return { ok: true, ledger: saveCapitalLedger(ledger), gates: [within, ads] };
}
