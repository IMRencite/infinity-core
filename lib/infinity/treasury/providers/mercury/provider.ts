import {
  MERCURY_V1_DENIED_CAPABILITIES,
  MERCURY_V1_READ_CAPABILITIES,
  type FinancialCapability,
  type ProviderHealth,
} from "../../constants";
import type {
  FinancialProviderConfig,
  ProviderAccount,
  ProviderBalance,
  ProviderCard,
  ProviderPayment,
  ProviderRecipient,
  ProviderTransaction,
} from "../../types";
import {
  advertiseCapabilities,
  assertCapability,
  ProviderUnavailableError,
  type CreatePaymentInput,
  type CreateVirtualCardInput,
  type FinancialProvider,
} from "../provider";
import { MercuryHttpClient } from "./client";
import {
  MERCURY_MAX_TRANSACTION_PAGES,
  MERCURY_MAX_TRANSACTIONS,
  MERCURY_TRANSACTION_PAGE_LIMIT,
  loadMercuryConfig,
  type MercuryPublicConfig,
  type MercuryResolvedConfig,
} from "./config";
import {
  extractMercuryAccounts,
  extractMercuryTransactions,
  nextMercuryPage,
  normalizeMercuryAccount,
  normalizeMercuryBalance,
  normalizeMercuryTransaction,
  type MercuryNormalizeContext,
} from "./normalize";

export type MercuryFinancialProviderOptions = {
  env?: NodeJS.Dict<string>;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  resolved?: MercuryResolvedConfig;
};

export class MercuryFinancialProvider implements FinancialProvider {
  readonly config: FinancialProviderConfig;
  readonly publicConfig: MercuryPublicConfig;
  readonly http: MercuryHttpClient;
  private readonly resolved: MercuryResolvedConfig;
  private readonly now: () => Date;
  private accountPayload: unknown | null = null;
  health: ProviderHealth;

  constructor(options: MercuryFinancialProviderOptions = {}) {
    this.resolved = options.resolved ?? loadMercuryConfig(options.env);
    this.publicConfig = this.resolved.public;
    this.now = options.now ?? (() => new Date());
    this.health = this.publicConfig.health;
    this.config = {
      providerKey: "mercury",
      displayName: "Mercury",
      capabilities: advertiseCapabilities([...MERCURY_V1_READ_CAPABILITIES]),
      connectionStatus: this.health === "CONFIGURED" ? "CONFIGURED" : "NOT_CONFIGURED",
      health: this.health,
      environment: this.publicConfig.mode,
      truthClass:
        this.publicConfig.mode === "PRODUCTION"
          ? "PROVIDER_PRODUCTION"
          : this.publicConfig.mode === "SANDBOX"
            ? "PROVIDER_SANDBOX"
            : "INTERNAL_MANUAL",
    };
    this.http = new MercuryHttpClient({
      config: this.publicConfig,
      credentials: this.resolved.credentials,
      fetchImpl: options.fetchImpl,
      now: this.now,
    });
  }

  markHealth(health: ProviderHealth): void {
    this.health = health;
    this.config.health = health;
    if (health === "READ_ONLY_VERIFIED") this.config.connectionStatus = "CONFIGURED";
    else if (health === "CONFIGURED") this.config.connectionStatus = "CONFIGURED";
    else if (health === "NOT_CONFIGURED") this.config.connectionStatus = "NOT_CONFIGURED";
    else if (health === "DEGRADED") this.config.connectionStatus = "DEGRADED";
    else this.config.connectionStatus = "UNAVAILABLE";
  }

  private context(): MercuryNormalizeContext {
    const environment = this.publicConfig.mode === "PRODUCTION" ? "PRODUCTION" : "SANDBOX";
    return { environment, fetchedAt: this.now().toISOString() };
  }

  private assertConfigured(): void {
    if (this.config.connectionStatus === "NOT_CONFIGURED" || !this.resolved.credentials) {
      this.markHealth("NOT_CONFIGURED");
      throw new ProviderUnavailableError("mercury", "PROVIDER_NOT_CONFIGURED");
    }
  }

  private async loadAccountPayload(): Promise<unknown> {
    if (this.accountPayload != null) return this.accountPayload;
    const payload = await this.http.getJson("accounts", "GET_ACCOUNTS");
    this.accountPayload = payload;
    return payload;
  }

  async getAccounts(): Promise<ProviderAccount[]> {
    assertCapability(this, "ACCOUNT_READ");
    this.assertConfigured();
    const payload = await this.loadAccountPayload();
    const ctx = this.context();
    return extractMercuryAccounts(payload)
      .map((row) => normalizeMercuryAccount(row, ctx))
      .filter((row): row is ProviderAccount => row != null);
  }

  async getBalances(): Promise<ProviderBalance[]> {
    assertCapability(this, "BALANCE_READ");
    this.assertConfigured();
    const payload = await this.loadAccountPayload();
    const ctx = this.context();
    return extractMercuryAccounts(payload)
      .map((row) => normalizeMercuryBalance(row, ctx))
      .filter((row): row is ProviderBalance => row != null);
  }

  async getTransactions(): Promise<ProviderTransaction[]> {
    assertCapability(this, "TRANSACTION_READ");
    this.assertConfigured();
    const accounts = await this.getAccounts();
    const ctx = this.context();
    const out: ProviderTransaction[] = [];
    for (const account of accounts) {
      const pages = await this.listAccountTransactions(account.accountId, ctx);
      out.push(...pages);
      if (out.length >= MERCURY_MAX_TRANSACTIONS) break;
    }
    return out.slice(0, MERCURY_MAX_TRANSACTIONS);
  }

  private async listAccountTransactions(accountId: string, ctx: MercuryNormalizeContext): Promise<ProviderTransaction[]> {
    const collected: ProviderTransaction[] = [];
    let offset = 0;
    let page = 0;
    while (page < MERCURY_MAX_TRANSACTION_PAGES && collected.length < MERCURY_MAX_TRANSACTIONS) {
      page += 1;
      const path = `account/${encodeURIComponent(accountId)}/transactions?limit=${MERCURY_TRANSACTION_PAGE_LIMIT}&offset=${offset}`;
      const payload = await this.http.getJson(path, "GET_TRANSACTIONS");
      const extracted = extractMercuryTransactions(payload);
      const normalized = extracted.transactions
        .map((row) => normalizeMercuryTransaction(row, accountId, ctx))
        .filter((row): row is ProviderTransaction => row != null);
      collected.push(...normalized);
      const next = nextMercuryPage({
        offset,
        page,
        accumulated: collected.length,
        pageSize: MERCURY_TRANSACTION_PAGE_LIMIT,
        fetchedThisPage: extracted.transactions.length,
        total: extracted.total,
        maxPages: MERCURY_MAX_TRANSACTION_PAGES,
        maxRecords: MERCURY_MAX_TRANSACTIONS,
      });
      if (next.done) break;
      offset = next.nextOffset;
    }
    return collected;
  }

  async getCards(): Promise<ProviderCard[]> {
    this.denyWrite("CARD_READ");
  }

  async getCardLimits(_cardId: string): Promise<ProviderCard> {
    this.denyWrite("CARD_READ");
  }

  async createVirtualCard(_input: CreateVirtualCardInput): Promise<ProviderCard> {
    this.denyWrite("CARD_CREATE");
  }

  async freezeCard(_cardId: string): Promise<ProviderCard> {
    this.denyWrite("CARD_FREEZE");
  }

  async updateCardLimit(_cardId: string, _input: { dailyLimitUsd?: number; monthlyLimitUsd?: number }): Promise<ProviderCard> {
    this.denyWrite("CARD_LIMIT_UPDATE");
  }

  async getPayments(): Promise<ProviderPayment[]> {
    this.denyWrite("PAYMENT_READ");
  }

  async createPayment(_input: CreatePaymentInput): Promise<ProviderPayment> {
    this.denyWrite("PAYMENT_CREATE");
  }

  async getPaymentStatus(_paymentId: string): Promise<ProviderPayment> {
    this.denyWrite("PAYMENT_READ");
  }

  async getRecipients(): Promise<ProviderRecipient[]> {
    this.denyWrite("RECIPIENT_READ");
  }

  async createRecipient(_input: { displayName: string; idempotencyKey: string }): Promise<ProviderRecipient> {
    this.denyWrite("RECIPIENT_CREATE");
  }

  async sendMoney(_input: unknown): Promise<never> {
    this.denyWrite("SEND_MONEY");
  }

  async updateTransactionMetadata(_input: unknown): Promise<never> {
    this.denyWrite("TRANSACTION_METADATA_WRITE");
  }

  async internalTransfer(_input: unknown): Promise<never> {
    this.denyWrite("INTERNAL_TRANSFER_WRITE");
  }

  denyWrite(capability: string): never {
    this.http.denyWrite(capability);
  }

  isWriteDenied(capability: string): boolean {
    return (MERCURY_V1_DENIED_CAPABILITIES as readonly string[]).includes(capability) || !(this.config.capabilities[capability as FinancialCapability] ?? false);
  }

  toJSON(): Record<string, unknown> {
    return {
      providerKey: this.config.providerKey,
      displayName: this.config.displayName,
      capabilities: this.config.capabilities,
      connectionStatus: this.config.connectionStatus,
      health: this.health,
      environment: this.config.environment,
      tokenConfigured: this.publicConfig.tokenConfigured,
      writeHttpCalls: this.http.writeHttpCalls,
    };
  }
}

export function createMercuryFinancialProvider(options?: MercuryFinancialProviderOptions): MercuryFinancialProvider {
  return new MercuryFinancialProvider(options);
}

export function mercuryWriteCallCount(provider: MercuryFinancialProvider): number {
  return provider.http.writeHttpCalls;
}
