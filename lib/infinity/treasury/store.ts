import { randomUUID } from "node:crypto";
import { DEFAULT_TREASURY_POLICY, type TreasuryPolicyConfig } from "./config";
import type {
  BudgetReservation,
  FinancialActionExecution,
  FinancialActionRequest,
  FinancialAuthorization,
  RecurringCommitment,
  TreasuryAccount,
  TreasuryBalanceSnapshot,
  TreasuryBudget,
  TreasuryControlState,
  TreasuryLedgerEntry,
  TreasuryProviderConnection,
  TreasuryTransaction,
  VentureCapitalAllocation,
} from "./types";

export class TreasuryStore {
  connections = new Map<string, TreasuryProviderConnection>();
  accounts = new Map<string, TreasuryAccount>();
  balanceSnapshots = new Map<string, TreasuryBalanceSnapshot>();
  transactions = new Map<string, TreasuryTransaction>();
  budgets = new Map<string, TreasuryBudget>();
  reservations = new Map<string, BudgetReservation>();
  allocations = new Map<string, VentureCapitalAllocation>();
  requests = new Map<string, FinancialActionRequest>();
  authorizations = new Map<string, FinancialAuthorization>();
  executions = new Map<string, FinancialActionExecution>();
  ledger = new Map<string, TreasuryLedgerEntry>();
  commitments = new Map<string, RecurringCommitment>();
  control = new Map<string, TreasuryControlState>();
  policyByOrg = new Map<string, TreasuryPolicyConfig>();

  idempotencyIndex = new Map<string, string>();
  providerTxnIndex = new Map<string, string>();
  queryCount = 0;

  private key(orgId: string, idempotencyKey: string): string {
    return `${orgId}:${idempotencyKey}`;
  }

  findByIdempotency<T>(orgId: string, idempotencyKey: string, map: Map<string, T>): T | null {
    this.queryCount += 1;
    const id = this.idempotencyIndex.get(this.key(orgId, idempotencyKey));
    if (!id) return null;
    return map.get(id) ?? null;
  }

  registerIdempotency(orgId: string, idempotencyKey: string, id: string): void {
    this.idempotencyIndex.set(this.key(orgId, idempotencyKey), id);
  }

  findTransactionByProviderId(orgId: string, provider: string, providerTransactionId: string): TreasuryTransaction | null {
    this.queryCount += 1;
    const id = this.providerTxnIndex.get(`${orgId}:${provider}:${providerTransactionId}`);
    if (!id) return null;
    return this.transactions.get(id) ?? null;
  }

  registerProviderTransaction(orgId: string, provider: string, providerTransactionId: string, id: string): void {
    this.providerTxnIndex.set(`${orgId}:${provider}:${providerTransactionId}`, id);
  }

  policyFor(orgId: string): TreasuryPolicyConfig {
    this.queryCount += 1;
    return this.policyByOrg.get(orgId) ?? DEFAULT_TREASURY_POLICY;
  }

  controlFor(orgId: string): TreasuryControlState {
    this.queryCount += 1;
    const existing = this.control.get(orgId);
    if (existing) return existing;
    const created: TreasuryControlState = {
      organizationId: orgId,
      financialAutonomyEnabled: DEFAULT_TREASURY_POLICY.financialAutonomyEnabledDefault,
      emergencyFinancialFreeze: DEFAULT_TREASURY_POLICY.emergencyFinancialFreezeDefault,
      updatedAt: nowIso(),
    };
    this.control.set(orgId, created);
    return created;
  }

  setControl(orgId: string, patch: Partial<Pick<TreasuryControlState, "financialAutonomyEnabled" | "emergencyFinancialFreeze">>): TreasuryControlState {
    const current = this.controlFor(orgId);
    const next: TreasuryControlState = {
      ...current,
      ...patch,
      updatedAt: nowIso(),
    };
    this.control.set(orgId, next);
    return next;
  }

  scoped<T extends { organizationId: string }>(orgId: string, map: Map<string, T>): T[] {
    this.queryCount += 1;
    return [...map.values()].filter((row) => row.organizationId === orgId);
  }

  budgetsForOrg(orgId: string): TreasuryBudget[] {
    this.queryCount += 1;
    return [...this.budgets.values()].filter((b) => b.scope.organizationId === orgId);
  }
}

export function newId(): string {
  return randomUUID();
}

export function nowIso(now?: Date): string {
  return (now ?? new Date()).toISOString();
}
