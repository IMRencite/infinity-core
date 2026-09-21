import {
  BLOG_ACTIONABILITY_GATE,
  BLOG_CONTENT_QUALITY_GATE,
  BLOG_HUMAN_READABILITY_GATE,
  BLOG_INDEX_READINESS_GATE,
  BLOG_VALUE_FIRST_GATE,
  BLOG_VISUAL_ASSET_GATE,
} from "./contract";
import { evaluateBlogDepthCompletenessGate } from "./blog-ux";
import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import type { OccupancyNpvBlogPost } from "./occupancynpv-blog-catalog";

export type BlogEditorialClass =
  | "BLOG_COMPLETE"
  | "BLOG_NEEDS_EXPANSION"
  | "BLOG_THIN"
  | "BLOG_VISUAL_MISSING"
  | "BLOG_UX_INCOMPLETE"
  | "BLOG_NAVIGATION_INCOMPLETE"
  | "BLOG_TAXONOMY_INCOMPLETE"
  | "BLOG_DISCOVERY_INCOMPLETE"
  | "BLOG_CONTRAST_FAIL"
  | "BLOG_SPACING_FAIL";

export type BlogRemediationItem = {
  url: string;
  classification: BlogEditorialClass;
  priority: "HIGH" | "NORMAL" | "LOW";
  reasons: string[];
};

export function evaluateBlogValueFirstGate(draft: OrganicDraft): OrganicNamedGate {
  const text = `${draft.h1} ${draft.headings.join(" ")} ${draft.body} ${draft.direct_answer ?? ""}`;
  const reasons: string[] = [];
  if (!draft.direct_answer || draft.direct_answer.length < 80) reasons.push("no_meaningful_learning");
  if (!/can|should|watch|compare|stress|review|ask|checklist|step/i.test(text)) reasons.push("not_usable");
  if (!/example|sample|\$\s*\d|percent|noi|cap rate/i.test(text)) reasons.push("question_not_answered_deeply");
  if (!/related|next|also ask|compare|versus/i.test(text)) reasons.push("next_questions_missing");
  if (!/owner|buyer|seller|refinanc|investor|tenant/i.test(text)) reasons.push("implications_missing");
  if (!/tip|checklist|watch|review|stress-test|compare/i.test(text)) reasons.push("no_actionable_tips");
  if (!/example|sample|worked/i.test(text)) reasons.push("no_examples");
  if (!/mistake|error|confus/i.test(text)) reasons.push("mistakes_missing");
  if (!/limit|does not|not the same|tradeoff|not automatically/i.test(text)) reasons.push("tradeoffs_missing");
  if (reasons.length || /lorem ipsum|in today's fast-paced|as an ai/i.test(text)) reasons.push("not_worth_reading_without_google");
  return named(BLOG_VALUE_FIRST_GATE, [...new Set(reasons)]);
}

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

export function evaluateBlogActionabilityGate(draft: OrganicDraft): OrganicNamedGate {
  const text = `${draft.headings.join(" ")} ${draft.body}`;
  const hasAction =
    /what (owners|investors|buyers) can do|checklist|stress-test|review debt|compare cap-rate|watch for/i.test(text);
  return named(BLOG_ACTIONABILITY_GATE, hasAction ? [] : ["NON_ACTIONABLE"]);
}

export function evaluateBlogHumanReadabilityGate(draft: OrganicDraft): OrganicNamedGate {
  const reasons: string[] = [];
  if (draft.headings.length < 5) reasons.push("weak_sections");
  const longBlocks = draft.body.split(/\n{2,}/).filter((block) => block.split(/\s+/).length > 220);
  if (longBlocks.length > 2) reasons.push("wall_of_text");
  if (!/takeaway|key takeaway|faq/i.test(`${draft.headings.join(" ")} ${draft.body}`)) reasons.push("missing_summary");
  return named(BLOG_HUMAN_READABILITY_GATE, reasons);
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

export function evaluateBlogIndexReadinessGate(input: {
  published: OccupancyNpvBlogPost[];
  index_html: string;
}): OrganicNamedGate {
  const reasons: string[] = [];
  if (input.published.length > 0 && input.published.every((post) => !input.index_html.includes(post.title))) {
    reasons.push("published_posts_not_displayed");
  }
  for (const post of input.published) {
    if (!input.index_html.includes(post.path) && !input.index_html.includes(post.title)) reasons.push("post_unresolved");
    if (post.image && !input.index_html.includes(post.image)) reasons.push("image_unresolved");
    if (post.category && !input.index_html.includes(post.category)) reasons.push("taxonomy_missing");
  }
  if (!input.index_html.includes("data-blog-featured-card")) reasons.push("featured_missing");
  if (!input.index_html.includes("Latest Blogs") || !input.index_html.includes("data-blog-carousel")) reasons.push("latest_carousel_missing");
  if (!input.index_html.includes('data-carousel-controls="flanking"') || !input.index_html.includes('data-blog-carousel-control="arrow"')) {
    reasons.push("carousel_controls_unpolished");
  }
  if (/>Previous<\/button>|>Next<\/button>/.test(input.index_html)) reasons.push("default_browser_buttons");
  if (!input.index_html.includes("data-blog-sidebar") || !input.index_html.includes("data-blog-categories") || !input.index_html.includes("data-blog-tag-cloud")) {
    reasons.push("sidebar_missing");
  }
  if (input.index_html.includes("data-empty-taxonomy")) reasons.push("empty_taxonomy");
  if (!input.index_html.includes("data-blog-layout=\"editorial\"")) reasons.push("layout_unpolished");
  if (!input.index_html.includes("data-blog-hero")) reasons.push("hero_missing");
  if (!input.index_html.includes("data-carousel-contrast")) reasons.push("carousel_contrast_missing");
  if (!input.index_html.includes("data-blog-popular-resources")) reasons.push("popular_resources_missing");
  return named(BLOG_INDEX_READINESS_GATE, [...new Set(reasons)]);
}

export function classifyBlogEditorial(draft: OrganicDraft, visuals: { featured_image?: string; tags?: string[]; category?: string }): BlogEditorialClass {
  if (evaluateBlogValueFirstGate(draft).result === "FAIL" || evaluateBlogContentQualityGate(draft).result === "FAIL") {
    return draft.word_count < 400 ? "BLOG_THIN" : "BLOG_NEEDS_EXPANSION";
  }
  if (!visuals.featured_image) return "BLOG_VISUAL_MISSING";
  if (!visuals.category || !(visuals.tags ?? []).length) return "BLOG_TAXONOMY_INCOMPLETE";
  if (evaluateBlogActionabilityGate(draft).result !== "PASS" || evaluateBlogHumanReadabilityGate(draft).result !== "PASS") {
    return "BLOG_NEEDS_EXPANSION";
  }
  if (evaluateBlogDepthCompletenessGate(draft).result !== "PASS") return "BLOG_NEEDS_EXPANSION";
  return "BLOG_COMPLETE";
}

export function blogEditorialRemediationQueue(): BlogRemediationItem[] {
  return [
    {
      url: "/blog/valuation/how-interest-rates-affect-commercial-property-values/",
      classification: "BLOG_COMPLETE",
      priority: "HIGH",
      reasons: ["remediated_interest_rate_resource"],
    },
  ];
}

export function evaluateAllBlogQualityGates(draft: OrganicDraft, visuals: {
  featured_image?: string;
  featured_alt?: string;
  supporting_visual?: boolean;
}): OrganicNamedGate[] {
  return [
    evaluateBlogValueFirstGate(draft),
    evaluateBlogDepthCompletenessGate(draft),
    evaluateBlogContentQualityGate(draft),
    evaluateBlogActionabilityGate(draft),
    evaluateBlogHumanReadabilityGate(draft),
    evaluateBlogVisualAssetGate(visuals),
  ];
}

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons };
}
