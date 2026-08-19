import { DEFAULT_CURRENCY } from "../constants";
import type { CommitmentFrequency, TreasuryBudgetCategory } from "../constants";
import { addCommitted } from "../budgets/engine";
import { findMatchingBudget } from "../budgets/engine";
import { newId, nowIso, type TreasuryStore } from "../store";
import { actualAmount, unknownAmount, type EpistemicAmount, type RecurringCommitment } from "../types";

export function monthlyEquivalentOf(amount: number, frequency: CommitmentFrequency): number {
  switch (frequency) {
    case "WEEKLY":
      return amount * (52 / 12);
    case "MONTHLY":
      return amount;
    case "QUARTERLY":
      return amount / 3;
    case "ANNUAL":
      return amount / 12;
  }
}

export function annualEquivalentOf(amount: number, frequency: CommitmentFrequency): number {
  return monthlyEquivalentOf(amount, frequency) * 12;
}

export function createRecurringCommitment(
  store: TreasuryStore,
  input: {
    organizationId: string;
    ventureId?: string | null;
    vendor: string;
    provider?: string | null;
    purpose: string;
    category: TreasuryBudgetCategory;
    amount: EpistemicAmount;
    frequency: CommitmentFrequency;
    nextExpectedCharge?: string | null;
    businessValue?: string | null;
    cancellationMechanism?: string | null;
    financialActionRequestId?: string | null;
    idempotencyKey: string;
  },
): RecurringCommitment {
  const existing = store.findByIdempotency(input.organizationId, input.idempotencyKey, store.commitments);
  if (existing) return existing;

  const value = input.amount.value;
  const monthly =
    value != null && input.amount.actuality !== "UNKNOWN"
      ? actualAmount(monthlyEquivalentOf(value, input.frequency), input.amount.currency)
      : unknownAmount(input.amount.currency);
  const annual =
    value != null && input.amount.actuality !== "UNKNOWN"
      ? actualAmount(annualEquivalentOf(value, input.frequency), input.amount.currency)
      : unknownAmount(input.amount.currency);

  const commitment: RecurringCommitment = {
    commitmentId: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId ?? null,
    vendor: input.vendor,
    provider: input.provider ?? null,
    purpose: input.purpose,
    category: input.category,
    amount: input.amount,
    currency: input.amount.currency || DEFAULT_CURRENCY,
    frequency: input.frequency,
    monthlyEquivalent: monthly,
    annualEquivalent: annual,
    nextExpectedCharge: input.nextExpectedCharge ?? null,
    lastUsedAt: null,
    businessValue: input.businessValue ?? null,
    cancellationMechanism: input.cancellationMechanism ?? null,
    status: "ACTIVE",
    financialActionRequestId: input.financialActionRequestId ?? null,
    createdAt: nowIso(),
  };
  store.commitments.set(commitment.commitmentId, commitment);
  store.registerIdempotency(input.organizationId, input.idempotencyKey, commitment.commitmentId);

  if (monthly.value != null) {
    const budget =
      (input.ventureId
        ? findMatchingBudget(store, input.organizationId, { scopeType: "VENTURE", ventureId: input.ventureId })
        : null) ?? findMatchingBudget(store, input.organizationId, { scopeType: "GLOBAL" });
    if (budget) addCommitted(store, budget.budgetId, monthly.value);
  }

  return commitment;
}

export function commitmentTotals(store: TreasuryStore, organizationId: string): {
  monthlyRecurring: EpistemicAmount;
  annualizedRecurring: EpistemicAmount;
} {
  let monthly = 0;
  let unknown = false;
  let any = false;
  for (const commitment of store.scoped(organizationId, store.commitments)) {
    if (commitment.status !== "ACTIVE") continue;
    any = true;
    if (commitment.monthlyEquivalent.actuality === "UNKNOWN" || commitment.monthlyEquivalent.value == null) {
      unknown = true;
      continue;
    }
    monthly += commitment.monthlyEquivalent.value;
  }
  if (!any || unknown) {
    return {
      monthlyRecurring: unknownAmount(),
      annualizedRecurring: unknownAmount(),
    };
  }
  return {
    monthlyRecurring: actualAmount(monthly),
    annualizedRecurring: actualAmount(monthly * 12),
  };
}
