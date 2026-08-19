import { DEFAULT_CURRENCY } from "../constants";
import { computeAvailable, knownValue } from "../budgets/engine";
import { newId, nowIso, type TreasuryStore } from "../store";
import {
  actualAmount,
  unknownAmount,
  type EpistemicAmount,
  type PortfolioAllocationInputs,
  type VentureCapitalAllocation,
} from "../types";

export function createVentureAllocation(
  store: TreasuryStore,
  input: {
    organizationId: string;
    ventureId: string;
    capitalAllocated: EpistemicAmount;
    expectedRevenue?: EpistemicAmount;
    expectedProfit?: EpistemicAmount;
    expectedROI?: EpistemicAmount;
    selectionScore?: number | null;
    monetizationScore?: number | null;
    risk?: number | null;
    stage?: string | null;
  },
): VentureCapitalAllocation {
  const existing = [...store.allocations.values()].find(
    (a) => a.organizationId === input.organizationId && a.ventureId === input.ventureId,
  );
  if (existing) return existing;

  const currency = input.capitalAllocated.currency || DEFAULT_CURRENCY;
  const allocation: VentureCapitalAllocation = {
    allocationId: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    capitalAllocated: input.capitalAllocated,
    capitalSpent: actualAmount(0, currency),
    capitalReserved: actualAmount(0, currency),
    capitalCommitted: actualAmount(0, currency),
    capitalAvailable: computeAvailable(
      input.capitalAllocated,
      actualAmount(0, currency),
      actualAmount(0, currency),
      actualAmount(0, currency),
    ),
    expectedRevenue: input.expectedRevenue ?? unknownAmount(currency),
    actualRevenue: unknownAmount(currency),
    expectedProfit: input.expectedProfit ?? unknownAmount(currency),
    actualProfit: unknownAmount(currency),
    expectedROI: input.expectedROI ?? unknownAmount(currency),
    actualROI: unknownAmount(currency),
    selectionScore: input.selectionScore ?? null,
    monetizationScore: input.monetizationScore ?? null,
    risk: input.risk ?? null,
    stage: input.stage ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  store.allocations.set(allocation.allocationId, allocation);
  return allocation;
}

export function applyVentureAllocationIncrease(
  store: TreasuryStore,
  input: {
    organizationId: string;
    ventureId: string;
    deltaUsd: number;
    stage?: string | null;
  },
): VentureCapitalAllocation {
  const existing = [...store.allocations.values()].find(
    (a) => a.organizationId === input.organizationId && a.ventureId === input.ventureId,
  );
  if (!existing) {
    return createVentureAllocation(store, {
      organizationId: input.organizationId,
      ventureId: input.ventureId,
      capitalAllocated: actualAmount(input.deltaUsd),
      stage: input.stage,
    });
  }
  const current = knownValue(existing.capitalAllocated) ?? 0;
  existing.capitalAllocated = actualAmount(current + input.deltaUsd, existing.capitalAllocated.currency);
  const next = refreshVentureAllocation(existing);
  store.allocations.set(next.allocationId, next);
  return next;
}

export function refreshVentureAllocation(allocation: VentureCapitalAllocation): VentureCapitalAllocation {
  return {
    ...allocation,
    capitalAvailable: computeAvailable(
      allocation.capitalAllocated,
      allocation.capitalSpent,
      allocation.capitalReserved,
      allocation.capitalCommitted,
    ),
    updatedAt: nowIso(),
  };
}

export function applyVentureSpend(store: TreasuryStore, allocationId: string, amountUsd: number): VentureCapitalAllocation | null {
  const allocation = store.allocations.get(allocationId);
  if (!allocation) return null;
  allocation.capitalSpent = actualAmount((knownValue(allocation.capitalSpent) ?? 0) + amountUsd, allocation.capitalSpent.currency);
  const next = refreshVentureAllocation(allocation);
  store.allocations.set(next.allocationId, next);
  return next;
}

export function applyVentureRevenue(store: TreasuryStore, allocationId: string, actualRevenue: EpistemicAmount): VentureCapitalAllocation | null {
  const allocation = store.allocations.get(allocationId);
  if (!allocation) return null;
  allocation.actualRevenue = actualRevenue;
  allocation.actualProfit = computeActualProfit(allocation.actualRevenue, allocation.capitalSpent);
  allocation.actualROI = computeActualRoi(allocation.actualProfit, allocation.capitalAllocated);
  const next = refreshVentureAllocation(allocation);
  store.allocations.set(next.allocationId, next);
  return next;
}

export function computeActualProfit(actualRevenue: EpistemicAmount, actualExpenses: EpistemicAmount): EpistemicAmount {
  if (
    actualRevenue.actuality !== "ACTUAL" ||
    actualExpenses.actuality !== "ACTUAL" ||
    actualRevenue.value == null ||
    actualExpenses.value == null
  ) {
    return unknownAmount(actualRevenue.currency || actualExpenses.currency || DEFAULT_CURRENCY);
  }
  return actualAmount(actualRevenue.value - actualExpenses.value, actualRevenue.currency);
}

export function computeActualRoi(actualProfit: EpistemicAmount, capitalAllocated: EpistemicAmount): EpistemicAmount {
  if (
    actualProfit.actuality !== "ACTUAL" ||
    capitalAllocated.actuality !== "ACTUAL" ||
    actualProfit.value == null ||
    capitalAllocated.value == null ||
    capitalAllocated.value === 0
  ) {
    return unknownAmount(actualProfit.currency);
  }
  return actualAmount(actualProfit.value / capitalAllocated.value, actualProfit.currency);
}

/** Interface-only foundation — no autonomous optimizer. */
export function portfolioInputsFromAllocation(allocation: VentureCapitalAllocation): PortfolioAllocationInputs {
  return {
    selectionScore: allocation.selectionScore,
    monetizationScore: allocation.monetizationScore,
    validationConfidence: null,
    fatalAssumptionRisk: allocation.risk,
    expectedROI: knownValue(allocation.expectedROI),
    actualROI: knownValue(allocation.actualROI),
    revenue: allocation.actualRevenue.actuality === "ACTUAL" ? allocation.actualRevenue : allocation.expectedRevenue,
    profit: allocation.actualProfit,
    capitalEfficiency: unknownAmount(allocation.capitalAllocated.currency),
    burn: allocation.capitalSpent,
    stage: allocation.stage,
    technicalRisk: null,
  };
}
