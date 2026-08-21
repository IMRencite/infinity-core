import type { ConnectAccountType } from "./constants";
import { wrapMarketplacePaymentsBlocked, type MarketplaceConnectWriteCounter, type MarketplacePaymentCapability } from "./write-authority";

export type StripeConnectFoundation = {
  providerId: "stripe_connect";
  capability: "MARKETPLACE_PAYMENTS";
  modeled: {
    sellerOnboarding: true;
    buyerCheckout: true;
    platformFee: true;
    sellerAllocation: true;
    sellerPayout: true;
    refunds: true;
    disputes: true;
    payoutLifecycle: true;
    sellerAccountReadiness: true;
    platformAccountReadiness: true;
  };
  supportedAccountTypes: ConnectAccountType[];
  testModeContracts: readonly [
    "createConnectedAccount",
    "createAccountLink",
    "createPaymentIntent",
    "createCheckoutSession",
    "createTransfer",
    "createPayout",
    "createRefund",
    "createWebhookEndpoint",
  ];
  liveWriteAuthority: false;
};

export const STRIPE_CONNECT_FOUNDATION: StripeConnectFoundation = {
  providerId: "stripe_connect",
  capability: "MARKETPLACE_PAYMENTS",
  modeled: {
    sellerOnboarding: true,
    buyerCheckout: true,
    platformFee: true,
    sellerAllocation: true,
    sellerPayout: true,
    refunds: true,
    disputes: true,
    payoutLifecycle: true,
    sellerAccountReadiness: true,
    platformAccountReadiness: true,
  },
  supportedAccountTypes: ["EXPRESS", "STANDARD", "CUSTOM"],
  testModeContracts: [
    "createConnectedAccount",
    "createAccountLink",
    "createPaymentIntent",
    "createCheckoutSession",
    "createTransfer",
    "createPayout",
    "createRefund",
    "createWebhookEndpoint",
  ],
  liveWriteAuthority: false,
};

export function createStripeConnectAdapter(
  writes: MarketplaceConnectWriteCounter = { count: 0 },
): MarketplacePaymentCapability {
  const inner: MarketplacePaymentCapability = {
    capability: "MARKETPLACE_PAYMENTS",
    providerId: "stripe_connect",
    async createConnectedAccount() {
      return { accountId: "acct_never" };
    },
    async createAccountLink() {
      return { url: "https://connect.stripe.com/never" };
    },
    async createPaymentIntent() {
      return { id: "pi_never" };
    },
    async createCheckoutSession() {
      return { id: "cs_never", url: "https://checkout.stripe.com/never" };
    },
    async createTransfer() {
      return { id: "tr_never" };
    },
    async createPayout() {
      return { id: "po_never" };
    },
    async createRefund() {
      return { id: "re_never" };
    },
    async mutatePlatformFee() {
      return { updated: true };
    },
    async createWebhookEndpoint() {
      return { id: "we_never" };
    },
  };
  return wrapMarketplacePaymentsBlocked(inner, writes);
}
