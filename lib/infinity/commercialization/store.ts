import { randomUUID } from "node:crypto";
import type {
  CommercialEntitlement,
  CommercialLedgerEntry,
  CommercialPaymentEvent,
  CommercialProduct,
  CommercialPrice,
  CommercialCheckoutConfiguration,
  CommercializationPlan,
  DeploymentAsset,
  DomainAsset,
  DomainCandidate,
  DomainRequirement,
  DnsDesiredState,
  FinancialTruth,
  PolicyOutcome,
  RevenueActivationPlan,
  SpendAuthorization,
  SpendExecution,
  SpendIntent,
  VentureBudget,
} from "./types";

/** In-memory store for dry-run tests and local orchestration */
export class CommercializationStore {
  plans = new Map<string, CommercializationPlan>();
  budgets = new Map<string, VentureBudget>();
  spendIntents = new Map<string, SpendIntent>();
  spendAuthorizations = new Map<string, SpendAuthorization>();
  spendExecutions = new Map<string, SpendExecution>();
  ledger = new Map<string, CommercialLedgerEntry>();
  domainRequirements = new Map<string, DomainRequirement>();
  domainCandidates = new Map<string, DomainCandidate>();
  domainAssets = new Map<string, DomainAsset>();
  dnsStates = new Map<string, DnsDesiredState>();
  deploymentAssets = new Map<string, DeploymentAsset>();
  revenuePlans = new Map<string, RevenueActivationPlan>();
  products = new Map<string, CommercialProduct>();
  prices = new Map<string, CommercialPrice>();
  checkouts = new Map<string, CommercialCheckoutConfiguration>();
  paymentEvents = new Map<string, CommercialPaymentEvent>();
  entitlements = new Map<string, CommercialEntitlement>();

  idempotencyIndex = new Map<string, string>();

  private key(orgId: string, idempotencyKey: string): string {
    return `${orgId}:${idempotencyKey}`;
  }

  findByIdempotency<T>(orgId: string, idempotencyKey: string, map: Map<string, T>): T | null {
    const id = this.idempotencyIndex.get(this.key(orgId, idempotencyKey));
    if (!id) return null;
    return map.get(id) ?? null;
  }

  registerIdempotency(orgId: string, idempotencyKey: string, id: string): void {
    this.idempotencyIndex.set(this.key(orgId, idempotencyKey), id);
  }

  budgetForVenture(orgId: string, ventureId: string): VentureBudget | null {
    return [...this.budgets.values()].find((b) => b.organizationId === orgId && b.ventureId === ventureId) ?? null;
  }

  ledgerForVenture(orgId: string, ventureId: string): CommercialLedgerEntry[] {
    return [...this.ledger.values()].filter((e) => e.organizationId === orgId && e.ventureId === ventureId);
  }

  paymentEventByProviderId(orgId: string, provider: string, providerEventId: string): CommercialPaymentEvent | null {
    return (
      [...this.paymentEvents.values()].find(
        (e) => e.organizationId === orgId && e.provider === provider && e.providerEventId === providerEventId,
      ) ?? null
    );
  }
}

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function truthLabel(value: number | null, truth: FinancialTruth): string {
  if (value == null || truth === "UNKNOWN") return "UNKNOWN";
  if (truth === "ESTIMATE") return `$${value.toFixed(2)} ESTIMATE`;
  return `$${value.toFixed(2)} ACTUAL`;
}
