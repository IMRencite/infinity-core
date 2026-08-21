import { ReadOnlyMutationBlockedError } from "@/lib/infinity/commercialization/probes/mode";
import { BLOCKED_CONNECT_WRITES, type BlockedConnectWrite, type ConnectAccountType } from "./constants";

export type MarketplaceConnectWriteCounter = { count: number };

export type MarketplacePaymentCapability = {
  readonly capability: "MARKETPLACE_PAYMENTS";
  readonly providerId: string;
  createConnectedAccount(input: { email: string; accountType?: ConnectAccountType }): Promise<{ accountId: string }>;
  createAccountLink(input: { accountId: string; returnUrl: string }): Promise<{ url: string }>;
  createPaymentIntent(input: { amountUsd: number; currency: string }): Promise<{ id: string }>;
  createCheckoutSession(input: { amountUsd: number; currency: string }): Promise<{ id: string; url: string }>;
  createTransfer(input: { amountUsd: number; destinationAccountId: string }): Promise<{ id: string }>;
  createPayout(input: { amountUsd: number; accountId: string }): Promise<{ id: string }>;
  createRefund(input: { paymentId: string; amountUsd: number }): Promise<{ id: string }>;
  mutatePlatformFee(input: { takeRatePercent: number }): Promise<{ updated: boolean }>;
  createWebhookEndpoint(input: { url: string }): Promise<{ id: string }>;
};

function blocked(operation: BlockedConnectWrite, _writes: MarketplaceConnectWriteCounter): never {
  throw new ReadOnlyMutationBlockedError(operation);
}

export function wrapMarketplacePaymentsBlocked(
  inner: MarketplacePaymentCapability,
  writes: MarketplaceConnectWriteCounter = { count: 0 },
): MarketplacePaymentCapability {
  return {
    capability: "MARKETPLACE_PAYMENTS",
    providerId: inner.providerId,
    createConnectedAccount: async () => blocked("createConnectedAccount", writes),
    createAccountLink: async () => blocked("createAccountLink", writes),
    createPaymentIntent: async () => blocked("createPaymentIntent", writes),
    createCheckoutSession: async () => blocked("createCheckoutSession", writes),
    createTransfer: async () => blocked("createTransfer", writes),
    createPayout: async () => blocked("createPayout", writes),
    createRefund: async () => blocked("createRefund", writes),
    mutatePlatformFee: async () => blocked("mutatePlatformFee", writes),
    createWebhookEndpoint: async () => blocked("createWebhookEndpoint", writes),
  };
}

export function isBlockedConnectWrite(value: string): value is BlockedConnectWrite {
  return (BLOCKED_CONNECT_WRITES as readonly string[]).includes(value);
}

export async function assertConnectWriteUnauthorized(
  adapter: MarketplacePaymentCapability,
): Promise<Record<BlockedConnectWrite, "BLOCKED">> {
  const result = {} as Record<BlockedConnectWrite, "BLOCKED">;
  for (const operation of BLOCKED_CONNECT_WRITES) {
    try {
      await (adapter[operation] as (input: never) => Promise<unknown>)({} as never);
      throw new Error(`${operation} was not blocked`);
    } catch (error) {
      if (!(error instanceof ReadOnlyMutationBlockedError)) throw error;
      result[operation] = "BLOCKED";
    }
  }
  return result;
}
