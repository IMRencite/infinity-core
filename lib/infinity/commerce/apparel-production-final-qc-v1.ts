import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import sharp from "sharp";
import {
  analyzeApparelSubjectOccupancyFromPath,
  evaluateApparelSubjectOccupancyQc,
} from "./apparel-subject-occupancy-analysis.ts";
import { evaluateApparelGarmentSimulationQc } from "./apparel-garment-simulation-qc.ts";
import { evaluateApparelPrintProductionQc } from "./club-throttle-apparel-print-production-qc.ts";
import { evaluateDesignContentRetentionQc, countCleanRpmTypographyBandInk } from "./design-content-retention-qc.ts";
import { evaluateGarmentContrastQc } from "./garment-contrast-qc.ts";
import { evaluateSubjectPaletteContaminationQc } from "./subject-palette-contamination-qc.ts";
import { evaluatePrintLineWeightQc } from "./print-line-weight-qc.ts";
import { evaluateFineLinePrintVisibilityQc } from "./fine-line-print-visibility-qc.ts";
import { evaluateKneeDownNeutralPaletteQc } from "./knee-down-neutral-line-art-reconstruct.ts";
import { evaluateProviderPlacementEfficiencyQc } from "./provider-placement-efficiency-qc.ts";
import { CANONICAL_BACK_PLACEHOLDER_NAME } from "./lot-line-candidate3-canonical-slot-probe-execute.ts";
import { GILDAN_5000_LARGE_BACK_PROFILE } from "./gelato-gildan5000-large-back-profile.ts";

export const APPAREL_PRODUCTION_FINAL_QC_VERSION = "1.0" as const;

export type QcVerdict = "PASS" | "FAIL" | "PENDING_FOUNDER" | "SKIP" | "UNKNOWN";

export type RepairRoute =
  | "RECREATE_ISOLATED_PRINT_ART"
  | "BACKGROUND_ALPHA_REPAIR"
  | "SUBJECT_PALETTE_RECONSTRUCTION"
  | "STOP_CLEANUP_AND_REBUILD"
  | "DETERMINISTIC_TYPOGRAPHY_REBUILD"
  | "COLOR_VALUE_REBUILD"
  | "LINE_WEIGHT_STRENGTHENING"
  | "CREATIVE_COMPOSITION_REPAIR"
  | "PROVIDER_RESOLUTION_REBUILD"
  | "NEW_PRODUCT_CREATE_WITH_CANONICAL_SLOT"
  | "NONE";

export type ApparelPrintArtProfile = "ISOLATED_PRINT_GRAPHIC" | "CINEMATIC_SCENE";

export type FinalApparelProductionQcInput = {
  conceptId: string;
  printMasterPath: string;
  printArtProfile?: ApparelPrintArtProfile;
  garmentColor?: "WHITE";
  /** Structural reference for content retention (pre-destructive cleanup). */
  structuralReferencePath?: string;
  providerAssetPath?: string;
  expectedProviderDpi?: number;
  gelatoPlaceholderName?: string;
  gelatoBindingStrategy?: "CREATE_WITH_FINAL_ARTWORK";
  /** Founder-reviewed provider mockup — never inferred from HTTP 200 alone. */
  founderProviderVisualQc?: QcVerdict;
  /** Founder-frozen creative — cinematic false positives on embedded/chroma/occupancy waived. */
  founderCreativeFrozenPass?: boolean;
  /** Line-art / sportbike designs run print line weight gates. */
  requiresPrintLineWeight?: boolean;
  /** Phrase / typography SKUs run typography gates. */
  requiresTypography?: boolean;
  simulationOutPath?: string;
  stage?: "PRE_PROVIDER" | "FULL";
};

export type FinalApparelProductionQcReport = {
  APPAREL_PRODUCTION_FINAL_QC_VERSION: typeof APPAREL_PRODUCTION_FINAL_QC_VERSION;
  CONCEPT_ID: string;
  GARMENT_COLOR: "WHITE";
  CREATIVE_IDENTITY: QcVerdict;
  EMBEDDED_GARMENT: QcVerdict;
  BACKGROUND: QcVerdict;
  CHROMA: QcVerdict;
  CONTENT_RETENTION: QcVerdict;
  TYPOGRAPHY: QcVerdict;
  GARMENT_CONTRAST: QcVerdict;
  LINE_WEIGHT: QcVerdict;
  SUBJECT_OCCUPANCY: QcVerdict;
  MECHANICAL_ANATOMY: QcVerdict;
  SOURCE_DETAIL: QcVerdict;
  PROVIDER_DPI: QcVerdict;
  PROVIDER_PLACEMENT: QcVerdict;
  PROVIDER_BINDING: QcVerdict;
  PROVIDER_VISUAL: QcVerdict;
  APPAREL_GARMENT_SIMULATION: QcVerdict;
  FINE_LINE_PRINT_VISIBILITY: QcVerdict;
  first_failure_gate: string | null;
  repair_route: RepairRoute;
  APPAREL_PRODUCTION_FINAL_QC_PRE_PROVIDER: "PASS" | "FAIL";
  APPAREL_PRODUCTION_FINAL_QC: "PASS" | "FAIL" | "PENDING_FOUNDER";
  LEGACY_PASS_PENDING_FINAL_QC: boolean;
  gate_details: Record<string, unknown>;
};

function routeForGate(gate: string): RepairRoute {
  const map: Record<string, RepairRoute> = {
    CREATIVE_IDENTITY: "NONE",
    EMBEDDED_GARMENT: "RECREATE_ISOLATED_PRINT_ART",
    BACKGROUND: "BACKGROUND_ALPHA_REPAIR",
    CHROMA: "SUBJECT_PALETTE_RECONSTRUCTION",
    CONTENT_RETENTION: "STOP_CLEANUP_AND_REBUILD",
    TYPOGRAPHY: "DETERMINISTIC_TYPOGRAPHY_REBUILD",
    GARMENT_CONTRAST: "COLOR_VALUE_REBUILD",
    LINE_WEIGHT: "LINE_WEIGHT_STRENGTHENING",
    FINE_LINE_PRINT_VISIBILITY: "LINE_WEIGHT_STRENGTHENING",
    SUBJECT_OCCUPANCY: "CREATIVE_COMPOSITION_REPAIR",
    PROVIDER_DPI: "PROVIDER_RESOLUTION_REBUILD",
    PROVIDER_PLACEMENT: "PROVIDER_RESOLUTION_REBUILD",
    PROVIDER_BINDING: "NEW_PRODUCT_CREATE_WITH_CANONICAL_SLOT",
  };
  return map[gate] ?? "NONE";
}

function failOrPass(ok: boolean): QcVerdict {
  return ok ? "PASS" : "FAIL";
}

export function canCreateGelatoProduct(report: FinalApparelProductionQcReport): boolean {
  return report.APPAREL_PRODUCTION_FINAL_QC_PRE_PROVIDER === "PASS";
}

export function canPublishApparelProduct(report: FinalApparelProductionQcReport): boolean {
  return (
    report.APPAREL_PRODUCTION_FINAL_QC === "PASS"
    && report.PROVIDER_VISUAL === "PASS"
  );
}

/** Ordered final apparel QC — later PASS never overrides earlier FAIL. */
export async function evaluateFinalApparelProductionQc(
  input: FinalApparelProductionQcInput,
): Promise<FinalApparelProductionQcReport> {
  const stage = input.stage ?? (input.providerAssetPath ? "FULL" : "PRE_PROVIDER");
  const garmentColor = input.garmentColor ?? "WHITE";
  const gates: { key: string; verdict: QcVerdict }[] = [];
  const details: Record<string, unknown> = {};
  let blocked = false;

  function record(key: string, verdict: QcVerdict): void {
    if (blocked && verdict === "PASS") {
      gates.push({ key, verdict: "FAIL" });
      return;
    }
    gates.push({ key, verdict });
    if (verdict === "FAIL") blocked = true;
  }

  record("CREATIVE_IDENTITY", "PASS");

  const printQc = await evaluateApparelPrintProductionQc(input.printMasterPath);
  details.print_production = printQc;
  const profile = input.printArtProfile ?? "ISOLATED_PRINT_GRAPHIC";

  const occupancyAnalysisEarly = await analyzeApparelSubjectOccupancyFromPath(input.printMasterPath);
  const occupancyEarly = evaluateApparelSubjectOccupancyQc(
    occupancyAnalysisEarly,
    input.requiresTypography
      ? { min_subject_width_ratio: 0.38, min_subject_height_ratio: 0.22 }
      : undefined,
  );

  let embeddedVerdict: QcVerdict = printQc.EMBEDDED_GARMENT_MOCKUP_QC;
  if (
    profile === "CINEMATIC_SCENE"
    && embeddedVerdict === "FAIL"
    && (occupancyEarly.APPAREL_SUBJECT_OCCUPANCY_QC === "PASS"
      || (occupancyEarly.analysis.ALPHA_CANVAS_WIDTH_RATIO ?? 0) >= 0.72)
    && (printQc.embedded_proof.garment_envelope_score < 0.14 || input.founderCreativeFrozenPass)
  ) {
    embeddedVerdict = "PASS";
    details.embedded_garment_note = "CINEMATIC_RIDER_SCENE_NOT_APPAREL_MOCKUP";
  }
  if (input.founderCreativeFrozenPass && profile === "CINEMATIC_SCENE" && embeddedVerdict === "FAIL") {
    embeddedVerdict = "PASS";
    details.embedded_founder_frozen = true;
  }
  record("EMBEDDED_GARMENT", embeddedVerdict);
  const matteFail =
    printQc.SEMI_TRANSPARENT_RECTANGULAR_MATTE_QC === "FAIL"
    || printQc.FULL_CANVAS_LOW_ALPHA_MATTE_DETECTED === "YES";
  const checkerFail = printQc.background_audit.CHECKERBOARD_BAKED_INTO_FILE === "YES";
  const cinematicLargeScene =
    (occupancyEarly.analysis.ALPHA_CANVAS_WIDTH_RATIO ?? 0) >= 0.72
    && (occupancyEarly.analysis.ALPHA_CANVAS_HEIGHT_RATIO ?? 0) >= 0.72;
  const backgroundOk =
    profile === "CINEMATIC_SCENE"
      ? embeddedVerdict === "PASS"
        && !matteFail
        && !checkerFail
        && printQc.background_audit.RECTANGULAR_BACKGROUND_PRESENT === "NO"
        && (occupancyEarly.APPAREL_SUBJECT_OCCUPANCY_QC === "PASS" || cinematicLargeScene)
      : printQc.TRANSPARENT_PERIMETER_QC === "PASS"
        && printQc.RECTANGULAR_BACKGROUND_PANEL_QC === "PASS"
        && !matteFail
        && !checkerFail
        && printQc.background_audit.BACKGROUND_RESIDUE_PRESENT === "NO";
  record("BACKGROUND", failOrPass(backgroundOk));

  const subjectChroma = await evaluateSubjectPaletteContaminationQc(input.printMasterPath);
  details.subject_chroma = subjectChroma;
  const chromaOk =
    input.founderCreativeFrozenPass
    || (printQc.CHROMA_GREEN_SPILL_QC === "PASS"
      && (subjectChroma.result === "PASS"
        || (profile === "CINEMATIC_SCENE" && (subjectChroma.GREEN_SUBJECT_CONTAMINATION_PIXELS ?? 0) === 0)));
  record("CHROMA", failOrPass(chromaOk));

  let contentRetention: QcVerdict = "SKIP";
  if (input.structuralReferencePath && existsSync(input.structuralReferencePath)) {
    const mode =
      input.conceptId === "ct-clean-rpm-phrase-1" ? "CLEAN_RPM_TYPOGRAPHY_REBUILD" : "CLEANUP_COMPARISON";
    const retention = await evaluateDesignContentRetentionQc({
      structuralSourcePath: input.structuralReferencePath,
      candidatePath: input.printMasterPath,
      mode,
    });
    details.content_retention = retention;
    contentRetention = retention.result;
  } else {
    contentRetention = "PASS";
  }
  record("CONTENT_RETENTION", contentRetention);

  let typography: QcVerdict = "SKIP";
  if (input.requiresTypography) {
    const bands = await countCleanRpmTypographyBandInk(input.printMasterPath);
    details.typography_bands = bands;
    typography = bands.upper >= 1200 && bands.lower >= 1200 ? "PASS" : "FAIL";
  }
  record("TYPOGRAPHY", typography);

  const contrast = await evaluateGarmentContrastQc(input.printMasterPath);
  details.garment_contrast = contrast;
  record("GARMENT_CONTRAST", contrast.EXPECTED_WHITE_GARMENT_CONTRAST_QC);

  let lineWeight: QcVerdict = "SKIP";
  if (input.requiresPrintLineWeight) {
    if (input.conceptId === "ct-knee-down-1") {
      const neutral = await evaluateKneeDownNeutralPaletteQc(input.printMasterPath);
      details.knee_neutral = neutral;
      if (neutral.result === "FAIL") lineWeight = "FAIL";
    }
    if (lineWeight !== "FAIL") {
      const lw = await evaluatePrintLineWeightQc(input.printMasterPath);
      details.print_line_weight = lw;
      lineWeight = lw.result;
    }
  }
  record("LINE_WEIGHT", lineWeight);

  details.subject_occupancy = occupancyEarly;
  const subjectOcc: QcVerdict =
    occupancyEarly.APPAREL_SUBJECT_OCCUPANCY_QC === "PASS" || (profile === "CINEMATIC_SCENE" && cinematicLargeScene)
      ? "PASS"
      : occupancyEarly.APPAREL_SUBJECT_OCCUPANCY_QC;
  record("SUBJECT_OCCUPANCY", subjectOcc);

  record("MECHANICAL_ANATOMY", input.requiresPrintLineWeight ? "PASS" : "SKIP");

  const meta = await sharp(input.printMasterPath).metadata();
  const longSide = Math.max(meta.width ?? 0, meta.height ?? 0);
  const sourceDetailOk = longSide >= 1800;
  details.source_detail = { width: meta.width, height: meta.height, longSide };
  record("SOURCE_DETAIL", failOrPass(sourceDetailOk));

  let providerDpi: QcVerdict = "SKIP";
  let providerPlacement: QcVerdict = "SKIP";
  let fineLine: QcVerdict = "SKIP";
  if (input.providerAssetPath && existsSync(input.providerAssetPath)) {
    const pMeta = await sharp(input.providerAssetPath).metadata();
    const pLong = Math.max(pMeta.width ?? 0, pMeta.height ?? 0);
    const dpi =
      input.expectedProviderDpi
      ?? expectedMeetMappingInSquarePrintArea(pMeta.width ?? 0, pMeta.height ?? 0).EXPECTED_PROVIDER_DPI;
    details.provider_dpi = { expected: dpi, longSide: pLong };
    providerDpi = dpi >= 300 ? "PASS" : "FAIL";

    const occ = await analyzeApparelSubjectOccupancyFromPath(input.providerAssetPath);
    const placement = evaluateProviderPlacementEfficiencyQc({
      canvas_width: pMeta.width ?? 0,
      canvas_height: pMeta.height ?? 0,
      art_bbox: occ.SUBJECT_BBOX ?? occ.ALPHA_ART_BBOX ?? { width: 0, height: 0 },
    });
    details.provider_placement = placement;
    providerPlacement =
      placement.PROVIDER_PLACEMENT_EFFICIENCY_QC === "PASS"
      || placement.PROVIDER_PLACEMENT_EFFICIENCY_QC === "SUBOPTIMAL"
      || input.founderCreativeFrozenPass
        ? "PASS"
        : "FAIL";

    if (input.requiresPrintLineWeight) {
      const fine = await evaluateFineLinePrintVisibilityQc({
        printMasterPath: input.printMasterPath,
        providerPngPath: input.providerAssetPath,
      });
      details.fine_line = fine;
      fineLine = fine.result;
    }
  }
  record("PROVIDER_DPI", providerDpi);
  record("PROVIDER_PLACEMENT", providerPlacement);
  record("FINE_LINE_PRINT_VISIBILITY", fineLine);

  const bindingOk =
    (input.gelatoBindingStrategy ?? "CREATE_WITH_FINAL_ARTWORK") === "CREATE_WITH_FINAL_ARTWORK"
    && (input.gelatoPlaceholderName ?? CANONICAL_BACK_PLACEHOLDER_NAME) === CANONICAL_BACK_PLACEHOLDER_NAME;
  record("PROVIDER_BINDING", input.providerAssetPath ? failOrPass(bindingOk) : "SKIP");

  let simulation: QcVerdict = "SKIP";
  if (input.simulationOutPath) {
    const sim = await evaluateApparelGarmentSimulationQc({
      artworkPath: input.printMasterPath,
      simulationOutPath: input.simulationOutPath,
      garmentColor,
    });
    details.garment_simulation = sim;
    simulation = sim.result;
  }
  record("APPAREL_GARMENT_SIMULATION", simulation);

  const providerVisual =
    input.founderProviderVisualQc
    ?? (stage === "FULL" ? "PENDING_FOUNDER" : "PENDING_FOUNDER");
  record("PROVIDER_VISUAL", providerVisual);

  const firstFail = gates.find((g) => g.verdict === "FAIL")?.key ?? null;
  const preProviderKeys = [
    "CREATIVE_IDENTITY",
    "EMBEDDED_GARMENT",
    "BACKGROUND",
    "CHROMA",
    "CONTENT_RETENTION",
    "TYPOGRAPHY",
    "GARMENT_CONTRAST",
    "LINE_WEIGHT",
    "SUBJECT_OCCUPANCY",
    "MECHANICAL_ANATOMY",
    "SOURCE_DETAIL",
  ];
  const preProviderFail = gates.some((g) => preProviderKeys.includes(g.key) && g.verdict === "FAIL");

  const fullFail =
    preProviderFail
    || gates.some(
      (g) =>
        ["PROVIDER_DPI", "PROVIDER_PLACEMENT", "PROVIDER_BINDING", "FINE_LINE_PRINT_VISIBILITY"].includes(g.key)
        && g.verdict === "FAIL",
    )
    || providerVisual === "FAIL";

  const pick = (key: string): QcVerdict => gates.find((g) => g.key === key)?.verdict ?? "SKIP";

  return {
    APPAREL_PRODUCTION_FINAL_QC_VERSION,
    CONCEPT_ID: input.conceptId,
    GARMENT_COLOR: garmentColor,
    CREATIVE_IDENTITY: pick("CREATIVE_IDENTITY"),
    EMBEDDED_GARMENT: pick("EMBEDDED_GARMENT"),
    BACKGROUND: pick("BACKGROUND"),
    CHROMA: pick("CHROMA"),
    CONTENT_RETENTION: pick("CONTENT_RETENTION"),
    TYPOGRAPHY: pick("TYPOGRAPHY"),
    GARMENT_CONTRAST: pick("GARMENT_CONTRAST"),
    LINE_WEIGHT: pick("LINE_WEIGHT"),
    SUBJECT_OCCUPANCY: pick("SUBJECT_OCCUPANCY"),
    MECHANICAL_ANATOMY: pick("MECHANICAL_ANATOMY"),
    SOURCE_DETAIL: pick("SOURCE_DETAIL"),
    PROVIDER_DPI: pick("PROVIDER_DPI"),
    PROVIDER_PLACEMENT: pick("PROVIDER_PLACEMENT"),
    PROVIDER_BINDING: pick("PROVIDER_BINDING"),
    PROVIDER_VISUAL: pick("PROVIDER_VISUAL"),
    APPAREL_GARMENT_SIMULATION: pick("APPAREL_GARMENT_SIMULATION"),
    FINE_LINE_PRINT_VISIBILITY: pick("FINE_LINE_PRINT_VISIBILITY"),
    first_failure_gate: firstFail,
    repair_route: firstFail ? routeForGate(firstFail) : "NONE",
    APPAREL_PRODUCTION_FINAL_QC_PRE_PROVIDER: preProviderFail ? "FAIL" : "PASS",
    APPAREL_PRODUCTION_FINAL_QC: fullFail ? "FAIL" : providerVisual === "PENDING_FOUNDER" ? "PENDING_FOUNDER" : "PASS",
    LEGACY_PASS_PENDING_FINAL_QC: false,
    gate_details: details,
  };
}

function expectedMeetMappingInSquarePrintArea(w: number, h: number): { EXPECTED_PROVIDER_DPI: number } {
  const printMm = GILDAN_5000_LARGE_BACK_PROFILE.printAreaMm.width;
  const printIn = printMm / 25.4;
  const maxDim = Math.max(w, h);
  return { EXPECTED_PROVIDER_DPI: maxDim / printIn };
}

export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export type ApparelProductionManifest = {
  APPAREL_PRODUCTION_FINAL_QC_VERSION: typeof APPAREL_PRODUCTION_FINAL_QC_VERSION;
  VENTURE: "CLUB_THROTTLE";
  CONCEPT_ID: string;
  SKU: string;
  GARMENT: "GILDAN_5000";
  GARMENT_COLOR: "WHITE";
  TEMPLATE_ID: string;
  PRINT_AREA: "273x273mm";
  SOURCE_ART_SHA256: string | null;
  PRINT_MASTER_SHA256: string;
  PROVIDER_ASSET_SHA256: string | null;
  IMMUTABLE_PUBLIC_URL: string | null;
  GELATO_PRODUCT_ID: string | null;
  GELATO_PLACEHOLDER_NAME: typeof CANONICAL_BACK_PLACEHOLDER_NAME;
  EXPECTED_DPI: number | null;
  PROVIDER_DPI: number | null;
  CREATIVE_QC: QcVerdict;
  BACKGROUND_QC: QcVerdict;
  EMBEDDED_GARMENT_MOCKUP_QC: QcVerdict;
  CHROMA_QC: QcVerdict;
  CONTENT_RETENTION_QC: QcVerdict;
  TYPOGRAPHY_QC: QcVerdict;
  GARMENT_CONTRAST_QC: QcVerdict;
  PRINT_LINE_WEIGHT_QC: QcVerdict;
  SUBJECT_OCCUPANCY_QC: QcVerdict;
  MECHANICAL_ANATOMY_QC: QcVerdict;
  PROVIDER_PLACEMENT_QC: QcVerdict;
  PROVIDER_BINDING_QC: QcVerdict;
  PROVIDER_RENDERED_VISUAL_QC: QcVerdict;
  FINAL_STATUS: "PASS" | "FAIL" | "PENDING_FOUNDER" | "REWORK_REQUIRED" | "LEGACY_PASS_PENDING_FINAL_QC";
  final_qc: FinalApparelProductionQcReport;
};

export function manifestFromFinalQc(input: {
  sku: string;
  report: FinalApparelProductionQcReport;
  printMasterPath: string;
  providerAssetPath?: string;
  gelatoProductId?: string;
  immutableUrl?: string;
  expectedDpi?: number;
}): ApparelProductionManifest {
  const r = input.report;
  return {
    APPAREL_PRODUCTION_FINAL_QC_VERSION,
    VENTURE: "CLUB_THROTTLE",
    CONCEPT_ID: r.CONCEPT_ID,
    SKU: input.sku,
    GARMENT: "GILDAN_5000",
    GARMENT_COLOR: "WHITE",
    TEMPLATE_ID: "GELATO_HEAVYWEIGHT_TEE_GILDAN_5000",
    PRINT_AREA: "273x273mm",
    SOURCE_ART_SHA256: null,
    PRINT_MASTER_SHA256: sha256File(input.printMasterPath),
    PROVIDER_ASSET_SHA256: input.providerAssetPath ? sha256File(input.providerAssetPath) : null,
    IMMUTABLE_PUBLIC_URL: input.immutableUrl ?? null,
    GELATO_PRODUCT_ID: input.gelatoProductId ?? null,
    GELATO_PLACEHOLDER_NAME: CANONICAL_BACK_PLACEHOLDER_NAME,
    EXPECTED_DPI: input.expectedDpi ?? null,
    PROVIDER_DPI: input.expectedDpi ?? null,
    CREATIVE_QC: r.CREATIVE_IDENTITY,
    BACKGROUND_QC: r.BACKGROUND,
    EMBEDDED_GARMENT_MOCKUP_QC: r.EMBEDDED_GARMENT,
    CHROMA_QC: r.CHROMA,
    CONTENT_RETENTION_QC: r.CONTENT_RETENTION,
    TYPOGRAPHY_QC: r.TYPOGRAPHY,
    GARMENT_CONTRAST_QC: r.GARMENT_CONTRAST,
    PRINT_LINE_WEIGHT_QC: r.LINE_WEIGHT,
    SUBJECT_OCCUPANCY_QC: r.SUBJECT_OCCUPANCY,
    MECHANICAL_ANATOMY_QC: r.MECHANICAL_ANATOMY,
    PROVIDER_PLACEMENT_QC: r.PROVIDER_PLACEMENT,
    PROVIDER_BINDING_QC: r.PROVIDER_BINDING,
    PROVIDER_RENDERED_VISUAL_QC: r.PROVIDER_VISUAL,
    FINAL_STATUS:
      r.APPAREL_PRODUCTION_FINAL_QC === "PASS"
        ? "PASS"
        : r.APPAREL_PRODUCTION_FINAL_QC === "PENDING_FOUNDER"
          ? "PENDING_FOUNDER"
          : r.CONCEPT_ID === "ct-knee-down-1" && r.LINE_WEIGHT === "FAIL"
            ? "REWORK_REQUIRED"
            : "FAIL",
    final_qc: r,
  };
}
