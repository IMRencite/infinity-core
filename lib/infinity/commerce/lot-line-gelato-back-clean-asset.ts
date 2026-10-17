import sharp from "sharp";
import { CHECKERBOARD_GRAY_MAX, CHECKERBOARD_GRAY_MIN, keyBakedCheckerboardToBuffer, trimArtToContent } from "./club-throttle-founder-mockup";
import { auditBackPlacementBackground, evaluatePrintFileAlphaQcFromAudit } from "./lot-line-back-background-audit";

/** Flood from canvas edges through neutral matte/checker pixels; preserves saturated subject ink. */
export async function floodKeyProviderBackgroundArtifacts(input: string | Buffer): Promise<Buffer> {
  let buf = await keyBakedCheckerboardToBuffer(input);
  for (let pass = 0; pass < 3; pass++) {
    buf = await keyBakedCheckerboardToBuffer(buf);
  }
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  function isBackgroundLike(r: number, g: number, b: number, a: number): boolean {
    if (a < 24) return true;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (chroma > 34) return false;
    const neutral = Math.abs(r - g) < 12 && Math.abs(g - b) < 12;
    if (!neutral) return false;
    if (r >= 248 && a > 160) return true;
    if (r >= CHECKERBOARD_GRAY_MIN && r <= CHECKERBOARD_GRAY_MAX && a > 140) return true;
    if (a < 200 && r >= 150 && r <= 245) return true;
    return false;
  }

  function push(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    const o = i * channels;
    if (!isBackgroundLike(data[o]!, data[o + 1]!, data[o + 2]!, data[o + 3]!)) return;
    visited[i] = 1;
    queue.push(i);
  }

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (queue.length) {
    const i = queue.pop()!;
    const x = i % width;
    const y = (i - x) / width;
    const o = i * channels;
    data[o + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

/** Final pass: any remaining baked checker neutrals → fully transparent. */
export async function stripRemainingBakedCheckerboardPixels(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    const r = data[o]!;
    const g = data[o + 1]!;
    const b = data[o + 2]!;
    const a = data[o + 3]!;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const neutral = Math.abs(r - g) < 10 && Math.abs(g - b) < 10;
    if (
      a > 0 &&
      chroma < 22 &&
      neutral &&
      r >= CHECKERBOARD_GRAY_MIN &&
      r <= CHECKERBOARD_GRAY_MAX
    ) {
      data[o + 3] = 0;
    }
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

/** Gelato Gildan 5000 large back — 3600×4800 @ 300 DPI (12×16 in). */
export const GELATO_LARGE_BACK_CANVAS = { width: 3600, height: 4800 } as const;
export const GELATO_LARGE_BACK_DPI = 300;

/** Target art coverage on canvas (commercial large-back, collar clearance). */
export const LARGE_BACK_ART_WIDTH_RATIO = 0.78;
export const LARGE_BACK_TOP_MARGIN_RATIO = 0.11;

export type GelatoCleanBackBuildResult = {
  outPath: string;
  NEW_CANVAS: string;
  NEW_NONTRANSPARENT_BBOX: { left: number; top: number; width: number; height: number };
  NEW_ART_WIDTH_PERCENT_OF_CANVAS: number;
  NEW_ART_HEIGHT_PERCENT_OF_CANVAS: number;
  ART_PIXEL_WIDTH: number;
  ART_PIXEL_HEIGHT: number;
  INTENDED_PRINT_WIDTH_IN: number;
  INTENDED_PRINT_HEIGHT_IN: number;
  EFFECTIVE_DPI_X: number;
  EFFECTIVE_DPI_Y: number;
  LOCAL_EFFECTIVE_DPI_QC: "INVALIDATED";
  audit: Awaited<ReturnType<typeof auditBackPlacementBackground>>;
  qc: ReturnType<typeof evaluatePrintFileAlphaQcFromAudit>;
};

export async function buildGelatoLargeBackCleanAsset(input: {
  sourcePrintMasterPath: string;
  destPath: string;
}): Promise<GelatoCleanBackBuildResult> {
  const { width: W, height: H } = GELATO_LARGE_BACK_CANVAS;

  const keyed = await floodKeyProviderBackgroundArtifacts(input.sourcePrintMasterPath);
  const { buffer: trimmed } = await trimArtToContent(keyed);

  const maxArtW = Math.floor(W * LARGE_BACK_ART_WIDTH_RATIO);
  const maxArtH = Math.floor(H * (1 - LARGE_BACK_TOP_MARGIN_RATIO - 0.06));
  const resized = await sharp(trimmed)
    .resize(maxArtW, maxArtH, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  const rMeta = await sharp(resized).metadata();
  const artW = rMeta.width ?? maxArtW;
  const artH = rMeta.height ?? maxArtH;
  const left = Math.floor((W - artW) / 2);
  const top = Math.floor(H * LARGE_BACK_TOP_MARGIN_RATIO);

  const composed = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();

  const finalBuf = await stripRemainingBakedCheckerboardPixels(composed);
  await sharp(finalBuf).png().toFile(input.destPath);

  const audit = await auditBackPlacementBackground(input.destPath);
  const qc = evaluatePrintFileAlphaQcFromAudit(audit);

  const bbox = audit.art_content_bbox ?? { left, top, width: artW, height: artH };

  return {
    outPath: input.destPath,
    NEW_CANVAS: `${W}x${H}`,
    NEW_NONTRANSPARENT_BBOX: bbox,
    NEW_ART_WIDTH_PERCENT_OF_CANVAS: Number(((bbox.width / W) * 100).toFixed(2)),
    NEW_ART_HEIGHT_PERCENT_OF_CANVAS: Number(((bbox.height / H) * 100).toFixed(2)),
    ART_PIXEL_WIDTH: bbox.width,
    ART_PIXEL_HEIGHT: bbox.height,
    INTENDED_PRINT_WIDTH_IN: Number((bbox.width / GELATO_LARGE_BACK_DPI).toFixed(3)),
    INTENDED_PRINT_HEIGHT_IN: Number((bbox.height / GELATO_LARGE_BACK_DPI).toFixed(3)),
    /** Offline assumption only — invalidated when Gelato editor reports provider effective DPI. */
    EFFECTIVE_DPI_X: GELATO_LARGE_BACK_DPI,
    EFFECTIVE_DPI_Y: GELATO_LARGE_BACK_DPI,
    LOCAL_EFFECTIVE_DPI_QC: "INVALIDATED" as const,
    audit,
    qc,
  };
}
