import { DEFAULT_CURRENCY } from "../constants";
import { knownValue } from "../budgets/engine";
import { commitmentTotals } from "../commitments/recurring";
import { actualProfitOrUnknown } from "../economics";
import { netRevenue, sumLedger } from "../ledger/engine";
import { classifyFreshness, latestBalanceSnapshot } from "../sync/provider-sync";
import type { TreasuryStore } from "../store";
import {
  actualAmount,
  estimateAmount,
  unknownAmount,
  type EpistemicAmount,
  type ProviderFreshness,
  type TreasuryState,
} from "../types";

export type ComposeTreasuryStateInput = {
  organizationId: string;
  now?: Date;
  /** Fresh provider current balance when a live read succeeded. */
  providerCurrentBalanceUsd?: number | null;
  providerAvailableBalanceUsd?: number | null;
  providerReadAt?: string | null;
  providerAccountId?: string;
  freshnessOverride?: ProviderFreshness;
};

/**
 * CONNECTED PROVIDER is authoritative for actual cash when a fresh read exists.
 * Cached snapshots never override a fresh provider balance.
 */
export function composeTreasuryState(store: TreasuryStore, input: ComposeTreasuryStateInput): TreasuryState {
  const now = input.now ?? new Date();
  const orgId = input.organizationId;
  const connection = store.scoped(orgId, store.connections)[0] ?? null;
  const accountId = input.providerAccountId ?? store.scoped(orgId, store.accounts)[0]?.accountId ?? "mock-acct-operating";
  const cached = latestBalanceSnapshot(store, orgId, accountId);

  let freshness: ProviderFreshness = input.freshnessOverride ?? "NOT_CONFIGURED";
  if (!input.freshnessOverride) {
    if (!connection) freshness = "NOT_CONFIGURED";
    else if (connection.connectionStatus === "UNAVAILABLE") freshness = "UNAVAILABLE";
    else freshness = classifyFreshness(input.providerReadAt ?? connection.lastSyncAt, now);
  }

  let totalCash: EpistemicAmount;
  if (freshness === "FRESH" && input.providerCurrentBalanceUsd != null) {
    totalCash = actualAmount(input.providerCurrentBalanceUsd);
  } else if (freshness === "FRESH" && cached?.source === "PROVIDER" && cached.current.value != null) {
    totalCash = { ...cached.current, actuality: "ACTUAL" };
  } else if ((freshness === "STALE" || freshness === "UNAVAILABLE") && cached?.current.value != null) {
    totalCash = estimateAmount(cached.current.value, cached.current.currency);
  } else {
    totalCash = unknownAmount();
  }

  const allocations = store.scoped(orgId, store.allocations);
  const allocated = sumKnown(allocations.map((a) => a.capitalAllocated));
  const reserved = sumKnown(allocations.map((a) => a.capitalReserved));
  const committed = sumKnown(allocations.map((a) => a.capitalCommitted));
  const availableFromAlloc = sumKnown(allocations.map((a) => a.capitalAvailable));

  const globalBudget = [...store.budgets.values()].find((b) => b.scope.organizationId === orgId && b.scope.scopeType === "GLOBAL");
  const infinityAllocated = globalBudget ? globalBudget.allocated : allocated;
  const availableCapital = globalBudget ? globalBudget.available : availableFromAlloc;
  const reservedCapital = globalBudget ? globalBudget.reserved : reserved;
  const committedCapital = globalBudget ? globalBudget.committed : committed;

  const expenses = sumLedger(store, orgId, "EXPENSE");
  const revenue = netRevenue(store, orgId);
  const capital = sumLedger(store, orgId, "CAPITAL_CONTRIBUTION");
  const profit = actualProfitOrUnknown(revenue, expenses.amount);

  const dailySpend = spendSince(store, orgId, startOfUtcDay(now));
  const monthlySpend = spendSince(store, orgId, startOfUtcMonth(now));
  const lifetimeSpend = expenses.complete ? expenses.amount : unknownAmount();
  const commitments = commitmentTotals(store, orgId);
  const pending = store.scoped(orgId, store.transactions).filter((t) => t.status === "PENDING").length;
  const commitmentCount = store.scoped(orgId, store.commitments).filter((c) => c.status === "ACTIVE").length;

  void capital;

  return {
    organizationId: orgId,
    totalCash,
    infinityAllocatedCapital: infinityAllocated,
    availableCapital,
    reservedCapital,
    committedCapital,
    dailySpend,
    monthlySpend,
    lifetimeSpend,
    revenue,
    expenses: expenses.amount,
    profit,
    cashReturned: unknownAmount(),
    pendingTransactions: pending,
    recurringCommitments: commitmentCount,
    providerFreshness: freshness,
    lastProviderSyncAt: input.providerReadAt ?? connection?.lastSyncAt ?? cached?.capturedAt ?? null,
  };
}

function sumKnown(amounts: EpistemicAmount[]): EpistemicAmount {
  let total = 0;
  let unknown = false;
  let any = false;
  for (const amount of amounts) {
    any = true;
    const value = knownValue(amount);
    if (value == null) {
      unknown = true;
      continue;
    }
    total += value;
  }
  if (!any) return unknownAmount();
  if (unknown) return unknownAmount();
  return actualAmount(total, amounts[0]?.currency ?? DEFAULT_CURRENCY);
}

function spendSince(store: TreasuryStore, organizationId: string, start: Date): EpistemicAmount {
  let total = 0;
  let unknown = false;
  let any = false;
  for (const entry of store.scoped(organizationId, store.ledger)) {
    if (entry.type !== "EXPENSE") continue;
    if (new Date(entry.occurredAt) < start) continue;
    any = true;
    if (entry.actuality === "UNKNOWN" || entry.amount.value == null) {
      unknown = true;
      continue;
    }
    total += entry.amount.value;
  }
  if (!any) return actualAmount(0);
  if (unknown) return unknownAmount();
  return actualAmount(total);
}

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
