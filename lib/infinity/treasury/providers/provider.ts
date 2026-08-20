import type { FinancialCapability, FinancialProviderKey } from "../constants";
import type {
  FinancialProviderConfig,
  ProviderAccount,
  ProviderBalance,
  ProviderCard,
  ProviderCapabilityMap,
  ProviderPayment,
  ProviderRecipient,
  ProviderRecurringCommitment,
  ProviderTransaction,
} from "../types";

export const UNSUPPORTED_CAPABILITY = "UNSUPPORTED_CAPABILITY" as const;

export class UnsupportedCapabilityError extends Error {
  readonly code = UNSUPPORTED_CAPABILITY;
  readonly capability: FinancialCapability;
  readonly providerKey: string;

  constructor(providerKey: string, capability: FinancialCapability) {
    super(`${UNSUPPORTED_CAPABILITY}:${capability}`);
    this.name = "UnsupportedCapabilityError";
    this.capability = capability;
    this.providerKey = providerKey;
  }
}

export class ProviderUnavailableError extends Error {
  readonly code = "PROVIDER_UNAVAILABLE";
  constructor(providerKey: string, reason?: string) {
    super(reason ?? `Provider ${providerKey} unavailable`);
    this.name = "ProviderUnavailableError";
  }
}

export class ProviderAuthFailedError extends Error {
  readonly code = "AUTH_FAILED";
  constructor(providerKey: string) {
    super("AUTH_FAILED");
    this.name = "ProviderAuthFailedError";
    void providerKey;
  }
}

export class ProviderRateLimitedError extends Error {
  readonly code = "RATE_LIMITED";
  constructor(providerKey: string) {
    super("RATE_LIMITED");
    this.name = "ProviderRateLimitedError";
    void providerKey;
  }
}

export class ProviderTimeoutError extends Error {
  readonly code = "TIMEOUT";
  constructor(providerKey: string) {
    super("TIMEOUT");
    this.name = "ProviderTimeoutError";
    void providerKey;
  }
}

export type CreateVirtualCardInput = {
  purpose: string;
  dailyLimitUsd?: number | null;
  monthlyLimitUsd?: number | null;
  idempotencyKey: string;
};

export type CreatePaymentInput = {
  recipientId: string;
  amountUsd: number;
  currency: string;
  idempotencyKey: string;
};

/**
 * Provider-neutral financial adapter.
 * Capability support is explicit — missing methods fail with UNSUPPORTED_CAPABILITY.
 * Adapters must never accept or return raw credentials.
 */
export interface FinancialProvider {
  readonly config: FinancialProviderConfig;
  getAccounts?(): Promise<ProviderAccount[]>;
  getBalances?(): Promise<ProviderBalance[]>;
  getTransactions?(): Promise<ProviderTransaction[]>;
  getCards?(): Promise<ProviderCard[]>;
  getCardLimits?(cardId: string): Promise<ProviderCard>;
  createVirtualCard?(input: CreateVirtualCardInput): Promise<ProviderCard>;
  freezeCard?(cardId: string): Promise<ProviderCard>;
  updateCardLimit?(cardId: string, input: { dailyLimitUsd?: number; monthlyLimitUsd?: number }): Promise<ProviderCard>;
  getPayments?(): Promise<ProviderPayment[]>;
  createPayment?(input: CreatePaymentInput): Promise<ProviderPayment>;
  getPaymentStatus?(paymentId: string): Promise<ProviderPayment>;
  getRecipients?(): Promise<ProviderRecipient[]>;
  createRecipient?(input: { displayName: string; idempotencyKey: string }): Promise<ProviderRecipient>;
  getRecurringCommitments?(): Promise<ProviderRecurringCommitment[]>;
}

export function advertiseCapabilities(supported: FinancialCapability[]): ProviderCapabilityMap {
  const map: ProviderCapabilityMap = {};
  for (const capability of supported) map[capability] = true;
  return map;
}

export function assertCapability(provider: FinancialProvider, capability: FinancialCapability): void {
  if (!provider.config.capabilities[capability]) {
    throw new UnsupportedCapabilityError(provider.config.providerKey, capability);
  }
}

export function providerKeyOf(provider: FinancialProvider): FinancialProviderKey | string {
  return provider.config.providerKey;
}
