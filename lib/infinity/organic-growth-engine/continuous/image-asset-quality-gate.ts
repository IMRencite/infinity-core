import type { VentureImageAssetRecord } from "./venture-image-creative-v2";
import type { OrganicNamedGate } from "./types";

export const IMAGE_ASSET_QUALITY_GATE = "ImageAssetQualityGate" as const;

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

export function evaluateImageAssetQualityGate(input: {
  record: VentureImageAssetRecord;
  svg_or_binary_present: boolean;
  duplicate_of?: string | null;
}): OrganicNamedGate {
  const reasons: string[] = [];
  if (!input.svg_or_binary_present) reasons.push("technical_integrity");
  if (input.record.width < 640 || input.record.height < 360) reasons.push("resolution_low");
  if (!input.record.alt || input.record.alt.length < 12) reasons.push("alt_text_weak");
  if (input.record.framework === "LEGACY_EDITORIAL_WORLD") reasons.push("legacy_framework");
  if (/\.svg$/i.test(input.record.path) && input.record.framework === "VENTURE_CREATIVE_V2") {
    reasons.push("editorial_hero_svg_not_raster");
  }
  if (input.duplicate_of) reasons.push("excessive_reuse");
  if (/Shirt logic|weight · print/i.test(input.record.alt)) reasons.push("legacy_editorial_world_label");
  return named(IMAGE_ASSET_QUALITY_GATE, reasons);
}
