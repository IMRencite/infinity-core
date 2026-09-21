import { evaluateBlogRequiredForLaunchGate } from "../blog-os";
import { VENTURE_BLOG_READINESS_GATE } from "./contract";
import { manageBlogTaxonomy } from "./links";
import { provisionBuildFactorySchemaFiles } from "./schema-standard";
import type { OrganicAsset, OrganicNamedGate } from "./types";

export const VENTURE_BLOG_STANDARD = "VentureBlogStandard" as const;

export type VentureBlogStatus = "BLOG_READY" | "BLOG_PARTIAL" | "BLOG_MISSING" | "EXEMPT";

export type VentureBlogSurface = {
  venture_id: string;
  editorial_route: string;
  index_route: string;
  article_template: string;
  category_archive_route?: string;
  tag_archive_route?: string;
  taxonomy: { categories: string[]; tags: string[] };
  schema: string[];
  sitemap: boolean;
  publisher_ready: boolean;
  sales_registry_ready: boolean;
  performance_hooks: boolean;
  canonical_integration?: boolean;
  author_publisher_support?: boolean;
  date_fields_support?: boolean;
  dynamic_post_roll?: boolean;
  featured_image_support?: boolean;
  category_support?: boolean;
  tag_support?: boolean;
  topic_cloud_support?: boolean;
  blog_value_first?: boolean;
  blog_content_quality?: boolean;
  blog_visual_assets?: boolean;
  blog_index_readiness?: boolean;
  organic_growth?: boolean;
  featured_editorial_card?: boolean;
  latest_blogs_carousel?: boolean;
  article_latest_blogs?: boolean;
  carousel_arrow_controls?: boolean;
  category_sidebar?: boolean;
  sequential_navigation?: boolean;
  related_content?: boolean;
  blog_depth_qc?: boolean;
  supporting_visual_support?: boolean;
  blog_hero?: boolean;
  article_sidebar?: boolean;
  carousel_contrast?: boolean;
  section_spacing?: boolean;
  primary_category?: boolean;
  category_aware_permalink?: boolean;
  category_archive?: boolean;
  tag_archive?: boolean;
  category_filtering?: boolean;
  tag_filtering?: boolean;
  taxonomy_breadcrumb?: boolean;
  taxonomy_canonical?: boolean;
  archive_schema?: boolean;
  archive_design?: boolean;
  archive_indexation_policy?: boolean;
  permalink_migration?: boolean;
  exemption_reason?: string;
};

export type VentureBlogAuditRow = {
  venture_id: string;
  public_name: string;
  status: VentureBlogStatus;
  reason: string;
};

export function defaultVentureBlogSurface(venture_id: string): VentureBlogSurface {
  return {
    venture_id,
    editorial_route: "/blog/",
    index_route: "/blog/",
    article_template: "/blog/[category]/[slug]/",
    category_archive_route: "/blog/category/[category]/",
    tag_archive_route: "/blog/tag/[tag]/",
    taxonomy: manageBlogTaxonomy({ title: "Editorial", topic: "Market Education" }),
    schema: [
      "Organization",
      "WebSite",
      "WebPage",
      "BlogPosting",
      "BreadcrumbList",
      "SpeakableSpecification",
      "FAQPage",
    ],
    sitemap: true,
    publisher_ready: true,
    sales_registry_ready: true,
    performance_hooks: true,
    canonical_integration: true,
    author_publisher_support: true,
    date_fields_support: true,
    dynamic_post_roll: true,
    featured_image_support: true,
    category_support: true,
    tag_support: true,
    topic_cloud_support: true,
    blog_value_first: true,
    blog_content_quality: true,
    blog_visual_assets: true,
    blog_index_readiness: true,
    organic_growth: true,
    featured_editorial_card: true,
    latest_blogs_carousel: true,
    article_latest_blogs: true,
    carousel_arrow_controls: true,
    category_sidebar: true,
    sequential_navigation: true,
    related_content: true,
    blog_depth_qc: true,
    supporting_visual_support: true,
    blog_hero: true,
    article_sidebar: true,
    carousel_contrast: true,
    section_spacing: true,
    primary_category: true,
    category_aware_permalink: true,
    category_archive: true,
    tag_archive: true,
    category_filtering: true,
    tag_filtering: true,
    taxonomy_breadcrumb: true,
    taxonomy_canonical: true,
    archive_schema: true,
    archive_design: true,
    archive_indexation_policy: true,
    permalink_migration: true,
  };
}

export function evaluateVentureBlogReadinessGate(input: {
  public_website: boolean;
  surface: VentureBlogSurface | null;
  exemption_reason?: string;
}): OrganicNamedGate {
  if (!input.public_website) {
    return { gate: VENTURE_BLOG_READINESS_GATE, result: "PASS", reasons: ["no_public_website"] };
  }
  if (input.exemption_reason === "BLOG_DISABLED") {
    return { gate: VENTURE_BLOG_READINESS_GATE, result: "FAIL", reasons: ["BLOG_DISABLED_FORBIDDEN"] };
  }
  if (input.exemption_reason) {
    return { gate: VENTURE_BLOG_READINESS_GATE, result: "PASS", reasons: ["EXEMPT", input.exemption_reason] };
  }
  const surface = input.surface;
  const reasons: string[] = [];
  if (!surface) reasons.push("blog_surface_missing");
  else {
    if (!surface.index_route) reasons.push("blog_index_missing");
    if (!surface.article_template) reasons.push("article_template_missing");
    if (!surface.taxonomy.categories.length) reasons.push("taxonomy_missing");
    if (!surface.schema.includes("BlogPosting")) reasons.push("blog_schema_missing");
    if (!surface.schema.includes("BreadcrumbList")) reasons.push("breadcrumb_schema_missing");
    if (!surface.schema.includes("SpeakableSpecification")) reasons.push("speakable_schema_missing");
    if (!surface.schema.includes("FAQPage")) reasons.push("faq_schema_missing");
    if (!surface.schema.includes("Organization") || !surface.schema.includes("WebSite")) reasons.push("publisher_schema_missing");
    if (surface.canonical_integration === false) reasons.push("canonical_integration_missing");
    if (surface.author_publisher_support === false) reasons.push("author_publisher_missing");
    if (surface.date_fields_support === false) reasons.push("date_fields_missing");
    if (surface.dynamic_post_roll === false) reasons.push("dynamic_post_roll_missing");
    if (surface.featured_image_support === false) reasons.push("featured_image_support_missing");
    if (surface.category_support === false) reasons.push("category_support_missing");
    if (surface.tag_support === false) reasons.push("tag_support_missing");
    if (surface.topic_cloud_support === false) reasons.push("topic_cloud_missing");
    if (surface.blog_value_first === false) reasons.push("blog_value_first_missing");
    if (surface.blog_content_quality === false) reasons.push("blog_content_quality_missing");
    if (surface.blog_visual_assets === false) reasons.push("blog_visual_assets_missing");
    if (surface.blog_index_readiness === false) reasons.push("blog_index_readiness_missing");
    if (surface.organic_growth === false) reasons.push("organic_growth_missing");
    if (surface.featured_editorial_card === false) reasons.push("featured_editorial_card_missing");
    if (surface.latest_blogs_carousel === false) reasons.push("latest_blogs_carousel_missing");
    if (surface.article_latest_blogs === false) reasons.push("article_latest_blogs_missing");
    if (surface.carousel_arrow_controls === false) reasons.push("carousel_arrow_controls_missing");
    if (surface.category_sidebar === false) reasons.push("category_sidebar_missing");
    if (surface.sequential_navigation === false) reasons.push("sequential_navigation_missing");
    if (surface.related_content === false) reasons.push("related_content_missing");
    if (surface.blog_depth_qc === false) reasons.push("blog_depth_qc_missing");
    if (surface.supporting_visual_support === false) reasons.push("supporting_visual_support_missing");
    if (surface.blog_hero === false) reasons.push("blog_hero_missing");
    if (surface.article_sidebar === false) reasons.push("article_sidebar_missing");
    if (surface.carousel_contrast === false) reasons.push("carousel_contrast_missing");
    if (surface.section_spacing === false) reasons.push("section_spacing_missing");
    if (!surface.category_archive_route) reasons.push("category_archive_route_missing");
    if (!surface.tag_archive_route) reasons.push("tag_archive_route_missing");
    if (surface.category_filtering === false) reasons.push("category_filtering_missing");
    if (surface.tag_filtering === false) reasons.push("tag_filtering_missing");
    if (surface.primary_category === false) reasons.push("primary_category_missing");
    if (surface.category_aware_permalink === false) reasons.push("category_aware_permalink_missing");
    if (surface.taxonomy_breadcrumb === false) reasons.push("taxonomy_breadcrumb_missing");
    if (surface.taxonomy_canonical === false) reasons.push("taxonomy_canonical_missing");
    if (surface.archive_schema === false) reasons.push("archive_schema_missing");
    if (surface.archive_design === false) reasons.push("archive_design_missing");
    if (surface.archive_indexation_policy === false) reasons.push("archive_indexation_policy_missing");
    if (surface.permalink_migration === false) reasons.push("permalink_migration_missing");
    if (surface.category_archive === false) reasons.push("category_archive_missing");
    if (surface.tag_archive === false) reasons.push("tag_archive_missing");
    if (!surface.sitemap) reasons.push("sitemap_missing");
    if (!surface.publisher_ready) reasons.push("publisher_not_wired");
    if (!surface.sales_registry_ready) reasons.push("sales_registry_missing");
    if (!surface.performance_hooks) reasons.push("performance_hooks_missing");
  }
  const readiness = { gate: VENTURE_BLOG_READINESS_GATE, result: reasons.length ? "FAIL" : "PASS", reasons } as OrganicNamedGate;
  const launch = evaluateBlogRequiredForLaunchGate({
    public_website: input.public_website,
    blog_ready: readiness.result === "PASS",
  });
  if (launch.result === "FAIL") {
    return { ...readiness, result: "FAIL", reasons: [...readiness.reasons, ...launch.reasons] };
  }
  return readiness;
}

export function classifyVentureBlogStatus(input: {
  public_website: boolean;
  surface: VentureBlogSurface | null;
  exemption_reason?: string;
}): VentureBlogStatus {
  if (input.exemption_reason && input.exemption_reason !== "BLOG_DISABLED") return "EXEMPT";
  if (!input.public_website) return "EXEMPT";
  const gate = evaluateVentureBlogReadinessGate(input);
  if (gate.result === "PASS") return "BLOG_READY";
  if (input.surface) return "BLOG_PARTIAL";
  return "BLOG_MISSING";
}

export function auditActiveVentureBlogs(): VentureBlogAuditRow[] {
  return [
    {
      venture_id: "occupancynpv",
      public_name: "OccupancyNPV",
      status: "BLOG_READY",
      reason: "blog_index_and_article_template_provisioned",
    },
    {
      venture_id: "candidate:f1336945-3350-4d08-921e-4dcb5bc77b8e",
      public_name: "AskReview",
      status: "BLOG_MISSING",
      reason: "public_site_without_editorial_surface",
    },
  ];
}

export function blogRemediationQueue(rows: VentureBlogAuditRow[] = auditActiveVentureBlogs()): VentureBlogAuditRow[] {
  return rows.filter((row) => row.status === "BLOG_MISSING" || row.status === "BLOG_PARTIAL");
}

export function salesCanRetrieveBlogAsset(input: {
  question: string;
  assets: OrganicAsset[];
}): boolean {
  return input.assets.some((asset) => {
    if (asset.status !== "PUBLISHED" && asset.status !== "REFRESHED") return false;
    return `${asset.question_answered} ${asset.topic} ${asset.title}`.toLowerCase().includes(input.question.toLowerCase().split(/\s+/)[0] ?? "");
  });
}

export function provisionBuildFactoryBlogFiles(): Record<string, string> {
  return {
    "app/blog/page.tsx": "export default function BlogIndex() { return <main data-blog-layout=\"editorial\"><header data-blog-hero=\"true\" data-blog-hero-treatment=\"editorial-panel\" /><h1>Blog</h1><article data-blog-featured-card=\"true\" /><section data-blog-carousel=\"true\" data-blog-carousel-shared=\"LatestBlogsCarousel\" data-carousel-controls=\"flanking\" data-carousel-contrast=\"high\" data-blog-roll=\"true\"><h2 className=\"onpv-blog-section-heading\">Latest Blogs</h2><button data-blog-carousel-control=\"arrow\" aria-label=\"Previous blogs\" /><button data-blog-carousel-control=\"arrow\" aria-label=\"Next blogs\" /></section><aside data-blog-sidebar=\"true\" data-blog-sidebar-shared=\"BlogSidebar\" data-blog-categories=\"true\" data-blog-tag-cloud=\"true\" data-blog-popular-resources=\"true\" /></main>; }\n",
    "app/blog/[category]/[slug]/page.tsx": "export default function BlogArticle() { return <main data-blog-article-layout=\"true\" data-blog-article-sidebar=\"true\"><article><img alt=\"featured\" /><h1>Article</h1><section data-section-type=\"RELATED_CONTENT\" /><section data-blog-article-discovery=\"true\" data-blog-carousel-shared=\"LatestBlogsCarousel\" /><nav data-blog-sequential-nav=\"true\" /></article><aside data-blog-sidebar=\"true\" data-blog-sidebar-shared=\"BlogSidebar\" data-blog-categories=\"true\" data-blog-tag-cloud=\"true\" data-blog-popular-resources=\"true\" /></main>; }\n",
    "app/blog/[slug]/page.tsx": "export { default } from \"../lib/blog/BlogPermalinkRedirectManager\";\n",
    "app/blog/category/[category]/page.tsx": "export default function BlogCategoryArchive() { return <main data-blog-layout=\"editorial\" data-blog-archive=\"category\"><header data-blog-hero=\"true\" data-blog-hero-treatment=\"editorial-panel\" /><section data-blog-archive-roll=\"true\" /><aside data-blog-sidebar-shared=\"BlogSidebar\" /></main>; }\n",
    "app/blog/tag/[tag]/page.tsx": "export default function BlogTagArchive() { return <main data-blog-layout=\"editorial\" data-blog-archive=\"tag\"><header data-blog-hero=\"true\" data-blog-hero-treatment=\"editorial-panel\" /><section data-blog-archive-roll=\"true\" /><aside data-blog-sidebar-shared=\"BlogSidebar\" /></main>; }\n",
    "components/blog/BlogHero.tsx": "export function BlogHero() { return <header data-blog-hero=\"true\" data-blog-hero-treatment=\"editorial-panel\" data-blog-hero-visual=\"true\" />; }\n",
    "components/blog/LatestBlogsCarousel.tsx": "export function LatestBlogsCarousel() { return <section data-blog-carousel-shared=\"LatestBlogsCarousel\" data-carousel-controls=\"flanking\" data-carousel-contrast=\"high\" data-blog-carousel-control=\"arrow\" />; }\n",
    "components/blog/BlogCarouselControls.tsx": "export function BlogCarouselControls() { return <><button className=\"onpv-blog-carousel__arrow\" data-blog-carousel-control=\"arrow\" data-carousel-contrast=\"high\" aria-label=\"Previous blogs\" /><button className=\"onpv-blog-carousel__arrow\" data-blog-carousel-control=\"arrow\" data-carousel-contrast=\"high\" aria-label=\"Next blogs\" /></>; }\n",
    "components/blog/BlogSidebar.tsx": "export function BlogSidebar() { return <aside data-blog-sidebar-shared=\"BlogSidebar\" data-blog-categories=\"true\" data-blog-tag-cloud=\"true\" data-blog-popular-resources=\"true\" />; }\n",
    "components/blog/BlogCategoryArchive.tsx": "export function BlogCategoryArchive() { return <main data-blog-archive=\"category\" data-blog-hero=\"true\" />; }\n",
    "components/blog/BlogTagArchive.tsx": "export function BlogTagArchive() { return <main data-blog-archive=\"tag\" data-blog-hero=\"true\" />; }\n",
    "lib/blog/BlogPrimaryCategoryResolver.ts": "export function BlogPrimaryCategoryResolver() { return { primaryCategory: true, deterministic: true }; }\n",
    "lib/blog/BlogPermalinkRouter.ts": "export const articlePattern = \"/blog/{primary-category-slug}/{post-slug}/\";\nexport const categoryPattern = \"/blog/category/{category-slug}/\";\nexport const tagPattern = \"/blog/tag/{tag-slug}/\";\n",
    "lib/blog/BlogPermalinkRedirectManager.ts": "export default function BlogPermalinkRedirectManager() { return null; }\n",
    "lib/blog/BlogTaxonomyArchiveSchema.ts": "export function BlogTaxonomyArchiveSchema() { return { types: [\"Organization\", \"WebSite\", \"WebPage\", \"CollectionPage\", \"BreadcrumbList\", \"ItemList\"] }; }\n",
    "lib/blog/BlogTaxonomyIndexationPolicy.ts": "export function BlogTaxonomyIndexationPolicy() { return { states: [\"INDEX\", \"NOINDEX\", \"HOLD\", \"REMOVE_UNUSED\"] }; }\n",
    "lib/blog/BlogTaxonomyChip.ts": "export function BlogTaxonomyChip() { return { shape: \"pill\", surfaces: [\"featured\", \"latest\", \"hero\", \"metadata\", \"sidebar\", \"archive\", \"related\"], contrast: [\"REST\", \"HOVER\", \"FOCUS\", \"ACTIVE\", \"VISITED\"] }; }\n",
    "lib/design-core/CreativeAssetRegistry.ts": "export function CreativeAssetRegistry() { return { roles: [\"HERO\", \"FEATURED\", \"CATEGORY\", \"TAG_TOPIC\", \"SUPPORTING_VISUAL\", \"SOCIAL\", \"CARD\", \"ARCHIVE\", \"CAMPAIGN\"], uniqueness: [\"UNIQUE\", \"INTENTIONAL_REUSE\", \"SAME_ENTITY_VARIANT\", \"DUPLICATE\", \"NEAR_DUPLICATE\", \"GENERIC_OVERUSE\"] }; }\n",
    "lib/qc/HydrationSafeTimestamp.ts": "export function HydrationSafeTimestamp() { return { locale: \"en-US\", timezone: \"America/New_York\", source: \"stable\" }; }\n",
    "components/blog/BlogSequentialNavigation.tsx": "export function BlogSequentialNavigation() { return <nav data-blog-sequential-nav=\"true\" />; }\n",
    "components/blog/BlogArticleDiscovery.tsx": "export function BlogArticleDiscovery() { return <section data-blog-article-discovery=\"true\" data-blog-carousel-shared=\"LatestBlogsCarousel\" />; }\n",
    "components/blog/RelatedContent.tsx": "export function RelatedContent() { return <section data-section-type=\"RELATED_CONTENT\" />; }\n",
    "content/taxonomy.json": JSON.stringify({ categories: ["Market Education"], tags: ["commercial-real-estate"], primary_category: true }, null, 2),
    "content/blog-catalog.json": JSON.stringify({ posts: [], dynamic_post_roll: true, latest_blogs_carousel: true, article_latest_blogs: true, carousel_arrow_controls: true, category_sidebar: true, sequential_navigation: true, related_content: true, blog_depth_qc: true, category_archives: true, tag_archives: true, category_aware_permalinks: true }, null, 2),
    ...provisionBuildFactorySchemaFiles(),
  };
}
