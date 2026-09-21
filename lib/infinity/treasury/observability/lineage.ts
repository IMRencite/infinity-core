import type { TreasuryStore } from "../store";
import type { FinancialLineage } from "../types";

export function resolveFinancialLineage(store: TreasuryStore, requestId: string): FinancialLineage | null {
  const request = store.requests.get(requestId);
  if (!request) return null;
  const authorization = [...store.authorizations.values()].find((a) => a.financialActionRequestId === requestId) ?? null;
  const reservation = [...store.reservations.values()].find((r) => r.financialActionRequestId === requestId) ?? null;
  const execution = [...store.executions.values()].find((e) => e.financialActionRequestId === requestId) ?? null;
  const transaction = [...store.transactions.values()].find((t) => t.financialActionRequestId === requestId) ?? null;
  const ledger = [...store.ledger.values()].find((e) => e.financialActionRequestId === requestId) ?? null;
  const budget =
    [...store.budgets.values()].find(
      (b) =>
        b.scope.organizationId === request.organizationId &&
        (request.ventureId ? b.scope.ventureId === request.ventureId : b.scope.scopeType === "GLOBAL"),
    ) ?? null;

  return {
    opportunityId: request.opportunityId,
    ventureId: request.ventureId,
    missionId: request.missionId,
    budgetId: budget?.budgetId ?? request.budgetSource,
    financialActionRequestId: request.requestId,
    policyDecision:
      request.status === "BLOCKED"
        ? "BLOCK"
        : request.status === "ESCALATED"
          ? "REQUIRE_POLICY_ESCALATION"
          : authorization?.decision ?? null,
    authorizationId: authorization?.authorizationId ?? null,
    reservationId: reservation?.reservationId ?? null,
    externalActionId: execution?.externalActionId ?? null,
    provider: request.provider,
    transactionId: transaction?.transactionId ?? null,
    ledgerEntryId: ledger?.entryId ?? null,
  };
}

export function orphanSpendPossible(store: TreasuryStore, organizationId: string): boolean {
  for (const entry of store.scoped(organizationId, store.ledger)) {
    if (entry.type !== "EXPENSE") continue;
    if (entry.subtype === "PAYMENT_PROCESSING_FEE" && entry.commercialPaymentEventId) continue;
    if (!entry.financialActionRequestId && !entry.providerTransactionId) return true;
  }
  return false;
}
