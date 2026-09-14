import { isForbiddenTreasuryCredentialKey } from "@/lib/infinity/treasury/security";

export const TREASURY_CAPITAL_ALLOCATION_PAYLOAD_CONTRACT = "TreasuryCapitalAllocationPayloadContract" as const;
export const TREASURY_BUDGET_POLICY_PAYLOAD_CONTRACT = "TreasuryBudgetPolicyPayloadContract" as const;

export const SAFE_ALLOCATION_PAYLOAD_FIELDS = [
  "action",
  "ventureId",
  "venture_id",
  "amountUsd",
  "amount",
  "currency",
  "purpose",
  "note",
  "reviewCondition",
  "review_condition",
  "allocation_source",
  "source",
  "idempotencyKey",
  "idempotency_key",
  "increaseAllocation",
  "increase_allocation",
] as const;

export const SAFE_SPEND_AUTHORITY_PAYLOAD_FIELDS = [
  "action",
  "ventureId",
  "venture_id",
  "amountUsd",
  "amount",
  "currency",
  "purpose",
  "category",
  "effective_at",
  "effectiveAt",
  "review_at",
  "reviewAt",
  "reason",
  "authorization_source",
  "authorizationSource",
  "authorization_scope",
  "idempotencyKey",
  "idempotency_key",
] as const;

export const SAFE_BUDGET_PAYLOAD_FIELDS = [
  "action",
  "scope",
  "ventureId",
  "venture_id",
  "field",
  "policy_field",
  "category",
  "period",
  "amountUsd",
  "amount",
  "currency",
  "reason",
  "effective_at",
  "idempotencyKey",
  "idempotency_key",
] as const;

export type NamedPayloadGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

function scanBody(body: Record<string, unknown>, safe: readonly string[]): string[] {
  return Object.keys(body).filter((key) => isForbiddenTreasuryCredentialKey(key) && !safe.includes(key));
}

export function evaluateTreasuryAllocationPayloadSecurityGate(body: Record<string, unknown>): NamedPayloadGate {
  const refused = scanBody(body, SAFE_ALLOCATION_PAYLOAD_FIELDS);
  return {
    gate: "TreasuryAllocationPayloadSecurityGate",
    result: refused.length ? "FAIL" : "PASS",
    reasons: refused.length ? refused : ["SAFE_ALLOCATION_FIELDS_ONLY"],
  };
}

export function evaluateTreasurySpendAuthorityPayloadSecurityGate(body: Record<string, unknown>): NamedPayloadGate {
  const refused = scanBody(body, SAFE_SPEND_AUTHORITY_PAYLOAD_FIELDS);
  return {
    gate: "TreasurySpendAuthorityPayloadSecurityGate",
    result: refused.length ? "FAIL" : "PASS",
    reasons: refused.length ? refused : ["SAFE_SPEND_AUTHORITY_FIELDS_ONLY"],
  };
}

export function evaluateTreasuryBudgetPayloadSecurityGate(body: Record<string, unknown>): NamedPayloadGate {
  const refused = scanBody(body, SAFE_BUDGET_PAYLOAD_FIELDS);
  return {
    gate: "TreasuryBudgetPayloadSecurityGate",
    result: refused.length ? "FAIL" : "PASS",
    reasons: refused.length ? refused : ["SAFE_BUDGET_FIELDS_ONLY"],
  };
}

export function evaluateTreasuryAllocationIdempotencyGate(input: {
  first: { ok: boolean; allocated: number };
  retry: { ok: boolean; allocated: number };
}): NamedPayloadGate {
  const same = input.first.ok && input.retry.ok && input.first.allocated === input.retry.allocated;
  return {
    gate: "TreasuryAllocationIdempotencyGate",
    result: same ? "PASS" : "FAIL",
    reasons: [same ? "RETRY_DID_NOT_DUPLICATE" : "RETRY_CHANGED_ALLOCATION"],
  };
}

export function evaluateTreasuryBudgetMutationIdempotencyGate(input: {
  first: { ok: boolean; ceiling: number | string };
  retry: { ok: boolean; ceiling: number | string };
}): NamedPayloadGate {
  const same = input.first.ok && input.retry.ok && input.first.ceiling === input.retry.ceiling;
  return {
    gate: "TreasuryBudgetMutationIdempotencyGate",
    result: same ? "PASS" : "FAIL",
    reasons: [same ? "RETRY_DID_NOT_DUPLICATE" : "RETRY_CHANGED_BUDGET"],
  };
}
