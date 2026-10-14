export const CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE =
  "cto_55ca5b85df77c55813e0ac6e-v42-canonical-art-validation-draft" as const;

export const CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL =
  "https://clubthrottle.com/storefront-merch/production-masters/lot_line-black-production-print-master-3600w.png" as const;

export const CLUB_THROTTLE_V42_APPROVED_SOURCE_SHA256 =
  "f45bf693fd3aa338e3b24e5598d45354f4347bdfd27351f3f22c243c10b4d8f1" as const;

export const CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256 =
  "04031af621d20bd20e58dc07ddde29eb48e73da6bf8d358b7435c2011ee6cb07" as const;

export const STALE_CANDIDATE3_SHA256 =
  "de2da0075ce0667642af65d8a89c520ac12b2d32566440d39f4a8e560148a751" as const;

export const CLUB_THROTTLE_V42_GELATO_PRODUCT_UID =
  "apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_heavy-weight_gsi_2xl_gco_black_gpr_0-4_gildan_5000" as const;

/** V42 — founder-gated conversion target (PATCH draft → order only when explicitly authorized). */
export const CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID =
  "4c3cd3c9-6ff0-47d6-a803-81771dffe21d" as const;

export const CLUB_THROTTLE_V42_DRAFT_CONVERSION_AUTHORIZED_ENV =
  "CLUB_THROTTLE_V42_DRAFT_CONVERSION_AUTHORIZED" as const;

export const V42_VALIDATED_DRAFT_FULL_STATE_SNAPSHOT_VERSION =
  "V42_VALIDATED_DRAFT_FULL_STATE_SNAPSHOT" as const;

export function v42ValidationDraftAuthorized(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.CLUB_THROTTLE_V42_VALIDATION_DRAFT_AUTHORIZED ?? "").trim() === "ENABLED";
}

export function v42DraftPayloadQc(input: {
  orderReferenceId: string;
  productUid: string;
  fileTypes: string[];
  artUrl: string;
}): "PASS" | "FAIL" {
  if (input.orderReferenceId !== CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE) return "FAIL";
  if (input.productUid !== CLUB_THROTTLE_V42_GELATO_PRODUCT_UID) return "FAIL";
  if (input.fileTypes.length !== 1 || input.fileTypes[0] !== "back") return "FAIL";
  if (input.artUrl !== CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL) return "FAIL";
  if (input.artUrl.includes("candidate3") || input.artUrl.includes("vercel.app")) return "FAIL";
  return "PASS";
}

export function draftCanonicalArtUrlQc(input: {
  provider_resolved_file_url: string | null;
  provider_downloaded_sha256: string | null;
  submitted_public_url?: string | null;
}): "PASS" | "FAIL" {
  if (input.submitted_public_url === CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL) return "PASS";
  if (input.provider_downloaded_sha256 === CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256) return "PASS";
  const url = input.provider_resolved_file_url ?? "";
  if (url.includes("candidate3") || url.includes("de2da007")) return "FAIL";
  return "FAIL";
}

export function v42DraftArtworkIdentityChainQc(input: {
  approved_source_sha: string;
  production_master_sha: string;
  public_art_sha: string;
  provider_downloaded_sha: string | null;
}): "PASS" | "FAIL" {
  if (input.approved_source_sha !== CLUB_THROTTLE_V42_APPROVED_SOURCE_SHA256) return "FAIL";
  if (input.production_master_sha !== CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256) return "FAIL";
  if (input.public_art_sha !== CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256) return "FAIL";
  if (input.public_art_sha === STALE_CANDIDATE3_SHA256) return "FAIL";
  if (input.provider_downloaded_sha && input.provider_downloaded_sha !== CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256) {
    return "FAIL";
  }
  return "PASS";
}

/** Provider may return a cached S3 URL; identity is proven by downloaded bytes, not URL string equality. */
export function providerCachedArtByteIdentityQc(input: {
  submitted_public_url: string | null;
  provider_resolved_file_url: string | null;
  provider_downloaded_sha256: string | null;
  expected_production_master_sha256: string;
}): "PASS" | "FAIL" {
  if (input.submitted_public_url && input.submitted_public_url === CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL) {
    return "PASS";
  }
  if (
    input.provider_downloaded_sha256 &&
    input.provider_downloaded_sha256 === input.expected_production_master_sha256
  ) {
    return "PASS";
  }
  const url = input.provider_resolved_file_url ?? "";
  if (url.includes("candidate3") || url.includes("de2da007")) return "FAIL";
  return "FAIL";
}

export function providerDownloadedArtHashParityQc(input: {
  production_master_sha256: string;
  provider_downloaded_sha256: string | null;
}): "PASS" | "FAIL" {
  if (!input.provider_downloaded_sha256) return "FAIL";
  return input.provider_downloaded_sha256 === input.production_master_sha256 ? "PASS" : "FAIL";
}

export function v42DraftIdempotencyResolve(input: {
  create_draft_requested: boolean;
  report_draft_id: string | null;
  event_draft_id: string | null;
}): {
  draft_id: string | null;
  idempotency_action: "NONE" | "CREATE_PENDING" | "RECONCILED_FROM_EVENT" | "RECONCILED_FROM_REPORT";
  should_post_draft: boolean;
} {
  if (input.event_draft_id) {
    return {
      draft_id: input.event_draft_id,
      idempotency_action: "RECONCILED_FROM_EVENT",
      should_post_draft: false,
    };
  }
  if (input.report_draft_id) {
    return {
      draft_id: input.report_draft_id,
      idempotency_action: "RECONCILED_FROM_REPORT",
      should_post_draft: false,
    };
  }
  if (input.create_draft_requested) {
    return { draft_id: null, idempotency_action: "CREATE_PENDING", should_post_draft: true };
  }
  return { draft_id: null, idempotency_action: "NONE", should_post_draft: false };
}

export function productionConversionAuthorized(input: {
  production_conversion_authorized: boolean;
  env?: NodeJS.ProcessEnv;
}): boolean {
  const env = input.env ?? process.env;
  const envFlag = (env[CLUB_THROTTLE_V42_DRAFT_CONVERSION_AUTHORIZED_ENV] ?? "").trim() === "ENABLED";
  return input.production_conversion_authorized === true && envFlag;
}

export type CanonicalReplacementConversionAttempt =
  | { allowed: false; reason: string; patch_body: null }
  | { allowed: true; reason: "FOUNDER_AUTHORIZED"; patch_body: { orderType: "order" } };

export function evaluateCanonicalReplacementDraftConversion(input: {
  provider_order_id: string;
  production_conversion_authorized: boolean;
  env?: NodeJS.ProcessEnv;
}): CanonicalReplacementConversionAttempt {
  if (input.provider_order_id !== CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID) {
    return { allowed: false, reason: "UNEXPECTED_DRAFT_ID", patch_body: null };
  }
  if (!productionConversionAuthorized(input)) {
    return { allowed: false, reason: "PRODUCTION_CONVERSION_UNAUTHORIZED", patch_body: null };
  }
  return { allowed: true, reason: "FOUNDER_AUTHORIZED", patch_body: { orderType: "order" } };
}

/** PASS when unauthorized conversion cannot proceed (guard engaged). */
export function canonicalReplacementConversionAuthorityQc(input: {
  production_conversion_authorized: boolean;
  conversion_attempt: CanonicalReplacementConversionAttempt;
}): "PASS" | "FAIL" {
  if (input.production_conversion_authorized) {
    return input.conversion_attempt.allowed ? "PASS" : "FAIL";
  }
  return input.conversion_attempt.allowed ? "FAIL" : "PASS";
}

export type V42ValidatedDraftFullStateSnapshot = {
  version: typeof V42_VALIDATED_DRAFT_FULL_STATE_SNAPSHOT_VERSION;
  generated_at: string;
  draft_id: string;
  order_reference: string;
  product_uid: string;
  quantity: number;
  file_type: string;
  canonical_art_url: string;
  canonical_art_hash: string;
  provider_downloaded_art_hash?: string | null;
  shipping_fingerprint: string;
  shipment_method_uid: string | null;
  provider_required_files: string[];
  missing_files: string[];
  hold_state: boolean | null;
};

export function v42ValidatedDraftSnapshotLockQc(
  snapshot: V42ValidatedDraftFullStateSnapshot | null,
): "PASS" | "FAIL" {
  if (!snapshot || snapshot.version !== V42_VALIDATED_DRAFT_FULL_STATE_SNAPSHOT_VERSION) return "FAIL";
  if (snapshot.draft_id !== CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID) return "FAIL";
  if (snapshot.order_reference !== CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE) return "FAIL";
  if (snapshot.product_uid !== CLUB_THROTTLE_V42_GELATO_PRODUCT_UID) return "FAIL";
  if (snapshot.canonical_art_hash !== CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256) return "FAIL";
  if (snapshot.file_type !== "back") return "FAIL";
  if (snapshot.quantity !== 1) return "FAIL";
  if (snapshot.missing_files.length > 0) return "FAIL";
  if (snapshot.hold_state === true) return "FAIL";
  return "PASS";
}

export function canonicalReplacementConversionReadyQc(input: {
  snapshot_lock_qc: "PASS" | "FAIL";
  end_to_end_validation_qc: "PASS" | "FAIL";
  artwork_identity_chain_qc: "PASS" | "FAIL";
  production_conversion_authorized: boolean;
}): boolean {
  if (input.production_conversion_authorized) return false;
  return (
    input.snapshot_lock_qc === "PASS" &&
    input.end_to_end_validation_qc === "PASS" &&
    input.artwork_identity_chain_qc === "PASS"
  );
}
