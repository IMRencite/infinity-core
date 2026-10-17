import {
  blogArticleMediaForPath,
  isPlaceholderBlogMediaSrc,
  listAuthorizedBacklogMediaBundles,
} from "./blog-article-media-registry";
import type { OrganicNamedGate } from "./types";

export const BLOG_PRODUCTION_MEDIA_DELIVERY_QC = "BlogProductionMediaDeliveryQc" as const;
export const BLOG_CANONICAL_MEDIA_FALLBACK_QC = "BlogCanonicalMediaFallbackQc" as const;
export const BLOG_PRODUCTION_RENDER_LAYOUT_QC = "BlogProductionRenderLayoutQc" as const;

export type ProductionMediaProbe = {
  url: string;
  http_status: number;
  content_type: string | null;
  content_length: number | null;
};

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

export function evaluateBlogCanonicalMediaFallbackQc(input: {
  article_path: string;
  rendered_src?: string | null;
  explicit_fallback_canonical?: boolean;
}): OrganicNamedGate {
  const reasons: string[] = [];
  const media = blogArticleMediaForPath(input.article_path);
  if (!media) return named(BLOG_CANONICAL_MEDIA_FALLBACK_QC, ["media_registry_missing"]);
  const expected = media.hero_image.src;
  const rendered = input.rendered_src?.trim() ?? "";
  if (input.explicit_fallback_canonical) return named(BLOG_CANONICAL_MEDIA_FALLBACK_QC, []);
  if (rendered && isPlaceholderBlogMediaSrc(rendered) && !isPlaceholderBlogMediaSrc(expected)) {
    reasons.push("canonical_expected_fallback_rendered");
  }
  if (rendered && expected && rendered !== expected && isPlaceholderBlogMediaSrc(rendered)) {
    reasons.push("unintended_fallback_path");
  }
  return named(BLOG_CANONICAL_MEDIA_FALLBACK_QC, reasons);
}

export function evaluateBlogProductionMediaDeliveryQc(input: {
  article_path: string;
  origin: string;
  probe: ProductionMediaProbe | null;
  rendered_src?: string | null;
}): OrganicNamedGate {
  const reasons: string[] = [];
  const media = blogArticleMediaForPath(input.article_path);
  if (!media) return named(BLOG_PRODUCTION_MEDIA_DELIVERY_QC, ["media_registry_missing"]);
  const expected = media.hero_image.src;
  if (input.rendered_src && input.rendered_src !== expected) reasons.push("html_src_mismatch");
  const fallback = evaluateBlogCanonicalMediaFallbackQc({
    article_path: input.article_path,
    rendered_src: input.rendered_src ?? expected,
  });
  if (fallback.result !== "PASS") reasons.push(...fallback.reasons);

  const probe = input.probe;
  if (!probe) {
    reasons.push("probe_missing");
  } else {
    if (probe.http_status !== 200) reasons.push(`http_${probe.http_status}`);
    const ct = probe.content_type ?? "";
    if (!/^image\//i.test(ct)) reasons.push("content_type_not_image");
    if (probe.content_length != null && probe.content_length <= 0) reasons.push("empty_body");
  }
  return named(BLOG_PRODUCTION_MEDIA_DELIVERY_QC, reasons);
}

/** Hero shell reserves photo height — fail when hero photo class present but no raster src in HTML. */
export function evaluateBlogProductionRenderLayoutQc(input: {
  html: string;
  page_kind: "article" | "roll";
}): OrganicNamedGate {
  const reasons: string[] = [];
  const html = input.html;
  if (input.page_kind === "article") {
    const photoHero = /pv-hero-photo|onpv-blog-article-hero/i.test(html);
    const heroImg = html.match(/onpv-blog-article-hero__media[\s\S]{0,800}<img[^>]+src="([^"]+)"/i)?.[1]
      ?? html.match(/pv-hero-media[\s\S]{0,400}<img[^>]+src="([^"]+)"/i)?.[1];
    if (photoHero && (!heroImg || isPlaceholderBlogMediaSrc(heroImg))) {
      reasons.push("hero_photo_shell_without_raster");
    }
    if (/onpv-blog-article-hero[\s\S]{0,1200}<img[^>]+src="[^"]+\.webp"/i.test(html) === false && photoHero) {
      reasons.push("article_hero_webp_missing");
    }
  }
  if (input.page_kind === "roll") {
    const cards = [...html.matchAll(/data-blog-(?:featured|latest|row)-card="true"[\s\S]{0,900}?<img[^>]+src="([^"]+)"/gi)];
    for (const match of cards) {
      if (isPlaceholderBlogMediaSrc(match[1] ?? "")) reasons.push("roll_card_placeholder_image");
    }
  }
  return named(BLOG_PRODUCTION_RENDER_LAYOUT_QC, reasons);
}

export function listAuthorizedBlogProductionMediaUrls(origin: string): Array<{ article_path: string; url: string }> {
  return listAuthorizedBacklogMediaBundles().map((bundle) => ({
    article_path: bundle.path,
    url: new URL(bundle.hero_image.src, origin.endsWith("/") ? origin : `${origin}/`).href,
  }));
}
