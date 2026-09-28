import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const TRANSPARENT_ASSET_INTEGRITY_GATE = "TransparentAssetIntegrityGate" as const;

export type TransparentAssetSample = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type TransparentAssetAnalysis = {
  width: number;
  height: number;
  hasAlphaChannel: boolean;
  transparentPixels: number;
  transparentPct: number;
  cornerPixels: TransparentAssetSample[];
  opaqueNearBlackMattePct: number;
  opaqueBoundingBox: { minX: number; maxX: number; minY: number; maxY: number } | null;
  contentBoundingBox: { minX: number; maxX: number; minY: number; maxY: number } | null;
  unintendedMatteRectangle: boolean;
  heroBlendModeWorkaround: boolean;
};

export function parsePngHeader(buffer: Buffer): {
  width: number;
  height: number;
  colorType: number;
  hasAlpha: boolean;
} {
  if (buffer.length < 26 || buffer.readUInt32BE(0) !== 0x89504e47) {
    throw new Error("NOT_PNG");
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colorType = buffer[25];
  return { width, height, colorType, hasAlpha: colorType === 4 || colorType === 6 };
}

export function pngHasAlphaChannel(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  try {
    return parsePngHeader(readFileSync(filePath)).hasAlpha;
  } catch {
    return false;
  }
}

/** Pixel analysis from RGBA canvas samples (Playwright or browser). */
export function analyzeTransparentAssetPixels(input: {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}): Omit<TransparentAssetAnalysis, "heroBlendModeWorkaround"> {
  const { width, height, rgba } = input;
  const total = width * height;
  let transparent = 0;
  let matte = 0;
  let totalOpaque = 0;
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let cMinX = width;
  let cMaxX = 0;
  let cMinY = height;
  let cMaxY = 0;
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ].map(([x, y]) => {
    const i = (y * width + x) * 4;
    return { r: rgba[i], g: rgba[i + 1], b: rgba[i + 2], a: rgba[i + 3] };
  });
  const isColoredLogoPixel = (i: number) =>
    rgba[i + 3] > 10 && !(rgba[i] < 30 && rgba[i + 1] < 30 && rgba[i + 2] < 30);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const a = rgba[i + 3];
      if (a < 10) {
        transparent += 1;
        continue;
      }
      totalOpaque += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      const nearBlack = rgba[i] < 40 && rgba[i + 1] < 40 && rgba[i + 2] < 40;
      if (nearBlack && a > 200) matte += 1;
      if (isColoredLogoPixel(i)) {
        cMinX = Math.min(cMinX, x);
        cMaxX = Math.max(cMaxX, x);
        cMinY = Math.min(cMinY, y);
        cMaxY = Math.max(cMaxY, y);
      }
    }
  }

  const opaqueBbox = totalOpaque ? { minX, maxX, minY, maxY } : null;
  const contentBbox =
    cMaxX >= cMinX && cMaxY >= cMinY ? { minX: cMinX, maxX: cMaxX, minY: cMinY, maxY: cMaxY } : null;
  const mattePct = totalOpaque ? (matte / totalOpaque) * 100 : 0;
  const cornerMatte = corners.every((c) => c.a === 255 && c.r < 20 && c.g < 20 && c.b < 20);
  const fillsCanvas =
    opaqueBbox &&
    opaqueBbox.minX <= 2 &&
    opaqueBbox.minY <= 2 &&
    opaqueBbox.maxX >= width - 3 &&
    opaqueBbox.maxY >= height - 3;
  const unintendedMatteRectangle = cornerMatte || Boolean(fillsCanvas) || mattePct > 8;

  return {
    width,
    height,
    hasAlphaChannel: true,
    transparentPixels: transparent,
    transparentPct: total ? Math.round((transparent / total) * 1000) / 10 : 0,
    cornerPixels: corners,
    opaqueNearBlackMattePct: Math.round(mattePct * 10) / 10,
    opaqueBoundingBox: opaqueBbox,
    contentBoundingBox: contentBbox,
    unintendedMatteRectangle,
  };
}

export function evaluateTransparentAssetIntegrityGate(input: {
  assetPath: string;
  pixelAnalysis?: Omit<TransparentAssetAnalysis, "heroBlendModeWorkaround"> | null;
  heroCss?: string;
}): {
  gate: typeof TRANSPARENT_ASSET_INTEGRITY_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  analysis: Partial<TransparentAssetAnalysis>;
} {
  const reasons: string[] = [];
  const rel = input.assetPath.replace(/^\//, "");
  const abs = join(process.cwd(), "public", rel);
  if (!existsSync(abs)) {
    return {
      gate: TRANSPARENT_ASSET_INTEGRITY_GATE,
      result: "FAIL",
      reasons: ["ASSET_MISSING"],
      analysis: {},
    };
  }
  const header = parsePngHeader(readFileSync(abs));
  if (!header.hasAlpha) reasons.push("PNG_ALPHA_CHANNEL_MISSING");
  const heroBlendModeWorkaround = Boolean(input.heroCss && /mix-blend-mode:\s*lighten/i.test(input.heroCss));
  if (heroBlendModeWorkaround) reasons.push("HERO_BLEND_MODE_WORKAROUND_NOT_ALLOWED");
  const pixel = input.pixelAnalysis;
  if (pixel?.unintendedMatteRectangle) reasons.push("UNINTENDED_OPAQUE_MATTE_RECTANGLE");
  if (pixel && pixel.transparentPct < 5) reasons.push("INSUFFICIENT_TRANSPARENCY");
  return {
    gate: TRANSPARENT_ASSET_INTEGRITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    analysis: {
      ...header,
      ...pixel,
      heroBlendModeWorkaround,
    },
  };
}
