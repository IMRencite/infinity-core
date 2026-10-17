import sharp from "sharp";

export type ChromaKeySpillQcResult = {
  CHROMA_KEY_SPILL_QC: "PASS" | "FAIL";
  UNINTENTIONAL_MAGENTA_PIXELS: number;
  unintentional_magenta_ratio_of_opaque: number;
  reasons: string[];
};

export type LotLinePaletteIntegrityQcResult = {
  LOT_LINE_PALETTE_INTEGRITY_QC: "PASS" | "FAIL";
  unintentional_magenta_pixels: number;
  chroma_cyan_spill_pixels: number;
  reasons: string[];
};

/** Magenta/pink chroma-key fringe — not Lot Line amber/orange. */
export function isUnintentionalMagentaSpill(r: number, g: number, b: number, a: number): boolean {
  if (a < 40) return false;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const warmAmber = r > 90 && g > 45 && r > b + 10 && g > b * 0.55 && r - g < 55;
  if (warmAmber) return false;
  const magentaExcess = r - Math.max(g, b);
  if (magentaExcess > 28 && r > 55 && g < r * 0.62) return true;
  if (r > 70 && r > g + 22 && b > g + 8 && b < r && g < 85 && lum < 160) return true;
  return false;
}

export async function analyzeChromaSpillFromPath(pngPath: string): Promise<{
  unintentional_magenta: number;
  opaque: number;
}> {
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let unintentional_magenta = 0;
  let opaque = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      const a = data[o + 3]!;
      if (a < 40) continue;
      opaque += 1;
      if (isUnintentionalMagentaSpill(data[o]!, data[o + 1]!, data[o + 2]!, a)) unintentional_magenta += 1;
    }
  }
  return { unintentional_magenta, opaque };
}

export async function evaluateChromaKeySpillQc(pngPath: string): Promise<ChromaKeySpillQcResult> {
  const { unintentional_magenta, opaque } = await analyzeChromaSpillFromPath(pngPath);
  const ratio = opaque ? unintentional_magenta / opaque : 0;
  const reasons: string[] = [];
  if (unintentional_magenta > 0) reasons.push(`unintentional_magenta_pixels_${unintentional_magenta}`);
  if (ratio > 0.0001) reasons.push(`magenta_ratio_${ratio.toFixed(6)}`);
  return {
    CHROMA_KEY_SPILL_QC: unintentional_magenta === 0 ? "PASS" : "FAIL",
    UNINTENTIONAL_MAGENTA_PIXELS: unintentional_magenta,
    unintentional_magenta_ratio_of_opaque: Number(ratio.toFixed(6)),
    reasons,
  };
}

export async function evaluateLotLinePaletteIntegrityQc(pngPath: string): Promise<LotLinePaletteIntegrityQcResult> {
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let unintentional_magenta = 0;
  let chroma_cyan = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      const a = data[o + 3]!;
      const r = data[o]!;
      const g = data[o + 1]!;
      const b = data[o + 2]!;
      if (a < 40) continue;
      if (isUnintentionalMagentaSpill(r, g, b, a)) unintentional_magenta += 1;
      if (g > 180 && b > 180 && r < 80) chroma_cyan += 1;
    }
  }
  const reasons: string[] = [];
  if (unintentional_magenta > 0) reasons.push("lot_line_magenta_spill");
  if (chroma_cyan > 50) reasons.push("chroma_cyan_spill");
  return {
    LOT_LINE_PALETTE_INTEGRITY_QC: reasons.length ? "FAIL" : "PASS",
    unintentional_magenta_pixels: unintentional_magenta,
    chroma_cyan_spill_pixels: chroma_cyan,
    reasons,
  };
}
