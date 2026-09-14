import "server-only";

import { loadMercuryConfig } from "@/lib/infinity/treasury/providers/mercury/config";
import { MercuryFinancialProvider } from "@/lib/infinity/treasury/providers/mercury/provider";
import type { ProviderAccount, ProviderBalance, ProviderTransaction } from "@/lib/infinity/treasury/types";
import { classifyMercuryTransaction, identifyStripeSettlements } from "../classify";
import { emptyMercurySnapshot } from "../cash-position";
import { freshnessFromAge, maskAccountRef } from "../amounts";
import { mapMercuryConnection } from "../mercury-connection";
import type { MercuryCashSnapshot, MercuryConnectionState, MercuryFailureStage, SafeBankAccount } from "../types";
import {
  DENIED_BANK_CAPABILITIES,
  FINANCIAL_ACCOUNT_PROVIDER_ADAPTER,
  MERCURY_FINANCIAL_ACCOUNT_ADAPTER,
  READ_ONLY_BANK_CAPABILITIES,
} from "../types";
import type { BalanceRead, FinancialAccountProviderAdapter } from "./account-provider";

export { mapMercuryConnection };

function last4FromAccount(account: ProviderAccount): string | null {
  if (account.last4 && /^\d{4}$/.test(account.last4)) return account.last4;
  const raw = `${account.externalAccountId ?? ""} ${account.accountId ?? ""}`;
  const match = raw.match(/(\d{4})\s*$/);
  return match?.[1] ?? null;
}

function toSafeAccount(account: ProviderAccount): SafeBankAccount {
  const last4 = last4FromAccount(account);
  return {
    account_id: account.accountId,
    provider: "mercury",
    display_name: account.displayName,
    safe_account_reference: maskAccountRef({ last4, id: account.accountId, provider: "mercury" }),
    last4,
    currency: account.currency || "USD",
    status: account.status,
  };
}

export class MercuryFinancialAccountAdapter implements FinancialAccountProviderAdapter {
  readonly adapter = FINANCIAL_ACCOUNT_PROVIDER_ADAPTER;
  readonly provider = "mercury";
  readonly implementation = MERCURY_FINANCIAL_ACCOUNT_ADAPTER;
  readonly capabilities = [...READ_ONLY_BANK_CAPABILITIES];
  readonly denied = [...DENIED_BANK_CAPABILITIES];
  private readonly inner: MercuryFinancialProvider;

  constructor(options: { env?: NodeJS.Dict<string>; fetchImpl?: typeof fetch; now?: () => Date } = {}) {
    this.inner = new MercuryFinancialProvider({
      env: options.env,
      fetchImpl: options.fetchImpl,
      now: options.now,
    });
  }

  connectionState(): MercuryConnectionState {
    const pub = this.inner.publicConfig;
    return mapMercuryConnection({
      enabled: pub.enabled,
      tokenConfigured: pub.tokenConfigured,
    });
  }

  async listAuthorizedAccounts(): Promise<SafeBankAccount[]> {
    if (this.connectionState() !== "LIVE" && !this.inner.publicConfig.tokenConfigured) return [];
    try {
      const accounts = await this.inner.getAccounts();
      return accounts.map(toSafeAccount);
    } catch {
      return [];
    }
  }

  async readAccountMetadata(accountId: string): Promise<SafeBankAccount | null> {
    const accounts = await this.listAuthorizedAccounts();
    return accounts.find((row) => row.account_id === accountId) ?? null;
  }

  async readCurrentBalance(accountId?: string): Promise<BalanceRead> {
    return this.readBalance(accountId);
  }

  async readAvailableBalance(accountId?: string): Promise<BalanceRead> {
    return this.readBalance(accountId);
  }

  private async readBalance(accountId?: string): Promise<BalanceRead> {
    const empty: BalanceRead = { current: null, available: null, currency: "USD", as_of: null };
    if (!this.inner.publicConfig.tokenConfigured) return empty;
    try {
      const balances = await this.inner.getBalances();
      const match = accountId ? balances.find((row) => row.accountId === accountId) : balances[0];
      if (!match) return empty;
      return fromProviderBalance(match);
    } catch {
      return empty;
    }
  }

  async readRecentTransactions(input?: { limit?: number }): Promise<ReturnType<typeof classifyMercuryTransaction>[]> {
    if (!this.inner.publicConfig.tokenConfigured) return [];
    try {
      const txns = await this.inner.getTransactions();
      return txns.slice(0, input?.limit ?? 50).map(fromProviderTransaction);
    } catch {
      return [];
    }
  }

  async readTransactionDetail(transactionId: string) {
    const rows = await this.readRecentTransactions({ limit: 200 });
    return rows.find((row) => row.safe_transaction_id === transactionId) ?? null;
  }

  async identifyStripeSettlements(transactions?: ReturnType<typeof classifyMercuryTransaction>[]) {
    const rows = transactions ?? (await this.readRecentTransactions({ limit: 100 }));
    return identifyStripeSettlements(rows);
  }

  async snapshot(): Promise<MercuryCashSnapshot> {
    return this.snapshotWithTrace().then((row) => row.snapshot);
  }

  async snapshotWithTrace(): Promise<{ snapshot: MercuryCashSnapshot; failing_stage: MercuryFailureStage | null }> {
    const pub = this.inner.publicConfig;
    let stage: MercuryFailureStage = "auth/session/config";
    if (!pub.tokenConfigured || !pub.enabled) {
      return {
        snapshot: {
          ...emptyMercurySnapshot("CREDENTIALS_REQUIRED"),
          failure_stage: "auth/session/config",
          provider_error: !pub.enabled ? "MERCURY_DISABLED" : "TOKEN_NOT_CONFIGURED",
        },
        failing_stage: "auth/session/config",
      };
    }
    try {
      stage = "live provider request";
      const [accounts, balances, transactions] = await Promise.all([
        this.inner.getAccounts(),
        this.inner.getBalances(),
        this.inner.getTransactions(),
      ]);
      stage = "account selection";
      const operating = pickOperatingAccount(accounts, balances);
      const balance = operating.balance;
      const account = operating.account;
      if (!account && !balance) {
        return {
          snapshot: failedMercurySnapshot("FAIL", "account selection", "NO_OPERATING_ACCOUNT"),
          failing_stage: "account selection",
        };
      }
      stage = "response parsing";
      const current = balance?.current.value ?? null;
      const available = balance?.available.value ?? balance?.current.value ?? null;
      stage = "current/available balance";
      if (current == null && available == null) {
        return {
          snapshot: failedMercurySnapshot("FAIL", "current/available balance", "BALANCE_UNPARSED"),
          failing_stage: "current/available balance",
        };
      }
      const verifiedAt = new Date().toISOString();
      return {
        snapshot: {
          connection: "LIVE",
          operating_account_verified: Boolean(account),
          current,
          available,
          currency: balance?.current.currency ?? account?.currency ?? "USD",
          last_verified: verifiedAt,
          safe_account_reference: account
            ? maskAccountRef({ last4: last4FromAccount(account), id: account.accountId, provider: "mercury" })
            : "mercury ****????",
          founder_estimate_treated_as_verified: false,
          transactions: transactions.slice(0, 50).map(fromProviderTransaction),
          freshness: freshnessFromAge(verifiedAt),
          mutation_capability: false,
          money_movement_capability: false,
          read_only: true,
          failure_stage: null,
          provider_error: null,
        },
        failing_stage: null,
      };
    } catch (error) {
      const classified = classifyMercuryAdapterError(error, stage, pub);
      return {
        snapshot: failedMercurySnapshot(classified.connection, classified.stage, classified.provider_error),
        failing_stage: classified.stage,
      };
    }
  }
}

function failedMercurySnapshot(
  connection: MercuryConnectionState,
  stage: MercuryFailureStage,
  providerError: string,
): MercuryCashSnapshot {
  return {
    ...emptyMercurySnapshot(connection === "LIVE" ? "FAIL" : connection),
    failure_stage: stage,
    provider_error: providerError,
  };
}

function classifyMercuryAdapterError(
  error: unknown,
  stage: MercuryFailureStage,
  pub: { enabled: boolean; tokenConfigured: boolean },
): { connection: MercuryConnectionState; stage: MercuryFailureStage; provider_error: string } {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code) : null;
  const name = error && typeof error === "object" && "name" in error ? String((error as { name?: string }).name) : null;
  const message = error instanceof Error ? error.message : "PROVIDER_ERROR";
  const authFailed = code === "AUTH_FAILED" || name === "ProviderAuthFailedError";
  const timeout = name === "ProviderTimeoutError" || /timeout|aborted/i.test(message);
  const failingStage: MercuryFailureStage = authFailed
    ? "auth/session/config"
    : timeout
      ? "live provider request"
      : stage;
  const connection = mapMercuryConnection({
    enabled: pub.enabled,
    tokenConfigured: pub.tokenConfigured,
    errorCode: authFailed ? "AUTH_FAILED" : code,
  });
  return {
    connection: connection === "LIVE" ? "FAIL" : connection,
    stage: failingStage,
    provider_error: authFailed ? "AUTH_FAILED" : timeout ? "PROVIDER_TIMEOUT" : code || name || "PROVIDER_RESPONSE_FAILURE",
  };
}

function fromProviderBalance(balance: ProviderBalance): BalanceRead {
  return {
    current: balance.current.value,
    available: balance.available.value,
    currency: balance.current.currency || "USD",
    as_of: balance.asOf,
  };
}

function fromProviderTransaction(txn: ProviderTransaction) {
  return classifyMercuryTransaction({
    safe_transaction_id: txn.providerTransactionId,
    account_id: txn.accountId,
    amount: txn.amount.value,
    currency: txn.amount.currency,
    description: txn.description,
    merchant: txn.merchant,
    occurred_at: txn.occurredAt,
    status: txn.status,
  });
}

function pickOperatingAccount(accounts: ProviderAccount[], balances: ProviderBalance[]) {
  const checking = accounts.find((row) => row.accountKind === "CHECKING" && row.status === "ACTIVE") ?? accounts[0] ?? null;
  const balance = checking
    ? balances.find((row) => row.accountId === checking.accountId) ?? balances[0] ?? null
    : balances[0] ?? null;
  return { account: checking, balance };
}

export function createMercuryFinancialAccountAdapter(options?: {
  env?: NodeJS.Dict<string>;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}): MercuryFinancialAccountAdapter {
  return new MercuryFinancialAccountAdapter(options);
}

export function mercuryCredentialsPresent(env: NodeJS.Dict<string> = process.env): boolean {
  return loadMercuryConfig(env).public.tokenConfigured;
}
