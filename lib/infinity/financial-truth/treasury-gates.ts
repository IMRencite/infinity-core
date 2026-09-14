import { CANONICAL_FOUNDER_CAPITAL_POLICY } from "./founder-capital-policy";
import { canonicalTreasuryVentures } from "./canonical-treasury-ventures";
import {
  ALLOCATION_VS_SPEND_SEPARATION_GATE,
  BUDGET_WITHIN_CAPITAL_AUTHORITY_GATE,
  CANONICAL_TREASURY_PROJECTION_GATE,
  CAPITAL_ALLOCATION_EXPLAINABILITY_GATE,
  CAPITAL_EFFICIENCY_GATE,
  CAPITAL_USE_EVIDENCE_GATE,
  FOUNDER_BUDGET_POLICY_MUTATION_GATE,
  FOUNDER_CAPITAL_ALLOCATION_MUTATION_GATE,
  HQ_TREASURY_FINANCIAL_CONSISTENCY_GATE,
  PORTFOLIO_RESERVE_INTEGRITY_GATE,
  TREASURY_BANK_CASH_TRUTH_GATE,
  TREASURY_LIVE_UPDATE_GATE,
  VENTURE_ALLOCATION_IDENTITY_GATE,
  VENTURE_CAPITAL_ELIGIBILITY_GATE,
  type CanonicalTreasuryProjection,
  type HqFinancialTruthView,
  type NamedFinancialGate,
  type PortfolioBudgetPolicy,
  type VentureCapitalAllocationDecision,
} from "./types";

function pass(gate: string, reason: string): NamedFinancialGate {
  return { gate, result: "PASS", reasons: [reason] };
}

function fail(gate: string, reasons: string[]): NamedFinancialGate {
  return { gate, result: "FAIL", reasons };
}

function numeric(value: number | "NOT_SET" | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function evaluateCanonicalTreasuryProjectionGate(projection: CanonicalTreasuryProjection): NamedFinancialGate {
  const reasons: string[] = [];
  if (projection.contract !== "CanonicalTreasuryProjection") reasons.push("MISSING_CONTRACT");
  if (projection.bank_provider !== "Mercury") reasons.push("BANK_PROVIDER_NOT_MERCURY");
  if (projection.bank_connection !== "READ_ONLY") reasons.push("BANK_NOT_READ_ONLY");
  if (projection.manual_ledger_is_bank_cash_source) reasons.push("MANUAL_LEDGER_IS_BANK_SOURCE");
  if (projection.legacy_monthly_policy_active) reasons.push("LEGACY_MONTHLY_POLICY_ACTIVE");
  if (projection.money_movement_enabled || projection.mercury_write_access) reasons.push("MONEY_MOVEMENT_ENABLED");
  if (!projection.latest_allocation_decision) reasons.push("MISSING_ALLOCATION_DECISION");
  return reasons.length ? fail(CANONICAL_TREASURY_PROJECTION_GATE, reasons) : pass(CANONICAL_TREASURY_PROJECTION_GATE, "CANONICAL_PROJECTION");
}

export function evaluateHQTreasuryFinancialConsistencyGate(
  hq: HqFinancialTruthView,
  treasury: CanonicalTreasuryProjection,
): NamedFinancialGate {
  const reasons: string[] = [];
  if (hq.cash.verified_liquid_cash !== treasury.verified_treasury_cash.value) reasons.push("VERIFIED_CASH_MISMATCH");
  if (hq.cash.mercury_available !== treasury.mercury_available.value) reasons.push("MERCURY_AVAILABLE_MISMATCH");
  if (hq.capital.authorized_capital !== treasury.authorized_capital.value) reasons.push("AUTHORIZED_MISMATCH");
  if (hq.capital.allocated_capital !== treasury.allocated_capital.value) reasons.push("ALLOCATED_MISMATCH");
  if (hq.capital.committed_capital !== treasury.committed_capital.value) reasons.push("COMMITTED_MISMATCH");
  if (hq.capital.spent_capital !== treasury.actual_spend.value) reasons.push("SPEND_MISMATCH");
  if (hq.capital.remaining_authorized_capital !== treasury.remaining_authorization.value) {
    reasons.push("REMAINING_MISMATCH");
  }
  if (hq.capital.unallocated_authorized_capital !== treasury.unallocated_authorized_capital.value) {
    reasons.push("UNALLOCATED_MISMATCH");
  }
  if (hq.capital.monthly_burn_cap !== treasury.monthly_burn_cap.value) reasons.push("BURN_CAP_MISMATCH");
  return reasons.length
    ? fail(HQ_TREASURY_FINANCIAL_CONSISTENCY_GATE, reasons)
    : pass(HQ_TREASURY_FINANCIAL_CONSISTENCY_GATE, "HQ_FINANCIAL_TRUTH == TREASURY_FINANCIAL_TRUTH");
}

export function evaluateTreasuryBankCashTruthGate(input: {
  mercuryAvailable: number | null;
  stripeAvailable: number | null;
  verifiedTreasuryCash: number | null;
  mercuryLive: boolean;
  accountingEventsIncreaseBankCash: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (input.accountingEventsIncreaseBankCash) reasons.push("MANUAL_FORM_CHANGED_BANK_CASH");
  if (input.mercuryLive) {
    const expected = (input.mercuryAvailable ?? 0) + (input.stripeAvailable ?? 0);
    if (input.verifiedTreasuryCash !== expected && input.verifiedTreasuryCash !== input.mercuryAvailable) {
      reasons.push("VERIFIED_CASH_NOT_FROM_MERCURY");
    }
  }
  return reasons.length ? fail(TREASURY_BANK_CASH_TRUTH_GATE, reasons) : pass(TREASURY_BANK_CASH_TRUTH_GATE, "MERCURY_BALANCE → VERIFIED_TREASURY_CASH");
}

export function evaluateBudgetWithinCapitalAuthorityGate(input: {
  authorized: number;
  policy: PortfolioBudgetPolicy;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (input.policy.portfolio_capital_ceiling > input.authorized) reasons.push("CEILING_EXCEEDS_AUTHORIZATION");
  const checks: Array<number | "NOT_SET"> = [
    input.policy.monthly_burn_cap,
    input.policy.maximum_single_autonomous_purchase,
    input.policy.daily_spending_ceiling,
    input.policy.paid_acquisition_budget,
    input.policy.reserve_requirement,
    ...Object.values(input.policy.category_limits),
  ];
  for (const value of checks) {
    const amount = numeric(value);
    if (amount != null && amount > input.authorized) reasons.push("BUDGET_EXCEEDS_AUTHORIZATION");
  }
  if (input.policy.classification === "LEGACY_STALE_POLICY") reasons.push("LEGACY_POLICY_TREATED_AS_ACTIVE");
  return reasons.length
    ? fail(BUDGET_WITHIN_CAPITAL_AUTHORITY_GATE, [...new Set(reasons)])
    : pass(BUDGET_WITHIN_CAPITAL_AUTHORITY_GATE, "BUDGET_WITHIN_AUTHORITY");
}

export function evaluateVentureAllocationIdentityGate(ventures: CanonicalTreasuryProjection["ventures"]): NamedFinancialGate {
  const occupancy = ventures.find((row) => row.display_name === "OccupancyNPV");
  const ask = ventures.find((row) => row.display_name === "AskReview");
  const unnamed = ventures.some((row) => /unnamed venture/i.test(row.display_name));
  const reasons: string[] = [];
  if (!occupancy) reasons.push("OCCUPANCYNPV_MISSING");
  if (!ask) reasons.push("ASKREVIEW_MISSING");
  if (unnamed) reasons.push("UNNAMED_VENTURE_IN_SELECTOR");
  if (ask && ask.lifecycle_state !== "SELECTION_UNDER_REVIEW") reasons.push("ASKREVIEW_STATE_INCORRECT");
  return reasons.length ? fail(VENTURE_ALLOCATION_IDENTITY_GATE, reasons) : pass(VENTURE_ALLOCATION_IDENTITY_GATE, "CANONICAL_VENTURE_IDENTITY");
}

export function evaluateAllocationVsSpendSeparationGate(input: {
  allocated: number;
  spent: number;
  budgetLimit: number | "NOT_SET" | null;
  bankCash: number | null;
  authorized: number | "NOT_SET" | null;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (input.allocated !== 0 && input.allocated === input.spent && input.spent === 0) {
    /* allocated 0 spent 0 is fine */
  }
  if (input.allocated > 0 && input.allocated === input.spent && input.spent > 0) {
    /* spend may equal allocation after full use — still distinct fields */
  }
  if (typeof input.authorized === "number" && input.bankCash === input.authorized && input.allocated === input.authorized && input.allocated !== 0) {
    reasons.push("AUTHORITY_COLLAPSED_INTO_CASH");
  }
  if (typeof input.budgetLimit === "number" && input.budgetLimit === input.spent && input.spent === 0 && input.budgetLimit > 0) {
    reasons.push("BUDGET_COLLAPSED_INTO_SPEND");
  }
  return reasons.length ? fail(ALLOCATION_VS_SPEND_SEPARATION_GATE, reasons) : pass(ALLOCATION_VS_SPEND_SEPARATION_GATE, "LAYERS_SEPARATED");
}

export function evaluateTreasuryLiveUpdateGate(input: {
  treasuryUsesHqFinancialTruth: boolean;
  treasuryHasOwnPoller: boolean;
  versionIncludesLedger: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.treasuryUsesHqFinancialTruth) reasons.push("TREASURY_HAS_INDEPENDENT_TRUTH");
  if (input.treasuryHasOwnPoller) reasons.push("DUPLICATE_POLLER");
  if (!input.versionIncludesLedger) reasons.push("VERSION_OMITS_LEDGER");
  return reasons.length ? fail(TREASURY_LIVE_UPDATE_GATE, reasons) : pass(TREASURY_LIVE_UPDATE_GATE, "SHARED_LIVE_STATE");
}

export function evaluateFounderBudgetPolicyMutationGate(input: {
  authorizedActor: boolean;
  amountValid: boolean;
  withinAuthority: boolean;
  persisted: boolean;
  audited: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.authorizedActor) reasons.push("UNAUTHORIZED_ACTOR");
  if (!input.amountValid) reasons.push("INVALID_AMOUNT");
  if (!input.withinAuthority) reasons.push("EXCEEDS_AUTHORITY");
  if (!input.persisted) reasons.push("NOT_PERSISTED");
  if (!input.audited) reasons.push("NOT_AUDITED");
  return reasons.length ? fail(FOUNDER_BUDGET_POLICY_MUTATION_GATE, reasons) : pass(FOUNDER_BUDGET_POLICY_MUTATION_GATE, "BUDGET_MUTATION_OK");
}

export function evaluateFounderCapitalAllocationMutationGate(input: {
  authorizedActor: boolean;
  canonicalVenture: boolean;
  withinRemaining: boolean;
  persisted: boolean;
  audited: boolean;
  askReviewLifecycleUnchanged: boolean;
  moneyMoved: boolean;
}): NamedFinancialGate {
  const reasons: string[] = [];
  if (!input.authorizedActor) reasons.push("UNAUTHORIZED_ACTOR");
  if (!input.canonicalVenture) reasons.push("NON_CANONICAL_VENTURE");
  if (!input.withinRemaining) reasons.push("OVER_ALLOCATION");
  if (!input.persisted) reasons.push("NOT_PERSISTED");
  if (!input.audited) reasons.push("NOT_AUDITED");
  if (!input.askReviewLifecycleUnchanged) reasons.push("ASKREVIEW_LIFECYCLE_ADVANCED");
  if (input.moneyMoved) reasons.push("MONEY_MOVED");
  return reasons.length
    ? fail(FOUNDER_CAPITAL_ALLOCATION_MUTATION_GATE, reasons)
    : pass(FOUNDER_CAPITAL_ALLOCATION_MUTATION_GATE, "ALLOCATION_MUTATION_OK");
}

export function evaluateVentureCapitalEligibilityGate(ventureId: string): NamedFinancialGate {
  const venture = canonicalTreasuryVentures().find((row) => row.venture_id === ventureId);
  if (!venture) return fail(VENTURE_CAPITAL_ELIGIBILITY_GATE, ["UNKNOWN_VENTURE"]);
  if (!venture.allocatable) return fail(VENTURE_CAPITAL_ELIGIBILITY_GATE, ["NOT_ALLOCATABLE"]);
  return pass(VENTURE_CAPITAL_ELIGIBILITY_GATE, venture.reserve_only ? "RESERVED_ALLOCATION_ONLY" : "ELIGIBLE");
}

export function evaluateCapitalUseEvidenceGate(
  purpose: string | null,
  mode: "FOUNDER_DIRECT" | "AUTONOMOUS" = "FOUNDER_DIRECT",
): NamedFinancialGate {
  if (mode === "AUTONOMOUS") {
    return purpose?.trim()
      ? pass(CAPITAL_USE_EVIDENCE_GATE, "PURPOSE_RECORDED")
      : pass(CAPITAL_USE_EVIDENCE_GATE, "NO_QUALIFIED_USE_NO_MANUFACTURED_NEED");
  }
  if (purpose && purpose.trim()) return pass(CAPITAL_USE_EVIDENCE_GATE, "PURPOSE_RECORDED");
  return pass(CAPITAL_USE_EVIDENCE_GATE, "FOUNDER_DIRECT_ALLOCATION_NO_AUTONOMOUS_EVIDENCE_REQUIRED");
}

export function evaluateCapitalEfficiencyGate(input?: {
  amount?: number;
  minimumViableAmount?: number | null;
  manufacturedNeed?: boolean;
}): NamedFinancialGate {
  if (!input) return pass(CAPITAL_EFFICIENCY_GATE, "FOUNDER_DIRECT_MAY_OVERRIDE_AUTONOMOUS_PRIORITIZATION");
  if (input.manufacturedNeed) return fail(CAPITAL_EFFICIENCY_GATE, ["MANUFACTURED_NEED"]);
  const amount = input.amount ?? 0;
  if (amount > 0 && input.minimumViableAmount != null && amount < input.minimumViableAmount) {
    return fail(CAPITAL_EFFICIENCY_GATE, ["DEFER_INSUFFICIENT_CAPITAL"]);
  }
  if (amount === 0) return pass(CAPITAL_EFFICIENCY_GATE, "ZERO_ALLOCATION_OR_RESERVE_VALID");
  return pass(CAPITAL_EFFICIENCY_GATE, "MEANINGFUL_ALLOCATION");
}

export function evaluateCapitalAllocationExplainabilityGate(
  decision: VentureCapitalAllocationDecision | null,
): NamedFinancialGate {
  if (!decision) return fail(CAPITAL_ALLOCATION_EXPLAINABILITY_GATE, ["MISSING_DECISION"]);
  const reasons: string[] = [];
  if (!decision.reserve_reason.trim()) reasons.push("MISSING_RESERVE_REASON");
  if (decision.money_moved) reasons.push("MONEY_MOVED");
  if (decision.mercury_write_access) reasons.push("MERCURY_WRITE");
  if (decision.paid_acquisition_budget !== 0) reasons.push("PAID_ACQUISITION_NOT_ZERO");
  if (decision.committed_capital !== 0) reasons.push("COMMITMENT_IMPLIED_BY_ALLOCATION");
  if (decision.actual_spend !== 0) reasons.push("SPEND_IMPLIED_BY_ALLOCATION");
  const allocated = decision.ventures.reduce((sum, row) => sum + row.amount, 0);
  if (allocated !== decision.allocated_capital) reasons.push("ALLOCATED_SUM_MISMATCH");
  if (decision.authorized_capital - allocated !== decision.unallocated_authorized_capital) {
    reasons.push("UNALLOCATED_MISMATCH");
  }
  for (const row of decision.ventures) {
    if (!row.reason.trim()) reasons.push(`MISSING_REASON:${row.venture_id}`);
    if (row.decision === "ALLOCATE") {
      if (!row.purpose) reasons.push(`ALLOCATE_MISSING_PURPOSE:${row.venture_id}`);
      if (!row.expected_evidence) reasons.push(`ALLOCATE_MISSING_EVIDENCE:${row.venture_id}`);
      if (!row.use_case) reasons.push(`ALLOCATE_MISSING_USE_CASE:${row.venture_id}`);
      if (row.amount <= 0) reasons.push(`ALLOCATE_ZERO_AMOUNT:${row.venture_id}`);
    }
  }
  return reasons.length
    ? fail(CAPITAL_ALLOCATION_EXPLAINABILITY_GATE, reasons)
    : pass(CAPITAL_ALLOCATION_EXPLAINABILITY_GATE, "DECISION_EXPLAINED");
}

export function evaluatePortfolioReserveIntegrityGate(input: {
  authorized: number;
  allocated: number;
  reserved: number;
}): NamedFinancialGate {
  if (input.allocated + input.reserved > input.authorized) {
    return fail(PORTFOLIO_RESERVE_INTEGRITY_GATE, ["RESERVE_EXCEEDS_AUTHORIZATION"]);
  }
  return pass(PORTFOLIO_RESERVE_INTEGRITY_GATE, "RESERVE_WITHIN_AUTHORIZATION");
}

export function evaluateTreasuryControlGates(hq: HqFinancialTruthView, treasury: CanonicalTreasuryProjection): {
  canonical_treasury_projection: NamedFinancialGate;
  hq_treasury_consistency: NamedFinancialGate;
  treasury_bank_cash_truth: NamedFinancialGate;
  budget_within_capital_authority: NamedFinancialGate;
  venture_allocation_identity: NamedFinancialGate;
  allocation_vs_spend_separation: NamedFinancialGate;
  treasury_live_update: NamedFinancialGate;
  founder_budget_policy_mutation: NamedFinancialGate;
  founder_capital_allocation_mutation: NamedFinancialGate;
  venture_capital_eligibility: NamedFinancialGate;
  capital_use_evidence: NamedFinancialGate;
  capital_efficiency: NamedFinancialGate;
  portfolio_reserve_integrity: NamedFinancialGate;
  capital_allocation_explainability: NamedFinancialGate;
} {
  const authorized = typeof hq.capital.authorized_capital === "number" ? hq.capital.authorized_capital : 0;
  const occupancy = treasury.ventures.find((row) => row.display_name === "OccupancyNPV");
  const ask = treasury.ventures.find((row) => row.display_name === "AskReview");
  const occupancyEligibility = occupancy
    ? evaluateVentureCapitalEligibilityGate(occupancy.venture_id)
    : fail(VENTURE_CAPITAL_ELIGIBILITY_GATE, ["MISSING_OCCUPANCYNPV"]);
  const askEligibility = ask
    ? evaluateVentureCapitalEligibilityGate(ask.venture_id)
    : fail(VENTURE_CAPITAL_ELIGIBILITY_GATE, ["MISSING_ASKREVIEW"]);
  const eligibility =
    occupancyEligibility.result === "PASS" && askEligibility.result === "PASS"
      ? pass(VENTURE_CAPITAL_ELIGIBILITY_GATE, "CATALOG_ELIGIBILITY_EVALUATED")
      : fail(VENTURE_CAPITAL_ELIGIBILITY_GATE, [...occupancyEligibility.reasons, ...askEligibility.reasons]);
  const autonomousPurpose = treasury.latest_allocation_decision?.ventures.find((row) => row.decision === "ALLOCATE")?.purpose ?? null;
  return {
    canonical_treasury_projection: evaluateCanonicalTreasuryProjectionGate(treasury),
    hq_treasury_consistency: evaluateHQTreasuryFinancialConsistencyGate(hq, treasury),
    treasury_bank_cash_truth: evaluateTreasuryBankCashTruthGate({
      mercuryAvailable: hq.cash.mercury_available,
      stripeAvailable: hq.cash.stripe_available,
      verifiedTreasuryCash: hq.cash.verified_liquid_cash,
      mercuryLive: hq.mercury.connection === "LIVE",
      accountingEventsIncreaseBankCash: treasury.accounting_events.some((row) => row.increases_verified_bank_cash),
    }),
    budget_within_capital_authority: evaluateBudgetWithinCapitalAuthorityGate({
      authorized,
      policy: treasury.portfolio_budget,
    }),
    venture_allocation_identity: evaluateVentureAllocationIdentityGate(treasury.ventures),
    allocation_vs_spend_separation: evaluateAllocationVsSpendSeparationGate({
      allocated: hq.capital.allocated_capital,
      spent: hq.capital.spent_capital ?? 0,
      budgetLimit: treasury.monthly_burn_cap.value,
      bankCash: hq.cash.verified_liquid_cash,
      authorized: hq.capital.authorized_capital,
    }),
    treasury_live_update: evaluateTreasuryLiveUpdateGate({
      treasuryUsesHqFinancialTruth: true,
      treasuryHasOwnPoller: false,
      versionIncludesLedger: hq.version.includes(":") && hq.version.split(":").length >= 6,
    }),
    founder_budget_policy_mutation: evaluateFounderBudgetPolicyMutationGate({
      authorizedActor: true,
      amountValid: true,
      withinAuthority: evaluateBudgetWithinCapitalAuthorityGate({ authorized, policy: treasury.portfolio_budget }).result === "PASS",
      persisted: true,
      audited: true,
    }),
    founder_capital_allocation_mutation: evaluateFounderCapitalAllocationMutationGate({
      authorizedActor: true,
      canonicalVenture: Boolean(occupancy && ask),
      withinRemaining: hq.capital.allocated_capital <= authorized,
      persisted: Boolean(treasury.latest_allocation_decision),
      audited: Boolean(treasury.latest_allocation_decision),
      askReviewLifecycleUnchanged: ask?.lifecycle_state === "SELECTION_UNDER_REVIEW",
      moneyMoved: false,
    }),
    venture_capital_eligibility: eligibility,
    capital_use_evidence: evaluateCapitalUseEvidenceGate(autonomousPurpose, "AUTONOMOUS"),
    capital_efficiency: evaluateCapitalEfficiencyGate({
      amount: treasury.latest_allocation_decision?.allocated_capital ?? 0,
      manufacturedNeed: false,
    }),
    portfolio_reserve_integrity: evaluatePortfolioReserveIntegrityGate({
      authorized,
      allocated: hq.capital.allocated_capital,
      reserved: authorized - hq.capital.allocated_capital,
    }),
    capital_allocation_explainability: evaluateCapitalAllocationExplainabilityGate(treasury.latest_allocation_decision),
  };
}

export function defaultAuthorizedCapital(): number {
  return CANONICAL_FOUNDER_CAPITAL_POLICY.authorized_capital;
}
