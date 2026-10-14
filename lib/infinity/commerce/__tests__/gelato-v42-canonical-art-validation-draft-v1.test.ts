import { describe, expect, it } from "vitest";
import {
  CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL,
  CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
  CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
  STALE_CANDIDATE3_SHA256,
  canonicalReplacementConversionAuthorityQc,
  canonicalReplacementConversionReadyQc,
  draftCanonicalArtUrlQc,
  evaluateCanonicalReplacementDraftConversion,
  providerCachedArtByteIdentityQc,
  providerDownloadedArtHashParityQc,
  v42DraftArtworkIdentityChainQc,
  v42DraftIdempotencyResolve,
  v42DraftPayloadQc,
  v42ValidatedDraftSnapshotLockQc,
  CLUB_THROTTLE_V42_GELATO_PRODUCT_UID,
  CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE,
  CLUB_THROTTLE_V42_APPROVED_SOURCE_SHA256,
} from "../gelato-v42-canonical-art-validation-draft-v1.ts";
import {
  buildRealProviderValidationDraftAuditV1,
  REAL_PROVIDER_VALIDATION_DRAFT_AUDIT_V1,
  validatedDraftFullStateParityQc,
} from "../real-provider-validation-draft-audit-v1.ts";

const S3_CACHED_BACK_URL =
  "https://gelato-api-live.s3.eu-west-1.amazonaws.com/order/order_product_file/example/file_original_back";

describe("V42 canonical art validation draft", () => {
  it("accepts payload with clubthrottle.com master and gpr_0-4 back only", () => {
    expect(
      v42DraftPayloadQc({
        orderReferenceId: CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE,
        productUid: CLUB_THROTTLE_V42_GELATO_PRODUCT_UID,
        fileTypes: ["back"],
        artUrl: CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL,
      }),
    ).toBe("PASS");
  });

  it("passes canonical art URL QC when provider cached S3 URL differs but bytes match production master", () => {
    expect(
      draftCanonicalArtUrlQc({
        provider_resolved_file_url: S3_CACHED_BACK_URL,
        provider_downloaded_sha256: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
        submitted_public_url: CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL,
      }),
    ).toBe("PASS");
    expect(
      providerCachedArtByteIdentityQc({
        submitted_public_url: null,
        provider_resolved_file_url: S3_CACHED_BACK_URL,
        provider_downloaded_sha256: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
        expected_production_master_sha256: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
      }),
    ).toBe("PASS");
  });

  it("fails provider downloaded hash parity when bytes do not match pinned Lot Line Black master", () => {
    expect(
      providerDownloadedArtHashParityQc({
        production_master_sha256: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
        provider_downloaded_sha256: STALE_CANDIDATE3_SHA256,
      }),
    ).toBe("FAIL");
    expect(
      v42DraftArtworkIdentityChainQc({
        approved_source_sha: CLUB_THROTTLE_V42_APPROVED_SOURCE_SHA256,
        production_master_sha: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
        public_art_sha: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
        provider_downloaded_sha: STALE_CANDIDATE3_SHA256,
      }),
    ).toBe("FAIL");
  });

  it("passes full-state parity when draft art URL is S3 but provider art hash matches audit", () => {
    const recipient = {
      firstName: "A",
      lastName: "B",
      addressLine1: "1 Main",
      city: "City",
      postCode: "44101",
      state: "OH",
      country: "US",
      email: "a@example.com",
    };
    const audit = buildRealProviderValidationDraftAuditV1({
      order_reference_id: CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE,
      customer_reference_id: "cto_55ca5b85df77c55813e0ac6e",
      approved_source_sha256: CLUB_THROTTLE_V42_APPROVED_SOURCE_SHA256,
      production_master_sha256: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
      public_art_url: CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL,
      public_fetched_sha256: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
      product_uid: CLUB_THROTTLE_V42_GELATO_PRODUCT_UID,
      print_areas: ["back"],
      recipient,
      shipment_method_uid: "usps_ground_advantage",
      payload_qc: "PASS",
    });
    expect(audit.version).toBe(REAL_PROVIDER_VALIDATION_DRAFT_AUDIT_V1);
    expect(
      validatedDraftFullStateParityQc({
        audit,
        draft_order_reference_id: CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE,
        draft_product_uid: CLUB_THROTTLE_V42_GELATO_PRODUCT_UID,
        draft_file_types: ["back"],
        draft_art_url: S3_CACHED_BACK_URL,
        draft_provider_art_sha256: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
        draft_shipping_fingerprint: audit.shipping_fingerprint,
      }),
    ).toBe("PASS");
  });

  it("reconciles idempotency without posting another draft", () => {
    const fromEvent = v42DraftIdempotencyResolve({
      create_draft_requested: true,
      report_draft_id: null,
      event_draft_id: CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
    });
    expect(fromEvent.should_post_draft).toBe(false);
    expect(fromEvent.idempotency_action).toBe("RECONCILED_FROM_EVENT");

    const fromReport = v42DraftIdempotencyResolve({
      create_draft_requested: true,
      report_draft_id: CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
      event_draft_id: null,
    });
    expect(fromReport.should_post_draft).toBe(false);
    expect(fromReport.idempotency_action).toBe("RECONCILED_FROM_REPORT");
  });

  it("blocks PATCH orderType=order without founder production conversion authority", () => {
    const attempt = evaluateCanonicalReplacementDraftConversion({
      provider_order_id: CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
      production_conversion_authorized: false,
      env: {},
    });
    expect(attempt.allowed).toBe(false);
    expect(attempt.patch_body).toBeNull();
    expect(
      canonicalReplacementConversionAuthorityQc({
        production_conversion_authorized: false,
        conversion_attempt: attempt,
      }),
    ).toBe("PASS");
  });

  it("locks validated draft snapshot for immutable V42 evidence", () => {
    const snapshot = {
      version: "V42_VALIDATED_DRAFT_FULL_STATE_SNAPSHOT" as const,
      generated_at: "2026-10-14T04:19:54.451Z",
      draft_id: CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
      order_reference: CLUB_THROTTLE_V42_VALIDATION_DRAFT_REFERENCE,
      product_uid: CLUB_THROTTLE_V42_GELATO_PRODUCT_UID,
      quantity: 1,
      file_type: "back",
      canonical_art_url: CLUB_THROTTLE_V42_CANONICAL_LOT_LINE_BLACK_PRODUCTION_URL,
      canonical_art_hash: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
      provider_downloaded_art_hash: CLUB_THROTTLE_V42_PRODUCTION_MASTER_SHA256,
      shipping_fingerprint: "ebfd61b120eefc0c",
      shipment_method_uid: "usps_ground_advantage",
      provider_required_files: ["back"],
      missing_files: [],
      hold_state: false,
    };
    expect(v42ValidatedDraftSnapshotLockQc(snapshot)).toBe("PASS");
    expect(
      canonicalReplacementConversionReadyQc({
        snapshot_lock_qc: "PASS",
        end_to_end_validation_qc: "PASS",
        artwork_identity_chain_qc: "PASS",
        production_conversion_authorized: false,
      }),
    ).toBe(true);
  });
});
