import { DEFAULT_TREASURY_POLICY } from "../config";
import { knownValue } from "../budgets/engine";
import { commitmentTotals } from "../commitments/recurring";
import { composeTreasuryState } from "../state/compose";
import { TreasuryStore } from "../store";
import type { EpistemicAmount, FinancialActionRequest, RecurringCommitment, TreasuryBudget, TreasuryState, TreasuryTransaction, VentureCapitalAllocation } from "../types";

export type TruthfulHqValue = {
  display: string;
  actuality: "ACTUAL" | "ESTIMATE" | "UNKNOWN";
  stale: boolean;
};

export type TreasuryHqConstraintRow = {
  label: string;
  category: string | null;
  spent: TruthfulHqValue;
  reserved: TruthfulHqValue;
  committed: TruthfulHqValue;
  available: TruthfulHqValue;
  ceiling: TruthfulHqValue;
};

export type TreasuryHqVentureRow = {
  ventureId: string;
  stage: string;
  origin: string;
  allocated: TruthfulHqValue;
  spent: TruthfulHqValue;
  reserved: TruthfulHqValue;
  committed: TruthfulHqValue;
  available: TruthfulHqValue;
  expectedRevenue: TruthfulHqValue;
  actualRevenue: TruthfulHqValue;
  expectedProfit: TruthfulHqValue;
  actualProfit: TruthfulHqValue;
  revenue: TruthfulHqValue;
  profit: TruthfulHqValue;
  roi: TruthfulHqValue;
  monthlyBurn: TruthfulHqValue;
  status: string;
  updatedAt: string;
};

export type TreasuryHqBudgetRow = {
  budgetId: string;
  ventureId: string | null;
  scopeType: string;
  category: string | null;
  period: string | null;
  allocated: TruthfulHqValue;
  spent: TruthfulHqValue;
  reserved: TruthfulHqValue;
  committed: TruthfulHqValue;
  available: TruthfulHqValue;
};

export type TreasuryHqTransactionRow = {
  date: string;
  amount: TruthfulHqValue;
  merchant: string;
  category: string;
  ventureId: string;
  purpose: string;
  provider: string;
  financialActionId: string;
  authorizationSource: string;
  status: string;
  transactionId: string;
};

export type TreasuryHqReadModel = {
  organizationId: string;
  queryCount: number;
  state: TreasuryState;
  cards: {
    totalCash: TruthfulHqValue;
    internalCapital: TruthfulHqValue;
    unallocatedCapital: TruthfulHqValue;
    infinityAllocatedCapital: TruthfulHqValue;
    availableCapital: TruthfulHqValue;
    reservedCapital: TruthfulHqValue;
    committedCapital: TruthfulHqValue;
    todaySpend: TruthfulHqValue;
    monthlySpend: TruthfulHqValue;
    monthlyBudget: TruthfulHqValue;
    revenue: TruthfulHqValue;
    expenses: TruthfulHqValue;
    netProfit: TruthfulHqValue;
  };
  treasurySource: string;
  bankingProvider: string;
  freshnessLabel: string;
  constraints: TreasuryHqConstraintRow[];
  ventureBudgets: TreasuryHqBudgetRow[];
  ventures: TreasuryHqVentureRow[];
  transactions: TreasuryHqTransactionRow[];
  commitments: RecurringCommitment[];
  monthlyRecurring: TruthfulHqValue;
  annualizedRecurring: TruthfulHqValue;
  requests: FinancialActionRequest[];
};

export function formatHqAmount(amount: EpistemicAmount | null | undefined, stale = false): TruthfulHqValue {
  if (!amount || amount.actuality === "UNKNOWN" || amount.value == null || !Number.isFinite(amount.value)) {
    return { display: stale ? "UNKNOWN · STALE" : "UNKNOWN", actuality: "UNKNOWN", stale };
  }
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: amount.currency || "USD" }).format(amount.value);
  if (amount.actuality === "ESTIMATE" || stale) {
    return { display: `${formatted} ${stale ? "STALE" : "ESTIMATE"}`, actuality: "ESTIMATE", stale };
  }
  return { display: `${formatted} ACTUAL`, actuality: "ACTUAL", stale: false };
}

export function emptyTreasuryHqReadModel(organizationId: string): TreasuryHqReadModel {
  return buildTreasuryHqReadModel(new TreasuryStore(), organizationId);
}

export function buildTreasuryHqReadModel(
  store: TreasuryStore,
  organizationId: string,
  composeInput?: Parameters<typeof composeTreasuryState>[1],
): TreasuryHqReadModel {
  store.queryCount = 0;
  const started = store.queryCount;
  const state = composeTreasuryState(store, { organizationId, ...composeInput });
  const policy = store.policyFor(organizationId);
  const stale = state.providerFreshness === "STALE" || state.providerFreshness === "UNAVAILABLE";

  const monthlyBudget = [...store.budgets.values()].find(
    (b) => b.scope.organizationId === organizationId && (b.scope.scopeType === "MONTHLY" || b.scope.period === "MONTHLY"),
  );

  const constraints = buildConstraintRows(store, organizationId, policy);
  const connection = store.scoped(organizationId, store.connections)[0] ?? null;
  const ventures = store.scoped(organizationId, store.allocations).map((allocation) => toVentureRow(allocation));
  const ventureBudgets = store
    .budgetsForOrg(organizationId)
    .filter((budget) => budget.scope.scopeType === "VENTURE" || budget.scope.scopeType === "MONTHLY" || budget.scope.ventureId)
    .map((budget) => toBudgetRow(budget));
  const authorizations = store.scoped(organizationId, store.authorizations);
  const transactions = store.scoped(organizationId, store.transactions).map((txn) => toTxnRow(txn, authorizations, store.requests.get(txn.financialActionRequestId ?? "") ?? null));
  const commitments = store.scoped(organizationId, store.commitments);
  const totals = commitmentTotals(store, organizationId);
  const requests = store.scoped(organizationId, store.requests);

  const queryCount = store.queryCount - started;

  return {
    organizationId,
    queryCount,
    state,
    cards: {
      totalCash: formatHqAmount(state.totalCash, stale && state.totalCash.actuality !== "UNKNOWN"),
      internalCapital: formatHqAmount(state.internalCapital),
      unallocatedCapital: formatHqAmount(state.unallocatedCapital),
      infinityAllocatedCapital: formatHqAmount(state.infinityAllocatedCapital),
      availableCapital: formatHqAmount(state.availableCapital),
      reservedCapital: formatHqAmount(state.reservedCapital),
      committedCapital: formatHqAmount(state.committedCapital),
      todaySpend: formatHqAmount(state.dailySpend),
      monthlySpend: formatHqAmount(state.monthlySpend),
      monthlyBudget: monthlyBudget
        ? formatHqAmount(monthlyBudget.allocated)
        : policy.monthlySpendingCeiling != null
          ? formatHqAmount({ value: policy.monthlySpendingCeiling, actuality: "ACTUAL", currency: "USD" })
          : formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }),
      revenue: formatHqAmount(state.revenue),
      expenses: formatHqAmount(state.expenses),
      netProfit: formatHqAmount(state.profit),
    },
    treasurySource: "Internal manual ledger",
    bankingProvider: connection?.provider ?? "Not configured",
    freshnessLabel:
      state.providerFreshness === "FRESH"
        ? "FRESH"
        : state.providerFreshness === "STALE"
          ? "STALE"
          : state.providerFreshness === "UNAVAILABLE"
            ? "UNAVAILABLE · DEGRADED"
            : "NOT CONFIGURED",
    constraints,
    ventureBudgets,
    ventures,
    transactions,
    commitments,
    monthlyRecurring: formatHqAmount(totals.monthlyRecurring),
    annualizedRecurring: formatHqAmount(totals.annualizedRecurring),
    requests,
  };
}

function buildConstraintRows(
  store: TreasuryStore,
  organizationId: string,
  policy: typeof DEFAULT_TREASURY_POLICY,
): TreasuryHqConstraintRow[] {
  const rows: TreasuryHqConstraintRow[] = [
    constraintFromLimit("Maximum single autonomous purchase", null, policy.maximumSingleAutonomousPurchase),
    constraintFromLimit("Daily spending ceiling", null, policy.dailySpendingCeiling),
    constraintFromLimit("Monthly spending ceiling", null, policy.monthlySpendingCeiling),
  ];

  const categories: Array<[string, string]> = [
    ["AI/API", "AI_API"],
    ["Hosting", "HOSTING"],
    ["Domains", "DOMAINS"],
    ["Marketing", "MARKETING"],
    ["Creative media", "CREATIVE_MEDIA"],
    ["Tools/software", "SOFTWARE_TOOLS"],
    ["Vendors/contractors", "VENDORS_CONTRACTORS"],
  ];

  for (const [label, category] of categories) {
    const budget = [...store.budgets.values()].find(
      (b) => b.scope.organizationId === organizationId && b.scope.scopeType === "CATEGORY" && b.scope.category === category,
    );
    if (budget) {
      rows.push(constraintFromBudget(label, category, budget));
    } else {
      rows.push(constraintFromLimit(label, category, policy.categoryLimits[category as keyof typeof policy.categoryLimits] ?? null));
    }
  }
  return rows;
}

function constraintFromLimit(label: string, category: string | null, ceiling: number | null): TreasuryHqConstraintRow {
  return {
    label,
    category,
    spent: formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }),
    reserved: formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }),
    committed: formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }),
    available: ceiling == null ? formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }) : formatHqAmount({ value: ceiling, actuality: "ACTUAL", currency: "USD" }),
    ceiling: ceiling == null ? formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }) : formatHqAmount({ value: ceiling, actuality: "ACTUAL", currency: "USD" }),
  };
}

function constraintFromBudget(label: string, category: string, budget: TreasuryBudget): TreasuryHqConstraintRow {
  return {
    label,
    category,
    spent: formatHqAmount(budget.spent),
    reserved: formatHqAmount(budget.reserved),
    committed: formatHqAmount(budget.committed),
    available: formatHqAmount(budget.available),
    ceiling: formatHqAmount(budget.allocated),
  };
}

function toVentureRow(allocation: VentureCapitalAllocation): TreasuryHqVentureRow {
  const measured = allocation.actualRevenue.actuality === "ACTUAL" || allocation.actualProfit.actuality === "ACTUAL";
  return {
    ventureId: allocation.ventureId,
    stage: allocation.stage ?? "UNKNOWN",
    origin: "UNKNOWN",
    allocated: formatHqAmount(allocation.capitalAllocated),
    spent: formatHqAmount(allocation.capitalSpent),
    reserved: formatHqAmount(allocation.capitalReserved),
    committed: formatHqAmount(allocation.capitalCommitted),
    available: formatHqAmount(allocation.capitalAvailable),
    expectedRevenue: formatHqAmount(allocation.expectedRevenue),
    actualRevenue: formatHqAmount(allocation.actualRevenue),
    expectedProfit: formatHqAmount(allocation.expectedProfit),
    actualProfit: formatHqAmount(allocation.actualProfit),
    revenue: formatHqAmount(allocation.actualRevenue),
    profit: formatHqAmount(allocation.actualProfit),
    roi: formatHqAmount(allocation.actualROI),
    monthlyBurn: formatHqAmount(allocation.capitalSpent),
    status: measured ? "MEASURED" : "NOT YET MEASURED",
    updatedAt: allocation.updatedAt,
  };
}

function toBudgetRow(budget: TreasuryBudget): TreasuryHqBudgetRow {
  return {
    budgetId: budget.budgetId,
    ventureId: budget.scope.ventureId ?? null,
    scopeType: budget.scope.scopeType,
    category: budget.scope.category ?? null,
    period: budget.scope.period ?? null,
    allocated: formatHqAmount(budget.allocated),
    spent: formatHqAmount(budget.spent),
    reserved: formatHqAmount(budget.reserved),
    committed: formatHqAmount(budget.committed),
    available: formatHqAmount(budget.available),
  };
}

function toTxnRow(
  txn: TreasuryTransaction,
  authorizations: Array<{ financialActionRequestId: string; authorizationSource: string }>,
  request: FinancialActionRequest | null,
): TreasuryHqTransactionRow {
  const auth = authorizations.find((a) => a.financialActionRequestId === txn.financialActionRequestId);
  return {
    date: txn.occurredAt,
    amount: formatHqAmount(txn.amount),
    merchant: txn.merchant ?? "UNKNOWN",
    category: txn.category ?? request?.category ?? "OTHER",
    ventureId: txn.ventureId ?? request?.ventureId ?? "UNKNOWN",
    purpose: txn.purpose ?? request?.purpose ?? "UNKNOWN",
    provider: txn.provider,
    financialActionId: txn.financialActionRequestId ?? "UNKNOWN",
    authorizationSource: auth?.authorizationSource ?? "UNKNOWN",
    status: txn.status,
    transactionId: txn.providerTransactionId,
  };
}

void knownValue;
