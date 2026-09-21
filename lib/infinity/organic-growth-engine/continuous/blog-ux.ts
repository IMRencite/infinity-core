import {
  BLOG_ARTICLE_DISCOVERY_GATE,
  BLOG_ARTICLE_SIDEBAR_GATE,
  BLOG_CAROUSEL_CONTRAST_GATE,
  BLOG_CAROUSEL_CONTROL_QUALITY_GATE,
  BLOG_DEPTH_COMPLETENESS_GATE,
  BLOG_EDITORIAL_DESIGN_GATE,
  BLOG_FEATURED_CARD_QUALITY_GATE,
  BLOG_HERO_DESIGN_GATE,
  BLOG_LATEST_CAROUSEL_GATE,
  BLOG_SECTION_SPACING_GATE,
  BLOG_SEQUENTIAL_NAVIGATION_GATE,
  BLOG_SIDEBAR_UX_GATE,
  BLOG_HERO_CONTRAST_GATE,
  BLOG_TAXONOMY_CHIP_GATE,
  BLOG_TAXONOMY_CONTRAST_GATE,
  BLOG_RENDERED_VISUAL_QUALITY_GATE,
} from "./contract";
import { taxonomyChipHtml } from "./blog-taxonomy";
import {
  occupancynpvCategoryCounts,
  occupancynpvTagCloud,
  type OccupancyNpvBlogPost,
} from "./occupancynpv-blog-catalog";
import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import { qcResultFromEvidence } from "@/lib/infinity/qc-escape/contract";
import {
  evaluateInteractiveStateMatrix,
  interactionReadable,
  taxonomyChipSwatchesFromCss,
  visitedHoverCascadeConflict,
} from "@/lib/infinity/qc-escape/interaction-contrast";
import type { QcEvidenceRecord } from "@/lib/infinity/qc-escape/contract";
import { inspectSvgCreativeQuality } from "@/lib/infinity/qc-escape/creative-quality";

export type BlogQuestionRole = "PRIMARY" | "MUST_ANSWER" | "HIGH_VALUE_SECONDARY" | "SUPPORTING" | "SEPARATE_PAGE";

export type BlogClusterQuestion = {
  question: string;
  role: BlogQuestionRole;
  coverage_tokens: string[];
  dedicated_url?: string;
};

export type BlogQuestionClusterPlan = {
  primary_question: string;
  questions: BlogClusterQuestion[];
  secondary_questions: string[];
  must_answer_questions: string[];
  supporting_questions: string[];
  defer_to_dedicated_resource: Array<{ question: string; url: string }>;
  complexity: "NARROW" | "MODERATE" | "COMPLEX";
};

export type BlogContentQualityProfile = {
  topic_complexity: BlogQuestionClusterPlan["complexity"];
  depth_score: number;
  question_cluster_coverage: number;
  actionability_score: number;
  example_coverage: number;
  visual_support: number;
  entity_coverage: number;
  faq_coverage: number;
  internal_link_coverage: number;
  reader_value_score: number;
  must_answer_questions_total: number;
  must_answer_questions_covered: number;
  high_value_secondary_total: number;
  high_value_secondary_covered: number;
  scenario_count: number;
  worked_example_count: number;
  actionable_section_count: number;
  entity_coverage_score: number;
  decision_support_score: number;
};

export type SequentialNeighbor = {
  direction: "previous" | "next";
  path: string;
  title: string;
  image?: string;
};

export function classifyQuestionRole(role: BlogQuestionRole): BlogQuestionRole {
  return role;
}

export function buildBlogQuestionClusterPlan(input: {
  primary_question: string;
  topic?: string;
  voc?: string[];
  sales_objections?: string[];
  existing_urls?: string[];
  questions?: BlogClusterQuestion[];
}): BlogQuestionClusterPlan {
  const topic = input.topic ?? input.primary_question;
  const voc = input.voc ?? [];
  const complex = /interest rate|cap rate|valuation|refinanc|noi/i.test(`${input.primary_question} ${topic}`);
  const questions = input.questions ?? defaultClusterQuestions(input.primary_question, voc, input.sales_objections ?? []);
  return {
    primary_question: input.primary_question,
    questions,
    secondary_questions: questions.filter((row) => row.role === "HIGH_VALUE_SECONDARY").map((row) => row.question),
    must_answer_questions: questions.filter((row) => row.role === "PRIMARY" || row.role === "MUST_ANSWER").map((row) => row.question),
    supporting_questions: questions.filter((row) => row.role === "SUPPORTING").map((row) => row.question),
    defer_to_dedicated_resource: questions
      .filter((row) => row.role === "SEPARATE_PAGE" && row.dedicated_url)
      .map((row) => ({ question: row.question, url: row.dedicated_url! })),
    complexity: complex ? "COMPLEX" : "MODERATE",
  };
}

function defaultClusterQuestions(primary: string, voc: string[], objections: string[]): BlogClusterQuestion[] {
  return [
    { question: primary, role: "PRIMARY", coverage_tokens: ["required yield", "cap rate", "indicated value"] },
    { question: "Do higher rates cut every property by the same amount?", role: "MUST_ANSWER", coverage_tokens: ["not the same", "property type"] },
    { question: "How can NOI offset a higher required yield?", role: "MUST_ANSWER", coverage_tokens: ["noi", "offset"] },
    { question: "Why do rates influence cap rates?", role: "HIGH_VALUE_SECONDARY", coverage_tokens: ["cost of debt", "required return"] },
    { question: "What should owners stress-test now?", role: "HIGH_VALUE_SECONDARY", coverage_tokens: ["stress-test", "maturity"] },
    ...voc.slice(0, 2).map((question) => ({ question, role: "SUPPORTING" as const, coverage_tokens: question.toLowerCase().split(/\s+/).filter((word) => word.length > 5).slice(0, 2) })),
    ...objections.slice(0, 1).map((question) => ({ question, role: "SUPPORTING" as const, coverage_tokens: ["same way", "automatically"] })),
    { question: "How is cap rate calculated?", role: "SEPARATE_PAGE", coverage_tokens: ["cap rate calculated"], dedicated_url: "/commercial-lease-npv/how-is-cap-rate-calculated/" },
    { question: "What is NPV in a commercial lease?", role: "SEPARATE_PAGE", coverage_tokens: ["tenant", "npv"], dedicated_url: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/" },
  ];
}

export function occupancynpvInterestRateQuestionCluster(): BlogQuestionClusterPlan {
  return buildBlogQuestionClusterPlan({
    primary_question: "How do interest rates affect commercial property values?",
    topic: "interest rates cap rates valuation financing refinance",
    voc: [
      "What should owners watch when debt matures?",
      "Does property type change the value impact?",
      "How should buyers model changing rates?",
    ],
    sales_objections: ["Rates automatically cut every asset the same way"],
    existing_urls: [
      "/commercial-lease-npv/how-is-cap-rate-calculated/",
      "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/",
      "/compare-commercial-leases",
      "/discount-rate-sensitivity",
    ],
    questions: [
      {
        question: "How do interest rates affect commercial property values?",
        role: "PRIMARY",
        coverage_tokens: ["required yield", "same noi", "indicated value", "not a tenant"],
      },
      {
        question: "Which interest rates matter for commercial real estate?",
        role: "MUST_ANSWER",
        coverage_tokens: ["federal reserve", "treasury", "credit spread", "commercial mortgage"],
      },
      {
        question: "Why do cap rates not move one-for-one with Fed or Treasury rates?",
        role: "MUST_ANSWER",
        coverage_tokens: ["not 1:1", "credit spread", "liquidity", "property-specific"],
      },
      {
        question: "How do LTV, DSCR, and debt yield change when rates rise?",
        role: "MUST_ANSWER",
        coverage_tokens: ["ltv", "dscr", "debt yield", "debt service"],
      },
      {
        question: "Do higher interest rates always lower property values?",
        role: "MUST_ANSWER",
        coverage_tokens: ["not always", "noi growth", "not automatically"],
      },
      {
        question: "How should owners review a refinance when rates change?",
        role: "MUST_ANSWER",
        coverage_tokens: ["refinance", "maturity", "balloon", "coverage"],
      },
      {
        question: "How can NOI offset a higher required yield?",
        role: "HIGH_VALUE_SECONDARY",
        coverage_tokens: ["$135,000", "offset", "1,928,571"],
      },
      {
        question: "What happens to buyers, sellers, and owners when rates rise?",
        role: "HIGH_VALUE_SECONDARY",
        coverage_tokens: ["buyer pool", "hold vs sell", "equity requirement"],
      },
      {
        question: "Which commercial property types are most sensitive?",
        role: "HIGH_VALUE_SECONDARY",
        coverage_tokens: ["office", "industrial", "multifamily", "retail"],
      },
      {
        question: "How do interest-only and amortizing loans transmit rate risk?",
        role: "HIGH_VALUE_SECONDARY",
        coverage_tokens: ["interest-only", "amortiz", "floating-rate"],
      },
      {
        question: "What should owners review when rates change?",
        role: "HIGH_VALUE_SECONDARY",
        coverage_tokens: ["checklist", "debt maturity", "comparable"],
      },
      {
        question: "Can rents offset higher interest rates?",
        role: "SUPPORTING",
        coverage_tokens: ["rent", "offset"],
      },
      {
        question: "What happens when rates fall?",
        role: "SUPPORTING",
        coverage_tokens: ["rates fall", "bid-ask"],
      },
      {
        question: "How is cap rate calculated?",
        role: "SEPARATE_PAGE",
        coverage_tokens: ["cap rate calculated"],
        dedicated_url: "/commercial-lease-npv/how-is-cap-rate-calculated/",
      },
      {
        question: "What is NPV in a commercial lease?",
        role: "SEPARATE_PAGE",
        coverage_tokens: ["occupancy-cost", "tenant"],
        dedicated_url: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/",
      },
      {
        question: "How should two lease options be compared when the discount rate changes?",
        role: "SEPARATE_PAGE",
        coverage_tokens: ["compare", "discount-rate"],
        dedicated_url: "/compare-commercial-leases",
      },
    ],
  });
}

export function sequentialBlogNeighbors(
  posts: OccupancyNpvBlogPost[],
  currentPath: string,
): { previous: SequentialNeighbor | null; next: SequentialNeighbor | null } {
  const published = [...posts]
    .filter((post) => !(post as OccupancyNpvBlogPost & { draft?: boolean }).draft)
    .sort((left, right) => left.published.localeCompare(right.published) || left.path.localeCompare(right.path));
  const index = published.findIndex((post) => post.path === currentPath);
  if (index < 0) return { previous: null, next: null };
  const previous = published[index - 1];
  const next = published[index + 1];
  return {
    previous: previous
      ? { direction: "previous", path: previous.path, title: previous.title, image: previous.image }
      : null,
    next: next ? { direction: "next", path: next.path, title: next.title, image: next.image } : null,
  };
}

export function latestBlogPosts(posts: OccupancyNpvBlogPost[], featuredPath?: string): OccupancyNpvBlogPost[] {
  const sorted = [...posts]
    .filter((post) => !post.draft)
    .sort((left, right) => right.published.localeCompare(left.published) || left.path.localeCompare(right.path));
  if (sorted.length <= 1) return sorted;
  return featuredPath ? sorted.filter((post) => post.path !== featuredPath) : sorted;
}

export function articleDiscoveryPosts(posts: OccupancyNpvBlogPost[], currentPath: string): OccupancyNpvBlogPost[] {
  return latestBlogPosts(posts.filter((post) => !post.draft && post.path !== currentPath));
}

export function carouselVisibleColumns(width: number): 1 | 2 | 3 {
  if (width <= 768) return 1;
  if (width <= 1024) return 2;
  return 3;
}

export function latestBlogCardHtml(post: OccupancyNpvBlogPost): string {
  const category = post.primaryCategory ?? post.category;
  return `<article className="onpv-blog-latest-card" data-blog-card="true" data-blog-latest-card="true" data-category=${JSON.stringify(category)}>
                <a href="${post.path}">
                  <img src="${post.image}" alt=${JSON.stringify(post.image_alt)} width={480} height={270} loading="lazy" />
                  <p className="pv-eyebrow">${taxonomyChipHtml("category", category)}</p>
                  <h3>${post.title}</h3>
                </a>
                <p>${post.excerpt}</p>
                <p><time dateTime="${post.published}">${post.published}</time>${post.reading_time ? ` · ${post.reading_time}` : ""}</p>
                <p>${post.tags.slice(0, 2).map((tag) => taxonomyChipHtml("tag", tag)).join(" ")}</p>
                <a href="${post.path}">Read more</a>
              </article>`;
}

export function renderBlogSidebarHtml(posts: OccupancyNpvBlogPost[]): string {
  const published = posts.filter((post) => !post.draft);
  const categories = occupancynpvCategoryCounts(published);
  const cloud = occupancynpvTagCloud(published);
  return `<aside className="onpv-blog-sidebar" data-blog-sidebar="true" data-blog-sidebar-shared="BlogSidebar">
              <nav className="onpv-blog-sidebar__panel" aria-label="Categories" data-blog-categories="true">
                <h2>Categories</h2>
                <ul>${categories.map((row) => `<li className="onpv-blog-cat" data-blog-category=${JSON.stringify(row.category)}>${taxonomyChipHtml("category", row.category)}<span>${row.count}</span></li>`).join("")}</ul>
              </nav>
              <nav className="onpv-blog-sidebar__panel" aria-label="Topics" data-blog-tag-cloud="true">
                <h2>Topic cloud</h2>
                <div className="onpv-blog-cloud">${cloud.map((row) => `<span data-count="${row.count}">${taxonomyChipHtml("tag", row.tag)}</span>`).join("")}</div>
              </nav>
              <section className="onpv-blog-sidebar__panel" aria-label="Resources" data-blog-popular-resources="true">
                <h2>Popular resources</h2>
                <p><a href="/commercial-lease-npv/how-is-cap-rate-calculated/">How is cap rate calculated?</a></p>
                <p><a href="/compare-commercial-leases">Compare commercial leases</a></p>
                <p><a href="/resources">Resource library</a></p>
              </section>
            </aside>`;
}

export function renderBlogHeroHtml(input: {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  image_alt: string;
}): string {
  return `<header className="onpv-blog-hero" data-blog-hero="true" data-blog-hero-treatment="editorial-panel" data-section-type="HERO">
          <div className="vg-container onpv-blog-hero__grid">
            <div className="onpv-blog-hero__copy">
              <p className="pv-eyebrow">${input.eyebrow}</p>
              <h1 className="pv-display">${input.title}</h1>
              <p>${input.description}</p>
            </div>
            <figure className="onpv-blog-hero__visual" data-blog-hero-visual="true">
              <img src="${input.image}" alt=${JSON.stringify(input.image_alt)} width={720} height={480} />
            </figure>
          </div>
        </header>`;
}

export function renderLatestBlogsCarouselHtml(input: {
  posts: OccupancyNpvBlogPost[];
  excludePath?: string;
  hideWhenNoDiscovery?: boolean;
  surface?: "index" | "article";
}): string {
  const published = input.posts.filter((post) => !post.draft);
  const cards = input.hideWhenNoDiscovery && input.excludePath
    ? articleDiscoveryPosts(published, input.excludePath)
    : latestBlogPosts(published, published.length > 1 ? input.excludePath : undefined);
  const surface = input.surface ?? (input.hideWhenNoDiscovery ? "article" : "index");
  if (input.hideWhenNoDiscovery && cards.length === 0) {
    return `<section data-blog-article-discovery="true" data-blog-discovery-empty="true" data-blog-carousel-shared="LatestBlogsCarousel" hidden>
                <h2 className="onpv-blog-section-heading" data-blog-section-heading="true">Latest Blogs</h2>
              </section>`;
  }
  const discoveryAttr = surface === "article" ? ` data-blog-article-discovery="true"` : "";
  return `<section data-blog-latest="true" data-blog-roll="true" data-blog-carousel="true" data-blog-carousel-shared="LatestBlogsCarousel" data-carousel-desktop="3" data-carousel-tablet="2" data-carousel-mobile="1" data-carousel-loop="false" data-blog-carousel-top-gap="token" data-carousel-contrast="high"${discoveryAttr}>
                <h2 className="onpv-blog-section-heading" data-blog-section-heading="true">Latest Blogs</h2>
                <div className="onpv-blog-carousel" data-blog-carousel-track="true" data-carousel-controls="flanking" role="region" aria-label="Latest blogs" aria-roledescription="carousel">
                  <button type="button" className="onpv-blog-carousel__arrow" data-blog-carousel-prev="true" data-blog-carousel-control="arrow" data-carousel-contrast="high" aria-label="Previous blogs">
                    <span aria-hidden="true">←</span>
                  </button>
                  <div className="onpv-blog-carousel__scroller" data-blog-carousel-scroller="true" tabIndex={0}>
                    ${cards.map(latestBlogCardHtml).join("\n                    ") || "<p>No published posts yet.</p>"}
                  </div>
                  <button type="button" className="onpv-blog-carousel__arrow" data-blog-carousel-next="true" data-blog-carousel-control="arrow" data-carousel-contrast="high" aria-label="Next blogs">
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </section>`;
}

export const LATEST_BLOGS_CAROUSEL_SCRIPT = `(()=>{document.querySelectorAll("[data-blog-carousel-track]").forEach((root)=>{const s=root.querySelector("[data-blog-carousel-scroller]");const prev=root.querySelector("[data-blog-carousel-prev]");const next=root.querySelector("[data-blog-carousel-next]");if(!s||!prev||!next)return;const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;const sync=()=>{const max=Math.max(0,s.scrollWidth-s.clientWidth-2);prev.disabled=s.scrollLeft<=2;next.disabled=s.scrollLeft>=max;prev.setAttribute("aria-disabled",String(prev.disabled));next.setAttribute("aria-disabled",String(next.disabled));};const move=(d)=>{s.scrollBy({left:d*s.clientWidth*0.9,behavior:reduced?"auto":"smooth"});};prev.addEventListener("click",()=>move(-1));next.addEventListener("click",()=>move(1));s.addEventListener("scroll",sync,{passive:true});window.addEventListener("resize",sync);sync();});})();`;

export function evaluateBlogFeaturedCardQualityGate(html: string): OrganicNamedGate {
  const reasons: string[] = [];
  if (!html.includes("data-blog-featured-card")) reasons.push("featured_card_missing");
  if (!/data-featured-image-size="editorial"/.test(html)) reasons.push("featured_image_too_hero");
  if (!html.includes("data-blog-featured-cta")) reasons.push("cta_missing");
  if (!html.includes("pv-eyebrow") && !html.includes("data-blog-featured-eyebrow")) reasons.push("hierarchy_weak");
  if (/width=\{1200\}|width="1200"|width={1600}/.test(html) && /data-blog-featured-card[\s\S]{0,400}img/.test(html)) {
    reasons.push("featured_image_too_large");
  }
  if (!/Read [Aa]rticle|Read more/.test(html)) reasons.push("cta_unclear");
  return named(BLOG_FEATURED_CARD_QUALITY_GATE, reasons);
}

export function evaluateBlogLatestCarouselGate(input: {
  html: string;
  published: OccupancyNpvBlogPost[];
  featured_path?: string;
  viewport?: number;
}): OrganicNamedGate {
  const reasons: string[] = [];
  if (!input.html.includes("Latest Blogs")) reasons.push("latest_blogs_label_missing");
  if (!input.html.includes("data-blog-carousel")) reasons.push("carousel_missing");
  if (!/overflow-x:\s*auto|scroll-snap-type/.test(input.html) && !input.html.includes("onpv-blog-carousel__scroller")) {
    reasons.push("scroll_missing");
  }
  if (!input.html.includes("aria-label")) reasons.push("keyboard_inaccessible");
  const latest = latestBlogPosts(input.published, input.published.length > 1 ? input.featured_path : undefined);
  for (const post of latest) {
    if (!input.html.includes(post.title) && !input.html.includes(post.path)) reasons.push("card_unresolved");
  }
  if (input.published.length >= 3 && input.html.includes("data-fake-card")) reasons.push("fake_cards");
  const viewport = input.viewport ?? 1440;
  const expected = carouselVisibleColumns(viewport);
  if (!input.html.includes(`data-carousel-desktop="3"`) || !input.html.includes(`data-carousel-tablet="2"`) || !input.html.includes(`data-carousel-mobile="1"`)) {
    reasons.push("responsive_columns_missing");
  }
  if (viewport >= 1280 && expected !== 3) reasons.push("desktop_columns");
  return named(BLOG_LATEST_CAROUSEL_GATE, [...new Set(reasons)]);
}

export function evaluateBlogCarouselControlQualityGate(html: string): OrganicNamedGate {
  const surface = `${html}\n${OCCUPANCYNPV_BLOG_EDITORIAL_CSS}`;
  const reasons: string[] = [];
  if (!html.includes('data-blog-carousel-control="arrow"')) reasons.push("arrow_controls_missing");
  if (!html.includes('data-carousel-controls="flanking"')) reasons.push("controls_not_flanking");
  if (!html.includes("onpv-blog-carousel__arrow")) reasons.push("unstyled_controls");
  if (!html.includes('aria-label="Previous blogs"') || !html.includes('aria-label="Next blogs"')) reasons.push("aria_labels_missing");
  if (/>Previous<\/button>|>Next<\/button>/.test(html)) reasons.push("default_browser_buttons");
  if (!surface.includes("align-items:center") && !surface.includes("align-items: center")) reasons.push("controls_not_vertically_centered");
  if (!surface.includes(".onpv-blog-carousel__arrow:hover") && !surface.includes("onpv-blog-carousel__arrow:hover")) reasons.push("hover_missing");
  if (!surface.includes(":focus-visible") && !surface.includes("focus-visible")) reasons.push("focus_missing");
  if (!surface.includes(":disabled") && !surface.includes("[disabled]")) reasons.push("disabled_state_missing");
  if (!html.includes("data-carousel-loop=\"false\"")) reasons.push("infinite_loop_undocumented");
  if (!surface.includes("touch-action:pan-x") && !surface.includes("touch-action: pan-x")) reasons.push("touch_scroll_missing");
  if (html.includes("overflow-x:hidden") && html.includes("onpv-blog-layout")) reasons.push("page_overflow_risk");
  if (evaluateBlogCarouselContrastGate(html).result === "FAIL") reasons.push("low_contrast_controls");
  return named(BLOG_CAROUSEL_CONTROL_QUALITY_GATE, reasons);
}

export function evaluateBlogHeroDesignGate(html: string): OrganicNamedGate {
  const surface = `${html}\n${OCCUPANCYNPV_BLOG_EDITORIAL_CSS}`;
  const reasons: string[] = [];
  if (!html.includes("data-blog-hero")) reasons.push("hero_missing");
  if (!html.includes('data-blog-hero-treatment="editorial-panel"')) reasons.push("hero_treatment_missing");
  if (!html.includes("data-blog-hero-visual") && !/onpv-blog-hero__visual/.test(html)) reasons.push("hero_visually_empty");
  if (!html.includes("pv-display") && !html.includes("<h1")) reasons.push("title_hierarchy_weak");
  if (!html.includes("pv-eyebrow")) reasons.push("eyebrow_missing");
  if (!surface.includes("--blog-hero-tint") && !surface.includes("onpv-blog-hero{")) reasons.push("branded_styling_missing");
  if (/data-blog-hero[\s\S]{0,80}<h1[\s\S]{0,120}<\/h1>\s*<\/header>/.test(html)) reasons.push("plain_text_hero");
  return named(BLOG_HERO_DESIGN_GATE, reasons);
}

export function evaluateBlogSectionSpacingGate(html: string): OrganicNamedGate {
  const surface = `${html}\n${OCCUPANCYNPV_BLOG_EDITORIAL_CSS}`;
  const reasons: string[] = [];
  if (!surface.includes("--blog-section-heading-gap") || !surface.includes("--blog-carousel-top-gap") || !surface.includes("--blog-section-block-gap")) {
    reasons.push("spacing_tokens_missing");
  }
  if (!html.includes("data-blog-carousel-top-gap") && !html.includes("data-blog-section-heading")) reasons.push("heading_gap_unmarked");
  const gap = surface.match(/--blog-carousel-top-gap:\s*([\d.]+)rem/);
  if (gap && Number(gap[1]) < 1.15) reasons.push("carousel_heading_crowded");
  if (!surface.includes(".onpv-blog-section-heading") && !surface.includes("onpv-blog-section-heading")) reasons.push("heading_spacing_rule_missing");
  return named(BLOG_SECTION_SPACING_GATE, reasons);
}

export function evaluateBlogCarouselContrastGate(html: string): OrganicNamedGate {
  const surface = `${html}\n${OCCUPANCYNPV_BLOG_EDITORIAL_CSS}`;
  const reasons: string[] = [];
  if (!html.includes('data-carousel-contrast="high"')) reasons.push("contrast_contract_missing");
  const bg = surface.match(/--blog-arrow-bg:\s*(#[0-9a-fA-F]{6})/);
  const fg = surface.match(/--blog-arrow-fg:\s*(#[0-9a-fA-F]{6})/);
  if (!bg || !fg) reasons.push("contrast_tokens_missing");
  else if (contrastRatio(bg[1]!, fg[1]!) < 7) reasons.push("arrow_contrast_below_wcag_aaa");
  if (/onpv-blog-carousel__arrow\{[^}]*background:#fff/.test(surface.replace(/\s+/g, ""))) reasons.push("arrows_blend_into_background");
  if (!surface.includes(".onpv-blog-carousel__arrow:hover") || !surface.includes(":focus-visible")) reasons.push("hover_focus_contrast_missing");
  if (!surface.includes(":disabled")) reasons.push("disabled_clarity_missing");
  return named(BLOG_CAROUSEL_CONTRAST_GATE, reasons);
}

export function evaluateBlogArticleSidebarGate(html: string): OrganicNamedGate {
  const reasons: string[] = [];
  if (!html.includes("data-blog-sidebar") || !html.includes('data-blog-sidebar-shared="BlogSidebar"')) reasons.push("shared_sidebar_missing");
  if (!html.includes("data-blog-article-sidebar") && !html.includes('data-blog-article-layout="true"')) reasons.push("article_sidebar_layout_missing");
  if (!html.includes("data-blog-categories")) reasons.push("categories_missing");
  if (!html.includes("data-blog-tag-cloud")) reasons.push("topic_cloud_missing");
  if (!html.includes("data-blog-popular-resources")) reasons.push("popular_resources_missing");
  if (html.includes("data-empty-taxonomy")) reasons.push("empty_taxonomy");
  return named(BLOG_ARTICLE_SIDEBAR_GATE, reasons);
}

function contrastRatio(left: string, right: string): number {
  const lum = (hex: string) => {
    const value = hex.replace("#", "");
    const channel = (start: number) => {
      const raw = Number.parseInt(value.slice(start, start + 2), 16) / 255;
      return raw <= 0.03928 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  };
  const a = lum(left);
  const b = lum(right);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export function evaluateBlogArticleDiscoveryGate(input: {
  article_html: string;
  published: OccupancyNpvBlogPost[];
  current_path: string;
}): OrganicNamedGate {
  const reasons: string[] = [];
  if (!input.article_html.includes("data-blog-article-discovery")) reasons.push("article_discovery_missing");
  if (!input.article_html.includes('data-blog-carousel-shared="LatestBlogsCarousel"')) reasons.push("shared_carousel_missing");
  const others = articleDiscoveryPosts(input.published, input.current_path);
  if (others.length === 0) {
    if (!input.article_html.includes("data-blog-discovery-empty") && input.article_html.includes("data-blog-latest-card")) {
      reasons.push("filler_or_duplicate_current");
    }
  } else {
    if (!input.article_html.includes("data-blog-carousel")) reasons.push("article_carousel_missing");
    if (input.article_html.includes(`href="${input.current_path}"`) && /data-blog-latest-card[\s\S]{0,200}href="/.test(input.article_html)) {
      const latestBlock = input.article_html.match(/data-blog-article-discovery[\s\S]*data-blog-sequential-nav|data-blog-article-discovery[\s\S]*<\/section>/);
      if (latestBlock?.[0]?.includes(input.current_path) && latestBlock[0].includes("data-blog-latest-card")) {
        reasons.push("current_article_not_excluded");
      }
    }
    for (const post of others) {
      if (!input.article_html.includes(post.path) && !input.article_html.includes(post.title)) reasons.push("discovery_unresolved");
    }
  }
  if (input.article_html.includes("data-fake-card")) reasons.push("fake_cards");
  if (!input.article_html.includes("data-blog-sequential-nav")) reasons.push("sequential_nav_merged_or_missing");
  const fullArticle = input.article_html.includes("data-blog-article-layout") || input.article_html.includes("data-blog-article-sidebar");
  if (fullArticle) {
    if (!input.article_html.includes("data-blog-sidebar") || !input.article_html.includes('data-blog-sidebar-shared="BlogSidebar"')) {
      reasons.push("sidebar_missing");
    }
    if (!input.article_html.includes("RELATED_CONTENT") && !/Related resources/i.test(input.article_html)) {
      reasons.push("related_resources_missing");
    }
  }
  if (input.article_html.includes("data-blog-category") && !input.article_html.includes("/blog/category/")) {
    reasons.push("category_links_not_archives");
  }
  if (input.article_html.includes("data-blog-tag") && !input.article_html.includes("/blog/tag/")) {
    reasons.push("tag_links_not_archives");
  }
  if (others.length > 0 && !input.article_html.includes('aria-label="Previous blogs"')) reasons.push("accessibility_missing");
  return named(BLOG_ARTICLE_DISCOVERY_GATE, [...new Set(reasons)]);
}

export function evaluateBlogSidebarUXGate(html: string): OrganicNamedGate {
  const reasons: string[] = [];
  if (!html.includes("data-blog-sidebar")) reasons.push("sidebar_missing");
  if (!html.includes("data-blog-categories")) reasons.push("categories_missing");
  if (!html.includes("data-blog-tag-cloud")) reasons.push("tag_cloud_missing");
  if (!html.includes("onpv-blog-layout") && !html.includes("data-blog-layout=\"editorial\"")) reasons.push("layout_unpolished");
  if (html.includes("data-empty-taxonomy")) reasons.push("empty_taxonomy");
  return named(BLOG_SIDEBAR_UX_GATE, reasons);
}

export function evaluateBlogSequentialNavigationGate(input: {
  html: string;
  neighbors: { previous: SequentialNeighbor | null; next: SequentialNeighbor | null };
  drafts?: OccupancyNpvBlogPost[];
}): OrganicNamedGate {
  const reasons: string[] = [];
  if (!input.html.includes("data-blog-sequential-nav")) reasons.push("nav_component_missing");
  if (input.neighbors.previous) {
    if (!input.html.includes(input.neighbors.previous.path) || !input.html.includes(input.neighbors.previous.title)) {
      reasons.push("previous_unresolved");
    }
  } else if (input.html.includes("data-blog-seq-previous")) {
    reasons.push("dead_previous");
  }
  if (input.neighbors.next) {
    if (!input.html.includes(input.neighbors.next.path) || !input.html.includes(input.neighbors.next.title)) {
      reasons.push("next_unresolved");
    }
  } else if (input.html.includes("data-blog-seq-next")) {
    reasons.push("dead_next");
  }
  for (const draft of input.drafts ?? []) {
    if (input.html.includes(draft.path)) reasons.push("draft_included");
  }
  return named(BLOG_SEQUENTIAL_NAVIGATION_GATE, [...new Set(reasons)]);
}

export function evaluateBlogEditorialDesignGate(html: string): OrganicNamedGate {
  const reasons: string[] = [];
  if (html.includes("data-blog-featured-card") && evaluateBlogFeaturedCardQualityGate(html).result === "FAIL") {
    reasons.push("featured_hierarchy");
  }
  if (!html.includes("data-blog-latest-card") && !html.includes("data-blog-carousel") && !html.includes("data-blog-discovery-empty")) {
    reasons.push("latest_undifferentiated");
  }
  if (!html.includes("data-blog-sidebar") && html.includes("data-blog-layout=\"editorial\"")) reasons.push("sidebar_presentation");
  if (html.includes("Latest notes") || html.includes("Latest Notes")) reasons.push("stale_latest_label");
  if (html.includes("data-blog-layout") && !html.includes("data-blog-layout=\"editorial\"")) reasons.push("layout_contract_missing");
  if (html.includes("data-blog-carousel") && evaluateBlogCarouselControlQualityGate(html).result === "FAIL") {
    reasons.push("carousel_controls_unpolished");
  }
  if (/>Previous<\/button>|>Next<\/button>/.test(html)) reasons.push("browser_default_buttons");
  if (html.includes("data-blog-carousel") && !html.includes('data-carousel-controls="flanking"')) reasons.push("awkward_control_placement");
  if (html.includes("data-blog-featured-card") && html.includes("data-blog-latest-card") && html.includes('className="onpv-blog-featured"') === false) {
    reasons.push("duplicate_looking_cards");
  }
  if (html.includes("data-section-type=\"HERO\"") && evaluateBlogHeroDesignGate(html).result === "FAIL" && html.includes("OccupancyNPV blog")) {
    reasons.push("basic_plain_hero");
  }
  if (html.includes("data-blog-carousel") && evaluateBlogCarouselContrastGate(html).result === "FAIL") reasons.push("low_contrast_arrows");
  if (html.includes("Latest Blogs") && evaluateBlogSectionSpacingGate(html).result === "FAIL") reasons.push("crowded_section_spacing");
  if (html.includes("data-blog-article-layout") && evaluateBlogArticleSidebarGate(html).result === "FAIL") reasons.push("article_sidebar_weak");
  if (html.includes("data-blog-taxonomy-link") && !html.includes("data-blog-taxonomy-chip")) reasons.push("TAXONOMY_PRESENTATION_FAIL");
  if (html.includes("pv-hero-photo") && html.includes("data-blog-taxonomy-link") && !html.includes('data-blog-taxonomy-surface="hero"')) {
    reasons.push("HERO_READABILITY_FAIL");
  }
  if (html.includes("data-blog-taxonomy-link") && !/onpv-taxonomy-chip/.test(html)) reasons.push("plain taxonomy links");
  return named(BLOG_EDITORIAL_DESIGN_GATE, reasons);
}

export function evaluateBlogHeroContrastGate(html: string): OrganicNamedGate {
  const reasons: string[] = [];
  if (html.includes("pv-hero-photo")) {
    if (!html.includes("data-blog-taxonomy-chip")) reasons.push("HERO_READABILITY_FAIL");
    if (!html.includes('data-blog-taxonomy-surface="hero"')) reasons.push("TAXONOMY_CONTRAST_FAIL");
    const surface = `${html}\n${OCCUPANCYNPV_BLOG_EDITORIAL_CSS}`;
    if (!surface.includes(".pv-hero-photo .onpv-taxonomy-chip") && !surface.includes(".pv-hero-photo .onpv-taxonomy-chip")) {
      reasons.push("VISUAL_CONTRAST_FAIL");
    }
  }
  return named(BLOG_HERO_CONTRAST_GATE, reasons);
}

export function evaluateBlogTaxonomyChipGate(html: string): OrganicNamedGate {
  const reasons: string[] = [];
  if (!html.includes("data-blog-taxonomy-chip")) reasons.push("shared_chip_missing");
  if (!html.includes("onpv-taxonomy-chip")) reasons.push("pill_class_missing");
  if (!html.includes("data-blog-taxonomy-link")) reasons.push("navigation_missing");
  if (!OCCUPANCYNPV_BLOG_EDITORIAL_CSS.includes(".onpv-taxonomy-chip{")) reasons.push("padding_missing");
  if (!OCCUPANCYNPV_BLOG_EDITORIAL_CSS.includes(".onpv-taxonomy-chip:hover")) reasons.push("hover_missing");
  if (!OCCUPANCYNPV_BLOG_EDITORIAL_CSS.includes(".onpv-taxonomy-chip:focus-visible")) reasons.push("focus_missing");
  if (!OCCUPANCYNPV_BLOG_EDITORIAL_CSS.includes("flex-wrap:wrap")) reasons.push("wrapping_missing");
  if (visitedHoverCascadeConflict(OCCUPANCYNPV_BLOG_EDITORIAL_CSS)) reasons.push("VISITED_HOVER_CASCADE_CONFLICT");
  if (!OCCUPANCYNPV_BLOG_EDITORIAL_CSS.includes(":hover:visited") && !OCCUPANCYNPV_BLOG_EDITORIAL_CSS.includes(":visited:hover")) {
    reasons.push("HOVER_VISITED_RULE_MISSING");
  }
  const hovers = taxonomyChipSwatchesFromCss(OCCUPANCYNPV_BLOG_EDITORIAL_CSS).filter((row) => row.state === "HOVER");
  if (hovers.some((hover) => !interactionReadable(hover))) reasons.push("HOVER_INK_UNREADABLE");
  return named(BLOG_TAXONOMY_CHIP_GATE, reasons);
}

export function evaluateBlogTaxonomyContrastGate(
  html: string,
  evidence?: QcEvidenceRecord,
): OrganicNamedGate {
  const reasons: string[] = [];
  const surface = `${html}\n${OCCUPANCYNPV_BLOG_EDITORIAL_CSS}`;
  if (!surface.includes(".onpv-taxonomy-chip{")) reasons.push("REST_MISSING");
  if (!surface.includes(".onpv-taxonomy-chip:hover")) reasons.push("HOVER_MISSING");
  if (!surface.includes(".onpv-taxonomy-chip:focus-visible")) reasons.push("FOCUS_MISSING");
  if (html.includes("pv-hero-photo") && !surface.includes(".pv-hero-photo .onpv-taxonomy-chip")) reasons.push("PHOTO_HERO_CONTRAST_MISSING");
  if (visitedHoverCascadeConflict(OCCUPANCYNPV_BLOG_EDITORIAL_CSS)) reasons.push("VISITED_HOVER_CASCADE_CONFLICT");
  const matrix = evaluateInteractiveStateMatrix({
    swatches: taxonomyChipSwatchesFromCss(OCCUPANCYNPV_BLOG_EDITORIAL_CSS),
    evidence,
    requiredStates: ["REST", "HOVER", "FOCUS"],
  });
  reasons.push(...matrix.reasons.filter((row) => row.startsWith("UNREADABLE_")));
  const failed = reasons.length > 0;
  const requiredEvidencePresent = Boolean(
    evidence?.rest_rendered
    && evidence.hover_rendered
    && evidence.focus_rendered
    && evidence.computed_contrast_checked
    && evidence.screenshot_captured,
  );
  return {
    gate: BLOG_TAXONOMY_CONTRAST_GATE,
    result: qcResultFromEvidence({ failed, requiredEvidencePresent }),
    reasons: failed
      ? reasons
      : requiredEvidencePresent
        ? ["REST_HOVER_FOCUS_CONTRAST"]
        : ["HOVER_CONTRAST_NOT_PROVEN"],
  };
}

export function classifyRenderedContrastRisk(surface: "light" | "dark" | "photo"): "LOW" | "MODERATE" | "HIGH" {
  if (surface === "photo") return "HIGH";
  if (surface === "dark") return "MODERATE";
  return "LOW";
}

export function evaluateBlogRenderedVisualQualityGate(input: {
  surfaces: string[];
  widths: number[];
  visibleDefect?: boolean;
  restRendered?: boolean;
  hoverRendered?: boolean;
  focusRendered?: boolean;
  screenshotCaptured?: boolean;
  svgContents?: string[];
  heroObjectFit?: string;
}): OrganicNamedGate {
  const required = ["/blog/", "/blog/article/", "/blog/category/", "/blog/tag/"];
  const reasons: string[] = [];
  for (const surface of required) {
    if (!input.surfaces.some((row) => row.includes(surface.replace("/article/", "/")) || row.includes("blog"))) {
      reasons.push(`SURFACE_MISSING:${surface}`);
    }
  }
  for (const width of [1440, 1280, 1024, 768, 390]) {
    if (!input.widths.includes(width)) reasons.push(`WIDTH_MISSING:${width}`);
  }
  if (input.visibleDefect) reasons.push("VISIBLE_DEFECT");
  const archiveNeeded = input.surfaces.some((row) => row.includes("/tag/") || row.includes("/category/"));
  if (archiveNeeded && (!input.svgContents || input.svgContents.length === 0)) {
    reasons.push("ARCHIVE_CREATIVE_NOT_INSPECTED");
  }
  for (const svg of input.svgContents ?? []) {
    reasons.push(...inspectSvgCreativeQuality(svg).reasons);
  }
  const heroFit = input.heroObjectFit ?? (
    /onpv-blog-hero__visual img\{[^}]*object-fit:contain/.test(OCCUPANCYNPV_BLOG_EDITORIAL_CSS) ? "contain" : "cover"
  );
  if (heroFit === "cover") reasons.push("HERO_COVER_CROP_RISK");
  if (/onpv-blog-(featured__media|latest-card|archive-card) img\{[^}]*object-fit:cover/.test(OCCUPANCYNPV_BLOG_EDITORIAL_CSS)) {
    reasons.push("CARD_COVER_CROP_RISK");
  }
  if (/onpv-blog-hero__visual\{[^}]*max-height:12rem/.test(OCCUPANCYNPV_BLOG_EDITORIAL_CSS)) {
    reasons.push("HERO_MOBILE_CROP_RISK");
  }
  const soft = new Set(["INTERACTION_STATES_NOT_PROVEN", "ARCHIVE_CREATIVE_NOT_INSPECTED"]);
  const requiredEvidencePresent = Boolean(
    input.restRendered && input.hoverRendered && input.focusRendered && input.screenshotCaptured,
  ) && !(archiveNeeded && (!input.svgContents || input.svgContents.length === 0));
  if (!input.restRendered || !input.hoverRendered || !input.focusRendered || !input.screenshotCaptured) {
    reasons.push("INTERACTION_STATES_NOT_PROVEN");
  }
  return {
    gate: BLOG_RENDERED_VISUAL_QUALITY_GATE,
    result: qcResultFromEvidence({
      failed: reasons.some((row) => !soft.has(row)) || Boolean(input.visibleDefect),
      requiredEvidencePresent,
    }),
    reasons: reasons.length ? reasons : ["RENDERED_REST_HOVER_FOCUS"],
  };
}

export function clusterQuestionCoverage(text: string, question: BlogClusterQuestion, links: string[] = []): {
  covered: boolean;
  substantial: boolean;
} {
  const lower = text.toLowerCase();
  const hits = question.coverage_tokens.filter((token) => lower.includes(token.toLowerCase()));
  const substantial = hits.length >= Math.min(2, Math.max(1, question.coverage_tokens.length));
  if (question.role === "SEPARATE_PAGE") {
    const dedicated = question.dedicated_url;
    const linked = Boolean(dedicated && links.some((url) => url === dedicated || url.includes(dedicated.replace(/\/+$/, ""))));
    return { covered: linked || substantial, substantial };
  }
  if (question.role === "HIGH_VALUE_SECONDARY") {
    const linked = Boolean(question.dedicated_url && links.includes(question.dedicated_url));
    return { covered: substantial || (hits.length >= 1 && linked), substantial };
  }
  return { covered: substantial, substantial };
}

export function evaluateBlogDepthCompletenessGate(draft: OrganicDraft, plan?: BlogQuestionClusterPlan): OrganicNamedGate {
  const text = `${draft.h1} ${draft.headings.join(" ")} ${draft.body} ${draft.direct_answer ?? ""}`;
  const reasons: string[] = [];
  const cluster = plan ?? buildBlogQuestionClusterPlan({ primary_question: draft.h1 });
  if (!draft.direct_answer || draft.direct_answer.length < 80) reasons.push("primary_intent_unanswered");
  if (cluster.complexity === "COMPLEX" && draft.word_count < 1400) reasons.push("complex_topic_too_short");
  const must = cluster.questions.filter((row) => row.role === "PRIMARY" || row.role === "MUST_ANSWER");
  const secondary = cluster.questions.filter((row) => row.role === "HIGH_VALUE_SECONDARY");
  let missedMust = 0;
  for (const question of must) {
    const coverage = clusterQuestionCoverage(text, question, draft.internal_links);
    if (!coverage.covered || !coverage.substantial) {
      missedMust += 1;
      reasons.push("must_answer_shallow");
    }
  }
  if (missedMust >= 2) reasons.push("must_answer_cluster_incomplete");
  for (const question of secondary) {
    if (!clusterQuestionCoverage(text, question, draft.internal_links).covered) reasons.push("high_value_secondary_uncovered");
  }
  if (!/scenario|\$120,000|\$135,000|indicated value/i.test(text)) reasons.push("scenario_analysis_missing");
  if (!/dscr|debt-service coverage|loan amount|annual debt service/i.test(text)) reasons.push("financing_example_missing");
  if (!/buyer/i.test(text) || !/seller/i.test(text) || !/owner/i.test(text)) reasons.push("decision_support_missing");
  if (!/office|industrial|multifamily|retail/i.test(text)) reasons.push("property_type_context_missing");
  if (!/checklist|What Owners Should Review/i.test(text)) reasons.push("actionable_guidance_missing");
  if (!/limit|does not|not a|not automatically|tradeoff/i.test(text)) reasons.push("limitations_missing");
  if (!/mistake|misconception|confus/i.test(text)) reasons.push("mistakes_missing");
  if ((draft.visible_faqs?.length ?? 0) < 6) reasons.push("faq_depth_thin");
  if (draft.internal_links.length < 3) reasons.push("internal_link_ecosystem_thin");
  if (!/table|supporting visual|teaching sample|indicated value|scenario comparison|1\.54x/i.test(text)) reasons.push("supporting_visual_missing");
  if (!/refinanc|maturity|balloon/i.test(text)) reasons.push("refinance_guidance_missing");
  if (cluster.complexity === "COMPLEX" && !/commercially|hold-versus-sell|hold vs sell|decision support/i.test(text)) {
    reasons.push("commercial_relevance_missing");
  }
  return named(BLOG_DEPTH_COMPLETENESS_GATE, [...new Set(reasons)]);
}

export function profileBlogContentQuality(draft: OrganicDraft, plan?: BlogQuestionClusterPlan): BlogContentQualityProfile {
  const cluster = plan ?? buildBlogQuestionClusterPlan({ primary_question: draft.h1 });
  const text = `${draft.h1} ${draft.headings.join(" ")} ${draft.body} ${draft.direct_answer ?? ""}`;
  const depth = evaluateBlogDepthCompletenessGate(draft, cluster);
  const must = cluster.questions.filter((row) => row.role === "PRIMARY" || row.role === "MUST_ANSWER");
  const secondary = cluster.questions.filter((row) => row.role === "HIGH_VALUE_SECONDARY");
  const mustCovered = must.filter((row) => clusterQuestionCoverage(text, row, draft.internal_links).substantial).length;
  const secondaryCovered = secondary.filter((row) => clusterQuestionCoverage(text, row, draft.internal_links).covered).length;
  const scenario_count = (text.match(/\$120,000|\$135,000|\$2,000,000|teaching sample|scenario/gi) ?? []).length;
  const worked_example_count = (/\$120,000/.test(text) ? 1 : 0) + (/dscr|debt service/.test(text.toLowerCase()) ? 1 : 0);
  const actionable_section_count = [/checklist/i, /owners should review/i, /stress-test/i].filter((pattern) => pattern.test(text)).length;
  const entity_coverage_score = ["noi", "cap rate", "ltv", "dscr", "debt yield", "treasury", "credit spread"].filter((token) => text.toLowerCase().includes(token)).length * 14;
  const decision_support_score = ["buyer", "seller", "owner", "operator", "refinanc"].filter((token) => text.toLowerCase().includes(token)).length * 18;
  return {
    topic_complexity: cluster.complexity,
    depth_score: depth.result === "PASS" ? 92 : 38,
    question_cluster_coverage: must.length ? Math.round((mustCovered / must.length) * 100) : 40,
    actionability_score: /checklist|stress-test|can do now/i.test(text) ? 88 : 30,
    example_coverage: worked_example_count >= 2 ? 88 : 25,
    visual_support: /table|img |supporting-visual|teaching sample|indicated value/i.test(text) ? 84 : 20,
    entity_coverage: Math.min(100, entity_coverage_score),
    faq_coverage: (draft.visible_faqs?.length ?? 0) >= 8 ? 88 : 30,
    internal_link_coverage: Math.min(100, draft.internal_links.length * 20),
    reader_value_score: depth.result === "PASS" ? 90 : 34,
    must_answer_questions_total: must.length,
    must_answer_questions_covered: mustCovered,
    high_value_secondary_total: secondary.length,
    high_value_secondary_covered: secondaryCovered,
    scenario_count,
    worked_example_count,
    actionable_section_count,
    entity_coverage_score: Math.min(100, entity_coverage_score),
    decision_support_score: Math.min(100, decision_support_score),
  };
}

export const OCCUPANCYNPV_BLOG_EDITORIAL_CSS = `
/* OCCUPANCYNPV_BLOG_EDITORIAL_CSS_START */
:root{--blog-section-heading-gap:1.25rem;--blog-section-block-gap:2.5rem;--blog-carousel-top-gap:1.4rem;--blog-hero-tint:#eef3f7;--blog-accent:#1d4e63;--blog-ink:#10232c;--blog-arrow-bg:#10232c;--blog-arrow-fg:#ffffff;--blog-panel:#ffffff;--blog-muted:#f4f7f8}
.onpv-blog-hero[data-blog-hero-treatment="editorial-panel"]{background:linear-gradient(135deg,var(--blog-hero-tint) 0%,#f8fafb 58%,#e7eef2 100%);border-bottom:1px solid rgba(16,35,44,.08);padding:2.4rem 0 2.2rem}
.onpv-blog-hero__grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(14rem,.75fr);gap:2rem;align-items:center}
.onpv-blog-hero__copy .pv-display{color:var(--blog-ink);letter-spacing:-.03em}
.onpv-blog-hero__copy p{max-width:40rem;color:#334155}
.onpv-blog-hero__visual{margin:0;border-radius:1rem;overflow:hidden;box-shadow:0 16px 40px rgba(16,35,44,.12);aspect-ratio:4/3}
.onpv-blog-hero__visual img{width:100%;height:100%;object-fit:contain;display:block;background:#0b1720}
.onpv-blog-layout[data-blog-layout="editorial"]{display:grid;grid-template-columns:minmax(0,2.35fr) minmax(16rem,.85fr);gap:2rem;align-items:start}
.onpv-blog-main{display:flex;flex-direction:column;gap:var(--blog-section-block-gap)}
.onpv-blog-section-heading{margin:0 0 var(--blog-carousel-top-gap);color:var(--blog-ink)}
.onpv-blog-featured[data-blog-featured-card]{display:grid;grid-template-columns:minmax(11rem,.4fr) minmax(0,1fr);gap:1.25rem;align-items:center;border:1px solid rgba(16,35,44,.1);background:var(--blog-panel);padding:1.15rem 1.25rem;border-radius:.85rem;box-shadow:0 8px 24px rgba(16,35,44,.05)}
.onpv-blog-featured__media img{width:100%;height:auto;max-height:220px;object-fit:contain;aspect-ratio:4/3;border-radius:.55rem;background:#0b1720}
.onpv-blog-featured__copy h2{margin:.35rem 0 .5rem;font-size:1.55rem;line-height:1.2;color:var(--blog-ink)}
.onpv-blog-featured__cta{display:inline-block;margin-top:.75rem;font-weight:650;color:var(--blog-accent)}
.onpv-blog-carousel{display:flex;align-items:center;gap:.7rem;position:relative;margin-top:0}
.onpv-blog-carousel__scroller{flex:1 1 auto;min-width:0;display:grid;grid-auto-flow:column;grid-auto-columns:calc((100% - 1.5rem)/3);gap:.85rem;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;padding:.15rem .1rem 1rem;touch-action:pan-x}
.onpv-blog-carousel__arrow{flex:0 0 2.75rem;width:2.75rem;height:2.75rem;min-width:44px;min-height:44px;border-radius:999px;border:2px solid var(--blog-arrow-bg);background:var(--blog-arrow-bg);color:var(--blog-arrow-fg);box-shadow:0 6px 16px rgba(16,35,44,.18);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;appearance:none;-webkit-appearance:none;font:inherit;line-height:1}
.onpv-blog-carousel__arrow:hover{background:var(--blog-accent);border-color:var(--blog-accent);color:var(--blog-arrow-fg)}
.onpv-blog-carousel__arrow:focus-visible{outline:3px solid #7dd3fc;outline-offset:3px}
.onpv-blog-carousel__arrow:disabled,.onpv-blog-carousel__arrow[aria-disabled="true"]{background:#94a3b8;border-color:#94a3b8;color:#f8fafc;opacity:.85;cursor:not-allowed;box-shadow:none}
.onpv-blog-latest-card{scroll-snap-align:start;border:1px solid rgba(16,35,44,.1);background:var(--blog-muted);padding:.85rem;min-width:0;border-radius:.75rem}
.onpv-blog-latest-card img{width:100%;height:7.5rem;object-fit:contain;border-radius:.45rem;background:#0b1720}
.onpv-blog-latest-card h3{font-size:1rem;line-height:1.3;margin:.4rem 0}
.onpv-blog-sidebar{display:flex;flex-direction:column;gap:1.25rem}
.onpv-blog-sidebar__panel{border:1px solid rgba(16,35,44,.1);background:var(--blog-panel);padding:1.05rem 1.15rem;border-radius:.85rem;box-shadow:0 6px 18px rgba(16,35,44,.04)}
.onpv-blog-sidebar__panel h2{margin:0 0 .75rem;font-size:1rem;color:var(--blog-ink)}
.onpv-blog-cat{display:flex;justify-content:space-between;gap:1rem;padding:.45rem 0;border-bottom:1px solid rgba(16,35,44,.06)}
.onpv-blog-cloud{display:flex;flex-wrap:wrap;gap:.45rem}
.onpv-blog-cloud a{display:inline-block;border:1px solid rgba(29,78,99,.18);border-radius:999px;padding:.25rem .65rem;font-size:.8rem;background:#f0f6f8;color:var(--blog-accent)}
.onpv-blog-seq{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:2rem}
.onpv-blog-seq a{display:block;border:1px solid rgba(16,35,44,.1);padding:.95rem;border-radius:.75rem;background:var(--blog-panel)}
.onpv-blog-flow{display:flex;flex-wrap:wrap;gap:.55rem;margin:1rem 0 1.25rem}
.onpv-blog-flow span{border:1px solid rgba(29,78,99,.16);border-radius:999px;padding:.35rem .7rem;font-size:.85rem;background:#fff;color:var(--blog-ink)}
.onpv-blog-article-shell{background:linear-gradient(180deg,#f6f8f9 0%,#fff 18rem)}
.onpv-blog-archive-grid{display:grid;gap:1.15rem}
.onpv-blog-archive-card{border:1px solid rgba(16,35,44,.1);background:var(--blog-panel);padding:1rem 1.1rem;border-radius:.85rem;box-shadow:0 8px 24px rgba(16,35,44,.05)}
.onpv-blog-archive-card img{width:100%;height:10rem;object-fit:contain;border-radius:.55rem;background:#0b1720}
.onpv-blog-archive-card h2{margin:.55rem 0 .4rem;font-size:1.25rem;line-height:1.25;color:var(--blog-ink)}
a[data-blog-taxonomy-link]{color:var(--blog-accent);text-decoration:none;font-weight:600}
.onpv-taxonomy-row{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center}
.onpv-taxonomy-chip{display:inline-flex;align-items:center;border-radius:999px;padding:.28rem .7rem;border:1px solid rgba(16,35,44,.22);background:#f4f7f8;color:#10232c;font-size:.72rem;font-weight:700;letter-spacing:.04em;line-height:1.2;text-decoration:none;white-space:nowrap}
.onpv-taxonomy-chip:visited{color:#10232c;background:#f4f7f8}
.onpv-taxonomy-chip:hover{background:#10232c;color:#ffffff;border-color:#10232c}
.onpv-taxonomy-chip:hover:visited{background:#10232c;color:#ffffff;border-color:#10232c}
.onpv-taxonomy-chip:visited:hover{background:#10232c;color:#ffffff;border-color:#10232c}
.onpv-taxonomy-chip:focus-visible{outline:3px solid #7dd3fc;outline-offset:3px;background:#ffffff;color:#10232c}
.onpv-taxonomy-chip:focus-visible:hover{background:#10232c;color:#ffffff}
.onpv-taxonomy-chip:active{background:#1d4e63;color:#ffffff}
.onpv-taxonomy-chip:active:visited{background:#1d4e63;color:#ffffff}
a.onpv-taxonomy-chip:hover{background:#10232c;color:#ffffff;border-color:#10232c}
a.onpv-taxonomy-chip:hover:visited{background:#10232c;color:#ffffff;border-color:#10232c}
.pv-hero-photo .pv-hero-overlay{background:linear-gradient(180deg,rgba(8,12,16,.78),rgba(8,12,16,.88))}
.pv-hero-photo .pv-display,.pv-hero-photo .pv-hero-copy > p:not(.pv-eyebrow):not(.pv-answer-label),.pv-hero-photo time{color:#f8fafc}
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-display,
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-lede,
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-hero-copy > p:not(.pv-eyebrow):not(.pv-answer-label){color:#122033}
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-cta-panel{background-color:#102033;background-image:linear-gradient(180deg,#14253a,#102033);color:#f4f7fb}
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-cta-panel p{color:#f4f7fb}
.pv-hero-photo .pv-eyebrow,.pv-hero-photo .vg-kicker,.pv-hero-photo .vg-badge,
header.pv-hero.pv-article-hero.pv-hero-photo--article .pv-eyebrow,
header.pv-hero.pv-article-hero.pv-hero-photo--article .vg-kicker,
header.pv-hero.pv-article-hero.pv-hero-photo--article .vg-badge{
  background:#10232c;
  color:#f7f4ee;
  border-color:#d7e3ef;
}
.pv-hero-photo .pv-answer,.pv-hero-photo .pv-answer p,.pv-hero-photo .pv-answer .pv-eyebrow,.pv-hero-photo .pv-answer .pv-answer-label{
  color:#122033;
  background:#f4f7fb;
}
.pv-hero-photo .pv-answer{
  border:1px solid rgba(20,40,70,.14);
}
.pv-answer-label{
  display:block;
  margin:0 0 .45rem;
  padding:0;
  border:0;
  background:transparent;
  color:#1d4e89;
  font-size:.82rem;
  font-weight:650;
  letter-spacing:.04em;
  text-transform:uppercase;
}
.pv-hero-photo .onpv-taxonomy-chip{background:#ffffff;color:#10232c;border-color:#ffffff}
.pv-hero-photo .onpv-taxonomy-chip:visited{background:#ffffff;color:#10232c;border-color:#ffffff}
.pv-hero-photo .onpv-taxonomy-chip:hover{background:#10232c;color:#ffffff;border-color:#ffffff}
.pv-hero-photo .onpv-taxonomy-chip:hover:visited{background:#10232c;color:#ffffff;border-color:#ffffff}
.pv-hero-photo .onpv-taxonomy-chip:visited:hover{background:#10232c;color:#ffffff;border-color:#ffffff}
.pv-hero-photo .onpv-taxonomy-chip:focus-visible{background:#10232c;color:#ffffff;border-color:#ffffff}
.pv-toc{padding:1.05rem 0 1.15rem;border-bottom:1px solid rgba(16,35,44,.08);background:#f7f9fb}
.pv-toc-label{margin:0 0 .4rem;font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1d4e78}
.pv-toc-list{margin:0;padding-left:1.2rem;display:grid;gap:.38rem}
.pv-toc-list a{color:#163b5c;text-decoration:underline;text-underline-offset:2px}
.pv-toc-list a:focus-visible{outline:3px solid #7dd3fc;outline-offset:3px}
@media (max-width:768px){.pv-toc{padding:.8rem 0}.pv-toc-list{grid-template-columns:1fr;gap:.5rem}.pv-toc-list a{min-height:44px;display:inline-flex;align-items:center}}
.pv-table-shell{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
.pv-fin-table{width:100%;min-width:32rem;border-collapse:collapse}
.pv-fin-table th,.pv-fin-table td{padding:.62rem .75rem;text-align:left;vertical-align:top}
@media (max-width:1024px){.onpv-blog-hero__grid{grid-template-columns:minmax(0,1.2fr) minmax(12rem,.7fr)}.onpv-blog-layout[data-blog-layout="editorial"]{grid-template-columns:minmax(0,1.8fr) minmax(14rem,.9fr)}.onpv-blog-carousel__scroller{grid-auto-columns:calc((100% - .75rem)/2)}}
@media (max-width:768px){.onpv-blog-hero[data-blog-hero-treatment="editorial-panel"]{padding:1.6rem 0 1.5rem}.onpv-blog-hero__grid,.onpv-blog-layout[data-blog-layout="editorial"],.onpv-blog-featured[data-blog-featured-card]{grid-template-columns:minmax(0,1fr)}.onpv-blog-carousel__scroller{grid-auto-columns:100%}.onpv-blog-seq{grid-template-columns:1fr}.pv-fin-table{font-size:.86rem}.pv-fin-table th,.pv-fin-table td{padding:.5rem .55rem;white-space:nowrap}}
@media (prefers-reduced-motion:reduce){.onpv-blog-carousel__scroller{scroll-behavior:auto}}
a.vg-cta,a.vg-cta--primary,a.pv-cta,button.vg-cta,.vg-cta[type="submit"]{background:#1d4e78;color:#ffffff;border:1px solid #1d4e78;text-decoration:none}
a.vg-cta:hover,a.vg-cta--primary:hover,a.pv-cta:hover,button.vg-cta:hover,.vg-cta--primary:hover{background:#163b5c;color:#ffffff;border-color:#163b5c}
a.vg-cta:focus-visible,a.pv-cta:focus-visible,button.vg-cta:focus-visible,.vg-cta:focus-visible{outline:3px solid #7dd3fc;outline-offset:3px;color:#ffffff}
.pv-cta-panel a.vg-cta,.pv-cta-panel a.vg-cta--primary,.pv-cta-panel a.pv-cta,header.pv-hero a.vg-cta,.pv-hero-photo a.vg-cta,.vg-legal-footer a.vg-cta{background:#f4f7fb;color:#102033;border:1px solid #f4f7fb}
.pv-cta-panel a.vg-cta:hover,.pv-cta-panel a.vg-cta--primary:hover,.pv-cta-panel a.pv-cta:hover,header.pv-hero a.vg-cta:hover,.pv-hero-photo a.vg-cta:hover{background:#ffffff;color:#102033;border-color:#ffffff}
.pv-cta-panel a.vg-cta:focus-visible,header.pv-hero a.vg-cta:focus-visible{outline:3px solid #7dd3fc;outline-offset:3px;color:#102033}
.vg-cta--secondary,a.vg-cta--secondary{background:transparent;color:#1d4e78;border:1px solid #c5d0da}
.vg-cta--secondary:hover,a.vg-cta--secondary:hover{background:#e8eef5;color:#102033}
.vg-cta:disabled,a.vg-cta[aria-disabled="true"]{opacity:.55;cursor:not-allowed}
/* OCCUPANCYNPV_BLOG_EDITORIAL_CSS_END */
`;

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons };
}
