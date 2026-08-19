import { applyVentureAllocationIncrease } from "../allocations/venture";
import { createBudget, findMatchingBudget, knownValue, refreshBudgetAvailable } from "../budgets/engine";
import { INTERNAL_TREASURY_PROVIDER, type ManualFundingSource } from "../constants";
import { createFinancialActionRequest } from "../actions/engine";
import { recordCapitalContribution } from "../revenue/ingest";
import { composeTreasuryState } from "../state/compose";
import { sumLedger } from "../ledger/engine";
import type { TreasuryStore } from "../store";
import { actualAmount, type TreasuryBudget, type TreasuryLedgerEntry, type VentureCapitalAllocation } from "../types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function fundingSubtype(source: ManualFundingSource): "FOUNDER_CAPITAL" | "OPERATOR_CAPITAL" | "MANUAL_TREASURY_ADJUSTMENT" {
  if (source === "operator_funding") return "OPERATOR_CAPITAL";
  if (source === "manual_treasury_adjustment") return "MANUAL_TREASURY_ADJUSTMENT";
  return "FOUNDER_CAPITAL";
}

export function fundingSourceLabel(source: ManualFundingSource): string {
  if (source === "operator_funding") return "Operator funding";
  if (source === "manual_treasury_adjustment") return "Manual treasury adjustment";
  return "Founder contribution";
}

function syncGlobalBudgetToInternalCapital(store: TreasuryStore, organizationId: string): TreasuryBudget {
  const total = sumLedger(store, organizationId, "CAPITAL_CONTRIBUTION");
  const allocated = total.complete && total.amount.value != null ? total.amount : actualAmount(0);
  const existing = findMatchingBudget(store, organizationId, { scopeType: "GLOBAL" });
  if (!existing) {
    return createBudget(store, {
      scope: { scopeType: "GLOBAL", organizationId, currency: "USD" },
      allocated,
    });
  }
  existing.allocated = allocated;
  const next = refreshBudgetAvailable(existing);
  store.budgets.set(next.budgetId, next);
  return next;
}

export type ManualControlFailure =
  | "INVALID_AMOUNT"
  | "INVALID_VENTURE"
  | "AVAILABLE_UNKNOWN"
  | "INSUFFICIENT_AVAILABLE"
  | "CROSS_ORG_DENIED";

export function recordManualFunding(
  store: TreasuryStore,
  input: {
    organizationId: string;
    amountUsd: number;
    source: ManualFundingSource;
    memo?: string | null;
    idempotencyKey: string;
  },
): { ok: true; duplicate: boolean; entry: TreasuryLedgerEntry } | { ok: false; reason: ManualControlFailure } {
  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
    return { ok: false, reason: "INVALID_AMOUNT" };
  }

  const request = createFinancialActionRequest(store, {
    organizationId: input.organizationId,
    purpose: "Manual internal capital contribution",
    category: "OTHER",
    actionType: "OTHER",
    merchant: fundingSourceLabel(input.source),
    provider: INTERNAL_TREASURY_PROVIDER,
    amount: actualAmount(input.amountUsd),
    economicJustification: [
      "INTERNAL / MANUAL / NON-BANK funding. No bank transfer occurred.",
      input.memo?.trim() || null,
    ]
      .filter(Boolean)
      .join(" "),
    idempotencyKey: `treasury:manual-funding:request:${input.idempotencyKey}`,
  });
  request.status = "EXECUTED";
  store.requests.set(request.requestId, request);

  const ledgerKey = `treasury:manual-funding:ledger:${input.idempotencyKey}`;
  const prior = [...store.ledger.values()].find((entry) => entry.idempotencyKey === ledgerKey);
  const entry = recordCapitalContribution(store, {
    organizationId: input.organizationId,
    amountUsd: input.amountUsd,
    source: fundingSubtype(input.source),
    provider: INTERNAL_TREASURY_PROVIDER,
    financialActionRequestId: request.requestId,
    idempotencyKey: ledgerKey,
  });
  syncGlobalBudgetToInternalCapital(store, input.organizationId);
  return { ok: true, duplicate: Boolean(prior && prior.entryId === entry.entryId), entry };
}

export function allocateVentureCapital(
  store: TreasuryStore,
  input: {
    organizationId: string;
    ventureId: string;
    amountUsd: number;
    note?: string | null;
    idempotencyKey: string;
  },
): { ok: true; duplicate: boolean; allocation: VentureCapitalAllocation } | { ok: false; reason: ManualControlFailure } {
  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
    return { ok: false, reason: "INVALID_AMOUNT" };
  }
  if (!isUuid(input.ventureId)) {
    return { ok: false, reason: "INVALID_VENTURE" };
  }

  const existingRequest = store.findByIdempotency(
    input.organizationId,
    `treasury:manual-allocation:${input.idempotencyKey}`,
    store.requests,
  );
  if (existingRequest) {
    const allocation = [...store.allocations.values()].find(
      (row) => row.organizationId === input.organizationId && row.ventureId === input.ventureId,
    );
    if (allocation) return { ok: true, duplicate: true, allocation };
  }

  const available = knownValue(composeTreasuryState(store, { organizationId: input.organizationId }).availableCapital);
  if (available == null) return { ok: false, reason: "AVAILABLE_UNKNOWN" };
  if (input.amountUsd > available) return { ok: false, reason: "INSUFFICIENT_AVAILABLE" };

  const request = createFinancialActionRequest(store, {
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    purpose: "Manual venture capital allocation",
    category: "OTHER",
    actionType: "OTHER",
    merchant: "Internal allocation",
    provider: INTERNAL_TREASURY_PROVIDER,
    amount: actualAmount(input.amountUsd),
    economicJustification: input.note ?? "Allocation assigns internal capital. This is not spend and not revenue.",
    idempotencyKey: `treasury:manual-allocation:${input.idempotencyKey}`,
  });
  request.status = "EXECUTED";
  store.requests.set(request.requestId, request);

  const allocation = applyVentureAllocationIncrease(store, {
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    deltaUsd: input.amountUsd,
  });
  return { ok: true, duplicate: false, allocation };
}

export function updateVentureBudget(
  store: TreasuryStore,
  input: {
    organizationId: string;
    ventureId: string;
    amountUsd: number;
    period?: "MONTHLY" | "LIFETIME";
    category?: TreasuryBudget["scope"]["category"];
  },
): { ok: true; budget: TreasuryBudget } | { ok: false; reason: ManualControlFailure } {
  if (!Number.isFinite(input.amountUsd) || input.amountUsd < 0) {
    return { ok: false, reason: "INVALID_AMOUNT" };
  }
  if (!isUuid(input.ventureId)) {
    return { ok: false, reason: "INVALID_VENTURE" };
  }

  const scopeType = input.category ? "CATEGORY" : input.period === "MONTHLY" ? "MONTHLY" : "VENTURE";
  const existing = findMatchingBudget(store, input.organizationId, {
    scopeType,
    ventureId: input.ventureId,
    category: input.category ?? null,
    period: input.period === "MONTHLY" ? "MONTHLY" : null,
  });
  const allocated = actualAmount(input.amountUsd);
  if (!existing) {
    return {
      ok: true,
      budget: createBudget(store, {
        scope: {
          scopeType,
          organizationId: input.organizationId,
          ventureId: input.ventureId,
          category: input.category ?? null,
          period: input.period === "MONTHLY" ? "MONTHLY" : null,
          currency: "USD",
        },
        allocated,
      }),
    };
  }
  existing.allocated = allocated;
  const next = refreshBudgetAvailable(existing);
  store.budgets.set(next.budgetId, next);
  return { ok: true, budget: next };
}

export function manualControlFailureMessage(reason: ManualControlFailure): string {
  if (reason === "INVALID_AMOUNT") return "Enter a valid amount.";
  if (reason === "INVALID_VENTURE") return "Select a venture with a valid identifier.";
  if (reason === "AVAILABLE_UNKNOWN") return "Available capital is UNKNOWN. Record internal funding before allocating.";
  if (reason === "INSUFFICIENT_AVAILABLE") return "Allocation exceeds available internal capital.";
  return "Cross-organization access denied.";
}
