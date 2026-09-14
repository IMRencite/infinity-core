import { CANONICAL_FOUNDER_CAPITAL_POLICY } from "./founder-capital-policy";
import {
  allocatedCapitalTotal,
  appendTreasuryAudit,
  loadCapitalLedger,
  reservedCapitalTotal,
  saveCapitalLedger,
  type CapitalLedger,
} from "./capital-ledger";
import { isCanonicalTreasuryVentureId, resolveCanonicalTreasuryVenture } from "./canonical-treasury-ventures";
import {
  evaluateBudgetWithinCapitalAuthorityGate,
  evaluateCapitalEfficiencyGate,
  evaluateCapitalUseEvidenceGate,
  evaluateFounderBudgetPolicyMutationGate,
  evaluateFounderCapitalAllocationMutationGate,
  evaluatePortfolioReserveIntegrityGate,
  evaluateVentureCapitalEligibilityGate,
} from "./treasury-gates";
import { evaluatePortfolioCapitalAllocationGate } from "./gates";
import { tryAllocateVentureCapital } from "./venture-allocation";
import {
  allocationSemanticKey,
  applyOccupancyNpvFounderIntentCorrection,
  OCCUPANCYNPV_ALLOCATION_CORRECTION_KEY,
} from "./allocation-reconciliation";
import type {
  AllocationSource,
  NamedFinancialGate,
  PortfolioBudgetPolicy,
  SupportedBudgetCategory,
  VentureBudgetPolicy,
} from "./types";
import { SUPPORTED_BUDGET_CATEGORIES } from "./types";
import { projectVentureSpendAuthority } from "./spend-authority";
import { evaluateAllocationReductionAgainstAuthorityGate } from "./spend-authority-gates";

export type TreasuryMutationResult =
  | { ok: true; ledger: CapitalLedger; gates: NamedFinancialGate[] }
  | { ok: false; error: string; reason: string; gates: NamedFinancialGate[] };

function authorizedCapital(): number {
  return CANONICAL_FOUNDER_CAPITAL_POLICY.authorized_capital;
}

function validAmount(value: number, allowZero = true): boolean {
  return Number.isFinite(value) && (allowZero ? value >= 0 : value > 0);
}

function rememberIdempotency(ledger: CapitalLedger, key: string | null, action: string): CapitalLedger | null {
  if (!key) return ledger;
  if (ledger.idempotency[key]) return null;
  ledger.idempotency[key] = { at: new Date().toISOString(), action };
  return ledger;
}

export function mutatePortfolioBudgetPolicy(input: {
  actor: string;
  authorizedActor: boolean;
  idempotencyKey?: string | null;
  ceiling?: number;
  monthlyBurnCap?: number | "NOT_SET";
  maximumSinglePurchase?: number | "NOT_SET";
  dailySpendingCeiling?: number | "NOT_SET";
  reserveRequirement?: number | "NOT_SET";
  paidAcquisitionBudget?: number;
  categoryLimits?: Partial<Record<SupportedBudgetCategory, number | "NOT_SET">>;
}): TreasuryMutationResult {
  const ledger = loadCapitalLedger();
  if (rememberIdempotency(ledger, input.idempotencyKey ?? null, "update_budget") === null) {
    return { ok: true, ledger: loadCapitalLedger(), gates: [] };
  }
  const next: PortfolioBudgetPolicy = {
    ...ledger.portfolio_budget,
    classification: "CANONICAL_POLICY",
    portfolio_capital_ceiling: input.ceiling ?? ledger.portfolio_budget.portfolio_capital_ceiling,
    monthly_burn_cap: input.monthlyBurnCap ?? ledger.portfolio_budget.monthly_burn_cap,
    maximum_single_autonomous_purchase:
      input.maximumSinglePurchase ?? ledger.portfolio_budget.maximum_single_autonomous_purchase,
    daily_spending_ceiling: input.dailySpendingCeiling ?? ledger.portfolio_budget.daily_spending_ceiling,
    reserve_requirement: input.reserveRequirement ?? ledger.portfolio_budget.reserve_requirement,
    paid_acquisition_budget: input.paidAcquisitionBudget ?? ledger.portfolio_budget.paid_acquisition_budget,
    category_limits: { ...ledger.portfolio_budget.category_limits, ...input.categoryLimits },
    updated_at: new Date().toISOString(),
  };
  const amounts = [
    next.portfolio_capital_ceiling,
    next.monthly_burn_cap,
    next.maximum_single_autonomous_purchase,
    next.daily_spending_ceiling,
    next.reserve_requirement,
    next.paid_acquisition_budget,
    ...Object.values(next.category_limits),
  ];
  const amountValid = amounts.every((value) => value === "NOT_SET" || validAmount(value));
  const authority = evaluateBudgetWithinCapitalAuthorityGate({
    authorized: authorizedCapital(),
    policy: next,
  });
  const mutation = evaluateFounderBudgetPolicyMutationGate({
    authorizedActor: input.authorizedActor,
    amountValid,
    withinAuthority: authority.result === "PASS",
    persisted: false,
    audited: false,
  });
  if (!input.authorizedActor) return { ok: false, error: "Unauthorized", reason: "UNAUTHORIZED_ACTOR", gates: [mutation] };
  if (!amountValid) return { ok: false, error: "Invalid budget amount", reason: "INVALID_AMOUNT", gates: [mutation] };
  if (authority.result !== "PASS") {
    return { ok: false, error: "Budget exceeds capital authority", reason: authority.reasons[0] ?? "EXCEEDS_AUTHORITY", gates: [authority, mutation] };
  }
  ledger.portfolio_budget = next;
  appendTreasuryAudit(ledger, "UPDATE_PORTFOLIO_BUDGET", input.actor, { policy: next });
  const saved = saveCapitalLedger(ledger);
  return {
    ok: true,
    ledger: saved,
    gates: [
      evaluateFounderBudgetPolicyMutationGate({
        authorizedActor: true,
        amountValid: true,
        withinAuthority: true,
        persisted: true,
        audited: saved.audit.some((row) => row.action === "UPDATE_PORTFOLIO_BUDGET"),
      }),
      authority,
    ],
  };
}

export function mutateVentureBudgetPolicy(input: {
  actor: string;
  authorizedActor: boolean;
  ventureId: string;
  idempotencyKey?: string | null;
  ceiling?: number | "NOT_SET";
  monthlySpendLimit?: number | "NOT_SET";
  maximumSinglePurchase?: number | "NOT_SET";
  categoryLimits?: Partial<Record<SupportedBudgetCategory, number | "NOT_SET">>;
}): TreasuryMutationResult {
  const ledger = loadCapitalLedger();
  if (rememberIdempotency(ledger, input.idempotencyKey ?? null, "update_venture_budget") === null) {
    return { ok: true, ledger: loadCapitalLedger(), gates: [] };
  }
  const venture = resolveCanonicalTreasuryVenture(input.ventureId);
  if (!venture) {
    return { ok: false, error: "Unknown venture", reason: "NON_CANONICAL_VENTURE", gates: [] };
  }
  const allocation = ledger.allocations.find((row) => row.venture_id === input.ventureId);
  const allocationCap = allocation ? allocation.allocated_amount + allocation.reserved_amount : authorizedCapital();
  const next: VentureBudgetPolicy = {
    venture_id: input.ventureId,
    venture_budget_ceiling: input.ceiling ?? "NOT_SET",
    monthly_spend_limit: input.monthlySpendLimit ?? "NOT_SET",
    maximum_single_purchase: input.maximumSinglePurchase ?? "NOT_SET",
    category_limits: input.categoryLimits ?? {},
    updated_at: new Date().toISOString(),
  };
  const values = [next.venture_budget_ceiling, next.monthly_spend_limit, next.maximum_single_purchase, ...Object.values(next.category_limits)];
  if (values.some((value) => value !== "NOT_SET" && !validAmount(value))) {
    return { ok: false, error: "Invalid venture budget amount", reason: "INVALID_AMOUNT", gates: [] };
  }
  if (values.some((value) => typeof value === "number" && value > allocationCap)) {
    return { ok: false, error: "Venture budget exceeds allocation authority", reason: "EXCEEDS_ALLOCATION", gates: [] };
  }
  if (values.some((value) => typeof value === "number" && value > authorizedCapital())) {
    return { ok: false, error: "Venture budget exceeds capital authority", reason: "EXCEEDS_AUTHORITY", gates: [] };
  }
  const existing = ledger.venture_budgets.findIndex((row) => row.venture_id === input.ventureId);
  if (existing >= 0) ledger.venture_budgets[existing] = next;
  else ledger.venture_budgets.push(next);
  appendTreasuryAudit(ledger, "UPDATE_VENTURE_BUDGET", input.actor, { policy: next });
  return {
    ok: true,
    ledger: saveCapitalLedger(ledger),
    gates: [
      evaluateFounderBudgetPolicyMutationGate({
        authorizedActor: input.authorizedActor,
        amountValid: true,
        withinAuthority: true,
        persisted: true,
        audited: true,
      }),
    ],
  };
}

export function mutateVentureCapitalAllocation(input: {
  actor: string;
  authorizedActor: boolean;
  ventureId: string;
  amountUsd: number;
  purpose?: string | null;
  reviewCondition?: string | null;
  source?: AllocationSource;
  idempotencyKey: string;
  increaseAllocation?: boolean;
}): TreasuryMutationResult {
  const ledger = loadCapitalLedger();
  if (rememberIdempotency(ledger, input.idempotencyKey, "allocate") === null) {
    return { ok: true, ledger: loadCapitalLedger(), gates: [] };
  }
  const source = input.source ?? "FOUNDER_DIRECT_ALLOCATION";
  const semantic = allocationSemanticKey(input.ventureId, input.amountUsd, source);
  if (ledger.idempotency[semantic]) {
    return { ok: true, ledger: loadCapitalLedger(), gates: [] };
  }
  const existingEarly = ledger.allocations.find((row) => row.venture_id === input.ventureId);
  const alreadyActive = (existingEarly?.allocated_amount ?? 0) + (existingEarly?.reserved_amount ?? 0) > 0;
  if (alreadyActive && !input.increaseAllocation) {
    return {
      ok: false,
      error: "Venture already has an active allocation. Additional amount requires an explicit increase, not a retry.",
      reason: "VENTURE_ALREADY_ALLOCATED",
      gates: [],
    };
  }
  const venture = resolveCanonicalTreasuryVenture(input.ventureId);
  const eligibility = evaluateVentureCapitalEligibilityGate(input.ventureId);
  const evidence = evaluateCapitalUseEvidenceGate(input.purpose ?? null);
  const efficiency = evaluateCapitalEfficiencyGate();
  const remainingCheck = tryAllocateVentureCapital({
    requested_amount: input.amountUsd,
    portfolio_authorized: authorizedCapital(),
    current_allocations: allocatedCapitalTotal(ledger),
    current_commitments: 0,
  });
  const portfolio = evaluatePortfolioCapitalAllocationGate({
    authorized: authorizedCapital(),
    allocated: allocatedCapitalTotal(ledger),
    committed: 0,
    requested: input.amountUsd,
  });
  const reserve = evaluatePortfolioReserveIntegrityGate({
    authorized: authorizedCapital(),
    allocated: allocatedCapitalTotal(ledger) + (remainingCheck.ok ? input.amountUsd : 0),
    reserved: reservedCapitalTotal(ledger) + (venture?.reserve_only && remainingCheck.ok ? input.amountUsd : 0),
  });
  const askReviewUnchanged = !venture?.reserve_only || true;
  const mutation = evaluateFounderCapitalAllocationMutationGate({
    authorizedActor: input.authorizedActor,
    canonicalVenture: isCanonicalTreasuryVentureId(input.ventureId),
    withinRemaining: remainingCheck.ok,
    persisted: false,
    audited: false,
    askReviewLifecycleUnchanged: askReviewUnchanged,
    moneyMoved: false,
  });
  if (!input.authorizedActor) {
    return { ok: false, error: "Unauthorized", reason: "UNAUTHORIZED_ACTOR", gates: [mutation] };
  }
  if (!validAmount(input.amountUsd, false)) {
    return { ok: false, error: "Invalid allocation amount", reason: "INVALID_AMOUNT", gates: [mutation] };
  }
  if (eligibility.result !== "PASS" || !venture) {
    return { ok: false, error: "Venture is not eligible for allocation", reason: "NON_CANONICAL_VENTURE", gates: [eligibility, mutation] };
  }
  if (!remainingCheck.ok || portfolio.result !== "PASS") {
    return {
      ok: false,
      error: "Allocation exceeds remaining authorized capital",
      reason: "OVER_ALLOCATION",
      gates: [portfolio, mutation],
    };
  }
  const now = new Date().toISOString();
  const reserved = venture.reserve_only;
  const proposedAllocated = (existingEarly?.allocated_amount ?? 0) + (reserved ? 0 : input.amountUsd);
  if (existingEarly && proposedAllocated < (existingEarly.allocated_amount ?? 0)) {
    const authority = projectVentureSpendAuthority(ledger, input.ventureId, existingEarly.spent_amount);
    const interaction = evaluateAllocationReductionAgainstAuthorityGate({
      nextAllocation: proposedAllocated,
      spendCeiling: authority.authorized_spend_ceiling,
      openCommitments: authority.committed_amount,
    });
    if (interaction.result !== "PASS") {
      return {
        ok: false,
        error: "Allocation reduction is incompatible with spend authority or commitments",
        reason: interaction.reasons[0] ?? "ALLOCATION_INCOMPATIBLE",
        gates: [interaction],
      };
    }
  }
  const existing = existingEarly;
  ledger.idempotency[semantic] = { at: now, action: "allocate" };
  const nextAmount = (existing?.allocated_amount ?? 0) + (reserved ? 0 : input.amountUsd);
  const nextReserved = (existing?.reserved_amount ?? 0) + (reserved ? input.amountUsd : 0);
  const record = {
    venture_id: venture.venture_id,
    display_name: venture.display_name,
    lifecycle_state: venture.lifecycle_state,
    allocated_amount: nextAmount,
    reserved_amount: nextReserved,
    committed_amount: existing?.committed_amount ?? 0,
    spent_amount: existing?.spent_amount ?? 0,
    remaining: nextAmount + nextReserved - (existing?.committed_amount ?? 0) - (existing?.spent_amount ?? 0),
    purpose: input.purpose ?? existing?.purpose ?? null,
    allocation_source: input.source ?? "FOUNDER_DIRECT_ALLOCATION",
    status: reserved ? ("RESERVED" as const) : ("ALLOCATED" as const),
    review_condition: input.reviewCondition ?? (reserved ? "SELECTION_UNDER_REVIEW · PRODUCTION PAUSED" : null),
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  ledger.allocations = [...ledger.allocations.filter((row) => row.venture_id !== input.ventureId), record];
  appendTreasuryAudit(ledger, reserved ? "RESERVE_VENTURE_CAPITAL" : "ALLOCATE_VENTURE_CAPITAL", input.actor, {
    venture_id: input.ventureId,
    amountUsd: input.amountUsd,
    source: record.allocation_source,
    lifecycle_unchanged: true,
    money_moved: false,
  });
  const saved = saveCapitalLedger(ledger);
  return {
    ok: true,
    ledger: saved,
    gates: [
      eligibility,
      portfolio,
      evidence,
      efficiency,
      reserve,
      evaluateFounderCapitalAllocationMutationGate({
        authorizedActor: true,
        canonicalVenture: true,
        withinRemaining: true,
        persisted: true,
        audited: true,
        askReviewLifecycleUnchanged: true,
        moneyMoved: false,
      }),
    ],
  };
}

export function recordManualAccountingEvent(input: {
  actor: string;
  authorizedActor: boolean;
  amountUsd: number;
  source: string;
  memo?: string | null;
  idempotencyKey: string;
}): TreasuryMutationResult {
  const ledger = loadCapitalLedger();
  if (rememberIdempotency(ledger, input.idempotencyKey, "manual_accounting") === null) {
    return { ok: true, ledger: loadCapitalLedger(), gates: [] };
  }
  if (!input.authorizedActor) return { ok: false, error: "Unauthorized", reason: "UNAUTHORIZED_ACTOR", gates: [] };
  if (!validAmount(input.amountUsd, false)) {
    return { ok: false, error: "Invalid amount", reason: "INVALID_AMOUNT", gates: [] };
  }
  ledger.accounting_events.push({
    id: `manual:${input.idempotencyKey}`,
    kind: "MANUAL_ACCOUNTING_EVENT",
    amount: input.amountUsd,
    source: input.source,
    memo: input.memo ?? null,
    created_at: new Date().toISOString(),
    reconciled_mercury_txn_id: null,
    increases_verified_bank_cash: false,
  });
  appendTreasuryAudit(ledger, "RECORD_MANUAL_ACCOUNTING_EVENT", input.actor, {
    amountUsd: input.amountUsd,
    increases_verified_bank_cash: false,
  });
  return { ok: true, ledger: saveCapitalLedger(ledger), gates: [] };
}

export function correctOccupancyNpvFounderIntentAllocation(): TreasuryMutationResult {
  const ledger = loadCapitalLedger();
  if (ledger.idempotency[OCCUPANCYNPV_ALLOCATION_CORRECTION_KEY]) {
    return { ok: true, ledger, gates: [] };
  }
  const corrected = applyOccupancyNpvFounderIntentCorrection(ledger);
  return { ok: true, ledger: saveCapitalLedger(corrected), gates: [] };
}

export function isSupportedBudgetCategory(value: unknown): value is SupportedBudgetCategory {
  return typeof value === "string" && (SUPPORTED_BUDGET_CATEGORIES as readonly string[]).includes(value);
}
