import { describe, expect, it } from "vitest";
import {
  CANONICAL_REPLACEMENT_DECISION,
  canonicalReplacementConversionRequired,
  evaluateV42DraftConversionAttempt,
  futureCustomerOrderCanonicalArtQc,
  nonCanonicalSampleScopeGuardQc,
  validatedDraftAutoConversionGuardQc,
  v42ValidationReferenceRetentionQc,
} from "../club-throttle-canonical-replacement-closeout-v42.2-v1.ts";
import { CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID } from "../gelato-v42-canonical-art-validation-draft-v1.ts";
import { CLUB_THROTTLE_NON_CANONICAL_SAMPLE_GELATO_ORDER_ID } from "../club-throttle-non-canonical-sample-qc-v1.ts";

describe("V42.2 canonical replacement closeout", () => {
  it("defers manufacturing: conversion not required even when ready", () => {
    expect(canonicalReplacementConversionRequired()).toBe(false);
    expect(CANONICAL_REPLACEMENT_DECISION).toBe("DEFER_NO_ADDITIONAL_MANUFACTURING");
    const attempt = evaluateV42DraftConversionAttempt({
      production_conversion_authorized: true,
      env: { CLUB_THROTTLE_V42_DRAFT_CONVERSION_AUTHORIZED: "ENABLED" },
    });
    expect(attempt.allowed).toBe(false);
    expect(
      validatedDraftAutoConversionGuardQc({
        conversion_ready: true,
        conversion_required: false,
        conversion_attempt: attempt,
      }),
    ).toBe("PASS");
  });

  it("retains V42 draft as unconverted validation reference", () => {
    expect(
      v42ValidationReferenceRetentionQc({
        draft_id: CLUB_THROTTLE_V42_VALIDATED_DRAFT_GELATO_ORDER_ID,
        draft_order_type: "draft",
      }),
    ).toBe("PASS");
  });

  it("blocks final canonical physical QC from non-canonical sample", () => {
    expect(
      nonCanonicalSampleScopeGuardQc({
        sample_gelato_order_id: CLUB_THROTTLE_NON_CANONICAL_SAMPLE_GELATO_ORDER_ID,
        final_canonical_physical_qc: "DEFERRED_UNTIL_FIRST_CANONICAL_PRODUCTION_ORDER",
      }),
    ).toBe("PASS");
    expect(
      nonCanonicalSampleScopeGuardQc({
        sample_gelato_order_id: CLUB_THROTTLE_NON_CANONICAL_SAMPLE_GELATO_ORDER_ID,
        final_canonical_physical_qc: "PASS",
      }),
    ).toBe("FAIL");
  });

  it("resolves future LOT_LINE black fulfillment to canonical production master path", () => {
    expect(futureCustomerOrderCanonicalArtQc(process.cwd())).toBe("PASS");
  });
});
