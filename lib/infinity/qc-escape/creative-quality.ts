import { createHash } from "node:crypto";
import { qcResultFromEvidence, type QcGateResult } from "./contract";

export const GENERIC_LINE_CHART_PATH = "M80 520 L280 300 L460 420 L720 180 L1120 520";

export function creativeGeometryFingerprint(svg: string): string {
  const paths = [...svg.matchAll(/\bd="([^"]+)"/g)].map((row) => row[1]).join("|");
  const shapes = (svg.match(/<(path|polygon|polyline|circle|ellipse|rect|g)\b/g) ?? []).join(",");
  return createHash("sha256").update(`${paths}::${shapes}`).digest("hex").slice(0, 16);
}

export function inspectSvgCreativeQuality(svg: string): {
  uniqueGeometry: boolean;
  genericFiller: boolean;
  textArtifacts: boolean;
  clippedEdgeText: boolean;
  tooBasic: boolean;
  sharedTemplate: boolean;
  safeAspect: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const sharedTemplate = svg.includes(GENERIC_LINE_CHART_PATH);
  const elementCount = (svg.match(/<(path|polygon|polyline|circle|ellipse|rect|linearGradient|radialGradient|g)\b/g) ?? []).length;
  const tooBasic = elementCount < 8;
  const text = [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)];
  let clippedEdgeText = false;
  const viewBox = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const width = Number(viewBox?.[1] ?? 1200);
  const height = Number(viewBox?.[2] ?? 675);
  for (const row of text) {
    const attrs = row[1] ?? "";
    const x = Number((attrs.match(/\bx="([\d.]+)"/) ?? [])[1] ?? 0);
    const y = Number((attrs.match(/\by="([\d.]+)"/) ?? [])[1] ?? 0);
    const size = Number((attrs.match(/font-size="([\d.]+)"/) ?? [])[1] ?? 0);
    const insetX = width * 0.18;
    const insetY = height * 0.18;
    if (x < insetX || x > width - insetX || y < insetY || y > height - insetY || size >= 40) {
      clippedEdgeText = true;
    }
  }
  const aspect = width / height;
  const safeAspect = aspect >= 1.2 && aspect <= 1.45;
  if (sharedTemplate) reasons.push("GENERIC_LINE_CHART_TEMPLATE");
  if (tooBasic) reasons.push("CREATIVE_TOO_BASIC");
  if (clippedEdgeText) reasons.push("EDGE_TEXT_CLIP_RISK");
  if (!safeAspect) reasons.push("ASPECT_CROP_RISK");
  if (text.length && clippedEdgeText) reasons.push("TEXT_ARTIFACTS");
  return {
    uniqueGeometry: !sharedTemplate,
    genericFiller: sharedTemplate || tooBasic,
    textArtifacts: clippedEdgeText,
    clippedEdgeText,
    tooBasic,
    sharedTemplate,
    safeAspect,
    reasons,
  };
}

export function evaluateInspectedCreativeQualityGate(svg: string): {
  gate: "DesignCoreCreativeQualityGate";
  result: QcGateResult;
  reasons: string[];
} {
  const inspected = inspectSvgCreativeQuality(svg);
  return {
    gate: "DesignCoreCreativeQualityGate",
    result: qcResultFromEvidence({
      failed: inspected.reasons.length > 0,
      requiredEvidencePresent: true,
    }),
    reasons: inspected.reasons.length ? inspected.reasons : ["INSPECTED_SVG_QUALITY"],
  };
}

export function evaluateCreativeGeometryUniqueness(svgs: string[]): {
  gate: "CreativeUniquenessGate";
  result: QcGateResult;
  reasons: string[];
} {
  const prints = svgs.map((svg) => creativeGeometryFingerprint(svg));
  const dupes = prints.filter((print, index) => prints.indexOf(print) !== index);
  return {
    gate: "CreativeUniquenessGate",
    result: dupes.length ? "FAIL" : "PASS",
    reasons: dupes.length ? ["GEOMETRY_NEAR_DUPLICATE"] : ["UNIQUE_GEOMETRY"],
  };
}
