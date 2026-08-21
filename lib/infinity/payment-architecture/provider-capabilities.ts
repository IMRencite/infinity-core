import { MARKETPLACE_PAYMENT_CAPABILITY } from "./constants";
import type { PaymentProviderCandidate } from "./types";

export function marketplaceCapabilityId(): typeof MARKETPLACE_PAYMENT_CAPABILITY {
  return MARKETPLACE_PAYMENT_CAPABILITY;
}

export function isMarketplaceProviderCandidate(candidate: PaymentProviderCandidate): boolean {
  return candidate.capability === MARKETPLACE_PAYMENT_CAPABILITY;
}
