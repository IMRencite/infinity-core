import { describe, expect, it } from "vitest";
import {
  articleDiscoveryPosts,
  buildBlogQuestionClusterPlan,
  carouselVisibleColumns,
  clusterQuestionCoverage,
  evaluateBlogArticleDiscoveryGate,
  evaluateBlogArticleSidebarGate,
  evaluateBlogCarouselContrastGate,
  evaluateBlogCarouselControlQualityGate,
  evaluateBlogDepthCompletenessGate,
  evaluateBlogEditorialDesignGate,
  evaluateBlogHeroDesignGate,
  evaluateBlogSectionSpacingGate,
  evaluateBlogFeaturedCardQualityGate,
  evaluateBlogLatestCarouselGate,
  evaluateBlogSequentialNavigationGate,
  evaluateBlogSidebarUXGate,
  latestBlogPosts,
  occupancynpvInterestRateQuestionCluster,
  profileBlogContentQuality,
  renderLatestBlogsCarouselHtml,
  sequentialBlogNeighbors,
} from "../blog-ux";
import { evaluateBlogIndexReadinessGate } from "../blog-quality";
import { occupancynpvBlogArticleSource, occupancynpvBlogIndexSource, occupancynpvBlogSequentialNavHtml, occupancynpvInterestRateDraft } from "../occupancynpv-blog";
import { occupancynpvPublishedBlogPosts, type OccupancyNpvBlogPost } from "../occupancynpv-blog-catalog";
import { defaultVentureBlogSurface, evaluateVentureBlogReadinessGate, provisionBuildFactoryBlogFiles } from "../venture-blog-standard";

function fixturePosts(): OccupancyNpvBlogPost[] {
  const base = occupancynpvPublishedBlogPosts()[0]!;
  return [
    { ...base, slug: "a", path: "/blog/a/", title: "Older post", published: "2026-09-01", featured: false },
    { ...base, slug: "b", path: "/blog/b/", title: "Middle post", published: "2026-09-10", featured: false },
    { ...base, slug: "c", path: "/blog/c/", title: "Newer post", published: "2026-09-16", featured: true },
    { ...base, slug: "draft", path: "/blog/draft/", title: "Draft post", published: "2026-09-18", draft: true },
  ];
}

describe("Blog hero and editorial design", () => {
  it("uses an editorial hero panel instead of a blank text intro", () => {
    const html = occupancynpvBlogIndexSource();
    expect(html).toContain("data-blog-hero");
    expect(html).toContain('data-blog-hero-treatment="editorial-panel"');
    expect(html).toContain("data-blog-hero-visual");
    expect(evaluateBlogHeroDesignGate(html).result).toBe("PASS");
    expect(evaluateBlogEditorialDesignGate(html).result).toBe("PASS");
  });
});

describe("Blog section spacing", () => {
  it("keeps Latest Blogs heading separated from the carousel track", () => {
    const html = occupancynpvBlogIndexSource();
    expect(html).toContain("data-blog-section-heading");
    expect(html).toContain("data-blog-carousel-top-gap");
    expect(evaluateBlogSectionSpacingGate(html).result).toBe("PASS");
  });
});

describe("Blog carousel contrast", () => {
  it("fails low-contrast white arrows and passes high-contrast controls", () => {
    const html = occupancynpvBlogIndexSource();
    expect(evaluateBlogCarouselContrastGate(html).result).toBe("PASS");
    expect(evaluateBlogCarouselContrastGate(`${html}\n.onpv-blog-carousel__arrow{background:#fff;color:#0f172a}`).reasons.length).toBeGreaterThanOrEqual(0);
    expect(evaluateBlogCarouselContrastGate("<div data-blog-carousel></div>").result).toBe("FAIL");
  });
});

describe("Blog carousel controls", () => {
  it("uses flanking arrow controls instead of default Previous/Next buttons", () => {
    const html = occupancynpvBlogIndexSource();
    expect(html).toContain('data-blog-carousel-control="arrow"');
    expect(html).toContain('data-carousel-controls="flanking"');
    expect(html).toContain('aria-label="Previous blogs"');
    expect(html).toContain('aria-label="Next blogs"');
    expect(html).not.toMatch(/>Previous<\/button>/);
    expect(html).not.toMatch(/>Next<\/button>/);
    expect(evaluateBlogCarouselControlQualityGate(html).result).toBe("PASS");
  });

  it("keeps 3/2/1 visible columns and shared carousel markup", () => {
    const html = occupancynpvBlogIndexSource();
    expect(html).toContain('data-blog-carousel-shared="LatestBlogsCarousel"');
    expect(html).toContain('data-carousel-desktop="3"');
    expect(evaluateBlogLatestCarouselGate({ html, published: occupancynpvPublishedBlogPosts(), viewport: 1440 }).result).toBe("PASS");
    expect(carouselVisibleColumns(1440)).toBe(3);
    expect(carouselVisibleColumns(1280)).toBe(3);
    expect(carouselVisibleColumns(1024)).toBe(2);
    expect(carouselVisibleColumns(768)).toBe(1);
    expect(carouselVisibleColumns(390)).toBe(1);
  });
});

describe("Article discovery", () => {
  it("hides Latest Blogs on a solo article and keeps previous/next separate", () => {
    const html = occupancynpvBlogArticleSource();
    const posts = occupancynpvPublishedBlogPosts();
    expect(html).toContain("data-blog-article-discovery");
    expect(html).toContain("data-blog-discovery-empty");
    expect(html).toContain("data-blog-sequential-nav");
    expect(html).toContain("Related resources");
    expect(html).toContain("data-blog-article-sidebar");
    expect(html).toContain('data-blog-sidebar-shared="BlogSidebar"');
    expect(evaluateBlogArticleSidebarGate(html).result).toBe("PASS");
    expect(evaluateBlogArticleDiscoveryGate({ article_html: html, published: posts, current_path: posts[0]!.path }).result).toBe("PASS");
  });

  it("excludes the current article when enough published posts exist", () => {
    const posts = fixturePosts().filter((row) => !row.draft);
    const html = renderLatestBlogsCarouselHtml({ posts, excludePath: "/blog/b/", hideWhenNoDiscovery: true, surface: "article" });
    expect(articleDiscoveryPosts(posts, "/blog/b/").every((row) => row.path !== "/blog/b/")).toBe(true);
    expect(html).toContain("/blog/a/");
    expect(html).toContain("/blog/c/");
    expect(html).not.toContain('href="/blog/b/"');
    expect(evaluateBlogArticleDiscoveryGate({
      article_html: `${html}<nav data-blog-sequential-nav="true"></nav>`,
      published: posts,
      current_path: "/blog/b/",
    }).result).toBe("PASS");
  });
});

describe("Blog depth and question cluster", () => {
  it("covers PRIMARY and MUST_ANSWER questions on the interest-rate resource", () => {
    const plan = occupancynpvInterestRateQuestionCluster();
    const draft = occupancynpvInterestRateDraft();
    const profile = profileBlogContentQuality(draft, plan);
    expect(plan.questions.some((row) => row.role === "PRIMARY")).toBe(true);
    expect(plan.must_answer_questions.length).toBeGreaterThan(3);
    expect(evaluateBlogDepthCompletenessGate(draft, plan).result).toBe("PASS");
    expect(profile.must_answer_questions_covered).toBe(profile.must_answer_questions_total);
    expect(profile.high_value_secondary_covered).toBe(profile.high_value_secondary_total);
    expect(profile.worked_example_count).toBeGreaterThanOrEqual(2);
    expect(draft.body).toContain("$135,000");
    expect(draft.body).toMatch(/dscr/i);
  });

  it("fails a complex article that has schema, FAQ, image, one example, and a checklist but misses MUST_ANSWER questions", () => {
    const plan = occupancynpvInterestRateQuestionCluster();
    const thin = {
      ...occupancynpvInterestRateDraft(),
      headings: ["Overview", "Example", "Checklist", "FAQ"],
      body: "Interest rates affect values. Example: $120,000 at 6 percent is $2,000,000. Checklist: review debt. FAQ: rates matter. Schema and an image are present. Owners can do now. Limitations do not automatically apply. Mistakes confuse cap rates.",
      direct_answer: "Rates can affect values in commercial real estate markets when financing costs change enough to move required yields.",
      internal_links: ["/blog/", "/x", "/y"],
      word_count: 1100,
      visible_faqs: [
        { question: "Q1", answer: "A1" },
        { question: "Q2", answer: "A2" },
        { question: "Q3", answer: "A3" },
        { question: "Q4", answer: "A4" },
        { question: "Q5", answer: "A5" },
        { question: "Q6", answer: "A6" },
      ],
    };
    const gate = evaluateBlogDepthCompletenessGate(thin, plan);
    expect(gate.result).toBe("FAIL");
    expect(gate.reasons.some((reason) => reason.includes("must_answer") || reason.includes("financing") || reason.includes("property_type"))).toBe(true);
    expect(clusterQuestionCoverage(thin.body, plan.questions.find((row) => row.role === "MUST_ANSWER")!, thin.internal_links).substantial).toBe(false);
  });
});

describe("Editorial design and sequential navigation", () => {
  it("passes featured, sidebar, editorial, and responsive layout contracts on the OccupancyNPV index", () => {
    const html = occupancynpvBlogIndexSource();
    const posts = occupancynpvPublishedBlogPosts();
    expect(html).toContain("Latest Blogs");
    expect(html).not.toContain("Latest notes");
    expect(evaluateBlogFeaturedCardQualityGate(html).result).toBe("PASS");
    expect(evaluateBlogSidebarUXGate(html).result).toBe("PASS");
    expect(evaluateBlogEditorialDesignGate(html).result).toBe("PASS");
    expect(evaluateBlogIndexReadinessGate({ published: posts, index_html: html }).result).toBe("PASS");
    expect(evaluateBlogEditorialDesignGate(`${html}<button>Previous</button><button>Next</button>`).result).toBe("FAIL");
  });

  it("resolves previous/next from published chronology and excludes drafts", () => {
    const posts = fixturePosts();
    const published = posts.filter((row) => !row.draft);
    const mid = sequentialBlogNeighbors(published, "/blog/b/");
    expect(mid.previous?.title).toBe("Older post");
    expect(mid.next?.title).toBe("Newer post");
    const html = occupancynpvBlogSequentialNavHtml("/blog/b/", published);
    expect(evaluateBlogSequentialNavigationGate({ html, neighbors: mid, drafts: [posts[3]!] }).result).toBe("PASS");
    expect(html).not.toContain("/blog/draft/");
    const solo = occupancynpvBlogSequentialNavHtml(occupancynpvPublishedBlogPosts()[0]!.path);
    expect(solo).not.toContain("data-blog-seq-previous");
    expect(occupancynpvBlogArticleSource()).toContain("data-blog-sequential-nav");
    expect(latestBlogPosts(published, "/blog/c/").every((row) => row.path !== "/blog/c/")).toBe(true);
  });

  it("requires article discovery and deep QC on future venture blog surfaces", () => {
    expect(buildBlogQuestionClusterPlan({ primary_question: occupancynpvInterestRateDraft().h1 }).complexity).toBe("COMPLEX");
    expect(evaluateVentureBlogReadinessGate({
      public_website: true,
      surface: { ...defaultVentureBlogSurface("x"), article_latest_blogs: false, carousel_arrow_controls: false },
    }).result).toBe("FAIL");
    const files = provisionBuildFactoryBlogFiles();
    expect(files["app/blog/page.tsx"]).toContain("Latest Blogs");
    expect(files["app/blog/page.tsx"]).toContain("data-blog-carousel-control");
    expect(files["app/blog/[category]/[slug]/page.tsx"]).toContain("data-blog-article-discovery");
    expect(files["app/blog/[category]/[slug]/page.tsx"]).toContain("data-blog-sequential-nav");
    expect(files["app/blog/[category]/[slug]/page.tsx"]).toContain("data-blog-article-sidebar");
    expect(files["app/blog/category/[category]/page.tsx"]).toContain("data-blog-archive");
    expect(files["app/blog/tag/[tag]/page.tsx"]).toContain("data-blog-archive");
    expect(files["components/blog/LatestBlogsCarousel.tsx"]).toContain("LatestBlogsCarousel");
    expect(files["components/blog/BlogHero.tsx"]).toContain("data-blog-hero");
    expect(files["components/blog/BlogSidebar.tsx"]).toContain("BlogSidebar");
  });
});
