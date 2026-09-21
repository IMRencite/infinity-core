import { OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS } from "@/lib/infinity/venture-operating-scale/occupancynpv-canonical-checkout";
import { occupancynpvCurrentProductionIdentity } from "@/lib/infinity/venture-operating-scale/occupancynpv-artifact-lineage";
import { readLiveCommercialCheckoutHealth } from "@/lib/infinity/venture-operating-scale/occupancynpv-live-checkout-health";
import { livePaymentPathVerificationFromHealthJson, occupancynpvPaymentPathFingerprint } from "./from-health";
import { occupancynpvErrorUxPass } from "./ux";
import type { LivePaymentPathVerificationRecord } from "./types";

export function occupancynpvCurrentFingerprint(): string {
  return occupancynpvPaymentPathFingerprint({
    keyMode: readLiveCommercialCheckoutHealth()?.keyMode ?? "LIVE",
    deploymentId: occupancynpvCurrentProductionIdentity().deploymentId,
  });
}

export function livePaymentPathVerificationFromOccupancynpvHealth(): LivePaymentPathVerificationRecord | null {
  const health = readLiveCommercialCheckoutHealth();
  const mapped = livePaymentPathVerificationFromHealthJson(health);
  if (!mapped) return null;
  const errorUx = occupancynpvErrorUxPass();
  return {
    ...mapped,
    fingerprint: occupancynpvCurrentFingerprint(),
    offers: mapped.offers.map((offer) => ({
      ...offer,
      errorUx,
      productId: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS[offer.offerId as "PROFESSIONAL" | "PER_DEAL"]?.productId ?? offer.productId,
      priceId: OCCUPANCYNPV_PAYMENT_PRICE_BINDINGS[offer.offerId as "PROFESSIONAL" | "PER_DEAL"]?.priceId ?? offer.priceId,
    })),
  };
}
