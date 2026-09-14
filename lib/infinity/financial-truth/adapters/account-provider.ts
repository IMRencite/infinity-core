import type {
  ClassifiedMercuryTransaction,
  DeniedBankCapability,
  ReadOnlyBankCapability,
  SafeBankAccount,
} from "../types";
import { DENIED_BANK_CAPABILITIES, FINANCIAL_ACCOUNT_PROVIDER_ADAPTER } from "../types";

export type BalanceRead = {
  current: number | null;
  available: number | null;
  currency: string;
  as_of: string | null;
};

export type FinancialAccountProviderAdapter = {
  adapter: typeof FINANCIAL_ACCOUNT_PROVIDER_ADAPTER;
  provider: string;
  capabilities: ReadOnlyBankCapability[];
  denied: DeniedBankCapability[];
  listAuthorizedAccounts(): Promise<SafeBankAccount[]>;
  readAccountMetadata(accountId: string): Promise<SafeBankAccount | null>;
  readCurrentBalance(accountId?: string): Promise<BalanceRead>;
  readAvailableBalance(accountId?: string): Promise<BalanceRead>;
  readRecentTransactions(input?: { limit?: number }): Promise<ClassifiedMercuryTransaction[]>;
  readTransactionDetail(transactionId: string): Promise<ClassifiedMercuryTransaction | null>;
  identifyStripeSettlements(transactions?: ClassifiedMercuryTransaction[]): Promise<ClassifiedMercuryTransaction[]>;
};

export function deniedBankCapabilities(): DeniedBankCapability[] {
  return [...DENIED_BANK_CAPABILITIES];
}

export function assertReadOnlyBankAdapter(adapter: FinancialAccountProviderAdapter): void {
  for (const capability of DENIED_BANK_CAPABILITIES) {
    if ((adapter as unknown as Record<string, unknown>)[capability]) {
      throw new Error(`BANK_MUTATION_EXPOSED:${capability}`);
    }
  }
}
