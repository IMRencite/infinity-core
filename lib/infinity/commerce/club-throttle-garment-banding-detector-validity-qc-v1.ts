import {
  evaluateBlackGarmentHorizontalBandingQc,
  evaluateGarmentColorPurityQc,
} from "./club-throttle-storefront-colorway-qc-v1.ts";

export async function evaluateGarmentBandingDetectorValidityQc(input: {
  heroPng: Buffer;
  garment_color: string;
}): Promise<{
  GARMENT_BANDING_DETECTOR_VALIDITY_QC: "PASS" | "FAIL";
  GARMENT_HORIZONTAL_BANDING_QC: "PASS" | "FAIL";
  horizontal: Awaited<ReturnType<typeof evaluateBlackGarmentHorizontalBandingQc>>;
  purity: Awaited<ReturnType<typeof evaluateGarmentColorPurityQc>>;
  classification: "REAL_GARMENT_DEFECT" | "PRINT_ZONE_FALSE_POSITIVE" | "CONSISTENT_PASS" | "CONSISTENT_FAIL";
}> {
  const horizontal = await evaluateBlackGarmentHorizontalBandingQc({ heroPng: input.heroPng });
  const purity = await evaluateGarmentColorPurityQc({ heroPng: input.heroPng, garment_color: input.garment_color });
  const hPass = horizontal.BLACK_GARMENT_HORIZONTAL_BANDING_QC === "PASS";
  const pPass = purity.GARMENT_COLOR_PURITY_QC === "PASS";
  let classification: "REAL_GARMENT_DEFECT" | "PRINT_ZONE_FALSE_POSITIVE" | "CONSISTENT_PASS" | "CONSISTENT_FAIL" =
    "CONSISTENT_PASS";
  if (hPass && pPass) classification = "CONSISTENT_PASS";
  else if (!hPass && !pPass) classification = "CONSISTENT_FAIL";
  else if (hPass && !pPass) classification = "PRINT_ZONE_FALSE_POSITIVE";
  else classification = "REAL_GARMENT_DEFECT";
  const valid = hPass === pPass;
  return {
    GARMENT_BANDING_DETECTOR_VALIDITY_QC: valid ? "PASS" : "FAIL",
    GARMENT_HORIZONTAL_BANDING_QC: horizontal.BLACK_GARMENT_HORIZONTAL_BANDING_QC,
    horizontal,
    purity,
    classification,
  };
}
