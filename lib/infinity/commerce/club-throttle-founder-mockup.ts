import sharp from "sharp";
import {
  FOUNDER_MOCKUP_TEMPLATE_SOURCE,
  LOCAL_PLACEMENT_REFERENCE,
  absolutePrintRect,
  garmentCanvasHeight,
  garmentMockupBaseSvg,
  garmentMockupLayout,
  type MockupView,
} from "./club-throttle-garment-mockup-templates";

export { LOCAL_PLACEMENT_REFERENCE };

export { FOUNDER_MOCKUP_TEMPLATE_SOURCE };

/** Baked transparency preview grays (Photoshop/export checkerboards). */
export const CHECKERBOARD_GRAY_MIN = 168;
export const CHECKERBOARD_GRAY_MAX = 238;

export type GarmentKind = "tee" | "hoodie";
export type FrontMarkOption = "F1" | "F2" | "F3";

export type BackPlacementVariant = {
  id: "A" | "B" | "C";
  label: string;
  scale: number;
  topRatio: number;
};

export const BACK_PLACEMENT_VARIANTS: BackPlacementVariant[] = [
  { id: "A", label: "Current placement", scale: 0.55, topRatio: 0.28 },
  { id: "B", label: "~6% smaller", scale: 0.517, topRatio: 0.28 },
  { id: "C", label: "~6% smaller + higher", scale: 0.517, topRatio: 0.22 },
];

export const HOODIE_BACK_PLACEMENT: BackPlacementVariant = {
  id: "C",
  label: "Hood-safe placement",
  scale: 0.48,
  topRatio: 0.27,
};

/** Strip baked neutral checkerboard grays to transparent (mockup + print prep). */
export async function keyBakedCheckerboardToBuffer(input: string | Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < width * height; i += 1) {
    const o = i * channels;
    const r = data[o]!;
    const g = data[o + 1]!;
    const b = data[o + 2]!;
    const neutral = Math.abs(r - g) < 8 && Math.abs(g - b) < 8;
    const checkerGray = neutral && r >= CHECKERBOARD_GRAY_MIN && r <= CHECKERBOARD_GRAY_MAX;
    if (checkerGray) data[o + 3] = 0;
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

export async function trimArtToContent(input: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
  const trimmed = await sharp(input).trim().png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  return { buffer: trimmed, width: meta.width ?? 0, height: meta.height ?? 0 };
}

async function renderGarmentBaseBuffer(view: MockupView): Promise<{ buffer: Buffer; width: number; height: number }> {
  const layout = garmentMockupLayout(view);
  const svg = garmentMockupBaseSvg(view, layout.canvas);
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const meta = await sharp(buffer).metadata();
  const expectedH = garmentCanvasHeight(view, layout.canvas);
  return { buffer, width: meta.width ?? layout.canvas, height: meta.height ?? expectedH };
}

function mockupView(garment: GarmentKind, side: "front" | "back"): MockupView {
  if (garment === "tee") return side === "back" ? "tee-back" : "tee-front";
  return side === "back" ? "hoodie-back" : "hoodie-front";
}

/** Hood occluder band (canvas-normalized y). Art top should start below this for PASS. */
export const HOOD_OCCLUSION_Y_MAX = 0.26;

export async function composeFounderBackMockup(input: {
  printMasterPath: string;
  destPath: string;
  garment: GarmentKind;
  variant: BackPlacementVariant;
}): Promise<{ artTopRatio: number; artHeightRatio: number; canvas: number }> {
  const view = mockupView(input.garment, "back");
  const layout = garmentMockupLayout(view);
  const base = await renderGarmentBaseBuffer(view);
  const zone = absolutePrintRect(layout);
  const keyed = await keyBakedCheckerboardToBuffer(input.printMasterPath);
  const { buffer: artBuf } = await trimArtToContent(keyed);

  const scale = input.variant.scale;
  const targetW = Math.floor(zone.width * scale);
  const targetH = Math.floor(zone.height * scale);
  const resized = await sharp(artBuf).resize(targetW, targetH, { fit: "inside" }).png().toBuffer();
  const meta = await sharp(resized).metadata();
  const w = meta.width ?? targetW;
  const h = meta.height ?? targetH;
  const innerTop = Math.floor(zone.height * (input.variant.topRatio - 0.22));
  const left = zone.left + Math.floor((zone.width - w) / 2);
  const top = zone.top + Math.max(0, innerTop);

  await sharp(base.buffer)
    .composite([{ input: resized, left, top, blend: "over" }])
    .png()
    .toFile(input.destPath);

  return {
    artTopRatio: top / base.height,
    artHeightRatio: h / base.height,
    canvas: base.width,
  };
}

export async function detectCheckerboardInImage(path: string): Promise<{ checkerboard_visible: boolean; sample_count: number }> {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let hits = 0;
  let samples = 0;
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      samples += 1;
      const o = (y * width + x) * channels;
      const r = data[o]!;
      const g = data[o + 1]!;
      const b = data[o + 2]!;
      const a = data[o + 3]!;
      if (a < 200) continue;
      const neutral = Math.abs(r - g) < 6 && Math.abs(g - b) < 6;
      if (neutral && r >= CHECKERBOARD_GRAY_MIN && r <= CHECKERBOARD_GRAY_MAX) hits += 1;
    }
  }
  const ratio = hits / Math.max(samples, 1);
  return { checkerboard_visible: ratio > 0.015, sample_count: hits };
}

export function evaluateHoodOcclusionQc(input: {
  garment: GarmentKind;
  artTopRatio: number;
}): { gate: "HOOD_OCCLUSION_QC"; result: "PASS" | "FAIL"; art_top_ratio: number; threshold: number } {
  if (input.garment !== "hoodie") {
    return { gate: "HOOD_OCCLUSION_QC", result: "PASS", art_top_ratio: input.artTopRatio, threshold: HOOD_OCCLUSION_Y_MAX };
  }
  const pass = input.artTopRatio >= HOOD_OCCLUSION_Y_MAX - 0.02;
  return {
    gate: "HOOD_OCCLUSION_QC",
    result: pass ? "PASS" : "FAIL",
    art_top_ratio: input.artTopRatio,
    threshold: HOOD_OCCLUSION_Y_MAX,
  };
}

function frontMarkSvg(option: FrontMarkOption): string {
  const w = 960;
  const h = 320;
  if (option === "F1") {
    return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="none"/>
      <circle cx="48" cy="160" r="22" fill="#E10600"/>
      <rect x="24" y="156" width="48" height="5" fill="#c4a574"/>
      <text x="88" y="148" font-family="Arial,Helvetica,sans-serif" font-size="52" font-weight="800" fill="#F7F3EC" letter-spacing="1">CLUB</text>
      <text x="88" y="208" font-family="Arial,Helvetica,sans-serif" font-size="52" font-weight="800" fill="#F7F3EC" letter-spacing="1">THROTTLE</text>
    </svg>`;
  }
  if (option === "F2") {
    return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="none"/>
      <text x="0" y="132" font-family="Arial,Helvetica,sans-serif" font-size="72" font-weight="800" fill="#F7F3EC" letter-spacing="4">LOT LINE</text>
      <text x="4" y="200" font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="600" fill="#c4a574" letter-spacing="6">CLUB THROTTLE</text>
    </svg>`;
  }
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="none"/>
      <circle cx="36" cy="160" r="28" fill="none" stroke="#F7F3EC" stroke-width="4"/>
      <path d="M36 132 L36 188 M20 160 L52 160" stroke="#E10600" stroke-width="4"/>
      <line x1="80" y1="188" x2="320" y2="188" stroke="#c4a574" stroke-width="3"/>
      <text x="80" y="148" font-family="Arial,Helvetica,sans-serif" font-size="56" font-weight="700" fill="#F7F3EC" letter-spacing="3">LOT LINE</text>
    </svg>`;
}

export async function buildLotLineFrontMarkPng(destPath: string, option: FrontMarkOption = "F2"): Promise<{ option: FrontMarkOption; width: number; height: number }> {
  const svg = Buffer.from(frontMarkSvg(option));
  await sharp(svg).png().toFile(destPath);
  const meta = await sharp(destPath).metadata();
  return { option, width: meta.width ?? 0, height: meta.height ?? 0 };
}

export async function composeFounderFrontMockup(input: {
  frontArtPath?: string | null;
  destPath: string;
  garment: GarmentKind;
  backOnly?: boolean;
}): Promise<{ markWidthRatio?: number; markHeightRatio?: number }> {
  const view = mockupView(input.garment, "front");
  const layout = garmentMockupLayout(view);
  const base = await renderGarmentBaseBuffer(view);
  const zone = absolutePrintRect(layout);
  const composites: sharp.OverlayOptions[] = [];

  if (!input.backOnly && input.frontArtPath) {
    const markMaxW = Math.floor(zone.width * 0.92);
    const markMaxH = Math.floor(zone.height * 0.92);
    const mark = await sharp(input.frontArtPath).resize(markMaxW, markMaxH, { fit: "inside" }).png().toBuffer();
    const meta = await sharp(mark).metadata();
    const w = meta.width ?? markMaxW;
    const h = meta.height ?? markMaxH;
    const left = zone.left + Math.floor((zone.width - w) * 0.08);
    const top = zone.top + Math.floor((zone.height - h) * 0.12);
    composites.push({ input: mark, left, top, blend: "over" });
    await sharp(base.buffer)
      .composite(composites)
      .png()
      .toFile(input.destPath);
    return { markWidthRatio: w / base.width, markHeightRatio: h / base.height };
  }

  await sharp(base.buffer).png().toFile(input.destPath);
  return {};
}

export async function verifyPrintMasterTransparency(printMasterPath: string): Promise<{ gate: "PRINT_MASTER_TRANSPARENCY_QC"; result: "PASS" | "FAIL" }> {
  const meta = await sharp(printMasterPath).metadata();
  if (meta.hasAlpha !== true) return { gate: "PRINT_MASTER_TRANSPARENCY_QC", result: "FAIL" };
  const { data, info } = await sharp(printMasterPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3]! < 250) transparent += 1;
  }
  const ratio = transparent / Math.max(info.width * info.height, 1);
  return { gate: "PRINT_MASTER_TRANSPARENCY_QC", result: ratio > 0.05 ? "PASS" : "FAIL" };
}
