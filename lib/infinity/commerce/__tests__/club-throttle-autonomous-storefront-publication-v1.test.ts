import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ApparelPrintProductionQcBundle } from "../club-throttle-apparel-print-production-qc.ts";
import {
  evaluateAutonomousStorefrontPublicationAllowed,
  evaluateCtDailyShirtCounterSemanticsQc,
  evaluateCtDailyShirtNaturalQc,
  evaluateCtShirtConceptRotationQc,
  evaluateStorefrontManufacturingSeparationQc,
} from "@/lib/infinity/autonomous-portfolio-operations/venture-daily-output-v1";
import {
  evaluateClubThrottleAutonomousStorefrontGateQc,
  evaluateClubThrottleManufacturingPrintProductionHold,
  evaluateClubThrottleStorefrontCustomerImageFromPrintQc,
} from "../club-throttle-storefront-listing-qc-v1.ts";
import {
  autonomousStorefrontPublicationAssetIdentity,
  autonomousStorefrontPublicationIdempotencyQc,
  loadAutonomousPublishedStorefrontRegistry,
  publishAutonomousClubThrottleStorefrontProduct,
} from "../club-throttle-autonomous-storefront-publication-v1.ts";
import { buildAutonomousClubThrottleStorefrontProduct } from "../club-throttle-autonomous-product-build-v1.ts";
import { buildClubThrottleStorefrontCommerceCatalog } from "../club-throttle-storefront-commerce-catalog.ts";
import { CLUB_THROTTLE_SEVEN_SHIRT_MERCH } from "../club-throttle-canonical-seven-shirt-catalog.ts";
import { CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL } from "../club-throttle-storefront-merch-render-pipeline.ts";

function mockPrintBundle(overrides: Partial<ApparelPrintProductionQcBundle>): ApparelPrintProductionQcBundle {
  return {
    EMBEDDED_GARMENT_MOCKUP_QC: "PASS",
    EMBEDDED_GARMENT_MOCKUP_DETECTED: "NO",
    CHROMA_KEY_SPILL_QC: "FAIL",
    CHROMA_GREEN_SPILL_QC: "PASS",
    SEMI_TRANSPARENT_RECTANGULAR_MATTE_QC: "PASS",
    FULL_CANVAS_LOW_ALPHA_MATTE_DETECTED: "NO",
    RECTANGULAR_BACKGROUND_PANEL_QC: "PASS",
    TRANSPARENT_PERIMETER_QC: "PASS",
    BACKGROUND_CLEANLINESS_QC: "FAIL",
    reasons: ["chroma_magenta:spill"],
    embedded_proof: {} as ApparelPrintProductionQcBundle["embedded_proof"],
    chroma_spill: {} as ApparelPrintProductionQcBundle["chroma_spill"],
    background_audit: {} as ApparelPrintProductionQcBundle["background_audit"],
    ...overrides,
  };
}

describe("club-throttle autonomous storefront publication", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "ct-auto-pub-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it("FAILED_CREATIVE_WITH_PRINT_HOLD_IS_NOT_STOREFRONT_READY", () => {
    const attemptPass = false;
    const printHold = true;
    const forbiddenLegacyListingPass = attemptPass || printHold;
    const sep = evaluateStorefrontManufacturingSeparationQc({
      print_production_qc_hold: printHold,
      storefront_listing_qc_pass: attemptPass,
    });
    expect(forbiddenLegacyListingPass).toBe(true);
    expect(sep.STOREFRONT_READY).toBe(false);
  });

  it("FAILED_CREATIVE_WITH_PRINT_HOLD_IS_NOT_PUBLICATION_ALLOWED", () => {
    const sep = evaluateStorefrontManufacturingSeparationQc({
      print_production_qc_hold: true,
      storefront_listing_qc_pass: false,
    });
    expect(
      evaluateAutonomousStorefrontPublicationAllowed({
        storefront_ready: sep.STOREFRONT_READY,
      }),
    ).toBe(false);
  });

  it("A regression: false attempt pass + print hold => STOREFRONT_READY false", () => {
    const sep = evaluateStorefrontManufacturingSeparationQc({
      print_production_qc_hold: true,
      storefront_listing_qc_pass: false,
    });
    expect(sep.STOREFRONT_READY).toBe(false);
  });

  it("B regression: false listing pass => STOREFRONT_PUBLICATION_ALLOWED false", () => {
    expect(
      evaluateAutonomousStorefrontPublicationAllowed({
        storefront_ready: false,
      }),
    ).toBe(false);
  });

  it("VALID_STOREFRONT_PRODUCT_CAN_PUBLISH_WITHOUT_MANUFACTURING_AUTHORIZATION", () => {
    const bundle = mockPrintBundle({});
    const gate = evaluateClubThrottleAutonomousStorefrontGateQc({
      originality_qc: "PASS",
      artifact_qc: "PASS",
      print_bundle: bundle,
    });
    const sep = evaluateStorefrontManufacturingSeparationQc({
      print_production_qc_hold: evaluateClubThrottleManufacturingPrintProductionHold(bundle),
      storefront_listing_qc_pass: gate.STOREFRONT_READY,
    });
    expect(sep.MANUFACTURING_AUTHORIZED).toBe(false);
    expect(evaluateAutonomousStorefrontPublicationAllowed({ storefront_ready: sep.STOREFRONT_READY })).toBe(true);
  });

  it("C regression: all storefront gates pass + manufacturing unauthorized => ready and allowed", () => {
    const bundle = mockPrintBundle({});
    const gate = evaluateClubThrottleAutonomousStorefrontGateQc({
      originality_qc: "PASS",
      artifact_qc: "PASS",
      print_bundle: bundle,
    });
    const sep = evaluateStorefrontManufacturingSeparationQc({
      print_production_qc_hold: evaluateClubThrottleManufacturingPrintProductionHold(bundle),
      storefront_listing_qc_pass: gate.STOREFRONT_READY,
    });
    expect(gate.STOREFRONT_READY).toBe(true);
    expect(sep.MANUFACTURING_AUTHORIZED).toBe(false);
    expect(evaluateAutonomousStorefrontPublicationAllowed({ storefront_ready: sep.STOREFRONT_READY })).toBe(true);
  });

  it("D: storefront image pass while manufacturing chroma hold", () => {
    const bundle = mockPrintBundle({ CHROMA_KEY_SPILL_QC: "FAIL", BACKGROUND_CLEANLINESS_QC: "FAIL" });
    const image = evaluateClubThrottleStorefrontCustomerImageFromPrintQc(bundle);
    expect(image.IMAGE_ASSET_QC).toBe("PASS");
    expect(evaluateClubThrottleManufacturingPrintProductionHold(bundle)).toBe(true);
    const sep = evaluateStorefrontManufacturingSeparationQc({
      print_production_qc_hold: true,
      storefront_listing_qc_pass: image.IMAGE_ASSET_QC === "PASS",
    });
    expect(sep.STOREFRONT_PUBLICATION_BLOCKED_BY_PRINT_HOLD).toBe(false);
  });

  it("G regression: second shirt concept proceeds after first fails art QC", () => {
    expect(
      evaluateCtShirtConceptRotationQc({
        first_concept_art_qc_fail: true,
        second_concept_passes: true,
        selected_concept_id: "concept-2",
        second_concept_id: "concept-2",
      }),
    ).toBe("PASS");
  });

  it("E regression: valid concept publish creates customer-visible registry row", async () => {
    const built = buildAutonomousClubThrottleStorefrontProduct({
      concept: {
        concept_id: "ct-merch-concept-v43-3",
        theme: "Club ride camaraderie",
        market_signal: "signal",
        brand_fit_score: 80,
        differentiation_note: "Original art",
        manufacturing_authorized: false,
        qc_state: "CONCEPT",
      },
      source_artwork_hash: "abc123",
      cwd,
    });
    const first = await publishAutonomousClubThrottleStorefrontProduct({ built, cwd });
    expect(first.customer_visible).toBe(true);
  });

  it("F regression: same concept/art revision processed twice is idempotent", async () => {
    const built = buildAutonomousClubThrottleStorefrontProduct({
      concept: {
        concept_id: "ct-merch-concept-v43-3",
        theme: "Club ride camaraderie",
        market_signal: "signal",
        brand_fit_score: 80,
        differentiation_note: "Original art",
        manufacturing_authorized: false,
        qc_state: "CONCEPT",
      },
      source_artwork_hash: "abc123",
      cwd,
    });
    const first = await publishAutonomousClubThrottleStorefrontProduct({ built, cwd });
    const second = await publishAutonomousClubThrottleStorefrontProduct({ built, cwd });
    expect(first.customer_visible).toBe(true);
    expect(second.outcome).toBe("ALREADY_PUBLISHED");
    expect(loadAutonomousPublishedStorefrontRegistry(cwd).rows).toHaveLength(1);
  });

  it("H: storefront-ready unpublished fails daily shirt natural QC", () => {
    const qc = evaluateCtDailyShirtNaturalQc({
      daily_shirts_published: 0,
      daily_shirt_target: 1,
      storefront_ready_unpublished: true,
      no_valid_storefront_ready_concept: false,
      pipeline_continued_to_next_concept: false,
    });
    expect(qc.result).toBe("FAIL");
    expect(qc.reasons).toContain("FAIL_STOREFRONT_READY_NOT_PUBLISHED");
  });

  it("I: counter semantics match customer-visible events", () => {
    expect(
      evaluateCtDailyShirtCounterSemanticsQc({
        daily_shirts_published: 1,
        customer_visible_publication_events: 1,
      }),
    ).toBe("PASS");
  });

  it("J: autonomous SKU namespace does not collide with canonical seven", () => {
    const built = buildAutonomousClubThrottleStorefrontProduct({
      concept: {
        concept_id: "ct-merch-concept-v43-2",
        theme: "Night ride visibility culture",
        market_signal: "signal",
        brand_fit_score: 80,
        differentiation_note: "Original art",
        manufacturing_authorized: false,
        qc_state: "CONCEPT",
      },
      source_artwork_hash: "def456",
      cwd,
    });
    expect(CLUB_THROTTLE_SEVEN_SHIRT_MERCH.some((m) => m.sku === built.sku)).toBe(false);
    const repoCwd = process.cwd();
    if (!existsSync(join(repoCwd, CLUB_THROTTLE_STOREFRONT_MERCH_MANIFEST_REL))) {
      return;
    }
    const before = buildClubThrottleStorefrontCommerceCatalog(repoCwd).products.map((p) => p.sku);
    expect(before.filter((sku) => CLUB_THROTTLE_SEVEN_SHIRT_MERCH.some((m) => m.sku === sku))).toHaveLength(
      CLUB_THROTTLE_SEVEN_SHIRT_MERCH.length,
    );
  });

  it("idempotency QC", () => {
    expect(autonomousStorefrontPublicationIdempotencyQc()).toBe("PASS");
    const id = autonomousStorefrontPublicationAssetIdentity({ concept_id: "c1", source_artwork_hash: "x" });
    expect(id).toHaveLength(32);
  });
});
