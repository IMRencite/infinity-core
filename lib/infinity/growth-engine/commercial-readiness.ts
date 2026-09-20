import { existsSync, readFileSync } from "node:fs";

export const OCCUPANCYNPV_LIVE_CHECKOUT_HEALTH_PATH =
  ".infinity/venture-operating-scale/occupancynpv-live-checkout-health.json" as const;

export type NarrowCommercialHealth = {
  result: "PASS" | "FAIL";
  fulfillment?: "PASS" | "FAIL";
  paymentActivation?: "YES" | "NO";
  professionalAmount?: number;
  perDealAmount?: number;
};

function healthPath(): string {
  return process.env.VITEST
    ? ".infinity/venture-operating-scale/occupancynpv-live-checkout-health.vitest.json"
    : OCCUPANCYNPV_LIVE_CHECKOUT_HEALTH_PATH;
}

export function readOccupancynpvCommercialHealth(): NarrowCommercialHealth | null {
  const path = existsSync(healthPath()) ? healthPath() : OCCUPANCYNPV_LIVE_CHECKOUT_HEALTH_PATH;
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      result?: string;
      fulfillment?: string;
      paymentActivation?: string;
      professional?: { amount?: number };
      perDeal?: { amount?: number };
    };
    return {
      result: raw.result === "PASS" ? "PASS" : "FAIL",
      fulfillment: raw.fulfillment === "PASS" ? "PASS" : "FAIL",
      paymentActivation: raw.paymentActivation === "YES" ? "YES" : "NO",
      professionalAmount: raw.professional?.amount,
      perDealAmount: raw.perDeal?.amount,
    };
  } catch {
    return null;
  }
}

export function liveCommercialCheckoutUnhealthy(): boolean {
  return readOccupancynpvCommercialHealth()?.result === "FAIL";
}

export function evaluatePaymentPathReadinessFromHealth(): { gate: "PaymentPathReadinessGate"; result: "PASS" | "FAIL" } {
  const health = readOccupancynpvCommercialHealth();
  return { gate: "PaymentPathReadinessGate", result: health?.result === "PASS" ? "PASS" : "FAIL" };
}

export function evaluatePaymentPathVerificationFreshnessFromHealth(now = new Date().toISOString()): {
  gate: "PaymentPathVerificationFreshnessGate";
  result: "PASS" | "FAIL";
} {
  if (!existsSync(OCCUPANCYNPV_LIVE_CHECKOUT_HEALTH_PATH) && !existsSync(healthPath())) {
    return { gate: "PaymentPathVerificationFreshnessGate", result: "FAIL" };
  }
  try {
    const raw = JSON.parse(readFileSync(existsSync(healthPath()) ? healthPath() : OCCUPANCYNPV_LIVE_CHECKOUT_HEALTH_PATH, "utf8")) as {
      detectedAt?: string;
    };
    if (!raw.detectedAt) return { gate: "PaymentPathVerificationFreshnessGate", result: "FAIL" };
    const age = new Date(now).getTime() - new Date(raw.detectedAt).getTime();
    return {
      gate: "PaymentPathVerificationFreshnessGate",
      result: age <= 36 * 60 * 60 * 1000 ? "PASS" : "FAIL",
    };
  } catch {
    return { gate: "PaymentPathVerificationFreshnessGate", result: "FAIL" };
  }
}

export function evaluateLiveCommercialCheckoutHealthFromRecord(): {
  gate: "LiveCommercialCheckoutHealthGate";
  result: "PASS" | "FAIL";
} {
  return {
    gate: "LiveCommercialCheckoutHealthGate",
    result: readOccupancynpvCommercialHealth()?.result === "PASS" ? "PASS" : "FAIL",
  };
}

export function evaluateFulfillmentReadinessFromHealth(): { gate: "FulfillmentReadinessGate"; result: "PASS" | "FAIL" } {
  return {
    gate: "FulfillmentReadinessGate",
    result: readOccupancynpvCommercialHealth()?.fulfillment === "PASS" ? "PASS" : "FAIL",
  };
}
