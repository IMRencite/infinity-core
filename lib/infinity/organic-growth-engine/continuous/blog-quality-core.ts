import { BLOG_CONTENT_QUALITY_GATE, BLOG_VISUAL_ASSET_GATE } from "./contract";
import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";

export function evaluateBlogContentQualityGate(draft: OrganicDraft): OrganicNamedGate {
  const text = `${draft.headings.join(" ")} ${draft.body}`;
  const reasons: string[] = [];
  if (draft.headings.length < 6) reasons.push("THIN");
  if (draft.word_count < 700 && !/example|checklist|limitation/i.test(text)) reasons.push("THIN");
  if (/comprehensive guide|unlock your potential|in conclusion/i.test(text)) reasons.push("GENERIC");
  if (!/owner|buyer|refinanc|stress|compare/i.test(text)) reasons.push("NON_ACTIONABLE");
  if ((text.match(/interest rates affect/gi) ?? []).length > 12) reasons.push("REPETITIVE");
  if (!draft.internal_links.length) reasons.push("LOW_VALUE");
  if (!draft.citations.length) reasons.push("LOW_VALUE");
  return named(BLOG_CONTENT_QUALITY_GATE, reasons);
}

export function evaluateBlogVisualAssetGate(input: {
  featured_image?: string;
  featured_alt?: string;
  supporting_visual?: boolean;
  broken?: boolean;
  generic_filler?: boolean;
  required?: boolean;
}): OrganicNamedGate {
  const reasons: string[] = [];
  const required = input.required !== false;
  if (required && !input.featured_image) reasons.push("featured_image_missing");
  if (input.featured_image && !input.featured_alt) reasons.push("alt_text_missing");
  if (input.broken) reasons.push("broken_image");
  if (input.generic_filler) reasons.push("generic_filler_image");
  if (required && input.supporting_visual === false) reasons.push("supporting_visual_missing");
  return named(BLOG_VISUAL_ASSET_GATE, reasons);
}

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons };
}
