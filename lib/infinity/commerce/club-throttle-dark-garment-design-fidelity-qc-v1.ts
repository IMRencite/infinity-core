import { existsSync } from "node:fs";
import sharp from "sharp";

export const FOUNDER_RENDERED_EVIDENCE_OVERRIDES_AUTOMATED_PASS = true as const;

export type DarkGarmentDesignFidelityBundle = {
  ORIGINAL_ART_COLOR_FIDELITY_QC: "PASS" | "FAIL";
  DARK_GARMENT_TONAL_RANGE_QC: "PASS" | "FAIL";
  SELECTIVE_KEYLINE_QUALITY_QC: "PASS" | "FAIL";
  DARK_GARMENT_ADAPTATION_QUALITY_QC: "PASS" | "FAIL";
  SOURCE_TO_COLORWAY_VISUAL_FIDELITY_QC: "PASS" | "FAIL";
  DARK_GARMENT_DESIGN_FIDELITY_QC: "PASS" | "FAIL";
  metrics: {
    shadow_mean_lum_lift: number;
    interior_modified_fraction: number;
    tonal_p10_lift: number;
    saturation_drift_mean: number;
    keyline_exterior_only: boolean;
  };
  failure_codes: string[];
};

function lum(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sat(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function isNearBoundary(data: Buffer, w: number, h: number, x: number, y: number, radius: number): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return true;
      const a = data[(ny * w + nx) * 4 + 3]!;
      if (a < 32) return true;
    }
  }
  return false;
}

export async function evaluateDarkGarmentDesignFidelityQc(input: {
  sourcePath: string;
  adaptedPath: string;
  /** Pixels allowed to differ outside this interior band (keyline + local edge). */
  boundaryBandPx?: number;
}): Promise<DarkGarmentDesignFidelityBundle> {
  const failure_codes: string[] = [];
  if (!existsSync(input.sourcePath) || !existsSync(input.adaptedPath)) {
    return {
      ORIGINAL_ART_COLOR_FIDELITY_QC: "FAIL",
      DARK_GARMENT_TONAL_RANGE_QC: "FAIL",
      SELECTIVE_KEYLINE_QUALITY_QC: "FAIL",
      DARK_GARMENT_ADAPTATION_QUALITY_QC: "FAIL",
      SOURCE_TO_COLORWAY_VISUAL_FIDELITY_QC: "FAIL",
      DARK_GARMENT_DESIGN_FIDELITY_QC: "FAIL",
      metrics: {
        shadow_mean_lum_lift: 0,
        interior_modified_fraction: 1,
        tonal_p10_lift: 0,
        saturation_drift_mean: 0,
        keyline_exterior_only: false,
      },
      failure_codes: ["ART_PATH_MISSING"],
    };
  }

  const band = input.boundaryBandPx ?? 4;
  const src = await sharp(input.sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const adp = await sharp(input.adaptedPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (src.info.width !== adp.info.width || src.info.height !== adp.info.height) {
    failure_codes.push("DIMENSION_MISMATCH");
    return failBundle(failure_codes, { shadow_mean_lum_lift: 0, interior_modified_fraction: 1, tonal_p10_lift: 0, saturation_drift_mean: 0, keyline_exterior_only: false });
  }

  const w = src.info.width;
  const h = src.info.height;
  const s = src.data;
  const a = adp.data;
  const srcLums: number[] = [];
  const adpLums: number[] = [];
  let shadowLiftSum = 0;
  let shadowCount = 0;
  let interiorTotal = 0;
  let interiorModified = 0;
  let satDriftSum = 0;
  let satDriftCount = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (s[i + 3]! < 8) continue;
      const sr = s[i]!;
      const sg = s[i + 1]!;
      const sb = s[i + 2]!;
      const sl = lum(sr, sg, sb);
      const ar = a[i]!;
      const ag = a[i + 1]!;
      const ab = a[i + 2]!;
      const al = lum(ar, ag, ab);
      srcLums.push(sl);
      adpLums.push(al);
      const onBoundary = isNearBoundary(s, w, h, x, y, band);
      if (sl < 80 && !onBoundary) {
        shadowLiftSum += al - sl;
        shadowCount += 1;
      }
      if (!onBoundary) {
        interiorTotal += 1;
        const delta = Math.abs(sr - ar) + Math.abs(sg - ag) + Math.abs(sb - ab);
        if (delta > 24) interiorModified += 1;
      }
      const ss = sat(sr, sg, sb);
      if (ss > 0.12) {
        satDriftSum += Math.abs(ss - sat(ar, ag, ab));
        satDriftCount += 1;
      }
    }
  }

  srcLums.sort((x, y) => x - y);
  adpLums.sort((x, y) => x - y);
  const p10 = (arr: number[]) => arr[Math.floor(arr.length * 0.1)] ?? 0;
  const tonalP10Lift = p10(adpLums) - p10(srcLums);
  const shadowMeanLift = shadowCount ? shadowLiftSum / shadowCount : 0;
  const interiorFrac = interiorTotal ? interiorModified / interiorTotal : 0;
  const satDriftMean = satDriftCount ? satDriftSum / satDriftCount : 0;

  let colorFidelity: "PASS" | "FAIL" = "PASS";
  if (shadowMeanLift > 22) {
    colorFidelity = "FAIL";
    failure_codes.push("GLOBAL_BRIGHTNESS_LIFT_WASHED_OUT_DARK_ART");
    failure_codes.push("DARK_GARMENT_SOURCE_COLOR_DRIFT");
  }
  if (interiorFrac > 0.08) {
    colorFidelity = "FAIL";
    failure_codes.push("OVER_ADAPTATION_FOR_CONTRAST");
  }
  if (satDriftMean > 0.14 && shadowMeanLift > 12) {
    colorFidelity = "FAIL";
    failure_codes.push("DARK_GARMENT_SOURCE_COLOR_DRIFT");
  }

  let tonalRange: "PASS" | "FAIL" = "PASS";
  if (tonalP10Lift > 38) {
    tonalRange = "FAIL";
    failure_codes.push("DARK_GARMENT_TONAL_RANGE_COLLAPSE");
  }

  let keylineQc: "PASS" | "FAIL" = interiorFrac <= 0.06 ? "PASS" : "FAIL";
  if (keylineQc === "FAIL") failure_codes.push("EXCESSIVE_INTERIOR_KEYLINE_OR_HALO");

  const adaptationQuality =
    colorFidelity === "PASS" && tonalRange === "PASS" && keylineQc === "PASS" ? "PASS" : "FAIL";
  if (adaptationQuality === "FAIL" && failure_codes.length === 0) {
    failure_codes.push("DARK_GARMENT_ADAPTATION_QUALITY_FAIL");
  }

  const designFidelity = adaptationQuality;

  return {
    ORIGINAL_ART_COLOR_FIDELITY_QC: colorFidelity,
    DARK_GARMENT_TONAL_RANGE_QC: tonalRange,
    SELECTIVE_KEYLINE_QUALITY_QC: keylineQc,
    DARK_GARMENT_ADAPTATION_QUALITY_QC: adaptationQuality,
    SOURCE_TO_COLORWAY_VISUAL_FIDELITY_QC: designFidelity,
    DARK_GARMENT_DESIGN_FIDELITY_QC: designFidelity,
    metrics: {
      shadow_mean_lum_lift: Number(shadowMeanLift.toFixed(2)),
      interior_modified_fraction: Number(interiorFrac.toFixed(4)),
      tonal_p10_lift: Number(tonalP10Lift.toFixed(2)),
      saturation_drift_mean: Number(satDriftMean.toFixed(4)),
      keyline_exterior_only: keylineQc === "PASS",
    },
    failure_codes,
  };
}

function failBundle(
  failure_codes: string[],
  metrics: DarkGarmentDesignFidelityBundle["metrics"],
): DarkGarmentDesignFidelityBundle {
  return {
    ORIGINAL_ART_COLOR_FIDELITY_QC: "FAIL",
    DARK_GARMENT_TONAL_RANGE_QC: "FAIL",
    SELECTIVE_KEYLINE_QUALITY_QC: "FAIL",
    DARK_GARMENT_ADAPTATION_QUALITY_QC: "FAIL",
    SOURCE_TO_COLORWAY_VISUAL_FIDELITY_QC: "FAIL",
    DARK_GARMENT_DESIGN_FIDELITY_QC: "FAIL",
    metrics,
    failure_codes,
  };
}

/** When visibility passes automated gates but fidelity fails (founder override class). */
export function contrastPassDesignFidelityFail(input: {
  print_visibility: "PASS" | "FAIL";
  adaptation_quality: "PASS" | "FAIL";
}): boolean {
  return input.print_visibility === "PASS" && input.adaptation_quality === "FAIL";
}
