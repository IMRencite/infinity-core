import { TREASURY_STALE_AFTER_MS } from "../config";
import { ingestProviderTransaction } from "../ledger/engine";
import { createRecurringCommitment } from "../commitments/recurring";
import {
  ProviderAuthFailedError,
  ProviderRateLimitedError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from "../providers/provider";
import { mercuryHealthFromError } from "../providers/mercury/health";
import { mercurySafeErrorMessage } from "../providers/mercury/redact";
import { newId, nowIso, type TreasuryStore } from "../store";
import type {
  ProviderSyncResult,
  TreasuryAccount,
  TreasuryBalanceSnapshot,
  TreasuryProviderConnection,
} from "../types";
import type { FinancialProvider } from "../providers/provider";
import type { ProviderTruthClass } from "../constants";

export function classifyFreshness(lastSyncAt: string | null, now = new Date(), staleAfterMs = TREASURY_STALE_AFTER_MS) {
  if (!lastSyncAt) return "NOT_CONFIGURED" as const;
  const age = now.getTime() - new Date(lastSyncAt).getTime();
  if (!Number.isFinite(age) || age < 0) return "STALE" as const;
  if (age > staleAfterMs) return "STALE" as const;
  return "FRESH" as const;
}

function snapshotSourceFor(provider: FinancialProvider): TreasuryBalanceSnapshot["source"] {
  if (provider.config.truthClass === "PROVIDER_SANDBOX" || provider.config.environment === "SANDBOX") {
    return "PROVIDER_SANDBOX";
  }
  if (provider.config.truthClass === "PROVIDER_PRODUCTION" || provider.config.environment === "PRODUCTION") {
    return "PROVIDER_PRODUCTION";
  }
  return "PROVIDER";
}

function truthClassFor(provider: FinancialProvider): ProviderTruthClass | undefined {
  return provider.config.truthClass;
}

export async function syncFinancialProvider(
  store: TreasuryStore,
  input: {
    organizationId: string;
    provider: FinancialProvider;
    now?: Date;
  },
): Promise<ProviderSyncResult> {
  const now = input.now ?? new Date();
  const providerKey = input.provider.config.providerKey;
  const connection = ensureConnection(store, input.organizationId, providerKey, input.provider.config);

  if (input.provider.config.connectionStatus === "NOT_CONFIGURED") {
    connection.connectionStatus = "NOT_CONFIGURED";
    connection.health = "NOT_CONFIGURED";
    store.connections.set(connection.connectionId, connection);
    return emptySync(input.organizationId, "NOT_CONFIGURED", "PROVIDER_NOT_CONFIGURED");
  }

  try {
    const accounts = input.provider.getAccounts ? await input.provider.getAccounts() : [];
    const balances = input.provider.getBalances ? await input.provider.getBalances() : [];
    const transactions = input.provider.getTransactions ? await input.provider.getTransactions() : [];
    const commitments = input.provider.getRecurringCommitments ? await input.provider.getRecurringCommitments() : [];

    let accountsUpserted = 0;
    for (const account of accounts) {
      const row: TreasuryAccount = {
        accountId: account.accountId,
        organizationId: input.organizationId,
        provider: providerKey,
        externalAccountId: account.externalAccountId,
        displayName: account.displayName,
        currency: account.currency,
        accountKind: account.accountKind,
        status: account.status,
      };
      store.accounts.set(row.accountId, row);
      accountsUpserted += 1;
    }

    const source = snapshotSourceFor(input.provider);
    const truthClass = truthClassFor(input.provider);
    let balancesUpserted = 0;
    for (const balance of balances) {
      const snapshot: TreasuryBalanceSnapshot = {
        snapshotId: newId(),
        organizationId: input.organizationId,
        accountId: balance.accountId,
        available: balance.available,
        current: balance.current,
        capturedAt: nowIso(now),
        source,
        truthClass: balance.truthClass ?? truthClass,
        provenance: balance.provenance,
      };
      store.balanceSnapshots.set(`${input.organizationId}:${balance.accountId}:latest`, snapshot);
      store.balanceSnapshots.set(snapshot.snapshotId, snapshot);
      balancesUpserted += 1;
    }

    let ingested = 0;
    let duplicate = 0;
    for (const txn of transactions) {
      const result = ingestProviderTransaction(store, {
        organizationId: input.organizationId,
        provider: providerKey,
        providerTransactionId: txn.providerTransactionId,
        accountId: txn.accountId,
        amount: txn.amount,
        classification: txn.classification,
        merchant: txn.merchant,
        occurredAt: txn.occurredAt,
        status: txn.status,
        truthClass,
      });
      if (result.duplicate) duplicate += 1;
      else ingested += 1;
    }

    let commitmentsUpserted = 0;
    for (const commitment of commitments) {
      createRecurringCommitment(store, {
        organizationId: input.organizationId,
        vendor: commitment.vendor,
        provider: providerKey,
        purpose: commitment.vendor,
        category: "SOFTWARE_TOOLS",
        amount: commitment.amount,
        frequency: commitment.frequency,
        nextExpectedCharge: commitment.nextExpectedCharge,
        idempotencyKey: `commitment:${providerKey}:${commitment.commitmentId}`,
      });
      commitmentsUpserted += 1;
    }

    connection.lastSyncAt = nowIso(now);
    connection.connectionStatus = "CONFIGURED";
    connection.health = "READ_ONLY_VERIFIED";
    connection.environment = input.provider.config.environment;
    connection.truthClass = truthClass;
    connection.externalAccountIds = accounts.map((account) => account.externalAccountId);
    store.connections.set(connection.connectionId, connection);
    if ("markHealth" in input.provider && typeof input.provider.markHealth === "function") {
      input.provider.markHealth("READ_ONLY_VERIFIED");
    }

    return {
      organizationId: input.organizationId,
      freshness: "FRESH",
      lastProviderSyncAt: connection.lastSyncAt,
      accountsUpserted,
      balancesUpserted,
      transactionsIngested: ingested,
      transactionsDuplicate: duplicate,
      commitmentsUpserted,
      degraded: false,
      reason: null,
    };
  } catch (error) {
    const health = mercuryHealthFromError(error);
    const unavailable =
      error instanceof ProviderUnavailableError ||
      error instanceof ProviderAuthFailedError ||
      error instanceof ProviderRateLimitedError ||
      error instanceof ProviderTimeoutError ||
      (error instanceof Error &&
        (error.name === "ProviderUnavailableError" ||
          error.name === "ProviderAuthFailedError" ||
          error.name === "ProviderRateLimitedError" ||
          error.name === "ProviderTimeoutError"));
    connection.connectionStatus = health === "DEGRADED" ? "DEGRADED" : "UNAVAILABLE";
    connection.health = health;
    store.connections.set(connection.connectionId, connection);
    const reasonCode =
      health === "AUTH_FAILED"
        ? "AUTH_FAILED"
        : health === "RATE_LIMITED"
          ? "RATE_LIMITED"
          : unavailable
            ? "PROVIDER_UNAVAILABLE"
            : "SYNC_FAILED";
    return {
      organizationId: input.organizationId,
      freshness: "UNAVAILABLE",
      lastProviderSyncAt: connection.lastSyncAt,
      accountsUpserted: 0,
      balancesUpserted: 0,
      transactionsIngested: 0,
      transactionsDuplicate: 0,
      commitmentsUpserted: 0,
      degraded: true,
      reason: mercurySafeErrorMessage(reasonCode, null),
    };
  }
}

function ensureConnection(
  store: TreasuryStore,
  organizationId: string,
  provider: string,
  config: FinancialProvider["config"],
): TreasuryProviderConnection {
  const existing = [...store.connections.values()].find((c) => c.organizationId === organizationId && c.provider === provider);
  if (existing) {
    existing.environment = config.environment ?? existing.environment;
    existing.truthClass = config.truthClass ?? existing.truthClass;
    return existing;
  }
  const created: TreasuryProviderConnection = {
    connectionId: newId(),
    organizationId,
    provider,
    connectionStatus: config.connectionStatus === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "CONFIGURED",
    health: config.health ?? (config.connectionStatus === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "CONFIGURED"),
    environment: config.environment,
    truthClass: config.truthClass,
    externalAccountIds: [],
    capabilities: Object.entries(config.capabilities)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name) as TreasuryProviderConnection["capabilities"],
    lastSyncAt: null,
    createdAt: nowIso(),
  };
  store.connections.set(created.connectionId, created);
  return created;
}

function emptySync(organizationId: string, freshness: ProviderSyncResult["freshness"], reason: string): ProviderSyncResult {
  return {
    organizationId,
    freshness,
    lastProviderSyncAt: null,
    accountsUpserted: 0,
    balancesUpserted: 0,
    transactionsIngested: 0,
    transactionsDuplicate: 0,
    commitmentsUpserted: 0,
    degraded: freshness !== "FRESH",
    reason,
  };
}

export function cacheBalanceSnapshot(
  store: TreasuryStore,
  input: {
    organizationId: string;
    accountId: string;
    currentUsd: number;
    availableUsd?: number;
    capturedAt?: string;
  },
): TreasuryBalanceSnapshot {
  const snapshot: TreasuryBalanceSnapshot = {
    snapshotId: newId(),
    organizationId: input.organizationId,
    accountId: input.accountId,
    available: { value: input.availableUsd ?? input.currentUsd, actuality: "ESTIMATE", currency: "USD" },
    current: { value: input.currentUsd, actuality: "ESTIMATE", currency: "USD" },
    capturedAt: input.capturedAt ?? nowIso(),
    source: "CACHE",
  };
  store.balanceSnapshots.set(`${input.organizationId}:${input.accountId}:latest`, snapshot);
  store.balanceSnapshots.set(snapshot.snapshotId, snapshot);
  return snapshot;
}

export function latestBalanceSnapshot(store: TreasuryStore, organizationId: string, accountId: string): TreasuryBalanceSnapshot | null {
  return store.balanceSnapshots.get(`${organizationId}:${accountId}:latest`) ?? null;
}

export function latestBalanceSnapshotsForOrg(store: TreasuryStore, organizationId: string): TreasuryBalanceSnapshot[] {
  const seen = new Set<string>();
  const out: TreasuryBalanceSnapshot[] = [];
  for (const account of store.scoped(organizationId, store.accounts)) {
    const snapshot = latestBalanceSnapshot(store, organizationId, account.accountId);
    if (snapshot && !seen.has(snapshot.accountId)) {
      seen.add(snapshot.accountId);
      out.push(snapshot);
    }
  }
  return out;
}
