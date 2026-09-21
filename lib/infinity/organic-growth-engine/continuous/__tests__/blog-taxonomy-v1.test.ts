import { describe, expect, it } from "vitest";
import {
  blogArticlePermalink,
  blogCategoryArchivePath,
  blogSitemapUrls,
  blogTagArchivePath,
  evaluateBlogPermalinkIntegrityGate,
  evaluateBlogPermalinkMigrationGate,
  evaluateBlogPrimaryCategoryGate,
  evaluateBlogTaxonomyArchiveDesignGate,
  evaluateBlogTaxonomyArchiveQualityGate,
  evaluateBlogTaxonomyArchiveTruthGate,
  evaluateBlogTaxonomyIndexationGate,
  evaluateTaxonomyIndexation,
  filterPostsByCategory,
  filterPostsByTag,
  occupancynpvPermalinkRedirect,
  resolvePrimaryCategory,
  taxonomySlug,
} from "../blog-taxonomy";
import {
  occupancynpvBlogArticleCrumbs,
  occupancynpvBlogArticleSchema,
  occupancynpvBlogArticleSource,
  occupancynpvBlogCategoryArchiveSchema,
  occupancynpvBlogCategoryArchiveSource,
  occupancynpvBlogIndexSource,
  occupancynpvBlogTagArchiveSchema,
  occupancynpvBlogTagArchiveSource,
  occupancynpvInterestRateDraft,
} from "../occupancynpv-blog";
import {
  OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID,
  OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH,
  OCCUPANCYNPV_BLOG_ARTICLE_PATH,
  occupancynpvPublishedBlogPosts,
  type OccupancyNpvBlogPost,
} from "../occupancynpv-blog-catalog";
import { articleDiscoveryPosts, evaluateBlogArticleDiscoveryGate, renderLatestBlogsCarouselHtml } from "../blog-ux";
import { composeOccupancyNpvOrganicLiveFiles } from "../occupancynpv-publisher";
import { defaultVentureBlogSurface, evaluateVentureBlogReadinessGate, provisionBuildFactoryBlogFiles } from "../venture-blog-standard";

function fixtureCatalog(): OccupancyNpvBlogPost[] {
  const base = occupancynpvPublishedBlogPosts()[0]!;
  return [
    { ...base, slug: "a", path: "/blog/valuation/a/", title: "Valuation A", category: "Valuation", primaryCategory: "Valuation", categories: ["Valuation"], tags: ["Interest Rates", "Cap Rates"], featured: false },
    { ...base, slug: "b", path: "/blog/valuation/b/", title: "Valuation B", category: "Valuation", primaryCategory: "Valuation", categories: ["Valuation"], tags: ["Cap Rates"], featured: false },
    { ...base, slug: "c", path: "/blog/leasing/c/", title: "Leasing C", category: "Leasing", primaryCategory: "Leasing", categories: ["Leasing"], tags: ["Leasing"], featured: false },
    { ...base, slug: "draft", path: "/blog/valuation/draft/", title: "Draft Valuation", category: "Valuation", primaryCategory: "Valuation", categories: ["Valuation"], tags: ["Interest Rates"], draft: true },
  ];
}

describe("Category archive", () => {
  it("filters valuation posts and excludes leasing plus drafts", () => {
    const posts = fixtureCatalog();
    const valuation = filterPostsByCategory(posts, "Valuation");
    expect(valuation.map((row) => row.title)).toEqual(["Valuation A", "Valuation B"]);
    const html = occupancynpvBlogCategoryArchiveSource("Valuation");
    expect(html).toContain("/blog/category/valuation/");
    expect(html).toContain("data-blog-hero");
    expect(html).toContain("data-blog-archive-roll");
    expect(evaluateBlogTaxonomyArchiveTruthGate({ kind: "category", label: "Valuation", html, catalog: occupancynpvPublishedBlogPosts() }).result).toBe("PASS");
    expect(evaluateBlogTaxonomyArchiveDesignGate(html).result).toBe("PASS");
  });
});

describe("Tag archive", () => {
  it("keeps only exact tag members", () => {
    const posts = fixtureCatalog();
    expect(filterPostsByTag(posts, "Interest Rates").map((row) => row.title)).toEqual(["Valuation A"]);
    const html = occupancynpvBlogTagArchiveSource("Interest Rates");
    expect(html).toContain("/blog/tag/interest-rates/");
    expect(evaluateBlogTaxonomyArchiveTruthGate({ kind: "tag", label: "Interest Rates", html, catalog: occupancynpvPublishedBlogPosts() }).result).toBe("PASS");
    expect(evaluateBlogTaxonomyArchiveDesignGate(html).result).toBe("PASS");
  });
});

describe("Taxonomy filter truth", () => {
  it("does not infer tag membership from body text", () => {
    const posts = fixtureCatalog();
    expect(filterPostsByTag(posts, "Interest Rates").some((row) => row.title === "Valuation B")).toBe(false);
    expect(filterPostsByCategory(posts, "Valuation").some((row) => row.draft)).toBe(false);
  });
});

describe("Primary category", () => {
  it("uses the explicit primary category for the OccupancyNPV article", () => {
    const post = occupancynpvPublishedBlogPosts()[0]!;
    const resolution = resolvePrimaryCategory({
      explicit: post.primaryCategory,
      categories: post.categories ?? [post.category],
      active_categories: ["Valuation"],
    });
    expect(resolution.result).toBe("PASS");
    expect(blogArticlePermalink(resolution.primary!, post.slug)).toBe(OCCUPANCYNPV_BLOG_ARTICLE_PATH);
    expect(evaluateBlogPrimaryCategoryGate({
      resolution,
      permalink: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      breadcrumbs: occupancynpvBlogArticleCrumbs().map((row) => row.name),
      schema_section: "Valuation",
      canonical: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
    }).result).toBe("PASS");
  });

  it("fails when two categories remain ambiguous", () => {
    const resolution = resolvePrimaryCategory({
      categories: ["Valuation", "Financing"],
    });
    expect(resolution.result).toBe("FAIL");
    expect(evaluateBlogPrimaryCategoryGate({ resolution }).result).toBe("FAIL");
  });
});

describe("Permalink integrity", () => {
  it("keeps canonical, breadcrumb, schema, and sitemap on the category URL", () => {
    const composed = composeOccupancyNpvOrganicLiveFiles();
    const sitemap = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/sitemap.ts")?.content ?? "";
    const index = occupancynpvBlogIndexSource();
    const article = occupancynpvBlogArticleSource();
    expect(evaluateBlogPermalinkIntegrityGate({
      permalink: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      canonical: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      breadcrumbs: occupancynpvBlogArticleCrumbs().map((row) => row.item),
      schema_url: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      sitemap,
      internal_html: `${index}\n${article}`,
      primary_category_slug: "valuation",
      legacy_path: OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH,
    }).result).toBe("PASS");
    expect(sitemap).toContain(OCCUPANCYNPV_BLOG_ARTICLE_PATH);
    expect(sitemap).not.toContain(OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH);
  });
});

describe("Redirect migration", () => {
  it("records a one-hop 301 from the flat OccupancyNPV URL", () => {
    const redirect = occupancynpvPermalinkRedirect();
    const composed = composeOccupancyNpvOrganicLiveFiles();
    const nextConfig = composed.files.find((file) => file.path.replace(/\\/g, "/") === "next.config.mjs")?.content ?? "";
    const sitemap = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/sitemap.ts")?.content ?? "";
    expect(redirect.status).toBe(301);
    expect(redirect.hops).toBe(1);
    expect(nextConfig).toContain("statusCode: 301");
    expect(nextConfig).toContain("trailingSlash: true");
    expect(nextConfig).toContain(OCCUPANCYNPV_BLOG_ARTICLE_PATH);
    expect(evaluateBlogPermalinkMigrationGate({
      old_url: OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH,
      new_url: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      old_status: 301,
      hops: 1,
      new_status: 200,
      canonical: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      sitemap,
      internal_html: `${occupancynpvBlogIndexSource()}\n${occupancynpvBlogArticleSource()}`,
      schema_url: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      breadcrumbs: occupancynpvBlogArticleCrumbs().map((row) => row.item),
      asset_id_before: OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID,
      asset_id_after: occupancynpvPublishedBlogPosts()[0]!.asset_id!,
    }).result).toBe("PASS");
  });
});

describe("Breadcrumb and canonical", () => {
  it("uses Home → Blog → Category → Article and matching schema", () => {
    const crumbs = occupancynpvBlogArticleCrumbs();
    expect(crumbs.map((row) => row.name)).toEqual(["Home", "Blog", "Valuation", occupancynpvInterestRateDraft().h1]);
    expect(JSON.stringify(occupancynpvBlogArticleSchema())).toContain(blogCategoryArchivePath("Valuation"));
    expect(JSON.stringify(occupancynpvBlogCategoryArchiveSchema()).toLowerCase()).toContain("collectionpage");
    expect(JSON.stringify(occupancynpvBlogTagArchiveSchema("Interest Rates"))).not.toContain("BlogPosting");
    expect(occupancynpvBlogArticleSource()).toContain(blogCategoryArchivePath("Valuation"));
    expect(occupancynpvInterestRateDraft().canonical).toBe(OCCUPANCYNPV_BLOG_ARTICLE_PATH);
  });
});

describe("Taxonomy schema", () => {
  it("marks archives as CollectionPage with ItemList", () => {
    expect(JSON.stringify(occupancynpvBlogCategoryArchiveSchema())).toContain("ItemList");
    expect(JSON.stringify(occupancynpvBlogTagArchiveSchema("Cap Rates"))).toContain("ItemList");
    expect(JSON.stringify(occupancynpvBlogCategoryArchiveSchema())).not.toContain("BlogPosting");
  });
});

describe("Sitemap", () => {
  it("includes the new article and valuation archive and excludes the redirected URL", () => {
    const sitemap = blogSitemapUrls({
      index: "/blog/",
      articles: occupancynpvPublishedBlogPosts(),
      categories: ["Valuation"],
      tags: [{ tag: "Interest Rates", count: 1, intro: occupancynpvBlogTagArchiveSource("Interest Rates").slice(0, 80) }],
      legacy_paths: [OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH],
    });
    expect(sitemap).toContain(OCCUPANCYNPV_BLOG_ARTICLE_PATH);
    expect(sitemap).toContain(blogCategoryArchivePath("Valuation"));
    expect(sitemap).not.toContain(OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH);
  });
});

describe("Thin archive indexation", () => {
  it("noindexes a one-post tag while keeping the route usable", () => {
    const intro = "How financing costs and policy rates show up in commercial property bids.";
    const policy = evaluateTaxonomyIndexation({ kind: "tag", label: "Interest Rates", published_count: 1, intro });
    expect(policy.state).toBe("NOINDEX");
    const html = occupancynpvBlogTagArchiveSource("Interest Rates");
    expect(html).toContain("index: false");
    expect(evaluateBlogTaxonomyIndexationGate({
      kind: "tag",
      label: "Interest Rates",
      published_count: 1,
      intro,
      robots_index: false,
      sitemap_includes: false,
    }).result).toBe("PASS");
    expect(evaluateBlogTaxonomyArchiveQualityGate({
      kind: "tag",
      html,
      intro,
      published_count: 1,
    }).result).toBe("PASS");
  });
});

describe("Archive design", () => {
  it("reuses the editorial hero and sidebar", () => {
    expect(evaluateBlogTaxonomyArchiveDesignGate(occupancynpvBlogCategoryArchiveSource()).result).toBe("PASS");
    expect(evaluateBlogTaxonomyArchiveDesignGate("<main>Valuation</main>").result).toBe("FAIL");
  });
});

describe("Article Latest Blogs", () => {
  it("hides the carousel for a single post and excludes the current article when more exist", () => {
    const live = occupancynpvPublishedBlogPosts();
    expect(articleDiscoveryPosts(live, live[0]!.path)).toHaveLength(0);
    expect(occupancynpvBlogArticleSource()).toContain("data-blog-discovery-empty");
    const posts = fixtureCatalog().filter((row) => !row.draft);
    const html = renderLatestBlogsCarouselHtml({ posts, excludePath: "/blog/valuation/b/", hideWhenNoDiscovery: true, surface: "article" });
    expect(html).not.toContain('href="/blog/valuation/b/"');
    expect(html).toContain("/blog/valuation/a/");
    expect(evaluateBlogArticleDiscoveryGate({
      article_html: `${html}<nav data-blog-sequential-nav="true"></nav>`,
      published: posts,
      current_path: "/blog/valuation/b/",
    }).result).toBe("PASS");
  });
});

describe("Article discovery", () => {
  it("keeps sidebar, related resources, and hidden latest blogs on the solo OccupancyNPV article", () => {
    const html = occupancynpvBlogArticleSource();
    expect(html).toContain("/blog/category/valuation/");
    expect(html).toContain("/blog/tag/interest-rates/");
    expect(evaluateBlogArticleDiscoveryGate({
      article_html: html,
      published: occupancynpvPublishedBlogPosts(),
      current_path: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
    }).result).toBe("PASS");
  });
});

describe("Current article exclusion", () => {
  it("never lists the opened article in Latest Blogs", () => {
    const posts = fixtureCatalog().filter((row) => !row.draft);
    expect(articleDiscoveryPosts(posts, "/blog/valuation/a/").every((row) => row.path !== "/blog/valuation/a/")).toBe(true);
  });
});

describe("Sequential navigation", () => {
  it("uses category-aware permalinks in composed OccupancyNPV files", () => {
    const composed = composeOccupancyNpvOrganicLiveFiles();
    const article = composed.files.find((file) => file.path.replace(/\\/g, "/").includes("how-interest-rates-affect-commercial-property-values"))?.content ?? "";
    expect(article).toContain("data-blog-sequential-nav");
    expect(article).toContain(OCCUPANCYNPV_BLOG_ARTICLE_PATH.replace(/\/+$/, "") || article);
  });
});

describe("Factory and readiness", () => {
  it("provisions taxonomy routes and requires them on public websites", () => {
    expect(taxonomySlug("Commercial Real Estate")).toBe("commercial-real-estate");
    expect(blogTagArchivePath("Cap Rates")).toBe("/blog/tag/cap-rates/");
    expect(evaluateVentureBlogReadinessGate({
      public_website: true,
      surface: defaultVentureBlogSurface("occupancynpv"),
    }).result).toBe("PASS");
    expect(evaluateVentureBlogReadinessGate({
      public_website: true,
      surface: { ...defaultVentureBlogSurface("x"), permalink_migration: false, category_archive: false },
    }).result).toBe("FAIL");
    const files = provisionBuildFactoryBlogFiles();
    expect(files["lib/blog/BlogPermalinkRouter.ts"]).toContain("/blog/{primary-category-slug}/{post-slug}/");
    expect(files["lib/blog/BlogTaxonomyIndexationPolicy.ts"]).toContain("NOINDEX");
  });
});
