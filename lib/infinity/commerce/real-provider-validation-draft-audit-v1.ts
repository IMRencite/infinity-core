import { createHash } from "node:crypto";
import type { NormalizedGelatoRecipient } from "./gelato-real-order-shipping-v1.ts";
import { shippingParityFingerprint } from "./gelato-real-order-shipping-v1.ts";

export const REAL_PROVIDER_VALIDATION_DRAFT_AUDIT_V1 = "REAL_PROVIDER_VALIDATION_DRAFT_AUDIT_V1" as const;

export type RealProviderValidationDraftAuditV1 = {
  version: typeof REAL_PROVIDER_VALIDATION_DRAFT_AUDIT_V1;
  created_at: string;
  authorization_class: "NON_PRODUCTION_VALIDATION_DRAFT_ONLY";
  order_reference_id: string;
  customer_reference_id: string;
  approved_source_sha256: string;
  production_master_sha256: string;
  public_art_url: string;
  public_fetched_sha256: string;
  product_uid: string;
  print_areas: string[];
  shipping_fingerprint: string;
  shipment_method_uid: string | null;
  payload_qc: "PASS" | "FAIL";
};

export function buildRealProviderValidationDraftAuditV1(input: {
  order_reference_id: string;
  customer_reference_id: string;
  approved_source_sha256: string;
  production_master_sha256: string;
  public_art_url: string;
  public_fetched_sha256: string;
  product_uid: string;
  print_areas: string[];
  recipient: NormalizedGelatoRecipient;
  shipment_method_uid: string | null;
  payload_qc: "PASS" | "FAIL";
}): RealProviderValidationDraftAuditV1 {
  return {
    version: REAL_PROVIDER_VALIDATION_DRAFT_AUDIT_V1,
    created_at: new Date().toISOString(),
    authorization_class: "NON_PRODUCTION_VALIDATION_DRAFT_ONLY",
    order_reference_id: input.order_reference_id,
    customer_reference_id: input.customer_reference_id,
    approved_source_sha256: input.approved_source_sha256,
    production_master_sha256: input.production_master_sha256,
    public_art_url: input.public_art_url,
    public_fetched_sha256: input.public_fetched_sha256,
    product_uid: input.product_uid,
    print_areas: input.print_areas,
    shipping_fingerprint: shippingParityFingerprint(input.recipient),
    shipment_method_uid: input.shipment_method_uid,
    payload_qc: input.payload_qc,
  };
}

export function realProviderValidationDraftAuditQc(audit: RealProviderValidationDraftAuditV1 | null): "PASS" | "FAIL" {
  if (!audit || audit.version !== REAL_PROVIDER_VALIDATION_DRAFT_AUDIT_V1) return "FAIL";
  if (audit.authorization_class !== "NON_PRODUCTION_VALIDATION_DRAFT_ONLY") return "FAIL";
  if (audit.payload_qc !== "PASS") return "FAIL";
  if (!audit.public_fetched_sha256 || audit.public_fetched_sha256.length !== 64) return "FAIL";
  return "PASS";
}

export function validatedDraftFullStateParityQc(input: {
  audit: RealProviderValidationDraftAuditV1;
  draft_order_reference_id: string | null;
  draft_product_uid: string | null;
  draft_file_types: string[];
  draft_art_url: string | null;
  draft_provider_art_sha256: string | null;
  draft_shipping_fingerprint: string | null;
}): "PASS" | "FAIL" {
  if (input.draft_order_reference_id !== input.audit.order_reference_id) return "FAIL";
  if (input.draft_product_uid !== input.audit.product_uid) return "FAIL";
  if (!input.draft_file_types.includes("back") || input.draft_file_types.length !== 1) return "FAIL";
  if (
    input.draft_art_url !== input.audit.public_art_url &&
    input.draft_provider_art_sha256 !== input.audit.production_master_sha256
  ) {
    return "FAIL";
  }
  if (input.draft_shipping_fingerprint !== input.audit.shipping_fingerprint) return "FAIL";
  return "PASS";
}

export function sha256HexPrefix(value: string, len = 16): string {
  return createHash("sha256").update(value).digest("hex").slice(0, len);
}
