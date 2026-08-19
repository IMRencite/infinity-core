import { TREASURY_POLICY_VERSION } from "../constants";
import { knownValue } from "../budgets/engine";
import { findMatchingBudget } from "../budgets/engine";
import { evaluateMutationGate } from "../freeze/control";
import type { TreasuryStore } from "../store";
import { nowIso } from "../store";
import type {
  EpistemicAmount,
  FinancialActionRequest,
  FinancialPolicyEvaluation,
  PolicyEvaluationContext,
} from "../types";

export function isUnknownOrUnboundedCost(amount: EpistemicAmount): boolean {
  if (amount.actuality === "UNKNOWN") return true;
  if (amount.value == null) return true;
  if (!Number.isFinite(amount.value)) return true;
  if (amount.value === Number.POSITIVE_INFINITY) return true;
  return false;
}

function periodStart(now: Date, period: "DAILY" | "MONTHLY"): Date {
  if (period === "DAILY") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function spendInWindow(store: TreasuryStore, organizationId: string, start: Date, category?: string): number {
  let spent = 0;
  for (const entry of store.scoped(organizationId, store.ledger)) {
    if (entry.type !== "EXPENSE") continue;
    if (entry.actuality === "UNKNOWN" || entry.amount.value == null) continue;
    if (new Date(entry.occurredAt) < start) continue;
    if (category && entry.subtype && !entry.subtype.includes(category)) continue;
    spent += entry.amount.value;
  }
  for (const reservation of store.scoped(organizationId, store.reservations)) {
    if (reservation.status !== "ACTIVE") continue;
    if (new Date(reservation.createdAt) < start) continue;
    spent += knownValue(reservation.amount) ?? 0;
  }
  return spent;
}

function monthlyEquivalentOf(request: FinancialActionRequest): number | null {
  if (!request.recurring) return knownValue(request.amount);
  if (request.recurrence?.monthlyEquivalent) return knownValue(request.recurrence.monthlyEquivalent);
  const amount = knownValue(request.amount);
  if (amount == null) return null;
  switch (request.recurrence?.frequency) {
    case "WEEKLY":
      return amount * (52 / 12);
    case "QUARTERLY":
      return amount / 3;
    case "ANNUAL":
      return amount / 12;
    default:
      return amount;
  }
}

function existingMonthlyCommitments(store: TreasuryStore, organizationId: string, ventureId: string | null): number {
  let total = 0;
  for (const commitment of store.scoped(organizationId, store.commitments)) {
    if (commitment.status !== "ACTIVE") continue;
    if (ventureId && commitment.ventureId && commitment.ventureId !== ventureId) continue;
    total += knownValue(commitment.monthlyEquivalent) ?? 0;
  }
  return total;
}

/**
 * Deterministic Treasury policy. Unknown external cost never AUTO_AUTHORIZE.
 * Emergency freeze and disabled autonomy always BLOCK mutations.
 */
export function evaluateFinancialPolicy(store: TreasuryStore, ctx: PolicyEvaluationContext): FinancialPolicyEvaluation {
  const request = ctx.request;
  const now = ctx.now ?? new Date();
  const reasons: string[] = [];
  const policy = store.policyFor(request.organizationId);
  const gate = evaluateMutationGate(store, request.organizationId);

  if (!gate.allowed) {
    return {
      decision: "BLOCK",
      reasonCodes: [gate.reasonCode ?? "MUTATION_BLOCKED"],
      policyVersion: policy.policyVersion ?? TREASURY_POLICY_VERSION,
      evaluatedAt: nowIso(now),
    };
  }

  if (isUnknownOrUnboundedCost(request.amount)) {
    return {
      decision: policy.unknownCostDecision,
      reasonCodes: ["UNKNOWN_COST", "UNKNOWN_COST_NOT_ZERO"],
      policyVersion: policy.policyVersion,
      evaluatedAt: nowIso(now),
    };
  }

  const amount = knownValue(request.amount);
  if (amount == null) {
    return {
      decision: "BLOCK",
      reasonCodes: ["UNKNOWN_COST"],
      policyVersion: policy.policyVersion,
      evaluatedAt: nowIso(now),
    };
  }

  const effectiveAmount = request.recurring ? monthlyEquivalentOf(request) ?? amount : amount;
  if (request.recurring) {
    reasons.push("RECURRING_EVALUATED_AS_COMMITMENT");
  }

  if (policy.maximumSingleAutonomousPurchase != null && amount > policy.maximumSingleAutonomousPurchase) {
    return blockOrEscalate(reasons, "SINGLE_ACTION_LIMIT", policy.policyVersion, now);
  }

  const global = findMatchingBudget(store, request.organizationId, { scopeType: "GLOBAL" });
  if (global) {
    const available = knownValue(global.available);
    if (available == null) return escalate(reasons, "GLOBAL_AVAILABLE_UNKNOWN", policy.policyVersion, now);
    if (effectiveAmount > available) return blockOrEscalate(reasons, "GLOBAL_BUDGET_EXCEEDED", policy.policyVersion, now);
  }

  if (request.ventureId) {
    const ventureBudget = findMatchingBudget(store, request.organizationId, {
      scopeType: "VENTURE",
      ventureId: request.ventureId,
    });
    const allocation = [...store.allocations.values()].find(
      (a) => a.organizationId === request.organizationId && a.ventureId === request.ventureId,
    );
    const ventureAvailable = knownValue(ventureBudget?.available ?? allocation?.capitalAvailable ?? { value: null, actuality: "UNKNOWN", currency: "USD" });
    if (ventureBudget || allocation) {
      if (ventureAvailable == null) return escalate(reasons, "VENTURE_AVAILABLE_UNKNOWN", policy.policyVersion, now);
      if (effectiveAmount > ventureAvailable) {
        return blockOrEscalate(reasons, "VENTURE_ALLOCATION_EXCEEDED", policy.policyVersion, now);
      }
    }
  }

  if (request.missionId) {
    const missionBudget = findMatchingBudget(store, request.organizationId, {
      scopeType: "MISSION",
      missionId: request.missionId,
    });
    if (missionBudget) {
      const available = knownValue(missionBudget.available);
      if (available == null) return escalate(reasons, "MISSION_AVAILABLE_UNKNOWN", policy.policyVersion, now);
      if (effectiveAmount > available) return blockOrEscalate(reasons, "MISSION_BUDGET_EXCEEDED", policy.policyVersion, now);
    }
  }

  const categoryBudget = findMatchingBudget(store, request.organizationId, {
    scopeType: "CATEGORY",
    category: request.category,
  });
  if (categoryBudget) {
    const available = knownValue(categoryBudget.available);
    if (available == null) return escalate(reasons, "CATEGORY_AVAILABLE_UNKNOWN", policy.policyVersion, now);
    if (effectiveAmount > available) return blockOrEscalate(reasons, "CATEGORY_BUDGET_EXCEEDED", policy.policyVersion, now);
  } else {
    const limit = policy.categoryLimits[request.category];
    if (limit != null && effectiveAmount > limit) {
      return blockOrEscalate(reasons, "CATEGORY_BUDGET_EXCEEDED", policy.policyVersion, now);
    }
  }

  if (policy.categoryRestrictions.includes(request.category)) {
    return blockOrEscalate(reasons, "CATEGORY_RESTRICTED", policy.policyVersion, now);
  }

  if (request.provider && policy.providerAllowlist && !policy.providerAllowlist.includes(request.provider)) {
    return blockOrEscalate(reasons, "PROVIDER_NOT_ALLOWLISTED", policy.policyVersion, now);
  }
  if (request.merchant && policy.merchantAllowlist && !policy.merchantAllowlist.includes(request.merchant)) {
    return blockOrEscalate(reasons, "MERCHANT_NOT_ALLOWLISTED", policy.policyVersion, now);
  }

  if (policy.dailySpendingCeiling != null) {
    const daily = spendInWindow(store, request.organizationId, periodStart(now, "DAILY")) + effectiveAmount;
    if (daily > policy.dailySpendingCeiling) {
      return blockOrEscalate(reasons, "DAILY_CEILING_EXCEEDED", policy.policyVersion, now);
    }
  }
  if (policy.monthlySpendingCeiling != null) {
    const monthly =
      spendInWindow(store, request.organizationId, periodStart(now, "MONTHLY")) +
      existingMonthlyCommitments(store, request.organizationId, request.ventureId) +
      effectiveAmount;
    if (monthly > policy.monthlySpendingCeiling) {
      return blockOrEscalate(reasons, "MONTHLY_CEILING_EXCEEDED", policy.policyVersion, now);
    }
  }

  const dailyBudget = findMatchingBudget(store, request.organizationId, { scopeType: "DAILY" });
  if (dailyBudget) {
    const available = knownValue(dailyBudget.available);
    if (available == null) return escalate(reasons, "DAILY_AVAILABLE_UNKNOWN", policy.policyVersion, now);
    if (effectiveAmount > available) return blockOrEscalate(reasons, "DAILY_BUDGET_EXCEEDED", policy.policyVersion, now);
  }
  const monthlyBudget = findMatchingBudget(store, request.organizationId, { scopeType: "MONTHLY" });
  if (monthlyBudget) {
    const available = knownValue(monthlyBudget.available);
    if (available == null) return escalate(reasons, "MONTHLY_AVAILABLE_UNKNOWN", policy.policyVersion, now);
    if (effectiveAmount > available) return blockOrEscalate(reasons, "MONTHLY_BUDGET_EXCEEDED", policy.policyVersion, now);
  }

  if (request.provider) {
    const providerBudget = findMatchingBudget(store, request.organizationId, {
      scopeType: "PROVIDER",
      provider: request.provider,
    });
    if (providerBudget) {
      const available = knownValue(providerBudget.available);
      if (available == null) return escalate(reasons, "PROVIDER_AVAILABLE_UNKNOWN", policy.policyVersion, now);
      if (effectiveAmount > available) return blockOrEscalate(reasons, "PROVIDER_BUDGET_EXCEEDED", policy.policyVersion, now);
    }
  }

  const duplicate = store.findByIdempotency(request.organizationId, request.idempotencyKey, store.requests);
  if (duplicate && duplicate.requestId !== request.requestId && duplicate.status !== "PROPOSED" && duplicate.status !== "PENDING_POLICY") {
    return {
      decision: "BLOCK",
      reasonCodes: ["DUPLICATE_IDEMPOTENCY"],
      policyVersion: policy.policyVersion,
      evaluatedAt: nowIso(now),
    };
  }

  if (request.risk === "HIGH" && !request.economicJustification) {
    return escalate(reasons, "HIGH_RISK_MISSING_JUSTIFICATION", policy.policyVersion, now);
  }

  return {
    decision: "AUTO_AUTHORIZE",
    reasonCodes: reasons.length > 0 ? reasons : ["WITHIN_POLICY"],
    policyVersion: policy.policyVersion,
    evaluatedAt: nowIso(now),
  };
}

function blockOrEscalate(
  extra: string[],
  code: string,
  policyVersion: string,
  now: Date,
): FinancialPolicyEvaluation {
  return {
    decision: "BLOCK",
    reasonCodes: [...extra, code],
    policyVersion,
    evaluatedAt: nowIso(now),
  };
}

function escalate(
  extra: string[],
  code: string,
  policyVersion: string,
  now: Date,
): FinancialPolicyEvaluation {
  return {
    decision: "REQUIRE_POLICY_ESCALATION",
    reasonCodes: [...extra, code],
    policyVersion,
    evaluatedAt: nowIso(now),
  };
}
