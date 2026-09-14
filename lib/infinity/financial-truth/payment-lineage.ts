import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { VENTURE_PAYMENT_LINEAGE_FIELDS, type VenturePaymentLineageField } from "./types";

export const OCCUPANCYNPV_PAYMENT_LINEAGE_SOURCE_KEYS = [
  "infinity_venture",
  "infinity_venture_id",
  "infinity_offer",
  "infinity_offer_id",
  "infinity_customer_id",
  "infinity_stripe_account",
] as const;

export function requiredPaymentLineageFields(): readonly VenturePaymentLineageField[] {
  return VENTURE_PAYMENT_LINEAGE_FIELDS;
}

export function occupancyNpvPaymentLineagePresent(): boolean {
  return OCCUPANCYNPV_PAYMENT_LINEAGE_SOURCE_KEYS.length >= 4;
}

export function attributePaymentToVenture(input: {
  description?: string | null;
  metadataVentureId?: string | null;
  metadataVentureSlug?: string | null;
}): string | null {
  if (input.metadataVentureId) return input.metadataVentureId;
  if ((input.metadataVentureSlug ?? "").toLowerCase() === "occupancynpv") return CRE_VENTURE_ID;
  if (/occupancynpv/i.test(input.description ?? "")) return CRE_VENTURE_ID;
  return null;
}

export function settlementDoesNotChangeAttribution(
  revenueVentureId: string | null,
  settlementClassification: string,
): boolean {
  void settlementClassification;
  return Boolean(revenueVentureId);
}
