import sharp from "sharp";
import { CHECKERBOARD_GRAY_MAX, CHECKERBOARD_GRAY_MIN } from "./club-throttle-founder-mockup";
import { analyzePrintMasterAlpha, evaluatePrintMasterAlphaQc } from "./club-throttle-print-master-alpha-qc";

export type BackgroundFailureMode =
  | "A_CHECKERBOARD_BAKED"
  | "B_RECTANGULAR_MATTE"
  | "C_SEMITRANSPARENT_RESIDUE"
  | "D_COMBINATION"
  | "E_UNKNOWN";

export type BackPlacementBackgroundAudit = {
  path: string;
  width: number;
  height: number;
  PNG_ALPHA_PRESENT: "YES" | "NO";
  TRANSPARENT_PIXEL_COUNT: number;
  OPAQUE_PIXEL_COUNT: number;
  CHECKERBOARD_BAKED_INTO_FILE: "YES" | "NO";
  checkerboard_pixel_count: number;
  RECTANGULAR_BACKGROUND_PRESENT: "YES" | "NO";
  rectangular_matte_pixel_count: number;
  BACKGROUND_RESIDUE_PRESENT: "YES" | "NO";
  semitransparent_neutral_residue_count: number;
  non_subject_opaque_outside_art_bbox: number;
  art_content_bbox: { left: number; top: number; width: number; height: number } | null;
  BACKGROUND_FAILURE_MODE: BackgroundFailureMode;
  failure_mode_evidence: string[];
};

function isCheckerboardGray(r: number, g: number, b: number, a: number): boolean {
  if (a < 200) return false;
  const neutral = Math.abs(r - g) < 10 && Math.abs(g - b) < 10;
  return neutral && r >= CHECKERBOARD_GRAY_MIN && r <= CHECKERBOARD_GRAY_MAX;
}

function isMatteWhiteGray(r: number, g: number, b: number, a: number): boolean {
  if (a < 220) return false;
  const neutral = Math.abs(r - g) < 12 && Math.abs(g - b) < 12;
  return neutral && r >= 240 && r <= 255;
}

export async function auditBackPlacementBackground(pngPath: string): Promise<BackPlacementBackgroundAudit> {
  const meta = await sharp(pngPath).metadata();
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let transparent = 0;
  let opaque = 0;
  let checker = 0;
  let matte = 0;
  let semiResidue = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      const r = data[o]!;
      const g = data[o + 1]!;
      const b = data[o + 2]!;
      const a = data[o + 3]!;
      if (a < 16) {
        transparent += 1;
        continue;
      }
      opaque += 1;
      if (isCheckerboardGray(r, g, b, a)) checker += 1;
      if (isMatteWhiteGray(r, g, b, a)) matte += 1;
      if (a >= 16 && a < 220) {
        const neutral = Math.abs(r - g) < 10 && Math.abs(g - b) < 10;
        if (neutral && r >= CHECKERBOARD_GRAY_MIN && r <= 250) semiResidue += 1;
      }
      if (a >= 32) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const art_bbox =
    maxX >= minX && maxY >= minY
      ? { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
      : null;

  let nonSubjectOutside = 0;
  if (art_bbox) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const inside =
          x >= art_bbox.left &&
          x < art_bbox.left + art_bbox.width &&
          y >= art_bbox.top &&
          y < art_bbox.top + art_bbox.height;
        if (inside) continue;
        const o = (y * width + x) * channels;
        if (data[o + 3]! >= 48) nonSubjectOutside += 1;
      }
    }
  }

  const total = width * height;
  const checkerRatio = checker / Math.max(total, 1);
  const matteRatio = matte / Math.max(total, 1);
  const residueRatio = semiResidue / Math.max(total, 1);
  const outsideRatio = nonSubjectOutside / Math.max(total, 1);

  const CHECKERBOARD_BAKED_INTO_FILE = checkerRatio > 0.00005 || checker > 64 ? "YES" : "NO";
  let matteInsideArt = 0;
  if (art_bbox) {
    for (let y = art_bbox.top; y < art_bbox.top + art_bbox.height; y++) {
      for (let x = art_bbox.left; x < art_bbox.left + art_bbox.width; x++) {
        const o = (y * width + x) * channels;
        const r = data[o]!;
        const g = data[o + 1]!;
        const b = data[o + 2]!;
        const a = data[o + 3]!;
        if (isMatteWhiteGray(r, g, b, a) || isCheckerboardGray(r, g, b, a)) matteInsideArt += 1;
      }
    }
  }
  const artArea = art_bbox ? art_bbox.width * art_bbox.height : 1;
  const matteInsideRatio = matteInsideArt / artArea;

  const RECTANGULAR_BACKGROUND_PRESENT =
    outsideRatio > 0.02 ||
    matteInsideRatio > 0.04 ||
    (matteRatio > 0.08 && art_bbox && art_bbox.width / width < 0.92)
      ? "YES"
      : "NO";
  const BACKGROUND_RESIDUE_PRESENT =
    residueRatio > 0.012 || semiResidue > 8000 || outsideRatio > 0.008 ? "YES" : "NO";

  const evidence: string[] = [];
  if (CHECKERBOARD_BAKED_INTO_FILE === "YES") evidence.push(`checkerboard_pixels_${checker}`);
  if (RECTANGULAR_BACKGROUND_PRESENT === "YES") {
    evidence.push(`matte_pixels_${matte}`, `matte_inside_art_${matteInsideArt}`, `opaque_outside_art_bbox_${nonSubjectOutside}`);
  }
  if (BACKGROUND_RESIDUE_PRESENT === "YES") evidence.push(`semitransparent_neutral_${semiResidue}`);

  const flags = [
    CHECKERBOARD_BAKED_INTO_FILE === "YES",
    RECTANGULAR_BACKGROUND_PRESENT === "YES",
    BACKGROUND_RESIDUE_PRESENT === "YES",
  ].filter(Boolean).length;

  let BACKGROUND_FAILURE_MODE: BackgroundFailureMode = "E_UNKNOWN";
  if (flags >= 2) BACKGROUND_FAILURE_MODE = "D_COMBINATION";
  else if (CHECKERBOARD_BAKED_INTO_FILE === "YES") BACKGROUND_FAILURE_MODE = "A_CHECKERBOARD_BAKED";
  else if (RECTANGULAR_BACKGROUND_PRESENT === "YES") BACKGROUND_FAILURE_MODE = "B_RECTANGULAR_MATTE";
  else if (BACKGROUND_RESIDUE_PRESENT === "YES") BACKGROUND_FAILURE_MODE = "C_SEMITRANSPARENT_RESIDUE";

  // Scene background baked into illustration reads as opaque pixels filling bbox — detect low edge transparency
  if (BACKGROUND_FAILURE_MODE === "E_UNKNOWN" && art_bbox) {
    const artArea = art_bbox.width * art_bbox.height;
    const artFill = opaque / Math.max(artArea, 1);
    if (artFill > 0.55 && transparent / total < 0.5) {
      BACKGROUND_FAILURE_MODE = "D_COMBINATION";
      evidence.push("illustration_scene_background_likely_opaque_within_art_bbox");
    }
  }

  return {
    path: pngPath,
    width,
    height,
    PNG_ALPHA_PRESENT: meta.hasAlpha ? "YES" : "NO",
    TRANSPARENT_PIXEL_COUNT: transparent,
    OPAQUE_PIXEL_COUNT: opaque,
    CHECKERBOARD_BAKED_INTO_FILE,
    checkerboard_pixel_count: checker,
    RECTANGULAR_BACKGROUND_PRESENT,
    rectangular_matte_pixel_count: matte,
    BACKGROUND_RESIDUE_PRESENT,
    semitransparent_neutral_residue_count: semiResidue,
    non_subject_opaque_outside_art_bbox: nonSubjectOutside,
    art_content_bbox: art_bbox,
    BACKGROUND_FAILURE_MODE,
    failure_mode_evidence: evidence,
  };
}

export function evaluatePrintFileAlphaQcFromAudit(
  audit: BackPlacementBackgroundAudit,
  printMasterProof?: Awaited<ReturnType<typeof analyzePrintMasterAlpha>>,
): {
  PRINT_FILE_ALPHA_QC: "PASS" | "FAIL";
  PROVIDER_BACKGROUND_CLEANLINESS_QC: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (audit.PNG_ALPHA_PRESENT !== "YES") reasons.push("missing_alpha");
  if (audit.CHECKERBOARD_BAKED_INTO_FILE === "YES") reasons.push("checkerboard_baked");
  if (audit.RECTANGULAR_BACKGROUND_PRESENT === "YES") reasons.push("rectangular_matte_or_outside_opaque");
  if (audit.non_subject_opaque_outside_art_bbox > 500) reasons.push("opaque_outside_art_bbox");
  if (audit.CHECKERBOARD_BAKED_INTO_FILE === "YES" && audit.semitransparent_neutral_residue_count > 500) {
    reasons.push("background_residue");
  }
  if (printMasterProof) {
    const pm = evaluatePrintMasterAlphaQc(printMasterProof);
    if (pm.result === "FAIL") reasons.push(...pm.reasons);
  }
  const fail = reasons.length > 0;
  return {
    PRINT_FILE_ALPHA_QC: fail ? "FAIL" : "PASS",
    PROVIDER_BACKGROUND_CLEANLINESS_QC: fail ? "FAIL" : "PASS",
    reasons,
  };
}
