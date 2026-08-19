import { DEFAULT_CURRENCY } from "../constants";
import type { TreasuryBudgetCategory } from "../constants";
import { newId, nowIso, type TreasuryStore } from "../store";
import {
  actualAmount,
  unknownAmount,
  type BudgetReservation,
  type BudgetScope,
  type EpistemicAmount,
  type TreasuryBudget,
} from "../types";

export function computeAvailable(allocated: EpistemicAmount, spent: EpistemicAmount, reserved: EpistemicAmount, committed: EpistemicAmount): EpistemicAmount {
  const currency = allocated.currency || spent.currency || reserved.currency || committed.currency || DEFAULT_CURRENCY;
  if (
    allocated.actuality === "UNKNOWN" ||
    spent.actuality === "UNKNOWN" ||
    reserved.actuality === "UNKNOWN" ||
    committed.actuality === "UNKNOWN" ||
    allocated.value == null ||
    spent.value == null ||
    reserved.value == null ||
    committed.value == null
  ) {
    return unknownAmount(currency);
  }
  return {
    value: allocated.value - spent.value - reserved.value - committed.value,
    actuality: "ACTUAL",
    currency,
  };
}

export function refreshBudgetAvailable(budget: TreasuryBudget): TreasuryBudget {
  return {
    ...budget,
    available: computeAvailable(budget.allocated, budget.spent, budget.reserved, budget.committed),
    updatedAt: nowIso(),
  };
}

export function createBudget(
  store: TreasuryStore,
  input: {
    scope: BudgetScope;
    allocated: EpistemicAmount;
    spent?: EpistemicAmount;
    reserved?: EpistemicAmount;
    committed?: EpistemicAmount;
  },
): TreasuryBudget {
  const currency = input.scope.currency || DEFAULT_CURRENCY;
  const budget: TreasuryBudget = refreshBudgetAvailable({
    budgetId: newId(),
    scope: { ...input.scope, currency },
    allocated: input.allocated,
    spent: input.spent ?? actualAmount(0, currency),
    reserved: input.reserved ?? actualAmount(0, currency),
    committed: input.committed ?? actualAmount(0, currency),
    available: unknownAmount(currency),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  store.budgets.set(budget.budgetId, budget);
  return budget;
}

export function findMatchingBudget(
  store: TreasuryStore,
  organizationId: string,
  match: {
    scopeType: BudgetScope["scopeType"];
    ventureId?: string | null;
    missionId?: string | null;
    category?: TreasuryBudgetCategory | null;
    provider?: string | null;
    period?: BudgetScope["period"];
  },
): TreasuryBudget | null {
  return (
    store.budgetsForOrg(organizationId).find((budget) => {
      const s = budget.scope;
      if (s.scopeType !== match.scopeType) return false;
      if (match.ventureId != null && s.ventureId !== match.ventureId) return false;
      if (match.missionId != null && s.missionId !== match.missionId) return false;
      if (match.category != null && s.category !== match.category) return false;
      if (match.provider != null && s.provider !== match.provider) return false;
      if (match.period != null && s.period !== match.period) return false;
      return true;
    }) ?? null
  );
}

export function knownValue(amount: EpistemicAmount): number | null {
  if (amount.actuality === "UNKNOWN" || amount.value == null || !Number.isFinite(amount.value)) return null;
  return amount.value;
}

/**
 * Atomic check-and-reserve. JS is single-threaded, so concurrent Promise.all
 * callers cannot double-spend the same available amount.
 */
export function reserveBudget(
  store: TreasuryStore,
  input: {
    organizationId: string;
    budgetId: string;
    financialActionRequestId: string;
    amountUsd: number;
    currency?: string;
  },
): { ok: true; reservation: BudgetReservation; budget: TreasuryBudget } | { ok: false; reason: string } {
  const budget = store.budgets.get(input.budgetId);
  if (!budget || budget.scope.organizationId !== input.organizationId) {
    return { ok: false, reason: "BUDGET_NOT_FOUND" };
  }
  const refreshed = refreshBudgetAvailable(budget);
  const available = knownValue(refreshed.available);
  if (available == null) return { ok: false, reason: "AVAILABLE_UNKNOWN" };
  if (input.amountUsd > available) return { ok: false, reason: "INSUFFICIENT_AVAILABLE" };

  const reservedValue = knownValue(refreshed.reserved) ?? 0;
  refreshed.reserved = actualAmount(reservedValue + input.amountUsd, refreshed.reserved.currency);
  const next = refreshBudgetAvailable(refreshed);
  store.budgets.set(next.budgetId, next);

  const reservation: BudgetReservation = {
    reservationId: newId(),
    organizationId: input.organizationId,
    budgetId: next.budgetId,
    financialActionRequestId: input.financialActionRequestId,
    amount: actualAmount(input.amountUsd, input.currency ?? next.scope.currency),
    status: "ACTIVE",
    createdAt: nowIso(),
    releasedAt: null,
    spentAt: null,
  };
  store.reservations.set(reservation.reservationId, reservation);
  return { ok: true, reservation, budget: next };
}

export function consumeReservation(
  store: TreasuryStore,
  reservationId: string,
  outcome: "SPENT" | "RELEASED",
): BudgetReservation | null {
  const reservation = store.reservations.get(reservationId);
  if (!reservation || reservation.status !== "ACTIVE") return reservation ?? null;

  const budget = store.budgets.get(reservation.budgetId);
  const amount = knownValue(reservation.amount) ?? 0;
  if (budget) {
    const reserved = Math.max(0, (knownValue(budget.reserved) ?? 0) - amount);
    budget.reserved = actualAmount(reserved, budget.reserved.currency);
    if (outcome === "SPENT") {
      budget.spent = actualAmount((knownValue(budget.spent) ?? 0) + amount, budget.spent.currency);
    }
    store.budgets.set(budget.budgetId, refreshBudgetAvailable(budget));
  }

  reservation.status = outcome;
  reservation.spentAt = outcome === "SPENT" ? nowIso() : reservation.spentAt;
  reservation.releasedAt = outcome === "RELEASED" ? nowIso() : reservation.releasedAt;
  store.reservations.set(reservation.reservationId, reservation);
  return reservation;
}

export function addCommitted(
  store: TreasuryStore,
  budgetId: string,
  amountUsd: number,
): TreasuryBudget | null {
  const budget = store.budgets.get(budgetId);
  if (!budget) return null;
  budget.committed = actualAmount((knownValue(budget.committed) ?? 0) + amountUsd, budget.committed.currency);
  const next = refreshBudgetAvailable(budget);
  store.budgets.set(next.budgetId, next);
  return next;
}
