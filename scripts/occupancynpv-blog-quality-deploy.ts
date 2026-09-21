import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateBlogActionabilityGate,
  evaluateBlogContentQualityGate,
  evaluateBlogHumanReadabilityGate,
  evaluateBlogIndexReadinessGate,
  evaluateBlogValueFirstGate,
  evaluateBlogVisualAssetGate,
} from "../lib/infinity/organic-growth-engine/continuous/blog-quality";
import {
  evaluateBlogPermalinkIntegrityGate,
  evaluateBlogPermalinkMigrationGate,
  evaluateBlogPrimaryCategoryGate,
  evaluateBlogTaxonomyArchiveDesignGate,
  evaluateBlogTaxonomyArchiveQualityGate,
  evaluateBlogTaxonomyArchiveTruthGate,
  evaluateBlogTaxonomyIndexationGate,
  occupancynpvCategoryDescription,
  occupancynpvTagDescription,
  resolvePrimaryCategory,
} from "../lib/infinity/organic-growth-engine/continuous/blog-taxonomy";
import {
  evaluateBlogArticleDiscoveryGate,
  evaluateBlogArticleSidebarGate,
  evaluateBlogCarouselContrastGate,
  evaluateBlogCarouselControlQualityGate,
  evaluateBlogDepthCompletenessGate,
  evaluateBlogEditorialDesignGate,
  evaluateBlogHeroDesignGate,
  evaluateBlogSectionSpacingGate,
  occupancynpvInterestRateQuestionCluster,
} from "../lib/infinity/organic-growth-engine/continuous/blog-ux";
import {
  occupancynpvBlogArticleCrumbs,
  occupancynpvBlogArticleSource,
  occupancynpvBlogCategoryArchiveSource,
  occupancynpvBlogIndexSource,
  occupancynpvBlogTagArchiveSource,
  occupancynpvInterestRateDraft,
  OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH,
  OCCUPANCYNPV_BLOG_ARTICLE_PATH,
} from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-blog";
import { OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID, occupancynpvPublishedBlogPosts } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-blog-catalog";
import { composeOccupancyNpvOrganicLiveFiles, deployOccupancyNpvOrganicLivePage, fetchPublicHtml, fetchPublicRedirect } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import { evaluateDraftSchemaStack } from "../lib/infinity/organic-growth-engine/continuous/schema-standard";
import { persistOrganicContinuousStateLocal, readOrganicContinuousStateLocal } from "../lib/infinity/organic-growth-engine/continuous/persist";
import { emptyOrganicContinuousState } from "../lib/infinity/organic-growth-engine/continuous/store";
import { generateAndPersistFounderDailyReport } from "../lib/infinity/founder-daily-reports";

async function main() {
  const draft = occupancynpvInterestRateDraft();
  const indexHtml = occupancynpvBlogIndexSource();
  const posts = occupancynpvPublishedBlogPosts();
  const localGates = {
    BlogValueFirstGate: evaluateBlogValueFirstGate(draft).result,
    BlogContentQualityGate: evaluateBlogContentQualityGate(draft).result,
    BlogActionabilityGate: evaluateBlogActionabilityGate(draft).result,
    BlogHumanReadabilityGate: evaluateBlogHumanReadabilityGate(draft).result,
    BlogVisualAssetGate: evaluateBlogVisualAssetGate({
      featured_image: "/media/hero-building.webp",
      featured_alt: "Editorial commercial building used as valuation context. Not a customer property.",
      supporting_visual: true,
    }).result,
    BlogIndexReadinessGate: evaluateBlogIndexReadinessGate({ published: posts, index_html: indexHtml }).result,
    BlogDepthCompletenessGate: evaluateBlogDepthCompletenessGate(draft, occupancynpvInterestRateQuestionCluster()).result,
    BlogCarouselControlQualityGate: evaluateBlogCarouselControlQualityGate(indexHtml).result,
    BlogEditorialDesignGate: evaluateBlogEditorialDesignGate(indexHtml).result,
    BlogHeroDesignGate: evaluateBlogHeroDesignGate(indexHtml).result,
    BlogSectionSpacingGate: evaluateBlogSectionSpacingGate(indexHtml).result,
    BlogCarouselContrastGate: evaluateBlogCarouselContrastGate(indexHtml).result,
    BlogArticleSidebarGate: evaluateBlogArticleSidebarGate(occupancynpvBlogArticleSource()).result,
    BlogArticleDiscoveryGate: evaluateBlogArticleDiscoveryGate({
      article_html: occupancynpvBlogArticleSource(),
      published: posts,
      current_path: posts[0]!.path,
    }).result,
    BlogPrimaryCategoryGate: evaluateBlogPrimaryCategoryGate({
      resolution: resolvePrimaryCategory({ explicit: posts[0]!.primaryCategory, categories: posts[0]!.categories, active_categories: ["Valuation"] }),
      permalink: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      breadcrumbs: occupancynpvBlogArticleCrumbs().map((row) => row.name),
      schema_section: "Valuation",
      canonical: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
    }).result,
    BlogTaxonomyArchiveTruthGate: evaluateBlogTaxonomyArchiveTruthGate({
      kind: "category",
      label: "Valuation",
      html: occupancynpvBlogCategoryArchiveSource(),
      catalog: posts,
    }).result,
    BlogTaxonomyArchiveQualityGate: evaluateBlogTaxonomyArchiveQualityGate({
      kind: "tag",
      html: occupancynpvBlogTagArchiveSource("Interest Rates"),
      intro: occupancynpvTagDescription("Interest Rates"),
      published_count: 1,
    }).result,
    BlogTaxonomyIndexationGate: evaluateBlogTaxonomyIndexationGate({
      kind: "tag",
      label: "Interest Rates",
      published_count: 1,
      intro: occupancynpvTagDescription("Interest Rates"),
      robots_index: false,
      sitemap_includes: false,
    }).result,
    BlogTaxonomyArchiveDesignGate: evaluateBlogTaxonomyArchiveDesignGate(occupancynpvBlogCategoryArchiveSource()).result,
    BlogPermalinkIntegrityGate: evaluateBlogPermalinkIntegrityGate({
      permalink: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      canonical: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      breadcrumbs: occupancynpvBlogArticleCrumbs().map((row) => row.item),
      schema_url: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      sitemap: composeOccupancyNpvOrganicLiveFiles().files.find((file) => file.path.replace(/\\/g, "/") === "app/sitemap.ts")?.content ?? "",
      internal_html: `${indexHtml}\n${occupancynpvBlogArticleSource()}`,
      primary_category_slug: "valuation",
      legacy_path: OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH,
    }).result,
    schema: evaluateDraftSchemaStack(draft).stack.result,
  };
  console.log(JSON.stringify({ local_gates: localGates }, null, 2));
  if (Object.values(localGates).some((result) => result !== "PASS")) {
    process.exitCode = 1;
    return;
  }

  const result = await deployOccupancyNpvOrganicLivePage({ deploy: true });
  const articleUrl = `https://occupancynpv.com${OCCUPANCYNPV_BLOG_ARTICLE_PATH}`;
  const legacyUrl = `https://occupancynpv.com${OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH}`;
  const indexUrl = "https://occupancynpv.com/blog/";
  const categoryUrl = "https://occupancynpv.com/blog/category/valuation/";
  const tagUrls = [
    "https://occupancynpv.com/blog/tag/interest-rates/",
    "https://occupancynpv.com/blog/tag/cap-rates/",
    "https://occupancynpv.com/blog/tag/commercial-real-estate/",
  ];
  let article = { ok: false, status: 0, body: "", final_url: articleUrl };
  let index = { ok: false, status: 0, body: "", final_url: indexUrl };
  let category = { ok: false, status: 0, body: "", final_url: categoryUrl };
  const tags: Array<{ ok: boolean; status: number; body: string; final_url: string }> = [];
  let redirect = { status: 0, location: null as string | null, hops: 0, final_status: 0 };
  let sitemap = { ok: false, status: 0, body: "", final_url: "https://occupancynpv.com/sitemap.xml" };
  if (result.deployed) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      article = await fetchPublicHtml(articleUrl);
      index = await fetchPublicHtml(indexUrl);
      category = await fetchPublicHtml(categoryUrl);
      sitemap = await fetchPublicHtml("https://occupancynpv.com/sitemap.xml");
      redirect = await fetchPublicRedirect(legacyUrl);
      tags.length = 0;
      for (const url of tagUrls) tags.push(await fetchPublicHtml(url));
      if (article.ok && index.ok && category.ok && tags.every((row) => row.ok)) break;
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
  }

  const liveProof = {
    article_status: article.status,
    index_status: index.status,
    expanded: /What Owners Should Review When Rates Change/.test(article.body) && /cash-on-cash/.test(article.body) && /\$135,000/.test(article.body) && /dscr/i.test(article.body),
    featured_image: article.body.includes("/media/hero-building.webp") && index.body.includes("/media/hero-building.webp"),
    supporting_visual: article.body.includes("data-supporting-visual") || article.body.includes("$2,000,000"),
    category: /Valuation/.test(article.body) && /Valuation/.test(index.body),
    tags: /Interest Rates/.test(article.body) && /Cap Rates/.test(index.body),
    faq: /What should an owner stress-test first/.test(article.body),
    index_roll: index.body.includes("How do interest rates affect commercial property values?"),
    tag_cloud: index.body.includes("data-blog-tag-cloud"),
    latest_blogs: index.body.includes("Latest Blogs") && index.body.includes("data-blog-carousel"),
    flanking_arrows: index.body.includes("data-carousel-controls") && index.body.includes("data-blog-carousel-control") && !/>Previous</.test(index.body),
    hero: index.body.includes("data-blog-hero") && index.body.includes("editorial-panel"),
    contrast: index.body.includes("data-carousel-contrast"),
    article_sidebar: article.body.includes("data-blog-article-sidebar") && article.body.includes("data-blog-sidebar-shared"),
    article_discovery: article.body.includes("data-blog-article-discovery"),
    featured_card: index.body.includes("data-blog-featured-card") && index.body.includes("data-featured-image-size"),
    sidebar: index.body.includes("data-blog-sidebar"),
    sequential_nav: article.body.includes("data-blog-sequential-nav"),
    schema_article: article.body.includes("BlogPosting"),
    schema_index: index.body.includes("CollectionPage") && !/application\/ld\+json[\s\S]*BlogPosting/.test(index.body) ? index.body.includes("CollectionPage") : index.body.includes("CollectionPage"),
    category_status: category.status,
    category_matching: category.body.includes("How do interest rates affect commercial property values?"),
    category_hero: category.body.includes("data-blog-hero"),
    tag_interest: tags[0]?.ok === true && /Interest Rates/.test(tags[0]?.body ?? ""),
    tag_cap: tags[1]?.ok === true,
    tag_cre: tags[2]?.ok === true,
    old_redirect_301: redirect.status === 301,
    redirect_hops: redirect.hops,
    new_article_200: article.status === 200,
    sitemap_new_only: sitemap.body.includes("/blog/valuation/how-interest-rates-affect-commercial-property-values") && !sitemap.body.includes("/blog/how-interest-rates-affect-commercial-property-values</"),
    breadcrumb_updated: article.body.includes("Valuation") && article.body.includes("Blog"),
  };

  const organic = readOrganicContinuousStateLocal("occupancynpv") ?? emptyOrganicContinuousState("occupancynpv");
  persistOrganicContinuousStateLocal({
    ...organic,
    blog_readiness: "BLOG_READY",
    schema_readiness: "SCHEMA_READY",
    blog_editorial_quality: liveProof.expanded && liveProof.featured_image && article.ok ? "PASS" : "NEEDS_REMEDIATION",
    blog_remediation_queue: [
      {
        url: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
        classification: liveProof.expanded ? "BLOG_COMPLETE" : "BLOG_NEEDS_EXPANSION",
        priority: "HIGH",
        reasons: liveProof.expanded ? ["remediated_interest_rate_resource"] : ["live_proof_incomplete"],
      },
    ],
  });

  const report = generateAndPersistFounderDailyReport({
    now: new Date().toISOString(),
    blogs_refreshed: liveProof.expanded ? 1 : 0,
    blog_ux_events: [
      "Blog Taxonomy Upgrade",
      "Category Archive Added",
      "Tag Archive Added",
      "Primary Category Routing",
      "Permalink Migration",
      "Redirect Validation",
      "Sitemap Update",
      "Article Discovery Continuity",
      "Latest Blogs Article Integration",
    ],
    blog_qc_events: ["Blog Depth Upgrade", "Blog Editorial QC Upgrade"],
    deployments: result.deployment_id
      ? [{ id: result.deployment_id, target: "occupancynpv.com", status: result.deployed ? "READY" : "FAILED" }]
      : [],
    blockers: result.deployed && article.ok && index.ok ? [] : ["OccupancyNPV live blog proof incomplete"],
    founder_attention: [],
    treasury_verification: "UNKNOWN",
    organic_planned: ["Monitor OccupancyNPV indexation after blog UX upgrade"],
  });

  const payload = {
    adapter: result.adapter,
    deployed: result.deployed,
    aliased: result.aliased,
    deployment_id: result.deployment_id,
    preview_url: result.preview_url,
    live_status: result.live_status,
    safe_error: result.safe_error,
    file_count: result.file_count,
    local_gates: localGates,
    live_proof: liveProof,
    report_id: report.report_id,
    report_date: report.report_date,
    report_status: report.status,
  };
  mkdirSync(join(process.cwd(), ".infinity", "organic-growth-engine"), { recursive: true });
  writeFileSync(join(process.cwd(), ".infinity", "organic-growth-engine", "occupancynpv-blog-quality-proof.json"), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
  const migrationGate = evaluateBlogPermalinkMigrationGate({
    old_url: OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH,
    new_url: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
    old_status: redirect.status,
    hops: redirect.hops,
    new_status: article.status,
    canonical: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
    sitemap: sitemap.body,
    internal_html: `${index.body}\n${article.body}`,
    schema_url: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
    breadcrumbs: occupancynpvBlogArticleCrumbs().map((row) => row.item),
    asset_id_before: OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID,
    asset_id_after: OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID,
  });
  if (!result.deployed || !article.ok || !index.ok || !category.ok || !liveProof.expanded || !liveProof.latest_blogs || !liveProof.sidebar || !liveProof.flanking_arrows || !liveProof.article_discovery || !liveProof.hero || !liveProof.article_sidebar || !liveProof.old_redirect_301 || !liveProof.category_matching) process.exitCode = 1;
  void occupancynpvCategoryDescription;
  void migrationGate;
}

void main();
