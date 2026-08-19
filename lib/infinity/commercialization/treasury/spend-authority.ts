import { newId, nowIso, type CommercializationStore } from "../store";
import { evaluateSpendPolicy, DEFAULT_SPEND_POLICY } from "../policy/spend-policy";
import type {
  CommercialLedgerEntry,
  LedgerEntryType,
  PolicyOutcome,
  SpendAuthorization,
  SpendExecution,
  SpendIntent,
  VentureBudget,
  FinancialTruth,
} from "../types";

export type CreateSpendIntentInput = {
  organizationId: string;
  ventureId: string;
  missionId?: string | null;
  commercializationPlanId?: string | null;
  category: SpendIntent["category"];
  provider: string;
  capability: string;
  purpose: string;
  requestedAmountUsd: number;
  currency?: string;
  estimatedRecurringAmountUsd?: number | null;
  reversibility: string;
  expectedValue?: Record<string, unknown>;
  idempotencyKey: string;
  isPremiumDomain?: boolean;
  renewalPriceUnknown?: boolean;
};

export type AuthorizeSpendResult =
  | { ok: true; intent: SpendIntent; authorization: SpendAuthorization }
  | { ok: false; intent: SpendIntent; outcome: PolicyOutcome; reason: string };

export function ensureVentureBudget(
  store: CommercializationStore,
  input: { organizationId: string; ventureId: string; authorizedBudgetUsd?: number | null },
): VentureBudget {
  const existing = store.budgetForVenture(input.organizationId, input.ventureId);
  if (existing) return existing;

  const budget: VentureBudget = {
    id: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    currency: "USD",
    authorizedBudgetUsd: input.authorizedBudgetUsd ?? null,
    actualSpendUsd: 0,
    actualRevenueUsd: 0,
    budgetTruth: input.authorizedBudgetUsd != null ? "ACTUAL" : "UNKNOWN",
    revenueTruth: "UNKNOWN",
    policyConfig: { ...DEFAULT_SPEND_POLICY },
  };
  store.budgets.set(budget.id, budget);
  return budget;
}

export function createSpendIntent(store: CommercializationStore, input: CreateSpendIntentInput): SpendIntent {
  const existing = store.findByIdempotency(input.organizationId, input.idempotencyKey, store.spendIntents);
  if (existing) return existing;

  const intent: SpendIntent = {
    id: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    missionId: input.missionId ?? null,
    commercializationPlanId: input.commercializationPlanId ?? null,
    category: input.category,
    provider: input.provider,
    capability: input.capability,
    purpose: input.purpose,
    requestedAmountUsd: input.requestedAmountUsd,
    currency: input.currency ?? "USD",
    estimatedRecurringAmountUsd: input.estimatedRecurringAmountUsd ?? null,
    reversibility: input.reversibility,
    expectedValue: input.expectedValue ?? {},
    policyDecision: null,
    authoritySource: null,
    status: "PENDING",
    idempotencyKey: input.idempotencyKey,
    createdAt: nowIso(),
  };
  store.spendIntents.set(intent.id, intent);
  store.registerIdempotency(input.organizationId, input.idempotencyKey, intent.id);
  return intent;
}

export function authorizeSpendIntent(
  store: CommercializationStore,
  intentId: string,
  input?: { authoritySource?: string; externalActionId?: string | null; forceOutcome?: PolicyOutcome },
): AuthorizeSpendResult {
  const intent = store.spendIntents.get(intentId);
  if (!intent) throw new Error("SPEND_INTENT_NOT_FOUND");

  const budget = store.budgetForVenture(intent.organizationId, intent.ventureId);
  const config = {
    ...DEFAULT_SPEND_POLICY,
    ...(budget?.policyConfig as Partial<typeof DEFAULT_SPEND_POLICY> | undefined),
  };

  const evaluation = evaluateSpendPolicy({
    category: intent.category,
    requestedAmountUsd: intent.requestedAmountUsd,
    estimatedRecurringAmountUsd: intent.estimatedRecurringAmountUsd,
    budget,
    config,
    isPremiumDomain: false,
    renewalPriceUnknown: Boolean(intent.expectedValue.renewalPriceUnknown),
  });

  const outcome = input?.forceOutcome ?? evaluation.outcome;
  intent.policyDecision = outcome;

  if (outcome === "DENIED" || outcome === "HITL_REQUIRED") {
    intent.status = "DENIED";
    return { ok: false, intent, outcome, reason: evaluation.reason };
  }

  const authorization: SpendAuthorization = {
    id: newId(),
    organizationId: intent.organizationId,
    spendIntentId: intent.id,
    externalActionId: input?.externalActionId ?? null,
    authorizedAmountUsd: intent.requestedAmountUsd,
    policyOutcome: outcome,
    authoritySource: input?.authoritySource ?? "venture_treasury_v1",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    createdAt: nowIso(),
  };

  intent.status = "AUTHORIZED";
  intent.authoritySource = authorization.authoritySource;
  store.spendAuthorizations.set(authorization.id, authorization);
  store.spendIntents.set(intent.id, intent);

  return { ok: true, intent, authorization };
}

export function recordLedgerEntry(
  store: CommercializationStore,
  input: {
    organizationId: string;
    ventureId: string;
    entryType: LedgerEntryType;
    amountUsd: number;
    truth: FinancialTruth;
    category?: string | null;
    sourceType: string;
    sourceId?: string | null;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  },
): CommercialLedgerEntry {
  const existing = store.findByIdempotency(input.organizationId, input.idempotencyKey, store.ledger);
  if (existing) return existing;

  const entry: CommercialLedgerEntry = {
    id: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId,
    entryType: input.entryType,
    amountUsd: input.amountUsd,
    currency: "USD",
    truth: input.truth,
    category: input.category ?? null,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata ?? {},
    recordedAt: nowIso(),
  };

  store.ledger.set(entry.id, entry);
  store.registerIdempotency(input.organizationId, input.idempotencyKey, entry.id);

  const budget = ensureVentureBudget(store, { organizationId: input.organizationId, ventureId: input.ventureId });
  if (input.entryType.endsWith("_SPEND") || input.entryType === "PAYMENT_PROCESSING_FEES") {
    budget.actualSpendUsd += input.amountUsd;
    budget.budgetTruth = input.truth === "UNKNOWN" ? budget.budgetTruth : "ACTUAL";
  }
  if (input.entryType === "GROSS_REVENUE" || input.entryType === "NET_REVENUE") {
    budget.actualRevenueUsd += input.amountUsd;
    budget.revenueTruth = input.truth === "UNKNOWN" ? budget.revenueTruth : "ACTUAL";
  }
  store.budgets.set(budget.id, budget);

  return entry;
}

export function recordSpendExecution(
  store: CommercializationStore,
  input: {
    intent: SpendIntent;
    authorization: SpendAuthorization;
    provider: string;
    capability: string;
    idempotencyKey: string;
    actualCostUsd: number | null;
    costTruth: FinancialTruth;
    providerReference?: string | null;
    result?: Record<string, unknown>;
    externalActionId?: string | null;
  },
): SpendExecution {
  const existing = store.findByIdempotency(input.intent.organizationId, input.idempotencyKey, store.spendExecutions);
  if (existing) return existing;

  const execution: SpendExecution = {
    id: newId(),
    organizationId: input.intent.organizationId,
    spendIntentId: input.intent.id,
    spendAuthorizationId: input.authorization.id,
    externalActionId: input.externalActionId ?? null,
    provider: input.provider,
    capability: input.capability,
    executionStatus: "SUCCEEDED",
    actualCostUsd: input.actualCostUsd,
    costTruth: input.costTruth,
    providerReference: input.providerReference ?? null,
    idempotencyKey: input.idempotencyKey,
    result: input.result ?? {},
    createdAt: nowIso(),
    completedAt: nowIso(),
  };

  store.spendExecutions.set(execution.id, execution);
  store.registerIdempotency(input.intent.organizationId, input.idempotencyKey, execution.id);

  input.intent.status = "EXECUTED";
  store.spendIntents.set(input.intent.id, input.intent);

  if (input.actualCostUsd != null && input.costTruth !== "UNKNOWN") {
    recordLedgerEntry(store, {
      organizationId: input.intent.organizationId,
      ventureId: input.intent.ventureId,
      entryType: input.intent.category === "DOMAIN_REGISTRATION" ? "DOMAIN_SPEND" : "OTHER_EXTERNAL_SPEND",
      amountUsd: input.actualCostUsd,
      truth: input.costTruth,
      category: input.intent.category,
      sourceType: "spend_execution",
      sourceId: execution.id,
      idempotencyKey: `ledger:${input.idempotencyKey}`,
    });
  }

  return execution;
}

/** Hard invariant: provider purchase requires authorization */
export function assertSpendAuthorized(authorization: SpendAuthorization | null): asserts authorization is SpendAuthorization {
  if (!authorization) throw new Error("AUTHORIZATION_MISSING");
  if (authorization.policyOutcome === "DENIED" || authorization.policyOutcome === "HITL_REQUIRED") {
    throw new Error("AUTHORIZATION_MISSING");
  }
}
