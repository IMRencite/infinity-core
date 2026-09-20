import type { NamedOutboundLoopGate } from "../closed-loop";
import { OFFER_TRUTH_VERSION } from "./sales-class";

export const OFFER_ATTESTATION_SCOPE = "communication-offer-attestation-v5" as const;

export type VentureOfferTruthAttestation = {
  version: typeof OFFER_TRUTH_VERSION;
  facts: {
    free_trial: "3-day free trial";
    credit_card_required: false;
    automatic_billing: false;
    pricing_url: "https://occupancynpv.com/pricing";
  };
  source: "VentureOfferProfile";
  attestation_status: "PENDING" | "ATTESTED";
  attested_by: string | null;
  attested_at: string | null;
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function pendingOccupancyNpvOfferAttestation(): VentureOfferTruthAttestation {
  return {
    version: OFFER_TRUTH_VERSION,
    facts: {
      free_trial: "3-day free trial",
      credit_card_required: false,
      automatic_billing: false,
      pricing_url: "https://occupancynpv.com/pricing",
    },
    source: "VentureOfferProfile",
    attestation_status: "PENDING",
    attested_by: null,
    attested_at: null,
  };
}

export function evaluateOfferAttestationGate(attestation: VentureOfferTruthAttestation, pricingLive: boolean): NamedOutboundLoopGate {
  const pass = attestation.attestation_status === "ATTESTED" && pricingLive && attestation.facts.pricing_url === "https://occupancynpv.com/pricing";
  return named("VentureOfferTruthAttestationGate", pass ? "PASS" : "FAIL", [
    attestation.attestation_status,
    pricingLive ? "PRICING_LIVE" : "PRICING_NOT_LIVE",
  ]);
}
