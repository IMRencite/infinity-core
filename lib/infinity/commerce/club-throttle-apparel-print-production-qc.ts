import {
  analyzeApparelSubjectOccupancyFromPath,
  evaluateApparelTransparentPerimeterQc,
} from "./apparel-subject-occupancy-analysis.ts";
import {
  analyzeEmbeddedGarmentMockupFromPath,
  evaluateEmbeddedGarmentMockupQc,
} from "./embedded-garment-mockup-qc.ts";
import { auditBackPlacementBackground, evaluatePrintFileAlphaQcFromAudit } from "./lot-line-back-background-audit.ts";
import { evaluateChromaKeySpillQc } from "./lot-line-chroma-spill-qc.ts";
import { evaluateChromaGreenSpillQc } from "./chroma-green-spill-qc.ts";
import {
  analyzeSemiTransparentMatteBackground,
  evaluateSemiTransparentRectangularMatteQc,
} from "./semi-transparent-matte-background-qc.ts";

export type ApparelPrintProductionQcBundle = {
  EMBEDDED_GARMENT_MOCKUP_QC: "PASS" | "FAIL";
  EMBEDDED_GARMENT_MOCKUP_DETECTED: "YES" | "NO";
  CHROMA_KEY_SPILL_QC: "PASS" | "FAIL";
  CHROMA_GREEN_SPILL_QC: "PASS" | "FAIL";
  SEMI_TRANSPARENT_RECTANGULAR_MATTE_QC: "PASS" | "FAIL";
  FULL_CANVAS_LOW_ALPHA_MATTE_DETECTED: "YES" | "NO";
  RECTANGULAR_BACKGROUND_PANEL_QC: "PASS" | "FAIL";
  TRANSPARENT_PERIMETER_QC: "PASS" | "FAIL";
  BACKGROUND_CLEANLINESS_QC: "PASS" | "FAIL";
  reasons: string[];
  embedded_proof: Awaited<ReturnType<typeof analyzeEmbeddedGarmentMockupFromPath>>;
  chroma_spill: Awaited<ReturnType<typeof evaluateChromaKeySpillQc>>;
  background_audit: Awaited<ReturnType<typeof auditBackPlacementBackground>>;
};

/** Runs before provider asset creation on cleaned print-ready PNG. */
export async function evaluateApparelPrintProductionQc(cleanPngPath: string): Promise<ApparelPrintProductionQcBundle> {
  const embedded_proof = await analyzeEmbeddedGarmentMockupFromPath(cleanPngPath);
  const embedded = evaluateEmbeddedGarmentMockupQc(embedded_proof);
  const chroma_spill = await evaluateChromaKeySpillQc(cleanPngPath);
  const chroma_green = await evaluateChromaGreenSpillQc(cleanPngPath);
  const semiMatteProof = await analyzeSemiTransparentMatteBackground(cleanPngPath);
  const semiMatte = evaluateSemiTransparentRectangularMatteQc(semiMatteProof);
  const background_audit = await auditBackPlacementBackground(cleanPngPath);
  const alpha = evaluatePrintFileAlphaQcFromAudit(background_audit);
  const occupancy = await analyzeApparelSubjectOccupancyFromPath(cleanPngPath);
  const perimeter = evaluateApparelTransparentPerimeterQc(occupancy);

  const rectFail = background_audit.RECTANGULAR_BACKGROUND_PRESENT === "YES";
  const reasons: string[] = [];
  if (embedded.result === "FAIL") reasons.push(...embedded.reasons.map((r) => `embedded:${r}`));
  if (chroma_spill.CHROMA_KEY_SPILL_QC === "FAIL") reasons.push(...chroma_spill.reasons.map((r) => `chroma_magenta:${r}`));
  if (chroma_green.CHROMA_GREEN_SPILL_QC === "FAIL") reasons.push(...chroma_green.reasons.map((r) => `chroma_green:${r}`));
  if (semiMatte.result === "FAIL") reasons.push(...semiMatte.reasons.map((r) => `semi_matte:${r}`));
  if (rectFail) reasons.push("rectangular_background_panel");
  if (alpha.reasons.length) reasons.push(...alpha.reasons.map((r) => `alpha:${r}`));
  if (perimeter.APPAREL_TRANSPARENT_PERIMETER_QC === "FAIL") reasons.push(...perimeter.reasons.map((r) => `perimeter:${r}`));

  const backgroundFail =
    alpha.PRINT_FILE_ALPHA_QC === "FAIL" ||
    chroma_spill.CHROMA_KEY_SPILL_QC === "FAIL" ||
    chroma_green.CHROMA_GREEN_SPILL_QC === "FAIL" ||
    semiMatte.result === "FAIL" ||
    semiMatteProof.FULL_CANVAS_LOW_ALPHA_MATTE_DETECTED === "YES" ||
    rectFail ||
    perimeter.APPAREL_TRANSPARENT_PERIMETER_QC !== "PASS";

  const transparentPerimeterQc: "PASS" | "FAIL" =
    perimeter.APPAREL_TRANSPARENT_PERIMETER_QC === "PASS" ? "PASS" : "FAIL";

  return {
    EMBEDDED_GARMENT_MOCKUP_QC: embedded.result,
    EMBEDDED_GARMENT_MOCKUP_DETECTED: embedded.EMBEDDED_GARMENT_MOCKUP_DETECTED,
    CHROMA_KEY_SPILL_QC: chroma_spill.CHROMA_KEY_SPILL_QC,
    CHROMA_GREEN_SPILL_QC: chroma_green.CHROMA_GREEN_SPILL_QC,
    SEMI_TRANSPARENT_RECTANGULAR_MATTE_QC: semiMatte.result,
    FULL_CANVAS_LOW_ALPHA_MATTE_DETECTED: semiMatteProof.FULL_CANVAS_LOW_ALPHA_MATTE_DETECTED,
    RECTANGULAR_BACKGROUND_PANEL_QC: rectFail ? "FAIL" : "PASS",
    TRANSPARENT_PERIMETER_QC: transparentPerimeterQc,
    BACKGROUND_CLEANLINESS_QC: backgroundFail ? "FAIL" : "PASS",
    reasons,
    embedded_proof,
    chroma_spill,
    background_audit,
  };
}
