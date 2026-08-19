import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { TreasuryStore } from "./store";
import {
  unknownAmount,
  type Actuality,
  type EpistemicAmount,
  type FinancialActionRequest,
  type TreasuryBudget,
  type TreasuryLedgerEntry,
  type TreasuryProviderConnection,
  type VentureCapitalAllocation,
} from "./types";
import type { LedgerEntryType, LedgerSubtype, TreasuryBudgetCategory, BudgetScopeType } from "./constants";

type LooseClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => PromiseLike<{ data: unknown[] | null; error: { message?: string } | null }>;
    };
    upsert: (
      row: unknown | unknown[],
      opts?: { onConflict?: string },
    ) => PromiseLike<{ error: { message?: string } | null }>;
  };
};

function asActuality(value: unknown): Actuality {
  return value === "ACTUAL" || value === "ESTIMATE" || value === "UNKNOWN" ? value : "UNKNOWN";
}

function epistemic(amount: unknown, actuality: unknown, currency: unknown): EpistemicAmount {
  const n = amount == null ? null : Number(amount);
  const value = n != null && Number.isFinite(n) ? n : null;
  const act = asActuality(actuality);
  if (value == null) return unknownAmount(typeof currency === "string" ? currency : "USD");
  return { value, actuality: act, currency: typeof currency === "string" ? currency : "USD" };
}

function amountPair(amount: EpistemicAmount): { amount: number | null; actuality: Actuality } {
  return { amount: amount.value, actuality: amount.actuality };
}

async function loadOrgRows(
  client: LooseClient,
  table: string,
  organizationId: string,
): Promise<Record<string, unknown>[]> {
  try {
    const result = await client.from(table).select("*").eq("organization_id", organizationId);
    if (result.error) return [];
    return (result.data ?? []) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

export async function loadTreasuryStore(admin: AdminSupabaseClient | LooseClient, organizationId: string): Promise<TreasuryStore> {
  const store = new TreasuryStore();
  const client = admin as LooseClient;
  const [ledgerRows, budgetRows, allocationRows, requestRows, connectionRows] = await Promise.all([
    loadOrgRows(client, "treasury_ledger_entries", organizationId),
    loadOrgRows(client, "treasury_budgets", organizationId),
    loadOrgRows(client, "venture_capital_allocations", organizationId),
    loadOrgRows(client, "financial_action_requests", organizationId),
    loadOrgRows(client, "treasury_provider_connections", organizationId),
  ]);

  for (const row of ledgerRows) {
    const entry: TreasuryLedgerEntry = {
      entryId: String(row.id),
      organizationId: String(row.organization_id),
      ventureId: row.venture_id ? String(row.venture_id) : null,
      missionId: row.mission_id ? String(row.mission_id) : null,
      type: row.entry_type as LedgerEntryType,
      subtype: (row.subtype as LedgerSubtype | null) ?? null,
      amount: epistemic(row.amount, row.amount_actuality, row.currency),
      currency: String(row.currency ?? "USD"),
      provider: row.provider ? String(row.provider) : null,
      providerTransactionId: row.provider_transaction_id ? String(row.provider_transaction_id) : null,
      financialActionRequestId: row.financial_action_request_id ? String(row.financial_action_request_id) : null,
      authorizationId: row.authorization_id ? String(row.authorization_id) : null,
      externalActionId: row.external_action_id ? String(row.external_action_id) : null,
      commercialPaymentEventId: row.commercial_payment_event_id ? String(row.commercial_payment_event_id) : null,
      occurredAt: String(row.occurred_at),
      createdAt: String(row.created_at),
      actuality: asActuality(row.amount_actuality),
      idempotencyKey: String(row.idempotency_key),
    };
    store.ledger.set(entry.entryId, entry);
    store.registerIdempotency(entry.organizationId, entry.idempotencyKey, entry.entryId);
  }

  for (const row of budgetRows) {
    const budget: TreasuryBudget = {
      budgetId: String(row.id),
      scope: {
        scopeType: row.scope_type as BudgetScopeType,
        organizationId: String(row.organization_id),
        ventureId: row.venture_id ? String(row.venture_id) : null,
        missionId: row.mission_id ? String(row.mission_id) : null,
        category: (row.category as TreasuryBudgetCategory | null) ?? null,
        provider: row.provider ? String(row.provider) : null,
        period: (row.period as TreasuryBudget["scope"]["period"]) ?? null,
        currency: String(row.currency ?? "USD"),
      },
      allocated: epistemic(row.allocated_amount, row.allocated_actuality, row.currency),
      spent: epistemic(row.spent_amount, row.spent_actuality, row.currency),
      reserved: epistemic(row.reserved_amount, row.reserved_actuality, row.currency),
      committed: epistemic(row.committed_amount, row.committed_actuality, row.currency),
      available: epistemic(row.available_amount, row.available_actuality, row.currency),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
    store.budgets.set(budget.budgetId, budget);
  }

  for (const row of allocationRows) {
    const allocation: VentureCapitalAllocation = {
      allocationId: String(row.id),
      organizationId: String(row.organization_id),
      ventureId: String(row.venture_id),
      capitalAllocated: epistemic(row.capital_allocated, row.capital_allocated_actuality, "USD"),
      capitalSpent: epistemic(row.capital_spent, row.capital_spent_actuality, "USD"),
      capitalReserved: epistemic(row.capital_reserved, row.capital_reserved_actuality, "USD"),
      capitalCommitted: epistemic(row.capital_committed, row.capital_committed_actuality, "USD"),
      capitalAvailable: epistemic(row.capital_available, row.capital_available_actuality, "USD"),
      expectedRevenue: epistemic(row.expected_revenue, row.expected_revenue_actuality, "USD"),
      actualRevenue: epistemic(row.actual_revenue, row.actual_revenue_actuality, "USD"),
      expectedProfit: epistemic(row.expected_profit, row.expected_profit_actuality, "USD"),
      actualProfit: epistemic(row.actual_profit, row.actual_profit_actuality, "USD"),
      expectedROI: epistemic(row.expected_roi, row.expected_roi_actuality, "USD"),
      actualROI: epistemic(row.actual_roi, row.actual_roi_actuality, "USD"),
      selectionScore: row.selection_score == null ? null : Number(row.selection_score),
      monetizationScore: row.monetization_score == null ? null : Number(row.monetization_score),
      risk: row.risk == null ? null : Number(row.risk),
      stage: row.stage ? String(row.stage) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
    store.allocations.set(allocation.allocationId, allocation);
  }

  for (const row of requestRows) {
    const request: FinancialActionRequest = {
      requestId: String(row.id),
      organizationId: String(row.organization_id),
      ventureId: row.venture_id ? String(row.venture_id) : null,
      missionId: row.mission_id ? String(row.mission_id) : null,
      opportunityId: row.opportunity_id ? String(row.opportunity_id) : null,
      purpose: String(row.purpose),
      category: row.category as FinancialActionRequest["category"],
      actionType: row.action_type as FinancialActionRequest["actionType"],
      merchant: row.merchant ? String(row.merchant) : null,
      provider: row.provider ? String(row.provider) : null,
      recipient: row.recipient ? String(row.recipient) : null,
      amount: epistemic(row.amount, row.amount_actuality, row.currency),
      currency: String(row.currency ?? "USD"),
      recurring: Boolean(row.recurring),
      recurrence: null,
      expectedValue: epistemic(row.expected_value, row.expected_value_actuality, row.currency),
      economicJustification: row.economic_justification ? String(row.economic_justification) : null,
      requiredForMVP: Boolean(row.required_for_mvp),
      alternatives: Array.isArray(row.alternatives) ? (row.alternatives as string[]) : [],
      risk: (row.risk as FinancialActionRequest["risk"]) ?? "UNKNOWN",
      budgetSource: row.budget_source ? String(row.budget_source) : null,
      maximumAuthorizedAmount: epistemic(row.maximum_authorized_amount, "ACTUAL", row.currency),
      idempotencyKey: String(row.idempotency_key),
      status: row.status as FinancialActionRequest["status"],
      spendIntentId: row.spend_intent_id ? String(row.spend_intent_id) : null,
      mediaRequirementId: row.media_requirement_id ? String(row.media_requirement_id) : null,
      createdAt: String(row.created_at),
    };
    store.requests.set(request.requestId, request);
    store.registerIdempotency(request.organizationId, request.idempotencyKey, request.requestId);
  }

  for (const row of connectionRows) {
    const connection: TreasuryProviderConnection = {
      connectionId: String(row.id),
      organizationId: String(row.organization_id),
      provider: String(row.provider),
      connectionStatus: row.connection_status as TreasuryProviderConnection["connectionStatus"],
      externalAccountIds: Array.isArray(row.external_account_ids) ? (row.external_account_ids as string[]) : [],
      capabilities: Array.isArray(row.capabilities) ? (row.capabilities as TreasuryProviderConnection["capabilities"]) : [],
      lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : null,
      createdAt: String(row.created_at),
    };
    store.connections.set(connection.connectionId, connection);
  }

  return store;
}

export async function persistTreasuryMutation(
  admin: AdminSupabaseClient | LooseClient,
  store: TreasuryStore,
  organizationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const client = admin as LooseClient;
  const ledgerRows = store.scoped(organizationId, store.ledger).map((entry) => {
    const pair = amountPair(entry.amount);
    return {
      id: entry.entryId,
      organization_id: entry.organizationId,
      venture_id: entry.ventureId,
      mission_id: entry.missionId,
      entry_type: entry.type,
      subtype: entry.subtype,
      amount: pair.amount,
      amount_actuality: pair.actuality,
      currency: entry.currency,
      provider: entry.provider,
      provider_transaction_id: entry.providerTransactionId,
      financial_action_request_id: entry.financialActionRequestId,
      authorization_id: entry.authorizationId,
      external_action_id: entry.externalActionId,
      commercial_payment_event_id: entry.commercialPaymentEventId,
      occurred_at: entry.occurredAt,
      created_at: entry.createdAt,
      idempotency_key: entry.idempotencyKey,
    };
  });
  const budgetRows = store.budgetsForOrg(organizationId).map((budget) => ({
    id: budget.budgetId,
    organization_id: budget.scope.organizationId,
    scope_type: budget.scope.scopeType,
    venture_id: budget.scope.ventureId ?? null,
    mission_id: budget.scope.missionId ?? null,
    category: budget.scope.category ?? null,
    provider: budget.scope.provider ?? null,
    period: budget.scope.period ?? null,
    currency: budget.scope.currency,
    allocated_amount: budget.allocated.value,
    allocated_actuality: budget.allocated.actuality,
    spent_amount: budget.spent.value,
    spent_actuality: budget.spent.actuality,
    reserved_amount: budget.reserved.value,
    reserved_actuality: budget.reserved.actuality,
    committed_amount: budget.committed.value,
    committed_actuality: budget.committed.actuality,
    available_amount: budget.available.value,
    available_actuality: budget.available.actuality,
    created_at: budget.createdAt,
    updated_at: budget.updatedAt,
  }));
  const allocationRows = store.scoped(organizationId, store.allocations).map((allocation) => ({
    id: allocation.allocationId,
    organization_id: allocation.organizationId,
    venture_id: allocation.ventureId,
    capital_allocated: allocation.capitalAllocated.value,
    capital_allocated_actuality: allocation.capitalAllocated.actuality,
    capital_spent: allocation.capitalSpent.value,
    capital_spent_actuality: allocation.capitalSpent.actuality,
    capital_reserved: allocation.capitalReserved.value,
    capital_reserved_actuality: allocation.capitalReserved.actuality,
    capital_committed: allocation.capitalCommitted.value,
    capital_committed_actuality: allocation.capitalCommitted.actuality,
    capital_available: allocation.capitalAvailable.value,
    capital_available_actuality: allocation.capitalAvailable.actuality,
    expected_revenue: allocation.expectedRevenue.value,
    expected_revenue_actuality: allocation.expectedRevenue.actuality,
    actual_revenue: allocation.actualRevenue.value,
    actual_revenue_actuality: allocation.actualRevenue.actuality,
    expected_profit: allocation.expectedProfit.value,
    expected_profit_actuality: allocation.expectedProfit.actuality,
    actual_profit: allocation.actualProfit.value,
    actual_profit_actuality: allocation.actualProfit.actuality,
    expected_roi: allocation.expectedROI.value,
    expected_roi_actuality: allocation.expectedROI.actuality,
    actual_roi: allocation.actualROI.value,
    actual_roi_actuality: allocation.actualROI.actuality,
    selection_score: allocation.selectionScore,
    monetization_score: allocation.monetizationScore,
    risk: allocation.risk,
    stage: allocation.stage,
    created_at: allocation.createdAt,
    updated_at: allocation.updatedAt,
  }));
  const requestRows = store.scoped(organizationId, store.requests).map((request) => ({
    id: request.requestId,
    organization_id: request.organizationId,
    venture_id: request.ventureId,
    mission_id: request.missionId,
    opportunity_id: request.opportunityId,
    purpose: request.purpose,
    category: request.category,
    action_type: request.actionType,
    merchant: request.merchant,
    provider: request.provider,
    recipient: request.recipient,
    amount: request.amount.value,
    amount_actuality: request.amount.actuality,
    currency: request.currency,
    recurring: request.recurring,
    expected_value: request.expectedValue.value,
    expected_value_actuality: request.expectedValue.actuality,
    economic_justification: request.economicJustification,
    required_for_mvp: request.requiredForMVP,
    alternatives: request.alternatives,
    risk: request.risk,
    budget_source: request.budgetSource,
    maximum_authorized_amount: request.maximumAuthorizedAmount.value,
    idempotency_key: request.idempotencyKey,
    status: request.status,
    spend_intent_id: request.spendIntentId,
    media_requirement_id: request.mediaRequirementId,
    created_at: request.createdAt,
  }));

  if (ledgerRows.length) {
    const result = await client.from("treasury_ledger_entries").upsert(ledgerRows, { onConflict: "id" });
    if (result.error) return { ok: false, error: result.error.message };
  }
  if (budgetRows.length) {
    const result = await client.from("treasury_budgets").upsert(budgetRows, { onConflict: "id" });
    if (result.error) return { ok: false, error: result.error.message };
  }
  if (allocationRows.length) {
    const result = await client.from("venture_capital_allocations").upsert(allocationRows, { onConflict: "id" });
    if (result.error) return { ok: false, error: result.error.message };
  }
  if (requestRows.length) {
    const result = await client.from("financial_action_requests").upsert(requestRows, { onConflict: "id" });
    if (result.error) return { ok: false, error: result.error.message };
  }
  return { ok: true };
}
