import type { PlannedPage } from "@/lib/infinity/venture-website-architecture/types";
import { innerPageShell } from "@/lib/infinity/venture-website-architecture/page-sources";
import type { OrganicDraft } from "./quality";
import { buildConnectedSchemaGraph, occupancynpvOrganization, type SchemaFaqItem } from "./schema-standard";
import {
  LATEST_BLOGS_CAROUSEL_SCRIPT,
  renderBlogArticleShell,
  renderBlogHeroHtml,
  renderBlogSidebarHtml,
  renderFeaturedBlogsCarouselHtml,
  renderFeaturedReadsBottomHtml,
  renderLatestBlogsCarouselHtml,
  renderMainBlogRollHtml,
  sequentialBlogNeighbors,
} from "./blog-ux";
import { renderCanonicalArticleMain } from "./article-section-renderer";
import { occupancynpvFeaturedEditorialFor } from "./occupancynpv-featured-visuals";
import { occupancyInterestRatesV5Body } from "./occupancy-v5-body-interest-rates";
import { selectPopularOrFeaturedBlogs } from "@/lib/infinity/performance-intelligence-engine/popular-blogs";
import {
  blogCategoryArchivePath,
  blogTagArchivePath,
  evaluateTaxonomyIndexation,
  occupancynpvCategoryDescription,
  occupancynpvTagDescription,
  renderTaxonomyArchiveRollHtml,
  taxonomyChipHtml,
  taxonomySlug,
} from "./blog-taxonomy";
import {
  OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID,
  OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH,
  OCCUPANCYNPV_BLOG_ARTICLE_PATH,
  OCCUPANCYNPV_BLOG_ARTICLE_QUESTION,
  OCCUPANCYNPV_BLOG_INDEX_PATH,
  OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY,
} from "./occupancynpv-blog-catalog-constants";
import {
  occupancynpvActiveTags,
  occupancynpvPublishedBlogPosts,
} from "./occupancynpv-blog-catalog";
import { occupancynpvEntityCreative } from "./occupancynpv-blog-creative";
import { occupancynpvBlogSequentialNavHtml } from "./occupancynpv-blog-sequential-nav";

export {
  OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID,
  OCCUPANCYNPV_BLOG_ARTICLE_LEGACY_PATH,
  OCCUPANCYNPV_BLOG_ARTICLE_PATH,
  OCCUPANCYNPV_BLOG_ARTICLE_QUESTION,
  OCCUPANCYNPV_BLOG_INDEX_PATH,
  OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY,
  occupancynpvActiveCategories,
  occupancynpvPublishedBlogPosts,
  occupancynpvTagCloud,
} from "./occupancynpv-blog-catalog";
export { occupancynpvBlogSequentialNavHtml } from "./occupancynpv-blog-sequential-nav";

const FEATURED_IMAGE = occupancynpvEntityCreative("article", OCCUPANCYNPV_BLOG_ARTICLE_QUESTION).src;
const FEATURED_ALT = occupancynpvEntityCreative("article", OCCUPANCYNPV_BLOG_ARTICLE_QUESTION).alt;

export function occupancynpvBlogIndexPage(): PlannedPage {
  return {
    route: "/blog",
    role: "EDUCATIONAL_HUB",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/",
    title: "OccupancyNPV Blog — lease, valuation, and occupancy economics",
    metaDescription:
      "Editorial resources on interest rates, cap rates, and why tenant lease NPV is a different question from property valuation.",
    canonical: OCCUPANCYNPV_BLOG_INDEX_PATH,
    indexable: true,
    schemaTypes: ["Organization", "WebSite", "WebPage", "CollectionPage", "BreadcrumbList"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: "editorial",
    pageOpportunityId: "occupancynpv-blog-index",
  };
}

export function occupancynpvBlogArticlePage(): PlannedPage {
  return {
    route: OCCUPANCYNPV_BLOG_ARTICLE_PATH.replace(/\/+$/, ""),
    role: "EDUCATIONAL_ARTICLE",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/blog",
    title: "How interest rates affect commercial property values — OccupancyNPV",
    metaDescription:
      "How financing costs move required yields, why the same NOI can imply a lower value, and what owners can stress-test. Not a tenant lease NPV.",
    canonical: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
    indexable: true,
    schemaTypes: ["Organization", "WebSite", "WebPage", "BlogPosting", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: "valuation",
    pageOpportunityId: "occupancynpv-blog-interest-rates",
  };
}

export function occupancynpvBlogCategoryArchivePage(category: string = OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY): PlannedPage {
  const path = blogCategoryArchivePath(category);
  return {
    route: path.replace(/\/+$/, ""),
    role: "EDUCATIONAL_HUB",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/blog",
    title: `${category} — OccupancyNPV Blog`,
    metaDescription: occupancynpvCategoryDescription(category),
    canonical: path,
    indexable: evaluateTaxonomyIndexation({
      kind: "category",
      label: category,
      published_count: occupancynpvPublishedBlogPosts().filter((post) => (post.primaryCategory ?? post.category) === category).length,
      intro: occupancynpvCategoryDescription(category),
      taxonomy_importance: "HIGH",
    }).state === "INDEX",
    schemaTypes: ["Organization", "WebSite", "WebPage", "CollectionPage", "BreadcrumbList", "ItemList"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: taxonomySlug(category),
    pageOpportunityId: `occupancynpv-blog-category-${taxonomySlug(category)}`,
  };
}

export function occupancynpvBlogTagArchivePage(tag: string): PlannedPage {
  const path = blogTagArchivePath(tag);
  const count = occupancynpvActiveTags().find((row) => row.tag === tag)?.count ?? 0;
  const intro = occupancynpvTagDescription(tag);
  return {
    route: path.replace(/\/+$/, ""),
    role: "EDUCATIONAL_HUB",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/blog",
    title: `${tag} — OccupancyNPV Blog`,
    metaDescription: intro,
    canonical: path,
    indexable: evaluateTaxonomyIndexation({ kind: "tag", label: tag, published_count: count, intro }).state === "INDEX",
    schemaTypes: ["Organization", "WebSite", "WebPage", "CollectionPage", "BreadcrumbList", "ItemList"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: taxonomySlug(tag),
    pageOpportunityId: `occupancynpv-blog-tag-${taxonomySlug(tag)}`,
  };
}

export function occupancynpvBlogIndexSource(): string {
  const page = occupancynpvBlogIndexPage();
  const posts = occupancynpvPublishedBlogPosts();
  const crumbs = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
  ];
  const body = `
        ${renderBlogHeroHtml({
          eyebrow: "Editorial",
          title: "OccupancyNPV blog",
          description: "Practical valuation and occupancy-cost resources for owners, buyers, and tenant-rep readers. These notes sit next to evergreen hubs. They are not a substitute for them.",
          image: FEATURED_IMAGE,
          image_alt: FEATURED_ALT,
        })}
        <section className="pv-section" data-section-type="INDEX">
          <div className="vg-container onpv-blog-layout" data-blog-layout="editorial">
            <div className="onpv-blog-main">
              ${renderMainBlogRollHtml(posts)}
              ${(() => {
                const selection = selectPopularOrFeaturedBlogs({ posts });
                return renderFeaturedBlogsCarouselHtml(selection.posts, { public_label: selection.public_label, mode: selection.mode });
              })()}
              <section data-section-type="RELATED_CONTENT">
                <RelatedContent items={[
                  { href: "/resources", label: "Resource library" },
                  { href: "/commercial-lease-npv/", label: "Commercial lease NPV hub" },
                  { href: "/commercial-lease-npv/how-is-cap-rate-calculated/", label: "How is cap rate calculated?" },
                  { href: "/compare-commercial-leases", label: "Compare commercial leases" },
                ]} />
              </section>
              ${renderFeaturedReadsBottomHtml(
                posts
                  .filter((post) => !post.draft && !post.unpublished)
                  .slice(0, 3)
                  .map((post) => ({ href: post.path, label: post.title, dek: post.excerpt })),
              )}
            </div>
            ${renderBlogSidebarHtml(posts)}
          </div>
        </section>
        <script dangerouslySetInnerHTML={{ __html: ${JSON.stringify(LATEST_BLOGS_CAROUSEL_SCRIPT)} }} />`;
  return innerPageShell({ page, importDepth: "../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify(crumbs)}} />`,
  );
}

export function occupancynpvBlogArticleFaqs(): SchemaFaqItem[] {
  return [
    {
      question: OCCUPANCYNPV_BLOG_ARTICLE_QUESTION,
      answer:
        "When borrowing costs rise, buyers often require a higher income yield to pay the same price. Same NOI at a higher cap rate implies a lower value. That is a buyer-yield story, not a tenant occupancy-cost NPV.",
    },
    {
      question: "Do higher interest rates always lower property values?",
      answer: "No. A higher required yield pressures price only if NOI, liquidity, and risk do not offset it. NOI growth can recover part of the gap. A one-for-one cut is not automatic.",
    },
    {
      question: "How quickly do cap rates react?",
      answer: "Cap rates reprice when bids clear, not when a policy rate prints. Thin markets can sit with a wide bid-ask until someone yields or NOI improves.",
    },
    {
      question: "What matters more: cap rate or NOI?",
      answer: "Both. Value is NOI divided by the going-in cap rate. A durable NOI path can offset a higher yield. A weaker NOI path amplifies it.",
    },
    {
      question: "How do interest rates affect refinancing?",
      answer: "A higher coupon raises debt service on the same principal. Coverage, LTV, and cash-on-cash can fail even when occupancy looks unchanged. Model maturity, balloon risk, and the new rate together.",
    },
    {
      question: "Can rents offset higher interest rates?",
      answer: "Sometimes. Rent growth that survives occupancy, concessions, and unrecovered expenses can lift NOI. Do not treat a rent ask as cash until rollover is modeled.",
    },
    {
      question: "Which commercial property types are most sensitive?",
      answer: "Assets with short leases, weak recovery, or heavy near-term rollover usually transmit a rate move faster. Long, credit-strong industrial or net-lease stacks can hold NOI while office or short retail stacks are still marking vacancy.",
    },
    {
      question: "Should owners sell when rates rise?",
      answer: "Not as a reflex. Compare hold NOI, refinance proceeds, and the bid you can actually clear. A wider bid-ask can make a sale more expensive than waiting if the income path is intact.",
    },
    {
      question: "How should buyers model changing rates?",
      answer: "Hold NOI fixed and change the going-in yield. Then change NOI. Then change leverage, DSCR, and equity. Report all three rather than one headline cut.",
    },
    {
      question: "What happens when rates fall?",
      answer: "Required yields can compress and loan proceeds can rise, but credit spreads and liquidity still matter. A lower policy rate does not restore every prior mark.",
    },
    {
      question: "What is the difference between Fed rates and commercial mortgage rates?",
      answer: "The Federal Reserve sets a policy rate. Commercial mortgages price from Treasury yields plus a credit spread and lender appetite. Those layers can move at different times.",
    },
    {
      question: "Is that the same as a tenant lease NPV?",
      answer: "No. Financing-cost valuation is a buyer-yield story. Tenant NPV is occupancy cost over time. See the evergreen NPV page rather than reusing a property cap rate as a lease discount rate.",
    },
    {
      question: "How should owners stress-test a floating-rate loan when the index moves?",
      answer:
        "Rebuild annual debt service at the new index plus margin, then compare to trailing and projected NOI. Mark where DSCR falls below lender covenants and where cash after debt service turns negative. Pair that with maturity: a floating coupon that is manageable today can still fail at reset if spreads widen. Write the reset date beside the quoted margin so the workbook matches the term sheet, not a headline index alone.",
    },
  ];
}

export function occupancynpvBlogIndexCrumbs() {
  return [
    { name: "Home", item: "/" },
    { name: "Blog", item: OCCUPANCYNPV_BLOG_INDEX_PATH },
  ];
}

export function occupancynpvBlogArticleCrumbs() {
  return [
    { name: "Home", item: "/" },
    { name: "Blog", item: OCCUPANCYNPV_BLOG_INDEX_PATH },
    { name: OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY, item: blogCategoryArchivePath(OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY) },
    { name: OCCUPANCYNPV_BLOG_ARTICLE_QUESTION, item: OCCUPANCYNPV_BLOG_ARTICLE_PATH },
  ];
}

export function occupancynpvBlogCategoryCrumbs(category: string = OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY) {
  return [
    { name: "Home", item: "/" },
    { name: "Blog", item: OCCUPANCYNPV_BLOG_INDEX_PATH },
    { name: category, item: blogCategoryArchivePath(category) },
  ];
}

export function occupancynpvBlogTagCrumbs(tag: string) {
  return [
    { name: "Home", item: "/" },
    { name: "Blog", item: OCCUPANCYNPV_BLOG_INDEX_PATH },
    { name: "Tag", item: "/blog/tag/" },
    { name: tag, item: blogTagArchivePath(tag) },
  ];
}

export function occupancynpvBlogArticleSchema() {
  const page = occupancynpvBlogArticlePage();
  const post = occupancynpvPublishedBlogPosts().find((row) => row.asset_id === OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID)
    ?? occupancynpvPublishedBlogPosts()[0]!;
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "BLOG_ARTICLE",
      url: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      canonical: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      title: page.title,
      description: page.metaDescription,
      headline: OCCUPANCYNPV_BLOG_ARTICLE_QUESTION,
      breadcrumbs: occupancynpvBlogArticleCrumbs(),
      visible_breadcrumbs: occupancynpvBlogArticleCrumbs(),
      speakable_css_selectors: ["#direct-answer", "#summary", "#key-takeaways"],
      faqs: occupancynpvBlogArticleFaqs(),
      visible_faqs: occupancynpvBlogArticleFaqs(),
      date_published: post.published,
      date_modified: post.modified,
      author: { type: "Organization", name: "OccupancyNPV", url: "https://occupancynpv.com" },
      image: FEATURED_IMAGE,
      article_section: post.primaryCategory ?? post.category,
      about: ["interest rates", "commercial property values", "capitalization rate"],
      mentions: ["NOI", "commercial lease NPV", "debt-service coverage"],
      link_canonical: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      item_list: occupancynpvPublishedBlogPosts().map((row) => ({ name: row.title, url: row.path })),
    },
  });
}

export function occupancynpvBlogIndexSchema() {
  const page = occupancynpvBlogIndexPage();
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "BLOG_INDEX",
      url: OCCUPANCYNPV_BLOG_INDEX_PATH,
      canonical: OCCUPANCYNPV_BLOG_INDEX_PATH,
      title: page.title,
      description: page.metaDescription,
      breadcrumbs: occupancynpvBlogIndexCrumbs(),
      visible_breadcrumbs: occupancynpvBlogIndexCrumbs(),
      link_canonical: OCCUPANCYNPV_BLOG_INDEX_PATH,
      item_list: occupancynpvPublishedBlogPosts().map((row) => ({ name: row.title, url: row.path })),
    },
  });
}

export function occupancynpvBlogCategoryArchiveSchema(category: string = OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY) {
  const page = occupancynpvBlogCategoryArchivePage(category);
  const posts = occupancynpvPublishedBlogPosts().filter((post) => (post.primaryCategory ?? post.category) === category);
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "BLOG_INDEX",
      url: page.canonical,
      canonical: page.canonical,
      title: page.title,
      description: page.metaDescription,
      breadcrumbs: occupancynpvBlogCategoryCrumbs(category),
      visible_breadcrumbs: occupancynpvBlogCategoryCrumbs(category),
      link_canonical: page.canonical,
      item_list: posts.map((row) => ({ name: row.title, url: row.path })),
    },
  });
}

export function occupancynpvBlogTagArchiveSchema(tag: string) {
  const page = occupancynpvBlogTagArchivePage(tag);
  const posts = occupancynpvPublishedBlogPosts().filter((post) => post.tags.includes(tag));
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "TOPIC_HUB",
      url: page.canonical,
      canonical: page.canonical,
      title: page.title,
      description: page.metaDescription,
      breadcrumbs: occupancynpvBlogTagCrumbs(tag),
      visible_breadcrumbs: occupancynpvBlogTagCrumbs(tag),
      link_canonical: page.canonical,
      item_list: posts.map((row) => ({ name: row.title, url: row.path })),
    },
  });
}

function occupancynpvInterestRateTeachableWordCount(body: string, faqs: SchemaFaqItem[]): number {
  const faqText = faqs.map((row) => `${row.question} ${row.answer}`).join(" ");
  return `${body} ${faqText}`.split(/\s+/).filter(Boolean).length;
}

function occupancynpvInterestRateArticleDraft(): OrganicDraft {
  const v5 = occupancyInterestRatesV5Body();
  const faqs = occupancynpvBlogArticleFaqs();
  const post = occupancynpvPublishedBlogPosts().find((row) => row.asset_id === OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID)
    ?? occupancynpvPublishedBlogPosts()[0]!;
  return {
    title: occupancynpvBlogArticlePage().title,
    meta_description: occupancynpvBlogArticlePage().metaDescription,
    h1: OCCUPANCYNPV_BLOG_ARTICLE_QUESTION,
    headings: v5.headings,
    body: v5.body,
    direct_answer: v5.answer,
    citations: [
      {
        source: "https://www.investopedia.com/terms/c/capitalizationrate.asp",
        source_type: "authority",
        published_at: "2024-01-01",
        retrieved_at: "2026-09-27",
        claim: "Cap rate relates income to property value",
      },
      {
        source: "https://www.federalreserve.gov/",
        source_type: "authority",
        retrieved_at: "2026-09-27",
        claim: "Policy rates and market yields are related but not identical to commercial mortgage quotes",
      },
    ],
    schema: ["Organization", "WebSite", "WebPage", "BlogPosting", "BreadcrumbList", "SpeakableSpecification", "FAQPage"],
    canonical: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
    breadcrumbs: ["Home", "Blog", OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY, OCCUPANCYNPV_BLOG_ARTICLE_QUESTION],
    internal_links: [
      "/commercial-lease-npv/how-is-cap-rate-calculated/",
      "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/",
      "/compare-commercial-leases",
      "/blog/valuation/how-is-cap-rate-calculated-for-a-building/",
      "/blog/occupancy-costs/cam-first-year/",
    ],
    word_count: occupancynpvInterestRateTeachableWordCount(v5.body, faqs),
    visible_faqs: faqs,
    speakable_selectors: ["#direct-answer", "#summary", "#key-takeaways"],
    date_published: post.published,
    date_modified: "2026-09-27",
    page_kind: "BLOG_ARTICLE",
    origin: "https://occupancynpv.com",
    about: ["interest rates", "capitalization rate"],
    mentions: ["NOI", "commercial lease NPV"],
  };
}

export function occupancynpvBlogArticleSource(): string {
  const page = occupancynpvBlogArticlePage();
  const posts = occupancynpvPublishedBlogPosts();
  const post = posts.find((row) => row.asset_id === OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID) ?? posts[0]!;
  const draft = occupancynpvInterestRateArticleDraft();
  const featured = occupancynpvFeaturedEditorialFor(post.slug);
  const main = `
            ${renderCanonicalArticleMain({ headings: draft.headings, body: draft.body, faqs: draft.visible_faqs })}
            <section data-section-type="RELATED_CONTENT" aria-label="Related resources">
              <h2>Related resources</h2>
              <p><a href="/blog/valuation/how-is-cap-rate-calculated-for-a-building/">Cap rate for a building</a> · <a href="/blog/occupancy-costs/cam-first-year/">CAM in the first year</a> · <a href="/commercial-lease-npv/how-is-cap-rate-calculated/">Cap rate hub</a> · <a href="/compare-commercial-leases">Compare leases</a></p>
            </section>
            ${renderLatestBlogsCarouselHtml({ posts, excludePath: post.path, hideWhenNoDiscovery: true, surface: "article" })}
            ${occupancynpvBlogSequentialNavHtml(post.path, posts)}`;
  const body = `${renderBlogArticleShell({
    category: post.primaryCategory ?? post.category,
    date: post.published,
    title: OCCUPANCYNPV_BLOG_ARTICLE_QUESTION,
    dek: draft.direct_answer ?? page.metaDescription,
    featured_image: featured.path,
    featured_alt: featured.alt,
    tags: post.tags,
    main_html: main,
    posts,
    path: post.path,
    hideWhenNoDiscovery: true,
  })}
        <script dangerouslySetInnerHTML={{ __html: ${JSON.stringify(LATEST_BLOGS_CAROUSEL_SCRIPT)} }} />`;
  return innerPageShell({ page, importDepth: "../../../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify([
      { href: "/", label: "Home" },
      { href: "/blog", label: "Blog" },
      { href: blogCategoryArchivePath(post.primaryCategory ?? post.category), label: post.primaryCategory ?? post.category },
      { href: page.route, label: OCCUPANCYNPV_BLOG_ARTICLE_QUESTION },
    ])}} />`,
  );
}

export function occupancynpvBlogCategoryArchiveSource(category: string = OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY): string {
  const page = occupancynpvBlogCategoryArchivePage(category);
  const posts = occupancynpvPublishedBlogPosts();
  const matching = posts.filter((post) => (post.primaryCategory ?? post.category) === category && !post.draft && !post.unpublished);
  const crumbs = occupancynpvBlogCategoryCrumbs(category).map((row) => ({ href: row.item, label: row.name }));
  const body = `
        ${renderBlogHeroHtml({
          eyebrow: "Category",
          title: category,
          description: occupancynpvCategoryDescription(category),
          image: occupancynpvEntityCreative("category", category).src,
          image_alt: occupancynpvEntityCreative("category", category).alt,
        })}
        <section className="pv-section" data-section-type="INDEX">
          <div className="vg-container onpv-blog-layout" data-blog-layout="editorial" data-blog-archive="category" data-blog-archive-count="${matching.length}">
            <div className="onpv-blog-main">
              ${renderTaxonomyArchiveRollHtml(matching, { kind: "category", slug: taxonomySlug(category) })}
              <section data-section-type="RELATED_CONTENT">
                <RelatedContent items={[
                  { href: "/blog/", label: "All blog posts" },
                  { href: "/commercial-lease-npv/how-is-cap-rate-calculated/", label: "How is cap rate calculated?" },
                  { href: "/resources", label: "Resource library" },
                ]} />
              </section>
            </div>
            ${renderBlogSidebarHtml(posts)}
          </div>
        </section>`;
  return innerPageShell({ page, importDepth: "../../../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify(crumbs)}} />`,
  );
}

export function occupancynpvBlogTagArchiveSource(tag: string): string {
  const page = occupancynpvBlogTagArchivePage(tag);
  const posts = occupancynpvPublishedBlogPosts();
  const matching = posts.filter((post) => post.tags.includes(tag) && !post.draft && !post.unpublished);
  const crumbs = occupancynpvBlogTagCrumbs(tag).map((row) => ({ href: row.item, label: row.name }));
  const related = occupancynpvActiveTags().filter((row) => row.tag !== tag).slice(0, 4);
  const body = `
        ${renderBlogHeroHtml({
          eyebrow: "Topic",
          title: tag,
          description: occupancynpvTagDescription(tag),
          image: occupancynpvEntityCreative("tag", tag).src,
          image_alt: occupancynpvEntityCreative("tag", tag).alt,
        })}
        <section className="pv-section" data-section-type="INDEX">
          <div className="vg-container onpv-blog-layout" data-blog-layout="editorial" data-blog-archive="tag" data-blog-archive-count="${matching.length}">
            <div className="onpv-blog-main">
              ${renderTaxonomyArchiveRollHtml(matching, { kind: "tag", slug: taxonomySlug(tag) })}
              <nav aria-label="Related topics" data-blog-related-topics="true">
                <h2 className="onpv-blog-section-heading">Related topics</h2>
                <p>${related.map((row) => taxonomyChipHtml("tag", row.tag)).join(" ") || taxonomyChipHtml("category", OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY)}</p>
              </nav>
              <section data-section-type="RELATED_CONTENT">
                <RelatedContent items={[
                  { href: "/blog/", label: "All blog posts" },
                  { href: "${blogCategoryArchivePath(OCCUPANCYNPV_BLOG_PRIMARY_CATEGORY)}", label: "Valuation archive" },
                  { href: "/resources", label: "Resource library" },
                ]} />
              </section>
            </div>
            ${renderBlogSidebarHtml(posts)}
          </div>
        </section>`;
  return innerPageShell({ page, importDepth: "../../../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify(crumbs)}} />`,
  );
}

export function occupancynpvBlogTagHubSchema() {
  return buildConnectedSchemaGraph({
    origin: "https://occupancynpv.com",
    organization: occupancynpvOrganization(),
    page: {
      kind: "TOPIC_HUB",
      url: "/blog/tag/",
      canonical: "/blog/tag/",
      title: "Blog topics — OccupancyNPV",
      description: "Browse OccupancyNPV blog topics and open the matching filtered archive.",
      breadcrumbs: [
        { name: "Home", item: "/" },
        { name: "Blog", item: OCCUPANCYNPV_BLOG_INDEX_PATH },
        { name: "Tag", item: "/blog/tag/" },
      ],
      visible_breadcrumbs: [
        { name: "Home", item: "/" },
        { name: "Blog", item: OCCUPANCYNPV_BLOG_INDEX_PATH },
        { name: "Tag", item: "/blog/tag/" },
      ],
      link_canonical: "/blog/tag/",
    },
  });
}

export function occupancynpvBlogTagHubSource(): string {
  const page: PlannedPage = {
    route: "/blog/tag",
    role: "EDUCATIONAL_HUB",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/blog",
    title: "Blog topics — OccupancyNPV",
    metaDescription: "Browse OccupancyNPV blog topics and open the matching filtered archive.",
    canonical: "/blog/tag/",
    indexable: false,
    schemaTypes: ["Organization", "WebSite", "WebPage", "CollectionPage", "BreadcrumbList"],
    patternId: "FOCUSED_HERO",
    ctaStrength: "CONTEXTUAL",
    topicCluster: "editorial",
    pageOpportunityId: "occupancynpv-blog-tag-hub",
  };
  const posts = occupancynpvPublishedBlogPosts();
  const crumbs = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
    { href: "/blog/tag/", label: "Tag" },
  ];
  const body = `
        ${renderBlogHeroHtml({
          eyebrow: "Topics",
          title: "Blog topics",
          description: "Open a topic archive to see only the published notes assigned that tag.",
          image: "/media/blog/topic-hub.svg",
          image_alt: "Topic index graphic for OccupancyNPV blog archives.",
        })}
        <section className="pv-section">
          <div className="vg-container onpv-blog-layout" data-blog-layout="editorial">
            <div className="onpv-blog-main">
              <div className="onpv-blog-cloud">${occupancynpvActiveTags().map((row) => taxonomyChipHtml("tag", row.tag)).join("")}</div>
            </div>
            ${renderBlogSidebarHtml(posts)}
          </div>
        </section>`;
  return innerPageShell({ page, importDepth: "../../../", body }).replace(
    /<SiteBreadcrumb items=\{[\s\S]*?\}\s*\/>/,
    `<SiteBreadcrumb items={${JSON.stringify(crumbs)}} />`,
  );
}

export function occupancynpvInterestRateDraft(): OrganicDraft {
  return occupancynpvInterestRateArticleDraft();
}
