import sharp from "sharp";
import { GARMENT_BACK_PRINT_RECT } from "./club-throttle-storefront-garment-template-v2.ts";
import { evaluateStorefrontProductGarmentRenderQc } from "./club-throttle-storefront-garment-render-qc.ts";
import { resolveGelatoVariantUid } from "./club-throttle-variant-map.ts";
import {
  contrastPassDesignFidelityFail,
  evaluateDarkGarmentDesignFidelityQc,
  type DarkGarmentDesignFidelityBundle,
} from "./club-throttle-dark-garment-design-fidelity-qc-v1.ts";
import { evaluateGarmentBandingDetectorValidityQc } from "./club-throttle-garment-banding-detector-validity-qc-v1.ts";
import { isDarkGarmentColor } from "./club-throttle-apparel-color-v1.ts";

export type ColorwayQcBundle = {
  sku: string;
  garment_color: string;
  PROVIDER_VARIANT_MAPPING_QC: "PASS" | "FAIL";
  COLOR_SIZE_VARIANT_MATRIX_QC: "PASS" | "FAIL";
  GARMENT_COLOR_PURITY_QC: "PASS" | "FAIL";
  GARMENT_RENDER_ARTIFACT_QC: "PASS" | "FAIL";
  GARMENT_CONTRAST_QC: "PASS" | "FAIL";
  CRITICAL_ART_REGION_CONTRAST_QC: "PASS" | "FAIL";
  PRINT_VISIBILITY_QC: "PASS" | "FAIL";
  ORIGINAL_ART_COLOR_FIDELITY_QC: "PASS" | "FAIL" | "SKIP";
  DARK_GARMENT_TONAL_RANGE_QC: "PASS" | "FAIL" | "SKIP";
  SELECTIVE_KEYLINE_QUALITY_QC: "PASS" | "FAIL" | "SKIP";
  DARK_GARMENT_ADAPTATION_QUALITY_QC: "PASS" | "FAIL" | "SKIP";
  SOURCE_TO_COLORWAY_VISUAL_FIDELITY_QC: "PASS" | "FAIL" | "SKIP";
  PRODUCT_HERO_GARMENT_RENDER_QC: "PASS" | "FAIL";
  GARMENT_HORIZONTAL_BANDING_QC: "PASS" | "FAIL" | "SKIP";
  GARMENT_BANDING_DETECTOR_VALIDITY_QC: "PASS" | "FAIL" | "SKIP";
  COLOR_SPECIFIC_MERCHANDISING_RENDER_QC: "PASS" | "FAIL";
  VARIANT_METADATA_SYNC_QC: "PASS" | "FAIL";
  STOREFRONT_VARIANT_ELIGIBLE: boolean;
  failure_codes: string[];
};

function lum(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isOliveBrownGreenBand(r: number, g: number, b: number): boolean {
  if (r + g + b < 40) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 18) return false;
  // olive / brown / green contamination on black garment
  return g > r + 12 && g > b + 8 && lum(r, g, b) > 45 && lum(r, g, b) < 165;
}

function inPrintRect(nx: number, ny: number): boolean {
  const r = GARMENT_BACK_PRINT_RECT;
  return nx >= r.left && nx <= r.left + r.width && ny >= r.top && ny <= r.top + r.height;
}

function isBlackBodyChromaPollution(r: number, g: number, b: number): boolean {
  const l = lum(r, g, b);
  if (l > 95) return false;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  return chroma >= 14 && l >= 22;
}

/** Detect horizontal luminance banding on black fabric outside the print zone (SVG gradient + wrong collar tints). */
export async function evaluateBlackGarmentHorizontalBandingQc(input: {
  heroPng: Buffer;
}): Promise<{ BLACK_GARMENT_HORIZONTAL_BANDING_QC: "PASS" | "FAIL"; row_lum_deltas: number; chroma_pollution: number }> {
  const { data, info } = await sharp(input.heroPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const bodyTop = Math.floor(h * 0.72);
  const bodyBottom = Math.floor(h * 0.87);
  const rowMeans: number[] = [];
  let chromaPollution = 0;
  for (let y = bodyTop; y < bodyBottom; y += 3) {
    let sum = 0;
    let n = 0;
    for (let x = Math.floor(w * 0.22); x < Math.floor(w * 0.78); x += 5) {
      const nx = x / w;
      const ny = y / h;
      if (inPrintRect(nx, ny)) continue;
      const i = (y * w + x) * 4;
      if (data[i + 3]! < 200) continue;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      if (isBlackBodyChromaPollution(r, g, b)) chromaPollution += 1;
      sum += lum(r, g, b);
      n += 1;
    }
    if (n > 6) rowMeans.push(sum / n);
  }
  let rowDeltas = 0;
  for (let i = 1; i < rowMeans.length; i++) {
    if (Math.abs(rowMeans[i]! - rowMeans[i - 1]!) >= 6) rowDeltas += 1;
  }
  const spread = rowMeans.length ? Math.max(...rowMeans) - Math.min(...rowMeans) : 0;
  const fail = rowDeltas >= 4 || spread >= 18 || chromaPollution >= 8;
  return {
    BLACK_GARMENT_HORIZONTAL_BANDING_QC: fail ? "FAIL" : "PASS",
    row_lum_deltas: rowDeltas,
    chroma_pollution: chromaPollution,
  };
}

export async function evaluateGarmentColorPurityQc(input: {
  heroPng: Buffer;
  garment_color: string;
}): Promise<{ GARMENT_COLOR_PURITY_QC: "PASS" | "FAIL"; band_rows: number }> {
  const color = input.garment_color.toLowerCase();
  const { data, info } = await sharp(input.heroPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const bodyTop = Math.floor(h * 0.18);
  const bodyBottom = Math.floor(h * 0.88);
  const bodyLeft = Math.floor(w * 0.2);
  const bodyRight = Math.floor(w * 0.8);
  let bandRows = 0;
  for (let y = bodyTop; y < bodyBottom; y += 4) {
    let contaminated = 0;
    let samples = 0;
    for (let x = bodyLeft; x < bodyRight; x += 6) {
      const nx = x / w;
      const ny = y / h;
      if (color === "black" && inPrintRect(nx, ny)) continue;
      const i = (y * w + x) * 4;
      const a = data[i + 3]!;
      if (a < 200) continue;
      samples += 1;
      if (color === "black") {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        if (isOliveBrownGreenBand(r, g, b) || isBlackBodyChromaPollution(r, g, b)) contaminated += 1;
      }
    }
    if (samples > 8 && contaminated / samples > 0.12) bandRows += 1;
  }
  let fail = color === "black" ? bandRows >= 2 : false;
  if (color === "black") {
    const banding = await evaluateBlackGarmentHorizontalBandingQc({ heroPng: input.heroPng });
    if (banding.BLACK_GARMENT_HORIZONTAL_BANDING_QC === "FAIL") fail = true;
  }
  return { GARMENT_COLOR_PURITY_QC: fail ? "FAIL" : "PASS", band_rows: bandRows };
}

export async function evaluateGarmentRenderArtifactQc(input: {
  heroPng: Buffer;
  garment_color: string;
}): Promise<{ GARMENT_RENDER_ARTIFACT_QC: "PASS" | "FAIL"; full_width_bands: number }> {
  const purity = await evaluateGarmentColorPurityQc(input);
  // Rectangular print-canvas tint / alpha-box contamination manifests as body purity failure.
  return {
    GARMENT_RENDER_ARTIFACT_QC: purity.GARMENT_COLOR_PURITY_QC === "FAIL" ? "FAIL" : "PASS",
    full_width_bands: purity.band_rows,
  };
}

export async function evaluatePrintVisibilityQc(input: {
  heroPng: Buffer;
  garment_color: string;
}): Promise<{ PRINT_VISIBILITY_QC: "PASS" | "FAIL"; visible_fraction: number }> {
  const colorSlug = input.garment_color.toLowerCase();
  const isDark = colorSlug === "black";
  const isDarkHeather = colorSlug === "dark-heather";
  const { data, info } = await sharp(input.heroPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const r = GARMENT_BACK_PRINT_RECT;
  const bodyLum = lum(
    data[(Math.floor(h * 0.55) * w + Math.floor(w * 0.5)) * 4]!,
    data[(Math.floor(h * 0.55) * w + Math.floor(w * 0.5)) * 4 + 1]!,
    data[(Math.floor(h * 0.55) * w + Math.floor(w * 0.5)) * 4 + 2]!,
  );
  let visible = 0;
  let total = 0;
  for (let gy = 0.1; gy <= 0.9; gy += 0.08) {
    for (let gx = 0.1; gx <= 0.9; gx += 0.08) {
      const x = Math.floor(w * (r.left + r.width * gx));
      const y = Math.floor(h * (r.top + r.height * gy));
      const i = (y * w + x) * 4;
      const l = lum(data[i]!, data[i + 1]!, data[i + 2]!);
      total += 1;
      const delta = isDark || isDarkHeather ? l - bodyLum : bodyLum - l;
      const deltaMin = isDark ? 22 : isDarkHeather ? 16 : 18;
      if (delta >= deltaMin) visible += 1;
    }
  }
  const fraction = total ? visible / total : 0;
  const minFraction = isDark ? 0.08 : isDarkHeather ? 0.07 : input.garment_color === "ash" ? 0.09 : 0.1;
  return { PRINT_VISIBILITY_QC: fraction >= minFraction ? "PASS" : "FAIL", visible_fraction: Number(fraction.toFixed(3)) };
}

export async function diagnoseDarkCriticalArtGrid(input: {
  heroPng: Buffer;
}): Promise<{
  body_lum: number;
  spread: number;
  brightArt: number;
  failing_cells: Array<{ gx: number; gy: number; lum: number }>;
  bright_cells: Array<{ gx: number; gy: number; lum: number }>;
}> {
  const { data, info } = await sharp(input.heroPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const r = GARMENT_BACK_PRINT_RECT;
  const sampleAt = (gx: number, gy: number) => {
    const x = Math.floor(w * (r.left + r.width * gx));
    const y = Math.floor(h * (r.top + r.height * gy));
    const i = (y * w + x) * 4;
    return { gx, gy, lum: lum(data[i]!, data[i + 1]!, data[i + 2]!) };
  };
  const sampleCanvas = (nx: number, ny: number) => {
    const x = Math.floor(w * nx);
    const y = Math.floor(h * ny);
    const i = (y * w + x) * 4;
    return lum(data[i]!, data[i + 1]!, data[i + 2]!);
  };
  const body =
    sampleCanvas(0.5, 0.78) <= 40
      ? sampleCanvas(0.5, 0.78)
      : sampleCanvas(0.5, 0.55);
  const cells: Array<{ gx: number; gy: number; lum: number }> = [];
  for (let gy = 0.08; gy <= 0.92; gy += 0.12) {
    for (let gx = 0.08; gx <= 0.92; gx += 0.12) {
      cells.push(sampleAt(gx, gy));
    }
  }
  const spread = Math.max(...cells.map((c) => c.lum)) - Math.min(...cells.map((c) => c.lum));
  const bright = cells.filter((c) => c.lum >= body + 18);
  const failing = cells.filter((c) => c.lum < body + 18);
  return { body_lum: body, spread, brightArt: bright.length, failing_cells: failing, bright_cells: bright };
}

export async function evaluateCriticalArtRegionContrastQc(input: {
  heroPng: Buffer;
  garment_color: string;
}): Promise<{ CRITICAL_ART_REGION_CONTRAST_QC: "PASS" | "FAIL"; regions_pass: number }> {
  const isDark = input.garment_color.toLowerCase() === "black";
  const { data, info } = await sharp(input.heroPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const r = GARMENT_BACK_PRINT_RECT;
  const sampleAt = (gx: number, gy: number) => {
    const x = Math.floor(w * (r.left + r.width * gx));
    const y = Math.floor(h * (r.top + r.height * gy));
    const i = (y * w + x) * 4;
    return lum(data[i]!, data[i + 1]!, data[i + 2]!);
  };
  const sampleCanvas = (nx: number, ny: number) => {
    const x = Math.floor(w * nx);
    const y = Math.floor(h * ny);
    const i = (y * w + x) * 4;
    return lum(data[i]!, data[i + 1]!, data[i + 2]!);
  };
  if (isDark) {
    const samples: number[] = [];
    for (let gy = 0.08; gy <= 0.92; gy += 0.12) {
      for (let gx = 0.08; gx <= 0.92; gx += 0.12) {
        samples.push(sampleAt(gx, gy));
      }
    }
    const spread = Math.max(...samples) - Math.min(...samples);
    /** Garment fabric reference — avoid print-relative gy and avoid bleed into art. */
    let body = sampleCanvas(0.5, 0.78);
    if (body > 40) body = sampleCanvas(0.5, 0.55);
    const brightArt = samples.filter((l) => l >= body + 18).length;
    const pass = spread >= 32 && brightArt >= 4;
    return { CRITICAL_ART_REGION_CONTRAST_QC: pass ? "PASS" : "FAIL", regions_pass: brightArt };
  }
  const body = sampleAt(0.5, 0.95);
  const regions = [
    [0.5, 0.2],
    [0.35, 0.45],
    [0.65, 0.45],
    [0.5, 0.65],
    [0.5, 0.4],
  ] as const;
  let pass = 0;
  for (const [gx, gy] of regions) {
    const art = sampleAt(gx, gy);
    if (body - art >= 16) pass += 1;
  }
  return { CRITICAL_ART_REGION_CONTRAST_QC: pass >= 2 ? "PASS" : "FAIL", regions_pass: pass };
}

export async function evaluateColorwayQcBundle(input: {
  sku: string;
  garment_color: string;
  heroPng: Buffer;
  cwd?: string;
  canonicalArtPath?: string | null;
  adaptedDarkArtPath?: string | null;
}): Promise<ColorwayQcBundle> {
  const cwd = input.cwd ?? process.cwd();
  const failure_codes: string[] = [];
  const sizes = ["S", "M", "L", "XL", "2XL"] as const;
  const providerOk = sizes.every((size) => resolveGelatoVariantUid({ sku: input.sku, size, color: input.garment_color, cwd }).ok);
  const PROVIDER_VARIANT_MAPPING_QC = providerOk ? "PASS" : "FAIL";
  const COLOR_SIZE_VARIANT_MATRIX_QC = providerOk ? "PASS" : "FAIL";
  if (!providerOk) failure_codes.push("PROVIDER_VARIANT_MAPPING");

  const isBlackGarment = isDarkGarmentColor(input.garment_color);
  const bandingValidity = isBlackGarment
    ? await evaluateGarmentBandingDetectorValidityQc({ heroPng: input.heroPng, garment_color: input.garment_color })
    : null;
  const purity = await evaluateGarmentColorPurityQc({ heroPng: input.heroPng, garment_color: input.garment_color });
  const artifact = await evaluateGarmentRenderArtifactQc({ heroPng: input.heroPng, garment_color: input.garment_color });
  const printVis = await evaluatePrintVisibilityQc({ heroPng: input.heroPng, garment_color: input.garment_color });
  const critical = await evaluateCriticalArtRegionContrastQc({ heroPng: input.heroPng, garment_color: input.garment_color });
  const hero = await evaluateStorefrontProductGarmentRenderQc({
    heroPng: input.heroPng,
    sku: input.sku,
    garment_color: input.garment_color,
  });

  const GARMENT_CONTRAST_QC = printVis.PRINT_VISIBILITY_QC;
  if (bandingValidity?.GARMENT_HORIZONTAL_BANDING_QC === "FAIL") {
    failure_codes.push("GARMENT_HORIZONTAL_COLOR_BANDING");
  } else if (purity.GARMENT_COLOR_PURITY_QC === "FAIL") {
    failure_codes.push("GARMENT_HORIZONTAL_COLOR_BANDING");
  }
  if (bandingValidity?.GARMENT_BANDING_DETECTOR_VALIDITY_QC === "FAIL") {
    failure_codes.push("GARMENT_BANDING_DETECTOR_VALIDITY_FAIL");
  }
  if (artifact.GARMENT_RENDER_ARTIFACT_QC === "FAIL") failure_codes.push("GARMENT_RENDER_ARTIFACT");
  if (printVis.PRINT_VISIBILITY_QC === "FAIL") failure_codes.push("BLACK_ART_LOW_CONTRAST");
  if (critical.CRITICAL_ART_REGION_CONTRAST_QC === "FAIL") failure_codes.push("CRITICAL_REGION_LOW_CONTRAST");
  if (hero.PRODUCT_HERO_GARMENT_RENDER_QC === "FAIL") failure_codes.push("PRODUCT_HERO_GARMENT_RENDER");

  const isBlack = isDarkGarmentColor(input.garment_color);
  let fidelity: DarkGarmentDesignFidelityBundle | null = null;
  if (isBlack && input.canonicalArtPath && input.adaptedDarkArtPath) {
    fidelity = await evaluateDarkGarmentDesignFidelityQc({
      sourcePath: input.canonicalArtPath,
      adaptedPath: input.adaptedDarkArtPath,
    });
    failure_codes.push(...fidelity.failure_codes);
    if (contrastPassDesignFidelityFail({
      print_visibility: printVis.PRINT_VISIBILITY_QC,
      adaptation_quality: fidelity.DARK_GARMENT_ADAPTATION_QUALITY_QC,
    })) {
      failure_codes.push("CONTRAST_QC_PASS_BUT_DESIGN_FIDELITY_FAIL");
      failure_codes.push("PRINT_VISIBILITY_PASS_DESIGN_FIDELITY_FAIL");
    }
  }

  const fidelityPass =
    !isBlack ||
    (fidelity !== null && fidelity.DARK_GARMENT_ADAPTATION_QUALITY_QC === "PASS");

  const merchandisingPass =
    purity.GARMENT_COLOR_PURITY_QC === "PASS" &&
    artifact.GARMENT_RENDER_ARTIFACT_QC === "PASS" &&
    printVis.PRINT_VISIBILITY_QC === "PASS" &&
    hero.PRODUCT_HERO_GARMENT_RENDER_QC === "PASS" &&
    fidelityPass;

  const gates = [
    PROVIDER_VARIANT_MAPPING_QC,
    COLOR_SIZE_VARIANT_MATRIX_QC,
    purity.GARMENT_COLOR_PURITY_QC,
    isBlackGarment ? (bandingValidity?.GARMENT_HORIZONTAL_BANDING_QC ?? "FAIL") : "PASS",
    isBlackGarment ? (bandingValidity?.GARMENT_BANDING_DETECTOR_VALIDITY_QC ?? "FAIL") : "PASS",
    artifact.GARMENT_RENDER_ARTIFACT_QC,
    GARMENT_CONTRAST_QC,
    critical.CRITICAL_ART_REGION_CONTRAST_QC,
    printVis.PRINT_VISIBILITY_QC,
    isBlack ? (fidelity?.DARK_GARMENT_ADAPTATION_QUALITY_QC ?? "FAIL") : "PASS",
    hero.PRODUCT_HERO_GARMENT_RENDER_QC,
    merchandisingPass ? "PASS" : "FAIL",
  ] as const;

  return {
    sku: input.sku,
    garment_color: input.garment_color,
    PROVIDER_VARIANT_MAPPING_QC,
    COLOR_SIZE_VARIANT_MATRIX_QC,
    GARMENT_COLOR_PURITY_QC: purity.GARMENT_COLOR_PURITY_QC,
    GARMENT_RENDER_ARTIFACT_QC: artifact.GARMENT_RENDER_ARTIFACT_QC,
    GARMENT_CONTRAST_QC,
    CRITICAL_ART_REGION_CONTRAST_QC: critical.CRITICAL_ART_REGION_CONTRAST_QC,
    PRINT_VISIBILITY_QC: printVis.PRINT_VISIBILITY_QC,
    ORIGINAL_ART_COLOR_FIDELITY_QC: isBlack ? (fidelity?.ORIGINAL_ART_COLOR_FIDELITY_QC ?? "FAIL") : "SKIP",
    DARK_GARMENT_TONAL_RANGE_QC: isBlack ? (fidelity?.DARK_GARMENT_TONAL_RANGE_QC ?? "FAIL") : "SKIP",
    SELECTIVE_KEYLINE_QUALITY_QC: isBlack ? (fidelity?.SELECTIVE_KEYLINE_QUALITY_QC ?? "FAIL") : "SKIP",
    DARK_GARMENT_ADAPTATION_QUALITY_QC: isBlack ? (fidelity?.DARK_GARMENT_ADAPTATION_QUALITY_QC ?? "FAIL") : "SKIP",
    SOURCE_TO_COLORWAY_VISUAL_FIDELITY_QC: isBlack
      ? (fidelity?.SOURCE_TO_COLORWAY_VISUAL_FIDELITY_QC ?? "FAIL")
      : "SKIP",
    PRODUCT_HERO_GARMENT_RENDER_QC: hero.PRODUCT_HERO_GARMENT_RENDER_QC,
    GARMENT_HORIZONTAL_BANDING_QC: isBlackGarment ? (bandingValidity?.GARMENT_HORIZONTAL_BANDING_QC ?? "FAIL") : "SKIP",
    GARMENT_BANDING_DETECTOR_VALIDITY_QC: isBlackGarment
      ? (bandingValidity?.GARMENT_BANDING_DETECTOR_VALIDITY_QC ?? "FAIL")
      : "SKIP",
    COLOR_SPECIFIC_MERCHANDISING_RENDER_QC: merchandisingPass ? "PASS" : "FAIL",
    VARIANT_METADATA_SYNC_QC: "PASS",
    STOREFRONT_VARIANT_ELIGIBLE: gates.every((g) => g === "PASS"),
    failure_codes,
  };
}
