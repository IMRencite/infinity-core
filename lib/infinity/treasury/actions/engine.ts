import { DEFAULT_CURRENCY } from "../constants";
import { consumeReservation, findMatchingBudget, knownValue, reserveBudget } from "../budgets/engine";
import { evaluateMutationGate } from "../freeze/control";
import { evaluateFinancialPolicy } from "../policy/evaluate";
import { newId, nowIso, type TreasuryStore } from "../store";
import {
  actualAmount,
  unknownAmount,
  type EpistemicAmount,
  type FinancialActionExecution,
  type FinancialActionRequest,
  type FinancialAuthorization,
  type FinancialPolicyEvaluation,
} from "../types";
import type { FinancialActionType, TreasuryBudgetCategory } from "../constants";

export type CreateFinancialActionInput = {
  organizationId: string;
  ventureId?: string | null;
  missionId?: string | null;
  opportunityId?: string | null;
  purpose: string;
  category: TreasuryBudgetCategory;
  actionType: FinancialActionType;
  merchant?: string | null;
  provider?: string | null;
  recipient?: string | null;
  amount: EpistemicAmount;
  currency?: string;
  recurring?: boolean;
  recurrence?: FinancialActionRequest["recurrence"];
  expectedValue?: EpistemicAmount;
  economicJustification?: string | null;
  requiredForMVP?: boolean;
  alternatives?: string[];
  risk?: FinancialActionRequest["risk"];
  budgetSource?: string | null;
  maximumAuthorizedAmount?: EpistemicAmount;
  idempotencyKey: string;
  spendIntentId?: string | null;
  mediaRequirementId?: string | null;
};

export function createFinancialActionRequest(store: TreasuryStore, input: CreateFinancialActionInput): FinancialActionRequest {
  const existing = store.findByIdempotency(input.organizationId, input.idempotencyKey, store.requests);
  if (existing) return existing;

  const currency = input.currency ?? input.amount.currency ?? DEFAULT_CURRENCY;
  const request: FinancialActionRequest = {
    requestId: newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId ?? null,
    missionId: input.missionId ?? null,
    opportunityId: input.opportunityId ?? null,
    purpose: input.purpose,
    category: input.category,
    actionType: input.actionType,
    merchant: input.merchant ?? null,
    provider: input.provider ?? null,
    recipient: input.recipient ?? null,
    amount: input.amount,
    currency,
    recurring: input.recurring ?? false,
    recurrence: input.recurrence ?? null,
    expectedValue: input.expectedValue ?? unknownAmount(currency),
    economicJustification: input.economicJustification ?? null,
    requiredForMVP: input.requiredForMVP ?? false,
    alternatives: input.alternatives ?? [],
    risk: input.risk ?? "UNKNOWN",
    budgetSource: input.budgetSource ?? null,
    maximumAuthorizedAmount: input.maximumAuthorizedAmount ?? input.amount,
    idempotencyKey: input.idempotencyKey,
    status: "PENDING_POLICY",
    spendIntentId: input.spendIntentId ?? null,
    mediaRequirementId: input.mediaRequirementId ?? null,
    createdAt: nowIso(),
  };
  store.requests.set(request.requestId, request);
  store.registerIdempotency(input.organizationId, input.idempotencyKey, request.requestId);
  return request;
}

export function authorizeFinancialAction(
  store: TreasuryStore,
  requestId: string,
  now?: Date,
): {
  request: FinancialActionRequest;
  evaluation: FinancialPolicyEvaluation;
  authorization: FinancialAuthorization | null;
} {
  const request = store.requests.get(requestId);
  if (!request) throw new Error("FINANCIAL_ACTION_REQUEST_NOT_FOUND");

  const evaluation = evaluateFinancialPolicy(store, { organizationId: request.organizationId, request, now });
  if (evaluation.decision === "BLOCK") {
    request.status = "BLOCKED";
    store.requests.set(request.requestId, request);
    return { request, evaluation, authorization: null };
  }
  if (evaluation.decision === "REQUIRE_POLICY_ESCALATION") {
    request.status = "ESCALATED";
    store.requests.set(request.requestId, request);
    const authorization: FinancialAuthorization = {
      authorizationId: newId(),
      organizationId: request.organizationId,
      financialActionRequestId: request.requestId,
      decision: evaluation.decision,
      authorizedAmount: unknownAmount(request.currency),
      currency: request.currency,
      policyVersion: evaluation.policyVersion,
      reasonCodes: evaluation.reasonCodes,
      authorizationSource: "POLICY_ESCALATION",
      expiresAt: null,
      createdAt: nowIso(now),
    };
    store.authorizations.set(authorization.authorizationId, authorization);
    return { request, evaluation, authorization };
  }

  const authorization: FinancialAuthorization = {
    authorizationId: newId(),
    organizationId: request.organizationId,
    financialActionRequestId: request.requestId,
    decision: "AUTO_AUTHORIZE",
    authorizedAmount: request.amount.actuality === "UNKNOWN" ? unknownAmount(request.currency) : request.amount,
    currency: request.currency,
    policyVersion: evaluation.policyVersion,
    reasonCodes: evaluation.reasonCodes,
    authorizationSource: "POLICY_ENGINE",
    expiresAt: new Date((now ?? new Date()).getTime() + 3600000).toISOString(),
    createdAt: nowIso(now),
  };
  request.status = "AUTHORIZED";
  store.requests.set(request.requestId, request);
  store.authorizations.set(authorization.authorizationId, authorization);
  return { request, evaluation, authorization };
}

export function reserveAuthorizedAction(
  store: TreasuryStore,
  input: { requestId: string; authorizationId: string },
): ReturnType<typeof reserveBudget> {
  const request = store.requests.get(input.requestId);
  const authorization = store.authorizations.get(input.authorizationId);
  if (!request || !authorization) return { ok: false, reason: "AUTHORIZATION_MISSING" };
  if (authorization.decision !== "AUTO_AUTHORIZE") return { ok: false, reason: "NOT_AUTHORIZED" };

  const existingReservation = [...store.reservations.values()].find(
    (reservation) => reservation.financialActionRequestId === request.requestId && reservation.status === "ACTIVE",
  );
  const spentReservation = [...store.reservations.values()].find(
    (reservation) => reservation.financialActionRequestId === request.requestId && reservation.status === "SPENT",
  );
  if (spentReservation) {
    return { ok: true, reservation: spentReservation, budget: store.budgets.get(spentReservation.budgetId)! };
  }
  if (existingReservation) {
    return { ok: true, reservation: existingReservation, budget: store.budgets.get(existingReservation.budgetId)! };
  }

  const amount = knownValue(authorization.authorizedAmount);
  if (amount == null) return { ok: false, reason: "AUTHORIZED_AMOUNT_UNKNOWN" };

  const budget =
    (request.ventureId
      ? findMatchingBudget(store, request.organizationId, { scopeType: "VENTURE", ventureId: request.ventureId })
      : null) ?? findMatchingBudget(store, request.organizationId, { scopeType: "GLOBAL" });

  if (!budget) return { ok: false, reason: "BUDGET_NOT_FOUND" };

  const reserved = reserveBudget(store, {
    organizationId: request.organizationId,
    budgetId: budget.budgetId,
    financialActionRequestId: request.requestId,
    amountUsd: amount,
    currency: request.currency,
  });
  if (reserved.ok) {
    request.status = "RESERVED";
    store.requests.set(request.requestId, request);
  }
  return reserved;
}

export type ExecuteAuthorizedActionInput = {
  requestId: string;
  authorizationId: string;
  reservationId?: string | null;
  provider?: string | null;
  idempotencyKey: string;
  simulate?: boolean;
  providerReference?: string | null;
  result?: Record<string, unknown>;
};

/**
 * Execution is mock/simulated in V1. Real provider mutations are never performed here.
 * Freeze/autonomy still block even simulated mutations unless the test enables autonomy.
 */
export function executeAuthorizedAction(
  store: TreasuryStore,
  input: ExecuteAuthorizedActionInput,
): { ok: true; execution: FinancialActionExecution } | { ok: false; reason: string; execution: FinancialActionExecution | null } {
  const existing = store.findByIdempotency(
    store.requests.get(input.requestId)?.organizationId ?? "",
    input.idempotencyKey,
    store.executions,
  );
  if (existing) return { ok: true, execution: existing };

  const request = store.requests.get(input.requestId);
  const authorization = store.authorizations.get(input.authorizationId);
  if (!request || !authorization) return { ok: false, reason: "AUTHORIZATION_MISSING", execution: null };

  const gate = evaluateMutationGate(store, request.organizationId);
  if (!gate.allowed) {
    return { ok: false, reason: gate.reasonCode ?? "MUTATION_BLOCKED", execution: null };
  }
  if (authorization.decision !== "AUTO_AUTHORIZE") {
    return { ok: false, reason: "NOT_AUTHORIZED", execution: null };
  }

  const execution: FinancialActionExecution = {
    executionId: newId(),
    organizationId: request.organizationId,
    financialActionRequestId: request.requestId,
    authorizationId: authorization.authorizationId,
    reservationId: input.reservationId ?? null,
    externalActionId: `ext-sim:${newId()}`,
    provider: input.provider ?? request.provider,
    status: input.simulate === false ? "SUCCEEDED" : "SIMULATED",
    providerReference: input.providerReference ?? null,
    idempotencyKey: input.idempotencyKey,
    result: sanitizeExecutionResult(input.result ?? {}),
    createdAt: nowIso(),
    completedAt: nowIso(),
  };

  store.executions.set(execution.executionId, execution);
  store.registerIdempotency(request.organizationId, input.idempotencyKey, execution.executionId);
  request.status = "EXECUTED";
  store.requests.set(request.requestId, request);

  if (input.reservationId) {
    consumeReservation(store, input.reservationId, "SPENT");
  }

  return { ok: true, execution };
}

export function sanitizeExecutionResult(result: Record<string, unknown>): Record<string, unknown> {
  const forbidden = /secret|token|authorization|api[_-]?key|password|card|cvv|cvc|pin|credential/i;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(result)) {
    if (forbidden.test(key)) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = sanitizeExecutionResult(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function assertNoDirectSpend(context: string): never {
  throw new Error(`NO_DIRECT_SPEND:${context}`);
}
