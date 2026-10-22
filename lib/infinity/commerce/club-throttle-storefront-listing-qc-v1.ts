import type { ApparelPrintProductionQcBundle } from "./club-throttle-apparel-print-production-qc.ts";

export type ClubThrottleAutonomousStorefrontGateQc = {
  ORIGINALITY_QC: "PASS" | "FAIL" | "HOLD";
  ARTIFACT_QC: "PASS" | "FAIL" | "HOLD";
  TYPOGRAPHY_QC: "PASS" | "FAIL" | "HOLD";
  PRINT_READINESS_QC: "PASS" | "FAIL" | "HOLD";
  IMAGE_ASSET_QC: "PASS" | "FAIL" | "HOLD";
  PRODUCT_METADATA_QC: "PASS" | "FAIL" | "HOLD";
  PRICE_QC: "PASS" | "FAIL" | "HOLD";
  VARIANT_QC: "PASS" | "FAIL" | "HOLD";
  STOREFRONT_QC: "PASS" | "FAIL" | "HOLD";
  COMMERCE_CAPABILITY_QC: "PASS" | "FAIL" | "HOLD";
  STOREFRONT_READY: boolean;
  reasons: string[];
};

/** Customer-facing listing image QC — chroma/manufacturing spill does not gate storefront listing. */
export function evaluateClubThrottleStorefrontCustomerImageFromPrintQc(
  bundle: ApparelPrintProductionQcBundle,
): Pick<ClubThrottleAutonomousStorefrontGateQc, "PRINT_READINESS_QC" | "IMAGE_ASSET_QC" | "reasons"> {
  const reasons: string[] = [];
  if (bundle.EMBEDDED_GARMENT_MOCKUP_QC !== "PASS") {
    reasons.push("embedded_garment_mockup");
  }
  if (bundle.SEMI_TRANSPARENT_RECTANGULAR_MATTE_QC !== "PASS") {
    reasons.push("semi_transparent_matte");
  }
  if (bundle.RECTANGULAR_BACKGROUND_PANEL_QC !== "PASS") {
    reasons.push("rectangular_background_panel");
  }
  if (bundle.TRANSPARENT_PERIMETER_QC !== "PASS") {
    reasons.push("transparent_perimeter");
  }
  const imagePass = reasons.length === 0;
  return {
    PRINT_READINESS_QC: imagePass ? "PASS" : "FAIL",
    IMAGE_ASSET_QC: imagePass ? "PASS" : "FAIL",
    reasons,
  };
}

/** Full manufacturing print production hold (includes chroma spill). */
export function evaluateClubThrottleManufacturingPrintProductionHold(
  bundle: ApparelPrintProductionQcBundle,
): boolean {
  return (
    bundle.EMBEDDED_GARMENT_MOCKUP_QC !== "PASS" ||
    bundle.BACKGROUND_CLEANLINESS_QC !== "PASS" ||
    bundle.CHROMA_KEY_SPILL_QC !== "PASS" ||
    bundle.CHROMA_GREEN_SPILL_QC !== "PASS"
  );
}

export function evaluateClubThrottleAutonomousStorefrontGateQc(input: {
  originality_qc: "PASS" | "FAIL" | "HOLD";
  artifact_qc: "PASS" | "FAIL" | "HOLD";
  typography_qc?: "PASS" | "FAIL" | "HOLD";
  print_bundle: ApparelPrintProductionQcBundle | null;
  metadata_qc?: "PASS" | "FAIL" | "HOLD";
  price_qc?: "PASS" | "FAIL" | "HOLD";
  variant_qc?: "PASS" | "FAIL" | "HOLD";
  commerce_capability_qc?: "PASS" | "FAIL" | "HOLD";
}): ClubThrottleAutonomousStorefrontGateQc {
  const image =
    input.print_bundle ?
      evaluateClubThrottleStorefrontCustomerImageFromPrintQc(input.print_bundle)
    : { PRINT_READINESS_QC: "FAIL" as const, IMAGE_ASSET_QC: "FAIL" as const, reasons: ["missing_print_bundle"] };

  const typography = input.typography_qc ?? "PASS";
  const metadata = input.metadata_qc ?? "PASS";
  const price = input.price_qc ?? "PASS";
  const variant = input.variant_qc ?? "PASS";
  const commerce = input.commerce_capability_qc ?? "PASS";

  const gates = [
    input.originality_qc,
    input.artifact_qc,
    typography,
    image.PRINT_READINESS_QC,
    image.IMAGE_ASSET_QC,
    metadata,
    price,
    variant,
    commerce,
  ];
  const storefrontReady = gates.every((g) => g === "PASS");

  return {
    ORIGINALITY_QC: input.originality_qc,
    ARTIFACT_QC: input.artifact_qc,
    TYPOGRAPHY_QC: typography,
    PRINT_READINESS_QC: image.PRINT_READINESS_QC,
    IMAGE_ASSET_QC: image.IMAGE_ASSET_QC,
    PRODUCT_METADATA_QC: metadata,
    PRICE_QC: price,
    VARIANT_QC: variant,
    STOREFRONT_QC: storefrontReady ? "PASS" : "FAIL",
    COMMERCE_CAPABILITY_QC: commerce,
    STOREFRONT_READY: storefrontReady,
    reasons: image.reasons,
  };
}
