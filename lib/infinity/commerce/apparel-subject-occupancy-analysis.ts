import sharp from "sharp";

/** Infinity rule: alpha bbox ≈ 100% is NOT subject fills frame — use APPAREL_SUBJECT_OCCUPANCY_QC + APPAREL_TRANSPARENT_PERIMETER_QC. */

export type ApparelSubjectOccupancyAnalysis = {
  canvas_width: number;
  canvas_height: number;
  /** All opaque/non-transparent pixels (legacy alpha bbox). */
  ALPHA_ART_BBOX: { left: number; top: number; width: number; height: number } | null;
  ALPHA_CANVAS_WIDTH_RATIO: number | null;
  ALPHA_CANVAS_HEIGHT_RATIO: number | null;
  /** Intentional graphic after dark-panel flood exclusion. */
  SUBJECT_BBOX: { left: number; top: number; width: number; height: number } | null;
  SUBJECT_WIDTH_RATIO: number | null;
  SUBJECT_HEIGHT_RATIO: number | null;
  OPAQUE_CANVAS_EDGE_COVERAGE: number;
  OPAQUE_RECTANGULAR_BACKGROUND_DETECTED: "YES" | "NO";
  FULL_FRAME_BACKGROUND_PANEL_DETECTED: "YES" | "NO";
  background_panel_area_ratio: number;
  subject_area_ratio: number;
};

export type ApparelTransparentPerimeterQcResult = {
  APPAREL_TRANSPARENT_PERIMETER_QC: "PASS" | "FAIL" | "UNKNOWN";
  TRUE_TRANSPARENT_PERIMETER: "YES" | "NO" | "UNKNOWN";
  perimeter_transparent_ratio: number | null;
  corner_transparent: boolean;
  reasons: string[];
  rule: string;
};

export type ApparelSubjectOccupancyQcResult = {
  APPAREL_SUBJECT_OCCUPANCY_QC: "PASS" | "FAIL" | "UNKNOWN";
  /** Distinct from alpha-only occupancy. */
  ALPHA_CANVAS_OCCUPANCY_QC: "PASS" | "FAIL" | "UNKNOWN";
  analysis: ApparelSubjectOccupancyAnalysis;
  reasons: string[];
  rule: string;
};

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Flood dark neutral panels from image edges; remaining opaque ink ≈ subject graphic. */
export function analyzeApparelSubjectFromBuffer(input: {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}): ApparelSubjectOccupancyAnalysis {
  const { data, width, height, channels } = input;
  const bg = new Uint8Array(width * height);
  const queue: number[] = [];

  function isWarmSceneInk(r: number, g: number, b: number): boolean {
    return r > b + 14 && g > b + 6 && luminance(r, g, b) > 42;
  }

  function isEdgeFloodBackground(r: number, g: number, b: number, a: number): boolean {
    if (a < 20) return true;
    if (isWarmSceneInk(r, g, b)) return false;
    const lum = luminance(r, g, b);
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (lum < 48 && chroma < 42) return true;
    if (lum < 88 && chroma < 38) return true;
    return false;
  }

  /** Flat dark night / matte panel ink — not rider, lamp, or warm atmosphere. */
  function isFlatDarkPanelInk(r: number, g: number, b: number, a: number): boolean {
    if (a < 32) return false;
    if (isWarmSceneInk(r, g, b)) return false;
    const lum = luminance(r, g, b);
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    return lum < 86 && chroma < 40;
  }

  function push(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (bg[i]) return;
    const o = i * channels;
    if (!isEdgeFloodBackground(data[o]!, data[o + 1]!, data[o + 2]!, data[o + 3]!)) return;
    bg[i] = 1;
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
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  let alphaMinX = width;
  let alphaMinY = height;
  let alphaMaxX = 0;
  let alphaMaxY = 0;
  let subMinX = width;
  let subMinY = height;
  let subMaxX = 0;
  let subMaxY = 0;
  let bgCount = 0;
  let subCount = 0;
  let opaqueEdge = 0;
  let edgeSamples = 0;
  const band = Math.max(2, Math.floor(Math.min(width, height) * 0.04));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = i * channels;
      const a = data[o + 3]!;
      const onEdge =
        x < band || x >= width - band || y < band || y >= height - band;
      if (onEdge) {
        edgeSamples += 1;
        if (a > 200) opaqueEdge += 1;
      }
      if (a < 32) continue;
      if (x < alphaMinX) alphaMinX = x;
      if (y < alphaMinY) alphaMinY = y;
      if (x > alphaMaxX) alphaMaxX = x;
      if (y > alphaMaxY) alphaMaxY = y;
      const r = data[o]!;
      const g = data[o + 1]!;
      const b = data[o + 2]!;
      const panel = bg[i] || isFlatDarkPanelInk(r, g, b, a);
      if (panel) {
        bgCount += 1;
        continue;
      }
      subCount += 1;
      if (x < subMinX) subMinX = x;
      if (y < subMinY) subMinY = y;
      if (x > subMaxX) subMaxX = x;
      if (y > subMaxY) subMaxY = y;
    }
  }

  const hasAlpha = alphaMaxX >= alphaMinX && alphaMaxY >= alphaMinY;
  const alphaBbox = hasAlpha
    ? {
        left: alphaMinX,
        top: alphaMinY,
        width: alphaMaxX - alphaMinX + 1,
        height: alphaMaxY - alphaMinY + 1,
      }
    : null;

  const hasSubject = subCount > 0 && subMaxX >= subMinX;
  const subjectBbox = hasSubject
    ? {
        left: subMinX,
        top: subMinY,
        width: subMaxX - subMinX + 1,
        height: subMaxY - subMinY + 1,
      }
    : null;

  const total = width * height;
  const bgRatio = bgCount / total;
  const subRatio = subCount / total;

  const cornersOpaqueDark = (() => {
    const pts = [
      [0, 0],
      [width - 1, 0],
      [0, height - 1],
      [width - 1, height - 1],
    ];
    return pts.every(([cx, cy]) => {
      const o = (cy * width + cx) * channels;
      return data[o + 3]! > 200 && luminance(data[o]!, data[o + 1]!, data[o + 2]!) < 55;
    });
  })();

  const fullFramePanel =
    (cornersOpaqueDark && bgRatio > 0.35 && (subjectBbox ? (subjectBbox.width * subjectBbox.height) / total < 0.72 : true)) ||
    (opaqueEdge / Math.max(1, edgeSamples) > 0.85 &&
      bgRatio > 0.25 &&
      (subjectBbox ? subjectBbox.width / width > 0.92 && subjectBbox.height / height > 0.92 : false));

  return {
    canvas_width: width,
    canvas_height: height,
    ALPHA_ART_BBOX: alphaBbox,
    ALPHA_CANVAS_WIDTH_RATIO: alphaBbox ? Number((alphaBbox.width / width).toFixed(4)) : null,
    ALPHA_CANVAS_HEIGHT_RATIO: alphaBbox ? Number((alphaBbox.height / height).toFixed(4)) : null,
    SUBJECT_BBOX: subjectBbox,
    SUBJECT_WIDTH_RATIO: subjectBbox ? Number((subjectBbox.width / width).toFixed(4)) : null,
    SUBJECT_HEIGHT_RATIO: subjectBbox ? Number((subjectBbox.height / height).toFixed(4)) : null,
    OPAQUE_CANVAS_EDGE_COVERAGE: edgeSamples ? Number((opaqueEdge / edgeSamples).toFixed(4)) : 0,
    OPAQUE_RECTANGULAR_BACKGROUND_DETECTED: cornersOpaqueDark && bgRatio > 0.25 ? "YES" : "NO",
    FULL_FRAME_BACKGROUND_PANEL_DETECTED: fullFramePanel ? "YES" : "NO",
    background_panel_area_ratio: Number(bgRatio.toFixed(4)),
    subject_area_ratio: Number(subRatio.toFixed(4)),
  };
}

export async function analyzeApparelSubjectOccupancyFromPath(
  pngPath: string,
): Promise<ApparelSubjectOccupancyAnalysis> {
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return analyzeApparelSubjectFromBuffer({
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  });
}

export function evaluateApparelTransparentPerimeterQc(
  analysis: ApparelSubjectOccupancyAnalysis,
): ApparelTransparentPerimeterQcResult {
  const reasons: string[] = [];
  if (analysis.FULL_FRAME_BACKGROUND_PANEL_DETECTED === "YES") {
    reasons.push("full_frame_background_panel");
  }
  if (analysis.OPAQUE_RECTANGULAR_BACKGROUND_DETECTED === "YES") {
    reasons.push("opaque_rectangular_background");
  }
  if (analysis.OPAQUE_CANVAS_EDGE_COVERAGE > 0.85) {
    reasons.push("opaque_edge_to_edge_perimeter");
  }
  const perimeterTransparent = analysis.OPAQUE_CANVAS_EDGE_COVERAGE < 0.35;
  if (!perimeterTransparent) reasons.push("perimeter_not_transparent");

  return {
    APPAREL_TRANSPARENT_PERIMETER_QC: reasons.length ? "FAIL" : "PASS",
    TRUE_TRANSPARENT_PERIMETER: perimeterTransparent ? "YES" : "NO",
    perimeter_transparent_ratio: Number((1 - analysis.OPAQUE_CANVAS_EDGE_COVERAGE).toFixed(4)),
    corner_transparent: analysis.OPAQUE_CANVAS_EDGE_COVERAGE < 0.5,
    reasons,
    rule: "Large-back art must have true transparent perimeter — not a dark rectangle to garment edges.",
  };
}

export function evaluateApparelSubjectOccupancyQc(
  analysis: ApparelSubjectOccupancyAnalysis,
  opts?: { min_subject_width_ratio?: number; min_subject_height_ratio?: number },
): ApparelSubjectOccupancyQcResult {
  const minW = opts?.min_subject_width_ratio ?? 0.55;
  const minH = opts?.min_subject_height_ratio ?? 0.6;
  const reasons: string[] = [];

  if (!analysis.SUBJECT_BBOX) reasons.push("subject_bbox_missing");
  else {
    if ((analysis.SUBJECT_WIDTH_RATIO ?? 0) < minW) reasons.push("subject_width_ratio_low");
    if ((analysis.SUBJECT_HEIGHT_RATIO ?? 0) < minH) reasons.push("subject_height_ratio_low");
  }
  if (analysis.FULL_FRAME_BACKGROUND_PANEL_DETECTED === "YES") {
    reasons.push("subject_dwarfed_by_full_frame_panel");
  }
  if (
    analysis.OPAQUE_CANVAS_EDGE_COVERAGE > 0.85 &&
    (analysis.SUBJECT_WIDTH_RATIO ?? 0) > 0.88 &&
    (analysis.SUBJECT_HEIGHT_RATIO ?? 0) > 0.88
  ) {
    reasons.push("opaque_edge_to_edge_canvas_not_apparel_subject");
  }
  if (
    analysis.OPAQUE_CANVAS_EDGE_COVERAGE > 0.85 &&
    (analysis.SUBJECT_WIDTH_RATIO ?? 0) > 0.88 &&
    analysis.background_panel_area_ratio < 0.2
  ) {
    reasons.push("subject_bbox_collapsed_to_full_opaque_canvas");
  }

  const alphaFalsePositive =
    (analysis.ALPHA_CANVAS_WIDTH_RATIO ?? 0) > 0.95 &&
    (analysis.ALPHA_CANVAS_HEIGHT_RATIO ?? 0) > 0.95 &&
    ((analysis.SUBJECT_WIDTH_RATIO ?? 1) < 0.75 ||
      analysis.OPAQUE_CANVAS_EDGE_COVERAGE > 0.85 ||
      analysis.FULL_FRAME_BACKGROUND_PANEL_DETECTED === "YES");

  const alphaPass = alphaFalsePositive ? "FAIL" : "PASS";

  if (alphaPass === "FAIL") reasons.push("alpha_bbox_false_positive_full_opaque_canvas");

  return {
    APPAREL_SUBJECT_OCCUPANCY_QC: reasons.length ? "FAIL" : "PASS",
    ALPHA_CANVAS_OCCUPANCY_QC: alphaPass,
    analysis,
    reasons,
    rule: "Subject occupancy uses flood-excluded graphic ink — not full-frame opaque night fill.",
  };
}
