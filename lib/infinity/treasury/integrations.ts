import type { SpendIntent } from "@/lib/infinity/commercialization/types";
import { COMMERCIAL_SPEND_CATEGORY_MAP } from "./constants";
import type { FinancialActionType, TreasuryBudgetCategory } from "./constants";
import {
  authorizeFinancialAction,
  createFinancialActionRequest,
  executeAuthorizedAction,
  reserveAuthorizedAction,
} from "./actions/engine";
import { addCommitted, findMatchingBudget } from "./budgets/engine";
import { createRecurringCommitment } from "./commitments/recurring";
import { categoryToSubtype, recordLedgerEntry } from "./ledger/engine";
import type { TreasuryStore } from "./store";
import { actualAmount, unknownAmount, type EpistemicAmount, type FinancialActionRequest, type FinancialLineage } from "./types";
import type { NormalizedPerformanceEvent } from "@/lib/infinity/performance-intelligence-engine/types";

export function mapCommercialCategory(category: SpendIntent["category"]): TreasuryBudgetCategory {
  return COMMERCIAL_SPEND_CATEGORY_MAP[category] ?? "OTHER";
}

export function mapCommercialActionType(category: SpendIntent["category"]): FinancialActionType {
  switch (category) {
    case "DOMAIN_REGISTRATION":
    case "DOMAIN_RENEWAL":
      return "DOMAIN_PURCHASE";
    case "HOSTING":
      return "HOSTING_PURCHASE";
    case "CREATIVE":
      return "MEDIA_GENERATION";
    case "MARKETING":
      return "PURCHASE";
    case "SAAS_INFRASTRUCTURE":
    case "EMAIL":
      return "SOFTWARE_PURCHASE";
    case "PAYMENT_PROCESSING":
      return "PAYMENT";
    default:
      return "OTHER";
  }
}

/**
 * Option B: SpendIntent is a specialized adapter into Treasury.
 * Treasury policy/authorization is the canonical money-governance model.
 */
export function adaptSpendIntentToFinancialAction(store: TreasuryStore, intent: SpendIntent): FinancialActionRequest {
  return createFinancialActionRequest(store, {
    organizationId: intent.organizationId,
    ventureId: intent.ventureId,
    missionId: intent.missionId,
    purpose: intent.purpose,
    category: mapCommercialCategory(intent.category),
    actionType: mapCommercialActionType(intent.category),
    provider: intent.provider,
    amount:
      intent.requestedAmountUsd != null && Number.isFinite(intent.requestedAmountUsd)
        ? actualAmount(intent.requestedAmountUsd, intent.currency)
        : unknownAmount(intent.currency),
    currency: intent.currency,
    recurring: intent.estimatedRecurringAmountUsd != null,
    recurrence:
      intent.estimatedRecurringAmountUsd != null
        ? {
            frequency: "MONTHLY",
            monthlyEquivalent: actualAmount(intent.estimatedRecurringAmountUsd, intent.currency),
            annualEquivalent: actualAmount(intent.estimatedRecurringAmountUsd * 12, intent.currency),
          }
        : null,
    expectedValue: unknownAmount(intent.currency),
    economicJustification: typeof intent.expectedValue.justification === "string" ? intent.expectedValue.justification : null,
    idempotencyKey: `treasury:spend-intent:${intent.idempotencyKey}`,
    spendIntentId: intent.id,
  });
}

export function routeSpendIntentThroughTreasury(
  store: TreasuryStore,
  intent: SpendIntent,
  options?: { simulateProvider?: boolean; now?: Date },
): {
  request: FinancialActionRequest;
  lineage: FinancialLineage;
  blocked: boolean;
  providerMutations: number;
} {
  const request = adaptSpendIntentToFinancialAction(store, intent);
  const authorized = authorizeFinancialAction(store, request.requestId, options?.now);
  if (authorized.evaluation.decision !== "AUTO_AUTHORIZE" || !authorized.authorization) {
    return {
      request: authorized.request,
      lineage: buildLineage(authorized.request, authorized.authorization?.authorizationId ?? null, null, null, null, null),
      blocked: true,
      providerMutations: 0,
    };
  }

  const reserved = reserveAuthorizedAction(store, {
    requestId: request.requestId,
    authorizationId: authorized.authorization.authorizationId,
  });

  const executed = executeAuthorizedAction(store, {
    requestId: request.requestId,
    authorizationId: authorized.authorization.authorizationId,
    reservationId: reserved.ok ? reserved.reservation.reservationId : null,
    provider: intent.provider,
    idempotencyKey: `treasury:exec:${intent.idempotencyKey}`,
    simulate: options?.simulateProvider !== false,
    result: { capability: intent.capability, spendIntentId: intent.id },
  });

  let ledgerId: string | null = null;
  if (executed.ok && request.amount.value != null && request.amount.actuality !== "UNKNOWN") {
    const entry = recordLedgerEntry(store, {
      organizationId: request.organizationId,
      ventureId: request.ventureId,
      missionId: request.missionId,
      type: "EXPENSE",
      subtype: categoryToSubtype(request.category),
      amount: request.amount,
      provider: request.provider,
      financialActionRequestId: request.requestId,
      authorizationId: authorized.authorization.authorizationId,
      externalActionId: executed.execution.externalActionId,
      idempotencyKey: `treasury:ledger:${intent.idempotencyKey}`,
    });
    ledgerId = entry.entryId;
    if (request.recurring && request.recurrence) {
      createRecurringCommitment(store, {
        organizationId: request.organizationId,
        ventureId: request.ventureId,
        vendor: request.merchant ?? request.provider ?? "unknown",
        provider: request.provider,
        purpose: request.purpose,
        category: request.category,
        amount: request.amount,
        frequency: request.recurrence.frequency,
        financialActionRequestId: request.requestId,
        idempotencyKey: `treasury:commitment:${intent.idempotencyKey}`,
      });
    }
  }

  return {
    request: store.requests.get(request.requestId)!,
    lineage: buildLineage(
      request,
      authorized.authorization.authorizationId,
      reserved.ok ? reserved.reservation.reservationId : null,
      executed.ok ? executed.execution.externalActionId : null,
      null,
      ledgerId,
    ),
    blocked: !executed.ok,
    providerMutations: 0,
  };
}

export type CreativeMediaBudgetGateInput = {
  organizationId: string;
  ventureId?: string | null;
  missionId?: string | null;
  mediaRequirementId: string;
  purpose: string;
  estimatedCost: EpistemicAmount;
  provider?: string | null;
};

export function evaluateCreativeMediaBudget(
  store: TreasuryStore,
  input: CreativeMediaBudgetGateInput,
): { allowed: boolean; request: FinancialActionRequest; providerCalled: false } {
  const request = createFinancialActionRequest(store, {
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    missionId: input.missionId,
    purpose: input.purpose,
    category: "CREATIVE_MEDIA",
    actionType: "MEDIA_GENERATION",
    provider: input.provider ?? null,
    amount: input.estimatedCost,
    idempotencyKey: `treasury:media:${input.mediaRequirementId}`,
    mediaRequirementId: input.mediaRequirementId,
  });
  const authorized = authorizeFinancialAction(store, request.requestId);
  return {
    allowed: authorized.evaluation.decision === "AUTO_AUTHORIZE",
    request: authorized.request,
    providerCalled: false,
  };
}

export type ProviderCostRecord = {
  provider: string;
  ventureId?: string | null;
  missionId?: string | null;
  costUsd: number | null;
  costKnown: boolean;
  sourceId: string;
};

/** Aggregate existing ProviderCall telemetry — do not duplicate token logs. */
export function aggregateProviderCosts(
  records: ProviderCostRecord[],
  organizationId: string,
): { total: EpistemicAmount; byProvider: Record<string, EpistemicAmount> } {
  void organizationId;
  const byProvider: Record<string, EpistemicAmount> = {};
  let total = 0;
  let unknown = false;
  let any = false;
  for (const record of records) {
    any = true;
    if (!record.costKnown || record.costUsd == null) {
      unknown = true;
      continue;
    }
    total += record.costUsd;
    const current = byProvider[record.provider];
    const prior = current?.actuality === "ACTUAL" ? current.value ?? 0 : 0;
    byProvider[record.provider] = actualAmount(prior + record.costUsd);
  }
  return {
    total: !any || unknown ? unknownAmount() : actualAmount(total),
    byProvider,
  };
}

export function cursorAttributionPlaceholder(): {
  provider: "cursor";
  category: "SOFTWARE_TOOLS";
  adapterImplemented: false;
} {
  return { provider: "cursor", category: "SOFTWARE_TOOLS", adapterImplemented: false };
}

export function pabCostAggregation(records: ProviderCostRecord[], organizationId: string) {
  return aggregateProviderCosts(records, organizationId);
}

export function treasuryOutcomesToPerformanceEvents(input: {
  organizationId: string;
  ventureId: string;
  actualRevenue: EpistemicAmount;
  actualSpend: EpistemicAmount;
  actualProfit: EpistemicAmount;
  sourceId: string;
}): NormalizedPerformanceEvent[] {
  const events: NormalizedPerformanceEvent[] = [];
  const now = new Date().toISOString();
  const push = (metric: string, amount: EpistemicAmount) => {
    if (amount.actuality !== "ACTUAL" || amount.value == null) return;
    events.push({
      id: `${input.ventureId}:${metric}`,
      sourceId: input.sourceId,
      sourceReference: `treasury:${metric}`,
      eventType: "treasury_actual",
      metric,
      value: amount.value,
      unit: amount.currency,
      ventureId: input.ventureId,
      occurredAt: now,
      observedAt: now,
      provenance: { organizationId: input.organizationId, actuality: amount.actuality },
    });
  };
  push("actual_revenue_usd", input.actualRevenue);
  push("actual_spend_usd", input.actualSpend);
  push("actual_profit_usd", input.actualProfit);
  return events;
}

function buildLineage(
  request: FinancialActionRequest,
  authorizationId: string | null,
  reservationId: string | null,
  externalActionId: string | null,
  transactionId: string | null,
  ledgerEntryId: string | null,
): FinancialLineage {
  return {
    opportunityId: request.opportunityId,
    ventureId: request.ventureId,
    missionId: request.missionId,
    budgetId: request.budgetSource,
    financialActionRequestId: request.requestId,
    policyDecision: request.status === "BLOCKED" ? "BLOCK" : request.status === "ESCALATED" ? "REQUIRE_POLICY_ESCALATION" : request.status === "AUTHORIZED" || request.status === "EXECUTED" || request.status === "RESERVED" ? "AUTO_AUTHORIZE" : null,
    authorizationId,
    reservationId,
    externalActionId,
    provider: request.provider,
    transactionId,
    ledgerEntryId,
  };
}

export function assertCategoryBudgetExists(store: TreasuryStore, organizationId: string, category: TreasuryBudgetCategory): boolean {
  return Boolean(findMatchingBudget(store, organizationId, { scopeType: "CATEGORY", category }));
}

void addCommitted;
