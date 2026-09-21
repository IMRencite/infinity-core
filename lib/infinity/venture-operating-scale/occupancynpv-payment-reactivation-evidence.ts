import { existsSync, readFileSync } from "node:fs";

export const OCCUPANCYNPV_PAYMENT_REACTIVATION_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-payment-reactivation.json";

export const OCCUPANCYNPV_FOUNDER_PAYMENT_REACTIVATION_AUTHORIZED = true;

export type OccupancynpvPaymentReactivationEvidence = {
  founder_reauthorization: true;
  payment_activation: "YES" | "NO";
  publicly_launched: "NO";
  activated_at: string | null;
  authority: "Founder reauthorization after FulfillmentReadinessGate PASS";
  stripe_account: "acct_18h5CjLdvXKx7R7G";
  professional_price: "price_1UCs7hLdvXKx7R7GF2TPmwGL";
  per_deal_price: "price_1UCs7iLdvXKx7R7GmikBTGx4";
  webhook: "we_1UCssQLdvXKx7R7GcHonT3rh";
  deployment_id: string | null;
  artifact_id: string | null;
  digest: string | null;
};

export function readOccupancynpvPaymentReactivationEvidence(): OccupancynpvPaymentReactivationEvidence | null {
  if (!existsSync(OCCUPANCYNPV_PAYMENT_REACTIVATION_EVIDENCE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_PAYMENT_REACTIVATION_EVIDENCE_PATH, "utf8")) as OccupancynpvPaymentReactivationEvidence;
  } catch {
    return null;
  }
}

export function occupancynpvPaymentActivationEnabled(): boolean {
  return readOccupancynpvPaymentReactivationEvidence()?.payment_activation === "YES";
}
