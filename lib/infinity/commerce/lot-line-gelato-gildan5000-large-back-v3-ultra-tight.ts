import sharp from "sharp";
import { auditBackPlacementBackground, evaluatePrintFileAlphaQcFromAudit } from "./lot-line-back-background-audit";
import { stripRemainingBakedCheckerboardPixels } from "./lot-line-gelato-back-clean-asset";
import { trimArtToContent } from "./club-throttle-founder-mockup";
import {
  GELATO_GILDAN5000_LARGE_BACK_V3_ULTRA_TIGHT_REL,
  GILDAN_5000_LARGE_BACK_PROFILE,
} from "./gelato-gildan5000-large-back-profile";
import {
  evaluateProviderPlacementEfficiencyQc,
  expectedMeetMappingInSquarePrintArea,
} from "./provider-placement-efficiency-qc";

async function multistepLanczosResize(input: Buffer, targetW: number, targetH: number): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  let cw = meta.width ?? targetW;
  let ch = meta.height ?? targetH;
  let cur = input;
  while (Math.max(targetW / cw, targetH / ch) > 2) {
    cw = Math.min(Math.round(cw * 2), targetW);
    ch = Math.min(Math.round(ch * 2), targetH);
    cur = await sharp(cur).resize(cw, ch, { fit: "inside", kernel: sharp.kernel.lanczos3 }).png().toBuffer();
    const m = await sharp(cur).metadata();
    cw = m.width ?? cw;
    ch = m.height ?? ch;
  }
  return sharp(cur).resize(targetW, targetH, { fit: "inside", kernel: sharp.kernel.lanczos3 }).png().toBuffer();
}

export type BuildGildan5000LargeBackV3UltraTightResult = {
  outPath: string;
  CANVAS_PIXELS: string;
  ART_BBOX: { left: number; top: number; width: number; height: number };
  ART_CANVAS_WIDTH_RATIO: number;
  ART_CANVAS_HEIGHT_RATIO: number;
  TRANSPARENT_PADDING_RATIO: number;
  ART_AREA_FRACTION: number;
  ART_ASPECT_W_OVER_H: number;
  EXPECTED_VISIBLE_PRINT_WIDTH_IN: number;
  EXPECTED_VISIBLE_PRINT_HEIGHT_IN: number;
  EXPECTED_PROVIDER_DPI: number;
  PROVIDER_PLACEMENT_EFFICIENCY_QC: "PASS" | "FAIL" | "SUBOPTIMAL" | "UNKNOWN";
  BACKGROUND_QC: "PASS" | "FAIL";
  source_art_extracted_from: string;
  padding_px: number;
};

/**
 * Ultra-tight provider canvas: art scaled to empirical raster ceiling with minimal uniform pad only.
 * Avoids fixed full-height canvas + large intentional top/bottom margins (v2 pattern).
 */
export async function buildGelatoGildan5000LargeBackV3UltraTight(input: {
  canonicalMasterPath: string;
  destPath?: string;
  /** Transparent border pixels around scaled art (each side). */
  paddingPx?: number;
  /**
   * When set, scale art so total canvas width equals this (Gelato DPI uses canvas width ÷ print width).
   * Preserves aspect; height follows art. Mutually exclusive with maxLongSidePx.
   */
  targetCanvasWidthPx?: number;
  /** Override long-side ceiling (default: profile effectiveProviderRasterMax). */
  maxLongSidePx?: number;
}): Promise<BuildGildan5000LargeBackV3UltraTightResult> {
  const profile = GILDAN_5000_LARGE_BACK_PROFILE;
  const maxLong = input.maxLongSidePx ?? profile.effectiveProviderRasterMax;
  const pad = input.paddingPx ?? 12;

  const masterAudit = await auditBackPlacementBackground(input.canonicalMasterPath);
  if (!masterAudit.art_content_bbox) throw new Error("CANONICAL_MASTER_ART_BBOX_MISSING");

  const bbox = masterAudit.art_content_bbox;
  let artCrop = await sharp(input.canonicalMasterPath)
    .extract({ left: bbox.left, top: bbox.top, width: bbox.width, height: bbox.height })
    .png()
    .toBuffer();
  ({ buffer: artCrop } = await trimArtToContent(artCrop));

  const cropMeta = await sharp(artCrop).metadata();
  const cropW = cropMeta.width ?? 1;
  const cropH = cropMeta.height ?? 1;
  const artAspect = cropW / cropH;

  let targetArtW: number;
  let targetArtH: number;
  if (input.targetCanvasWidthPx != null) {
    const canvasWTarget = Math.round(input.targetCanvasWidthPx);
    if (canvasWTarget <= 2 * pad) throw new Error("TARGET_CANVAS_WIDTH_TOO_SMALL");
    targetArtW = canvasWTarget - 2 * pad;
    targetArtH = Math.max(1, Math.round(targetArtW / artAspect));
  } else {
    const innerMax = maxLong - 2 * pad;
    if (cropH >= cropW) {
      targetArtH = innerMax;
      targetArtW = Math.floor(innerMax * artAspect);
    } else {
      targetArtW = innerMax;
      targetArtH = Math.floor(innerMax / artAspect);
    }
  }

  const resizedArt = await multistepLanczosResize(artCrop, targetArtW, targetArtH);
  const artMeta = await sharp(resizedArt).metadata();
  const artW = artMeta.width ?? targetArtW;
  const artH = artMeta.height ?? targetArtH;

  const canvasW = artW + 2 * pad;
  const canvasH = artH + 2 * pad;

  let composed = await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resizedArt, left: pad, top: pad }])
    .png()
    .toBuffer();

  composed = await stripRemainingBakedCheckerboardPixels(composed);
  const destPath = input.destPath ?? GELATO_GILDAN5000_LARGE_BACK_V3_ULTRA_TIGHT_REL;
  await sharp(composed).png().toFile(destPath);

  const audit = await auditBackPlacementBackground(destPath);
  const qcBg = evaluatePrintFileAlphaQcFromAudit(audit);
  const ab = audit.art_content_bbox ?? { left: pad, top: pad, width: artW, height: artH };

  const mapping = expectedMeetMappingInSquarePrintArea({
    canvas_width: canvasW,
    canvas_height: canvasH,
  });

  const efficiency = evaluateProviderPlacementEfficiencyQc({
    canvas_width: canvasW,
    canvas_height: canvasH,
    art_bbox: { width: ab.width, height: ab.height },
    effective_provider_raster_max: input.targetCanvasWidthPx != null ? canvasH + 8 : undefined,
  });

  const artArea = ab.width * ab.height;
  const canvasArea = canvasW * canvasH;

  return {
    outPath: destPath,
    CANVAS_PIXELS: `${canvasW}x${canvasH}`,
    ART_BBOX: ab,
    ART_CANVAS_WIDTH_RATIO: Number((ab.width / canvasW).toFixed(4)),
    ART_CANVAS_HEIGHT_RATIO: Number((ab.height / canvasH).toFixed(4)),
    TRANSPARENT_PADDING_RATIO: Number((1 - artArea / canvasArea).toFixed(4)),
    ART_AREA_FRACTION: Number((artArea / canvasArea).toFixed(4)),
    ART_ASPECT_W_OVER_H: Number(artAspect.toFixed(4)),
    EXPECTED_VISIBLE_PRINT_WIDTH_IN: efficiency.EXPECTED_VISIBLE_PRINT_WIDTH_IN ?? 0,
    EXPECTED_VISIBLE_PRINT_HEIGHT_IN: efficiency.EXPECTED_VISIBLE_PRINT_HEIGHT_IN ?? 0,
    EXPECTED_PROVIDER_DPI: mapping.EXPECTED_PROVIDER_DPI,
    PROVIDER_PLACEMENT_EFFICIENCY_QC: efficiency.PROVIDER_PLACEMENT_EFFICIENCY_QC,
    BACKGROUND_QC: qcBg.PROVIDER_BACKGROUND_CLEANLINESS_QC,
    source_art_extracted_from: input.canonicalMasterPath,
    padding_px: pad,
  };
}
