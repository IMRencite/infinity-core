import { advertiseCapabilities } from "./provider";
import {
  ProviderUnavailableError,
  UNSUPPORTED_CAPABILITY,
  UnsupportedCapabilityError,
  type CreatePaymentInput,
  type CreateVirtualCardInput,
  type FinancialProvider,
} from "./provider";
import type {
  FinancialProviderConfig,
  ProviderAccount,
  ProviderBalance,
  ProviderCard,
  ProviderPayment,
  ProviderRecipient,
  ProviderRecurringCommitment,
  ProviderTransaction,
} from "../types";
import { actualAmount } from "../types";

const MOCK_CAPABILITIES = [
  "ACCOUNT_READ",
  "BALANCE_READ",
  "TRANSACTION_READ",
  "CARD_READ",
  "PAYMENT_READ",
  "COMMITMENT_READ",
] as const;

export type MockFinancialProviderOptions = {
  available?: boolean;
  accounts?: ProviderAccount[];
  balances?: ProviderBalance[];
  transactions?: ProviderTransaction[];
  cards?: ProviderCard[];
  payments?: ProviderPayment[];
  commitments?: ProviderRecurringCommitment[];
};

/** Deterministic mock — mutations increment counters only and never touch external state. */
export class MockFinancialProvider implements FinancialProvider {
  readonly config: FinancialProviderConfig;
  available: boolean;
  mutationCount = 0;
  accounts: ProviderAccount[];
  balances: ProviderBalance[];
  transactions: ProviderTransaction[];
  cards: ProviderCard[];
  payments: ProviderPayment[];
  recipients: ProviderRecipient[] = [];
  commitments: ProviderRecurringCommitment[];

  constructor(options: MockFinancialProviderOptions = {}) {
    this.available = options.available ?? true;
    this.config = {
      providerKey: "mock",
      displayName: "Mock Financial Provider",
      capabilities: advertiseCapabilities([...MOCK_CAPABILITIES]),
      connectionStatus: this.available ? "CONFIGURED" : "UNAVAILABLE",
    };
    this.accounts = options.accounts ?? [
      {
        accountId: "mock-acct-operating",
        provider: "mock",
        displayName: "Infinity Operating",
        currency: "USD",
        accountKind: "CHECKING",
        externalAccountId: "ext-operating-1",
        status: "ACTIVE",
      },
    ];
    this.balances = options.balances ?? [
      {
        accountId: "mock-acct-operating",
        available: actualAmount(92500),
        current: actualAmount(92500),
        asOf: "2026-08-18T00:00:00.000Z",
      },
    ];
    this.transactions = options.transactions ?? [];
    this.cards = options.cards ?? [];
    this.payments = options.payments ?? [];
    this.commitments = options.commitments ?? [];
  }

  setAvailable(available: boolean): void {
    this.available = available;
    this.config.connectionStatus = available ? "CONFIGURED" : "UNAVAILABLE";
  }

  setBalances(balances: ProviderBalance[]): void {
    this.balances = balances;
  }

  private assertAvailable(): void {
    if (!this.available) throw new ProviderUnavailableError("mock");
  }

  async getAccounts(): Promise<ProviderAccount[]> {
    this.assertAvailable();
    return this.accounts;
  }

  async getBalances(): Promise<ProviderBalance[]> {
    this.assertAvailable();
    return this.balances;
  }

  async getTransactions(): Promise<ProviderTransaction[]> {
    this.assertAvailable();
    return this.transactions;
  }

  async getCards(): Promise<ProviderCard[]> {
    this.assertAvailable();
    return this.cards;
  }

  async getCardLimits(cardId: string): Promise<ProviderCard> {
    this.assertAvailable();
    const card = this.cards.find((c) => c.cardId === cardId);
    if (!card) throw new Error("CARD_NOT_FOUND");
    return card;
  }

  async getPayments(): Promise<ProviderPayment[]> {
    this.assertAvailable();
    return this.payments;
  }

  async getRecurringCommitments(): Promise<ProviderRecurringCommitment[]> {
    this.assertAvailable();
    return this.commitments;
  }

  /** Test-only mock mutation — never a real card. */
  async createVirtualCard(_input: CreateVirtualCardInput): Promise<ProviderCard> {
    this.assertAvailable();
    throw new UnsupportedCapabilityError("mock", "CARD_CREATE");
  }

  async createPayment(_input: CreatePaymentInput): Promise<ProviderPayment> {
    this.assertAvailable();
    throw new UnsupportedCapabilityError("mock", "PAYMENT_CREATE");
  }

  recordMockMutation(): void {
    this.mutationCount += 1;
  }
}

export function isUnsupportedCapability(error: unknown): error is UnsupportedCapabilityError {
  return error instanceof UnsupportedCapabilityError || (error instanceof Error && error.message.startsWith(UNSUPPORTED_CAPABILITY));
}
