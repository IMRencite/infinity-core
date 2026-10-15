import type { OrganicNamedGate, OrganicQcResult } from "./types";

function dimPass(result: OrganicQcResult): "PASS" | "FAIL" {
  return result === "PASS" ? "PASS" : "FAIL";
}
import {
  blogArticleMediaForPath,
  isPlaceholderBlogMediaSrc,
  resolveMediaFileOnDisk,
  type BlogArticleMediaBundle,
} from "./blog-article-media-registry";
import { evaluateBlogHeroShellGate } from "./blog-visual-asset-gates";
import { evaluateImageAssetQualityGate } from "./image-asset-quality-gate";
import { evaluateArticleImageRelevanceQc, evaluateOccupancyImageDistinctnessVentureSet } from "./blog-image-relevance-and-distinctness-qc";
import { readOccupancyImageFingerprints } from "./occupancy-image-fingerprint-store";

export const BLOG_MEDIA_COMPLETENESS_QC = "BlogMediaCompletenessQc" as const;
export const BLOG_HERO_IMAGE_QC = "BlogHeroImageQc" as const;
export const BLOG_FEATURED_IMAGE_QC = "BlogFeaturedImageQc" as const;
export const BLOG_ROLL_IMAGE_QC = "BlogRollImageQc" as const;
export const BLOG_IMAGE_RENDER_QC = "BlogImageRenderQc" as const;
export const BLOG_IMAGE_ALT_QC = "BlogImageAltQc" as const;
export const BLOG_IMAGE_ORIGINALITY_QC = "BlogImageOriginalityQc" as const;
export const BLOG_IMAGE_RELEVANCE_QC = "BlogImageRelevanceQc" as const;

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

export function evaluateBlogImageAltQc(alt: string, title: string): OrganicNamedGate {
  const reasons: string[] = [];
  if (!alt?.trim()) reasons.push("alt_blank");
  if (/\.webp|\.png|blog image|placeholder/i.test(alt)) reasons.push("alt_filename_style");
  if (alt.trim().toLowerCase() === title.trim().toLowerCase()) reasons.push("alt_title_copy_only");
  if (alt.length < 16) reasons.push("alt_too_short");
  return named(BLOG_IMAGE_ALT_QC, reasons);
}

function runtimeOrchestratorWithoutLocalMedia(): boolean {
  return process.env.INFINITY_CLOUD_RUNTIME === "1" || process.env.VERCEL === "1";
}

export function evaluateBlogImageSrcQc(src: string, opts?: { require_raster?: boolean }): OrganicNamedGate {
  const reasons: string[] = [];
  if (!src?.trim()) reasons.push("src_empty");
  if (isPlaceholderBlogMediaSrc(src)) reasons.push("placeholder_or_svg_editorial");
  if (opts?.require_raster && /\.svg$/i.test(src)) reasons.push("raster_required");
  const disk = resolveMediaFileOnDisk(src);
  if (!disk.exists) {
    const cloudDefer =
      runtimeOrchestratorWithoutLocalMedia() && /^\/media\//.test(src) && !isPlaceholderBlogMediaSrc(src);
    if (!cloudDefer) reasons.push("asset_missing_on_disk");
  }
  return named(BLOG_FEATURED_IMAGE_QC, reasons);
}

export function evaluateBlogRollCardImageHtml(cardHtml: string, expectedSrc: string): OrganicNamedGate {
  const reasons: string[] = [];
  const img = cardHtml.match(/<img[^>]+>/i)?.[0] ?? "";
  if (!img) reasons.push("roll_img_missing");
  const src = img.match(/\ssrc=(?:"([^"]+)"|'([^']+)'|\{([^}]+)\})/i);
  const resolved = src?.[1] ?? src?.[2] ?? "";
  if (!resolved) reasons.push("roll_src_empty");
  if (resolved && expectedSrc && !resolved.includes(expectedSrc.replace(/^\//, ""))) {
    if (resolved !== expectedSrc) reasons.push("roll_wrong_image");
  }
  if (/alt=/.test(img) && !/<img[^>]+src=/i.test(img)) reasons.push("broken_img_state");
  return named(BLOG_ROLL_IMAGE_QC, reasons);
}

export function evaluateBlogImageRenderQc(input: {
  html: string;
  image_http?: number | null;
  alt_visible_as_text?: boolean;
}): OrganicNamedGate {
  const reasons: string[] = [];
  if (input.alt_visible_as_text) reasons.push("alt_visible_broken_image");
  if (input.image_http != null && input.image_http !== 200) reasons.push("image_http_not_200");
  if (/data-blog-(featured|latest|archive)-card[\s\S]{0,600}<img[^>]*alt=[^>]+>[\s\S]{0,120}(broken|alt text)/i.test(input.html)) {
    reasons.push("broken_card_pattern");
  }
  return named(BLOG_IMAGE_RENDER_QC, reasons);
}

export function evaluateBlogImageUniqueness(media: BlogArticleMediaBundle[]): OrganicNamedGate {
  const paths = media.map((m) => m.featured_image.src);
  const dupes = paths.filter((p, i) => paths.indexOf(p) !== i);
  return named(BLOG_IMAGE_ORIGINALITY_QC, dupes.length ? ["duplicate_featured_across_articles"] : []);
}

export function evaluateBlogMediaCompletenessQc(input: {
  article_path: string;
  shell_html?: string;
  venture_requires_hero?: boolean;
}): {
  gate: typeof BLOG_MEDIA_COMPLETENESS_QC;
  result: "PASS" | "FAIL";
  reasons: string[];
  dimensions: Record<string, "PASS" | "FAIL">;
  media: BlogArticleMediaBundle | null;
} {
  const reasons: string[] = [];
  const dimensions: Record<string, "PASS" | "FAIL"> = {};
  const media = blogArticleMediaForPath(input.article_path);
  if (!media) {
    return {
      gate: BLOG_MEDIA_COMPLETENESS_QC,
      result: "FAIL",
      reasons: ["MEDIA_REGISTRY_MISSING"],
      dimensions: { BLOG_HERO_IMAGE_QC: "FAIL" },
      media: null,
    };
  }

  const heroSrc = evaluateBlogImageSrcQc(media.hero_image.src, { require_raster: true });
  dimensions.BLOG_HERO_IMAGE_QC = dimPass(heroSrc.result);
  if (heroSrc.result !== "PASS") reasons.push(...heroSrc.reasons);

  const featuredSrc = evaluateBlogImageSrcQc(media.featured_image.src, { require_raster: true });
  dimensions.BLOG_FEATURED_IMAGE_QC = dimPass(featuredSrc.result);
  if (featuredSrc.result !== "PASS") reasons.push(...featuredSrc.reasons);

  const heroAlt = evaluateBlogImageAltQc(media.hero_image.alt, input.article_path);
  dimensions.BLOG_IMAGE_ALT_QC = dimPass(heroAlt.result);
  if (heroAlt.result !== "PASS") reasons.push(...heroAlt.reasons);

  if (media.image_record) {
    const quality = evaluateImageAssetQualityGate({
      record: media.image_record,
      svg_or_binary_present: resolveMediaFileOnDisk(media.hero_image.src).exists,
    });
    dimensions.IMAGE_ASSET_QUALITY_GATE = dimPass(quality.result);
    if (quality.result !== "PASS") reasons.push(...quality.reasons);
  }

  if (input.shell_html && input.venture_requires_hero !== false) {
    const heroShell = evaluateBlogHeroShellGate(input.shell_html);
    dimensions.BLOG_HERO_SHELL_QC = dimPass(heroShell.result);
    if (heroShell.result !== "PASS") reasons.push(...heroShell.reasons);
  }

  if (media.venture === "occupancynpv") {
    const relevance = evaluateArticleImageRelevanceQc({ slug: media.slug, src: media.hero_image.src });
    dimensions.BLOG_IMAGE_RELEVANCE_QC = dimPass(relevance.result);
    dimensions.ARTICLE_IMAGE_ASSOCIATION_QC = dimPass(relevance.result);
    if (relevance.result !== "PASS") reasons.push(...relevance.reasons);

    const fpArtifact = readOccupancyImageFingerprints();
    if (!fpArtifact?.fingerprints?.length) {
      dimensions.BLOG_IMAGE_DISTINCTNESS_QC = "FAIL";
      reasons.push("occupancy_fingerprints_missing");
    } else {
      const distinct = evaluateOccupancyImageDistinctnessVentureSet(fpArtifact.fingerprints);
      dimensions.BLOG_IMAGE_DISTINCTNESS_QC = dimPass(distinct.result);
      if (distinct.result !== "PASS") reasons.push(...distinct.reasons);
    }
  } else {
    dimensions.BLOG_IMAGE_RELEVANCE_QC = "PASS";
    dimensions.BLOG_IMAGE_DISTINCTNESS_QC = "PASS";
  }

  return {
    gate: BLOG_MEDIA_COMPLETENESS_QC,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
    dimensions,
    media,
  };
}
