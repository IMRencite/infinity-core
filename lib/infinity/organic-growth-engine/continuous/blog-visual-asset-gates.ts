import type { OrganicNamedGate } from "./types";
import type { VentureImageAssetRecord } from "./venture-image-creative-v2";

export const BLOG_VISUAL_ASSET_QC_GATE = "BlogVisualAssetQc" as const;
export const BLOG_HERO_VISUAL_QC_GATE = "BlogHeroVisualQc" as const;

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

export function evaluateBlogHeroShellGate(html: string): OrganicNamedGate {
  const reasons: string[] = [];
  if (!html.includes('data-blog-article-hero="true"')) reasons.push("HERO_ELEMENT_PRESENT");
  if (!html.includes('data-visual-role="FEATURED_EDITORIAL_IMAGE"')) reasons.push("HERO_MEDIA_ROLE");
  const imgMatch = html.match(/data-blog-article-hero[\s\S]*?<img\s[^>]*src="([^"]+)"[^>]*>/i);
  if (!imgMatch) reasons.push("HERO_IMG_TAG_MISSING");
  else {
    const src = imgMatch[1] ?? "";
    if (!src || src === "#" || src.includes("undefined")) reasons.push("HERO_ASSET_LOAD");
    if (/placeholder|missing|data:image\/gif/i.test(src)) reasons.push("HERO_PLACEHOLDER");
  }
  if (!/alt=/.test(html.match(/data-blog-article-hero[\s\S]*?<img[\s\S]*?>/i)?.[0] ?? "")) {
    reasons.push("HERO_ALT_TEXT");
  }
  if (!/width=\{?\d+|width="\d+"/.test(html.match(/data-blog-article-hero[\s\S]*?<img[\s\S]*?>/i)?.[0] ?? "")) {
    reasons.push("HERO_NONZERO_DIMENSIONS");
  }
  if (html.includes('data-hero-broken="true"') || html.includes("hero-hidden")) reasons.push("HERO_VISIBLE");
  return named(BLOG_HERO_VISUAL_QC_GATE, reasons);
}

export function evaluateBlogVisualAssetQc(input: {
  shell_html: string;
  featured_image_path: string;
  deploy_asset_paths: string[];
  image_record?: VentureImageAssetRecord;
}): OrganicNamedGate {
  const reasons: string[] = [];
  const hero = evaluateBlogHeroShellGate(input.shell_html);
  if (hero.result !== "PASS") reasons.push(...hero.reasons);
  if (!input.featured_image_path.startsWith("/")) reasons.push("hero_path_not_public");
  if (!input.deploy_asset_paths.includes(input.featured_image_path)) reasons.push("HERO_ASSET_MISSING_FROM_ARTIFACT");
  if (input.image_record && input.image_record.framework === "LEGACY_EDITORIAL_WORLD") {
    reasons.push("LEGACY_FRAMEWORK_HERO");
  }
  if (input.image_record?.brief?.must_not.some((rule) => /readable shirt text/i.test(rule))) {
    /* brief present — generation contract ok */
  }
  return named(BLOG_VISUAL_ASSET_QC_GATE, reasons);
}
