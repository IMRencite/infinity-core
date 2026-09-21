import { CRE_CANDIDATE_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { CRE_VENTURE_ID, OCCUPANCYNPV_DOMAIN } from "./constants";
import { occupancynpvPubliclyLaunched } from "./occupancynpv-public-launch-evidence";
import { occupancynpvPaymentActivationEnabled } from "./occupancynpv-payment-reactivation-evidence";
import { evaluateOccupancynpvFulfillmentReadiness } from "./occupancynpv-fulfillment";
import { liveCommercialCheckoutUnhealthy } from "./occupancynpv-live-checkout-health";
import { listVentureOperationalRecords } from "./persist";
import type { VentureOperationalRecord } from "./types";

export const HQ_VENTURE_LIFECYCLE_STATES = [
  "DISCOVERED",
  "VALIDATING",
  "SELECTED",
  "BUILDING",
  "PRODUCT_READY",
  "FULFILLMENT_BLOCKED",
  "FULFILLMENT_READY",
  "PAYMENT_BLOCKED",
  "PAYMENT_READY",
  "ACTIVE",
  "LAUNCH_BLOCKED",
  "PUBLICLY_LAUNCHED",
  "PAUSED",
  "PIVOTING",
  "SHUTDOWN",
] as const;
export type HqVentureLifecycleState = (typeof HQ_VENTURE_LIFECYCLE_STATES)[number];

export function isValidCanonicalVenture(record: VentureOperationalRecord): boolean {
  return record.venture_status !== "ARCHIVED" && Boolean(record.venture_id);
}

export function occupancynpvAliases(): string[] {
  return [CRE_VENTURE_ID, CRE_CANDIDATE_ID, "occupancynpv", OCCUPANCYNPV_DOMAIN];
}

export function isOccupancynpvRecord(record: VentureOperationalRecord): boolean {
  const id = record.venture_id;
  const domain = String(record.primary_domain ?? "");
  const url = String(record.public_url ?? "");
  return (
    id === CRE_VENTURE_ID
    || id === CRE_CANDIDATE_ID
    || id === "occupancynpv"
    || domain === OCCUPANCYNPV_DOMAIN
    || url.includes("occupancynpv.com")
  );
}

export function projectEvidenceAwarePaymentState(record: VentureOperationalRecord): {
  paymentActivation: "YES" | "NO";
  payment: "ACTIVE" | "READY" | "BLOCKED" | "NO" | "DEGRADED";
} {
  const activated = isOccupancynpvRecord(record)
    ? occupancynpvPaymentActivationEnabled() || record.revenue_state === "PAYMENT_ACTIVATED"
    : record.revenue_state === "PAYMENT_ACTIVATED";
  if (activated && isOccupancynpvRecord(record) && liveCommercialCheckoutUnhealthy()) {
    return { paymentActivation: "YES", payment: "DEGRADED" };
  }
  if (activated) return { paymentActivation: "YES", payment: "ACTIVE" };
  if (record.payment_provider === "stripe" && record.payment_prices.length > 0) {
    return { paymentActivation: "NO", payment: "READY" };
  }
  return { paymentActivation: "NO", payment: "BLOCKED" };
}

export function projectEvidenceAwareFulfillmentState(record: VentureOperationalRecord): {
  fulfillmentGate: "PASS" | "FAIL";
  fulfillment: "PASS" | "FAIL" | "READY" | "BLOCKED";
} {
  if (isOccupancynpvRecord(record)) {
    const gate = evaluateOccupancynpvFulfillmentReadiness().result === "PASS" ? "PASS" as const : "FAIL" as const;
    return {
      fulfillmentGate: gate,
      fulfillment: gate,
    };
  }
  const ready = record.fulfillment_state === "FULFILLMENT_READY";
  return { fulfillmentGate: ready ? "PASS" : "FAIL", fulfillment: ready ? "READY" : "BLOCKED" };
}

export function projectEvidenceAwareCheckoutState(input: {
  paymentActivation: boolean;
  fulfillmentReady: boolean;
}): { createSession: boolean; checkout: "ENABLED" | "BLOCKED" | "DEGRADED" } {
  if (input.paymentActivation === true && input.fulfillmentReady === true && liveCommercialCheckoutUnhealthy()) {
    return { createSession: false, checkout: "DEGRADED" };
  }
  const enabled = input.paymentActivation === true && input.fulfillmentReady === true;
  return { createSession: enabled, checkout: enabled ? "ENABLED" : "BLOCKED" };
}

export function mapCanonicalLifecycle(record: VentureOperationalRecord): HqVentureLifecycleState {
  if (record.venture_status === "PAUSED") return "PAUSED";
  if (record.operating_stage === "PIVOTING") return "PIVOTING";
  if (record.operating_stage === "SHUTTING_DOWN") return "SHUTDOWN";
  if (record.public_launch_state === "YES" || (isOccupancynpvRecord(record) && occupancynpvPubliclyLaunched())) return "PUBLICLY_LAUNCHED";
  const payment = projectEvidenceAwarePaymentState(record);
  const fulfillment = projectEvidenceAwareFulfillmentState(record);
  if (payment.paymentActivation === "YES" && fulfillment.fulfillmentGate === "PASS") return "LAUNCH_BLOCKED";
  if (fulfillment.fulfillmentGate === "PASS" && payment.payment === "READY") return "PAYMENT_READY";
  if (fulfillment.fulfillmentGate === "PASS") return "FULFILLMENT_READY";
  if (fulfillment.fulfillmentGate === "FAIL" && record.payment_prices.length > 0) return "FULFILLMENT_BLOCKED";
  if (payment.payment === "BLOCKED") return "PAYMENT_BLOCKED";
  if (record.operating_stage === "BUILDING") return "BUILDING";
  if (record.operating_stage === "DISCOVERY") return "DISCOVERED";
  if (record.operating_stage === "VALIDATING") return "VALIDATING";
  if (record.operating_stage === "OPERATING" || record.operating_stage === "SCALING") return "ACTIVE";
  return "VALIDATING";
}

export function listCanonicalVenturesForHq(): VentureOperationalRecord[] {
  return listVentureOperationalRecords().filter(isValidCanonicalVenture);
}

export function isCanonicalOperatingVenture(record: VentureOperationalRecord): boolean {
  const lifecycle = mapCanonicalLifecycle(record);
  if (lifecycle === "PUBLICLY_LAUNCHED" || record.public_launch_state === "YES") return true;
  if (lifecycle === "VALIDATING" || lifecycle === "DISCOVERED" || lifecycle === "SELECTED") return false;
  return lifecycle === "ACTIVE" || record.operating_stage === "OPERATING" || record.operating_stage === "SCALING";
}

export function isCanonicalValidatingVenture(record: VentureOperationalRecord): boolean {
  const lifecycle = mapCanonicalLifecycle(record);
  if (lifecycle === "PUBLICLY_LAUNCHED" || record.public_launch_state === "YES") return false;
  return lifecycle === "VALIDATING" || record.operating_stage === "VALIDATING";
}

export function isCanonicalPubliclyLaunchedVenture(record: VentureOperationalRecord): boolean {
  return mapCanonicalLifecycle(record) === "PUBLICLY_LAUNCHED" || record.public_launch_state === "YES";
}
