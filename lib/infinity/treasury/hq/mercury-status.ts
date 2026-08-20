import { knownValue } from "../budgets/engine";
import type { MercuryPublicConfig } from "../providers/mercury/config";
import { mercuryStatusLabel, resolveMercuryHealth } from "../providers/mercury/health";
import { latestBalanceSnapshotsForOrg } from "../sync/provider-sync";
import type { TreasuryStore } from "../store";
import type { EpistemicAmount } from "../types";
import { unknownAmount } from "../types";
import { formatHqAmount, type TruthfulHqValue } from "./read-model";
import type { ProviderEnvironment, ProviderHealth } from "../constants";

export type MercuryHqStatus = {
  provider: "MERCURY";
  mode: ProviderEnvironment;
  health: ProviderHealth;
  statusLabel: string;
  environment: ProviderEnvironment;
  connectionReadStatus: string;
  lastSuccessfulSync: string | null;
  accountCount: number;
  providerBalance: TruthfulHqValue;
  providerBalanceTruthClass: string;
  transactionFreshness: string;
  tokenVisible: false;
};

function formatSandboxBalance(amount: EpistemicAmount): TruthfulHqValue {
  if (amount.actuality === "UNKNOWN" || amount.value == null || !Number.isFinite(amount.value)) {
    return { display: "UNKNOWN · SANDBOX", actuality: "UNKNOWN", stale: false };
  }
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: amount.currency || "USD" }).format(amount.value);
  return { display: `${formatted} SANDBOX`, actuality: "ESTIMATE", stale: false };
}

function sumProviderBalances(amounts: EpistemicAmount[]): EpistemicAmount {
  let total = 0;
  let unknown = false;
  let any = false;
  let currency = "USD";
  for (const amount of amounts) {
    any = true;
    currency = amount.currency || currency;
    const value = knownValue(amount);
    if (value == null) {
      unknown = true;
      continue;
    }
    total += value;
  }
  if (!any || unknown) return unknownAmount(currency);
  return { value: total, actuality: "ESTIMATE", currency };
}

export function buildMercuryHqStatus(
  store: TreasuryStore,
  organizationId: string,
  publicConfig?: MercuryPublicConfig | null,
): MercuryHqStatus {
  const mercuryConnections = store
    .scoped(organizationId, store.connections)
    .filter((connection) => connection.provider === "mercury");
  const connection = mercuryConnections[0] ?? null;
  const mode = publicConfig?.mode ?? connection?.environment ?? "DISABLED";
  const health = publicConfig
    ? resolveMercuryHealth({ publicConfig, connection })
    : connection?.health ?? "NOT_CONFIGURED";
  const accounts = store.scoped(organizationId, store.accounts).filter((account) => account.provider === "mercury");
  const snapshots = latestBalanceSnapshotsForOrg(store, organizationId).filter(
    (snapshot) => snapshot.truthClass === "PROVIDER_SANDBOX" || snapshot.source === "PROVIDER_SANDBOX" || snapshot.provenance?.source === "MERCURY",
  );
  const providerBalanceAmount = sumProviderBalances(snapshots.map((snapshot) => snapshot.current));
  const transactions = store.scoped(organizationId, store.transactions).filter((txn) => txn.provider === "mercury");
  const lastTxn = transactions.map((txn) => txn.occurredAt).sort().at(-1) ?? null;
  const lastSync = connection?.lastSyncAt ?? null;
  const freshness =
    health === "READ_ONLY_VERIFIED" && lastSync
      ? "FRESH"
      : health === "NOT_CONFIGURED"
        ? "NOT CONFIGURED"
        : lastSync
          ? "STALE"
          : "NOT VERIFIED";

  return {
    provider: "MERCURY",
    mode,
    health,
    statusLabel: mercuryStatusLabel({ health, mode }),
    environment: mode,
    connectionReadStatus: health,
    lastSuccessfulSync: health === "READ_ONLY_VERIFIED" ? lastSync : null,
    accountCount: accounts.length,
    providerBalance:
      mode === "SANDBOX" || snapshots.some((snapshot) => snapshot.source === "PROVIDER_SANDBOX")
        ? formatSandboxBalance(providerBalanceAmount)
        : formatHqAmount(providerBalanceAmount),
    providerBalanceTruthClass:
      mode === "PRODUCTION" ? "PROVIDER_PRODUCTION" : mode === "SANDBOX" ? "PROVIDER_SANDBOX" : "INTERNAL_MANUAL",
    transactionFreshness: lastTxn ? freshness : freshness,
    tokenVisible: false,
  };
}
