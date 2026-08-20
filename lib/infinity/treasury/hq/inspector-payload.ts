import { INTERNAL_TREASURY_PROVIDER } from "../constants";
import type { TreasuryStore } from "../store";
import { formatHqAmount, type TruthfulHqValue } from "./read-model";
import { buildMercuryHqStatus, type MercuryHqStatus } from "./mercury-status";
import type { MercuryPublicConfig } from "../providers/mercury/config";

export type TreasuryInspectorPayload = {
  treasurySource: string;
  bankingProvider: string;
  fundingClass: string;
  mercury: Omit<MercuryHqStatus, never>;
  ventureDisplayName: string | null;
  ventureId: string | null;
  allocated: TruthfulHqValue;
  reserved: TruthfulHqValue;
  committed: TruthfulHqValue;
  spent: TruthfulHqValue;
  available: TruthfulHqValue;
  expectedRevenue: TruthfulHqValue;
  actualRevenue: TruthfulHqValue;
  expectedProfit: TruthfulHqValue;
  actualProfit: TruthfulHqValue;
  budgetConstraints: Array<{ label: string; allocated: string; available: string; scope: string }>;
  recentFunding: Array<{ amount: string; source: string; memo: string; at: string }>;
  recentAllocations: Array<{ amount: string; note: string; at: string }>;
  relatedActions: Array<{ purpose: string; status: string; amount: string; provider: string }>;
};

export function buildTreasuryInspectorPayload(
  store: TreasuryStore,
  organizationId: string,
  sourceRecordType: string,
  sourceRecordId: string,
  names?: { displayNameForVenture?: (ventureId: string) => string },
  mercury?: MercuryPublicConfig | null,
): TreasuryInspectorPayload {
  const mercuryStatus = buildMercuryHqStatus(store, organizationId, mercury);
  const connection = store.scoped(organizationId, store.connections).find((row) => row.provider === "mercury")
    ?? store.scoped(organizationId, store.connections)[0]
    ?? null;
  const bankingProvider = mercuryStatus.health === "NOT_CONFIGURED" ? connection?.provider ?? "Not configured" : "Mercury";
  const allocation =
    sourceRecordType === "venture_capital_allocation"
      ? store.scoped(organizationId, store.allocations).find((row) => row.ventureId === sourceRecordId) ?? null
      : null;

  const budgets = store.budgetsForOrg(organizationId).filter((budget) => {
    if (allocation) return budget.scope.ventureId === allocation.ventureId;
    return true;
  });

  const funding = store
    .scoped(organizationId, store.ledger)
    .filter((entry) => entry.type === "CAPITAL_CONTRIBUTION")
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 8);

  const allocationActions = store
    .scoped(organizationId, store.requests)
    .filter((request) => {
      if (request.provider !== INTERNAL_TREASURY_PROVIDER) return false;
      if (allocation) return request.ventureId === allocation.ventureId;
      return request.purpose.toLowerCase().includes("allocation") || request.purpose.toLowerCase().includes("capital");
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  const ventureId = allocation?.ventureId ?? (sourceRecordType === "venture_capital_allocation" ? sourceRecordId : null);
  const ventureDisplayName = ventureId && names?.displayNameForVenture ? names.displayNameForVenture(ventureId) : null;

  return {
    treasurySource: "Internal manual ledger",
    bankingProvider,
    fundingClass: "INTERNAL / MANUAL / NON-BANK",
    mercury: mercuryStatus,
    ventureDisplayName,
    ventureId,
    allocated: allocation ? formatHqAmount(allocation.capitalAllocated) : formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }),
    reserved: allocation ? formatHqAmount(allocation.capitalReserved) : formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }),
    committed: allocation ? formatHqAmount(allocation.capitalCommitted) : formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }),
    spent: allocation ? formatHqAmount(allocation.capitalSpent) : formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }),
    available: allocation ? formatHqAmount(allocation.capitalAvailable) : formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }),
    expectedRevenue: allocation ? formatHqAmount(allocation.expectedRevenue) : formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }),
    actualRevenue: allocation ? formatHqAmount(allocation.actualRevenue) : formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }),
    expectedProfit: allocation ? formatHqAmount(allocation.expectedProfit) : formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }),
    actualProfit: allocation ? formatHqAmount(allocation.actualProfit) : formatHqAmount({ value: null, actuality: "UNKNOWN", currency: "USD" }),
    budgetConstraints: budgets.slice(0, 12).map((budget) => ({
      label: budget.scope.category ?? budget.scope.scopeType,
      allocated: formatHqAmount(budget.allocated).display,
      available: formatHqAmount(budget.available).display,
      scope: `${budget.scope.scopeType}${budget.scope.period ? ` · ${budget.scope.period}` : ""}`,
    })),
    recentFunding: funding.map((entry) => ({
      amount: formatHqAmount(entry.amount).display,
      source: entry.subtype ?? "CAPITAL_CONTRIBUTION",
      memo: "Internal capital contribution — not revenue, not a bank transfer",
      at: entry.occurredAt,
    })),
    recentAllocations: allocationActions
      .filter((request) => request.purpose.toLowerCase().includes("allocation"))
      .map((request) => ({
        amount: formatHqAmount(request.amount).display,
        note: request.economicJustification ?? "Allocation assigns internal capital. This is not spend and not revenue.",
        at: request.createdAt,
      })),
    relatedActions: store
      .scoped(organizationId, store.requests)
      .filter((request) => (allocation ? request.ventureId === allocation.ventureId : true))
      .slice(0, 8)
      .map((request) => ({
        purpose: request.purpose,
        status: request.status,
        amount: formatHqAmount(request.amount).display,
        provider: request.provider ?? INTERNAL_TREASURY_PROVIDER,
      })),
  };
}
